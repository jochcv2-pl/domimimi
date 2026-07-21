import { test, expect } from "@playwright/test";

/**
 * E2E — Admin CRM
 *
 * Test le flow d'authentification et la navigation dans les vues admin.
 * Utilise les credentials seedés : admin@domipack.fr / Domipack2026!
 */

const ADMIN_EMAIL = "admin@domipack.fr";
const ADMIN_PASSWORD = "Domipack2026!";

test.describe("Admin CRM", () => {
  test("login admin réussit avec credentials valides", async ({ page }) => {
    await page.goto("/login");

    // Remplir le formulaire de login
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);

    // Soumettre
    await page.click('button[type="submit"]');

    // Attendre la redirection vers /admin
    await page.waitForURL("**/admin", { timeout: 15_000 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("login échoue avec mauvais credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "wrong@test.fr");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Doit rester sur /login ou afficher une erreur
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/login");
  });

  test("admin peut naviguer entre les vues", async ({ page }) => {
    // Login d'abord
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin", { timeout: 15_000 });

    // La page admin doit avoir du contenu (sidebar, dashboard, etc.)
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.length).toBeGreaterThan(50);

    // Vérifier que la sidebar est présente (liens de navigation)
    const sidebar = page.locator("nav, [class*='sidebar'], aside");
    await expect(sidebar.first()).toBeVisible({ timeout: 5_000 });
  });

  test("API admin est protégée sans session", async ({ request }) => {
    const response = await request.get("/api/admin/email-templates");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("API cron est protégée sans secret", async ({ request }) => {
    const response = await request.post("/api/cron/process-emails");
    expect(response.status()).toBe(401);
  });

  test("CSP header est présent", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("localhost:3100") &&
        resp.headers()["content-security-policy"] !== undefined,
    );
    await page.goto("/");
    const response = await responsePromise;
    const csp = response.headers()["content-security-policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
