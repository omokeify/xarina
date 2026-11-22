import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { adminDropList, priveMemberList } from "@/lib/drops/admin";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";
import { setPriveMembership } from "../actions";
import { AccessLinkForm, BulkApproveForm } from "./prive-admin-forms";

export const metadata: Metadata = { title: "Privé members" };

const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export default async function PriveMembersPage() {
  await requireStaff(["owner", "manager"]);
  const supabase = await createClient();
  const [members, drops] = await Promise.all([
    supabase.rpc("admin_prive_members"),
    supabase.rpc("admin_drops"),
  ]);
  if (members.error) throw members.error;
  if (drops.error) throw drops.error;

  const all = priveMemberList.parse(members.data);
  const requests = all.filter((m) => !m.is_vip);
  const approved = all.filter((m) => m.is_vip);
  const openDrops = adminDropList
    .parse(drops.data)
    .filter((d) => d.state !== "closed")
    .map(({ id, name }) => ({ id, name }));

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="flex flex-col gap-1">
        <Link href="/admin/drops" className="label text-ink-muted hover:text-ink inline-flex items-center gap-1.5 mb-1">
          ← Back to Drops
        </Link>
        <p className="label text-accent">VIP Client Services</p>
        <h1 className="font-display text-display-m text-ink">Privé Member Roster</h1>
        <p className="text-body-s text-ink-muted">
          Approved members access drop allocations during the early Privé window via verified magic link or private access token.
        </p>
      </header>

      <section className="border border-line bg-surface-raised p-6 sm:p-8 flex flex-col gap-4">
        <div className="border-b border-line pb-3">
          <h2 className="font-display text-title text-ink">
            Bulk Member Approval
          </h2>
          <p className="text-body-s text-ink-muted">
            Paste member emails to approve them in one action.
          </p>
        </div>
        <BulkApproveForm />
      </section>

      <section aria-labelledby="requests" className="border border-line bg-surface-raised p-6 sm:p-8 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 id="requests" className="font-display text-title text-ink">
            Pending Membership Requests
          </h2>
          <span className="label bg-surface-sunk text-ink px-2 py-0.5 border border-line">
            {requests.length} Pending
          </span>
        </div>
        {requests.length === 0 ? (
          <p className="text-body-s text-ink-muted py-4">No pending membership requests.</p>
        ) : (
          <ul className="divide-line divide-y border-y border-line">
            {requests.map((m) => (
              <li key={m.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                <span className="flex flex-col">
                  <span className="text-body font-medium text-ink">{m.name ?? m.email}</span>
                  <span className="text-caption text-ink-muted">
                    {m.name ? `${m.email} · ` : ""}
                    {m.requested_at ? `Requested ${day.format(new Date(m.requested_at))}` : ""}
                  </span>
                </span>
                <form action={setPriveMembership.bind(null, m.id, true)}>
                  <Button type="submit" size="sm" className="h-9 px-4">
                    Approve Member
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="members" className="border border-line bg-surface-raised p-6 sm:p-8 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 id="members" className="font-display text-title text-ink">
            Approved Privé Members
          </h2>
          <span className="label bg-surface-sunk text-ink px-2 py-0.5 border border-line">
            {approved.length} Active
          </span>
        </div>
        {approved.length === 0 ? (
          <p className="text-body-s text-ink-muted py-4">No approved members yet.</p>
        ) : (
          <ul className="divide-line divide-y border-y border-line">
            {approved.map((m) => (
              <li key={m.id} className="py-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex flex-col">
                    <span className="text-body font-medium text-ink">{m.name ?? m.email}</span>
                    <span className="text-caption text-ink-muted">
                      {m.name ? `${m.email} · ` : ""}
                      {m.vip_approved_at ? `Approved ${day.format(new Date(m.vip_approved_at))}` : ""}
                      {m.drop_alert_consent ? " · Drop alerts active" : ""}
                    </span>
                  </span>
                  <form action={setPriveMembership.bind(null, m.id, false)}>
                    <Button type="submit" size="sm" variant="ghost" className="text-critical">
                      Revoke
                    </Button>
                  </form>
                </div>
                <div className="bg-surface p-3 border border-line">
                  <AccessLinkForm customerId={m.id} drops={openDrops} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
