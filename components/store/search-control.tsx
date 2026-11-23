"use client";

import { Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Header search.
 * Shows a delicate magnifying glass icon button.
 * When clicked, renders an edge-to-edge luxury overlay across the top of the viewport
 * via createPortal, completely preventing overlap or horizontal clipping on mobile, tablet, and desktop.
 */
export function SearchControl() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  // Collapse after navigating (including after a search).
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!formRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  const overlay =
    open && mounted
      ? createPortal(
          <div className="fixed inset-x-0 top-0 z-[60] bg-surface border-b border-line px-4 sm:px-6 md:px-8 h-16 sm:h-[72px] flex items-center shadow-md animate-in fade-in duration-150">
            <form
              ref={formRef}
              role="search"
              action="/search"
              onKeyDown={(e) => e.key === "Escape" && close()}
              className="w-full max-w-4xl mx-auto flex items-center gap-2.5 sm:gap-4"
            >
              <label htmlFor="header-search" className="sr-only">
                Search designs or drops
              </label>
              <Search aria-hidden="true" className="size-4 sm:size-5 text-accent shrink-0" />
              <input
                ref={inputRef}
                id="header-search"
                name="q"
                type="search"
                maxLength={80}
                placeholder="Search designs, collections, drops, fabrics..."
                autoComplete="off"
                className="w-full bg-transparent text-body-s sm:text-body text-ink placeholder:text-ink-muted/70 focus:outline-hidden py-2"
              />
              <button
                type="submit"
                className="bg-accent hover:bg-accent/90 text-[#121110] label text-[10.5px] sm:text-[11.5px] tracking-[0.2em] font-semibold py-2 px-3.5 sm:px-5 shrink-0 transition-colors cursor-pointer"
              >
                SEARCH
              </button>
              <button
                type="button"
                aria-label="Close search"
                onClick={close}
                className="text-ink-muted hover:text-ink inline-flex size-9 sm:size-10 shrink-0 items-center justify-center transition-colors cursor-pointer"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </form>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Search"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="text-ink hover:text-accent inline-flex size-9 sm:size-10 shrink-0 items-center justify-center transition-colors cursor-pointer"
      >
        <Search aria-hidden="true" className="size-4 sm:size-[18px]" />
      </button>

      {overlay}
    </>
  );
}
