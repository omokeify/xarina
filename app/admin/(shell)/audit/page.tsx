import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";
import { actionLabel, changeLines } from "@/lib/admin/audit";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

// ADM-7: who changed prices, stock, drops and staff, newest first.
const FILTERS = [
  { value: undefined, label: "All" },
  { value: "product", label: "Products" },
  { value: "variant", label: "Stock" },
  { value: "drop", label: "Drops" },
  { value: "customer", label: "Privé" },
  { value: "customers", label: "Exports" },
  { value: "staff", label: "Staff" },
] as const;

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireStaff(["owner", "manager"]);
  const { type: raw } = await searchParams;
  const type = FILTERS.find((f) => f.value === raw)?.value;

  const supabase = await createClient();
  const { data: rows, error } = await supabase.rpc("admin_audit_log", { p_entity_type: type, p_limit: 300 });
  if (error) throw error;

  return (
    <div className="flex flex-col gap-space-5">
      <header className="flex flex-col gap-space-2">
        <h1 className="font-display text-display-m">Audit log</h1>
        <p className="text-body-s text-ink-muted">
          Every change to prices, stock, drops, Privé access and staff, and every customer export. Latest 300 shown.
        </p>
      </header>

      <nav aria-label="Filter the audit log" className="flex flex-wrap gap-x-space-4 border-b border-line">
        {FILTERS.map((f) => {
          const active = f.value === type;
          return (
            <Link
              key={f.label}
              href={f.value ? `/admin/audit?type=${f.value}` : "/admin/audit"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "label -mb-px inline-flex min-h-11 items-center border-b-2 border-transparent",
                active ? "border-ink text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="text-body-s text-ink-muted">Nothing recorded yet.</p>
      ) : (
        <ol className="flex flex-col">
          {rows.map((r) => {
            const lines = changeLines(r.before as never, r.after as never);
            return (
              <li key={r.id} className="grid gap-space-1 border-b border-line py-space-3 md:grid-cols-[140px_1fr_2fr] md:gap-space-4">
                <time dateTime={r.at} className="text-body-s text-ink-muted">
                  {when.format(new Date(r.at))}
                </time>
                <div className="flex flex-col">
                  <span className="text-body-s">{actionLabel(r.action)}</span>
                  <span className="text-caption text-ink-muted">{r.staff_name ?? "System"}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-space-1">
                  {r.entity_label && <span className="text-body-s">{r.entity_label}</span>}
                  {lines.length > 0 && (
                    <ul className="text-caption text-ink-muted">
                      {lines.map((l) => (
                        <li key={l} className="break-words">
                          {l}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
