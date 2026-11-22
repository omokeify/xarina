import { expect, test, type Page } from "@playwright/test";
import { clearInbox, latestLinkFor } from "./mailpit";

// Reporting page (PRD › Reporting page): owner/manager only; sales from paid
// orders only; waitlists shown as interest, never sales (rule 9); ad spend
// entered by hand feeds CAC and ROAS. Uses staff seeded in supabase/seed.sql.

async function signIn(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox", { timeout: 20_000 });
  await page.goto(await latestLinkFor(email));
  await page.waitForURL("**/admin");
}

test.describe.configure({ mode: "serial", timeout: 90_000 });
test.beforeEach(clearInbox);

test("owner sees the report, labelled interest, and records ad spend", async ({ page }, info) => {
  await signIn(page, "owner@xarina.test");
  await page.goto("/admin/reports");
  await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
  await expect(page.getByText("Sales come from paid orders only.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Waitlist interest" })).toBeVisible();
  await expect(page.getByText("Interest, not sales.")).toBeVisible();

  const campaign = `E2E ${info.project.name} ${Date.now()}`;
  await page.getByLabel("Channel").fill("Meta");
  await page.getByLabel("Campaign (optional)").fill(campaign);
  await page.getByLabel("Amount spent").fill("1234.50");
  await page.getByRole("button", { name: "Add spend" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ad spend added." })).toBeVisible({ timeout: 20_000 });

  const row = page.getByRole("row", { name: new RegExp(campaign) });
  await expect(row).toContainText("₦1,234.50");
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("row", { name: new RegExp(campaign) })).toHaveCount(0, { timeout: 20_000 });
});

test("a merchandiser cannot open reports", async ({ page }) => {
  await signIn(page, "merch@xarina.test");
  await page.goto("/admin/reports");
  await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toHaveCount(0);
});
