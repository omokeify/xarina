import { formatMoney, type Currency } from "@/lib/money";
import type { EmailItem } from "./parts";

/** One order or bag line. Money is integer minor units (rule 1). */
export type OrderLine = {
  name: string;
  colour: string;
  size: string;
  qty: number;
  unitPriceMinor: number;
  imageUrl?: string;
};

export function toItem(
  line: OrderLine,
  currency: Currency,
  opts: { price?: boolean; qty?: boolean } = {},
): EmailItem {
  const { price = true, qty = true } = opts;
  return {
    name: line.name,
    detail: `${line.colour} · Size ${line.size}${qty ? ` · Qty ${line.qty}` : ""}`,
    price: price ? formatMoney(line.unitPriceMinor * line.qty, currency) : undefined,
    imageUrl: line.imageUrl,
  };
}

/** A catalogue piece shown in grids. */
export type ProductTile = {
  name: string;
  priceMinor?: number;
  imageUrl?: string;
  href?: string;
  note?: string;
};

export function toProduct(p: ProductTile, currency: Currency) {
  return {
    name: p.name,
    price: p.priceMinor === undefined ? undefined : formatMoney(p.priceMinor, currency),
    imageUrl: p.imageUrl,
    href: p.href,
    note: p.note,
  };
}
