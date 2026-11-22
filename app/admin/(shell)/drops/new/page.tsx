import type { Metadata } from "next";
import { requireStaff } from "@/lib/staff/session";
import { DropForm } from "../drop-form";

export const metadata: Metadata = { title: "New drop" };

export default async function NewDropPage() {
  await requireStaff(["owner", "manager", "merchandiser"]);
  return (
    <div className="gap-space-5 flex flex-col">
      <h1 className="font-display text-display-m">New drop</h1>
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
  );
}
