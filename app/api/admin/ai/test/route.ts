// Domipack — Route API : Test de connexion IA
//
// POST /api/admin/ai/test
// Envoie un prompt trivial au moteur IA configuré et retourne le résultat.
//
// Protégé : session NextAuth + ADMIN/SUPER_ADMIN.

import { auth } from "@/auth";
import { testConnection, invalidateAiCache } from "@/lib/ai";
import { apiSuccess, apiError } from "@/lib/api";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

export async function POST() {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  // Invalider le cache pour tester avec les settings les plus récents
  // (l'admin vient peut-être de changer l'endpoint)
  invalidateAiCache();

  const result = await testConnection();

  if (result.ok) {
    return apiSuccess({
      ok: true,
      model: result.model,
      latencyMs: result.latencyMs,
    });
  }

  // 200 mais ok=false pour que le front puisse afficher le message d'erreur
  return apiSuccess({
    ok: false,
    error: result.error,
    code: result.code,
  });
}
