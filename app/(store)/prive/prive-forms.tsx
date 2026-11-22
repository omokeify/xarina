"use client";

import { useActionState, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
      className={state.status === "error" ? "text-body-s text-critical" : "text-body-s text-ink"}
    >
      {state.message}
    </p>
  );
}

function PanelHeading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="gap-space-2 flex flex-col">
      <h2 className="font-display text-title">{title}</h2>
      <p className="text-body-s text-ink-muted">{children}</p>
    </div>
  );
}

/** The three ways in, as in the concept: email, personal link, or ask for access. */
export function PriveGate() {
  const [tab, setTab] = useState<TabId>("email");
  const base = useId();

  return (
    <div className="gap-space-5 flex flex-col">
      <div
        role="tablist"
        aria-label="Ways to enter Xarina Privé"
        className="border-line grid grid-cols-3 border"
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
              "label px-space-2 py-space-2 min-h-11 text-center leading-4 transition-colors",
              tab === t.id ? "bg-action text-on-action" : "text-ink-muted hover:text-ink",
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
        className="border-line p-space-4 md:p-space-5 gap-space-4 flex flex-col border"
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
        Approved members receive a sign-in link by email. It signs you in on this device.
      </PanelHeading>
      {state.status === "done" ? (
        <Feedback state={state} />
      ) : (
        <form action={action} className="gap-space-4 grid">
          <div className="space-y-space-1">
            <Label htmlFor="in-email">Approved member email</Label>
            <Input id="in-email" name="email" type="email" autoComplete="email" required />
          </div>
          <Feedback state={state} />
          <Button type="submit" block disabled={pending}>
            {pending ? "Sending" : "Email me a sign-in link"}
          </Button>
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
        The Xarina team can send you a link made for you alone. It works once and expires, and it cannot be
        shared. Open it from your email, or paste it here.
      </PanelHeading>
      <form action={open} className="gap-space-4 grid">
        <div className="space-y-space-1">
          <Label htmlFor="link">Your access link</Label>
          <Input id="link" name="link" autoComplete="off" required aria-invalid={!!error} />
        </div>
        {error && (
          <p role="alert" className="text-body-s text-critical">
            {error}
          </p>
        )}
        <Button type="submit" block>
          Continue
        </Button>
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
        Our team reviews every request before each drop.
      </PanelHeading>
      {state.status === "done" ? (
        <Feedback state={state} />
      ) : (
        <form action={action} className="gap-space-4 grid">
          <div className="space-y-space-1">
            <Label htmlFor="req-name">Full name</Label>
            <Input id="req-name" name="name" autoComplete="name" required />
          </div>
          <div className="space-y-space-1">
            <Label htmlFor="req-email">Email</Label>
            <Input id="req-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-space-1">
            <Label htmlFor="req-phone">WhatsApp or phone (optional)</Label>
            <Input id="req-phone" name="phone" type="tel" autoComplete="tel" />
          </div>
          <label className="gap-space-3 text-body-s text-ink flex min-h-11 items-center">
            <input type="checkbox" name="dropAlerts" className="accent-action size-4 shrink-0 rounded-none" />
            <span>Email me when a Privé drop opens.</span>
          </label>
          <Feedback state={state} />
          <Button type="submit" block disabled={pending}>
            {pending ? "Sending" : "Request access"}
          </Button>
        </form>
      )}
    </>
  );
}
