import { ProductImage } from "./product-image";
import { HeroVideo } from "./hero-video";

export type HeroMedia =
  { kind: "video"; playbackId: string; alt: string } | { kind: "image"; path: string; alt: string } | null;

/**
 * Full-bleed hero (concept layout), shared by the homepage and drop pages: photo
 * or movement video edge to edge, text bottom-left over a scrim, countdown
 * bottom-right on a solid Noir panel. The scrim follows `theme`; it fades in
 * above the text and is ≥90% opaque behind every line, so 4.5:1 holds on any
 * photograph (BRAND.md › Approved exceptions). Without media, a quiet panel.
 */
export function HeroFrame({
  media,
  theme,
  countdown,
  children,
}: {
  media: HeroMedia;
  theme: "ivory" | "prive";
  countdown: React.ReactNode;
  children: React.ReactNode;
}) {
  const themeAttr = theme === "prive" ? "prive" : undefined;
  const text = <div className="gap-space-3 flex max-w-2xl flex-col">{children}</div>;
  const timer = countdown && (
    <div data-theme="prive" className="bg-surface text-ink px-space-4 py-space-3 self-start lg:self-end">
      {countdown}
    </div>
  );

  if (!media) {
    return (
      <section
        aria-labelledby="hero-heading"
        data-theme={themeAttr}
        className="border-line bg-surface text-ink border-b"
      >
        <div className="gap-space-5 px-space-3 py-space-7 md:px-space-5 mx-auto flex max-w-screen-2xl flex-col lg:flex-row lg:items-end lg:justify-between">
          {text}
          {timer}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="hero-heading"
      className="bg-surface-sunk relative flex min-h-[640px] flex-col justify-end overflow-hidden md:h-[88svh]"
    >
      <div className="absolute inset-0">
        {media.kind === "video" ? (
          <HeroVideo playbackId={media.playbackId} alt={media.alt} className="absolute inset-0" />
        ) : (
          <ProductImage
            path={media.path}
            alt={media.alt}
            sizes="100vw"
            priority
            className="absolute inset-0 aspect-auto h-full"
          />
        )}
      </div>
      <div data-theme={themeAttr} className="text-ink relative">
        <div aria-hidden className="from-surface/90 h-space-7 bg-gradient-to-t to-transparent" />
        <div className="bg-surface/90">
          <div className="gap-space-5 px-space-3 pb-space-5 md:px-space-5 md:pb-space-6 mx-auto flex max-w-screen-2xl flex-col lg:flex-row lg:items-end lg:justify-between">
            {text}
            {timer}
          </div>
        </div>
      </div>
    </section>
  );
}
