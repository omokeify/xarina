import { requireStaff } from "@/lib/staff/session";
import { sectionsFor } from "@/lib/staff/roles";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const staff = await requireStaff();
  const sections = sectionsFor(staff.role).filter((s) => s.href !== "/admin");

  return (
    <div className="flex max-w-3xl flex-col gap-space-5">
      <div className="flex flex-col gap-space-2">
        <h1 className="font-display text-display-m">Good to see you{staff.name ? `, ${staff.name.split(" ")[0]}` : ""}.</h1>
        <span aria-hidden className="h-0.5 w-space-5 bg-accent" />
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {sections.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex items-center py-space-4 hover:text-ink-muted">
              <span className="font-display text-title">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
