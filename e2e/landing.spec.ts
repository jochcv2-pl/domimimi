import { test, expect } from "@playwright/test";

/**
 * E2E — Landing page publique (i18n: /de/ par défaut)
 *
 * Vérifie que la page d'accueil charge en allemand (langue principale),
 * que /fr/ sert le français, et que les pages publiques sont accessibles.
 */

test.describe("Landing page", () => {
  test("charge et affiche les sections principales en allemand", async ({ page }) => {
    await page.goto("/de");

    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.length).toBeGreaterThan(100);
    // Vérifier que le contenu est en allemand
    expect(bodyText).toMatch(/Verpacken|Bewerbung|Vorteile/);
  });

  test("version française est accessible", async ({ page }) => {
    await page.goto("/fr");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/Emballez|candidature|Avantages/);
  });

  test("redirige / vers la locale détectée", async ({ page }) => {
    const response = await page.goto("/");
    // next-intl détecte la langue du navigateur (Playwright = fr-FR → /fr/)
    expect(response?.url()).toMatch(/\/(de|fr)\/?$/);
  });

  test("page de contact est accessible", async ({ page }) => {
    await page.goto("/de/contact");
    await expect(page.locator("body")).toBeVisible();
  });

  test("mentions légales sont accessibles", async ({ page }) => {
    await page.goto("/de/mentions-legales");
    await expect(page.locator("body")).toBeVisible();
  });

  test("page admin redirige vers login sans session", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.url()).toContain("/login");
  });

  test("robots.txt est servi", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);
    const content = await response?.text();
    expect(content).toContain("User-Agent");
    expect(content).toContain("Disallow: /admin");
  });

  test("sitemap.xml est servi avec multi-locale", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
    const content = await response?.text();
    expect(content).toContain("<urlset");
    expect(content).toContain("/de/");
    expect(content).toContain("/fr/");
  });

  test("health endpoint répond OK", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("ok");
  });
});
