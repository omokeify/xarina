import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { adminDropList, priveAccessLinkList, priveMemberList } from "@/lib/drops/admin";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";
import { revokeAccessLink, setPriveMembership } from "../actions";
import { AccessLinkForm, BulkApproveForm } from "./prive-admin-forms";

export const metadata: Metadata = { title: "Privé members" };

const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

type AccessLink = {
  id: string;
  drop: { name: string } | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  staff: { name: string } | null;
};

function linkStatus(link: AccessLink): "Active" | "Used" | "Revoked" | "Expired" {
  if (link.revoked_at) return "Revoked";
  if (link.used_at) return "Used";
  if (new Date(link.expires_at).getTime() <= Date.now()) return "Expired";
  return "Active";
}

export default async function PriveMembersPage() {
  await requireStaff(["owner", "manager"]);
  const supabase = await createClient();
  const [members, drops, linkRows] = await Promise.all([
    supabase.rpc("admin_prive_members"),
    supabase.rpc("admin_drops"),
    supabase
      .from("vip_access_links")
      .select(
        "id, customer_id, drop_id, drop:drops(name), created_at, expires_at, used_at, revoked_at, created_by, staff:created_by(name)",
      )
      .order("created_at", { ascending: false }),
  ]);
  if (members.error) throw members.error;
  if (drops.error) throw drops.error;
  if (linkRows.error) throw linkRows.error;

  const all = priveMemberList.parse(members.data);
  const requests = all.filter((m) => !m.is_vip);
  const approved = all.filter((m) => m.is_vip);
  const openDrops = adminDropList
    .parse(drops.data)
    .filter((d) => d.state !== "closed")
    .map(({ id, name }) => ({ id, name }));
  const accessLinks = priveAccessLinkList.parse(linkRows.data);
  const linksByCustomer = new Map<string, AccessLink[]>();
  for (const link of accessLinks) {
    const list = linksByCustomer.get(link.customer_id) ?? [];
    list.push(link);
    linksByCustomer.set(link.customer_id, list);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <header className="flex flex-col gap-1">
        <Link
          href="/admin/drops"
          className="label text-ink-muted hover:text-ink mb-1 inline-flex items-center gap-1.5"
        >
          ← Back to Drops
        </Link>
        <p className="label text-accent">VIP Client Services</p>
        <h1 className="font-display text-display-m text-ink">Privé Member Roster</h1>
        <p className="text-body-s text-ink-muted">
          Approved members access drop allocations during the early Privé window via verified magic link or
          private access token.
        </p>
      </header>

      <section className="border-line bg-surface-raised flex flex-col gap-4 border p-6 sm:p-8">
        <div className="border-line border-b pb-3">
          <h2 className="font-display text-title text-ink">Bulk Member Approval</h2>
          <p className="text-body-s text-ink-muted">
            Paste member emails to approve them in one action. Each new member is emailed a welcome note.
          </p>
        </div>
        <BulkApproveForm />
      </section>

      <section
        aria-labelledby="requests"
        className="border-line bg-surface-raised flex flex-col gap-4 border p-6 sm:p-8"
      >
        <div className="border-line flex items-center justify-between border-b pb-3">
          <h2 id="requests" className="font-display text-title text-ink">
            Pending Membership Requests
          </h2>
          <span className="label bg-surface-sunk text-ink border-line border px-2 py-0.5">
            {requests.length} Pending
          </span>
        </div>
        {requests.length === 0 ? (
          <p className="text-body-s text-ink-muted py-4">No pending membership requests.</p>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {requests.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <span className="flex flex-col">
                  <span className="text-body text-ink font-medium">{m.name ?? m.email}</span>
                  <span className="text-caption text-ink-muted">
                    {m.name ? `${m.email} · ` : ""}
                    {m.phone ? `${m.phone} · ` : ""}
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

      <section
        aria-labelledby="members"
        className="border-line bg-surface-raised flex flex-col gap-4 border p-6 sm:p-8"
      >
        <div className="border-line flex items-center justify-between border-b pb-3">
          <h2 id="members" className="font-display text-title text-ink">
            Approved Privé Members
          </h2>
          <span className="label bg-surface-sunk text-ink border-line border px-2 py-0.5">
            {approved.length} Active
          </span>
        </div>
        {approved.length === 0 ? (
          <p className="text-body-s text-ink-muted py-4">No approved members yet.</p>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {approved.map((m) => {
              const memberLinks = linksByCustomer.get(m.id) ?? [];
              return (
                <li key={m.id} className="flex flex-col gap-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex flex-col">
                      <span className="text-body text-ink font-medium">{m.name ?? m.email}</span>
                      <span className="text-caption text-ink-muted">
                        {m.name ? `${m.email} · ` : ""}
                        {m.phone ? `${m.phone} · ` : ""}
                        {m.vip_approved_at ? `Approved ${day.format(new Date(m.vip_approved_at))}` : ""}
                        {m.approved_by_name ? ` by ${m.approved_by_name}` : ""}
                        {m.drop_alert_consent ? " · Drop alerts active" : ""}
                      </span>
                    </span>
                    <form action={setPriveMembership.bind(null, m.id, false)}>
                      <Button type="submit" size="sm" variant="ghost" className="text-critical">
                        Revoke
                      </Button>
                    </form>
                  </div>
                  <div className="bg-surface border-line border p-3">
                    <AccessLinkForm customerId={m.id} drops={openDrops} />
                  </div>
                  {memberLinks.length > 0 && (
                    <details className="border-line bg-surface border">
                      <summary className="label text-ink-muted hover:text-ink cursor-pointer p-3">
                        Access link history ({memberLinks.length})
                      </summary>
                      <ul className="divide-line border-line divide-y border-t">
                        {memberLinks.map((link) => {
                          const status = linkStatus(link);
                          return (
                            <li
                              key={link.id}
                              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                            >
                              <span className="flex flex-col">
                                <span className="text-body-s text-ink">
                                  {link.drop?.name ?? "Any drop"} ·{" "}
                                  <span
                                    className={
                                      status === "Active" ? "label text-accent" : "label text-ink-muted"
                                    }
                                  >
                                    {status}
                                  </span>
                                </span>
                                <span className="text-caption text-ink-muted">
                                  Issued {day.format(new Date(link.created_at))} by{" "}
                                  {link.staff?.name ?? "System"} · Expires{" "}
                                  {day.format(new Date(link.expires_at))}
                                  {link.used_at ? ` · Used ${day.format(new Date(link.used_at))}` : ""}
                                  {link.revoked_at
                                    ? ` · Revoked ${day.format(new Date(link.revoked_at))}`
                                    : ""}
                                </span>
                              </span>
                              {status === "Active" && (
                                <form action={revokeAccessLink.bind(null, link.id)}>
                                  <Button type="submit" size="sm" variant="ghost" className="text-critical">
                                    Revoke link
                                  </Button>
                                </form>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
