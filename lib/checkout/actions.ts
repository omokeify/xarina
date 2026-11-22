"use server";

import { redirect } from "next/navigation";
import { publicEnv } from "@/lib/env";
import { getAttribution } from "@/lib/attribution/server";
import { getInitialCurrency } from "@/lib/currency/server";
import { getProviderForCurrency } from "@/lib/payments";
import { getPriveCustomerId } from "@/lib/prive/session";
import type { Currency } from "@/lib/money";
import { addLine, adjustLine, cartCount, MAX_QTY_PER_LINE, removeLine } from "./cart-lines";
import { readCart, writeCart } from "./cart-cookie";
import { assertCanAddToCart, createCheckoutDb, loadCartDetails } from "./db";
import { checkoutErrorMessage, GENERIC_CHECKOUT_ERROR, isKnownCheckoutError } from "./errors";
import { checkoutFormSchema } from "./form-schema";
import { startCheckout } from "./start-checkout";
import { isRateLimited, TOO_MANY_ATTEMPTS } from "@/lib/rate-limit";

export type AddToCartResult = { ok: true; count: number } | { ok: false; message: string };

/** DROP-3: re-checks drop state, publication and stock on the server before adding. */
export async function addToCartAction(variantId: string): Promise<AddToCartResult> {
  const lines = await readCart();
  const priveCustomerId = await getPriveCustomerId(); // verified session or access link only (rule 7)
  const wanted = (lines.find((l) => l.variantId === variantId)?.qty ?? 0) + 1;
  if (wanted > MAX_QTY_PER_LINE) return { ok: false, message: "That's the most you can add of one item." };
  try {
    await assertCanAddToCart(variantId, wanted, priveCustomerId);
  } catch (error) {
    return { ok: false, message: checkoutErrorMessage(error instanceof Error ? error.message : undefined) };
  }
  const next = addLine(lines, variantId);
  await writeCart(next);
  return { ok: true, count: cartCount(next) };
}

export type BagLine = {
  variantId: string;
  qty: number;
  productName: string;
  productSlug: string;
  colour: string;
  size: string;
  imagePath: string | null;
  unitPriceMinor: number | null;
};
export type BagState = { currency: Currency; lines: BagLine[] };

/** Bag contents for the drawer, priced by the database in the shopper's currency. */
export async function loadBagAction(): Promise<BagState> {
  const currency = await getInitialCurrency();
  const lines = await loadCartDetails(await readCart(), currency);
  return { currency, lines };
}

export type BagChangeResult = { ok: true } | { ok: false; message: string };

/** Step a line up or down. Going up re-runs the drop and stock check (DROP-3). */
export async function changeQtyAction(variantId: string, delta: 1 | -1): Promise<BagChangeResult> {
  const lines = await readCart();
  const current = lines.find((l) => l.variantId === variantId);
  if (!current) return { ok: true };
  if (delta === 1) {
    if (current.qty + 1 > MAX_QTY_PER_LINE) {
      return { ok: false, message: "That's the most you can add of one item." };
    }
    try {
      await assertCanAddToCart(variantId, current.qty + 1, await getPriveCustomerId());
    } catch (error) {
      return { ok: false, message: checkoutErrorMessage(error instanceof Error ? error.message : undefined) };
    }
  }
  await writeCart(adjustLine(lines, variantId, delta));
  return { ok: true };
}

export async function removeLineAction(variantId: string): Promise<void> {
  await writeCart(removeLine(await readCart(), variantId));
}

export async function removeFromCartAction(formData: FormData): Promise<void> {
  const variantId = String(formData.get("variantId") ?? "");
  await writeCart(removeLine(await readCart(), variantId));
  redirect("/cart");
}

export async function clearCartAction(): Promise<void> {
  await writeCart([]);
}

export type PlaceOrderState = { error?: string; fieldErrors?: Record<string, string> };

/** PAY-1..4: validate, hold stock, start payment, send the shopper to the provider. */
export async function placeOrderAction(_prev: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  if (await isRateLimited("checkout")) return { error: TOO_MANY_ATTEMPTS };
  const parsed = checkoutFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  const form = parsed.data;

  const lines = await readCart();
  const priveCustomerId = await getPriveCustomerId();
  if (lines.length === 0) return { error: checkoutErrorMessage("empty_cart") };

  // Same currency the shopper has been seeing: display, cart, checkout and charge match (CUR-3).
  const currency = await getInitialCurrency();
  const provider = getProviderForCurrency(currency);
  if (!provider)
    return { error: `We can't take payments in ${currency} yet. Please choose another currency.` };

  let redirectUrl: string;
  try {
    ({ redirectUrl } = await startCheckout(
      createCheckoutDb(),
      provider,
      {
        items: lines,
        currency,
        email: form.email,
        phone: form.phone,
        address: {
          name: form.name,
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          region: form.region,
          postcode: form.postcode,
          country: form.country,
        },
        shippingRateId: form.shippingRateId,
        priveCustomerId,
        utm: await getAttribution(),
      },
      publicEnv.NEXT_PUBLIC_SITE_URL,
    ));
  } catch (error) {
    const code = error instanceof Error ? error.message : undefined;
    if (!isKnownCheckoutError(code)) console.error("checkout failed", error);
    return { error: isKnownCheckoutError(code) ? checkoutErrorMessage(code) : GENERIC_CHECKOUT_ERROR };
  }
  redirect(redirectUrl);
}
