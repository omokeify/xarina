import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/staff/session";
import { sectionsFor } from "@/lib/staff/roles";
import { signOut } from "../login/actions";
import { AdminSidebarShell } from "./admin-sidebar-shell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Xarina admin" },
  robots: { index: false },
};

async function signOutAction() {
  "use server";
  await signOut();
  redirect("/admin/login");
}

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const sections = sectionsFor(staff.role).map(({ href, label }) => ({ href, label }));

  return (
    <AdminSidebarShell
      staff={{ name: staff.name, email: staff.email, role: staff.role }}
      sections={sections}
      signOutAction={signOutAction}
    >
      {children}
    </AdminSidebarShell>
  );
}
