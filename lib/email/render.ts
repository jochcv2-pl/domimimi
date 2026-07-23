/**
 * Pipeline email — rendu des templates.
 *
 * Le moteur ne compose jamais un email à la main : il sélectionne un
 * template (par triggerKey), récupère ses vars depuis le contexte
 * (candidat + settings CMS), substitue les placeholders `{{...}}` et
 * produit un email final prêt à envoyer.
 *
 * Les placeholders sont en français et correspondent à des noms
 * "humains" (`{{Prénom}}`, `{{Zone}}`…) afin que l'admin puisse les
 * comprendre en éditant les templates depuis le CRM sans doc.
 */

import { prisma } from "@/lib/prisma";
import type { Application, EmailTemplate, Setting } from "@prisma/client";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface RenderContext {
  application: Pick<
    Application,
    "firstName" | "lastName" | "email" | "postalCode" | "city" | "zone"
  > & {
    product?: string | null;
    payMode?: string | null;
    weeklyPackages?: number | null;
    startDate?: Date | null;
  };
  settings: Record<string, string>;
}

// ============================================================
// Dictionnaire des variables — expose les clés `{{...}}` connues.
// Toute variable inconnue est remplacée par une chaîne vide (plutôt
// que de planter l'envoi) et un warning est loggué côté moteur.
// ============================================================

export interface KnownVars {
  Prénom: string;
  Nom: string;
  Email: string;
  Zone: string;
  "Code postal": string;
  Ville: string;
  "Taux horaire": string;
  "Date de collecte": string;
  Cadence: string;
  Produit: string;
  "Mode de paie": string;
  "Prénom du référent": string;
  "WhatsApp URL": string;
  "Messenger URL": string;
  "Nom de la marque": string;
}

/**
 * Construit le dictionnaire des vars pour un candidat + un set de settings.
 * Les valeurs absentes deviennent "" — pas de plantage.
 */
export function buildVars(ctx: RenderContext): Record<string, string> {
  const app = ctx.application;
  const s = ctx.settings;
  return {
    Prénom: app.firstName ?? "",
    Nom: app.lastName ?? "",
    Email: app.email ?? "",
    Zone: app.zone ?? app.city ?? app.postalCode ?? "",
    "Code postal": app.postalCode ?? "",
    Ville: app.city ?? "",
    "Taux horaire": s["remuneration.taux_horaire_min"] ?? "",
    "Date de collecte": app.startDate
      ? new Date(app.startDate).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "",
    Cadence: app.weeklyPackages != null ? `${app.weeklyPackages} Pakete/Woche` : "",
    Produit: app.product ?? "",
    "Mode de paie": app.payMode === "hourly" ? "Stundenlohn" : app.payMode === "package" ? "Pro Paket" : "",
    "Prénom du référent": s["cms.referent_prenom"] ?? "Camille",
    "WhatsApp URL": s["contact.whatsapp"] ?? "",
    "Messenger URL": s["contact.messenger"] ?? "",
    "Nom de la marque": s["cms.brand_name"] ?? "Domipack",
  };
}

// ============================================================
// Substitution {{Var}} → valeur
// ============================================================

const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Remplace les `{{Var}}` par leurs valeurs. Toute var inconnue devient "".
 * Retourne aussi la liste des vars non reconnues (pour debug/logs).
 */
export function substitute(
  input: string,
  vars: Record<string, string>,
): { output: string; unknownVars: string[] } {
  const unknown = new Set<string>();
  const output = input.replace(PLACEHOLDER, (m, key: string) => {
    const trimmed = key.trim();
    if (trimmed in vars) return vars[trimmed];
    unknown.add(trimmed);
    return "";
  });
  return { output, unknownVars: [...unknown] };
}

// ============================================================
// Conversion texte → HTML (minimaliste)
// ============================================================

function textToHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`);
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2933;">${paragraphs.join(
    "",
  )}</div>`;
}

// ============================================================
// API principale : renderEmail
// ============================================================

export interface RenderEmailInput {
  triggerKey: string;
  application: RenderContext["application"];
  settings: RenderContext["settings"];
}

export interface RenderEmailResult {
  ok: true;
  template: Pick<EmailTemplate, "id" | "name" | "subject" | "body">;
  content: EmailContent;
  unknownVars: string[];
}

/**
 * Sélectionne le template actif pour le triggerKey donné et le rend.
 * Si aucun template n'est trouvé ou si le template est désactivé, renvoie
 * `{ ok: false, reason }` pour que le moteur logge et passe au suivant.
 */
export async function renderEmail(
  input: RenderEmailInput,
): Promise<
  | RenderEmailResult
  | { ok: false; reason: "no_template" | "template_inactive" }
> {
  const tpl = await prisma.emailTemplate.findFirst({
    where: { triggerKey: input.triggerKey, status: "actif" },
    orderBy: { sort: "asc" },
  });

  if (!tpl) {
    // Réessayons sans filtre status pour distinguer les deux cas
    const anyTpl = await prisma.emailTemplate.findFirst({
      where: { triggerKey: input.triggerKey },
    });
    if (anyTpl) return { ok: false, reason: "template_inactive" };
    return { ok: false, reason: "no_template" };
  }

  const vars = buildVars({
    application: input.application,
    settings: input.settings,
  });

  const subj = substitute(tpl.subject, vars);
  const body = substitute(tpl.body, vars);

  const unknownVars = [...new Set([...subj.unknownVars, ...body.unknownVars])];

  return {
    ok: true,
    template: { id: tpl.id, name: tpl.name, subject: tpl.subject, body: tpl.body },
    content: {
      subject: subj.output,
      text: body.output,
      html: textToHtml(body.output),
    },
    unknownVars,
  };
}

// ============================================================
// Helper pour la prévisualisation admin (utilisée par la vue Pipeline)
// ============================================================

/**
 * Charge les settings nécessaires au rendu (contact + cms).
 */
export async function loadRenderSettings(
  raw: Setting[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const s of raw) map[s.key] = s.value;
  return map;
}
