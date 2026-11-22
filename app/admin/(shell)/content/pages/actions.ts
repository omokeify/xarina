"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/session";

// ADM-6 / INFO-1: info pages (About, Contact, FAQs, Delivery, Returns,
// Privacy, Terms). Plain text: a blank line starts a new paragraph.
const EDITORS = ["owner", "manager", "merchandiser"] as const;

export type PageState = { status: "idle" | "saved" | "error"; message?: string };

const schema = z.object({
  title: z.string().trim().min(1, "Give the page a title").max(120),
  body: z
    .string()
    .max(20000, "Keep the page under 20,000 characters")
    .transform((v) => v.replace(/\r\n/g, "\n").trim()),
  published: z.literal("on").optional(),
});

export async function savePage(slug: string, _: PageState, form: FormData): Promise<PageState> {
  await requireStaff(EDITORS);
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pages")
    .update({ title: parsed.data.title, body: parsed.data.body, published: Boolean(parsed.data.published) })
    .eq("slug", slug)
    .select("slug")
    .maybeSingle();
  if (error) return { status: "error", message: "Couldn't save. Try again." };
  if (!data) return { status: "error", message: "You don't have permission to change this page." };

  // The page itself, plus the footer and page tabs that list published pages.
  revalidatePath(`/${slug}`);
  revalidatePath("/", "layout");
  revalidatePath("/admin/content/pages");
  return { status: "saved" };
}
