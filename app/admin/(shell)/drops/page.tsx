import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { adminDropList, STATE_LABEL } from "@/lib/drops/admin";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Drops" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export default async function DropsPage() {
  const staff = await requireStaff(["owner", "manager", "merchandiser"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_drops");
  if (error) throw error;
  const drops = adminDropList.parse(data);
  const canManagePrive = staff.role === "owner" || staff.role === "manager";

  return (
    <div className="gap-space-5 flex flex-col">
      <header className="gap-space-3 flex flex-wrap items-end justify-between">
        <div className="gap-space-2 flex flex-col">
          <h1 className="font-display text-display-m">Drops</h1>
          <p className="text-body-s text-ink-muted">
            Times are shown in UTC. Interest is waitlist sign-ups, not orders or sales.
          </p>
        </div>
        <div className="gap-space-3 flex">
          {canManagePrive && (
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin/drops/prive">Privé members</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href="/admin/drops/new">New drop</Link>
          </Button>
        </div>
      </header>

      {drops.length === 0 ? (
        <p className="py-space-5 text-body-s text-ink-muted">No drops yet.</p>
      ) : (
        <ul className="divide-line border-line divide-y border-y">
          {drops.map((d) => (
            <li key={d.id}>
              <Link
                href={`/admin/drops/${d.id}`}
                className="gap-space-1 py-space-3 hover:bg-surface-sunk md:px-space-3 grid md:grid-cols-[1fr_auto] md:items-center"
              >
                <span className="gap-space-1 flex flex-col">
                  <span className="font-display text-title">{d.name}</span>
                  <span className="text-body-s text-ink-muted">
                    Privé {when.format(new Date(d.vip_opens_at))} · Public{" "}
                    {when.format(new Date(d.public_opens_at))}
                    {d.closes_at ? ` · Closes ${when.format(new Date(d.closes_at))}` : ""}
                  </span>
                  <span className="text-caption text-ink-muted">/drops/{d.slug}</span>
                </span>
                <span className="label text-ink-muted">
                  {d.published ? STATE_LABEL[d.state] : "Draft"} · {d.product_count} designs ·{" "}
                  {d.interest_count} interest
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
