import { defineConfig, devices } from "@playwright/test";

// E2E tests run against the local Supabase stack (`pnpm db:start`) and a
// production build in .next-e2e on port 3100 (`pnpm e2e:build` first).
// Several sessions may run servers locally: E2E_BASE_URL points tests at an
// already-running one (e.g. http://localhost:3001) instead of starting `pnpm start`.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "e2e",
  // Per-session output folder so parallel sessions don't delete each other's traces.
  outputDir: process.env.PW_OUTPUT_DIR ?? "test-results",
  fullyParallel: false,
  // Specs share one database and one Mailpit inbox: never run them concurrently.
  workers: 1,
  retries: 0,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "pnpm e2e:start", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
