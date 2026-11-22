/** Event names shared by browser and server tracking. */
export const EVENTS = {
  pageView: "$pageview",
  addToCart: "add_to_cart",
  beginCheckout: "begin_checkout",
  purchase: "purchase",
} as const;

export type AnalyticsEvent = (typeof EVENTS)[keyof typeof EVENTS];
