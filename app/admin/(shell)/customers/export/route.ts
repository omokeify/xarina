import { NextResponse, type NextRequest } from "next/server";
import { customerExport } from "@/lib/customers/admin";
import { toCsv } from "@/lib/customers/csv";
import { parseFilters, toQuery, toRpcArgs } from "@/lib/customers/filters";
import { can } from "@/lib/staff/roles";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const yes = (v: boolean) => (v ? "yes" : "no");

/**
 * CRM-3: CSV of the customers matching the current search and filters.
 * Owners and managers only (the database checks it too). The export is written
 * to the audit log BEFORE the file is returned; if that fails, nothing is sent.
 */
export async function GET(request: NextRequest) {
  const staff = await requireStaff(["owner", "manager"]);
  if (!can.exportCustomers(staff.role)) return new NextResponse("Not found", { status: 404 });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const filters = parseFilters(params);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_customers_export", toRpcArgs(filters));
  if (error) return new NextResponse("Export failed", { status: 500 });
  const rows = customerExport.parse(data);

  const { error: auditError } = await supabase.rpc("record_customer_export", {
    p_row_count: rows.length,
    p_filters: Object.fromEntries(new URLSearchParams(toQuery({ ...filters, page: 1 }))),
  });
  if (auditError)
    return new NextResponse("Export could not be recorded, so it was not sent", { status: 500 });

  const csv = toCsv(
    [
      "Email",
      "Name",
      "Phone",
      "Country",
      "Privé member",
      "Drop alerts",
      "Drop alerts date",
      "Marketing emails",
      "Marketing emails date",
      "Paid orders",
      "Waitlist interest",
      "Customer since",
    ],
    rows.map((r) => [
      r.email,
      r.name,
      r.phone,
      r.country,
      yes(r.is_vip),
      yes(r.drop_alert_consent),
      r.drop_alert_consent_at,
      yes(r.marketing_consent),
      r.marketing_consent_at,
      r.paid_orders,
      r.interest_count,
      r.created_at,
    ]),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="xarina-customers-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
