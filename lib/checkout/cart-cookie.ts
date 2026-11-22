import "server-only";
import { cookies } from "next/headers";
import { parseCart, type CartLine } from "./cart-lines";

const CART_COOKIE = "xarina_cart";

export async function readCart(): Promise<CartLine[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

export async function writeCart(lines: CartLine[]): Promise<void> {
  (await cookies()).set(CART_COOKIE, JSON.stringify(lines), {
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
    sameSite: "lax",
    httpOnly: true,
  });
}
