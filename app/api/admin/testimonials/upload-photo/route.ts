import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { apiSuccess, apiError } from "@/lib/api";

/**
 * POST /api/admin/testimonials/upload-photo
 *
 * Upload d'une photo de témoignage (PNG, JPG, WebP).
 * Le fichier est sauvegardé dans /public/uploads/testimonials/ et le chemin est retourné.
 *
 * FormData:
 *   - file: le fichier image (max 2MB)
 */

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

const MAX_SIZE = 2 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return apiError("Non autorisé", "UNAUTHORIZED", 401);
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN")
    return apiError("Non autorisé", "UNAUTHORIZED", 401);

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File))
      return apiError("Aucun fichier reçu", "NO_FILE", 400);

    if (!ALLOWED_TYPES.includes(file.type))
      return apiError(
        `Type non autorisé: ${file.type}. Formats: PNG, JPG, WebP`,
        "INVALID_TYPE",
        400,
      );

    if (file.size > MAX_SIZE)
      return apiError(
        `Fichier trop volumineux: ${(file.size / 1024).toFixed(0)}KB. Max: 2MB`,
        "TOO_LARGE",
        400,
      );

    const ext = EXT_BY_TYPE[file.type] || "png";
    const filename = `testimonial-${Date.now()}.${ext}`;

    const { writeFile, mkdir } = await import("fs/promises");
    const path = await import("path");
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "testimonials",
    );
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const photoUrl = `/uploads/testimonials/${filename}`;
    return apiSuccess({ photoUrl });
  } catch (err) {
    console.error("[testimonials upload-photo] Erreur:", err);
    return apiError("Erreur lors de l'upload", "UPLOAD_ERROR", 500);
  }
}
