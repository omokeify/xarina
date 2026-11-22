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

const SELECT = "border-line bg-surface-raised px-space-3 text-body text-ink h-12 w-full rounded-xs border";

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
    <div className="gap-space-5 flex flex-col">
      <header className="gap-space-3 flex flex-wrap items-end justify-between">
        <div className="gap-space-2 flex flex-col">
          <h1 className="font-display text-display-m">Customers</h1>
          <p className="text-body-s text-ink-muted">
            Interest means waitlist sign-ups. It is not orders or sales.
          </p>
        </div>
        {can.exportCustomers(staff.role) && (
          <Button asChild size="sm" variant="secondary">
            <a href={`/admin/customers/export${query ? `?${query}` : ""}`}>Export CSV</a>
          </Button>
        )}
      </header>

      <form method="get" className="gap-space-3 border-line p-space-3 grid border md:grid-cols-4">
        <div className="space-y-space-1 md:col-span-4">
          <Label htmlFor="q">Search name, email or phone</Label>
          <Input id="q" name="q" defaultValue={filters.q} />
        </div>
        <div className="space-y-space-1">
          <Label htmlFor="prive">Privé</Label>
          <select
            id="prive"
            name="prive"
            defaultValue={filters.prive == null ? "" : filters.prive ? "yes" : "no"}
            className={SELECT}
          >
            <option value="">Any</option>
            <option value="yes">Members</option>
            <option value="no">Not members</option>
          </select>
        </div>
        <div className="space-y-space-1">
          <Label htmlFor="design">Waitlisted design</Label>
          <select id="design" name="design" defaultValue={filters.design ?? ""} className={SELECT}>
            <option value="">Any</option>
            {(products.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-space-1">
          <Label htmlFor="purchased">Has purchased</Label>
          <select
            id="purchased"
            name="purchased"
            defaultValue={filters.purchased == null ? "" : filters.purchased ? "yes" : "no"}
            className={SELECT}
          >
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="gap-space-2 flex items-end">
          <Button type="submit" size="sm">
            Apply
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/customers">Clear</Link>
          </Button>
        </div>
      </form>

      <p className="text-body-s text-ink-muted">
        {total} {total === 1 ? "customer" : "customers"}
      </p>

      {rows.length === 0 ? (
        <p className="py-space-5 text-body-s text-ink-muted">No customers match.</p>
      ) : (
        <ul className="divide-line border-line divide-y border-y">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/customers/${c.id}`}
                className="gap-space-1 py-space-3 hover:bg-surface-sunk md:px-space-3 grid md:grid-cols-[1fr_auto] md:items-center"
              >
                <span className="flex flex-col">
                  <span className="text-body">{c.name ?? c.email}</span>
                  <span className="text-body-s text-ink-muted">
                    {c.name ? `${c.email} · ` : ""}
                    {c.phone ? `${c.phone} · ` : ""}
                    Joined {day.format(new Date(c.created_at))}
                  </span>
                </span>
                <span className="label text-ink-muted">
                  {c.is_vip ? "Privé · " : ""}
                  {c.paid_orders} paid {c.paid_orders === 1 ? "order" : "orders"} · {c.interest_count}{" "}
                  interest
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="gap-space-3 flex items-center justify-between">
          {filters.page > 1 ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/admin/customers?${toQuery({ ...filters, page: filters.page - 1 })}`}>
                Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-body-s text-ink-muted">
            Page {filters.page} of {pages}
          </span>
          {filters.page < pages ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/admin/customers?${toQuery({ ...filters, page: filters.page + 1 })}`}>Next</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
