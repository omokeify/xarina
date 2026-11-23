import Link from "next/link";
import { Mark } from "@/components/brand/logo";

/**
 * Xarina Privé Noir & Champagne showcase band matching the client mockup:
 * - Deep Noir background with champagne accents (data-theme="prive")
 * - Sculptural custom Xarina Mark at the top in champagne
 * - Heading: "Xarina Privé" in editorial Cormorant Garamond serif
 * - Subtitle: "First access. Exceptional pieces." in italic serif
 * - Explanatory membership copy
 * - Dual CTAs: "DISCOVER PRIVÉ" (gold solid) and "MEMBER SIGN IN" (outlined)
 */
export function PriveShowcase() {
  return (
    <section
      data-theme="prive"
      aria-labelledby="prive-showcase-heading"
      className="bg-surface text-ink py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative overflow-hidden border-b border-line"
    >
      <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center text-center">
        {/* Sculptural Champagne Monogram Mark */}
        <div className="mb-5 flex items-center justify-center">
          <Mark size={40} className="text-accent" />
        </div>

        {/* Title */}
        <h2
          id="prive-showcase-heading"
          className="font-display italic text-[40px] sm:text-[48px] md:text-[56px] text-ink font-normal tracking-tight leading-tight"
        >
          Xarina Privé
        </h2>

        {/* Subtitle in Italic Serif */}
        <p className="font-display italic text-title sm:text-[22px] md:text-[24px] text-accent mt-2 sm:mt-2.5 mb-3.5 font-normal">
          First access. Exceptional pieces.
        </p>

        {/* Explanatory Membership Copy */}
        <p className="text-body-s sm:text-body text-ink-muted max-w-lg leading-relaxed mb-8">
          Members shop every drop before it opens to the public, with a personal access link for each release.
        </p>

        {/* Dual Actions: Solid Gold Discover + Outlined Sign In */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full max-w-md">
          <Link
            href="/prive"
            className="w-full sm:w-auto flex-1 min-w-[170px] bg-accent hover:bg-accent/90 text-on-action label text-[11px] sm:text-[12px] tracking-[0.22em] font-semibold py-3.5 px-6 text-center transition-colors shadow-sm"
          >
            DISCOVER PRIVÉ
          </Link>
          <Link
            href="/prive/sign-in"
            className="w-full sm:w-auto flex-1 min-w-[170px] border border-line hover:border-ink bg-transparent text-ink label text-[11px] sm:text-[12px] tracking-[0.22em] font-medium py-3.5 px-6 text-center transition-colors"
          >
            MEMBER SIGN IN
          </Link>
        </div>
      </div>
    </section>
  );
}
