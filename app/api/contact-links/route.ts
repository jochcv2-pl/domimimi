import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api";

/**
 * GET /api/contact-links
 *
 * Route PUBLIQUE (pas d'auth) qui renvoie les URLs WhatsApp + Messenger
 * configurées depuis le CMS admin. Utilisée par :
 *   - les emails agents (boutons HTML)
 *   - la landing page (boutons de contact)
 *   - tout frontend public qui a besoin des liens
 *
 * Cache : 60s (Next.js revalidate + Cache-Control client).
 */
export const revalidate = 60;

export async function GET() {
  try {
    const rows = await prisma.setting.findMany({
      where: {
        key: { in: ["contact.whatsapp", "contact.messenger"] },
      },
      select: { key: true, value: true },
    });

    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    return apiSuccess({
      whatsapp: map["contact.whatsapp"] ?? null,
      messenger: map["contact.messenger"] ?? null,
    });
  } catch (err) {
    console.error("[api/contact-links] GET error:", err);
    return apiError("Erreur serveur", "INTERNAL_ERROR", 500);
  }
}
