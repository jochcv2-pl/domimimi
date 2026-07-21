import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E — Domipack
 *
 * Lance le dev server automatiquement avant les tests.
 * Les tests nécessitent la DB Docker (domipack-db-1 port 5433).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // séquentiel — la DB est partagée
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,

  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    locale: "fr-FR",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Auto-start dev server
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
