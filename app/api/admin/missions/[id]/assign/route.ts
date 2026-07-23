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
 * POST /api/admin/missions/[id]/assign
 *
 * Assigne une mission à un emballeur validé (Application pipe=client).
 * - Met à jour la mission (applicationId, status=assignee)
 * - Envoie automatiquement un email "mission_assigned" à l'emballeur
 *
 * Body: { applicationId: string }
 *
 * Protégé : ADMIN/SUPER_ADMIN.
 */

const assignSchema = z.object({
  applicationId: z.string().min(1, "L'emballeur est obligatoire"),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  const { id: missionId } = await params;
  if (!missionId) return apiError("ID manquant", "INVALID_ID", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("JSON invalide", "INVALID_JSON", 400);
  }

  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) return apiZodError(parsed.error);

  const { applicationId } = parsed.data;

  // Vérifier que la mission existe
  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) return apiError("Mission introuvable", "NOT_FOUND", 404);

  // Vérifier que l'emballeur existe et est validé
  const emballeur = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!emballeur) return apiError("Emballeur introuvable", "NOT_FOUND", 404);
  if (emballeur.pipe !== "client") {
    return apiError("Cet emballeur n'est pas validé", "NOT_EMBALLEUR", 400);
  }

  // Assigner la mission
  const updated = await prisma.mission.update({
    where: { id: missionId },
    data: {
      applicationId,
      status: "assignee",
    },
    include: {
      application: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  // Envoyer l'email
  const settings = await loadPipelineSettings();
  const emailResult = await sendMissionAssignedEmail(
    {
      id: emballeur.id,
      firstName: emballeur.firstName,
      lastName: emballeur.lastName,
      email: emballeur.email,
      postalCode: emballeur.postalCode,
      city: emballeur.city,
      zone: mission.zone,
      product: mission.product,
      payMode: (emballeur.payMode ?? mission.payMode ?? null) as PayMode | null,
      weeklyPackages: mission.weeklyPackages,
      startDate: mission.startDate,
    },
    settings,
  );

  return apiSuccess({
    data: updated,
    emailSent: emailResult.ok,
    emailError: emailResult.ok ? undefined : emailResult.error,
  });
}

async function sendMissionAssignedEmail(
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
    // Fallback allemand
    const brand = settings.raw["cms.brand_name"] ?? "domipackung";
    const payInfo =
      app.payMode === "hourly"
        ? "Vergütung: pro Stunde"
        : app.payMode === "package"
          ? `Vergütung: pro Paket (${app.weeklyPackages ?? 0} Pakete/Woche)`
          : "";
    const dateStr = app.startDate
      ? `Startdatum: ${app.startDate.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}`
      : "";

    subject = `Ihre Mission bei ${brand} – Zone ${app.zone ?? ""}`;
    text = `Hallo ${app.firstName},

wir haben Ihnen eine Mission zugewiesen.

Einsatzzone: ${app.zone ?? ""}
Produkte: ${app.product ?? "Pakete"}
${payInfo}
${dateStr}

Bei Fragen antworten Sie einfach auf diese E-Mail.

Mit freundlichen Grüßen
Ihr ${brand}-Team`;

    templateName = "(mission_assigned fallback)";

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

  // Logger
  await prisma.emailLog.upsert({
    where: {
      applicationId_trigger: {
        applicationId: app.id,
        trigger: "mission_assigned",
      },
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

  if (!sendResult.ok) return { ok: false, error: sendResult.error };
  return { ok: true };
}
