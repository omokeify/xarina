"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import OrderDispatched from "@/emails/order-dispatched";
import { isOrderStatus } from "@/lib/admin/orders";
import { sendEmail } from "@/lib/email/client";
import { getEmailSite } from "@/lib/email/site";
import { type Currency, isCurrency } from "@/lib/money";
import { requireStaff } from "@/lib/staff/session";
import { createClient } from "@/lib/supabase/server";

export type OrderFormState = { status: "idle" | "done" | "error"; message?: string };

const MESSAGES: Record<string, string> = {
  not_allowed: "That change isn't allowed for this order or for your role.",
  tracking_required: "Add the courier, tracking number and tracking link to dispatch.",
  tracking_url_invalid: "The tracking link must start with http:// or https://.",
  order_not_found: "That order no longer exists.",
  not_staff: "You don't have permission to do that.",
};

const uuid = z.string().uuid();

/**
 * ADM-5 / INV-4: move an order along its flow. The database function decides what is
 * allowed (it can never mark an order paid: only a verified webhook does, rule 2).
 * On dispatch the customer gets the tracking email (INV-5).
 */
export async function updateOrderStatus(_: OrderFormState, formData: FormData): Promise<OrderFormState> {
  await requireStaff(["owner", "manager", "fulfilment"]);
  const orderId = uuid.safeParse(formData.get("orderId"));
  const to = formData.get("to");
  if (!orderId.success || !isOrderStatus(to)) return { status: "error", message: "Choose a status." };

  const text = (key: string) => String(formData.get(key) ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_order_status", {
    p_order_id: orderId.data,
    p_to: to,
    p_courier: text("courier"),
    p_tracking_number: text("trackingNumber"),
    p_tracking_url: text("trackingUrl"),
  });
  if (error)
    return { status: "error", message: MESSAGES[error.message] ?? "Couldn't update the order. Try again." };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId.data}`);
  if (to !== "dispatched") return { status: "done", message: "Order updated." };

  const sent = await sendDispatchEmail(orderId.data);
  return {
    status: "done",
    message: sent.ok
      ? "Dispatched. The customer has been emailed their tracking link."
      : `Dispatched, but the email wasn't sent (${sent.reason}). Send the tracking link to the customer yourself.`,
  };
}

async function sendDispatchEmail(orderId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const supabase = await createClient();
    const { data: order } = await supabase
      .from("orders")
      .select(
        "number, email, currency, courier, tracking_number, tracking_url, shipping_address, order_items(product_name, colour, size, qty, unit_price_minor)",
      )
      .eq("id", orderId)
      .single();
    if (!order || !isCurrency(order.currency)) return { ok: false, reason: "order details missing" };

    const address = (order.shipping_address ?? {}) as Record<string, unknown>;
    const name = typeof address.name === "string" ? address.name : "";
    const city = typeof address.city === "string" ? address.city : "";

    const result = await sendEmail({
      to: order.email,
      subject: `Your Xarina order ${order.number} is on its way`,
      react: OrderDispatched({
        site: getEmailSite(),
        firstName: name.split(" ")[0] || undefined,
        orderNumber: order.number,
        currency: order.currency as Currency,
        items: order.order_items.map((i) => ({
          name: i.product_name,
          colour: i.colour,
          size: i.size,
          qty: i.qty,
          unitPriceMinor: i.unit_price_minor,
        })),
        courier: order.courier ?? "",
        trackingNumber: order.tracking_number ?? "",
        trackingUrl: order.tracking_url ?? "",
        deliverToCity: city,
      }),
    });
    if (result.status === "failed") return { ok: false, reason: result.error };
    if (result.status === "skipped") return { ok: false, reason: "email isn't set up yet" };
    return { ok: true };
  } catch (error) {
    console.error("dispatch email failed", error);
    return { ok: false, reason: "email error" };
  }
}

/** Support and managers can leave a note on an order. */
export async function addOrderNote(_: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const staff = await requireStaff(["owner", "manager", "support"]);
  const orderId = uuid.safeParse(formData.get("orderId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!orderId.success || body === "") return { status: "error", message: "Write a note first." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .insert({ staff_id: staff.id, entity_type: "order", entity_id: orderId.data, body: body.slice(0, 2000) });
  if (error) return { status: "error", message: "Couldn't save the note. Try again." };

  revalidatePath(`/admin/orders/${orderId.data}`);
  return { status: "done", message: "Note added." };
}
