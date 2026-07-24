import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiZodError } from "@/lib/api";
import { updateApplicationSchema } from "@/lib/validations";
import { loadPipelineSettings } from "@/lib/email/engine";
import { getProvider } from "@/lib/email/providers";
import { renderEmail } from "@/lib/email/render";
import { createNotification } from "@/lib/notifications";

/**
 * PATCH /api/admin/applications/[id]
 *
 * Met à jour une candidature (pipe, city/zone/source, relances, etc.).
 * Si `pipe` passe à `client`, on backdate automatiquement `validatedAt`
 * et on set `relanceStop = valide` (sauf si déjà fourni).
 *
 * Protégé : session NextAuth + rôle ADMIN/SUPER_ADMIN.
 */

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

  const parsed = updateApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return apiZodError(parsed.error);
  }

  // Vérifier que la candidature existe
  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) {
    return apiError("Candidature introuvable", "NOT_FOUND", 404);
  }

  const update = { ...parsed.data } as Record<string, unknown>;

  // Si on passe à "client" (emballeur validé), tracer la validation
  // (décision crm.relance.stop_conditions — validé emballeur arrête les relances).
  const wasValidated = update.pipe === "client" && existing.pipe !== "client";
  if (wasValidated) {
    update.validatedAt = new Date();
    update.validatedById = session.user.id;
    if (update.relanceStop === undefined || update.relanceStop === null) {
      update.relanceStop = "valide";
    }
  }

  // Si on passe à "perdu" (rejet), arrêter les relances
  if (update.pipe === "perdu" && existing.pipe !== "perdu") {
    if (update.relanceStop === undefined || update.relanceStop === null) {
      update.relanceStop = "exclusion";
    }
  }

  // Si on quitte "client", on nettoie les champs de validation
  // (mais on garde l'historique validatedAt si jamais — pas d'effacement).
  if (existing.pipe === "client" && update.pipe && update.pipe !== "client") {
    // Pas de reset automatique : l'admin peut choisir de le faire explicitement.
  }

  try {
    const updated = await prisma.application.update({
      where: { id },
      data: update,
      include: {
        validatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Si validation emballeur (pipe → client), envoyer l'email d'acceptation
    if (wasValidated) {
      sendValidationEmail(updated).catch((err) => {
        console.error("[validation-email] Échec:", err);
      });
      createNotification({
        kind: "success",
        title: "Emballeur validé",
        body: `${updated.firstName} ${updated.lastName} a été validé comme emballeur.`,
        link: "emballeurs",
      }).catch(() => {});
    }

    // Si rejet (pipe → perdu), notifier
    if (update.pipe === "perdu" && existing.pipe !== "perdu") {
      createNotification({
        kind: "alert",
        title: "Candidat rejeté",
        body: `${existing.firstName} ${existing.lastName} a été marqué comme perdu.`,
        link: "candidats",
      }).catch(() => {});
    }

    return apiSuccess({ data: updated });
  } catch (err) {
    console.error("[api/admin/applications/[id]] PATCH error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}

/**
 * Envoie l'email "validation" au candidat dont la candidature vient
 * d'être acceptée (pipe → client). Non bloquant — erreurs loggées.
 */
async function sendValidationEmail(app: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  postalCode: string;
  city: string | null;
  zone: string | null;
  language: string | null;
  country: string | null;
}) {
  const settings = await loadPipelineSettings();

  const rendered = await renderEmail({
    triggerKey: "validation",
    application: app,
    settings: settings.raw,
    locale: app.language ?? "de",
  });

  if (!rendered.ok) {
    console.warn("[validation-email] Pas de template 'validation' (triggerKey)");
    return;
  }

  const provider = getProvider(settings.providerName);
  if (!provider.isConfigured()) {
    console.warn("[validation-email] Provider non configuré");
    return;
  }

  const sendResult = await provider.send({
    to: app.email,
    from: settings.fromAddress,
    subject: rendered.content.subject,
    html: rendered.content.html,
    text: rendered.content.text,
  });

  await prisma.emailLog.upsert({
    where: {
      applicationId_trigger: { applicationId: app.id, trigger: "validation" },
    },
    create: {
      applicationId: app.id,
      trigger: "validation",
      templateName: rendered.template.name,
      toEmail: app.email,
      provider: settings.providerName,
      status: sendResult.ok ? "sent" : "failed",
      providerMessageId: sendResult.ok ? (sendResult.messageId ?? null) : null,
      error: sendResult.ok ? null : sendResult.error,
      sentAt: sendResult.ok ? new Date() : null,
    },
    update: {
      templateName: rendered.template.name,
      status: sendResult.ok ? "sent" : "failed",
      providerMessageId: sendResult.ok ? (sendResult.messageId ?? null) : null,
      error: sendResult.ok ? null : sendResult.error,
      sentAt: sendResult.ok ? new Date() : null,
    },
  });
}

/**
 * DELETE /api/admin/applications/[id]
 *
 * Supprime définitivement une candidature + tous ses logs (cascade).
 * Action irréversible.
 *
 * Protégé : session NextAuth + rôle ADMIN/SUPER_ADMIN.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return apiError("Non autorisé", "UNAUTHORIZED", 401);
  }

  const { id } = await params;
  if (!id) {
    return apiError("ID manquant", "INVALID_ID", 400);
  }

  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) {
    return apiError("Candidature introuvable", "NOT_FOUND", 404);
  }

  try {
    await prisma.application.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error("[api/admin/applications/[id]] DELETE error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
