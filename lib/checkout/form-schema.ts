import { z } from "zod";

const text = (max: number) => z.string().trim().min(1, "Required").max(max);
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

/** PAY-1: guest checkout details. */
export const checkoutFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
  name: text(120),
  line1: text(200),
  line2: optional(200),
  city: text(120),
  region: optional(120),
  postcode: optional(20),
  country: z.string().trim().toUpperCase().length(2, "Choose a country"),
  shippingRateId: z.string().uuid("Choose a delivery option"),
});

export type CheckoutForm = z.infer<typeof checkoutFormSchema>;
