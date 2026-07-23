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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
// Wrapper HTML responsive — design du site
// ============================================================

function wrapEmailHtml(
  bodyText: string,
  vars: Record<string, string>,
): string {
  const brand = vars["Nom de la marque"] || "domipackung";
  const whatsapp = vars["WhatsApp URL"];
  const messenger = vars["Messenger URL"];

  // Convertir le texte du body en paragraphes HTML
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px 0;">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");

  // Boutons WhatsApp / Messenger (si URLs présentes)
  let buttonsHtml = "";
  if (whatsapp || messenger) {
    const btns: string[] = [];
    if (whatsapp) {
      btns.push(
        `<a href="${escapeHtml(whatsapp)}" style="display:inline-block;padding:12px 24px;background:#25D366;color:#fff !important;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin:0 6px 6px 0;">WhatsApp</a>`,
      );
    }
    if (messenger) {
      btns.push(
        `<a href="${escapeHtml(messenger)}" style="display:inline-block;padding:12px 24px;background:#0084FF;color:#fff !important;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin:0 6px 6px 0;">Messenger</a>`,
      );
    }
    buttonsHtml = `
      <tr><td style="padding:20px 0 8px 0;text-align:center;">${btns.join("")}</td></tr>`;
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(brand)}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f1;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f1;min-height:100vh;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:#0F2019;padding:24px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#C8A87E;letter-spacing:0.5px;">${escapeHtml(brand)}</span>
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="height:4px;background:#2C5344;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 28px 8px 28px;font-size:15px;line-height:1.6;color:#1f2933;">
              ${paragraphs}
            </td>
          </tr>${buttonsHtml}

          <!-- Footer -->
          <tr>
            <td style="padding:24px 28px 32px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #e9eceb;padding-top:20px;">
                    <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#2C5344;">${escapeHtml(brand)}</p>
                    <p style="margin:0;font-size:12px;color:#95A198;line-height:1.5;">
                      Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht auf diese Nachricht.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

  return {
    ok: true,
    template: { id: tpl.id, name: tpl.name, subject: tpl.subject, body: tpl.body },
    content: {
      subject: subj.output,
      text: body.output,
      html: wrapEmailHtml(body.output, vars),
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
