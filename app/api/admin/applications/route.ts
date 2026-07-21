import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api";
import { PIPE_VALUES } from "@/lib/validations";

/**
 * GET /api/admin/applications
 *
 * Liste paginée des candidatures avec filtres (pipe, source, recherche texte).
 * Protégé : requiert session NextAuth + rôle ADMIN/SUPER_ADMIN.
 *
 * Query params :
 *   ?page=1           — page courante (1-indexed)
 *   ?limit=50         — taille de page (max 100)
 *   ?pipe=nouveau     — filtre par pipe (7 valeurs possibles)
 *   ?source=...       — filtre exact sur la source
 *   ?q=...            — recherche textuelle sur nom/email/ville
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return apiError("Non autorisé", "UNAUTHORIZED", 401);
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  const pipeRaw = searchParams.get("pipe");
  const pipe = pipeRaw && (PIPE_VALUES as readonly string[]).includes(pipeRaw)
    ? (pipeRaw as (typeof PIPE_VALUES)[number])
    : undefined;

  const source = searchParams.get("source") || undefined;
  const q = searchParams.get("q")?.trim() || undefined;

  const where: Record<string, unknown> = {};
  if (pipe) where.pipe = pipe;
  if (source) where.source = source;
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          notes: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
          validatedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.application.count({ where }),
    ]);

    return apiSuccess({
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[api/admin/applications] GET error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
