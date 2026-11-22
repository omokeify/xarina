import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckoutForm } from "@/components/store/checkout-form";
import { readCart } from "@/lib/checkout/cart-cookie";
import { loadCartDetails, loadShippingOptions } from "@/lib/checkout/db";
import { getInitialCurrency } from "@/lib/currency/server";
import { getProviderForCurrency } from "@/lib/payments";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

const PROVIDER_LABELS: Record<string, string> = { paystack: "Paystack" };

export default async function CheckoutPage() {
  const currency = await getInitialCurrency();
  const [lines, shipping] = await Promise.all([
    loadCartDetails(await readCart(), currency),
    loadShippingOptions(currency),
  ]);
  if (lines.length === 0 || lines.some((l) => l.unitPriceMinor === null)) redirect("/cart");

  const subtotal = lines.reduce((sum, l) => sum + (l.unitPriceMinor ?? 0) * l.qty, 0);

  // Which processor takes this currency is configuration (PAYMENT_PROVIDER_*), not a hard-coded answer.
  const provider = getProviderForCurrency(currency);
  const providerInfo = provider
    ? {
        name: PROVIDER_LABELS[provider.name] ?? provider.name,
        methods: provider.name === "paystack" && currency === "NGN" ? "card, bank transfer or USSD" : null,
      }
    : null;

  // Shown only while payments aren't switched on for this currency.
  const { whatsapp } = await getSiteSettings();
  const whatsappHref = whatsapp.number
    ? whatsappLink(whatsapp.number, `Hello Xarina, I'd like to order in ${currency}.`)
    : null;

  return (
    <div className="px-space-3 py-space-5 md:px-space-5 md:py-space-6 mx-auto max-w-screen-xl">
      <Link
        href="/cart"
        className="label text-ink-muted hover:text-ink gap-space-2 inline-flex min-h-11 items-center"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Return to bag
      </Link>
      <h1 className="font-display text-display-m md:text-display-l mt-space-2">Guest checkout</h1>
      <p className="text-body text-ink-muted mt-space-1 max-w-xl">
        No account required. Amount and currency ({currency}) are locked at checkout.
      </p>
      <div className="mt-space-5">
        <CheckoutForm
          currency={currency}
          provider={providerInfo}
          whatsappHref={whatsappHref}
          subtotalMinor={subtotal}
          lines={lines.map((l) => ({
            variantId: l.variantId,
            productName: l.productName,
            colour: l.colour,
            size: l.size,
            qty: l.qty,
            imagePath: l.imagePath,
            lineTotalMinor: (l.unitPriceMinor ?? 0) * l.qty,
          }))}
          shipping={shipping.map((s) => ({
            id: s.id,
            label: `${s.zoneName} · ${s.name}`,
            etaText: s.etaText,
            amountMinor: s.amountMinor,
            countries: s.countries,
          }))}
        />
      </div>
    </div>
  );
}
