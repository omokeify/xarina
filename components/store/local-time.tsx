"use client";

/**
 * A UTC timestamp shown in the visitor's own time zone (DROP-1). The server
 * renders a neutral UTC string; the browser's local format replaces it.
 */
export function LocalTime({ iso, withTime = true }: { iso: string; withTime?: boolean }) {
  const date = new Date(iso);
  const text = date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" } : {}),
  });
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
