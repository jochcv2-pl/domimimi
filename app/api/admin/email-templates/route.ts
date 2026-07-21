import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiZodError } from "@/lib/api";
import {
  bulkUpdateEmailTemplatesSchema,
  createEmailTemplateSchema,
} from "@/lib/validations";

/**
 * GET /api/admin/email-templates
 * POST /api/admin/email-templates  (crée un nouveau template)
 *
 * Liste tous les templates (tous statuts) ou crée un nouveau.
 * Protégé : session NextAuth + ADMIN/SUPER_ADMIN.
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
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    });
    return apiSuccess({ data: templates });
  } catch (err) {
    console.error("[api/admin/email-templates] GET error:", err);
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

  const parsed = createEmailTemplateSchema.safeParse(body);
  if (!parsed.success) return apiZodError(parsed.error);

  try {
    // Calcule le prochain sort
    const maxSort = await prisma.emailTemplate.aggregate({ _max: { sort: true } });
    const sort = (maxSort._max.sort ?? 0) + 1;

    const created = await prisma.emailTemplate.create({
      data: { ...parsed.data, sort },
    });
    return apiSuccess({ data: created }, 201);
  } catch (err) {
    console.error("[api/admin/email-templates] POST error:", err);
    return apiError("Erreur lors de la création", "INTERNAL_ERROR", 500);
  }
}

/**
 * PUT /api/admin/email-templates  (mise à jour bulk transactionnelle)
 * Body : { templates: [{ id, name?, subject?, body?, status?, … }] }
 */
export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("JSON invalide", "INVALID_JSON", 400);
  }

  const parsed = bulkUpdateEmailTemplatesSchema.safeParse(body);
  if (!parsed.success) return apiZodError(parsed.error);

  try {
    const result = await prisma.$transaction(
      parsed.data.templates.map((t) =>
        prisma.emailTemplate.update({
          where: { id: t.id },
          data: {
            ...(t.name !== undefined ? { name: t.name } : {}),
            ...(t.trigger !== undefined ? { trigger: t.trigger } : {}),
            ...(t.agentKey !== undefined ? { agentKey: t.agentKey } : {}),
            ...(t.subject !== undefined ? { subject: t.subject } : {}),
            ...(t.body !== undefined ? { body: t.body } : {}),
            ...(t.status !== undefined ? { status: t.status } : {}),
            ...(t.sort !== undefined ? { sort: t.sort } : {}),
          },
        })
      )
    );
    return apiSuccess({ data: result, updated: result.length });
  } catch (err) {
    console.error("[api/admin/email-templates] PUT error:", err);
    return apiError("Erreur serveur lors de la mise à jour", "INTERNAL_ERROR", 500);
  }
}
