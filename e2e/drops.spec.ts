import { expect as baseExpect, test, type Page } from "@playwright/test";
import { pinDropTimes } from "./drop-fixtures";
import { clearInbox, latestLinkFor } from "./mailpit";

// Phase 4: waitlist capture (WL-1..4), Privé request and approval (VIP-1),
// verified login (VIP-2) and single-use access links (rule 7).
// Uses the seeded upcoming drop and staff from supabase/seed.sql.

// Server actions and first-time page compiles are slow on a busy machine.
const expect = baseExpect.configure({ timeout: 30_000 });

const stamp = Date.now();
const member = `member-${stamp}@p4.test`;
const linkMember = `link-${stamp}@p4.test`;

async function signInStaff(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  await page.goto(await latestLinkFor(email));
  await page.waitForURL("**/admin");
}

async function requestAccess(page: Page, email: string) {
  await page.goto("/prive");
  await page.getByRole("tab", { name: "Request access" }).click();
  await page.locator("#req-name").fill("Test Member");
  await page.locator("#req-email").fill(email);
  await page.getByRole("button", { name: "Request access" }).click();
  await expect(page.getByRole("tabpanel").getByRole("status")).toContainText("Thank you");
}

// Staff and member magic-link logins make these flows slow on a busy machine.
test.setTimeout(180_000);
test.describe.configure({ mode: "serial" });
test.beforeAll(pinDropTimes);
test.beforeEach(clearInbox);

test("a visitor joins the waitlist of an upcoming drop design", async ({ page }) => {
  // The waitlist is a dialog: it opens from the #waitlist hash (as card and home links do).
  await page.goto("/p/solaris-draped-satin-mini#waitlist");
  const section = page.getByRole("dialog", { name: /Join the waitlist/ });
  await expect(section).toBeVisible();

  // Rule 12: both consent boxes start unticked.
  await expect(section.getByLabel("Email me when this drop opens.")).not.toBeChecked();
  await expect(section.getByLabel("Send me news from Xarina.")).not.toBeChecked();

  await section.getByLabel("Email", { exact: true }).fill(`wl-${stamp}@p4.test`);
  await section.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(section.getByRole("status")).toContainText("You are on the waitlist");
  // No auto-close: the shopper can read what they agreed to.
  await expect(section.getByText(/Drop alerts off. Marketing emails off./)).toBeVisible();
});

test("the waitlist dialog closes with Escape", async ({ page }) => {
  await page.goto("/p/solaris-draped-satin-mini#waitlist");
  const dialog = page.getByRole("dialog", { name: /Join the waitlist/ });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("an unapproved visitor is not a Privé member", async ({ page }) => {
  await requestAccess(page, member);
  await page.goto("/prive");
  await expect(page.getByRole("heading", { name: "Enter Xarina Privé" })).toBeVisible();
});

test("staff approve a request, then the member signs in by email link", async ({ page, browser }) => {
  await signInStaff(page, "owner@xarina.test");
  await page.goto("/admin/drops/prive");
  const row = page.getByRole("listitem").filter({ hasText: member });
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("heading", { name: /^Members/ })).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: member }).getByRole("button", { name: "Revoke" }),
  ).toBeVisible();

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto("/prive");
  await visitor.locator("#in-email").fill(member);
  await visitor.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(visitor.getByRole("tabpanel").getByRole("status")).toContainText("sign-in link is on its way");
  await visitor.goto(await latestLinkFor(member));
  await visitor.goto("/prive");
  await expect(visitor.getByRole("heading", { name: "Welcome to Xarina Privé" })).toBeVisible();

  // Signing out ends the member's access on this device.
  await visitor.getByRole("button", { name: "Sign out" }).click();
  await expect(visitor.getByRole("heading", { name: "Enter Xarina Privé" })).toBeVisible();
});

test("a non-member gets the same reply and no email", async ({ page }) => {
  await page.goto("/prive");
  await page.locator("#in-email").fill(`stranger-${stamp}@p4.test`);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("tabpanel").getByRole("status")).toContainText("sign-in link is on its way");
  await expect(latestLinkFor(`stranger-${stamp}@p4.test`, 2_000)).rejects.toThrow();
});

test("a personal access link works once", async ({ page, browser }) => {
  await requestAccess(page, linkMember);
  await signInStaff(page, "owner@xarina.test");
  await page.goto("/admin/drops/prive");
  await page
    .getByRole("listitem")
    .filter({ hasText: linkMember })
    .getByRole("button", { name: "Approve" })
    .click();
  const memberRow = page.getByRole("listitem").filter({ hasText: linkMember });
  await memberRow.getByRole("button", { name: "Create link" }).click();
  const shown = await memberRow.getByLabel("Access link").inputValue();
  expect(shown).toMatch(/\/access\/[A-Za-z0-9_-]{43}$/);
  // The link uses NEXT_PUBLIC_SITE_URL; follow its path on the server under test.
  const link = new URL(shown).pathname;

  // Opening the page does not spend the link (scanners load URLs); the button does.
  const first = await (await browser.newContext()).newPage();
  await first.goto(link);
  await first.goto(link);
  await first.getByRole("button", { name: "Enter Privé" }).click();
  await expect(first).toHaveURL(/\/prive$/);
  await expect(first.getByRole("heading", { name: "Welcome to Xarina Privé" })).toBeVisible();

  const second = await (await browser.newContext()).newPage();
  await second.goto(link);
  await second.getByRole("button", { name: "Enter Privé" }).click();
  await expect(second).toHaveURL(/\/access\/invalid$/);
});

test("staff create a drop with an automatic web address and a hero image", async ({ page }) => {
  await signInStaff(page, "owner@xarina.test");
  await page.goto("/admin/drops/new");

  await page.getByLabel("Name", { exact: true }).fill(`E2E Drop ${stamp}`);
  await expect(page.getByLabel("Web address")).toHaveValue(`e2e-drop-${stamp}`);

  await page.locator("#vip_opens_at-local").fill("2031-01-01T09:00");
  await page.locator("#public_opens_at-local").fill("2031-01-02T09:00");
  // A 1x1 PNG: enough to exercise validation and the Storage upload policy.
  await page.locator("#hero").setInputFiles({
    name: "hero.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.getByLabel("Describe the image").fill("A test hero image");
  await page.getByRole("button", { name: "Create drop" }).click();

  await page.waitForURL(/\/admin\/drops\/[0-9a-f-]{36}$/);
  await expect(page.getByLabel("Web address")).toHaveValue(`e2e-drop-${stamp}`);
  await expect(page.getByLabel("Remove this image")).toBeVisible();
});
