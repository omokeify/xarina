// Order statuses and who may move an order where (INV-4). This mirrors
// private.order_move_allowed in the database, which is the real enforcement;
// the UI only uses it to decide which buttons to show.

import type { StaffRole } from "@/lib/staff/roles";

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "dispatched",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  processing: "Processing",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

const SHIPPING_MOVES: ReadonlyArray<readonly [OrderStatus, OrderStatus]> = [
  ["paid", "processing"],
  ["paid", "dispatched"],
  ["processing", "dispatched"],
  ["dispatched", "delivered"],
];

const ADMIN_ONLY_MOVES: ReadonlyArray<readonly [OrderStatus, OrderStatus]> = [
  ["pending_payment", "cancelled"],
  ["paid", "cancelled"],
  ["paid", "refunded"],
  ["processing", "cancelled"],
  ["processing", "refunded"],
  ["dispatched", "refunded"],
  ["delivered", "refunded"],
];

const has = (moves: ReadonlyArray<readonly [OrderStatus, OrderStatus]>, from: OrderStatus, to: OrderStatus) =>
  moves.some(([f, t]) => f === from && t === to);

export function canMove(role: StaffRole, from: OrderStatus, to: OrderStatus): boolean {
  if (role === "fulfilment") return has(SHIPPING_MOVES, from, to);
  if (role === "owner" || role === "manager")
    return has(SHIPPING_MOVES, from, to) || has(ADMIN_ONLY_MOVES, from, to);
  return false; // support (and merchandiser) can view but not change status
}

/** The statuses this staff member can move an order to next, in a sensible order. */
export function nextStatuses(role: StaffRole, from: OrderStatus): OrderStatus[] {
  return ORDER_STATUSES.filter((to) => canMove(role, from, to));
}

/**
 * Clean a staff-typed search so it can sit inside a PostgREST filter: those
 * treat commas, brackets, quotes, % and * as syntax.
 */
export function cleanSearch(input: string): string {
  return input
    .replace(/[,()%*\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}
