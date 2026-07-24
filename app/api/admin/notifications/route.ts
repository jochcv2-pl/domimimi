import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api";
import { auth } from "@/auth";

/**
 * GET /api/admin/notifications
 *
 * Retourne les 50 dernières notifications (non-lues d'abord, puis par date).
 * Inclut le compteur unreadCount.
 *
 * PATCH /api/admin/notifications  (body: { action: "read-all" })
 * Marque toutes les notifications comme lues.
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

export async function GET() {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        orderBy: [{ read: "asc" }, { createdAt: "desc" }],
        take: 50,
      }),
      prisma.notification.count({ where: { read: false } }),
    ]);

    return apiSuccess({ notifications, unreadCount });
  } catch (err) {
    console.error("[api/admin/notifications] GET error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("JSON invalide", "INVALID_JSON", 400);
  }

  const action = (body as { action?: string })?.action;

  if (action === "read-all") {
    try {
      await prisma.notification.updateMany({
        where: { read: false },
        data: { read: true },
      });
      return apiSuccess({ updated: true });
    } catch (err) {
      console.error("[api/admin/notifications] PATCH read-all error:", err);
      return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
    }
  }

  return apiError("Action inconnue", "BAD_REQUEST", 400);
}
