/**
 * Pipeline email — rendu des templates.
 *
 * Sélectionne un template par (triggerKey, locale) — fallback "de".
 * Substitue les placeholders {{...}} et produit un email HTML
 * responsive avec le design du site (vert pine, boutons contact).
 *
 * Les placeholders sont en français (`{{Prénom}}`, `{{Zone}}`…)
 * pour rester compréhensibles par l'admin dans le CRM.
 */

import { prisma } from "@/lib/prisma";
import type { Application, EmailTemplate, Setting } from "@prisma/client";
import { buildEmailHtml } from "@/lib/email/template";
import { getEmailHeaderSettings, getEmailFooterSettings } from "@/lib/brand";

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
    language?: string | null;
    country?: string | null;
  };
  settings: Record<string, string>;
}

// ============================================================
// Variables
// ============================================================

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
    Pays: app.country ?? "",
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
    "Nom de la marque": s["cms.brand_name"] ?? "domipackung",
  };
}

// ============================================================
// Substitution
// ============================================================

const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;


export function substitute(
  input: string,
  vars: Record<string, string>,
): { output: string; unknownVars: string[] } {
  const unknown = new Set<string>();
  const output = input.replace(PLACEHOLDER, (_m, key: string) => {
    const trimmed = key.trim();
    if (trimmed in vars) return vars[trimmed];
    unknown.add(trimmed);
    return "";
  });
  return { output, unknownVars: [...unknown] };
}

// ============================================================
// Wrapper HTML — délégué à lib/email/template.ts
// ============================================================

async function wrapEmailHtml(
  bodyText: string,
  vars: Record<string, string>,
): Promise<string> {
  const [header, footer] = await Promise.all([
    getEmailHeaderSettings(),
    getEmailFooterSettings(),
  ]);
  return buildEmailHtml(
    bodyText,
    header,
    footer,
    vars["WhatsApp URL"] || undefined,
    vars["Messenger URL"] || undefined,
  );
}

// ============================================================
// API principale
// ============================================================

export interface RenderEmailInput {
  triggerKey: string;
  application: RenderContext["application"];
  settings: RenderContext["settings"];
  /** Locale du destinataire ("de" | "fr"). Fallback "de". */
  locale?: string;
}

export interface RenderEmailResult {
  ok: true;
  template: Pick<EmailTemplate, "id" | "name" | "subject" | "body">;
  content: EmailContent;
  unknownVars: string[];
}

export async function renderEmail(
  input: RenderEmailInput,
): Promise<
  | RenderEmailResult
  | { ok: false; reason: "no_template" | "template_inactive" }
> {
  const locale = input.locale || input.application.language || "de";

  // 1. Essayer la locale exacte
  let tpl = await prisma.emailTemplate.findFirst({
    where: { triggerKey: input.triggerKey, status: "actif", locale },
    orderBy: { sort: "asc" },
  });

  // 2. Fallback allemand (défaut)
  if (!tpl && locale !== "de") {
    tpl = await prisma.emailTemplate.findFirst({
      where: { triggerKey: input.triggerKey, status: "actif", locale: "de" },
      orderBy: { sort: "asc" },
    });
  }

  // 3. Fallback sans filtre locale (anciennes données)
  if (!tpl) {
    tpl = await prisma.emailTemplate.findFirst({
      where: { triggerKey: input.triggerKey, status: "actif" },
      orderBy: [{ locale: "asc" }, { sort: "asc" }],
    });
  }

  if (!tpl) {
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

  const html = await wrapEmailHtml(body.output, vars);

  return {
    ok: true,
    template: { id: tpl.id, name: tpl.name, subject: tpl.subject, body: tpl.body },
    content: {
      subject: subj.output,
      text: body.output,
      html,
    },
    unknownVars,
  };
}

// ============================================================
// Helper
// ============================================================

export async function loadRenderSettings(
  raw: Setting[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const s of raw) map[s.key] = s.value;
  return map;
}
