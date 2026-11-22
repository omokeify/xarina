import { z } from "zod";

// The cart lives in a cookie as variant ids + quantities ONLY. Prices, names and
// stock are always re-read from the database, so a tampered cookie can't change
// what is charged (rule 1, rule 4).

export const MAX_QTY_PER_LINE = 10;
export const MAX_LINES = 20;

export const cartLineSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
});
export const cartSchema = z.array(cartLineSchema).max(MAX_LINES);

export type CartLine = z.infer<typeof cartLineSchema>;

/** Parse the cookie value; anything malformed becomes an empty cart. */
export function parseCart(raw: string | undefined): CartLine[] {
  if (!raw) return [];
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function addLine(lines: CartLine[], variantId: string, qty = 1): CartLine[] {
  const existing = lines.find((l) => l.variantId === variantId);
  if (existing) {
    return lines.map((l) =>
      l.variantId === variantId ? { ...l, qty: Math.min(l.qty + qty, MAX_QTY_PER_LINE) } : l,
    );
  }
  return [...lines, { variantId, qty: Math.min(qty, MAX_QTY_PER_LINE) }].slice(0, MAX_LINES);
}

/** Change a line's quantity by `delta`, clamped to 1..MAX_QTY_PER_LINE. Use removeLine to delete. */
export function adjustLine(lines: CartLine[], variantId: string, delta: number): CartLine[] {
  return lines.map((l) =>
    l.variantId === variantId ? { ...l, qty: Math.min(Math.max(l.qty + delta, 1), MAX_QTY_PER_LINE) } : l,
  );
}

export function removeLine(lines: CartLine[], variantId: string): CartLine[] {
  return lines.filter((l) => l.variantId !== variantId);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}
