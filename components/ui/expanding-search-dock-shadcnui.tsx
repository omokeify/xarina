"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ExpandingSearchDockProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
  onExpandedChange?: (expanded: boolean) => void;
};

export function ExpandingSearchDock({
  value,
  defaultValue = "",
  onChange,
  onSearch,
  placeholder = "Search...",
  className = "",
  isLoading = false,
  children,
  onExpandedChange,
}: ExpandingSearchDockProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [internalQuery, setInternalQuery] = useState(defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = value !== undefined ? value : internalQuery;

  const handleExpand = () => {
    setInternalExpanded(true);
    onExpandedChange?.(true);
  };

  const handleCollapse = () => {
    setInternalExpanded(false);
    onExpandedChange?.(false);
    if (value === undefined) {
      setInternalQuery("");
    }
    onChange?.("");
  };

  const handleClear = () => {
    if (value === undefined) {
      setInternalQuery("");
    }
    onChange?.("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    if (value === undefined) {
      setInternalQuery(nextVal);
    }
    onChange?.(nextVal);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  useEffect(() => {
    if (!internalExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCollapse();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCollapse();
      }
    };
    document.removeEventListener("keydown", onKey);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [internalExpanded]);

  return (
    <div ref={containerRef} className={`relative flex items-center justify-end ${className}`}>
      <AnimatePresence mode="wait">
        {!internalExpanded ? (
          <motion.button
            key="icon"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleExpand}
            aria-label="Open global search"
            className="text-ink-muted hover:text-ink relative inline-flex size-11 items-center justify-center transition-colors cursor-pointer"
          >
            <Search aria-hidden="true" className="size-5" />
          </motion.button>
        ) : (
          <motion.div
            key="dock-wrapper"
            initial={{ width: 44, opacity: 0 }}
            animate={{ width: "min(320px, calc(100vw - 48px))", opacity: 1 }}
            exit={{ width: 44, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-50 origin-right"
          >
            <form onSubmit={handleSubmit} role="search" className="relative">
              <div className="relative flex items-center gap-2 overflow-hidden rounded-full border border-line bg-surface text-ink shadow-md h-9 sm:h-10">
                <div className="ml-3 sm:ml-3.5 flex items-center justify-center shrink-0">
                  {isLoading ? (
                    <Loader2 className="size-3.5 sm:size-4 animate-spin text-accent" />
                  ) : (
                    <Search className="size-3.5 sm:size-4 text-ink-muted" />
                  )}
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  placeholder={placeholder}
                  autoFocus
                  className="h-full flex-1 bg-transparent pr-2 text-xs sm:text-sm text-ink outline-hidden placeholder:text-ink-muted/70"
                />
                <button
                  type="button"
                  onClick={handleCollapse}
                  aria-label="Close search"
                  className="mr-1 sm:mr-1.5 flex size-7 items-center justify-center rounded-full hover:bg-surface-sunk/60 text-ink-muted hover:text-ink cursor-pointer transition-colors shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>
            </form>

            {/* Auto-discover dropdown / children container */}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
