"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { joinWaitlist, type WaitlistState } from "@/lib/waitlist/actions";
import { cn } from "@/lib/utils";
import { ProductImage } from "./product-image";

function Check({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <label className="gap-space-3 text-body-s text-ink flex min-h-11 items-center">
      <input type="checkbox" name={name} className="accent-action size-4 shrink-0 rounded-none" />
      <span>{children}</span>
    </label>
  );
}

/** Design shown in the header strip, as in the concept's waitlist modal. */
export type WaitlistProduct = {
  name: string;
  tagline?: string | null;
  coverPath: string | null;
  coverAlt?: string | null;
};

/**
 * WL-1..4. Look follows the concept's waitlist modal: a header strip with the
 * design, then the form. The two consent boxes stay separate and start
 * unticked (rule 12); submitting never counts as consent.
 */
export function WaitlistForm({
  productId,
  colours,
  sizes,
  product,
  framed = true,
}: {
  productId: string;
  colours: string[];
  sizes: string[];
  product?: WaitlistProduct;
  /** false when a dialog already provides the border and background. */
  framed?: boolean;
}) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, { status: "idle" });

  return (
    <div className={cn(framed && "border-line bg-surface-raised border")}>
      {product && (
        <div
          className={cn(
            "gap-space-3 border-line bg-surface-sunk p-space-3 flex items-center border-b",
            // Room for the dialog's close button in the corner.
            !framed && "pr-space-7",
          )}
        >
          <div className="w-14 shrink-0">
            <ProductImage path={product.coverPath} alt={product.coverAlt ?? product.name} sizes="56px" />
          </div>
          <div className="min-w-0">
            <p className="label text-ink-muted">Drop interest waitlist</p>
            <p className="font-display text-title truncate">{product.name}</p>
            {product.tagline && <p className="text-body-s text-ink-muted truncate">{product.tagline}</p>}
          </div>
        </div>
      )}

      <div className="p-space-4 md:p-space-5">
        {state.status === "done" ? (
          <div className="gap-space-3 flex flex-col">
            <p role="status" className="text-body text-ink">
              {state.message}
            </p>
            {state.detail && (
              <p className="text-body-s text-ink-muted border-line pt-space-3 border-t">{state.detail}</p>
            )}
          </div>
        ) : (
          <form action={action} className="gap-space-4 grid">
            <input type="hidden" name="productId" value={productId} />
            <div className="gap-space-4 grid sm:grid-cols-2">
              <div className="space-y-space-1">
                <Label htmlFor="wl-email">Email</Label>
                <Input id="wl-email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-space-1">
                <Label htmlFor="wl-name">Name (optional)</Label>
                <Input id="wl-name" name="name" autoComplete="name" />
              </div>
            </div>
            <div className="space-y-space-1">
              <Label htmlFor="wl-phone">Phone or WhatsApp (optional)</Label>
              <Input id="wl-phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            {(colours.length > 0 || sizes.length > 0) && (
              <div className="gap-space-4 grid sm:grid-cols-2">
                {colours.length > 0 && (
                  <Preference id="wl-colour" name="colour" label="Preferred colour" options={colours} />
                )}
                {sizes.length > 0 && (
                  <Preference id="wl-size" name="size" label="Preferred size" options={sizes} />
                )}
              </div>
            )}
            <div className="gap-space-1 grid">
              <p className="text-caption text-ink-muted">
                Joining again with the same email updates your preferences. Tick the boxes you agree to.
              </p>
              <Check name="dropAlerts">Email me when this drop opens.</Check>
              <Check name="marketing">Send me news from Xarina.</Check>
            </div>
            {state.status === "error" && (
              <p role="alert" className="text-body-s text-critical">
                {state.message}
              </p>
            )}
            <Button type="submit" block disabled={pending}>
              {pending ? "Joining" : "Join the waitlist"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Preference({
  id,
  name,
  label,
  options,
}: {
  id: string;
  name: string;
  label: string;
  options: string[];
}) {
  return (
    <div className="space-y-space-1">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue=""
        className="border-line bg-surface-raised px-space-3 text-body text-ink h-12 w-full rounded-xs border"
      >
        <option value="">No preference</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
