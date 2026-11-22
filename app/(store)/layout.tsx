import Script from "next/script";
import { Tracking } from "@/components/analytics/tracking";
import { CurrencyProvider } from "@/lib/currency/context";
import { getInitialCurrency } from "@/lib/currency/server";
import { getSiteSettings } from "@/lib/site-settings";
import { AnnouncementBar, SiteFooter, SiteHeader } from "@/components/store/site-chrome";
import { UtmCapture } from "@/components/attribution/utm-capture";

// Meta's standard loader. PageView comes from the browser; Purchase comes only
// from the verified webhook via Conversions API, with the order ID as event_id.
function metaPixelScript(pixelId: string): string {
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [currency, settings] = await Promise.all([getInitialCurrency(), getSiteSettings()]);
  const pixelId = process.env.META_PIXEL_ID;
  const validPixelId = pixelId && /^\d+$/.test(pixelId) ? pixelId : null;
  return (
    <CurrencyProvider initial={currency}>
      <UtmCapture />
      <Tracking posthogKey={process.env.POSTHOG_PROJECT_KEY} posthogHost={process.env.POSTHOG_HOST} />
      {validPixelId && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: metaPixelScript(validPixelId) }}
        />
      )}
      <a
        href="#main"
        className="label focus:bg-surface focus:p-space-3 sr-only focus:not-sr-only focus:absolute focus:z-50"
      >
        Skip to content
      </a>
      <AnnouncementBar settings={settings.announcement_bar} />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter whatsapp={settings.whatsapp} />
    </CurrencyProvider>
  );
}
