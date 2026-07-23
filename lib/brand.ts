// Domipack — Helper identité de marque (server-side)
// Lecture des settings cms.brand_name + cms.logo_url depuis la DB.
// Fallback "Domipack" si DB indisponible ou setting absent.

import { prisma } from "@/lib/prisma";

export interface BrandSettings {
  brandName: string;
  logoUrl: string | null;
}

export interface FooterSettings {
  tagline: string | null;
  col1Title: string | null;
  col1Links: string[] | null;
  col2Title: string | null;
  col2Links: string[] | null;
  col3Title: string | null;
  col3Links: string[] | null;
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

const FOOTER_KEYS = [
  "footer.tagline",
  "footer.col1.title", "footer.col1.link1", "footer.col1.link2", "footer.col1.link3",
  "footer.col2.title", "footer.col2.link1", "footer.col2.link2", "footer.col2.link3",
  "footer.col3.title", "footer.col3.link1", "footer.col3.link2", "footer.col3.link3",
];

/**
 * Récupère les settings du footer depuis la DB.
 * Retourne null pour chaque valeur absente (le Footer retombe sur i18n).
 */
export async function getFooterSettings(): Promise<FooterSettings> {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: FOOTER_KEYS } },
      select: { key: true, value: true },
    });

    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    const get = (k: string) => map[k] || null;

    return {
      tagline: get("footer.tagline"),
      col1Title: get("footer.col1.title"),
      col1Links: [get("footer.col1.link1"), get("footer.col1.link2"), get("footer.col1.link3")].filter(Boolean) as string[] || null,
      col2Title: get("footer.col2.title"),
      col2Links: [get("footer.col2.link1"), get("footer.col2.link2"), get("footer.col2.link3")].filter(Boolean) as string[] || null,
      col3Title: get("footer.col3.title"),
      col3Links: [get("footer.col3.link1"), get("footer.col3.link2"), get("footer.col3.link3")].filter(Boolean) as string[] || null,
    };
  } catch {
    return {
      tagline: null,
      col1Title: null, col1Links: null,
      col2Title: null, col2Links: null,
      col3Title: null, col3Links: null,
    };
  }
}
