// What the storefront shows for a design, given its drop (PDP-4, SHOP-3, HOME-1/2).
// Pure: the drop state comes from the database (rule 6); this only maps it to UI.
// Purchase permission is enforced again server-side at add-to-cart and payment
// start (DROP-3) — never by this function.

import type { DropState } from "./catalogue";

export type DropInfo = {
  state: DropState;
  vip_opens_at: string;
  public_opens_at: string;
  on_close?: "move_to_available" | "hide";
} | null;

/** Card state badge. Every card carries one (concept layout, BRAND.md › Approved exceptions). */
export type Badge = "Available" | "Upcoming" | "Privé" | "Sold out";

export type PrimaryAction =
  | { kind: "waitlist"; countdownTo: string; countdownLabel: string }
  | { kind: "prive"; countdownTo: string; countdownLabel: string }
  | { kind: "buy" }
  | { kind: "sold_out" }
  | { kind: "unavailable" };

/**
 * @param isPriveMember approved Privé member with a verified session (Phase 4;
 *        always false until then).
 * @param variantAvailable the selected variant (or, with none selected, any variant) has stock.
 */
export function primaryAction(
  drop: DropInfo,
  variantAvailable: boolean,
  isPriveMember = false,
): PrimaryAction {
  const state = drop?.state ?? "public";

  if (drop && state === "upcoming") {
    return isPriveMember
      ? { kind: "waitlist", countdownTo: drop.vip_opens_at, countdownLabel: "Privé opens in" }
      : { kind: "waitlist", countdownTo: drop.public_opens_at, countdownLabel: "Opens in" };
  }
  if (drop && state === "vip") {
    if (isPriveMember) return variantAvailable ? { kind: "buy" } : { kind: "sold_out" };
    // Waitlist stays open until public opening (PRD › Timing rules).
    return { kind: "prive", countdownTo: drop.public_opens_at, countdownLabel: "Opens to everyone in" };
  }
  if (drop && state === "closed" && drop.on_close === "hide") return { kind: "unavailable" };
  return variantAvailable ? { kind: "buy" } : { kind: "sold_out" };
}

/** Product-card badge (SHOP-3). */
export function badgeFor(dropState: DropState | null, soldOut: boolean): Badge {
  if (dropState === "upcoming") return "Upcoming";
  if (dropState === "vip") return "Privé";
  return soldOut ? "Sold out" : "Available";
}

/** Split a duration into countdown units. Negative durations clamp to zero. */
export function countdownParts(msRemaining: number) {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
    done: total === 0,
  };
}
