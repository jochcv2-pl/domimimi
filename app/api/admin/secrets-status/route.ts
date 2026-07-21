import { auth } from "@/auth";
import { apiSuccess, apiError } from "@/lib/api";

/**
 * GET /api/admin/secrets-status
 *
 * Vérifie quels secrets sont configurés dans .env SANS JAMAIS exposer leur valeur.
 * Renvoie un map { secretKey: boolean }.
 *
 * Secrets surveillés :
 *   - EMAIL_RESEND_API_KEY     (clé API Resend)
 *   - EMAIL_BREVO_API_KEY      (clé API Brevo)
 *   - EMAIL_SMTP_HOST          (hôte SMTP Hostinger)
 *   - EMAIL_SMTP_USER          (identifiant SMTP)
 *   - EMAIL_SMTP_PASSWORD      (mot de passe SMTP)
 *   - AI_API_KEY               (clé API IA — optionnelle pour Ollama local)
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

const SECRET_KEYS = [
  "EMAIL_RESEND_API_KEY",
  "EMAIL_BREVO_API_KEY",
  "EMAIL_SMTP_HOST",
  "EMAIL_SMTP_USER",
  "EMAIL_SMTP_PASSWORD",
  "AI_API_KEY",
] as const;

export async function GET() {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  const status: Record<string, boolean> = {};
  for (const k of SECRET_KEYS) {
    const v = process.env[k];
    status[k] = typeof v === "string" && v.trim().length > 0;
  }
  return apiSuccess({ data: status });
}
