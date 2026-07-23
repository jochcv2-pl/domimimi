import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiZodError } from "@/lib/api";

/**
 * GET /api/admin/missions
 * Liste toutes les missions (tous statuts confondus).
 *
 * POST /api/admin/missions
 * Crée une mission standalone (zone obligatoire, texte libre).
 *
 * Protégé : ADMIN/SUPER_ADMIN.
 */

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

const createMissionSchema = z.object({
  zone: z.string().min(1, "La zone est obligatoire").max(200),
  product: z.string().max(100).optional().nullable(),
  payMode: z.enum(["hourly", "package"]).optional().nullable(),
  weeklyPackages: z.number().int().min(0).max(10000).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
});

export async function GET() {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      application: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          city: true,
          postalCode: true,
        },
      },
    },
  });

  return apiSuccess({ data: missions });
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

  const parsed = createMissionSchema.safeParse(body);
  if (!parsed.success) return apiZodError(parsed.error);

  const { zone, product, payMode, weeklyPackages, startDate } = parsed.data;

  const mission = await prisma.mission.create({
    data: {
      zone,
      product: product ?? undefined,
      payMode: payMode ?? undefined,
      weeklyPackages: weeklyPackages ?? undefined,
      startDate: startDate ?? undefined,
    },
  });

  return apiSuccess({ data: mission }, 201);
}
