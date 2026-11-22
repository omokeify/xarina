import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { readCart } from "@/lib/checkout/cart-cookie";
import { loadCartDetails } from "@/lib/checkout/db";
import { removeFromCartAction } from "@/lib/checkout/actions";
import { getInitialCurrency } from "@/lib/currency/server";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };

export default async function CartPage() {
  const currency = await getInitialCurrency();
  const lines = await loadCartDetails(await readCart(), currency);

  if (lines.length === 0) {
    return (
      <section className="px-space-4 py-space-7 mx-auto max-w-2xl text-center">
        <h1 className="font-display text-display-m">Your bag is empty</h1>
        <Button asChild className="mt-space-6">
          <Link href="/shop">Shop Xarina</Link>
        </Button>
      </section>
    );
  }

  const unpriced = lines.some((l) => l.unitPriceMinor === null);
  const subtotal = lines.reduce((sum, l) => sum + (l.unitPriceMinor ?? 0) * l.qty, 0);

  return (
    <section className="px-space-4 py-space-7 mx-auto max-w-2xl">
      <h1 className="font-display text-display-m">Your bag</h1>
      <ul className="mt-space-6 divide-line border-line divide-y border-y">
        {lines.map((l) => (
          <li key={l.variantId} className="gap-space-4 py-space-4 flex items-start justify-between">
            <div>
              <Link href={`/p/${l.productSlug}`} className="font-display text-title">
                {l.productName}
              </Link>
              <p className="text-body text-ink-muted">
                {l.colour} · {l.size} · Qty {l.qty}
              </p>
              {l.unitPriceMinor === null && (
                <p className="text-body text-critical">
                  Not available in {currency}. Switch currency or remove it.
                </p>
              )}
              <form action={removeFromCartAction} className="mt-space-2">
                <input type="hidden" name="variantId" value={l.variantId} />
                <button
                  type="submit"
                  className="label text-ink-muted inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  Remove
                </button>
              </form>
            </div>
            <p className="tabular-nums">
              {l.unitPriceMinor === null ? "—" : formatMoney(l.unitPriceMinor * l.qty, currency)}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-space-4 text-body flex justify-between">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
      </p>
      <p className="mt-space-2 text-body text-ink-muted">Delivery is calculated at checkout.</p>
      {unpriced ? (
        <Button block disabled className="mt-space-6">
          Checkout
        </Button>
      ) : (
        <Button asChild block className="mt-space-6">
          <Link href="/checkout">Checkout</Link>
        </Button>
      )}
    </section>
  );
}
