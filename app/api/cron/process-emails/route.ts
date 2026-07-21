import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { apiSuccess, apiError } from "@/lib/api";
import { runEmailCycle } from "@/lib/email/engine";

/**
 * Comparaison timing-safe pour le secret cron (audit Kyle fix #4).
 * Évite les timing attacks théoriques sur `x-cron-secret`.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/cron/process-emails
 *
 * Cycle du pipeline email — doit être appelé par un cron externe
 * (Vercel Cron, systemd, Windows Task Scheduler en dev) toutes les
 * minutes (ou selon `pipeline.cron_interval`).
 *
 * Authentification : header `x-cron-secret` comparé à la variable
 * d'environnement `CRON_SECRET` (timing-safe). Jamais de session
 * NextAuth : ce endpoint n'est pas destiné à un navigateur.
 *
 * Réponse : récap du cycle (traités, envoyés, échoués, etc.).
 * Toujours 200, même si 0 envoi — le cron doit pouvoir logger.
 */
export async function POST(request: NextRequest) {
  // 1) Vérifier le secret partagé (timing-safe)
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Si CRON_SECRET n'est pas configuré, on refuse tout appel :
    // éviter qu'un endpoint "ouvert" ne déclenche des envois réels.
    return apiError(
      "CRON_SECRET manquant dans .env — configure le secret partagé.",
      "CRON_NOT_CONFIGURED",
      500,
    );
  }
  const got = request.headers.get("x-cron-secret");
  if (!got || !safeEqual(got, expected)) {
    return apiError("Secret cron invalide", "UNAUTHORIZED", 401);
  }

  // 2) Paramètres optionnels (via query string)
  const url = request.nextUrl;
  const dryRun = url.searchParams.get("dryRun") === "1";
  const rawLimit = Number.parseInt(url.searchParams.get("perStep") ?? "50", 10);
  const perStepLimit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 500)
    : 50;

  // 3) Exécuter le cycle
  try {
    const result = await runEmailCycle({ dryRun, perStepLimit });
    return apiSuccess({ data: result });
  } catch (err) {
    console.error("[api/cron/process-emails] error:", err);
    return apiError(
      err instanceof Error ? err.message : "Erreur serveur",
      "INTERNAL_ERROR",
      500,
    );
  }
}

/**
 * GET : renvoie 405 — le cycle doit être POST pour éviter les
 * déclenchements accidentels par un navigateur ou un preload.
 */
export async function GET() {
  return apiError("Méthode non autorisée — utilise POST", "METHOD_NOT_ALLOWED", 405);
}
