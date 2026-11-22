"use client";

import { Clock, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  changeQtyAction,
  loadBagAction,
  removeLineAction,
  type BagLine,
  type BagState,
} from "@/lib/checkout/actions";
import { formatMoney } from "@/lib/money";
import { ProductImage } from "./product-image";

/**
 * Right-hand shopping bag. Contents are read from the server (priced by the
 * database in the shopper's currency); the client only sends "step up / down /
 * remove". Going up re-checks drop state and stock on the server (DROP-3).
 */
export function BagDrawer({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [bag, setBag] = useState<BagState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reload = useCallback(async () => {
    setBag(await loadBagAction());
  }, []);

  useEffect(() => {
    void reload();
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [reload, onClose]);

  function mutate(work: () => Promise<{ ok: boolean; message?: string } | void>) {
    startTransition(async () => {
      const result = await work();
      setMessage(result && !result.ok ? (result.message ?? null) : null);
      await reload();
      router.refresh(); // keeps the header count in step
    });
  }

  const lines = bag?.lines ?? [];
  const currency = bag?.currency ?? "NGN";
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const unpriced = lines.some((l) => l.unitPriceMinor === null);
  const subtotal = lines.reduce((sum, l) => sum + (l.unitPriceMinor ?? 0) * l.qty, 0);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping bag"
    >
      <div className="bg-ink/40 absolute inset-0" onClick={onClose} aria-hidden="true" />

      <aside className="border-line bg-surface text-ink relative z-10 flex h-full w-full max-w-md flex-col border-l">
        <div className="border-line px-space-4 flex items-center justify-between border-b">
          <h2 className="label gap-space-2 flex min-h-14 items-center">
            <ShoppingBag aria-hidden="true" className="size-4" />
            Shopping bag
            <span className="text-ink-muted tabular-nums">({count})</span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close shopping bag"
            className="text-ink-muted hover:text-ink -mr-3 inline-flex size-11 items-center justify-center"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {bag && lines.length === 0 ? (
          <div className="px-space-5 flex flex-1 flex-col items-center justify-center text-center">
            <ShoppingBag aria-hidden="true" className="text-ink-muted mb-space-3 size-9 stroke-1" />
            <p className="font-display text-display-m">Your bag is empty</p>
            <p className="text-body text-ink-muted mt-space-2 max-w-xs">
              Shop pieces ready to dispatch now, or explore the next drop.
            </p>
            <Button asChild className="mt-space-4">
              <Link href="/shop" onClick={onClose}>
                Shop Xarina
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <ul
              className="divide-line px-space-4 flex-1 divide-y overflow-y-auto"
              aria-busy={pending || !bag}
            >
              {lines.map((line) => (
                <BagRow
                  key={line.variantId}
                  line={line}
                  currency={currency}
                  busy={pending}
                  onClose={onClose}
                  mutate={mutate}
                />
              ))}
            </ul>

            <div className="border-line bg-surface-sunk px-space-4 py-space-3 space-y-space-3 border-t">
              <p className="text-body-s text-ink-muted gap-space-2 flex items-start">
                <Clock aria-hidden="true" className="text-ink mt-1 size-3.5 shrink-0" />
                <span>
                  Your pieces are held for 15 minutes once you start payment. Charged in{" "}
                  <strong className="text-ink font-semibold">{currency}</strong>.
                </span>
              </p>
              {message && (
                <p role="alert" className="text-body-s text-critical">
                  {message}
                </p>
              )}
              <p className="text-body flex items-center justify-between font-semibold">
                <span>Subtotal ({currency})</span>
                <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
              </p>
              {unpriced || !bag ? (
                <Button block disabled>
                  Checkout
                </Button>
              ) : (
                <Button asChild block>
                  <Link href="/checkout" onClick={onClose}>
                    Checkout
                  </Link>
                </Button>
              )}
            </div>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}

function BagRow({
  line,
  currency,
  busy,
  onClose,
  mutate,
}: {
  line: BagLine;
  currency: BagState["currency"];
  busy: boolean;
  onClose: () => void;
  mutate: (work: () => Promise<{ ok: boolean; message?: string } | void>) => void;
}) {
  return (
    <li className="py-space-3 gap-space-3 first:pt-space-3 flex">
      <Link
        href={`/p/${line.productSlug}`}
        onClick={onClose}
        className="w-20 shrink-0"
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProductImage path={line.imagePath} alt="" sizes="80px" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="gap-space-2 flex items-start justify-between">
          <div>
            <Link
              href={`/p/${line.productSlug}`}
              onClick={onClose}
              className="text-body font-medium underline-offset-4 hover:underline"
            >
              {line.productName}
            </Link>
            <p className="text-body-s text-ink-muted mt-1">
              {line.colour} · <span className="text-ink">{line.size}</span>
            </p>
            {line.unitPriceMinor === null && (
              <p className="text-body-s text-critical">
                Not available in {currency}. Switch currency or remove it.
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => mutate(() => removeLineAction(line.variantId))}
            aria-label={`Remove ${line.productName}`}
            className="text-ink-muted hover:text-ink -mt-2 -mr-3 inline-flex size-11 shrink-0 items-center justify-center"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="mt-space-2 flex items-center justify-between">
          <div className="border-line bg-surface-raised inline-flex items-center border">
            <button
              type="button"
              disabled={busy || line.qty <= 1}
              onClick={() => mutate(() => changeQtyAction(line.variantId, -1))}
              aria-label={`Decrease quantity of ${line.productName}`}
              className="hover:bg-surface-sunk inline-flex size-11 items-center justify-center disabled:opacity-40"
            >
              <Minus aria-hidden="true" className="size-3.5" />
            </button>
            <span className="text-body-s w-8 text-center tabular-nums" aria-live="polite">
              {line.qty}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => mutate(() => changeQtyAction(line.variantId, 1))}
              aria-label={`Increase quantity of ${line.productName}`}
              className="hover:bg-surface-sunk inline-flex size-11 items-center justify-center disabled:opacity-40"
            >
              <Plus aria-hidden="true" className="size-3.5" />
            </button>
          </div>
          <p className="text-body font-medium tabular-nums">
            {line.unitPriceMinor === null ? "—" : formatMoney(line.unitPriceMinor * line.qty, currency)}
          </p>
        </div>
      </div>
    </li>
  );
}
