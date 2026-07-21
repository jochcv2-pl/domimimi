import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiZodError } from "@/lib/api";
import { bulkUpdatePayRatesSchema } from "@/lib/validations";

/**
 * GET /api/admin/pay-rates
 *
 * Renvoie toute la grille de rémunération (taux de base + majorations zone).
 * Ordonné par `type` puis `sort`. Inclut les taux désactivés (active=false).
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

// Convertit un PayRate Prisma (Decimal) en objet JSON-safe.
function payRateToJson(r: {
  id: string;
  type: string;
  mode: string | null;
  label: string;
  amount: { toString(): string };
  unit: string;
  note: string | null;
  sort: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    type: r.type,
    mode: r.mode,
    label: r.label,
    amount: Number(r.amount.toString()),
    unit: r.unit,
    note: r.note,
    sort: r.sort,
    active: r.active,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return apiError("Non autorisé", "UNAUTHORIZED", 401);
  }

  try {
    const rates = await prisma.payRate.findMany({
      orderBy: [{ type: "asc" }, { sort: "asc" }],
    });
    return apiSuccess({ data: rates.map(payRateToJson) });
  } catch (err) {
    console.error("[api/admin/pay-rates] GET error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}

/**
 * PUT /api/admin/pay-rates
 *
 * Mise à jour en masse de la grille (transaction).
 * Body : { rates: [{ id, amount, label?, unit?, note?, active? }] }
 *
 * Une seule source de vérité : la modification se propage automatiquement
 * à la landing + aux emails agents + à la vue Missions.
 */
export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return apiError("Non autorisé", "UNAUTHORIZED", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("JSON invalide", "INVALID_JSON", 400);
  }

  const parsed = bulkUpdatePayRatesSchema.safeParse(body);
  if (!parsed.success) {
    return apiZodError(parsed.error);
  }

  try {
    const result = await prisma.$transaction(
      parsed.data.rates.map((r) =>
        prisma.payRate.update({
          where: { id: r.id },
          data: {
            amount: r.amount,
            ...(r.label !== undefined ? { label: r.label } : {}),
            ...(r.unit !== undefined ? { unit: r.unit } : {}),
            ...(r.note !== undefined ? { note: r.note } : {}),
            ...(r.active !== undefined ? { active: r.active } : {}),
          },
        })
      )
    );
    return apiSuccess({ data: result.map(payRateToJson), updated: result.length });
  } catch (err) {
    console.error("[api/admin/pay-rates] PUT error:", err);
    return apiError("Erreur serveur lors de la mise à jour", "INTERNAL_ERROR", 500);
  }
}
