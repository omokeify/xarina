import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/staff/session";
import { DropForm } from "../drop-form";

export const metadata: Metadata = { title: "New drop" };

export default async function NewDropPage() {
  await requireStaff(["owner", "manager", "merchandiser"]);
  return (
    <div className="gap-space-5 flex max-w-3xl flex-col">
      <Link href="/admin/drops" className="label text-ink-muted hover:text-ink inline-flex items-center gap-space-1">
        ← Back to Drops
      </Link>
      <header className="gap-space-2 flex flex-col">
        <p className="label text-accent">Launch Management</p>
        <h1 className="font-display text-display-m text-ink">Create Drop Schedule</h1>
        <p className="text-body-s text-ink-muted">
          Configure release windows, Privé early access, and inventory allocation strategy.
        </p>
      </header>
      <div className="border border-line bg-surface-raised p-space-4">
        <DropForm
          drop={{
            id: null,
            name: "",
            slug: "",
            hero_storage_path: null,
            hero_alt: "",
            pitch: "",
            vip_opens_at: null,
            public_opens_at: null,
            closes_at: null,
            vip_limit_per_member: null,
            on_close: "move_to_available",
            published: false,
          }}
        />
      </div>
    </div>
  );
}
