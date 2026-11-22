import { expect as baseExpect, test, type Page } from "@playwright/test";
import { clearInbox, latestLinkFor } from "./mailpit";

// CRM-1/2/3: customer list with search, one record per customer, owner-only CSV.
// The customer is created through the real Privé request form, so no seed is needed.

// Server actions and first-time page compiles are slow on a busy machine.
const expect = baseExpect.configure({ timeout: 30_000 });
test.setTimeout(180_000);
test.describe.configure({ mode: "serial" });
test.beforeEach(clearInbox);

const stamp = Date.now();
const email = `crm-${stamp}@p4.test`;
// A phone number unique to this run, so reruns never match each other's customers.
const tail = String(stamp).slice(-7);
const phone = `+234 809 ${tail.slice(0, 3)} ${tail.slice(3)}`;

async function signInStaff(page: Page, address: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(address);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  await page.goto(await latestLinkFor(address));
  await page.waitForURL("**/admin");
}

test("a Privé request creates a customer record staff can find by phone", async ({ page }) => {
  await page.goto("/prive");
  await page.getByRole("tab", { name: "Request access" }).click();
  await page.locator("#req-name").fill("CRM Person");
  await page.locator("#req-email").fill(email);
  await page.locator("#req-phone").fill(phone);
  await page.getByRole("button", { name: "Request access" }).click();
  await expect(page.getByRole("tabpanel").getByRole("status")).toContainText("Thank you");

  await signInStaff(page, "owner@xarina.test");
  // Phone search ignores spaces and the country code punctuation.
  await page.goto(`/admin/customers?q=809${tail}`);
  await expect(page.getByText("1 customer", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /CRM Person/ }).click();

  await expect(page.getByRole("heading", { name: "CRM Person", level: 1 })).toBeVisible();
  await expect(page.getByText(email).first()).toBeVisible();
  await expect(page.getByText("Not a member")).toBeVisible();
  // Rule 12: neither consent was ticked, so neither shows as given.
  await expect(
    page.getByRole("region", { name: "Consent" }).getByText("Not given", { exact: true }),
  ).toHaveCount(2);
  await expect(page.getByText("No paid orders.")).toBeVisible();
});

test("the owner exports a CSV, and the list says interest, not sales", async ({ page }) => {
  await signInStaff(page, "owner@xarina.test");
  await page.goto("/admin/customers");
  await expect(page.getByText(/Interest means waitlist sign-ups/)).toBeVisible();

  const res = await page.request.get(`/admin/customers/export?q=${encodeURIComponent(email)}`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(res.headers()["content-disposition"]).toContain("xarina-customers-");
  const body = await res.text();
  expect(body).toContain(email);
  expect(body).toContain("Waitlist interest");
});

test("support can read customers but has no export", async ({ page }) => {
  await signInStaff(page, "support@xarina.test");
  await page.goto("/admin/customers");
  await expect(page.getByRole("heading", { name: "Customers", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Export CSV" })).toHaveCount(0);
  const res = await page.request.get("/admin/customers/export");
  expect(res.status()).toBe(404);
});
