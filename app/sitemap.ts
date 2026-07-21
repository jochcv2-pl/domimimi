import type { MetadataRoute } from "next";

/**
 * Sitemap dynamique — liste les pages publiques indexables.
 * Les pages admin/API/login sont exclues (cf. robots.ts).
 *
 * En l'absence de pages dynamiques produit (pas de fiches candidatures
 * publiques), le sitemap est statique. Si des pages dynamiques sont
 * ajoutées (blog, offres d'emploi…), enrichir ce fichier avec un fetch
 * Prisma pour générer les URLs dynamiques.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://domipack.fr";
  const now = new Date();

  const staticPages = [
    "",
    "/contact",
    "/mentions-legales",
    "/confidentialite",
  ];

  return staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "yearly",
    priority: path === "" ? 1.0 : 0.3,
  }));
}
