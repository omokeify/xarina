import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import AbandonedCheckout from "@/emails/abandoned-checkout";
import { brandColour } from "@/emails/brand";
import DropLive from "@/emails/drop-live";
import DropNotification from "@/emails/drop-notification";
import DropReminder from "@/emails/drop-reminder";
import Occasion from "@/emails/occasion";
import OrderCancelled from "@/emails/order-cancelled";
import OrderConfirmation from "@/emails/order-confirmation";
import OrderDelivered from "@/emails/order-delivered";
import OrderDispatched from "@/emails/order-dispatched";
import PaymentFailed from "@/emails/payment-failed";
import PreorderUpdate from "@/emails/preorder-update";
import PriveEarlyAccess from "@/emails/prive-early-access";
import PriveWelcome from "@/emails/prive-welcome";
import Restock from "@/emails/restock";
import SignInCode from "@/emails/sign-in-code";
import SoldOut from "@/emails/sold-out";
import StaffInvitation from "@/emails/staff-invitation";
import Story from "@/emails/story";
import Styling from "@/emails/styling";
import Teaser from "@/emails/teaser";
import WaitlistConfirmation from "@/emails/waitlist-confirmation";
import Welcome from "@/emails/welcome";
import Winback from "@/emails/winback";

const visibleText = (html: string) => html.replace(/<[^>]+>/g, " ");

type Template = ((props: never) => React.ReactElement) & { PreviewProps: unknown };
// Templates are plain functions of their props, so call them directly with their PreviewProps.
const asRender = (t: Template) =>
  render((t as unknown as (p: unknown) => React.ReactElement)(t.PreviewProps));

// Every template in the Xarina email design, keyed by name.
const ALL: Record<string, Template> = {
  WaitlistConfirmation,
  PriveEarlyAccess,
  DropLive,
  Restock,
  OrderConfirmation,
  OrderDispatched,
  SignInCode,
  AbandonedCheckout,
  DropReminder,
  SoldOut,
  PriveWelcome,
  PaymentFailed,
  OrderCancelled,
  OrderDelivered,
  PreorderUpdate,
  Teaser,
  Story,
  Styling,
  Occasion,
  Welcome,
  Winback,
  StaffInvitation,
  DropNotification,
} as unknown as Record<string, Template>;

// Marketing mail needs marketing consent and an unsubscribe link (rule 12).
const MARKETING = ["AbandonedCheckout", "Teaser", "Story", "Styling", "Occasion", "Welcome", "Winback"];
// Privé mail uses Noir & Champagne.
const PRIVE = ["PriveEarlyAccess", "PriveWelcome"];

describe("email templates", () => {
  for (const [name, template] of Object.entries(ALL)) {
    it(`${name} renders and follows the voice rules`, async () => {
      const html = await asRender(template);
      const text = visibleText(html);
      expect(text).not.toContain("!");
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      // No unfilled design placeholders such as [First name] ever ship.
      expect(text).not.toMatch(/\[[A-Z][^\]]*\]/);
      expect(html).toContain("/email-assets/mark.png");
    });
  }

  it("marketing emails carry an unsubscribe link", async () => {
    for (const name of MARKETING) {
      expect(await asRender(ALL[name]), name).toContain("Unsubscribe");
    }
  });

  it("Privé emails use the dark theme and the rest use the light one", async () => {
    for (const [name, template] of Object.entries(ALL)) {
      if (name === "DropNotification") continue;
      const html = (await asRender(template)).toLowerCase();
      const dark = PRIVE.includes(name);
      expect(html.includes(brandColour("surface", "dark").toLowerCase()), name).toBe(dark);
    }
  });

  it("only the payment failure email uses the critical colour", async () => {
    const critical = brandColour("critical", "light").toLowerCase();
    for (const [name, template] of Object.entries(ALL)) {
      const html = (await asRender(template)).toLowerCase();
      expect(html.includes(critical), name).toBe(name === "PaymentFailed");
    }
  });

  it("waitlist confirmation names the design and respects the alert choice", async () => {
    const base = (WaitlistConfirmation as unknown as { PreviewProps: Record<string, unknown> }).PreviewProps;
    const on = visibleText(await render(WaitlistConfirmation({ ...base, dropAlerts: true } as never)));
    expect(on).toContain("The Atelier Dress");
    expect(on).toContain("We will email you the moment");

    const off = visibleText(await render(WaitlistConfirmation({ ...base, dropAlerts: false } as never)));
    expect(off).toContain("will not email you when it opens");
  });

  it("drop notifications pick the Privé or public email by kind and keep the link", async () => {
    const props = {
      ...(DropNotification as unknown as { PreviewProps: Record<string, unknown> }).PreviewProps,
      url: "https://x.test/go",
    };
    const vip = await render(DropNotification({ ...props, kind: "vip_invite" } as never));
    const pub = await render(DropNotification({ ...props, kind: "public_launch" } as never));
    expect(vip).toContain("https://x.test/go");
    expect(pub).toContain("https://x.test/go");
    expect(vip.toLowerCase()).toContain(brandColour("surface", "dark").toLowerCase());
    expect(pub.toLowerCase()).toContain(brandColour("surface", "light").toLowerCase());
  });
});
