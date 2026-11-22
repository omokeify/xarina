"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { KeyRound, MessageCircle } from "lucide-react";
import type { ProductDetail } from "@/lib/catalogue";
import { primaryAction } from "@/lib/drop-display";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/lib/currency/context";
import { Price } from "./price";
import { Countdown } from "./countdown";
import { AddToCart } from "./add-to-cart";
import { RestockRequest } from "./restock-request";
import { WaitlistTrigger } from "./waitlist-dialog";

const unique = <T,>(xs: T[]) => [...new Set(xs)];

/**
 * Price, description, colour and size selection and the state-driven primary
 * action (PDP-3/4), plus WhatsApp stylist help (PDP-6) and a sticky bar on
 * mobile. Concept layout: the first in-stock colour and size start selected,
 * sizes are underlined tabs. Display only: purchase is re-checked on the
 * server (DROP-3), and exact stock counts never reach the browser.
 */
export function ProductPurchase({
  detail,
  isPriveMember,
  whatsappNumber,
  productUrl,
  description,
}: {
  detail: ProductDetail;
  isPriveMember: boolean;
  whatsappNumber: string | null;
  productUrl: string;
  /** Description, shown between the price and the options (concept order). */
  description: string;
}) {
  const { product, variants, drop, server_now } = detail;
  const colours = unique(variants.map((v) => v.colour));
  const sizes = unique(variants.map((v) => v.size));
  const { currency } = useCurrency();
  // Start on the first in-stock variant so the main action is ready (concept).
  const firstAvailable = variants.find((v) => v.available) ?? null;
  const [colour, setColour] = useState(firstAvailable?.colour ?? (colours.length === 1 ? colours[0] : null));
  const [size, setSize] = useState(firstAvailable?.size ?? (sizes.length === 1 ? sizes[0] : null));

  const selected = useMemo(
    () => variants.find((v) => v.colour === colour && v.size === size) ?? null,
    [variants, colour, size],
  );
  const anyAvailable = variants.some((v) => v.available);
  const action = primaryAction(drop, selected ? selected.available : anyAvailable, isPriveMember);
  const prices = selected?.prices ?? detail.prices;

  const sizeAvailable = (s: string) =>
    variants.some((v) => v.size === s && (colour == null || v.colour === colour) && v.available);

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
        [
          `Hello Xarina, I have a question about ${product.name}`,
          selected ? `(${selected.colour}, size ${selected.size})` : "",
          productUrl,
        ]
          .filter(Boolean)
          .join(" "),
      )}`
    : null;

  const actionNode = (() => {
    switch (action.kind) {
      case "waitlist":
        return <WaitlistTrigger block>Join the waitlist</WaitlistTrigger>;
      case "prive":
        // Concept: Privé gate first, public waitlist as the quiet alternative.
        return (
          <div className="gap-space-2 flex flex-col">
            <Button asChild block>
              <Link href="/prive">
                <KeyRound aria-hidden className="text-accent size-4" />
                Privé members only, verify access
              </Link>
            </Button>
            <WaitlistTrigger block variant="secondary">
              Join public waitlist instead
            </WaitlistTrigger>
          </div>
        );
      case "buy":
        return <AddToCart productId={product.id} variantId={selected?.id ?? null} />;
      case "sold_out":
        return (
          <div className="gap-space-2 flex flex-col">
            <Button block disabled variant="secondary" className={QUIET_DISABLED}>
              Sold out
            </Button>
            {selected && <RestockRequest variantId={selected.id} />}
          </div>
        );
      case "unavailable":
        return (
          <Button block disabled variant="secondary" className={QUIET_DISABLED}>
            No longer available
          </Button>
        );
    }
  })();

  // Exact units for Available-now designs only (server sends null for drop
  // designs, user decision); the Privé per-member limit during the VIP window.
  const qty = selected?.available_qty ?? null;
  const limit = drop?.state === "vip" ? drop.vip_limit_per_member : null;
  const stockNote =
    qty != null
      ? qty > 0
        ? `${qty} ${qty === 1 ? "unit" : "units"} available`
        : "Sold out in this size. Tell me when it's back."
      : limit
        ? `Privé allocation: max ${limit} per member`
        : null;

  return (
    <div className="gap-space-5 flex flex-col">
      <p className="gap-space-3 flex items-baseline">
        <Price prices={prices} from={!selected && hasPriceRange(detail)} className="text-title" />
        <span className="label text-ink-muted">
          {currency} · {product.pricing_mode === "fx" ? "FX converted" : "Fixed boutique price"}
        </span>
      </p>

      {(action.kind === "waitlist" || action.kind === "prive") && (
        <div className="border-line px-space-4 py-space-3 border">
          <Countdown to={action.countdownTo} serverNow={server_now} label={action.countdownLabel} />
        </div>
      )}

      {description && <p className="text-body-s whitespace-pre-line">{description}</p>}

      {colours.length > 0 && (
        <OptionGroup label="Colour" value={colour}>
          {colours.map((c) => {
            const hex = variants.find((v) => v.colour === c && v.colour_hex)?.colour_hex;
            return hex ? (
              <Swatch key={c} hex={hex} selected={colour === c} onClick={() => setColour(c)}>
                {c}
              </Swatch>
            ) : (
              <OptionButton key={c} selected={colour === c} onClick={() => setColour(c)}>
                {c}
              </OptionButton>
            );
          })}
        </OptionGroup>
      )}

      {sizes.length > 0 && (
        <OptionGroup
          label="Size"
          value={size}
          aside={
            <a
              href="#measurements"
              className="text-body-s text-ink-muted hover:text-ink underline underline-offset-4"
            >
              Measurements (cm)
            </a>
          }
        >
          {sizes.map((s) => {
            const soldOut = !sizeAvailable(s);
            return (
              <SizeTab key={s} selected={size === s} onClick={() => setSize(s)} soldOut={soldOut}>
                {s}
              </SizeTab>
            );
          })}
        </OptionGroup>
      )}

      {stockNote && <p className="text-caption text-ink-muted -mt-space-3 tabular-nums">{stockNote}</p>}

      <div className="gap-space-3 flex flex-col">
        {/* Rendered once: a sticky Buy/Join bar on mobile, inline on desktop. */}
        <div className="border-line bg-surface px-space-3 pt-space-2 fixed inset-x-0 bottom-0 z-40 border-t pb-[max(var(--spacing-space-2),env(safe-area-inset-bottom))] md:static md:z-auto md:border-0 md:bg-transparent md:p-0">
          {actionNode}
        </div>

        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body-s border-line text-ink hover:border-ink gap-space-2 flex min-h-11 items-center justify-center border"
          >
            <MessageCircle aria-hidden className="size-4" />
            WhatsApp stylist help{selected ? ` (${selected.size})` : ""}
          </a>
        )}
      </div>
    </div>
  );
}

// Sold out / unavailable: calm outline, not a faded dark block.
const QUIET_DISABLED = "border-line text-ink-muted disabled:opacity-100";

function hasPriceRange(detail: ProductDetail) {
  const amounts = new Set(detail.variants.map((v) => JSON.stringify(v.prices)));
  return amounts.size > 1;
}

function OptionGroup({
  label,
  value,
  aside,
  children,
}: {
  label: string;
  value: string | null;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="gap-space-2 flex flex-col">
      <legend className="mb-space-2 flex w-full items-baseline justify-between">
        <span className="text-body-s text-ink-muted">
          {label}
          {value && <span className="text-ink ml-space-1">{value}</span>}
        </span>
        {aside}
      </legend>
      <div className="gap-x-space-4 gap-y-space-2 flex flex-wrap">{children}</div>
    </fieldset>
  );
}

/** Colour as a square swatch (concept). The hex is garment data, not an interface colour. */
function Swatch({
  hex,
  selected,
  onClick,
  children,
}: {
  hex: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      title={String(children)}
      className={cn(
        "p-space-1 inline-flex size-11 items-center justify-center border",
        selected ? "border-ink" : "border-line hover:border-ink-muted",
      )}
    >
      <span aria-hidden className="block size-full" style={{ backgroundColor: hex }} />
      <span className="sr-only">{children}</span>
    </button>
  );
}

/** Size as an underlined tab (concept). Sold-out sizes stay selectable for restock alerts. */
function SizeTab({
  selected,
  soldOut,
  onClick,
  children,
}: {
  selected: boolean;
  soldOut: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "text-body-s min-h-11 border-b-2 tabular-nums",
        selected ? "border-ink text-ink" : "text-ink-muted hover:text-ink border-transparent",
        soldOut && !selected && "line-through",
      )}
    >
      {children}
      {soldOut && <span className="sr-only"> (sold out)</span>}
    </button>
  );
}

function OptionButton({
  selected,
  soldOut = false,
  onClick,
  children,
}: {
  selected: boolean;
  soldOut?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "px-space-3 text-body-s min-h-11 min-w-11 border",
        selected ? "border-action bg-action text-on-action" : "border-line text-ink hover:border-ink",
        soldOut && !selected && "text-ink-muted line-through",
      )}
    >
      {children}
      {soldOut && <span className="sr-only"> (sold out)</span>}
    </button>
  );
}
