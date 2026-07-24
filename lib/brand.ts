// Domipack — Helper identité de marque (server-side)
// Lecture des settings cms.brand_name + cms.logo_url depuis la DB.
// Fallback "Domipack" si DB indisponible ou setting absent.

import { prisma } from "@/lib/prisma";
import type { EmailHeaderConfig, EmailFooterConfig } from "@/lib/email/template";

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

// ============================================================
// Settings EMAIL (header + footer des emails)
// ============================================================

const EMAIL_HEADER_KEYS = [
  "email.header.brand",
  "email.header.logo_url",
  "email.header.bg_color",
  "email.header.tagline",
];

/**
 * Récupère les settings du header d'email depuis la DB.
 * Fallback sur les defaults si absents.
 */
export async function getEmailHeaderSettings(): Promise<EmailHeaderConfig> {
  try {
    const brand = await getBrandSettings();
    const rows = await prisma.setting.findMany({
      where: { key: { in: EMAIL_HEADER_KEYS } },
      select: { key: true, value: true },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    return {
      brand: map["email.header.brand"] || brand.brandName,
      logoUrl: map["email.header.logo_url"] || brand.logoUrl,
      bgColor: map["email.header.bg_color"] || "#0F2019",
      tagline: map["email.header.tagline"] || "",
    };
  } catch {
    const brand = await getBrandSettings();
    return {
      brand: brand.brandName,
      logoUrl: brand.logoUrl,
      bgColor: "#0F2019",
      tagline: "",
    };
  }
}

const EMAIL_FOOTER_KEYS = [
  "email.footer.company_name",
  "email.footer.tagline",
  "email.footer.address",
  "email.footer.email",
  "email.footer.phone",
  "email.footer.legal",
  "email.footer.website",
];

/**
 * Récupère les settings du footer d'email depuis la DB.
 * Fallback sur les defaults si absents.
 */
export async function getEmailFooterSettings(): Promise<EmailFooterConfig> {
  try {
    const brand = await getBrandSettings();
    const rows = await prisma.setting.findMany({
      where: { key: { in: EMAIL_FOOTER_KEYS } },
      select: { key: true, value: true },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    return {
      companyName: map["email.footer.company_name"] || brand.brandName,
      tagline: map["email.footer.tagline"] || "",
      address: map["email.footer.address"] || "",
      email: map["email.footer.email"] || "",
      phone: map["email.footer.phone"] || "",
      legal:
        map["email.footer.legal"] ||
        "Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht auf diese Nachricht.",
      website: map["email.footer.website"] || "",
    };
  } catch {
    const brand = await getBrandSettings();
    return {
      companyName: brand.brandName,
      tagline: "",
      address: "",
      email: "",
      phone: "",
      legal:
        "Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht auf diese Nachricht.",
      website: "",
    };
  }
}
