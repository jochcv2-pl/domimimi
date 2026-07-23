import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiZodError } from "@/lib/api";
import { loadPipelineSettings, type PipelineSettings } from "@/lib/email/engine";
import { getProvider } from "@/lib/email/providers";
import { renderEmail } from "@/lib/email/render";
import type { PayMode } from "@prisma/client";

/**
 * POST /api/admin/applications/[id]/assign-mission
 *
 * Assigne une mission à un emballeur validé (pipe=client).
 * Met à jour les champs mission (zone, product, payMode, weeklyPackages, startDate)
 * ET envoie automatiquement un email "mission_assigned" à l'emballeur.
 *
 * Body :
 *   - zone         (obligatoire, texte libre écrit par l'admin)
 *   - product      (optionnel)
 *   - payMode      (optionnel : "hourly" | "package")
 *   - weeklyPackages (optionnel)
 *   - startDate    (optionnel, ISO date)
 *
 * Protégé : session NextAuth + rôle ADMIN/SUPER_ADMIN.
 */

const assignMissionSchema = z.object({
  zone: z.string().min(1, "La zone est obligatoire").max(200),
  product: z.string().max(100).optional().nullable(),
  payMode: z.enum(["hourly", "package"]).optional().nullable(),
  weeklyPackages: z.number().int().min(0).max(10000).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

/**
 * Envoie l'email de mission assignée.
 * Utilise le template DB triggerKey="mission_assigned" si présent,
 * sinon un fallback allemand hardcoded.
 */
async function sendMissionEmail(
  app: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    postalCode: string;
    city: string | null;
    zone: string | null;
    product: string | null;
    payMode: PayMode | null;
    weeklyPackages: number | null;
    startDate: Date | null;
  },
  settings: PipelineSettings,
): Promise<{ ok: boolean; error?: string }> {
  const rendered = await renderEmail({
    triggerKey: "mission_assigned",
    application: app,
    settings: settings.raw,
  });

  let subject: string;
  let html: string;
  let text: string;
  let templateName: string;

  if (rendered.ok) {
    subject = rendered.content.subject;
    html = rendered.content.html;
    text = rendered.content.text;
    templateName = rendered.template.name;
  } else {
    // Fallback : email allemand par défaut si pas de template en DB
    const zone = app.zone ?? "";
    const product = app.product ?? "Pakete";
    const payInfo =
      app.payMode === "hourly"
        ? "Bezahlung: pro Stunde"
        : app.payMode === "package"
          ? `Bezahlung: pro Paket (${app.weeklyPackages ?? 0} Pakete/Woche)`
          : "";
    const dateStr = app.startDate
      ? `Startdatum: ${app.startDate.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}`
      : "";

    subject = `Ihre Mission bei {{Nom de la marque}} – Zone ${zone}`;
    text = `Hallo ${app.firstName},

wir haben Ihnen eine Mission zugewiesen.

Einsatzzone: ${zone}
Produkte: ${product}
${payInfo}
${dateStr}

Wenn Sie Fragen haben, antworten Sie einfach auf diese E-Mail.

Mit freundlichen Grüßen
Ihr {{Nom de la marque}}-Team`;

    // Substitute brand name
    const brand = settings.raw["cms.brand_name"] ?? "domipackung";
    subject = subject.replace("{{Nom de la marque}}", brand);
    text = text.replaceAll("{{Nom de la marque}}", brand);

    templateName = "(mission_assigned fallback)";

    // Minimal HTML
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
      .join("");
    html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2933;">${paragraphs}</div>`;
  }

  const provider = getProvider(settings.providerName);
  if (!provider.isConfigured()) {
    return { ok: false, error: "Provider email non configuré" };
  }

  const sendResult = await provider.send({
    to: app.email,
    from: settings.fromAddress,
    subject,
    html,
    text,
  });

  // Logger l'envoi (upsert pour éviter P2002)
  await prisma.emailLog.upsert({
    where: {
      applicationId_trigger: { applicationId: app.id, trigger: "mission_assigned" },
    },
    create: {
      applicationId: app.id,
      trigger: "mission_assigned",
      templateName,
      toEmail: app.email,
      provider: settings.providerName,
      status: sendResult.ok ? "sent" : "failed",
      providerMessageId: sendResult.ok ? (sendResult.messageId ?? null) : null,
      error: sendResult.ok ? null : sendResult.error,
      sentAt: sendResult.ok ? new Date() : null,
    },
    update: {
      templateName,
      status: sendResult.ok ? "sent" : "failed",
      providerMessageId: sendResult.ok ? (sendResult.messageId ?? null) : null,
      error: sendResult.ok ? null : sendResult.error,
      sentAt: sendResult.ok ? new Date() : null,
    },
  });

  if (!sendResult.ok) {
    return { ok: false, error: sendResult.error };
  }
  return { ok: true };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return apiError("Non autorisé", "UNAUTHORIZED", 401);
  }

  const { id } = await params;
  if (!id) {
    return apiError("ID manquant", "INVALID_ID", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("JSON invalide", "INVALID_JSON", 400);
  }

  const parsed = assignMissionSchema.safeParse(body);
  if (!parsed.success) {
    return apiZodError(parsed.error);
  }

  // Vérifier que la candidature existe et est un emballeur validé
  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) {
    return apiError("Candidature introuvable", "NOT_FOUND", 404);
  }
  if (existing.pipe !== "client") {
    return apiError(
      "Cet emballeur n'est pas validé (pipe != client)",
      "NOT_EMBALLEUR",
      400,
    );
  }

  const { zone, product, payMode, weeklyPackages, startDate } = parsed.data;

  try {
    // 1. Mettre à jour les champs mission
    const updated = await prisma.application.update({
      where: { id },
      data: {
        zone,
        product: product ?? undefined,
        payMode: payMode ?? undefined,
        weeklyPackages: weeklyPackages ?? undefined,
        startDate: startDate ?? undefined,
      },
      include: {
        validatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // 2. Envoyer l'email de mission assignée
    const settings = await loadPipelineSettings();
    const emailResult = await sendMissionEmail(
      {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        postalCode: updated.postalCode,
        city: updated.city,
        zone: updated.zone,
        product: updated.product,
        payMode: updated.payMode,
        weeklyPackages: updated.weeklyPackages,
        startDate: updated.startDate,
      },
      settings,
    );

    return apiSuccess({
      data: updated,
      emailSent: emailResult.ok,
      emailError: emailResult.ok ? undefined : emailResult.error,
    });
  } catch (err) {
    console.error("[assign-mission] error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
