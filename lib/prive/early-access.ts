// Pure helper for the Privé welcome email. The authoritative early-access
// window is each drop's own vip_opens_at → public_opens_at gap; the configured
// value is only a fallback when no future drop is scheduled yet.

export const DEFAULT_EARLY_ACCESS_HOURS = 48;

export function earlyAccessHours(
  drops: ReadonlyArray<{ vip_opens_at: string; public_opens_at: string }>,
  configured?: string | number | null,
): number {
  const windows = drops
    .map((d) => new Date(d.public_opens_at).getTime() - new Date(d.vip_opens_at).getTime())
    .filter((ms) => Number.isFinite(ms) && ms > 0)
    .map((ms) => ms / 3_600_000);
  if (windows.length > 0) return Math.max(1, Math.round(Math.min(...windows)));

  const fallback = typeof configured === "number" ? configured : Number(configured);
  return Number.isFinite(fallback) && fallback >= 1 && fallback <= 168
    ? Math.round(fallback)
    : DEFAULT_EARLY_ACCESS_HOURS;
}
