import { expect, test } from "@playwright/test";
import { pinDropTimes } from "./drop-fixtures";

// Drop states depend on the clock: pin them relative to now before each run.
test.beforeAll(pinDropTimes);

// Storefront against the concept catalogue in supabase/seed.sql:
// - Drop 04 (upcoming): solaris-draped-satin-mini, kora-crimson-feather-cape-mini, …
// - Drop 05 (Privé window): ikoyi-ostrich-feather-kaftan, vesper-oxblood-cowl-gown
// - Available now: noir-draped-cape-mini (all in stock), zaria-sequin-fringe-mini
//   (UK 6 / XS and UK 14 / XL sold out), sahara-copper-fringe-kaftan (fully sold out)
// - Draft: atelier-draft-sample. Old slug disco-dragon-dress-multicolor → zaria.

test("home: drop hero with countdown and one primary action (HOME-1/2/3)", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
  await expect(hero.getByRole("timer")).toBeVisible();
  await expect(hero.getByRole("link", { name: "Join the waitlist" })).toBeVisible();
  await expect(hero.getByText("Privé members shop first.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Available now" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Xarina Privé" })).toBeVisible();
});

test("shop: two sections, drafts hidden, filters work (SHOP-1/2/3)", async ({ page }) => {
  await page.goto("/shop");
  const available = page.locator("#available");
  const upcoming = page.locator("#upcoming");
  await expect(available.getByRole("link", { name: /Noir Draped Cape Mini/ }).first()).toBeVisible();
  await expect(upcoming.getByRole("link", { name: /Solaris Draped Satin Mini/ }).first()).toBeVisible();
  await expect(upcoming.getByText("Upcoming drop").first()).toBeVisible();
  await expect(page.getByText("Atelier draft sample")).toHaveCount(0);

  // SHOP-2: design chips + availability filter (auto-submitting select).
  await expect(page.getByRole("navigation", { name: "Filter products" }).getByRole("link", { name: "Dresses" })).toBeVisible();
  await page.getByLabel("Availability").selectOption("upcoming");
  await expect(page).toHaveURL(/availability=upcoming/);
  await expect(page.locator("#available")).toHaveCount(0);
  await expect(page.locator("#upcoming")).toBeVisible();
});

test("shop: price follows the currency switcher (CUR-3)", async ({ page }) => {
  await page.goto("/shop");
  const card = page.locator("#available").getByRole("link", { name: /Noir Draped Cape Mini/ }).first();
  const currency = page.getByLabel("Currency").first();
  await currency.selectOption("GBP");
  await expect(card).toContainText("£285");
  await currency.selectOption("NGN");
  await expect(card).toContainText("₦495,000");
});

test("product page: details, size chart, sold-out size, WhatsApp, OG tags (PDP-3/4/5/6)", async ({ page }) => {
  await page.goto("/p/zaria-sequin-fringe-mini");
  await expect(page.getByRole("heading", { level: 1, name: "Zaria 3D Sequin Fringe Mini" })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Bust");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Zaria 3D Sequin Fringe Mini");
  await expect(page.locator('meta[name="product:price:currency"]')).toHaveAttribute("content", "NGN");

  // The single colour is pre-selected; choose a sold-out size.
  await page.getByRole("button", { name: /^UK 6 \/ XS/ }).click();
  await expect(page.getByRole("button", { name: "Sold out", exact: true })).toBeDisabled();

  const wa = page.getByRole("link", { name: /WhatsApp/ }).first();
  await expect(wa).toHaveAttribute(
    "href",
    /wa\.me\/\d+\?text=.*Zaria%203D%20Sequin%20Fringe%20Mini.*Emerald%20Iridescent%2C%20size%20UK%206%20%2F%20XS/,
  );
});

test("product page: upcoming drop shows countdown + waitlist, not Buy (PDP-4)", async ({ page }) => {
  await page.goto("/p/solaris-draped-satin-mini");
  await expect(page.getByRole("timer").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Add to bag|Buy now/i })).toHaveCount(0);
  // The waitlist opens as a dialog from the primary action (WL-1).
  await expect(page.locator("#waitlist")).toBeHidden();
  await page.getByRole("link", { name: "Join the waitlist" }).first().click();
  await expect(page.locator("#waitlist")).toBeVisible();
  await expect(page.locator("#waitlist").getByLabel(/Email/).first()).toBeVisible();
});

test("product page: an old slug redirects permanently to the current URL (PDP-1, rule 11)", async ({ page }) => {
  const res = await page.request.get("/p/disco-dragon-dress-multicolor", { maxRedirects: 0 });
  expect([301, 308]).toContain(res.status());
  expect(res.headers()["location"]).toMatch(/\/p\/zaria-sequin-fringe-mini$/);
});

test("product page: drafts and unknown slugs are 404 (PDP-1)", async ({ page }) => {
  expect((await page.goto("/p/atelier-draft-sample"))?.status()).toBe(404);
  expect((await page.goto("/p/does-not-exist"))?.status()).toBe(404);
});

test("info page renders published text (INFO-1)", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("drops: index groups drops and each drop has its own permanent page", async ({ page }) => {
  await page.goto("/drops");
  await expect(page.getByRole("heading", { level: 1, name: "Drops" })).toBeVisible();
  await expect(page.locator("#upcoming").getByRole("link", { name: /Nocturne in Crimson/ }).first()).toBeVisible();

  await page.goto("/drops/drop-04-nocturne");
  const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
  await expect(hero.getByRole("heading", { level: 1 })).toContainText("Nocturne in Crimson");
  await expect(hero.getByRole("timer")).toBeVisible();
  await expect(page.locator("#designs").getByRole("heading", { name: "The designs" })).toBeVisible();
  await expect(page.locator("#designs").getByRole("link", { name: /Solaris Draped Satin Mini/ }).first()).toBeVisible();

  const old = await page.request.get("/drops/drop-04-nocturne-in-crimson", { maxRedirects: 0 });
  expect([301, 308]).toContain(old.status());
  expect((await page.goto("/drops/no-such-drop"))?.status()).toBe(404);
});
