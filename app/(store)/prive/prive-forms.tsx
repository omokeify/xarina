"use client";

import { useActionState, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/input";
import { requestPriveAccess, sendPriveSignInLink, type PriveFormState } from "@/lib/prive/actions";
import { cn } from "@/lib/utils";

const idle: PriveFormState = { status: "idle" };

const TABS = [
  { id: "email", label: "Email sign-in" },
  { id: "link", label: "Access link" },
  { id: "request", label: "Request access" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Feedback({ state }: { state: PriveFormState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "text-body-s py-2 px-3 border",
        state.status === "error"
          ? "text-critical border-critical/40 bg-critical/10"
          : "text-accent border-accent/40 bg-accent/10",
      )}
    >
      {state.message}
    </p>
  );
}

function PanelHeading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5 border-b border-line/40 pb-4">
      <h2 className="font-display italic text-[22px] sm:text-[25px] text-ink font-normal tracking-tight">
        {title}
      </h2>
      <p className="text-body-s text-ink-muted leading-relaxed">{children}</p>
    </div>
  );
}

/** The three ways in, styled with the Xarina Privé luxury aesthetic. */
export function PriveGate() {
  const [tab, setTab] = useState<TabId>("email");
  const base = useId();

  return (
    <div className="flex flex-col gap-6">
      {/* Sleek Underlined Tab Navigation */}
      <div
        role="tablist"
        aria-label="Ways to enter Xarina Privé"
        className="flex items-center justify-center border-b border-line gap-2 sm:gap-6"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`${base}-${t.id}-tab`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`${base}-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "py-3 px-2 sm:px-4 text-[11px] sm:text-[12px] tracking-[0.2em] uppercase font-semibold transition-colors border-b-2 -mb-[1px] cursor-pointer",
              tab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        id={`${base}-${tab}`}
        role="tabpanel"
        aria-labelledby={`${base}-${tab}-tab`}
        className="border border-line/70 bg-surface-raised p-6 sm:p-8 flex flex-col gap-6 shadow-sm"
      >
        {tab === "email" && <SignInPanel />}
        {tab === "link" && <AccessLinkPanel />}
        {tab === "request" && <RequestPanel />}
      </div>
    </div>
  );
}

/** VIP-2: verified email login for approved members. */
function SignInPanel() {
  const [state, action, pending] = useActionState(sendPriveSignInLink, idle);
  return (
    <>
      <PanelHeading title="Verified email sign-in">
        Approved members receive a personal sign-in link by email. It signs you in on this device.
      </PanelHeading>
      {state.status === "done" ? (
        <Feedback state={state} />
      ) : (
        <form action={action} className="gap-5 grid">
          <div className="space-y-2">
            <Label htmlFor="in-email" className="label text-[11px] tracking-[0.2em] uppercase text-ink-muted">
              Approved member email
            </Label>
            <Input
              id="in-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="bg-surface-sunk/40 border-line focus:border-accent text-ink"
            />
          </div>
          <Feedback state={state} />
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-on-action label text-[11px] sm:text-[12px] tracking-[0.22em] font-semibold py-3.5 px-6 text-center transition-colors shadow-sm cursor-pointer mt-1"
          >
            {pending ? "SENDING LINK..." : "EMAIL ME A SIGN-IN LINK →"}
          </button>
        </form>
      )}
    </>
  );
}

/** A personal link is opened, not typed: pasting it here just takes you to it. */
function AccessLinkPanel() {
  const router = useRouter();
  const [error, setError] = useState("");

  function open(formData: FormData) {
    const token = String(formData.get("link") ?? "")
      .trim()
      .split(/[/?#\s]/)
      .filter(Boolean)
      .pop();
    if (!token || !/^[A-Za-z0-9_-]{20,}$/.test(token)) {
      setError("That does not look like a Xarina access link.");
      return;
    }
    router.push(`/access/${token}`);
  }

  return (
    <>
      <PanelHeading title="Personal access link">
        The Xarina team issues single-use personal links for each drop. Open it from your invite, or paste it here.
      </PanelHeading>
      <form action={open} className="gap-5 grid">
        <div className="space-y-2">
          <Label htmlFor="link" className="label text-[11px] tracking-[0.2em] uppercase text-ink-muted">
            Your access link or token
          </Label>
          <Input
            id="link"
            name="link"
            autoComplete="off"
            required
            aria-invalid={!!error}
            className="bg-surface-sunk/40 border-line focus:border-accent text-ink"
          />
        </div>
        {error && (
          <p role="alert" className="text-body-s text-critical py-2 px-3 border border-critical/40 bg-critical/10">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="w-full bg-accent hover:bg-accent/90 text-on-action label text-[11px] sm:text-[12px] tracking-[0.22em] font-semibold py-3.5 px-6 text-center transition-colors shadow-sm cursor-pointer mt-1"
        >
          CONTINUE TO PRIVÉ →
        </button>
      </form>
    </>
  );
}

/** VIP-1: ask for access. Drop alerts are a separate, unticked box (rule 12). */
function RequestPanel() {
  const [state, action, pending] = useActionState(requestPriveAccess, idle);
  return (
    <>
      <PanelHeading title="Request Xarina Privé access">
        Our team individually approves and verifies members before each release.
      </PanelHeading>
      {state.status === "done" ? (
        <Feedback state={state} />
      ) : (
        <form action={action} className="gap-5 grid">
          <div className="space-y-2">
            <Label htmlFor="req-name" className="label text-[11px] tracking-[0.2em] uppercase text-ink-muted">
              Full name
            </Label>
            <Input
              id="req-name"
              name="name"
              autoComplete="name"
              required
              className="bg-surface-sunk/40 border-line focus:border-accent text-ink"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="req-email" className="label text-[11px] tracking-[0.2em] uppercase text-ink-muted">
              Email address
            </Label>
            <Input
              id="req-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="bg-surface-sunk/40 border-line focus:border-accent text-ink"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="req-phone" className="label text-[11px] tracking-[0.2em] uppercase text-ink-muted">
              WhatsApp or phone (optional)
            </Label>
            <Input
              id="req-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className="bg-surface-sunk/40 border-line focus:border-accent text-ink"
            />
          </div>
          <label className="gap-3 text-body-s text-ink flex min-h-11 items-center cursor-pointer">
            <input type="checkbox" name="dropAlerts" className="accent-accent size-4 shrink-0 rounded-none cursor-pointer" />
            <span className="text-ink-muted">Email me when a Privé drop opens.</span>
          </label>
          <Feedback state={state} />
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-on-action label text-[11px] sm:text-[12px] tracking-[0.22em] font-semibold py-3.5 px-6 text-center transition-colors shadow-sm cursor-pointer mt-1"
          >
            {pending ? "SUBMITTING REQUEST..." : "REQUEST PRIVÉ MEMBERSHIP →"}
          </button>
        </form>
      )}
    </>
  );
}
