import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/staff/session";
import { ADMIN_SECTIONS } from "@/lib/staff/roles";

// Placeholder for sections built in later phases. Each real section replaces
// this with its own folder (e.g. app/admin/(shell)/products/), which takes
// precedence over this dynamic route.
const PHASE: Record<string, number> = {
  products: 2,
  content: 2,
  drops: 4,
  orders: 5,
  customers: 5,
  reports: 5,
  staff: 5,
  settings: 3,
};

export default async function AdminSectionPlaceholder({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const def = ADMIN_SECTIONS.find((s) => s.href === `/admin/${section}`);
  if (!def) notFound();
  await requireStaff(def.roles);

  return (
    <div className="flex max-w-xl flex-col gap-space-3">
      <h1 className="font-display text-display-m">{def.label}</h1>
      <p className="text-body text-ink-muted">This section arrives in phase {PHASE[section]}.</p>
    </div>
  );
}
