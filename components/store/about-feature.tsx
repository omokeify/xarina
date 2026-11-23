import Link from "next/link";
import { ProductImage } from "@/components/store/product-image";

interface AboutFeatureProps {
  image?: {
    cover_path?: string | null;
    path?: string | null;
    alt?: string | null;
    name?: string | null;
  } | null;
}

/**
 * "About Xarina" Maison Story feature matching the client mockup:
 * - Left column: Studio or detail photograph from the existing brand catalogue
 * - Right column: Kicker "ABOUT XARINA", headline "Wearable statement dressing." with gold accent rule,
 *   story copy, and "OUR STORY" underlined link.
 */
export function AboutFeature({ image }: AboutFeatureProps) {
  const imagePath =
    image?.cover_path ?? image?.path ?? "products/20000000-0000-4000-a000-000000000012/cover.jpg";
  const imageAlt = image?.alt ?? image?.name ?? "Xarina atelier craftsmanship and detail";

  return (
    <section
      aria-labelledby="about-feature-heading"
      className="bg-surface text-ink py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 border-b border-line"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 lg:gap-20 items-center">
        {/* Left: Studio / Atelier Detail Photograph */}
        <div className="w-full aspect-[4/3] sm:aspect-[5/4] md:aspect-[4/3] bg-surface-sunk relative overflow-hidden border border-line/60 shadow-xs">
          <ProductImage
            path={imagePath}
            alt={imageAlt}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right: Storytelling & Editorial Pitch */}
        <div className="flex flex-col items-start text-left">
          <p className="label text-ink-muted text-[11px] sm:text-[12px] tracking-[0.24em] uppercase font-semibold mb-2 sm:mb-3">
            ABOUT XARINA
          </p>

          <h2
            id="about-feature-heading"
            className="font-display italic text-[36px] sm:text-[44px] md:text-[50px] leading-[1.05] text-ink font-normal tracking-tight"
          >
            Wearable statement dressing.
          </h2>

          {/* Warm Champagne Gold Accent Bar */}
          <div className="w-12 h-[2px] bg-accent my-4 sm:my-5" />

          <p className="text-body text-ink-muted leading-relaxed max-w-xl">
            Designed for those who enter every room with quiet certainty. Every Xarina silhouette is cut on the bias and produced in strictly numbered runs—never mass-manufactured, and never restocked once archived. We craft garments that command attention without demanding it.
          </p>

          <div className="pt-6 sm:pt-7">
            <Link
              href="/about"
              className="label text-ink hover:text-accent underline underline-offset-8 transition-colors inline-block text-[11px] sm:text-[12px] tracking-[0.22em] font-semibold"
            >
              OUR STORY
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
