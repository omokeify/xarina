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
    <div className="gap-space-6 flex flex-col">
      <header className="gap-space-2 flex flex-col">
        <Link href="/admin/drops" className="label text-ink-muted hover:text-ink">
          Drops
        </Link>
        <h1 className="font-display text-display-m">Privé members</h1>
        <p className="text-body-s text-ink-muted">
          Approved members can shop during a drop&apos;s Privé window. Access is by verified email or a
          personal single-use link, never a shared password.
        </p>
      </header>

      <BulkApproveForm />

      <section aria-labelledby="requests" className="gap-space-3 flex flex-col">
        <h2 id="requests" className="font-display text-title">
          Requests ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <p className="text-body-s text-ink-muted">No pending requests.</p>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {requests.map((m) => (
              <li key={m.id} className="gap-space-3 py-space-3 flex flex-wrap items-center justify-between">
                <span className="flex flex-col">
                  <span className="text-body">{m.name ?? m.email}</span>
                  <span className="text-body-s text-ink-muted">
                    {m.name ? `${m.email} · ` : ""}
                    {m.requested_at ? `Requested ${day.format(new Date(m.requested_at))}` : ""}
                  </span>
                </span>
                <form action={setPriveMembership.bind(null, m.id, true)}>
                  <Button type="submit" size="sm">
                    Approve
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="members" className="gap-space-3 flex flex-col">
        <h2 id="members" className="font-display text-title">
          Members ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="text-body-s text-ink-muted">No members yet.</p>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {approved.map((m) => (
              <li key={m.id} className="gap-space-3 py-space-3 grid">
                <div className="gap-space-3 flex flex-wrap items-center justify-between">
                  <span className="flex flex-col">
                    <span className="text-body">{m.name ?? m.email}</span>
                    <span className="text-body-s text-ink-muted">
                      {m.name ? `${m.email} · ` : ""}
                      {m.vip_approved_at ? `Approved ${day.format(new Date(m.vip_approved_at))}` : ""}
                      {m.drop_alert_consent ? " · Drop alerts on" : ""}
                    </span>
                  </span>
                  <form action={setPriveMembership.bind(null, m.id, false)}>
                    <Button type="submit" size="sm" variant="ghost">
                      Revoke
                    </Button>
                  </form>
                </div>
                <AccessLinkForm customerId={m.id} drops={openDrops} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
