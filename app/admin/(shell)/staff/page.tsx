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
    <div className="flex max-w-3xl flex-col gap-space-5">
      <header className="flex flex-col gap-space-2">
        <h1 className="font-display text-display-m">Staff</h1>
        <p className="text-body-s text-ink-muted">
          Everyone signs in with their own email by magic link. No shared logins. Changes are recorded in the audit log.
        </p>
      </header>

      <section aria-labelledby="add-heading" className="flex flex-col gap-space-3 border-t border-line pt-space-4">
        <h2 id="add-heading" className="font-display text-title">
          Add someone
        </h2>
        <AddStaffForm />
      </section>

      <section aria-labelledby="team-heading" className="flex flex-col gap-space-2 border-t border-line pt-space-4">
        <h2 id="team-heading" className="font-display text-title">
          Team
        </h2>
        <ul className="flex flex-col">
          {staff.map((s) => (
            <StaffRow key={s.id} member={s as never} isMe={s.id === me.id} />
          ))}
        </ul>
      </section>
    </div>
  );
}
