import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiZodError } from "@/lib/api";
import { updateApplicationSchema } from "@/lib/validations";

/**
 * PATCH /api/admin/applications/[id]
 *
 * Met à jour une candidature (pipe, city/zone/source, relances, etc.).
 * Si `pipe` passe à `client`, on backdate automatiquement `validatedAt`
 * et on set `relanceStop = valide` (sauf si déjà fourni).
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return apiError("Non autorisé", "UNAUTHORIZED", 401);
  }

  const { id } = await params;
  if (!id) {
    return apiError("ID manquant", "INVALID_ID", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("JSON invalide", "INVALID_JSON", 400);
  }

  const parsed = updateApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return apiZodError(parsed.error);
  }

  // Vérifier que la candidature existe
  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) {
    return apiError("Candidature introuvable", "NOT_FOUND", 404);
  }

  const update = { ...parsed.data } as Record<string, unknown>;

  // Si on passe à "client" (emballeur validé), tracer la validation
  // (décision crm.relance.stop_conditions — validé emballeur arrête les relances).
  if (update.pipe === "client" && existing.pipe !== "client") {
    update.validatedAt = new Date();
    update.validatedById = session.user.id;
    if (update.relanceStop === undefined || update.relanceStop === null) {
      update.relanceStop = "valide";
    }
  }

  // Si on quitte "client", on nettoie les champs de validation
  // (mais on garde l'historique validatedAt si jamais — pas d'effacement).
  if (existing.pipe === "client" && update.pipe && update.pipe !== "client") {
    // Pas de reset automatique : l'admin peut choisir de le faire explicitement.
  }

  try {
    const updated = await prisma.application.update({
      where: { id },
      data: update,
      include: {
        validatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    return apiSuccess({ data: updated });
  } catch (err) {
    console.error("[api/admin/applications/[id]] PATCH error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
