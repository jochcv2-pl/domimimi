import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api";

/**
 * GET /api/admin/testimonials
 * Liste tous les témoignages (actifs et inactifs).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("Non autorisé", "UNAUTHORIZED", 401);
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN")
    return apiError("Non autorisé", "UNAUTHORIZED", 401);

  const items = await prisma.testimonial.findMany({
    orderBy: { sort: "asc" },
  });
  return apiSuccess({ items });
}

/**
 * POST /api/admin/testimonials
 * Crée un nouveau témoignage.
 *
 * JSON body:
 *   name, role, quote, rating (1-5), photoUrl?, locale?, sort?, active?
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return apiError("Non autorisé", "UNAUTHORIZED", 401);
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN")
    return apiError("Non autorisé", "UNAUTHORIZED", 401);

  try {
    const body = await req.json();

    if (!body.name || typeof body.name !== "string")
      return apiError("Le nom est requis", "VALIDATION", 422);
    if (!body.quote || typeof body.quote !== "string")
      return apiError("Le témoignage est requis", "VALIDATION", 422);

    const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));

    const created = await prisma.testimonial.create({
      data: {
        name: body.name.trim(),
        role: (body.role || "").trim(),
        quote: body.quote.trim(),
        rating,
        photoUrl: body.photoUrl || null,
        locale: body.locale || "fr",
        sort: Number(body.sort) || 0,
        active: body.active !== false,
      },
    });

    return apiSuccess({ item: created });
  } catch (err) {
    console.error("[testimonials POST] Erreur:", err);
    return apiError("Erreur lors de la création", "CREATE_ERROR", 500);
  }
}
