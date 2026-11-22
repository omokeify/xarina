"use client";

import Link from "next/link";
import { useActionState } from "react";
import { joinDropAlerts, type WaitlistState } from "@/lib/waitlist/actions";

/**
 * Footer "Drop alerts & waitlist" signup (concept layout). Site-wide: covers
 * every future drop. Rule 12: drop-alert and marketing consent are separate,
 * both unticked; the server records each with a timestamp.
 */
export function FooterSignup() {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinDropAlerts, {
    status: "idle",
  });

  if (state.status === "done") {
    return (
      <p role="status" className="text-body-s text-ink border-line py-space-2 border-b">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} noValidate className="gap-space-3 flex flex-col">
      <div className="border-line focus-within:border-ink gap-space-3 flex items-end border-b">
        <label htmlFor="footer-email" className="sr-only">
          Email for drop alerts
        </label>
        <input
          id="footer-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          className="text-body-s text-ink placeholder:text-ink-muted min-h-11 w-full bg-transparent focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="label text-ink min-h-11 shrink-0 disabled:opacity-50"
        >
          {pending ? "Sending" : "Notify me"}
        </button>
      </div>
      <Consent name="dropAlerts">Email me when a new drop opens.</Consent>
      <Consent name="marketing">
        Also send me occasional Xarina editorial and marketing emails (optional).
      </Consent>
      {state.status === "error" && (
        <p role="alert" className="text-caption text-critical">
          {state.message}
        </p>
      )}
      <p className="text-caption text-ink-muted">
        We record when you give each consent, in line with the NDPA (Nigeria) and UK GDPR.{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy notice
        </Link>
        .
      </p>
    </form>
  );
}

function Consent({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <label className="text-caption text-ink-muted gap-space-2 flex min-h-11 cursor-pointer items-start">
      <input type="checkbox" name={name} className="accent-action mt-space-1 size-4 shrink-0" />
      <span>{children}</span>
    </label>
  );
}
