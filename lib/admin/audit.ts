// Plain-English summaries for audit log rows (ADM-7). Pure: unit-tested.

const ACTIONS: Record<string, string> = {
  "product.create": "Created product",
  "product.update": "Changed product",
  "product.delete": "Deleted product",
  "product.prices": "Changed prices",
  "variant.create": "Added variant",
  "variant.delete": "Removed variant",
  "variant.stock": "Changed stock",
  "drop.create": "Created drop",
  "drop.update": "Changed drop",
  "drop.products": "Changed drop products",
  "drop.delete": "Deleted drop",
  "order.status": "Changed order status",
  "vip.approve": "Approved Privé member",
  "vip.revoke": "Removed Privé access",
  "vip.link": "Sent Privé access link",
  "staff.add": "Added staff member",
  "staff.update": "Changed staff member",
  "customers.export": "Exported customers",
};

export function actionLabel(action: string): string {
  return ACTIONS[action] ?? action;
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };

/** Fields that are noise in a change summary. */
const SKIP = new Set(["id", "created_at", "updated_at", "updated_by", "created_by"]);

function show(value: Json | undefined): string {
  if (value === null || value === undefined || value === "") return "none";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Short "field: old → new" lines for what changed. Creations and deletions
 * list the recorded values instead.
 */
export function changeLines(before: Json | null, after: Json | null, limit = 6): string[] {
  const b = before && typeof before === "object" && !Array.isArray(before) ? before : null;
  const a = after && typeof after === "object" && !Array.isArray(after) ? after : null;
  const lines: string[] = [];

  if (b && a) {
    for (const key of Object.keys({ ...b, ...a })) {
      if (SKIP.has(key)) continue;
      if (JSON.stringify(b[key]) === JSON.stringify(a[key])) continue;
      lines.push(`${key.replace(/_/g, " ")}: ${show(b[key])} → ${show(a[key])}`);
    }
  } else if (a || b) {
    const only = (a ?? b)!;
    for (const [key, value] of Object.entries(only)) {
      if (SKIP.has(key)) continue;
      lines.push(`${key.replace(/_/g, " ")}: ${show(value)}`);
    }
  } else if (Array.isArray(after)) {
    lines.push(`${after.length} items`);
  }
  return lines.slice(0, limit);
}
