// Domipack — Helper identité de marque (server-side)
// Lecture des settings cms.brand_name + cms.logo_url depuis la DB.
// Fallback "Domipack" si DB indisponible ou setting absent.

import { prisma } from "@/lib/prisma";

export interface BrandSettings {
  brandName: string;
  logoUrl: string | null;
}

const DEFAULT_BRAND: BrandSettings = {
  brandName: "domipackung",
  logoUrl: null,
};

/**
 * Récupère l'identité de marque depuis la DB.
 * Toujours retourner un objet valide (fallback si erreur).
 * Cache en mémoire pour la durée de vie du process (évite 2 requêtes par render).
 */
let cache: { data: BrandSettings; ts: number } | null = null;
const CACHE_TTL = 60_000; // 60 secondes

export async function getBrandSettings(): Promise<BrandSettings> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  try {
    const rows = await prisma.setting.findMany({
      where: {
        key: { in: ["cms.brand_name", "cms.logo_url"] },
      },
      select: { key: true, value: true },
    });

    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    const data: BrandSettings = {
      brandName: map["cms.brand_name"] || DEFAULT_BRAND.brandName,
      logoUrl: map["cms.logo_url"] || null,
    };

    cache = { data, ts: Date.now() };
    return data;
  } catch {
    return DEFAULT_BRAND;
  }
}
