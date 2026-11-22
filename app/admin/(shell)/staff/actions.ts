"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/admin/service-client";
import { requireStaff } from "@/lib/staff/session";
import { STAFF_ROLES } from "@/lib/staff/roles";

// ADM-1: individual staff accounts, owner only. Every change is audited by a
// database trigger, and the database refuses to remove the last active owner.

export type StaffState = { status: "idle" | "saved" | "error"; message?: string };

const addSchema = z.object({
  name: z.string().trim().min(1, "Enter their name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(STAFF_ROLES),
});

export async function addStaff(_: StaffState, form: FormData): Promise<StaffState> {
  await requireStaff(["owner"]);
  const parsed = addSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const { name, email, role } = parsed.data;
  const supabase = await createClient();
  const add = () => supabase.rpc("admin_add_staff", { p_email: email, p_name: name, p_role: role });

  let { data: result, error } = await add();
  if (error) return { status: "error", message: "Couldn't add them. Try again." };

  if (result === "needs_account") {
    // No login with this email yet: create one. They verify the address the
    // first time they sign in with a magic link.
    const { error: createError } = await createServiceClient().auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createError && !/already/i.test(createError.message)) {
      return { status: "error", message: "Couldn't create their login. Try again." };
    }
    ({ data: result, error } = await add());
    if (error || result !== "added") return { status: "error", message: "Couldn't add them. Try again." };
  }

  if (result === "exists") return { status: "error", message: `${email} is already on the team.` };

  revalidatePath("/admin/staff");
  return { status: "saved", message: `${name} added. They sign in at /admin/login with ${email}.` };
}

const updateSchema = z.object({
  role: z.enum(STAFF_ROLES),
  active: z.literal("on").optional(),
});

export async function updateStaff(staffId: string, _: StaffState, form: FormData): Promise<StaffState> {
  const me = await requireStaff(["owner"]);
  const parsed = updateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: "Check the role" };
  const active = Boolean(parsed.data.active);

  if (staffId === me.id && (!active || parsed.data.role !== "owner")) {
    return { status: "error", message: "You can't remove your own owner access. Ask another owner." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .update({ role: parsed.data.role, active })
    .eq("id", staffId)
    .select("id")
    .maybeSingle();
  if (error?.code === "23514") return { status: "error", message: "Xarina needs at least one active owner." };
  if (error || !data) return { status: "error", message: "Couldn't save. Try again." };

  revalidatePath("/admin/staff");
  return { status: "saved", message: active ? "Saved." : "Saved. Their admin access ended immediately." };
}
