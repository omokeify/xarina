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
    <div className="px-space-3 md:px-space-5 mx-auto max-w-screen-2xl">
      <header className="gap-space-2 border-line pt-space-5 pb-space-5 flex flex-col border-b">
        <nav aria-label="Breadcrumb" className="text-caption text-ink-muted">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span aria-hidden className="px-space-2">
            /
          </span>
          <span className="text-ink">Drops</span>
        </nav>
        <h1 className="font-display text-display-m md:text-display-l">Drops</h1>
        <p className="text-body text-ink-muted max-w-2xl">
          Limited, numbered runs released on a schedule. Privé members shop each drop first; everyone else can
          join the waitlist for any design.
        </p>
      </header>

      {drops.length === 0 && (
        <p className="py-space-6 text-body text-ink-muted">
          No drops are scheduled yet.{" "}
          <Link href="/shop" className="text-ink underline underline-offset-4">
            Shop available now
          </Link>
        </p>
      )}

      <Group id="open" kicker="Shop now" title="Open now" drops={open} priority />
      <Group
        id="upcoming"
        kicker="Coming next"
        title="Upcoming drops"
        drops={upcoming}
        priority={open.length === 0}
      />
      <Group id="past" kicker="Archive" title="Past drops" drops={past} />
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
      className="scroll-mt-space-7 border-line py-space-5 md:py-space-6 border-b last:border-b-0"
    >
      <div className="mb-space-5 gap-space-1 flex flex-col">
        <p className="label text-ink-muted">{kicker}</p>
        <h2 id={`${id}-heading`} className="font-display text-display-m">
          {title}
        </h2>
      </div>
      <ul className="gap-x-space-4 gap-y-space-6 grid md:grid-cols-2">
        {drops.map((d, i) => (
          <li key={d.id}>
            <DropCard drop={d} priority={priority && i < 2} />
          </li>
        ))}
      </ul>
    </section>
  );
}
