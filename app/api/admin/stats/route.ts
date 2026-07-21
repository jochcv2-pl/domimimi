import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api";
import { PIPE_VALUES } from "@/lib/validations";

/**
 * GET /api/admin/stats
 *
 * Agrégats pour le tableau de bord CRM :
 *   - KPIs : total candidats, candidats actifs (non-perdu, non-client),
 *     emballeurs validés (pipe=client), nouvelles candidatures 7 jours
 *   - Répartition par pipe (7 statuts)
 *   - Top sources (top 5 par count)
 *   - Top villes (top 5 par count)
 *
 * Protégé : session NextAuth + rôle ADMIN/SUPER_ADMIN.
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
  if (!session) {
    return apiError("Non autorisé", "UNAUTHORIZED", 401);
  }

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalApplications,
      emballeurs,
      nouveaux7j,
      pipeGroups,
      sourceGroups,
      cityGroups,
    ] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { pipe: "client" } }),
      prisma.application.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.application.groupBy({
        by: ["pipe"],
        _count: { _all: true },
      }),
      prisma.application.groupBy({
        by: ["source"],
        _count: { _all: true },
        orderBy: { _count: { source: "desc" } },
        take: 5,
      }),
      prisma.application.groupBy({
        by: ["city"],
        _count: { _all: true },
        orderBy: { _count: { city: "desc" } },
        take: 5,
      }),
    ]);

    // Répartition par pipe — on garantit les 7 clés même si vides
    const byPipe: Record<string, number> = {};
    for (const p of PIPE_VALUES) byPipe[p] = 0;
    for (const g of pipeGroups) byPipe[g.pipe] = g._count._all;

    // Candidats "actifs" = tout sauf perdu/client
    const candidatsActifs = totalApplications - (byPipe.perdu ?? 0) - (byPipe.client ?? 0);

    const bySource = sourceGroups
      .filter((g) => g.source) // ignore null
      .map((g) => ({ source: g.source, count: g._count._all }));

    const byCity = cityGroups
      .filter((g) => g.city)
      .map((g) => ({ city: g.city, count: g._count._all }));

    return apiSuccess({
      kpis: {
        totalApplications,
        candidatsActifs,
        emballeurs,
        nouveaux7j,
      },
      byPipe,
      bySource,
      byCity,
    });
  } catch (err) {
    console.error("[api/admin/stats] GET error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
