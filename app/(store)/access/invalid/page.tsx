import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Link not valid", robots: { index: false, follow: false } };

export default function InvalidAccessLinkPage() {
  return (
    <div className="bg-surface text-ink transition-colors duration-200">
      <section className="px-space-4 py-space-7 mx-auto max-w-xl text-center">
        <h1 className="font-display text-display-m">This link can no longer be used</h1>
        <p className="mt-space-3 text-body text-ink-muted">
          Access links work once and expire. Sign in with your email instead, or contact us for a new link.
        </p>
        <Button asChild className="mt-space-6" block>
          <Link href="/prive">Privé sign in</Link>
        </Button>
      </section>
    </div>
  );
}
