import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api";

/**
 * POST /api/admin/upload-logo
 *
 * Upload d'un fichier logo (PNG, JPG, SVG, WebP).
 * Le fichier est sauvegardé dans /public/uploads/ et le chemin
 * est stocké dans le setting cms.logo_url.
 *
 * Protégé : session NextAuth + ADMIN/SUPER_ADMIN.
 *
 * FormData:
 *   - file: le fichier image (max 2MB)
 */

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
];

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return apiError("Non autorisé", "UNAUTHORIZED", 401);

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return apiError("Aucun fichier reçu", "NO_FILE", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError(
        `Type de fichier non autorisé: ${file.type}. Formats acceptés: PNG, JPG, SVG, WebP`,
        "INVALID_TYPE",
        400,
      );
    }

    if (file.size > MAX_SIZE) {
      return apiError(
        `Fichier trop volumineux: ${(file.size / 1024).toFixed(0)}KB. Maximum: 2MB`,
        "TOO_LARGE",
        400,
      );
    }

    const ext = EXT_BY_TYPE[file.type] || "png";
    const filename = `logo-${Date.now()}.${ext}`;

    // Écriture du fichier dans /public/uploads/
    const { writeFile, mkdir } = await import("fs/promises");
    const path = await import("path");
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Stockage du chemin public dans le setting
    const logoUrl = `/uploads/${filename}`;
    await prisma.setting.upsert({
      where: { key: "cms.logo_url" },
      update: { value: logoUrl },
      create: { key: "cms.logo_url", value: logoUrl },
    });

    return apiSuccess({ logoUrl });
  } catch (err) {
    console.error("[upload-logo] Erreur:", err);
    return apiError("Erreur lors de l'upload", "UPLOAD_ERROR", 500);
  }
}
