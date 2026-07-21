import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiZodError } from "@/lib/api";
import { createSeoAuditSchema } from "@/lib/validations";

/**
 * GET /api/admin/seo-audits
 *   ?limit=N            (défaut 10, max 50) — audits les plus récents en premier
 *   ?latest=1           (raccourci : renvoie uniquement le dernier audit)
 *
 * POST /api/admin/seo-audits
 *   Crée un nouvel audit immuable (snapshot). L'Agent SEO écrit ici ;
 *   l'admin déclenche un nouvel audit via ce endpoint.
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

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  const url = request.nextUrl;
  const latest = url.searchParams.get("latest") === "1";
  const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "10", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10;

  try {
    if (latest) {
      const audit = await prisma.seoAudit.findFirst({
        orderBy: { createdAt: "desc" },
      });
      return apiSuccess({ data: audit });
    }

    const audits = await prisma.seoAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return apiSuccess({ data: audits });
  } catch (err) {
    console.error("[api/admin/seo-audits] GET error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("JSON invalide", "INVALID_JSON", 400);
  }

  const parsed = createSeoAuditSchema.safeParse(body);
  if (!parsed.success) return apiZodError(parsed.error);

  try {
    const audit = await prisma.seoAudit.create({ data: parsed.data });
    return apiSuccess({ data: audit }, 201);
  } catch (err) {
    console.error("[api/admin/seo-audits] POST error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
