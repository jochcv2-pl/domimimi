import { apiSuccess } from "@/lib/api";

/**
 * GET /api/health
 *
 * Healthcheck simple pour Docker / load balancer / monitoring.
 * Pas d'auth, pas de DB — juste confirme que le process Next.js répond.
 * Pour un healthcheck complet (DB + email provider), créer /api/health/deep.
 */
export async function GET() {
  return apiSuccess({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
