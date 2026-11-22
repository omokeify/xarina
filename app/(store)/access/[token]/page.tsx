import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { redeemAccessLink } from "@/lib/prive/actions";

export const metadata: Metadata = {
  title: "Xarina Privé",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * VIP-2: personal single-use link. Opening the page does NOT spend it, because
 * email scanners and link previews load URLs; only pressing the button does.
 */
export default async function AccessLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const redeem = redeemAccessLink.bind(null, token);

  return (
    <div className="bg-surface text-ink transition-colors duration-200">
      <section className="px-space-4 py-space-7 mx-auto max-w-xl text-center">
        <p className="label text-accent">Xarina Privé</p>
        <h1 className="mt-space-3 font-display text-display-m">Your private access</h1>
        <p className="mt-space-3 text-body text-ink-muted">
          This link is personal to you and works once. Continue to shop before everyone else.
        </p>
        <form action={redeem} className="mt-space-6">
          <Button type="submit" block>
            Enter Privé
          </Button>
        </form>
      </section>
    </div>
  );
}
