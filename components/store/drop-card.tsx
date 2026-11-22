import Link from "next/link";
import type { DropState } from "@/lib/catalogue";
import { dropImage, type DropSummary } from "@/lib/drops-public";
import { cn } from "@/lib/utils";
import { ProductImage } from "./product-image";
import { LocalTime } from "./local-time";

export const DROP_STATE_LABEL: Record<DropState, string> = {
  upcoming: "Upcoming drop",
  vip: "Privé early access",
  public: "Open now",
  closed: "Closed",
};

/** Drop card for /drops and "More drops": photo, state badge, name, pitch, key date. */
export function DropCard({ drop, priority = false }: { drop: DropSummary; priority?: boolean }) {
  const image = dropImage(drop);
  const when =
    drop.state === "upcoming"
      ? { label: "Privé opens", iso: drop.vip_opens_at }
      : drop.state === "vip"
        ? { label: "Opens to everyone", iso: drop.public_opens_at }
        : drop.state === "public" && drop.closes_at
          ? { label: "Closes", iso: drop.closes_at }
          : drop.state === "closed"
            ? { label: "Opened", iso: drop.public_opens_at }
            : null;

  return (
    <Link href={`/drops/${drop.slug}`} className="group gap-space-3 flex flex-col">
      <div className="relative">
        <ProductImage
          path={image.path}
          alt={image.alt}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority={priority}
          className={cn(
            "aspect-[4/3] transition-opacity group-hover:opacity-90",
            drop.state === "closed" && "opacity-80",
          )}
        />
        <span
          data-theme={drop.state === "vip" ? "prive" : undefined}
          className={cn(
            "label top-space-3 left-space-3 px-space-2 py-space-1 absolute",
            drop.state === "vip" ? "bg-accent text-on-action" : "bg-surface",
            drop.state === "closed" ? "text-ink-muted" : drop.state !== "vip" && "text-ink",
          )}
        >
          {DROP_STATE_LABEL[drop.state]}
        </span>
      </div>
      <div className="gap-space-1 flex flex-col">
        <h3 className="font-display text-title group-hover:underline group-hover:underline-offset-4">
          {drop.name}
        </h3>
        {drop.pitch && <p className="text-body-s text-ink-muted line-clamp-2">{drop.pitch}</p>}
        <p className="text-caption text-ink-muted">
          {when && (
            <>
              {when.label} <LocalTime iso={when.iso} withTime={drop.state !== "closed"} />
            </>
          )}
          {when && drop.design_count > 0 && " · "}
          {drop.design_count > 0 && `${drop.design_count} ${drop.design_count === 1 ? "design" : "designs"}`}
        </p>
      </div>
    </Link>
  );
}
