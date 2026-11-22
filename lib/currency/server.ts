import "server-only";
import { cookies, headers } from "next/headers";
import type { Currency } from "@/lib/money";
import { CURRENCY_COOKIE } from "./constants";
import { pickInitialCurrency } from "./default-currency";

/** Currency for this request: saved cookie, else visitor country, else default (CUR-3, CUR-4). */
export async function getInitialCurrency(): Promise<Currency> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return pickInitialCurrency(cookieStore.get(CURRENCY_COOKIE)?.value, headerStore.get("x-vercel-ip-country"));
}
