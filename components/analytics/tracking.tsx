"use client";

// Storefront analytics: page views and checkout started. Purchase is reported
// from the paid webhook only (rule 10), never from the browser redirect.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics, track } from "@/lib/analytics/client";
import { EVENTS } from "@/lib/analytics/events";

export function Tracking({ posthogKey, posthogHost }: { posthogKey?: string; posthogHost?: string }) {
  const pathname = usePathname();
  const checkoutSeen = useRef(false);

  useEffect(() => {
    initAnalytics(posthogKey, posthogHost);
  }, [posthogKey, posthogHost]);

  useEffect(() => {
    if (!pathname) return;
    track(EVENTS.pageView, { path: pathname });
    if (pathname === "/checkout" && !checkoutSeen.current) {
      checkoutSeen.current = true;
      track(EVENTS.beginCheckout);
    }
  }, [pathname]);

  return null;
}
