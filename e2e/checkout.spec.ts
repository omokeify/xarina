import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Phase 3: bag and checkout pages (PAY-1, PAY-3, CUR-3) and the paid-webhook order
// flow (PAY-5, rules 2, 3, 4). The provider itself is not called: orders are created
// through the database function and the webhook is posted with a signature made
// from the same secret the server uses.
//
// Run with the secret set for both the test runner and the server it starts:
//   PAYSTACK_SECRET_KEY=sk_test_e2e pnpm test:e2e checkout

const SECRET = process.env.PAYSTACK_SECRET_KEY;

function localEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim();
  } catch {
    return undefined;
  }
}

function serviceDb() {
  const key = localEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  return createClient(localEnv("NEXT_PUBLIC_SUPABASE_URL") ?? "http://127.0.0.1:54321", key, {
    auth: { persistSession: false },
  });
}

function signedEvent(reference: string, amount: number, currency = "NGN") {
  const body = JSON.stringify({ event: "charge.success", data: { reference, amount, currency } });
  const signature = createHmac("sha512", SECRET ?? "")
    .update(body)
    .digest("hex");
  return { body, signature };
}

// An Available Now piece from the concept seed: single colour, sizes UK 6 to UK 12, all in stock.
const PIECE_SLUG = "noir-draped-cape-mini";
const PIECE_NAME = /Noir Draped Cape/i;

/** Open the piece and pick its first colour and first size, whatever the labels are. */
async function chooseCape(page: Page) {
  await page.goto(`/p/${PIECE_SLUG}`);
  await page
    .getByRole("group", { name: /^Colour/ })
    .getByRole("button")
    .first()
    .click();
  // Pick the first size that is not sold out (sold-out sizes say so in their name).
  await page
    .getByRole("group", { name: /^Size/ })
    .getByRole("button")
    .filter({ hasNotText: /sold out/i })
    .first()
    .click();
}

test("a guest adds a piece to the bag and sees server-priced cart and checkout totals", async ({ page }) => {
  await chooseCape(page);
  await page.getByRole("button", { name: "Add to bag" }).click();
  await expect(page.getByRole("status")).toContainText("Added to your bag", { timeout: 20_000 });
  await expect(page.getByRole("link", { name: /^Bag \(1\)/ })).toBeVisible({ timeout: 20_000 });

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Your bag" })).toBeVisible();
  await expect(page.getByText(PIECE_NAME).first()).toBeVisible();
  await expect(page.getByText("Subtotal")).toBeVisible();

  await page.getByRole("link", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  // PAY-3: delivery charge and the total are shown before paying.
  await expect(page.getByText("Delivery", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/^Total \(NGN\)/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Pay / })).toBeVisible();
  // The full form is always shown, even if payments aren't switched on yet.
  await expect(page.getByRole("heading", { name: "Guest checkout" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^03\. Payment/ })).toBeVisible();
});

test("adding a piece opens the bag drawer, where quantity and removal work", async ({ page }) => {
  await chooseCape(page);
  await page.getByRole("button", { name: "Add to bag" }).click();

  const drawer = page.getByRole("dialog", { name: "Shopping bag" });
  await expect(drawer).toBeVisible({ timeout: 20_000 });
  await expect(drawer.getByText(PIECE_NAME).first()).toBeVisible();
  await expect(drawer.getByText("Subtotal")).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout");

  // Quantity is changed on the server, which re-checks stock when going up.
  await drawer.getByRole("button", { name: /Increase quantity/ }).click();
  await expect(drawer.getByText("(2)")).toBeVisible({ timeout: 20_000 });
  await drawer.getByRole("button", { name: /Decrease quantity/ }).click();
  await expect(drawer.getByText("(1)")).toBeVisible({ timeout: 20_000 });

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  // The bag icon reopens it, and removing the last piece leaves an empty bag.
  await page.getByRole("banner").getByRole("link", { name: /^Bag/ }).click();
  await drawer.getByRole("button", { name: /^Remove/ }).click();
  await expect(drawer.getByText("Your bag is empty")).toBeVisible({ timeout: 20_000 });
});

