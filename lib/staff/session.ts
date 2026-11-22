import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaffRole, type StaffRole } from "./roles";

export type Staff = { id: string; name: string | null; email: string; role: StaffRole };

/** The signed-in, active staff member, or null. Backed by public.current_staff(). */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase.rpc("current_staff");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !isStaffRole(row.role)) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role };
});

/**
 * Guard for admin pages and server actions (ADM-1). Signed out → login.
 * Signed in but not staff (or wrong role) → 404, so admin routes aren't advertised.
 */
export async function requireStaff(roles?: readonly StaffRole[]): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/admin/login");
    notFound();
  }
  if (roles && !roles.includes(staff.role)) notFound();
  return staff;
}
