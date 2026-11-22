import { getInitialCurrency } from "@/lib/currency/server";
import { CurrencyProvider } from "@/lib/currency/context";
import { getServerNow, getStorefrontProducts } from "@/lib/catalogue";
import { getFeaturedDrop } from "@/lib/featured-drop";
import { getSiteSettings } from "@/lib/site-settings";
import { isPriveMember } from "@/lib/prive/session";
import { ConceptHomepageView } from "./concept-view";

export const dynamic = "force-dynamic";

export default async function ConceptHomePage() {
  const [currency, settings, products, serverNow, prive] = await Promise.all([
    getInitialCurrency(),
    getSiteSettings(),
    getStorefrontProducts(),
    getServerNow(),
    isPriveMember(),
  ]);

  const drop = await getFeaturedDrop(settings.hero.featured_drop_id, products);
  const availableNow = products.filter((p) => p.section === "available");

  return (
    <CurrencyProvider initial={currency}>
      <ConceptHomepageView
        initialDrop={drop}
        heroSettings={settings.hero}
        availableProducts={availableNow}
        serverNow={serverNow}
        isPrive={prive}
      />
    </CurrencyProvider>
  );
}
