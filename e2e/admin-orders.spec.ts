import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { clearInbox, latestLinkFor } from "./mailpit";

// Phase 5: orders board (ADM-5, INV-4/5) and settings (CUR-2, PAY-3).
// Orders are created and paid through the database functions, the same ones the
// checkout and the verified webhook use, so no provider is needed.

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

async function paidOrder(options?: {
  email?: string;
  priveCustomerId?: string;
}): Promise<{ id: string; number: string }> {
  const admin = db();
  const { data: variant } = await admin
    .from("variants")
    .select("id, stock_on_hand, products!inner(slug)")
    .eq("products.slug", "noir-draped-cape-mini")
    .order("stock_on_hand", { ascending: false })
    .limit(1)
    .single();
  // Earlier runs use stock up. Top the variant up so runs never drain the seed.
  if ((variant!.stock_on_hand as number) < 5) {
    await admin.from("variants").update({ stock_on_hand: 50 }).eq("id", variant!.id);
  }
  const { data: rate } = await admin
    .from("shipping_rates")
    .select("id")
    .eq("currency", "NGN")
    .ilike("name", "Lagos%")
    .limit(1)
    .single();

  const { data: id, error } = await admin.rpc("create_checkout", {
    p_items: [{ variant_id: variant!.id, qty: 1 }],
    p_currency: "NGN",
    p_email: options?.email ?? `orders-${Date.now()}@admin.test`,
    p_phone: "+2348000000000",
    p_address: { name: "Ada Obi", line1: "1 Test Road", city: "Lagos", country: "NG" },
    p_shipping_rate_id: rate!.id,
    p_prive_customer_id: options?.priveCustomerId ?? null,
    p_utm: null,
  });
  expect(error).toBeNull();

  const reference = `E2E-ORD-${Date.now()}`;
  await admin.rpc("attach_payment_ref", {
    p_order_id: id,
    p_provider: "paystack",
    p_provider_ref: reference,
  });
  const { data: order } = await admin.from("orders").select("number, total_minor").eq("id", id).single();
  const { data: result } = await admin.rpc("mark_order_paid", {
    p_provider: "paystack",
    p_provider_ref: reference,
    p_event_type: "charge.success",
    p_amount_minor: order!.total_minor,
    p_currency: "NGN",
    p_payload: {},
  });
  expect(result).toBe("paid");
  return { id: id as string, number: order!.number as string };
}

async function signIn(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  await page.goto(await latestLinkFor(email));
  await page.waitForURL("**/admin");
}

// Magic-link sign-in plus first-time page compiles on a dev server can be slow.
test.describe.configure({ timeout: 90_000 });
test.beforeEach(clearInbox);

test("fulfilment finds a paid order and dispatches it with tracking", async ({ page }) => {
  const order = await paidOrder();
  await signIn(page, "fulfil@xarina.test");

  await page.goto("/admin/orders");
  await page.getByLabel("Search").fill(order.number);
  await page.getByRole("button", { name: "Filter" }).click();
  await page.getByRole("link", { name: new RegExp(order.number) }).click();
  await expect(page.getByRole("heading", { name: `Order ${order.number}` })).toBeVisible();

  // Fulfilment ships; it can't mark an order paid, cancel or refund it.
  const options = await page.getByLabel("Change status to").locator("option").allTextContents();
  expect(options).toEqual(["Processing", "Dispatched"]);

  await page.getByLabel("Change status to").selectOption("dispatched");
  await page.getByLabel("Courier").fill("DHL");
  await page.getByLabel("Tracking number").fill("JD0146000123");
  await page.getByLabel("Tracking link").fill("https://track.example.test/JD0146000123");
  await page.getByRole("button", { name: "Dispatch and email customer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Dispatched" })).toBeVisible({ timeout: 20_000 });

  await page.reload();
  await expect(page.getByText(/^Dispatched ·/)).toBeVisible();
  await expect(page.getByText("JD0146000123")).toBeVisible();
});

