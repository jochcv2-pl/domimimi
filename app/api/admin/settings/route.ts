import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiZodError } from "@/lib/api";
import { bulkUpdateSettingsSchema } from "@/lib/validations";

/**
 * GET /api/admin/settings
 * PUT /api/admin/settings  (mise à jour bulk upsert)
 *
 * Lecture/écriture des settings (contact.whatsapp, contact.messenger,
 * email.footer, email.fromAddress, …).
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

export async function GET() {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  try {
    const settings = await prisma.setting.findMany({
      orderBy: { key: "asc" },
    });
    // Transforme en objet clé/valeur pour le frontend
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return apiSuccess({ data: map });
  } catch (err) {
    console.error("[api/admin/settings] GET error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("JSON invalide", "INVALID_JSON", 400);
  }

  const parsed = bulkUpdateSettingsSchema.safeParse(body);
  if (!parsed.success) return apiZodError(parsed.error);

  try {
    const result = await prisma.$transaction(
      parsed.data.settings.map((s) =>
        prisma.setting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value },
        })
      )
    );
    return apiSuccess({ updated: result.length });
  } catch (err) {
    console.error("[api/admin/settings] PUT error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
