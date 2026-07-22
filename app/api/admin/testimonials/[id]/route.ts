import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api";

/**
 * PUT /api/admin/testimonials/[id]
 * Met à jour un témoignage existant.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return apiError("Non autorisé", "UNAUTHORIZED", 401);
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN")
    return apiError("Non autorisé", "UNAUTHORIZED", 401);

  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.role !== undefined) data.role = String(body.role).trim();
    if (body.quote !== undefined) data.quote = String(body.quote).trim();
    if (body.rating !== undefined)
      data.rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    if (body.photoUrl !== undefined)
      data.photoUrl = body.photoUrl || null;
    if (body.locale !== undefined) data.locale = body.locale;
    if (body.sort !== undefined) data.sort = Number(body.sort) || 0;
    if (body.active !== undefined) data.active = Boolean(body.active);

    const updated = await prisma.testimonial.update({
      where: { id },
      data,
    });

    return apiSuccess({ item: updated });
  } catch (err) {
    console.error("[testimonials PUT] Erreur:", err);
    return apiError("Erreur lors de la mise à jour", "UPDATE_ERROR", 500);
  }
}

/**
 * DELETE /api/admin/testimonials/[id]
 * Supprime un témoignage.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return apiError("Non autorisé", "UNAUTHORIZED", 401);
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN")
    return apiError("Non autorisé", "UNAUTHORIZED", 401);

  try {
    const { id } = await params;
    await prisma.testimonial.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error("[testimonials DELETE] Erreur:", err);
    return apiError("Erreur lors de la suppression", "DELETE_ERROR", 500);
  }
}
