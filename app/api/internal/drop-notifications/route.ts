import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import DropNotification from "@/emails/drop-notification";
import { createServiceClient } from "@/lib/admin/service-client";
import { sendEmail } from "@/lib/email/client";
import { getEmailSite } from "@/lib/email/site";
import { publicEnv } from "@/lib/env";
import { hashToken, newToken } from "@/lib/prive/tokens";

// DROP-4. Called every minute by pg_cron (via pg_net) once a notification is
// queued. Sends Privé invites at VIP open and launch alerts at public open.
export const dynamic = "force-dynamic";

const claimed = z.array(
  z.object({
    id: z.string().uuid(),
    kind: z.enum(["vip_invite", "public_launch"]),
    drop_id: z.string().uuid(),
    drop_name: z.string(),
    drop_pitch: z.string(),
    public_opens_at: z.string(),
    customer_id: z.string().uuid(),
    email: z.string(),
  }),
);

const opensFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) return new NextResponse("Unauthorised", { status: 401 });

  const db = createServiceClient();
  const { data, error } = await db.rpc("claim_drop_notifications", { p_limit: 50 });
  if (error) return NextResponse.json({ error: "claim failed" }, { status: 500 });
  const rows = claimed.parse(data);
  if (rows.length === 0) return NextResponse.json({ sent: 0, failed: 0 });

  // Re-check at send time: consent may have been withdrawn, and a member revoked,
  // since the row was queued (rule 12, rule 7).
  const { data: customers } = await db
    .from("customers")
    .select("id, is_vip, drop_alert_consent")
    .in("id", [...new Set(rows.map((r) => r.customer_id))]);
  const byId = new Map((customers ?? []).map((c) => [c.id, c]));

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const customer = byId.get(row.customer_id);
    if (!customer?.drop_alert_consent || (row.kind === "vip_invite" && !customer.is_vip)) {
      await db.rpc("complete_drop_notification", { p_id: row.id, p_error: "no longer eligible" });
      failed++;
      continue;
    }

    let url = `${publicEnv.NEXT_PUBLIC_SITE_URL}/shop`;
    if (row.kind === "vip_invite") {
      // Personal single-use link (rule 7): only its hash is stored.
      const token = newToken();
      const { error: linkError } = await db.from("vip_access_links").insert({
        customer_id: row.customer_id,
        drop_id: row.drop_id,
        token_hash: hashToken(token),
        expires_at: row.public_opens_at,
      });
      if (linkError) {
        await db.rpc("complete_drop_notification", { p_id: row.id, p_error: "could not create access link" });
        failed++;
        continue;
      }
      url = `${publicEnv.NEXT_PUBLIC_SITE_URL}/access/${token}`;
    }

    const result = await sendEmail({
      to: row.email,
      subject: row.kind === "vip_invite" ? `${row.drop_name}: Privé access` : `${row.drop_name} is open`,
      react: DropNotification({
        site: getEmailSite(),
        kind: row.kind,
        dropName: row.drop_name,
        pitch: row.drop_pitch,
        publicOpensAt: opensFormat.format(new Date(row.public_opens_at)) + " UTC",
        url,
      }),
    });

    if (result.status === "failed") {
      await db.rpc("complete_drop_notification", { p_id: row.id, p_error: result.error, p_retry: true });
      failed++;
    } else {
      await db.rpc("complete_drop_notification", { p_id: row.id });
      sent++;
    }
  }
  return NextResponse.json({ sent, failed });
}
