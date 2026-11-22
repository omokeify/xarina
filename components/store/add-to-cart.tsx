"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { track } from "@/lib/analytics/client";
import { EVENTS } from "@/lib/analytics/events";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/lib/checkout/actions";
import { BAG_OPEN_EVENT } from "@/lib/checkout/events";

/**
 * Buy button for a selected variant. The server re-checks drop state, publication
 * and stock before anything enters the bag (DROP-3); the client never decides.
 */
export function AddToCart({ variantId }: { productId: string; variantId: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function add() {
    if (!variantId) return;
    startTransition(async () => {
      const result = await addToCartAction(variantId);
      setMessage(result.ok ? { text: "Added to your bag.", ok: true } : { text: result.message, ok: false });
      if (result.ok) {
        track(EVENTS.addToCart, { variant_id: variantId });
        router.refresh(); // updates the bag count in the header
        window.dispatchEvent(new Event(BAG_OPEN_EVENT)); // and shows the bag
      }
    });
  }

  return (
    <div className="space-y-space-3">
      <Button type="button" block disabled={!variantId || pending} onClick={add}>
        {!variantId ? "Choose a size" : pending ? "Adding…" : "Add to bag"}
      </Button>
      <p role="status" aria-live="polite" className="text-body text-ink-muted">
        {message?.text}{" "}
        {message?.ok && (
          <Link
            href="/cart"
            className="text-ink inline-flex min-h-11 items-center underline underline-offset-4"
          >
            View bag
          </Link>
        )}
      </p>
    </div>
  );
}
