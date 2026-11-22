"use client";

// Browser-side PostHog. Everything is a no-op until a project key is configured,
// so local development and tests never send events or need network access.

import posthog from "posthog-js";
import type { AnalyticsEvent } from "./events";

let ready = false;

export function initAnalytics(key: string | undefined, host: string | undefined): void {
  if (!key || ready || typeof window === "undefined") return;
  posthog.init(key, {
    api_host: host || "https://us.i.posthog.com",
    capture_pageview: false, // sent explicitly on navigation by TrackingProvider
    capture_pageleave: false,
  });
  ready = true;
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (!ready) return;
  posthog.capture(event, properties);
}

/**
 * Tie the anonymous storefront session to the email used at checkout. The
 * server reports Purchase with the same distinct ID (the verified order's
 * email), so without this the funnel would show no purchases.
 */
export function identify(email: string): void {
  if (!ready || !email) return;
  posthog.identify(email);
}
