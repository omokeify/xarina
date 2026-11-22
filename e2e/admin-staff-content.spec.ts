import { expect, test, type Page } from "@playwright/test";
import { clearInbox, latestLinkFor } from "./mailpit";

// Phase 5 admin: staff management (owner only), info pages editor (ADM-6/INFO-1)
// and the audit log (ADM-7). Uses staff seeded in supabase/seed.sql.

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await clearInbox();
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox", { timeout: 45_000 });
  await page.goto(await latestLinkFor(email));
  await page.waitForURL("**/admin");
}

test.describe.configure({ mode: "serial", timeout: 120_000 });

test("owner adds a staff member, who then appears in the list and the audit log", async ({ page }, info) => {
  const email = `hire-${info.project.name}-${Date.now()}@xarina.test`;
  await signIn(page, "owner@xarina.test");
  await page.goto("/admin/staff");
  await page.getByLabel("Name").fill("New Hire");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Role", { exact: true }).selectOption("support");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(email).first()).toBeVisible({ timeout: 20_000 });

  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(email).first()).toBeVisible({ timeout: 20_000 });
});

test("a manager cannot open staff management", async ({ page }) => {
  await signIn(page, "manager@xarina.test");
  const res = await page.goto("/admin/staff");
  expect(res?.status()).toBe(404);
});

test("a merchandiser edits an info page, and unpublishing hides it", async ({ page }, info) => {
  await signIn(page, "merch@xarina.test");
  await page.goto("/admin/content/pages/faq");
  const body = page.getByLabel("Text");
  const original = await body.inputValue();
  const marker = `E2E answer ${info.project.name} ${Date.now()}`;

  try {
    await body.fill(`${original}\n\n${marker}`);
    await page.getByRole("button", { name: "Save page" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible({ timeout: 20_000 });
    await page.goto("/faq");
    await expect(page.getByText(marker)).toBeVisible();

    await page.goto("/admin/content/pages/faq");
    await page.getByLabel(/Published/).uncheck();
    await page.getByRole("button", { name: "Save page" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible({ timeout: 20_000 });
    expect((await page.goto("/faq"))?.status()).toBe(404);
  } finally {
    // Leave the seed as it was: original text, published.
    await page.goto("/admin/content/pages/faq");
    await page.getByLabel("Text").fill(original);
    await page.getByLabel(/Published/).check();
    await page.getByRole("button", { name: "Save page" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible({ timeout: 20_000 });
  }
  expect((await page.goto("/faq"))?.status()).toBe(200);
});
