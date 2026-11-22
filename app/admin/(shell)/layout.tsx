import type { Metadata } from "next";
import Link from "next/link";
import { Lockup } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/staff/session";
import { sectionsFor } from "@/lib/staff/roles";
import { signOut } from "../login/actions";
import { redirect } from "next/navigation";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Xarina admin" }, robots: { index: false } };

async function signOutAction() {
  "use server";
  await signOut();
  redirect("/admin/login");
}

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const sections = sectionsFor(staff.role).map(({ href, label }) => ({ href, label }));

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-line md:min-h-dvh md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-space-3 px-space-3 py-space-3 md:flex-col md:items-start md:py-space-4">
          <Link href="/admin" aria-label="Xarina admin home">
            <Lockup size="sm" />
          </Link>
          <span className="label text-ink-muted md:hidden">{staff.role}</span>
        </div>
        <AdminNav sections={sections} />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-end gap-space-3 border-b border-line px-space-3 py-space-2 md:px-space-5">
          <span className="text-body-s text-ink-muted">
            {staff.name ?? staff.email} · <span className="capitalize">{staff.role}</span>
          </span>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm" className="px-space-2">
              Sign out
            </Button>
          </form>
        </header>
        <main className="flex-1 px-space-3 py-space-5 md:px-space-5">{children}</main>
      </div>
    </div>
  );
}
