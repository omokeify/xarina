import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { adminDropList, STATE_LABEL } from "@/lib/drops/admin";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Drops" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export default async function DropsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const staff = await requireStaff(["owner", "manager", "merchandiser"]);
  const { deleted } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_drops");
  if (error) throw error;
  const drops = adminDropList.parse(data);
  const canManagePrive = staff.role === "owner" || staff.role === "manager";

  return (
    <div className="gap-8 flex flex-col">
      <header className="gap-3 flex flex-wrap items-end justify-between">
        <div className="gap-1 flex flex-col">
          <p className="label text-accent">
            Limited Numbered Releases · Drop Engine
          </p>
          <h1 className="font-display text-display-m">Scheduled Drops</h1>
          <p className="text-body-s text-ink-muted">
            Configure drop timelines, Privé early access windows, and product quotas. Times are in UTC.
          </p>
        </div>
        <div className="gap-3 flex">
          {canManagePrive && (
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin/drops/prive">Privé Members Registry</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href="/admin/drops/new">+ Create New Drop</Link>
          </Button>
        </div>
      </header>

      {deleted && (
        <div role="status" className="bg-surface-sunk border border-line px-4 py-3 text-body-s text-ink">
          Drop schedule record was deleted successfully.
        </div>
      )}

      {drops.length === 0 ? (
        <div className="border border-line bg-surface-raised p-12 text-center">
          <p className="text-body-s text-ink-muted">No drop releases created yet.</p>
        </div>
      ) : (
        <div className="border border-line bg-surface-raised overflow-hidden">
          <ul className="divide-y divide-line">
            {drops.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/admin/drops/${d.id}`}
                  className="px-6 py-4 hover:bg-surface-sunk/30 transition-colors grid md:grid-cols-[1fr_auto] gap-4 items-center"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-display text-title text-ink font-medium">{d.name}</span>
                    <span className="text-body-s text-ink-muted">
                      Privé window: <strong className="text-ink font-normal">{when.format(new Date(d.vip_opens_at))}</strong> · Public release:{" "}
                      <strong className="text-ink font-normal">{when.format(new Date(d.public_opens_at))}</strong>
                      {d.closes_at ? ` · Closes ${when.format(new Date(d.closes_at))}` : ""}
                    </span>
                    <span className="text-caption text-ink-muted">/drops/{d.slug}</span>
                  </div>
                  <div className="text-right flex flex-col md:items-end gap-1">
                    <span
                      className={`inline-flex px-2.5 py-0.5 label border ${
                        d.state === "vip"
                          ? "bg-accent/20 text-accent border-accent/40"
                          : d.state === "public"
                          ? "bg-action text-on-action border-action"
                          : "bg-surface text-ink-muted border-line"
                      }`}
                    >
                      {d.published ? STATE_LABEL[d.state] : "Draft"}
                    </span>
                    <span className="text-caption text-ink-muted tabular-nums">
                      {d.product_count} {d.product_count === 1 ? "design" : "designs"} · {d.interest_count} waitlist interest
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
