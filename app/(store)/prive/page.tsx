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
    <div data-theme="prive" className="bg-surface text-ink min-h-[80dvh] transition-colors duration-200">
      {/* Editorial Hero Header */}
      <section className="border-b border-line px-4 sm:px-6 md:px-8 py-14 sm:py-16 md:py-20 relative overflow-hidden">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
          <p className="label text-accent text-[11px] sm:text-[12px] tracking-[0.24em] uppercase font-semibold mb-2.5 sm:mb-3">
            XARINA PRIVÉ · VERIFIED EARLY ACCESS
          </p>

          <h1 className="font-display italic text-[38px] sm:text-[46px] md:text-[54px] text-ink font-normal tracking-tight leading-tight">
            {member ? "Welcome to Xarina Privé" : "Enter Xarina Privé"}
          </h1>

          {/* Champagne Gold Accent Rule */}
          <div className="w-12 h-[2px] bg-accent my-4 sm:my-5" />

          <p className="text-body-s sm:text-body text-ink-muted max-w-xl leading-relaxed">
            Verified members shop strictly numbered drops before public release. Access is granted via your verified email or personal single-use link.
          </p>

          {member && (
            <div className="mt-6">
              <form action={signOutPrive} className="flex items-center justify-center">
                <button
                  type="submit"
                  className="border border-line hover:border-ink bg-transparent text-ink label text-[11px] tracking-[0.22em] font-medium py-2.5 px-5 transition-colors cursor-pointer"
                >
                  SIGN OUT OF PRIVÉ
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {member ? (
        <section className="px-4 sm:px-6 md:px-8 py-10 sm:py-14 max-w-screen-2xl mx-auto flex flex-col gap-10">
          {window ? (
            <>
              {/* Member Active Window Card */}
              <div className="border border-line/80 bg-surface-raised p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex flex-col items-start gap-2 max-w-xl text-left">
                  <span className="label text-accent text-[11px] tracking-[0.22em] font-semibold uppercase">
                    {window.state === "vip" ? "Privé window open now" : "Next Privé window"}
                  </span>
                  <h2 className="font-display italic text-[30px] sm:text-[36px] text-ink font-normal leading-tight">
                    {window.name}
                  </h2>
                  {window.pitch && (
                    <p className="font-display italic text-[16px] sm:text-[18px] text-accent/90">
                      {window.pitch}
                    </p>
                  )}
                  {window.limitPerMember != null && (
                    <p className="label text-[11px] tracking-wider text-ink-muted uppercase mt-1">
                      Privé allocation: {window.limitPerMember} per design, per member
                    </p>
                  )}
                </div>
                <div className="border-t lg:border-t-0 lg:border-l border-line/60 pt-4 lg:pt-0 lg:pl-8">
                  <Countdown
                    to={window.state === "vip" ? window.publicOpensAt : window.vipOpensAt}
                    serverNow={window.serverNow}
                    label={window.state === "vip" ? "Public release opens in" : "Your Privé access opens in"}
                  />
                </div>
              </div>

              {/* Designs in Drop */}
              <div className="flex flex-col gap-6">
                <div className="flex items-end justify-between border-b border-line/40 pb-4">
                  <div>
                    <p className="label text-accent text-[11px] tracking-[0.22em] font-semibold uppercase mb-1">
                      CURRENT RELEASE
                    </p>
                    <h2 className="font-display italic text-[26px] sm:text-[32px] text-ink font-normal">
                      Designs in this drop
                    </h2>
                  </div>
                  <Link
                    href="/shop#upcoming"
                    className="label text-ink-muted hover:text-accent transition-colors text-[11px] sm:text-[12px] tracking-[0.2em] font-medium underline underline-offset-8"
                  >
                    SCHEDULED DROPS →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {window.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="max-w-xl mx-auto py-12 flex flex-col items-center text-center gap-4">
              <p className="text-body text-ink-muted leading-relaxed">
                You are currently signed in as a verified Privé member. No private access window is scheduled at this moment.
              </p>
              <Link
                href="/shop"
                className="bg-accent hover:bg-accent/90 text-on-action label text-[11px] sm:text-[12px] tracking-[0.22em] font-semibold py-3.5 px-7 transition-colors shadow-sm"
              >
                EXPLORE READY TO SHIP
              </Link>
            </div>
          )}
        </section>
      ) : (
        /* Non-member Gate Section */
        <section className="px-4 sm:px-6 py-12 sm:py-16 mx-auto max-w-xl">
          <PriveGate />
          <p className="font-display italic text-[13px] sm:text-[14px] text-ink-muted/80 mt-6 text-center">
            No shared passwords. Each personal access link works once, exclusively for you.
          </p>
        </section>
      )}
    </div>
  );
}
