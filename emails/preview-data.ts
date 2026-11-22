import type { EmailSite, MarketingSite } from "./layout";
import type { OrderLine } from "./items";

// Sample data for `PreviewProps` only, so templates render in the email preview
// tool. Never imported by app code.
export const previewSite: EmailSite = {
  siteUrl: "https://example.com",
  instagramUrl: "https://instagram.com/xarina",
  whatsappUrl: "https://wa.me/2348000000000",
  businessAddress: "Lagos, Nigeria",
  unsubscribeUrl: "https://example.com/unsubscribe/token",
  preferencesUrl: "https://example.com/preferences/token",
};

export const previewMarketingSite: MarketingSite = {
  ...previewSite,
  unsubscribeUrl: "https://example.com/unsubscribe/token",
};

export const previewLine: OrderLine = {
  name: "The Atelier Dress",
  colour: "Ivory",
  size: "M",
  qty: 1,
  unitPriceMinor: 8500000,
};
