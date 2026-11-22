import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { pinDropTimes } from "./drop-fixtures";

// Phase 6: the campaign on the first tagged ad visit is kept for later
// sign-ups and orders (PRD "UTM capture"), and really lands in the database.

test.describe.configure({ mode: "serial", timeout: 120_000 });

function env(name: string): string {
  if (process.env[name]) return process.env[name]!;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} missing from env and .env.local`);
  return line.slice(name.length + 1).trim();
}

const db = () =>
  createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

async function savedCampaign(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  const raw = cookies.find((c) => c.name === "xarina_utm")?.value;
  return raw ? decodeURIComponent(raw) : "";
}

test.beforeAll(pinDropTimes);

// Remove the customers these tests create, so their drop-alert subscriptions
// don't leak into other suites (cascade removes their waitlist entries).
test.afterAll(async () => {
  await db().from("customers").delete().like("email", "%@attribution.test");
});

test("a tagged visit saves first-touch UTMs and later visits do not replace them", async ({ page }) => {
  await page.goto("/shop?utm_source=meta&utm_campaign=drop_1");
  await page.waitForFunction(() => document.cookie.includes("xarina_utm"));
  expect(await savedCampaign(page)).toContain('"utm_source":"meta"');
  expect(await savedCampaign(page)).toContain('"utm_campaign":"drop_1"');

  await page.goto("/shop?utm_source=second&utm_campaign=other");
  await page.waitForLoadState("domcontentloaded");
  expect(await savedCampaign(page)).toContain('"utm_source":"meta"');
  expect(await savedCampaign(page)).not.toContain("second");
});

test("a waitlist sign-up after a tagged visit stores the campaign", async ({ page }, info) => {
  const email = `utm-wl-${info.project.name}-${Date.now()}@attribution.test`;
  await page.goto("/p/kora-crimson-feather-cape-mini?utm_source=meta&utm_campaign=e2e_waitlist");
  await page.waitForFunction(() => document.cookie.includes("xarina_utm"));

  await page.getByRole("link", { name: "Join the waitlist" }).first().click();
  const dialog = page.getByRole("dialog", { name: /Join the waitlist/ });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Email", { exact: true }).fill(email);
  await dialog.getByLabel("Email me when this drop opens.").check();
  await dialog.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(dialog.getByRole("status")).toBeVisible({ timeout: 30_000 });

  const { data: customer } = await db().from("customers").select("id").eq("email", email).single();
  const { data: entry } = await db()
    .from("waitlist_entries")
    .select("source_utm")
    .eq("customer_id", customer!.id)
    .single();
  expect(entry?.source_utm).toMatchObject({ utm_source: "meta", utm_campaign: "e2e_waitlist" });
});

test("a footer drop-alert sign-up after a tagged visit stores the campaign", async ({ page }, info) => {
  const email = `utm-alerts-${info.project.name}-${Date.now()}@attribution.test`;
  await page.goto("/?utm_source=instagram&utm_campaign=e2e_alerts");
  await page.waitForFunction(() => document.cookie.includes("xarina_utm"));

  const footer = page.getByRole("contentinfo");
  await footer.getByLabel("Email for drop alerts").fill(email);
  await footer.getByLabel("Email me when a new drop opens.").check();
  await footer.getByRole("button", { name: "Notify me" }).click();
  await expect(footer.getByRole("status")).toBeVisible({ timeout: 30_000 });

  const { data: customer } = await db().from("customers").select("first_utm").eq("email", email).single();
  expect(customer?.first_utm).toMatchObject({ utm_source: "instagram", utm_campaign: "e2e_alerts" });
});
