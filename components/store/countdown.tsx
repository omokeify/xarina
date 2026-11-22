"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { countdownParts } from "@/lib/drop-display";
import { cn } from "@/lib/utils";

/**
 * Live countdown driven by SERVER time (DROP-2): the offset between the
 * database clock and this device is measured once, so a wrong phone clock
 * doesn't change the countdown. At zero the page refreshes to pick up the new
 * drop state from the server.
 */
export function Countdown({
  to,
  serverNow,
  label,
  className,
}: {
  to: string;
  serverNow: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const target = Date.parse(to);
  const [offset] = useState(() => Date.parse(serverNow) - Date.now());
  // Render the server-time value first so the HTML matches on hydration.
  const [remaining, setRemaining] = useState(() => target - Date.parse(serverNow));

  useEffect(() => {
    const tick = () => setRemaining(target - (Date.now() + offset));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, offset]);

  const parts = countdownParts(remaining);
  useEffect(() => {
    if (parts.done) {
      // Small grace so the database clock has definitely passed the boundary.
      const id = setTimeout(() => router.refresh(), 1500);
      return () => clearTimeout(id);
    }
  }, [parts.done, router]);

  const units = [
    { value: parts.days, unit: "Days" },
    { value: parts.hours, unit: "Hours" },
    { value: parts.minutes, unit: "Min" },
    { value: parts.seconds, unit: "Sec" },
  ];
  const opens = new Date(target);

  return (
    <div className={cn("gap-space-2 flex flex-col", className)}>
      <p className="label text-ink-muted">{label}</p>
      <div
        role="timer"
        aria-live="off"
        aria-label={`${label} ${parts.days} days ${parts.hours} hours ${parts.minutes} minutes`}
        className="gap-space-2 flex items-start"
      >
        {units.map(({ value, unit }, i) => (
          <div key={unit} className="gap-space-2 flex items-start">
            {i > 0 && <span aria-hidden className="bg-accent mt-[18px] size-1 rounded-full" />}
            <div className="flex min-w-12 flex-col items-center">
              <span className="font-display text-display-m tabular-nums">
                {String(value).padStart(2, "0")}
              </span>
              <span className="label text-ink-muted">{unit}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-caption text-ink-muted">
        <time dateTime={to} suppressHydrationWarning>
          {opens.toLocaleString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })}
        </time>
      </p>
    </div>
  );
}
