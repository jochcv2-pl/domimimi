import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api";

/**
 * DELETE /api/admin/email-templates/[id]
 *
 * Supprime définitivement un template. Irréversible.
 * Protégé : session NextAuth + ADMIN/SUPER_ADMIN.
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  const { id } = await params;
  if (!id) return apiError("ID manquant", "INVALID_ID", 400);

  try {
    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      return apiError("Template introuvable", "NOT_FOUND", 404);
    }
    await prisma.emailTemplate.delete({ where: { id } });
    return apiSuccess({ deleted: id });
  } catch (err) {
    console.error("[api/admin/email-templates/[id]] DELETE error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
