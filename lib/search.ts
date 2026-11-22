// Storefront search: matches the shopper's words against product and
// collection names. Pure, so it can be unit-tested.

type Searchable = { name: string; collection_name: string | null };

/** Lowercase, strip accents and punctuation, collapse spaces. */
export function normaliseQuery(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 80);
}

/** True when every word of the query appears in the product or collection name. */
export function matchesQuery(product: Searchable, query: string): boolean {
  const words = normaliseQuery(query).split(" ").filter(Boolean);
  if (words.length === 0) return false;
  const haystack = normaliseQuery(`${product.name} ${product.collection_name ?? ""}`);
  return words.every((w) => haystack.includes(w));
}
