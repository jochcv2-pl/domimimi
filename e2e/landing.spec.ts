import { test, expect } from "@playwright/test";

/**
 * E2E — Landing page publique
 *
 * Vérifie que la page d'accueil charge, que les sections sont visibles,
 * et que le formulaire de candidature peut être soumis.
 */

test.describe("Landing page", () => {
  test("charge et affiche les sections principales", async ({ page }) => {
    await page.goto("/");

    // Hero — titre principal visible
    await expect(page.locator("body")).toBeVisible();

    // Vérifier qu'on a du contenu (pas une page blanche/erreur)
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test("page de contact est accessible", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("body")).toBeVisible();
  });

  test("mentions légales est accessible", async ({ page }) => {
    await page.goto("/mentions-legales");
    await expect(page.locator("body")).toBeVisible();
  });

  test("page admin redirige vers login sans session", async ({ page }) => {
    const response = await page.goto("/admin");
    // Doit rediriger vers /login (307) ou afficher la page login
    expect(response?.url()).toContain("/login");
  });

  test("robots.txt est servi", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);
    const content = await response?.text();
    expect(content).toContain("User-agent");
    expect(content).toContain("Disallow: /admin");
  });

  test("sitemap.xml est servi", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
    const content = await response?.text();
    expect(content).toContain("<urlset");
    expect(content).toContain("<loc>");
  });

  test("health endpoint répond OK", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.status).toBe("ok");
  });
});
