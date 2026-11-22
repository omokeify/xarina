"use client";

import { Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Header search. The icon expands in place into a field: inline on desktop,
 * a full-width bar over the header on mobile. Esc or the close button collapses
 * it and returns focus to the icon. Submits a plain GET to /search?q=, so it
 * still works if JavaScript hasn't loaded.
 */
export function SearchControl() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Collapse after navigating (including after a search).
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!formRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <form
      ref={formRef}
      role="search"
      action="/search"
      onKeyDown={(e) => e.key === "Escape" && open && close()}
      className={cn(
        "flex items-center motion-reduce:transition-none md:overflow-hidden md:transition-[width] md:duration-200",
        open
          ? "max-md:gap-space-2 max-md:border-line max-md:bg-surface max-md:px-space-3 max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-50 max-md:h-[76px] max-md:border-b md:w-80"
          : "md:w-11",
      )}
    >
      <label htmlFor="header-search" className="sr-only">
        Search the shop
      </label>
      <input
        ref={inputRef}
        id="header-search"
        name="q"
        type="search"
        maxLength={80}
        placeholder="Search for products"
        autoComplete="off"
        tabIndex={open ? 0 : -1}
        className={cn(
          "border-line bg-surface-raised text-body text-ink placeholder:text-ink-muted h-11 min-w-0 rounded-xs border",
          open ? "px-space-3 visible flex-1" : "invisible w-0 border-0 p-0",
        )}
      />
      <button
        ref={buttonRef}
        type="submit"
        aria-label={open ? "Submit search" : "Search"}
        aria-expanded={open}
        onClick={(e) => {
          if (!open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="text-ink-muted hover:text-ink inline-flex size-11 shrink-0 items-center justify-center"
      >
        <Search aria-hidden="true" className="size-5" />
      </button>
      {open && (
        <button
          type="button"
          aria-label="Close search"
          onClick={close}
          className="text-ink-muted hover:text-ink inline-flex size-11 shrink-0 items-center justify-center"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      )}
    </form>
  );
}
