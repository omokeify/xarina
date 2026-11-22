import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";
import { actionLabel, changeLines } from "@/lib/admin/audit";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

// ADM-7: who changed prices, stock, drops and staff, newest first.
const FILTERS = [
  { value: undefined, label: "All Activity" },
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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="label text-accent">
          Governance &amp; Immutable Audit Trail
        </p>
        <h1 className="font-display text-display-m">Audit &amp; Activity Log</h1>
        <p className="text-body-s text-ink-muted">
          Tamper-evident record of all price modifications, stock reservations, drop states, Privé approvals, and CSV exports.
        </p>
      </header>

      <nav aria-label="Filter the audit log" className="flex flex-wrap gap-x-6 border-b border-line">
        {FILTERS.map((f) => {
          const active = f.value === type;
          return (
            <Link
              key={f.label}
              href={f.value ? `/admin/audit?type=${f.value}` : "/admin/audit"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "py-3 border-b-2 label transition-colors",
                active ? "border-ink text-ink font-semibold" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <div className="border border-line bg-surface-raised p-12 text-center">
          <p className="text-body-s text-ink-muted">No audit activity recorded yet.</p>
        </div>
      ) : (
        <div className="border border-line bg-surface-raised overflow-hidden">
          <ol className="divide-y divide-line">
            {rows.map((r) => {
              const lines = changeLines(r.before as never, r.after as never);
              return (
                <li key={r.id} className="grid grid-cols-1 md:grid-cols-[160px_1fr_2fr] gap-3 md:gap-6 px-6 py-4 hover:bg-surface-sunk/30 transition-colors items-start">
                  <time dateTime={r.at} className="text-body-s text-ink-muted font-medium tabular-nums">
                    {when.format(new Date(r.at))}
                  </time>
                  <div className="flex flex-col">
                    <span className="text-body-s font-medium text-ink">{actionLabel(r.action)}</span>
                    <span className="text-caption text-ink-muted">Initiated by {r.staff_name ?? "System Operator"}</span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    {r.entity_label && <span className="text-body-s font-normal text-ink">{r.entity_label}</span>}
                    {lines.length > 0 && (
                      <ul className="text-caption text-ink-muted space-y-0.5 mt-1 bg-surface-sunk/40 p-2.5 border border-line/40">
                        {lines.map((l) => (
                          <li key={l} className="break-words text-caption">
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
        </div>
      )}
    </div>
  );
}