test("support can read an order and add a note, but cannot change its status", async ({ page }) => {
  const order = await paidOrder();
  await signIn(page, "support@xarina.test");

  await page.goto(`/admin/orders/${order.id}`);
  await expect(page.getByRole("heading", { name: `Order ${order.number}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Update status" })).toHaveCount(0);

  await page.getByLabel("Add a note").fill("Customer asked about delivery times.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Note added" })).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await expect(page.getByText("Customer asked about delivery times.")).toBeVisible();
});

test("owner sees attribution, payment history and order activity; fulfilment does not", async ({ page }) => {
  const order = await paidOrder();
  await db()
    .from("orders")
    .update({ utm: { utm_source: "meta", utm_campaign: "drop_1" } })
    .eq("id", order.id);
  await db()
    .from("audit_log")
    .insert([
      {
        action: "order.status",
        entity_type: "order",
        entity_id: order.id,
        before: { status: "paid" },
        after: { status: "processing" },
      },
      {
        action: "order.status",
        entity_type: "order",
        entity_id: order.id,
        before: { status: "processing" },
        after: { status: "dispatched", courier: "DHL", tracking_number: "JD0146000123" },
      },
    ]);

  await signIn(page, "owner@xarina.test");
  await page.goto(`/admin/orders/${order.id}`);
  for (const heading of ["Order Progress", "Source & Attribution", "Payment Events", "Order Activity"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.getByText(/1 piece · 1 unit/)).toBeVisible();
  await expect(page.getByText("meta", { exact: true })).toBeVisible();
  await expect(page.getByText("drop_1", { exact: true })).toBeVisible();
  await expect(page.getByText("View raw payload")).toBeVisible();
  const steps = await page.locator("ol > li").allTextContents();
  expect(steps).toHaveLength(5);
  expect(steps[1]).toContain("Payment confirmed");
  expect(steps[3]).toContain("Dispatched");
  expect(steps[4]).toContain("Delivered");

  await page.context().clearCookies();
  await clearInbox();
  await signIn(page, "fulfil@xarina.test");
  await page.goto(`/admin/orders/${order.id}`);
  await expect(page.getByRole("heading", { name: "Payment Events" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Order Activity" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Order Progress" })).toBeVisible();
});

test("the order record shows the client's Privé membership", async ({ page }) => {
  const admin = db();
  const email = `order-vip-${Date.now()}@admin.test`;
  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({ email, name: "Order VIP" })
    .select("id")
    .single();
  expect(customerError).toBeNull();
  const { data: owner } = await admin.from("staff").select("id").eq("email", "owner@xarina.test").single();
  await admin
    .from("customers")
    .update({
      is_vip: true,
      vip_approved_at: new Date().toISOString(),
      vip_approved_by: owner!.id,
      prive_requested_at: new Date(Date.now() - 86_400_000).toISOString(),
    })
    .eq("id", customer!.id);

  const order = await paidOrder({ email, priveCustomerId: customer!.id });
  await signIn(page, "owner@xarina.test");
  await page.goto(`/admin/orders/${order.id}`);

  const membership = page.getByRole("region", { name: "Membership" });
  await expect(membership).toBeVisible();
  await expect(membership.getByText("Privé Member", { exact: true })).toBeVisible();
  await expect(membership.getByText(/by Olu Owner/)).toBeVisible();
  await expect(membership.getByText("Access Requested")).toBeVisible();
  await expect(membership.getByRole("link", { name: /Manage Privé membership/ })).toBeVisible();
});

test("settings are owner-only, and the owner can add and remove a shipping zone", async ({ page }) => {
  await signIn(page, "fulfil@xarina.test");
  const denied = await page.goto("/admin/settings");
  expect(denied?.status()).toBe(404);

  // The 404 page has no admin shell to sign out from, so just drop the session.
  await page.context().clearCookies();
  await clearInbox();
  await signIn(page, "owner@xarina.test");
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Exchange rates" })).toBeVisible();

  const name = `E2E Zone ${Date.now()}`;
  const addZone = page.locator("form", { has: page.getByRole("button", { name: "Add zone" }) });
  await addZone.getByLabel("Zone name").fill(name);
  await addZone.getByLabel(/^Countries/).fill("FR");
  await addZone.getByRole("button", { name: "Add zone" }).click();
  await expect(addZone.getByRole("status")).toContainText("Zone added", { timeout: 20_000 });

  page.once("dialog", (dialog) => dialog.accept());
  const row = page.locator("form", { has: page.locator(`input[name="name"][value="${name}"]`) });
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator(`input[name="name"][value="${name}"]`)).toHaveCount(0, { timeout: 20_000 });
});
