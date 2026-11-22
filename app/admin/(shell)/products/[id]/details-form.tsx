"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminProductRow } from "@/lib/admin/products";
import { saveDetails, type ActionState } from "../actions";
import { Field, FormStatus } from "../_components/form-parts";

const initial: ActionState = { status: "idle" };
const textarea =
  "min-h-28 w-full rounded-none border border-line bg-surface p-space-3 text-body-s text-ink focus:border-ink focus:outline-none transition-colors";
const select =
  "h-11 w-full rounded-none border border-line bg-surface px-space-3 text-body-s text-ink focus:border-ink focus:outline-none transition-colors";

export function DetailsForm({
  product,
  collections,
  canPublish,
}: {
  product: AdminProductRow;
  collections: { id: string; name: string }[];
  canPublish: boolean;
}) {
  const [state, action, pending] = useActionState(saveDetails.bind(null, product.id), initial);
  const [slug, setSlug] = useState(product.slug);
  const slugChangedAfterPublish = product.published_at !== null && slug !== product.slug;

  return (
    <form action={action} className="gap-space-4 flex flex-col">
      <fieldset disabled={pending} className="gap-space-4 grid md:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required maxLength={120} defaultValue={product.name} />
        </Field>
        <Field label="Collection" htmlFor="collection_id">
          <select
            id="collection_id"
            name="collection_id"
            defaultValue={product.collection_id ?? ""}
            className={select}
          >
            <option value="">No collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Web address" htmlFor="slug" hint={`/p/${slug}`}>
            <Input
              id="slug"
              name="slug"
              required
              maxLength={80}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              aria-describedby={slugChangedAfterPublish ? "slug-warning" : undefined}
            />
          </Field>
          {slugChangedAfterPublish && (
            <p
              id="slug-warning"
              role="note"
              className="mt-space-2 border-ink pl-space-3 text-body-s border-l-2"
            >
              This product has been published. Ads and shared links use /p/{product.slug}; that address will
              keep redirecting here permanently, and no other product can take it.
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <Field label="Description" htmlFor="description">
            <textarea
              id="description"
              name="description"
              maxLength={4000}
              defaultValue={product.description}
              className={textarea}
            />
          </Field>
        </div>
        <Field label="Fabric" htmlFor="fabric">
          <textarea
            id="fabric"
            name="fabric"
            maxLength={500}
            defaultValue={product.fabric}
            className={textarea}
          />
        </Field>
        <Field label="Care" htmlFor="care">
          <textarea id="care" name="care" maxLength={500} defaultValue={product.care} className={textarea} />
        </Field>
        <Field label="Fit guidance" htmlFor="fit_notes">
          <textarea
            id="fit_notes"
            name="fit_notes"
            maxLength={1000}
            defaultValue={product.fit_notes}
            className={textarea}
          />
        </Field>
        <Field
          label="Delivery timing"
          htmlFor="delivery_timing"
          hint="For example: Ships in 3–5 working days."
        >
          <textarea
            id="delivery_timing"
            name="delivery_timing"
            maxLength={300}
            defaultValue={product.delivery_timing}
            className={textarea}
          />
        </Field>
        {canPublish && (
          <Field
            label="Status"
            htmlFor="status"
            hint="Published products appear in the shop. Drop products also follow the drop's times."
          >
            <select id="status" name="status" defaultValue={product.status} className={select}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </Field>
        )}
        <div className="flex items-end md:col-span-2">
          <Button type="submit" size="sm">
            {pending ? "Saving" : "Save details"}
          </Button>
        </div>
      </fieldset>
      <FormStatus state={state} />
    </form>
  );
}
