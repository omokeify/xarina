import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/store/countdown";
import { ProductCard } from "@/components/store/product-card";
import { signOutPrive } from "@/lib/prive/actions";
import { isPriveMember } from "@/lib/prive/session";
import { getPriveWindow } from "@/lib/prive/window";
import { PriveGate } from "./prive-forms";

export const metadata: Metadata = {
  title: "Xarina Privé",
  description: "Privé members shop every drop first, before it opens to everyone.",
};

export default async function PrivePage() {
  const member = await isPriveMember();
  const window = member ? await getPriveWindow() : null;

  return (
    <div className="bg-surface text-ink min-h-[70dvh] transition-colors duration-200">
      <section className="border-line px-space-3 pt-space-6 pb-space-5 md:px-space-6 mx-auto max-w-screen-2xl border-b">
        <div className="gap-space-4 flex flex-col md:flex-row md:items-end md:justify-between">
          <div className="gap-space-3 flex max-w-2xl flex-col">
            <p className="label text-accent">Xarina Privé · Verified early access</p>
            <h1 className="font-display text-display-m md:text-display-l">
              {member ? "Welcome to Xarina Privé" : "Enter Xarina Privé"}
            </h1>
            <span aria-hidden className="w-space-5 bg-accent h-0.5" />
            <p className="text-body text-ink-muted">
              Verified members shop limited drops before they open to everyone. There is no shared password:
              access is tied to your approved email or a personal single-use link.
            </p>
          </div>
          {member && (
            <form action={signOutPrive} className="flex items-center">
              <Button type="submit" variant="secondary" size="sm">
                Sign out
              </Button>
            </form>
          )}
        </div>
      </section>

      {member ? (
        <section className="px-space-3 py-space-6 md:px-space-6 gap-space-6 mx-auto flex max-w-screen-2xl flex-col">
          {window ? (
            <>
              <div className="border-line p-space-4 md:p-space-5 gap-space-5 flex flex-col border lg:flex-row lg:items-center lg:justify-between">
                <div className="gap-space-2 flex max-w-xl flex-col">
                  <p className="label text-accent">
                    {window.state === "vip" ? "Privé window open now" : "Next Privé window"}
                  </p>
                  <h2 className="font-display text-display-m">{window.name}</h2>
                  {window.pitch && <p className="text-body text-ink-muted">{window.pitch}</p>}
                  {window.limitPerMember != null && (
                    <p className="text-body-s text-ink-muted">
                      Privé limit: {window.limitPerMember} per design, per member.
                    </p>
                  )}
                </div>
                <Countdown
                  to={window.state === "vip" ? window.publicOpensAt : window.vipOpensAt}
                  serverNow={window.serverNow}
                  label={window.state === "vip" ? "Public release opens in" : "Your Privé access opens in"}
                />
              </div>

              <div className="gap-space-4 flex flex-col">
                <div className="flex items-end justify-between">
                  <h2 className="font-display text-title">Designs in this drop</h2>
                  <Link
                    href="/shop#upcoming"
                    className="text-body-s text-ink-muted hover:text-ink underline underline-offset-4"
                  >
                    View all scheduled drops
                  </Link>
                </div>
                <div className="gap-space-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {window.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="gap-space-4 flex max-w-xl flex-col">
              <p role="status" className="text-body">
                You are signed in as a Privé member. No Privé window is scheduled right now.
              </p>
              <Button asChild>
                <Link href="/shop">Shop Xarina</Link>
              </Button>
            </div>
          )}
        </section>
      ) : (
        <section className="px-space-3 py-space-6 mx-auto max-w-xl">
          <PriveGate />
          <p className="text-caption text-ink-muted mt-space-4 text-center">
            No shared passwords. Your link works once, and only for you.
          </p>
        </section>
      )}
    </div>
  );
}
