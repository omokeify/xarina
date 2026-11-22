import "server-only";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";

// HOME-4: everything on the homepage that staff can change lives in
// site_settings. Shapes are validated here; missing or malformed values fall
// back to safe defaults rather than breaking the storefront.

export const heroSchema = z.object({
  featured_drop_id: z.string().uuid().nullable().catch(null),
  media: z
    .object({
      type: z.enum(["image", "video"]),
      storage_path: z.string().nullable().optional(),
      mux_playback_id: z.string().nullable().optional(),
      alt: z.string().default(""),
    })
    .nullable()
    .catch(null),
  headline: z.string().nullable().catch(null),
  pitch: z.string().nullable().catch(null),
  /** Text panel theme. Ivory & Ink is the main site; Privé (noir) is for chosen campaign moments. */
  theme: z.enum(["ivory", "prive"]).catch("ivory"),
});
export type HeroSettings = z.infer<typeof heroSchema>;

export const announcementSchema = z.object({
  enabled: z.boolean().catch(false),
  text: z.string().catch(""),
  href: z.string().nullable().catch(null),
});
export type AnnouncementSettings = z.infer<typeof announcementSchema>;

export const whatsappSchema = z.object({
  // International format, digits only after the +, e.g. +2348012345678.
  number: z.string().regex(/^\+\d{7,15}$/).nullable().catch(null),
});
export type WhatsAppSettings = z.infer<typeof whatsappSchema>;

const DEFAULTS = {
  hero: { featured_drop_id: null, media: null, headline: null, pitch: null, theme: "ivory" } as HeroSettings,
  announcement_bar: { enabled: false, text: "", href: null } as AnnouncementSettings,
  whatsapp: { number: null } as WhatsAppSettings,
};

export type SiteSettings = typeof DEFAULTS;

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await createPublicClient()
    .from("site_settings")
    .select("key, value")
    .in("key", ["hero", "announcement_bar", "whatsapp"]);
  if (error) throw error;

  const byKey = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    hero: heroSchema.safeParse(byKey.hero ?? {}).data ?? DEFAULTS.hero,
    announcement_bar: announcementSchema.safeParse(byKey.announcement_bar ?? {}).data ?? DEFAULTS.announcement_bar,
    whatsapp: whatsappSchema.safeParse(byKey.whatsapp ?? {}).data ?? DEFAULTS.whatsapp,
  };
}

/** wa.me deep link with a pre-filled message (PDP-6). */
export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
