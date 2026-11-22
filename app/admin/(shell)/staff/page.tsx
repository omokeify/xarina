import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";
import { isStaffRole } from "@/lib/staff/roles";
import { AddStaffForm, StaffRow } from "./staff-forms";

export const metadata: Metadata = { title: "Staff" };

// ADM-1: one login per person, owner only. Deactivating someone ends their
// admin access immediately (is_staff checks active on every request).
export default async function StaffPage() {
  const me = await requireStaff(["owner"]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("staff").select("id, name, email, role, active").order("active", { ascending: false }).order("name");
  if (error) throw error;
  const staff = (data ?? []).filter((s) => isStaffRole(s.role));

  return (
    <div className="gap-space-5 flex max-w-4xl flex-col">
      <header className="gap-space-2 flex flex-col">
        <p className="label text-accent">Access Control &amp; RBAC</p>
        <h1 className="font-display text-display-m text-ink">Staff Accounts</h1>
        <p className="text-body-s text-ink-muted">
          Staff authenticate with personal magic links. No shared logins. Changes are recorded in the audit log.
        </p>
      </header>

      <section aria-labelledby="add-heading" className="border border-line bg-surface-raised p-space-4 flex flex-col gap-space-3">
        <div className="flex flex-col gap-space-1 border-b border-line pb-space-3">
          <h2 id="add-heading" className="font-display text-title text-ink">
            Grant Access
          </h2>
          <p className="text-body-s text-ink-muted">
            Invite a new team member and set their operational role.
          </p>
        </div>
        <AddStaffForm />
      </section>

      <section aria-labelledby="team-heading" className="border border-line bg-surface-raised p-space-4 flex flex-col gap-space-3">
        <div className="flex flex-col gap-space-1 border-b border-line pb-space-3">
          <h2 id="team-heading" className="font-display text-title text-ink">
            Active Staff Directory ({staff.length})
          </h2>
          <p className="text-body-s text-ink-muted">
            Deactivating a staff account immediately revokes access across the operations console.
          </p>
        </div>
        <ul className="divide-line divide-y border-y border-line">
          {staff.map((s) => (
            <StaffRow key={s.id} member={s as never} isMe={s.id === me.id} />
          ))}
        </ul>
      </section>
    </div>
  );
}
