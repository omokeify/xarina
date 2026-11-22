"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { savePage, type PageState } from "../actions";

const initial: PageState = { status: "idle" };

export function PageForm({ page }: { page: { slug: string; title: string; body: string; published: boolean } }) {
  const [state, action, pending] = useActionState(savePage.bind(null, page.slug), initial);

  return (
    <form action={action} className="flex flex-col gap-space-4">
      <fieldset disabled={pending} className="flex flex-col gap-space-4">
        <div className="flex flex-col gap-space-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required maxLength={120} defaultValue={page.title} />
        </div>
        <div className="flex flex-col gap-space-2">
          <Label htmlFor="body">Text</Label>
          <textarea
            id="body"
            name="body"
            defaultValue={page.body}
            maxLength={20000}
            rows={18}
            aria-describedby="body-hint"
            className="w-full rounded-xs border border-line bg-surface-raised p-space-3 text-body text-ink"
          />
          <p id="body-hint" className="text-caption text-ink-muted">
            Plain text. Leave a blank line between paragraphs.
          </p>
        </div>
        <label className="inline-flex min-h-11 items-center gap-space-2 text-body-s">
          <input type="checkbox" name="published" defaultChecked={page.published} className="size-5 accent-ink" />
          Published (shown in the shop and footer)
        </label>
        <div className="sm:max-w-xs">
          <Button type="submit" block>
            {pending ? "Saving" : "Save page"}
          </Button>
        </div>
      </fieldset>
      <p
        role="status"
        aria-live="polite"
        className={state.status === "error" ? "text-body-s text-critical" : "text-body-s text-ink-muted"}
      >
        {state.status === "saved" ? "Saved. The page is updated." : state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
