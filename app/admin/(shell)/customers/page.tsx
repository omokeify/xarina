import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { customerList } from "@/lib/customers/admin";
import { PAGE_SIZE, parseFilters, toQuery, toRpcArgs } from "@/lib/customers/filters";
import { can } from "@/lib/staff/roles";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Customers" };

const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

const SELECT = "border-line bg-surface px-3 py-2 text-body-s text-ink h-10 w-full border focus:outline-none cursor-pointer";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireStaff(["owner", "manager", "support"]);
  const filters = parseFilters(await searchParams);
  const supabase = await createClient();

  const [list, products] = await Promise.all([
    supabase.rpc("admin_customers", {
      ...toRpcArgs(filters),
      p_limit: PAGE_SIZE,
      p_offset: (filters.page - 1) * PAGE_SIZE,
    }),
    supabase.from("products").select("id, name").order("name"),
  ]);
  if (list.error) throw list.error;
  const { total, rows } = customerList.parse(list.data);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const query = toQuery({ ...filters, page: 1 });

  return (
    <div className="gap-8 flex flex-col">
      <header className="gap-3 flex flex-wrap items-end justify-between">
        <div className="gap-1 flex flex-col">
          <p className="label text-accent">
            Client Relations &amp; Privé Registry
          </p>
          <h1 className="font-display text-display-m">Customers &amp; Privé</h1>
          <p className="text-body-s text-ink-muted">
            Interest indicates waitlist enrollments for upcoming releases. It is reported separately from confirmed sales.
          </p>
        </div>
        {can.exportCustomers(staff.role) && (
          <Button asChild size="sm" variant="secondary">
            <a href={`/admin/customers/export${query ? `?${query}` : ""}`} className="cursor-pointer">
              Export Client CSV
            </a>
          </Button>
        )}
      </header>

      <form method="get" className="gap-4 border-line bg-surface-raised p-4 grid border md:grid-cols-4">
        <div className="space-y-1 md:col-span-4">
          <Label htmlFor="q" className="label text-ink-muted">
            Search Client Name, Email, or Telephone
          </Label>
          <Input id="q" name="q" defaultValue={filters.q} placeholder="Search clientele records..." />
        </div>
        <div className="space-y-1">
          <Label htmlFor="prive" className="label text-ink-muted">
            Privé Status
          </Label>
          <select
            id="prive"
            name="prive"
            defaultValue={filters.prive == null ? "" : filters.prive ? "yes" : "no"}
            className={SELECT}
          >
            <option value="">Any Tier</option>
            <option value="yes">Privé Verified Members</option>
            <option value="no">General Clients</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="design" className="label text-ink-muted">
            Waitlisted Design
          </Label>
          <select id="design" name="design" defaultValue={filters.design ?? ""} className={SELECT}>
            <option value="">Any Design</option>
            {(products.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="purchased" className="label text-ink-muted">
            Purchase History
          </Label>
          <select
            id="purchased"
            name="purchased"
            defaultValue={filters.purchased == null ? "" : filters.purchased ? "yes" : "no"}
            className={SELECT}
          >
            <option value="">Any History</option>
            <option value="yes">Has Completed Purchases</option>
            <option value="no">Zero Purchases to Date</option>
          </select>
        </div>
        <div className="gap-2 flex items-end">
          <Button type="submit" size="sm">
            Apply Filter
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/customers">Reset</Link>
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between">
        <p className="label text-ink-muted">
          {total} {total === 1 ? "Client Record" : "Client Records"}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="border border-line bg-surface-raised p-12 text-center">
          <p className="text-body-s text-ink-muted">No client records match the selected filter parameters.</p>
        </div>
      ) : (
        <div className="border border-line bg-surface-raised overflow-hidden">
          <ul className="divide-y divide-line">
            {rows.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/customers/${c.id}`}
                  className="px-6 py-4 hover:bg-surface-sunk/30 transition-colors grid md:grid-cols-[1fr_auto] gap-4 items-center"
                >
                  <div className="flex flex-col">
                    <span className="text-body font-medium text-ink flex items-center gap-2">
                      <span>{c.name ?? c.email}</span>
                      {c.is_vip && (
                        <span className="px-2 py-0.5 label bg-accent/20 text-accent border border-accent/30">
                          Privé Member
                        </span>
                      )}
                    </span>
                    <span className="text-body-s text-ink-muted mt-0.5">
                      {c.name ? `${c.email} · ` : ""}
                      {c.phone ? `${c.phone} · ` : ""}
                      Registered {day.format(new Date(c.created_at))}
                    </span>
                  </div>
                  <div className="text-right flex flex-col md:items-end">
                    <span className="text-body-s tabular-nums font-medium text-ink">
                      {c.paid_orders} {c.paid_orders === 1 ? "paid order" : "paid orders"}
                    </span>
                    <span className="text-caption text-ink-muted mt-0.5">
                      {c.interest_count} waitlist {c.interest_count === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="gap-3 flex items-center justify-between pt-2">
          {filters.page > 1 ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/admin/customers?${toQuery({ ...filters, page: filters.page - 1 })}`}>
                Previous Page
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="label text-ink-muted">
            Page {filters.page} of {pages}
          </span>
          {filters.page < pages ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/admin/customers?${toQuery({ ...filters, page: filters.page + 1 })}`}>Next Page</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
