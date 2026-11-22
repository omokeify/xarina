"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GripVertical, LogOut, Menu, X } from "lucide-react";
import { Lockup } from "@/components/brand/logo";
import type { StaffRole } from "@/lib/staff/roles";
import { AdminNav } from "./admin-nav";

const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 480;
const DEFAULT_SIDEBAR_WIDTH = 280;
const STORAGE_KEY = "xarina_admin_sidebar_width";

export function AdminSidebarShell({
  staff,
  sections,
  signOutAction,
  children,
}: {
  staff: { name: string | null; email: string; role: StaffRole };
  sections: { href: string; label: string }[];
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDraggingRef = useRef(false);

  // Restore saved width from localStorage safely on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = Number(saved);
        if (!Number.isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
          setSidebarWidth(parsed);
        }
      }
    } catch {
      // Ignore localStorage read failures in sandboxed environments
    }
  }, []);

  // Close mobile drawer when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Drag-to-resize handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, ev.clientX));
      setSidebarWidth(newWidth);
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      const finalWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, ev.clientX));
      try {
        localStorage.setItem(STORAGE_KEY, String(finalWidth));
      } catch {
        // Ignore storage write issues
      }

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-space-4">
      <div className="flex flex-col gap-space-4">
        {/* Logo & Console Branding */}
        <div className="flex items-center justify-between border-b border-line pb-space-3">
          <div className="flex flex-col gap-space-1">
            <Link
              href="/admin"
              onClick={closeMobile}
              aria-label="Xarina admin home"
              className="text-ink hover:opacity-90 inline-block"
            >
              <Lockup size="sm" />
            </Link>
            <span className="label text-accent">
              Operations Console
            </span>
          </div>
          {/* Close button for mobile drawer */}
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close navigation drawer"
            className="md:hidden p-1.5 text-ink-muted hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Active Staff Session Card */}
        <div className="p-space-3 bg-surface-raised border border-line flex flex-col gap-space-1">
          <div className="flex items-center justify-between">
            <span className="label text-ink-muted">Staff Session</span>
            <span className="label text-accent border border-accent/40 px-2 py-0.5">
              {staff.role}
            </span>
          </div>
          <p className="text-body-s font-medium text-ink truncate">{staff.name ?? staff.email}</p>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex flex-col gap-space-2">
          <p className="label text-ink-muted px-3">Menu</p>
          <AdminNav sections={sections} onNavigate={closeMobile} />
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-space-5 pt-space-4 border-t border-line flex flex-col gap-space-2">
        <Link
          href="/"
          onClick={closeMobile}
          className="label text-accent hover:text-ink inline-flex items-center gap-space-2 px-1"
        >
          <ArrowLeft className="size-4" />
          <span>Return to Storefront</span>
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            className="label text-ink-muted hover:text-ink inline-flex items-center gap-space-2 px-1 cursor-pointer w-full"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col md:flex-row relative">
      {/* 1. Mobile Top Bar with Hamburger (Shown only on small screens < md) */}
      <header className="md:hidden bg-surface-raised text-ink border-b border-line px-space-3 h-14 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-space-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 -ml-2 text-ink hover:opacity-80 flex items-center justify-center focus:outline-none"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/admin" aria-label="Xarina admin home" className="text-ink">
            <Lockup size="sm" />
          </Link>
          <span className="label text-accent hidden sm:inline">
            Console
          </span>
        </div>

        <div className="flex items-center gap-space-2">
          <span className="label text-accent border border-accent/40 px-2 py-0.5">
            {staff.role}
          </span>
        </div>
      </header>

      {/* 2. Mobile Drawer Backdrop Overlay */}
      {mobileOpen && (
        <div
          role="presentation"
          onClick={closeMobile}
          className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 md:hidden"
        />
      )}

      {/* 3. Mobile Slide-out Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-surface text-ink z-50 md:hidden border-r border-line shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>

      {/* 4. Desktop Draggable / Adjustable Sidebar (>= md) */}
      <aside
        style={{ width: `${sidebarWidth}px` }}
        className={`hidden md:flex flex-col shrink-0 bg-surface-raised text-ink border-r border-line sticky top-0 h-screen overflow-y-auto relative z-30 select-none ${
          isDragging ? "transition-none" : "transition-[width] duration-75"
        }`}
      >
        {sidebarContent}

        {/* Drag handle on right edge */}
        <div
          onPointerDown={handlePointerDown}
          title="Drag to adjust sidebar width"
          className={`absolute top-0 right-0 w-2.5 h-full cursor-col-resize select-none flex items-center justify-center z-40 group transition-colors ${
            isDragging ? "bg-accent/30" : "hover:bg-accent/15"
          }`}
        >
          <div
            className={`w-[1px] h-10 transition-colors ${
              isDragging ? "bg-accent" : "bg-line group-hover:bg-accent"
            }`}
          />
        </div>
      </aside>

      {/* 5. Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Role Permissions Summary Ribbon */}
        <header className="bg-surface-sunk border-b border-line px-space-4 sm:px-space-5 py-space-2 text-caption text-ink-muted">
          <div className="max-w-[1500px] flex flex-wrap items-center justify-between gap-space-2">
            <span>
              Signed in as <strong className="text-ink">{staff.name ?? staff.email}</strong> · Role:{" "}
              <strong className="label text-ink">{staff.role}</strong>
            </span>
            <span className="hidden lg:inline text-caption text-ink-muted">
              {staff.role === "owner" && "Full permissions: pricing, drops, staff, exports & reports."}
              {staff.role === "manager" && "Products, drops, stock, Privé approvals, orders & exports."}
              {staff.role === "merchandiser" && "Edit product copy, upload/reorder media & draft content (prices & publish locked)."}
              {staff.role === "fulfilment" && "View paid orders, update dispatch statuses & enter tracking."}
              {staff.role === "support" && "View customers & orders, add client notes (exports restricted)."}
            </span>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 max-w-[1500px] w-full p-space-4 sm:p-space-5 lg:p-space-6">
          {children}
        </main>
      </div>
    </div>
  );
}
