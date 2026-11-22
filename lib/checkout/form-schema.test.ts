import { describe, expect, it } from "vitest";
import { checkoutFormSchema } from "./form-schema";

const valid = {
  email: " Ada@Example.com ",
  phone: "+234 801 234 5678",
  name: "Ada",
  line1: "1 Marina",
  city: "Lagos",
  country: "ng",
  shippingRateId: "22222222-2222-4222-8222-222222222222",
};

describe("checkoutFormSchema (PAY-1)", () => {
  it("normalises email and country", () => {
    const out = checkoutFormSchema.parse(valid);
    expect(out.email).toBe("ada@example.com");
    expect(out.country).toBe("NG");
  });
  it("rejects a bad email, phone or missing shipping choice", () => {
    expect(checkoutFormSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(checkoutFormSchema.safeParse({ ...valid, phone: "abc" }).success).toBe(false);
    expect(checkoutFormSchema.safeParse({ ...valid, shippingRateId: "" }).success).toBe(false);
  });
  it("has no price or total field: the client can't set what is charged", () => {
    expect(Object.keys(checkoutFormSchema.shape)).not.toEqual(expect.arrayContaining(["total"]));
  });
});
