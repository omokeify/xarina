"use client";

// UTM capture: save the campaign on the first tagged visit so it can be copied
// onto waitlist entries and orders by server actions (PRD: "UTM capture").

import { useEffect } from "react";
import { UTM_COOKIE, UTM_COOKIE_MAX_AGE_SECONDS } from "@/lib/attribution/constants";
import { captureFromVisit, cookieValue, encodeAttribution } from "@/lib/attribution/utm";

export function UtmCapture() {
  useEffect(() => {
    const found = captureFromVisit(window.location.search, cookieValue(document.cookie, UTM_COOKIE));
    if (!found) return;

    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${UTM_COOKIE}=${encodeURIComponent(encodeAttribution(found))}; Max-Age=${UTM_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  }, []);

  return null;
}
