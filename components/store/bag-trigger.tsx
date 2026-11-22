"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BAG_OPEN_EVENT, DRAWER_OPENED_EVENT } from "@/lib/checkout/events";
import { BagDrawer } from "./bag-drawer";

/**
 * Header bag icon. It is a real link to /cart, so it still works without
 * JavaScript; with JavaScript it opens the bag drawer instead. The drawer also
 * opens after a piece is added (see AddToCart).
 */
export function BagTrigger({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    linkRef.current?.focus();
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(BAG_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(BAG_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (open) window.dispatchEvent(new Event(DRAWER_OPENED_EVENT));
  }, [open]);

  return (
    <>
      <Link
        ref={linkRef}
        href="/cart"
        aria-label={count > 0 ? `Bag (${count})` : "Bag"}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className="text-ink-muted hover:text-ink relative inline-flex size-11 items-center justify-center"
      >
        <ShoppingBag aria-hidden="true" className="size-5" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="bg-action text-on-action absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-[10px] leading-none font-semibold"
          >
            {count}
          </span>
        )}
      </Link>
      {open && <BagDrawer onClose={close} />}
    </>
  );
}
