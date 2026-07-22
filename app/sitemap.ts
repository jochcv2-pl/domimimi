import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

/**
 * Sitemap multi-locale — génère les URLs pour chaque langue (de, fr)
 * avec alternates hreflang pour le SEO international.
 *
 * Les pages admin/API/login sont exclues (cf. robots.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://domipack.fr";
  const now = new Date();

  const staticPaths = [
    "",
    "/contact",
    "/mentions-legales",
    "/confidentialite",
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const path of staticPaths) {
    // Alternate links for each locale
    const languages: Record<string, string> = {};
    for (const locale of routing.locales) {
      languages[locale] = `${baseUrl}/${locale}${path}`;
    }

    // One entry per locale
    for (const locale of routing.locales) {
      entries.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: now,
        changeFrequency: path === "" ? "weekly" : "yearly",
        priority: path === "" ? (locale === routing.defaultLocale ? 1.0 : 0.8) : 0.3,
        alternates: { languages },
      });
    }
  }

  return entries;
}
