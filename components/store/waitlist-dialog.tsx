"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Window event that opens the PDP waitlist dialog (fired by WaitlistTrigger). */
const OPEN_EVENT = "xarina:open-waitlist";
const HASH = "#waitlist";

/**
 * PDP waitlist as a modal card (concept's WaitlistModal). Native <dialog>, so
 * focus is trapped and Esc closes it. Opens from any WaitlistTrigger, and on
 * arrival when the URL ends in #waitlist (links from cards and the homepage).
 * The form inside (76's WaitlistForm) brings its own product strip and success
 * state; the dialog only adds the frame, backdrop and close button.
 */
export function WaitlistDialog({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => {
    const d = ref.current;
    if (!d || d.open) return;
    d.showModal();
    // Start in the first field rather than on the close button.
    d.querySelector<HTMLInputElement>("input:not([type=hidden])")?.focus();
  }, []);

  useEffect(() => {
    if (window.location.hash === HASH) open();
    const onHash = () => window.location.hash === HASH && open();
    window.addEventListener(OPEN_EVENT, open);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener(OPEN_EVENT, open);
      window.removeEventListener("hashchange", onHash);
    };
  }, [open]);

  function onClose() {
    // Drop the hash so a reload doesn't reopen the dialog.
    if (window.location.hash === HASH)
      history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  return (
    <dialog
      ref={ref}
      id="waitlist"
      aria-label={label}
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself: close.
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="bg-surface text-ink backdrop:bg-ink/60 m-auto w-[calc(100%-var(--spacing-space-5))] max-w-lg p-0"
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="text-ink-muted hover:text-ink right-space-1 top-space-1 absolute z-10 inline-flex size-11 items-center justify-center"
        >
          <X aria-hidden className="size-5" />
        </button>
        {children}
      </div>
    </dialog>
  );
}

/** Button that opens the waitlist dialog. A plain #waitlist link underneath, for no-JS. */
export function WaitlistTrigger({ children, ...props }: Omit<ButtonProps, "asChild" | "onClick">) {
  return (
    <Button asChild {...props}>
      <a
        href={HASH}
        onClick={(e) => {
          e.preventDefault();
          window.dispatchEvent(new Event(OPEN_EVENT));
        }}
      >
        {children}
      </a>
    </Button>
  );
}
