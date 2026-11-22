"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { savePage, type PageState } from "../actions";

const initial: PageState = { status: "idle" };

export function PageForm({ page }: { page: { slug: string; title: string; body: string; published: boolean } }) {
  const [state, action, pending] = useActionState(savePage.bind(null, page.slug), initial);

  return (
    <form action={action} className="gap-space-4 flex flex-col">
      <fieldset disabled={pending} className="gap-space-4 flex flex-col">
        <div className="gap-space-1 flex flex-col">
          <Label htmlFor="title" className="label text-ink-muted">
            Page Title
          </Label>
          <Input id="title" name="title" required maxLength={120} defaultValue={page.title} />
        </div>
        <div className="gap-space-1 flex flex-col">
          <Label htmlFor="body" className="label text-ink-muted">
            Editorial Copy
          </Label>
          <textarea
            id="body"
            name="body"
            defaultValue={page.body}
            maxLength={20000}
            rows={16}
            aria-describedby="body-hint"
            className="w-full border border-line bg-surface p-space-3 text-body-s text-ink font-sans leading-relaxed focus:border-ink focus:outline-none transition-colors"
          />
          <p id="body-hint" className="text-caption text-ink-muted">
            Plain text. Leave a blank line between paragraphs.
          </p>
        </div>
        <label className="inline-flex min-h-11 items-center gap-space-2 text-body-s cursor-pointer select-none">
          <input type="checkbox" name="published" defaultChecked={page.published} className="size-4 accent-ink" />
          <span className="text-body-s text-ink">Published (visible in storefront navigation and footer)</span>
        </label>
        <div className="sm:max-w-xs pt-space-2">
          <Button type="submit" block className="h-11">
            {pending ? "Saving…" : "Save Page"}
          </Button>
        </div>
      </fieldset>
      <p
        role="status"
        aria-live="polite"
        className={state.status === "error" ? "text-body-s text-critical font-medium" : "text-body-s text-ink-muted"}
      >
        {state.status === "saved" ? "Saved. The page is updated." : state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
