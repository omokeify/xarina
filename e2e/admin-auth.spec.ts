import { expect, test, type Page } from "@playwright/test";
import { clearInbox, latestLinkFor } from "./mailpit";

// ADM-1: individual staff logins by magic link, role-based admin access.
// Uses staff seeded in supabase/seed.sql.

async function signIn(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  await page.goto(await latestLinkFor(email));
  await page.waitForURL("**/admin");
}

test.describe.configure({ mode: "serial" });
test.beforeEach(clearInbox);

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("owner signs in by magic link and sees every section", async ({ page }) => {
  await signIn(page, "owner@xarina.test");
  const nav = page.getByRole("navigation", { name: "Admin" });
  for (const label of ["Products", "Drops", "Orders", "Customers", "Reports", "Staff", "Settings"]) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("fulfilment sees orders only and cannot open reports", async ({ page }) => {
  await signIn(page, "fulfil@xarina.test");
  const nav = page.getByRole("navigation", { name: "Admin" });
  await expect(nav.getByRole("link", { name: "Orders" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Reports" })).toHaveCount(0);
  const res = await page.goto("/admin/reports");
  expect(res?.status()).toBe(404);
});

test("unknown emails get the same reply and no email", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill("stranger@example.com");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  await expect(latestLinkFor("stranger@example.com", 2_000)).rejects.toThrow();
});
