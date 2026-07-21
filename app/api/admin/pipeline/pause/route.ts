import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api";

/**
 * POST /api/admin/pipeline/pause
 *   { paused: boolean }
 *
 * Bascule l'état `pipeline.paused`. Quand true, le cron `/api/cron/process-emails`
 * termine immédiatement sans rien envoyer. Aucun effet sur les emails déjà logués.
 *
 * Bouton d'urgence : permet à l'admin d'arrêter tout envoi sans toucher au cron
 * ni redémarrer le serveur. Effet immédiat (lecture DB à chaque cycle).
 *
 * Protégé : session NextAuth + ADMIN/SUPER_ADMIN.
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("JSON invalide", "INVALID_JSON", 400);
  }

  if (typeof body !== "object" || body === null || typeof (body as { paused?: unknown }).paused !== "boolean") {
    return apiError("Corps attendu : { paused: boolean }", "INVALID_BODY", 400);
  }

  const paused = (body as { paused: boolean }).paused;

  try {
    await prisma.setting.upsert({
      where: { key: "pipeline.paused" },
      update: { value: paused ? "true" : "false" },
      create: { key: "pipeline.paused", value: paused ? "true" : "false" },
    });
    return apiSuccess({ paused });
  } catch (err) {
    console.error("[api/admin/pipeline/pause] error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
