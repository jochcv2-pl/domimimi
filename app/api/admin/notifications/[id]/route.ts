import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api";
import { auth } from "@/auth";

/**
 * PATCH /api/admin/notifications/[id]
 * Marque UNE notification comme lue.
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

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  const { id } = await params;
  if (!id) return apiError("ID manquant", "INVALID_ID", 400);

  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return apiSuccess({ updated: true });
  } catch (err) {
    console.error("[api/admin/notifications/[id]] PATCH error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
