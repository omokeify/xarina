import { expect, test } from "@playwright/test";

// Header: search expands in place, region control, visitor-chosen dark mode,
// account link and bag, and no horizontal overflow on small phones.

test("the header never overflows the screen, even at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/shop");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const header = page.getByRole("banner");
  const controls = [
    header.getByRole("button", { name: "Search", exact: true }),
    header.getByLabel("Currency"),
    header.getByRole("button", { name: "Dark mode" }),
    header.getByRole("link", { name: "Xarina Privé sign in" }),
    header.getByRole("link", { name: /^Bag/ }),
  ];
  for (const control of controls) {
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    expect(box!.height).toBeGreaterThanOrEqual(40);
  }
});

test("search icon expands into a field, Esc closes it, and it searches", async ({ page }) => {
  await page.goto("/shop");
  const header = page.getByRole("banner");
  const field = header.getByRole("searchbox", { name: "Search the shop" });
  await expect(field).toBeHidden();

  await header.getByRole("button", { name: "Search", exact: true }).click();
  await expect(field).toBeVisible();
  await expect(field).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(field).toBeHidden();
  await expect(header.getByRole("button", { name: "Search", exact: true })).toBeFocused();

  await header.getByRole("button", { name: "Search", exact: true }).click();
  await field.fill("top");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=top$/, { timeout: 20_000 });
  // Collapses again after navigating.
  await expect(page.getByRole("banner").getByRole("searchbox", { name: "Search the shop" })).toBeHidden();
});

test("dark mode is a visitor choice, remembered, and off by default", async ({ page }) => {
  await page.goto("/shop");
  const html = page.locator("html");
  const toggle = page.getByRole("banner").getByRole("button", { name: "Dark mode" });
  await expect(html).not.toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  // Same palette as Privé: the page surface is Noir.
  const surface = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(surface).toBe("rgb(18, 17, 16)");

  // Remembered across a reload, applied before first paint.
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.getByRole("banner").getByRole("button", { name: "Dark mode" }).click();
  await expect(html).not.toHaveAttribute("data-theme", "dark");
});

test("account icon goes to Privé sign-in and the bag icon goes to the bag", async ({ page }) => {
  await page.goto("/shop");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Xarina Privé sign in" })).toHaveAttribute("href", "/prive");
  await expect(header.getByRole("link", { name: /^Bag/ })).toHaveAttribute("href", "/cart");
});
