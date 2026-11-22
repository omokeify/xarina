import type { ProductListing } from "./catalogue";

// SHOP-2: filter by design (collection) and availability.
export const AVAILABILITY = [
  { value: "in-stock", label: "In stock" },
  { value: "upcoming", label: "Upcoming" },
  { value: "sold-out", label: "Sold out" },
] as const;
export type Availability = (typeof AVAILABILITY)[number]["value"];

type Listing = Pick<ProductListing, "collection_slug" | "section" | "sold_out">;

export function matchesFilter(p: Listing, design: string | undefined, availability: Availability | undefined) {
  if (design && p.collection_slug !== design) return false;
  if (availability === "upcoming") return p.section === "upcoming";
  if (availability === "in-stock") return p.section === "available" && !p.sold_out;
  if (availability === "sold-out") return p.section === "available" && p.sold_out;
  return true;
}
