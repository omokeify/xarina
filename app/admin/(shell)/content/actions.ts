"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";
import type { Json } from "@/lib/supabase/database.types";

// HOME-4: homepage hero, announcement bar and WhatsApp number. site_settings
// writes are owner/manager only, enforced by RLS as well as here.
const EDITORS = ["owner", "manager"] as const;

export type SaveState = { status: "idle" | "saved" | "error"; message?: string };

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const schema = z
  .object({
    featured_drop_id: z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null),
    headline: optionalText(80),
    pitch: optionalText(140),
    theme: z.enum(["ivory", "prive"]).catch("ivory"),
    media_alt: z.string().trim().max(200),
    remove_media: z.literal("on").optional(),
    announcement_enabled: z.literal("on").optional(),
    announcement_text: z.string().trim().max(120),
    announcement_href: z
      .string()
      .trim()
      .max(200)
      .refine((v) => v === "" || v.startsWith("/") || /^https:\/\//.test(v), "Link must start with / or https://")
      .transform((v) => v || null),
    whatsapp_number: z
      .string()
      .transform((v) => v.replace(/[\s()-]/g, ""))
      .refine((v) => v === "" || /^\+\d{7,15}$/.test(v), "Use international format, e.g. +2348012345678")
      .transform((v) => v || null),
  })
  .refine((v) => !v.announcement_enabled || v.announcement_text.length > 0, {
    message: "Add announcement text or switch the bar off",
    path: ["announcement_text"],
  });

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function saveHomepageSettings(_: SaveState, form: FormData): Promise<SaveState> {
  const staff = await requireStaff(EDITORS);
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form" };
  const v = parsed.data;
  const supabase = await createClient();

  const { data: current } = await supabase.from("site_settings").select("value").eq("key", "hero").maybeSingle();
  const currentHero = (current?.value ?? {}) as { media?: { type: string; storage_path?: string; alt?: string } | null };
  let media = v.remove_media ? null : (currentHero.media ?? null);

  const file = form.get("media_file");
  if (file instanceof File && file.size > 0) {
    const ext = IMAGE_TYPES[file.type];
    if (!ext) return { status: "error", message: "Upload a JPG, PNG, WebP or AVIF image" };
    if (file.size > MAX_IMAGE_BYTES) return { status: "error", message: "Images must be 8 MB or smaller" };
    if (!v.media_alt) return { status: "error", message: "Describe the image for screen readers (alt text)" };
    const path = `hero/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-media").upload(path, file, { contentType: file.type });
    if (error) return { status: "error", message: "The image didn't upload. Try again." };
    media = { type: "image", storage_path: path, alt: v.media_alt };
  } else if (media && v.media_alt) {
    media = { ...media, alt: v.media_alt };
  }

  const values: Record<string, { [key: string]: Json }> = {
    hero: { featured_drop_id: v.featured_drop_id, media, headline: v.headline, pitch: v.pitch, theme: v.theme },
    announcement_bar: { enabled: Boolean(v.announcement_enabled), text: v.announcement_text, href: v.announcement_href },
    whatsapp: { number: v.whatsapp_number },
  };
  const rows = Object.entries(values).map(([key, value]) => ({ key, value, updated_by: staff.id }));

  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return { status: "error", message: "Couldn't save. Try again." };

  revalidatePath("/", "layout");
  return { status: "saved" };
}
