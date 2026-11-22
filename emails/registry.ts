import AbandonedCheckout from "./abandoned-checkout";
import DropLive from "./drop-live";
import DropReminder from "./drop-reminder";
import Occasion from "./occasion";
import OrderCancelled from "./order-cancelled";
import OrderConfirmation from "./order-confirmation";
import OrderDelivered from "./order-delivered";
import OrderDispatched from "./order-dispatched";
import PaymentFailed from "./payment-failed";
import PreorderUpdate from "./preorder-update";
import PriveEarlyAccess from "./prive-early-access";
import PriveWelcome from "./prive-welcome";
import Restock from "./restock";
import SignInCode from "./sign-in-code";
import SoldOut from "./sold-out";
import StaffInvitation from "./staff-invitation";
import Story from "./story";
import Styling from "./styling";
import Teaser from "./teaser";
import WaitlistConfirmation from "./waitlist-confirmation";
import Welcome from "./welcome";
import Winback from "./winback";

export type RegisteredTemplate = ((props: never) => React.ReactElement) & { PreviewProps: unknown };

/** Every email in the Xarina design, keyed by name. Used by tests and the dev test-send route. */
export const EMAIL_TEMPLATES = {
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
} as unknown as Record<string, RegisteredTemplate>;
