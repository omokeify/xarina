"use client";

import { useSyncExternalStore } from "react";

export type ThemeId = "default" | "mono" | "mono-noir";

const THEME_KEY = "xarina-theme";
const THEME_EVENT = "xarina-theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

function getActiveTheme(): ThemeId {
  if (typeof document === "undefined") return "default";
  const theme = document.documentElement.dataset.theme;
  if (theme === "mono" || theme === "mono-white") return "mono";
  if (theme === "mono-noir" || theme === "noir" || theme === "dark") return "mono-noir";
  return "default";
}

const PALETTES = [
  {
    id: "default" as ThemeId,
    label: "Ivory & Gold (Original)",
    outerBg: "var(--x-preview-ivory-surface)",
    innerDot: "var(--x-preview-ivory-accent)",
    border: "var(--x-preview-ivory-line)",
  },
  {
    id: "mono" as ThemeId,
    label: "White & Black (Monochrome)",
    outerBg: "var(--x-preview-mono-surface)",
    innerDot: "var(--x-preview-mono-accent)",
    border: "var(--x-preview-mono-line)",
  },
  {
    id: "mono-noir" as ThemeId,
    label: "Noir & White (Mono Dark)",
    outerBg: "var(--x-preview-noir-surface)",
    innerDot: "var(--x-preview-noir-accent)",
    border: "var(--x-preview-noir-line)",
  },
];

export function FooterThemeSwatches() {
  const activeTheme = useSyncExternalStore(subscribe, getActiveTheme, () => "default");

  const selectTheme = (id: ThemeId) => {
    if (id === "default") {
      delete document.documentElement.dataset.theme;
      try {
        localStorage.setItem(THEME_KEY, "light");
      } catch {}
    } else {
      document.documentElement.dataset.theme = id;
      try {
        localStorage.setItem(THEME_KEY, id);
      } catch {}
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <div className="flex items-center gap-2.5 select-none" role="radiogroup" aria-label="Brand theme switcher">
      <span className="label text-[9.5px] sm:text-[10px] tracking-[0.2em] uppercase text-ink-muted/80">
        Theme:
      </span>
      <div className="flex items-center gap-2">
        {PALETTES.map((palette) => {
          const isSelected = activeTheme === palette.id;
          return (
            <button
              key={palette.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Select ${palette.label}`}
              title={palette.label}
              onClick={() => selectTheme(palette.id)}
              className={`group relative flex items-center justify-center size-5 rounded-full transition-all cursor-pointer ${
                isSelected
                  ? "ring-1.5 ring-offset-2 ring-accent scale-105"
                  : "hover:scale-110 opacity-70 hover:opacity-100"
              }`}
              style={{
                backgroundColor: palette.outerBg,
                border: `1px solid ${palette.border}`,
              }}
            >
              <span
                className="size-2 rounded-full transition-transform group-hover:scale-125"
                style={{ backgroundColor: palette.innerDot }}
              />
              <span className="sr-only">{palette.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
