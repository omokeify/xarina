import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { ClearCart } from "@/components/store/clear-cart";
import { ProductImage } from "@/components/store/product-image";
import { Button } from "@/components/ui/button";
import { loadOrderByReference } from "@/lib/checkout/db";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

const PAID_STATUSES = ["paid", "processing", "dispatched", "delivered"];

// The browser redirect only brings the shopper here. It never confirms payment:
// the order is paid only when the verified webhook says so (PAY-5, rule 2).
export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const order = ref ? await loadOrderByReference(ref) : null;

  if (!order) {
    return (
      <Shell>
        <h1 className="font-display text-display-m">We couldn&apos;t find that order</h1>
        <Button asChild className="mt-space-4">
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </Shell>
    );
  }

  const paid = PAID_STATUSES.includes(order.status);
  if (!paid) {
    const cancelled = order.status === "cancelled";
    return (
      <Shell>
        <p className="label text-ink-muted">Order {order.number}</p>
        <h1 className="font-display text-display-m mt-space-2">
          {cancelled ? "Payment not completed" : "Confirming your payment"}
        </h1>
        <p className="text-body text-ink-muted mt-space-3">
          {cancelled
            ? "Your payment didn't go through and nothing was charged. Your bag is still saved."
            : "This usually takes a few seconds. Refresh this page to check. You'll get an email once it's confirmed."}
        </p>
        <Button asChild className="mt-space-4">
          <Link href={cancelled ? "/cart" : "/shop"}>{cancelled ? "Back to bag" : "Continue shopping"}</Link>
        </Button>
      </Shell>
    );
  }

  const { currency } = order;
  return (
    <Shell>
      <ClearCart />
      <div className="border-line pb-space-5 space-y-space-2 border-b">
        <p className="text-body gap-space-2 flex items-center font-medium">
          <CheckCircle2 aria-hidden="true" className="size-4 stroke-[1.5]" />
          Payment received
        </p>
        <h1 className="font-display text-display-m md:text-display-l">Order {order.number} confirmed</h1>
        <p className="text-body text-ink-muted">
          Thank you{order.deliverTo.name ? `, ${order.deliverTo.name}` : ""}. A confirmation is on its way to{" "}
          <strong className="text-ink font-medium">{order.email}</strong>. We will email your tracking link as
          soon as your order is dispatched.
        </p>
      </div>

      <section className="py-space-5 space-y-space-3">
        <h2 className="label text-ink-muted">Your pieces</h2>
        <ul className="divide-line divide-y">
          {order.items.map((item) => (
            <li
              key={`${item.sku}-${item.size}`}
              className="py-space-3 gap-space-3 flex items-center first:pt-0"
            >
              <div className="w-16 shrink-0">
                <ProductImage path={item.imagePath} alt="" sizes="64px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium">{item.productName}</p>
                <p className="text-body-s text-ink-muted mt-1 tabular-nums">
                  {item.colour} · {item.size} · Qty {item.qty} · {item.sku}
                </p>
              </div>
              <p className="text-body font-medium tabular-nums">
                {formatMoney(item.unitPriceMinor * item.qty, currency)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="border-line pt-space-5 gap-space-5 text-body grid grid-cols-1 border-t sm:grid-cols-2">
        <div className="space-y-space-1">
          <h2 className="label text-ink-muted mb-space-2">Delivering to</h2>
          {order.deliverTo.name && <p className="font-medium">{order.deliverTo.name}</p>}
          {order.deliverTo.lines.map((line) => (
            <p key={line} className="text-ink-muted">
              {line}
            </p>
          ))}
        </div>
        <dl className="space-y-space-2">
          <h2 className="label text-ink-muted mb-space-2">Receipt ({currency})</h2>
          <div className="text-ink-muted flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(order.subtotalMinor, currency)}</dd>
          </div>
          <div className="text-ink-muted flex justify-between">
            <dt>Delivery</dt>
            <dd className="tabular-nums">{formatMoney(order.shippingMinor, currency)}</dd>
          </div>
          <div className="border-line pt-space-2 flex justify-between border-t font-semibold">
            <dt>Total paid</dt>
            <dd className="tabular-nums">{formatMoney(order.totalMinor, currency)}</dd>
          </div>
        </dl>
      </div>

      <Button asChild className="mt-space-5">
        <Link href="/shop">Continue shopping</Link>
      </Button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-space-3 py-space-5 md:px-space-5 md:py-space-6 mx-auto max-w-3xl">
      <div className="border-line bg-surface-raised p-space-4 md:p-space-6 border">{children}</div>
    </div>
  );
}
