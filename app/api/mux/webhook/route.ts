import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getMux } from "@/lib/admin/mux";
import { createServiceClient } from "@/lib/admin/service-client";

// Mux webhook (PDP-2, ADM-2). The signature is verified before anything is
// read; updates are idempotent, so Mux retries are harmless.
export const dynamic = "force-dynamic";

type MuxEvent = {
  type: string;
  data: {
    id: string;
    asset_id?: string;
    passthrough?: string;
    playback_ids?: { id: string; policy: string }[];
  };
};

export async function POST(request: Request) {
  const mux = getMux();
  if (!mux || !process.env.MUX_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Mux is not configured" }, { status: 503 });
  }

  const body = await request.text();
  let event: MuxEvent;
  try {
    event = (await mux.webhooks.unwrap(body, request.headers, process.env.MUX_WEBHOOK_SECRET)) as unknown as MuxEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const db = createServiceClient();
  const { type, data } = event;
  let mediaId: string | null = null;

  if (type === "video.upload.asset_created" && data.asset_id) {
    const { data: row } = await db
      .from("product_media")
      .update({ mux_asset_id: data.asset_id })
      .eq("mux_upload_id", data.id)
      .select("id")
      .maybeSingle();
    mediaId = row?.id ?? null;
  } else if (type === "video.asset.ready") {
    const playback = data.playback_ids?.find((p) => p.policy === "public") ?? data.playback_ids?.[0];
    if (playback && data.passthrough) {
      const { data: row } = await db
        .from("product_media")
        .update({ status: "ready", mux_asset_id: data.id, mux_playback_id: playback.id })
        .eq("id", data.passthrough)
        .eq("type", "video")
        .select("id")
        .maybeSingle();
      mediaId = row?.id ?? null;
    }
  } else if (type === "video.asset.errored" && data.passthrough) {
    await db.from("product_media").update({ status: "errored" }).eq("id", data.passthrough).neq("status", "ready");
    mediaId = data.passthrough;
  } else if (type === "video.upload.errored" || type === "video.upload.cancelled") {
    await db.from("product_media").update({ status: "errored" }).eq("mux_upload_id", data.id).neq("status", "ready");
  }

  if (mediaId) {
    const { data: media } = await db.from("product_media").select("product_id, products(slug)").eq("id", mediaId).maybeSingle();
    const slug = (media?.products as { slug: string } | null)?.slug;
    if (slug) revalidatePath(`/p/${slug}`);
    revalidatePath("/shop");
    if (media?.product_id) revalidatePath(`/admin/products/${media.product_id}`);
  }

  return NextResponse.json({ received: true });
}
