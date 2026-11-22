import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/admin/products";

// DROP-1: times are stored in UTC. The admin form converts the staff member's
// local entry to a UTC ISO string in the browser; this schema only accepts ISO.
const utcTime = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date and time")
  .transform((v) => new Date(v).toISOString());

const optionalUtcTime = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.union([z.literal(""), utcTime]))
  .transform((v) => (v === "" ? null : v));

const optionalLimit = z
  .string()
  .transform((v) => v.trim())
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) {
      ctx.addIssue({ code: "custom", message: "Use a whole number of at least 1" });
      return z.NEVER;
    }
    return n;
  });

export const ON_CLOSE = ["move_to_available", "hide"] as const;

export const dropSchema = z
  .object({
    name: z.string().trim().min(1, "Give the drop a name").max(80),
    // Permanent address (/drops/[slug]). Empty = generate from the name; changing it keeps a redirect.
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(80)
      .refine((v) => v === "" || SLUG_PATTERN.test(v), "Use lowercase letters, numbers and single hyphens"),
    pitch: z.string().trim().max(280),
    hero_alt: z.string().trim().max(200),
    vip_opens_at: utcTime,
    public_opens_at: utcTime,
    closes_at: optionalUtcTime,
    vip_limit_per_member: optionalLimit,
    on_close: z.enum(ON_CLOSE),
    published: z
      .literal("on")
      .optional()
      .transform((v) => v === "on"),
  })
  .superRefine((d, ctx) => {
    if (Date.parse(d.vip_opens_at) > Date.parse(d.public_opens_at)) {
      ctx.addIssue({
        code: "custom",
        path: ["vip_opens_at"],
        message: "Privé opening cannot be after public opening",
      });
    }
    if (d.closes_at && Date.parse(d.closes_at) <= Date.parse(d.public_opens_at)) {
      ctx.addIssue({ code: "custom", path: ["closes_at"], message: "Closing must be after public opening" });
    }
  });

export type DropInput = z.infer<typeof dropSchema>;
