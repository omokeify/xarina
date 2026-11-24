"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Sparkles, X, ChevronUp } from "lucide-react";

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

const THEMES = [
  {
    id: "default" as ThemeId,
    name: "Ivory & Ink",
    badge: "ORIGINAL",
    surfaceColor: "var(--x-preview-ivory-surface)",
    accentColor: "var(--x-preview-ivory-accent)",
    textColor: "var(--x-preview-ivory-text)",
    description: "Signature warm atelier ivory with champagne gold accents",
  },
  {
    id: "mono" as ThemeId,
    name: "White & Black",
    badge: "REQUESTED",
    surfaceColor: "var(--x-preview-mono-surface)",
    accentColor: "var(--x-preview-mono-accent)",
    textColor: "var(--x-preview-mono-text)",
    description: "Stark minimalist haute couture in pure white and jet black",
  },
  {
    id: "mono-noir" as ThemeId,
    name: "Noir & White",
    badge: "MONO DARK",
    surfaceColor: "var(--x-preview-noir-surface)",
    accentColor: "var(--x-preview-noir-accent)",
    textColor: "var(--x-preview-noir-text)",
    description: "High-contrast editorial in pitch black and crisp white",
  },
];

export function ThemePreviewSwitch() {
  const activeTheme = useSyncExternalStore(subscribe, getActiveTheme, () => "default");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const applyTheme = (themeId: ThemeId) => {
    if (themeId === "default") {
      delete document.documentElement.dataset.theme;
      try {
        localStorage.setItem(THEME_KEY, "light");
      } catch {}
    } else {
      document.documentElement.dataset.theme = themeId;
      try {
        localStorage.setItem(THEME_KEY, themeId);
      } catch {}
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const currentConfig = THEMES.find((t) => t.id === activeTheme) ?? THEMES[0];

  return (
    <aside
      ref={containerRef}
      aria-label="Brand aesthetic preview switcher"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 select-none font-sans"
    >
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="group flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-line bg-surface/90 text-ink backdrop-blur-md shadow-lg hover:shadow-xl transition-all cursor-pointer hover:border-accent"
      >
        <span
          className="size-3.5 rounded-full border border-line/80 shadow-2xs shrink-0 transition-transform group-hover:scale-110"
          style={{
            backgroundColor: currentConfig.surfaceColor,
            outline: `2px solid ${currentConfig.accentColor}`,
            outlineOffset: "1px",
          }}
        />
        <div className="flex items-center gap-1.5 text-left">
          <span className="label text-[9px] sm:text-[10px] tracking-[0.2em] uppercase font-semibold text-accent">
            AESTHETIC:
          </span>
          <span className="font-display italic text-[14px] sm:text-[15px] text-ink font-medium leading-none">
            {currentConfig.name}
          </span>
        </div>
        <ChevronUp
          className={`size-3.5 text-ink-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded Aesthetic Selector Panel */}
      {isOpen && (
        <div className="absolute bottom-[calc(100%+10px)] right-0 w-[min(340px,calc(100vw-32px))] bg-surface border border-line rounded-lg shadow-2xl p-4 text-ink backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-accent" />
              <p className="label text-[10px] tracking-[0.22em] uppercase text-ink font-semibold">
                Brand Palette Preview
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close palette selector"
              className="text-ink-muted hover:text-ink cursor-pointer transition-colors p-1"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="py-2 space-y-2">
            {THEMES.map((theme) => {
              const isSelected = activeTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    applyTheme(theme.id);
                  }}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xs border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-accent bg-surface-sunk/60 shadow-xs"
                      : "border-line/40 hover:border-line hover:bg-surface-sunk/30"
                  }`}
                >
                  <div
                    className="size-7 rounded-xs border border-line shrink-0 flex items-center justify-center mt-0.5 shadow-2xs"
                    style={{ backgroundColor: theme.surfaceColor }}
                  >
                    <div
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display italic text-[16px] text-ink leading-tight">
                        {theme.name}
                      </span>
                      <span
                        className={`label text-[8px] tracking-[0.18em] uppercase px-1.5 py-0.5 rounded-2xs font-semibold ${
                          isSelected
                            ? "bg-accent text-on-action"
                            : "bg-surface-sunk text-ink-muted border border-line/50"
                        }`}
                      >
                        {theme.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-muted leading-tight mt-1">
                      {theme.description}
                    </p>
                  </div>
                  {isSelected && <Check className="size-4 text-accent shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>

          <div className="pt-2.5 mt-1 border-t border-line/60 flex items-center justify-between">
            <span className="text-[10px] text-ink-muted">
              Live preview · 0 permanent code changes
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
