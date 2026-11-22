"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/admin/products";
import { createProduct, type ActionState } from "../actions";
import { Field, FormStatus } from "../_components/form-parts";

const initial: ActionState = { status: "idle" };

export function NewProductForm({ collections }: { collections: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createProduct, initial);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={action} className="gap-space-4 flex flex-col">
      <fieldset disabled={pending} className="gap-space-4 flex flex-col">
        <Field label="Name" htmlFor="name">
          <Input
            id="name"
            name="name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="Web address" htmlFor="slug" hint={`/p/${slug || "…"} · permanent once published`}>
          <Input
            id="slug"
            name="slug"
            maxLength={80}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
          />
        </Field>
        <Field label="Collection" htmlFor="collection_id">
          <select
            id="collection_id"
            name="collection_id"
            defaultValue=""
            className="border-line bg-surface-raised px-space-3 text-body h-12 w-full rounded-xs border"
          >
            <option value="">No collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:max-w-xs">
          <Button type="submit" block>
            {pending ? "Creating" : "Create draft"}
          </Button>
        </div>
      </fieldset>
      <FormStatus state={state} />
    </form>
  );
}
