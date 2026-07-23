import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiZodError } from "@/lib/api";

/**
 * PATCH /api/admin/missions/[id]
 * Met à jour une mission (zone, product, payMode, etc.).
 * Peut aussi changer le statut (disponible → terminee…).
 *
 * DELETE /api/admin/missions/[id]
 * Supprime définitivement une mission.
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

const updateMissionSchema = z
  .object({
    zone: z.string().min(1).max(200).optional(),
    product: z.string().max(100).optional().nullable(),
    payMode: z.enum(["hourly", "package"]).optional().nullable(),
    weeklyPackages: z.number().int().min(0).max(10000).optional().nullable(),
    startDate: z.coerce.date().optional().nullable(),
    status: z.enum(["disponible", "assignee", "terminee"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Au moins un champ doit être fourni",
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  const { id } = await params;
  if (!id) return apiError("ID manquant", "INVALID_ID", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("JSON invalide", "INVALID_JSON", 400);
  }

  const parsed = updateMissionSchema.safeParse(body);
  if (!parsed.success) return apiZodError(parsed.error);

  const existing = await prisma.mission.findUnique({ where: { id } });
  if (!existing) return apiError("Mission introuvable", "NOT_FOUND", 404);

  const update = { ...parsed.data } as Record<string, unknown>;

  // Si on repasse à "disponible", on désassigne l'emballeur
  if (update.status === "disponible") {
    update.applicationId = null;
  }

  const updated = await prisma.mission.update({
    where: { id },
    data: update,
  });

  return apiSuccess({ data: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  const { id } = await params;
  if (!id) return apiError("ID manquant", "INVALID_ID", 400);

  const existing = await prisma.mission.findUnique({ where: { id } });
  if (!existing) return apiError("Mission introuvable", "NOT_FOUND", 404);

  await prisma.mission.delete({ where: { id } });

  return apiSuccess({ deleted: true });
}
