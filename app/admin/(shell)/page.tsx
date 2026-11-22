import { requireStaff } from "@/lib/staff/session";
import { sectionsFor } from "@/lib/staff/roles";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function AdminOverviewPage() {
  const staff = await requireStaff();
  const sections = sectionsFor(staff.role).filter((s) => s.href !== "/admin");

  const SECTION_DESCRIPTIONS: Record<string, { kicker: string; desc: string }> = {
    "/admin/products": {
      kicker: "Catalogue & Sizing",
      desc: "Manage statement silhouettes, sizes, photography, fabrics, and multi-currency pricing.",
    },
    "/admin/drops": {
      kicker: "Scheduled Releases",
      desc: "Configure upcoming drops, Privé VIP early access windows, and allocation limits.",
    },
    "/admin/orders": {
      kicker: "Fulfillment & Tracking",
      desc: "Track paid client orders, process dispatch statuses, and manage DHL waybills.",
    },
    "/admin/customers": {
      kicker: "Clientele & Privé",
      desc: "Review Privé early access requests, member approvals, and client stylist notes.",
    },
    "/admin/content": {
      kicker: "Editorial & Storefront",
      desc: "Edit home hero photography, announcements, and customer care Maison pages.",
    },
    "/admin/reports": {
      kicker: "Performance & Attribution",
      desc: "Analyze verified revenue settlement across NGN, GBP, USD, and ad spend ROAS.",
    },
    "/admin/audit": {
      kicker: "Security & Compliance",
      desc: "Tamper-evident audit trail of all staff modifications, pricing shifts, and allocations.",
    },
    "/admin/staff": {
      kicker: "Staff Accounts & RBAC",
      desc: "Manage team member access, role permissions, and administrative credentials.",
    },
    "/admin/settings": {
      kicker: "Global Parameters",
      desc: "Configure FX rates, boutique buffers, and emergency operational toggles.",
    },
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="label text-accent mb-1">
          Operational Workspace · Quiet Luxury Console
        </p>
        <h1 className="font-display text-display-m text-ink">
          Good to see you{staff.name ? `, ${staff.name.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-body-s text-ink-muted mt-1 max-w-2xl">
          Welcome to the Xarina administrative portal. Manage drops, inventory, orders, and VIP memberships with calm precision.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sections.map((s) => {
          const meta = SECTION_DESCRIPTIONS[s.href] ?? {
            kicker: "Management",
            desc: "View and manage records for this section.",
          };
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group border border-line bg-surface p-6 flex flex-col justify-between hover:border-ink hover:bg-surface-sunk/30 transition-all duration-200"
            >
              <div>
                <p className="label text-accent mb-2">
                  {meta.kicker}
                </p>
                <h2 className="font-display text-title text-ink group-hover:text-accent transition-colors flex items-center justify-between">
                  <span>{s.label}</span>
                  <ArrowRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h2>
                <p className="text-body-s text-ink-muted mt-2 leading-relaxed">
                  {meta.desc}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-line/60 flex items-center justify-between label text-ink-muted group-hover:text-ink">
                <span>Enter section</span>
                <span>→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
