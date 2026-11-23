import type { Metadata } from "next";
import Link from "next/link";
import { DropCard } from "@/components/store/drop-card";
import { getDrops, type DropSummary } from "@/lib/drops-public";

export const metadata: Metadata = {
  title: "Drops",
  description: "Limited, numbered drops: open now, coming next, and the archive.",
};

// Drop state changes by the clock (DROP-2): always render fresh.
export const dynamic = "force-dynamic";

/** /drops: every published drop, grouped by state. Closed drops stay as an archive. */
export default async function DropsPage() {
  const drops = await getDrops();
  const open = drops.filter((d) => d.state === "vip" || d.state === "public");
  // Soonest first for what's coming; newest first (the RPC order) for the rest.
  const upcoming = drops
    .filter((d) => d.state === "upcoming")
    .sort((a, b) => Date.parse(a.vip_opens_at) - Date.parse(b.vip_opens_at));
  const past = drops.filter((d) => d.state === "closed");

  return (
    <div className="px-space-4 sm:px-space-6 md:px-space-8 mx-auto max-w-screen-2xl">
      <header className="border-line pt-10 pb-8 sm:pt-14 sm:pb-12 flex flex-col items-center text-center border-b">
        <nav aria-label="Breadcrumb" className="label text-[10px] sm:text-[11px] tracking-[0.2em] text-ink-muted uppercase mb-3">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span aria-hidden className="px-2">
            /
          </span>
          <span className="text-ink">Drops</span>
        </nav>
        <h1 className="font-display italic text-[42px] sm:text-[54px] md:text-[64px] text-ink font-normal tracking-tight leading-none">
          Limited Drops
        </h1>
        <div className="w-12 h-[2px] bg-accent my-3.5" />
        <p className="font-display italic text-body-s sm:text-title text-ink-muted max-w-xl leading-relaxed">
          Limited, strictly numbered runs released on a schedule. Privé members shop each drop first; everyone else can join the waitlist for any design.
        </p>
      </header>

      {drops.length === 0 && (
        <p className="py-space-7 text-center font-display italic text-title text-ink-muted">
          No drops are scheduled yet.{" "}
          <Link href="/shop" className="text-ink underline underline-offset-4 hover:text-accent transition-colors">
            Shop available now
          </Link>
        </p>
      )}

      <Group id="open" kicker="Shop now" title="Open Now" drops={open} priority />
      <Group
        id="upcoming"
        kicker="Coming next"
        title="Upcoming Drops"
        drops={upcoming}
        priority={open.length === 0}
      />
      <Group id="past" kicker="Archive" title="Past Drops" drops={past} />
    </div>
  );
}

function Group({
  id,
  kicker,
  title,
  drops,
  priority = false,
}: {
  id: string;
  kicker: string;
  title: string;
  drops: DropSummary[];
  priority?: boolean;
}) {
  if (drops.length === 0) return null;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-space-7 border-line py-10 sm:py-14 border-b last:border-b-0"
    >
      <div className="mb-8 flex items-center justify-between">
        <div className="flex flex-col items-start">
          <p className="label text-accent text-[11px] tracking-[0.22em] uppercase font-semibold mb-1">
            {kicker}
          </p>
          <h2 id={`${id}-heading`} className="font-display italic text-[30px] sm:text-[38px] text-ink font-normal tracking-tight">
            {title}
          </h2>
        </div>
      </div>
      <ul className="gap-x-space-6 gap-y-space-8 grid md:grid-cols-2">
        {drops.map((d, i) => (
          <li key={d.id}>
            <DropCard drop={d} priority={priority && i < 2} />
          </li>
        ))}
      </ul>
    </section>
  );
}