test("checkout asks for details instead of starting payment when the form is empty", async ({ page }) => {
  await chooseCape(page);
  await page.getByRole("button", { name: "Add to bag" }).click();
  await expect(page.getByRole("status")).toContainText("Added to your bag", { timeout: 20_000 });
  await page.goto("/checkout");
  const pay = page.getByRole("button", { name: /^Pay / });
  if (await pay.isDisabled()) {
    // No payment provider is configured for this currency: the form says so calmly.
    await expect(page.getByText(/aren't switched on yet/)).toBeVisible();
  } else {
    await pay.click();
    // The browser's own required-field check stops the submit; no payment starts.
    await expect(page).toHaveURL(/\/checkout$/);
  }
});

test.describe("paid webhook", () => {
  test.skip(!SECRET, "Set PAYSTACK_SECRET_KEY (same value for the server) to run webhook tests");

  test("an order is paid only by a verified, matching, idempotent webhook", async ({ page, request }) => {
    const db = serviceDb();

    const { data: variant } = await db
      .from("variants")
      .select("id, stock_on_hand, products!inner(slug)")
      .eq("products.slug", PIECE_SLUG)
      .order("stock_on_hand", { ascending: false })
      .limit(1)
      .single();
    expect(variant).toBeTruthy();
    // Earlier runs use stock up. Top the variant up so runs never drain the seed.
    if ((variant!.stock_on_hand as number) < 5) {
      await db.from("variants").update({ stock_on_hand: 50 }).eq("id", variant!.id);
      variant!.stock_on_hand = 50;
    }
    const stockBefore = variant!.stock_on_hand as number;

    const { data: rate } = await db
      .from("shipping_rates")
      .select("id")
      .eq("currency", "NGN")
      .ilike("name", "Lagos%")
      .limit(1)
      .single();

    const { data: orderId, error } = await db.rpc("create_checkout", {
      p_items: [{ variant_id: variant!.id, qty: 1 }],
      p_currency: "NGN",
      p_email: `e2e-${Date.now()}@checkout.test`,
      p_phone: "+2348000000000",
      p_address: { name: "E2E", line1: "1 Test Road", city: "Lagos", country: "NG" },
      p_shipping_rate_id: rate!.id,
      p_prive_customer_id: null,
      p_utm: null,
    });
    expect(error).toBeNull();

    const reference = `E2E-${Date.now()}`;
    await db.rpc("attach_payment_ref", {
      p_order_id: orderId,
      p_provider: "paystack",
      p_provider_ref: reference,
    });
    const { data: order } = await db.from("orders").select("total_minor").eq("id", orderId).single();
    const total = order!.total_minor as number;

    // Visiting the confirmation page (the browser redirect) never pays the order.
    await page.goto(`/checkout/confirmation?ref=${reference}`);
    await expect(page.getByRole("heading", { name: "Confirming your payment" })).toBeVisible();

    // Bad signature: rejected, order untouched (rule 2).
    const bad = signedEvent(reference, total);
    const rejected = await request.post("/api/webhooks/paystack", {
      data: bad.body,
      headers: { "content-type": "application/json", "x-paystack-signature": "00".repeat(64) },
    });
    expect(rejected.status()).toBe(401);

    // Right signature, wrong amount: acknowledged but not paid.
    const wrong = signedEvent(reference, total - 1);
    const mismatch = await request.post("/api/webhooks/paystack", {
      data: wrong.body,
      headers: { "content-type": "application/json", "x-paystack-signature": wrong.signature },
    });
    expect((await mismatch.json()).result).toBe("mismatch");
    expect((await db.from("orders").select("status").eq("id", orderId).single()).data?.status).toBe(
      "pending_payment",
    );

    // Right signature and amount: paid. The earlier rejected deliveries do not block it,
    // and stock on hand drops exactly once.
    const good = signedEvent(reference, total);
    const post = () =>
      request.post("/api/webhooks/paystack", {
        data: good.body,
        headers: { "content-type": "application/json", "x-paystack-signature": good.signature },
      });
    const paid = await post();
    expect(paid.status()).toBe(200);
    expect((await paid.json()).result).toBe("paid");
    expect((await db.from("orders").select("status").eq("id", orderId).single()).data?.status).toBe("paid");
    expect(
      (await db.from("variants").select("stock_on_hand").eq("id", variant!.id).single()).data?.stock_on_hand,
    ).toBe(stockBefore - 1);

    // Replayed webhook (rule 3): acknowledged, nothing changes.
    expect((await (await post()).json()).result).toBe("duplicate");
    expect(
      (await db.from("variants").select("stock_on_hand").eq("id", variant!.id).single()).data?.stock_on_hand,
    ).toBe(stockBefore - 1);

    await page.reload();
    await expect(page.getByRole("heading", { name: /Order .* confirmed/ })).toBeVisible();
    await expect(page.getByText("Payment received")).toBeVisible();
  });
});
