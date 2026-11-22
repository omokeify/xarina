import { cartCount } from "@/lib/checkout/cart-lines";
import { readCart } from "@/lib/checkout/cart-cookie";
import { BagTrigger } from "./bag-trigger";

/** Header bag icon with the live item count (server component: reads the cart cookie). */
export async function BagLink() {
  return <BagTrigger count={cartCount(await readCart())} />;
}
