import { cn } from "@/lib/utils";

// Path copied exactly from docs/brand/xarina-mark-*.svg. Colour comes from the
// current text colour, so it is always a token (ink, or accent on Privé).
const MARK_PATH =
  "M 165 62 L 265 62 C 305 150 322 265 345 352 C 352 378 366 390 395 397 L 392 404 C 350 412 312 412 285 410 C 276 350 262 300 252 262 C 250 310 238 365 226 408 C 190 412 130 410 105 392 C 80 378 70 340 88 300 C 110 250 150 180 172 110 C 176 90 172 72 165 62 Z M 202 98 C 212 150 218 230 222 290 C 224 330 205 352 182 352 C 150 350 140 320 150 290 C 162 245 185 170 202 98 Z";

type MarkProps = {
  /** Height in px. Brand minimum is 16. */
  size?: number;
  className?: string;
  /** Set when the mark is the only content of a link/button. */
  title?: string;
};

export function Mark({ size = 24, className, title }: MarkProps) {
  const height = Math.max(16, size);
  return (
    <svg
      viewBox="50 40 370 390"
      height={height}
      width={(height * 370) / 390}
      className={cn("shrink-0 fill-current", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path fillRule="evenodd" d={MARK_PATH} />
    </svg>
  );
}

/** Wordmark alone. Pass a text-* token class (e.g. text-body-s) to resize. */
export function Wordmark({ className }: { className?: string }) {
  // The trailing letter-spacing is trimmed with a negative margin so it centres.
  return <span className={cn("wordmark text-wordmark -mr-[0.4em]", className)}>Xarina</span>;
}

// Sanctioned lockup sizes: mark height in px, wordmark type token, divider height.
const LOCKUP = {
  // 24px is the smallest mark that may sit beside the wordmark (BRAND.md › Logo).
  sm: { mark: 24, text: "text-body-s", divider: "h-space-4" },
  md: { mark: 28, text: "text-wordmark", divider: "h-space-5" },
  lg: { mark: 44, text: "text-display-m", divider: "h-space-6" },
} as const;

/**
 * Mark beside the wordmark with a hairline divider (BRAND.md › Lockups).
 * The only way the mark and wordmark may appear together.
 */
export function Lockup({ size = "md", className }: { size?: keyof typeof LOCKUP; className?: string }) {
  const s = LOCKUP[size];
  return (
    <span className={cn("inline-flex items-center gap-space-3", className)}>
      <Mark size={s.mark} />
      <span aria-hidden className={cn("w-px bg-line", s.divider)} />
      <Wordmark className={s.text} />
    </span>
  );
}
