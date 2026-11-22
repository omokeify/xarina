// Database errors from the checkout functions (stable codes) → shopper-facing copy.

const MESSAGES: Record<string, string> = {
  drop_not_open: "This piece isn't open for purchase yet.",
  drop_closed: "This drop has closed.",
  vip_only: "This piece is open to Xarina Privé members for now.",
  vip_limit: "You've reached your Privé limit for this piece.",
  out_of_stock: "Sorry, that size has just sold out or is being held by another shopper.",
  unavailable: "One of the items in your bag is no longer available.",
  no_price: "One of the items in your bag can't be bought in this currency.",
  invalid_shipping: "Please choose a delivery option.",
  shipping_unavailable: "We can't deliver to that country with the chosen option.",
  invalid_quantity: "Please check the quantities in your bag.",
  empty_cart: "Your bag is empty.",
  invalid_currency: "That currency isn't available.",
};

export const GENERIC_CHECKOUT_ERROR = "Something went wrong starting your payment. Nothing has been charged.";

export function checkoutErrorMessage(dbMessage: string | undefined): string {
  return (dbMessage && MESSAGES[dbMessage]) || GENERIC_CHECKOUT_ERROR;
}

export function isKnownCheckoutError(dbMessage: string | undefined): boolean {
  return !!dbMessage && dbMessage in MESSAGES;
}
