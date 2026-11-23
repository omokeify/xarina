import { NextResponse } from "next/server";
import { getStorefrontProducts } from "@/lib/catalogue";
import { matchesQuery, normaliseQuery } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const query = q.slice(0, 80);
    if (!normaliseQuery(query)) {
      return NextResponse.json({ results: [], query });
    }

    const allProducts = await getStorefrontProducts();
    const filtered = allProducts.filter((p) => matchesQuery(p, query));

    const results = filtered.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      collection_name: p.collection_name,
      drop_name: p.drop_name,
      cover_path: p.cover_path,
      cover_alt: p.cover_alt,
      prices: p.prices,
      drop_state: p.drop_state,
      sold_out: p.sold_out,
      section: p.section,
    }));

    return NextResponse.json({ results, query });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ results: [], query: "", error: "Failed to search" }, { status: 500 });
  }
}
