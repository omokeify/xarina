"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNav({
  sections,
  onNavigate,
}: {
  sections: { href: string; label: string }[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin navigation" className="w-full">
      <ul className="flex flex-col gap-1">
        {sections.map(({ href, label }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "label py-3 px-3.5 border-l-2 flex items-center justify-between transition-colors",
                  active
                    ? "border-accent bg-surface-sunk/60 text-ink"
                    : "border-transparent text-ink-muted hover:text-ink hover:bg-surface-sunk/30",
                )}
              >
                <span>{label}</span>
                {active && <span className="size-1.5 rounded-full bg-accent" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
