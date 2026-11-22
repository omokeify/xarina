// Pure helpers for the order details screen. Kept out of the page so the
// timeline and webhook labels can be unit-tested without Next.js.

import { UTM_KEYS, type Attribution } from "@/lib/attribution/utm";
import type { OrderStatus } from "./orders";

export type TimelineState = "done" | "current" | "todo" | "skipped";
export type TimelineStep = { label: string; at: string | null; state: TimelineState };
export type StatusChange = { to: OrderStatus; at: string };

const MILESTONES: ReadonlyArray<{ status: OrderStatus; label: string }> = [
  { status: "paid", label: "Payment confirmed" },
  { status: "processing", label: "Processing" },
  { status: "dispatched", label: "Dispatched" },
  { status: "delivered", label: "Delivered" },
];

const RANK: Partial<Record<OrderStatus, number>> = { paid: 0, processing: 1, dispatched: 2, delivered: 3 };

/**
 * Order progress from the data we actually have: created_at, paid_at and the
 * order.status audit rows. Staff without audit access pass no statusChanges and
 * still get a useful timeline from the order's current status alone.
 */
export function orderTimeline(input: {
  createdAt: string;
  paidAt: string | null;
  status: OrderStatus;
  statusChanges?: StatusChange[];
}): TimelineStep[] {
  const changes = input.statusChanges ?? [];
  const steps: TimelineStep[] = [{ label: "Order placed", at: input.createdAt, state: "done" }];
  const terminal = input.status === "cancelled" || input.status === "refunded";
  const currentRank = input.status === "pending_payment" ? 0 : (RANK[input.status] ?? -1);

  // Audit rows arrive newest-first; the first time a status was reached is the
  // one that belongs on the timeline.
  const firstAt = (status: OrderStatus) =>
    changes
      .filter((c) => c.to === status)
      .map((c) => c.at)
      .sort()[0] ?? null;

  for (const milestone of MILESTONES) {
    const rank = RANK[milestone.status]!;
    const at = milestone.status === "paid" ? input.paidAt : firstAt(milestone.status);
    let state: TimelineState;
    if (terminal) state = at ? "done" : "skipped";
    else if (rank === currentRank) state = "current";
    else if (at || rank < currentRank) state = "done";
    else state = "todo";
    steps.push({ label: milestone.label, at, state });
  }

  if (terminal) {
    steps.push({
      label: input.status === "cancelled" ? "Cancelled" : "Refunded",
      at: firstAt(input.status),
      state: "current",
    });
  }
  return steps;
}

/** Human label for a stored webhook event type, including rejected deliveries. */
export function paymentEventLabel(eventType: string): string {
  const known: Record<string, string> = {
    "charge.success": "Payment confirmed",
    "charge.success:unknown_order": "Order not found",
    "charge.success:mismatch": "Amount or currency mismatch",
    "charge.success:no_stock": "Stock no longer available",
    invalid_signature: "Invalid signature",
  };
  if (known[eventType]) return known[eventType];
  const [base, reason] = eventType.split(":");
  const spaced = base.replace(/[._]/g, " ");
  const human = spaced.charAt(0).toUpperCase() + spaced.slice(1);
  return reason ? `${human} · ${reason.replace(/_/g, " ")}` : human;
}

/** Read the five stored attribution keys, ignoring anything else in the JSON. */
export function orderAttribution(utm: unknown): Attribution | null {
  if (utm === null || typeof utm !== "object" || Array.isArray(utm)) return null;
  const record = utm as Record<string, unknown>;
  const found: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) found[key] = value.trim().slice(0, 200);
  }
  return Object.keys(found).length ? (found as Attribution) : null;
}
