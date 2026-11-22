"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const THEME_KEY = "xarina-theme";
const THEME_EVENT = "xarina-theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}
const isDark = () => document.documentElement.dataset.theme === "dark";

/**
 * Light/dark switch, remembered per visitor in localStorage. Dark uses the
 * Noir & Champagne palette from the design system (no extra colours).
 * The no-flash script in app/layout.tsx applies the saved choice before paint.
 */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = !isDark();
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // Private mode: the choice just lasts for this visit.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  const Icon = dark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label="Dark mode"
      title="Dark mode"
      className="text-ink-muted hover:text-ink inline-flex size-11 items-center justify-center"
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
