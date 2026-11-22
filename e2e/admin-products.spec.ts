import { expect, test, type Page } from "@playwright/test";
import { clearInbox, latestLinkFor } from "./mailpit";

// ADM-3: product editor. Merchandisers edit copy and variants but never
// prices or stock; managers set both. Uses staff seeded in supabase/seed.sql.

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

let productUrl = "";

test("merchandiser creates a draft and cannot see prices or stock", async ({ page }, info) => {
  const name = `E2E Dress ${info.project.name} ${Date.now()}`;
  await signIn(page, "merch@xarina.test");

  await page.goto("/admin/products");
  await page.getByRole("link", { name: "New product" }).click();
  await page.getByLabel("Name").fill(name);
  await expect(page.getByLabel("Web address")).toHaveValue(/^e2e-dress-/);
  await page.getByRole("button", { name: "Create draft" }).click();

  await page.waitForURL(/\/admin\/products\/[0-9a-f-]{36}$/);
  productUrl = page.url();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Prices" })).toHaveCount(0);
  await expect(page.getByLabel("Status")).toHaveCount(0);

  await page.getByLabel("Colours").fill("Black");
  await page.getByLabel("Sizes").fill("M");
  await page.getByRole("button", { name: "Add combinations" }).click();
  await expect(page.getByLabel("SKU, row 1")).toHaveValue(/-BLA-M$/);
  await expect(page.getByLabel("Stock, row 1")).toHaveCount(0);
  await page.getByRole("button", { name: "Save variants" }).click();
  await expect(page.getByRole("region", { name: "Variants" }).getByRole("status")).toHaveText("Saved.");
});

test("manager sets stock and a price", async ({ page }) => {
  expect(productUrl, "previous test must create a product").not.toBe("");
  await signIn(page, "manager@xarina.test");
  await page.goto(productUrl);

  const stock = page.getByLabel("Stock, row 1");
  await expect(stock).toBeVisible();
  await stock.fill("4");
  await page.getByRole("button", { name: "Save variants" }).click();
  await expect(page.getByRole("region", { name: "Variants" }).getByRole("status")).toHaveText("Saved.");

  const prices = page.getByRole("group", { name: "Design price" });
  await prices.getByLabel("NGN").fill("185,000");
  await page.getByRole("button", { name: "Save prices" }).click();
  // Scoped to the Prices section: the Variants section may still show its own "Saved.".
  await expect(page.getByRole("region", { name: "Prices" }).getByRole("status")).toHaveText("Saved.");

  await page.reload();
  await expect(page.getByLabel("Stock, row 1")).toHaveValue("4");
  await expect(page.getByRole("group", { name: "Design price" }).getByLabel("NGN")).toHaveValue("185000");
});
