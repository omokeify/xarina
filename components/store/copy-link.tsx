"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

/** Copies the permanent product URL (PDP-1, concept detail). */
export function CopyLink({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked: the URL is still visible in the address bar.
        }
      }}
      title="Copy permanent link"
      className="text-caption text-ink-muted hover:text-ink gap-space-1 inline-flex min-h-11 items-center"
    >
      {copied ? <Check aria-hidden className="size-3" /> : <Link2 aria-hidden className="size-3" />}
      <span>{copied ? "Link copied" : label}</span>
    </button>
  );
}
