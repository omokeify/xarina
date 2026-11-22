"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/store/product-image";
import { Input, Label } from "@/components/ui/input";
import { slugify } from "@/lib/admin/products";
import { saveDrop, type DropFormState } from "./actions";

export type DropDefaults = {
  id: string | null;
  name: string;
  slug: string;
  hero_storage_path: string | null;
  hero_alt: string;
  pitch: string;
  vip_opens_at: string | null;
  public_opens_at: string | null;
  closes_at: string | null;
  vip_limit_per_member: number | null;
  on_close: "move_to_available" | "hide";
  published: boolean;
};

/** UTC ISO -> value for <input type="datetime-local"> in the viewer's timezone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value (viewer's timezone) -> UTC ISO, or "" if empty or invalid. */
function toUtcIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function TimeField({
  name,
  label,
  hint,
  value,
  onChange,
  required,
  error,
}: {
  name: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-space-1">
      <Label htmlFor={`${name}-local`}>{label}</Label>
      <Input
        id={`${name}-local`}
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={!!error}
      />
      <input type="hidden" name={name} value={toUtcIso(value)} />
      {hint && <p className="text-body-s text-ink-muted">{hint}</p>}
      {error && <p className="text-body-s text-critical">{error}</p>}
    </div>
  );
}

/** ADM-4 / DROP-1: times are entered in your timezone and stored in UTC. */
export function DropForm({ drop }: { drop: DropDefaults }) {
  const [state, action, pending] = useActionState<DropFormState, FormData>(saveDrop.bind(null, drop.id), {
    status: "idle",
  });
  const [vip, setVip] = useState(toLocalInput(drop.vip_opens_at));
  const [pub, setPub] = useState(toLocalInput(drop.public_opens_at));
  const [close, setClose] = useState(toLocalInput(drop.closes_at));
  // A new drop's address follows its name until staff edit it. An existing one never changes by itself.
  const [slug, setSlug] = useState(drop.slug);
  const [slugEdited, setSlugEdited] = useState(drop.id !== null);
  const fe = state.fieldErrors ?? {};
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  return (
    <form action={action} className="gap-space-4 grid max-w-xl">
      <div className="space-y-space-1">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={drop.name}
          required
          aria-invalid={!!fe.name}
          onChange={(e) => {
            if (!slugEdited) setSlug(slugify(e.target.value));
          }}
        />
        {fe.name && <p className="text-body-s text-critical">{fe.name}</p>}
      </div>
      <div className="space-y-space-1">
        <Label htmlFor="slug">Web address</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugEdited(true);
          }}
          aria-invalid={!!fe.slug}
          autoComplete="off"
        />
        <p className="text-body-s text-ink-muted">
          xarina.com/drops/{slug || "…"}
          {drop.id ? " If you change it, the old address keeps redirecting to the new one." : ""}
        </p>
        {fe.slug && <p className="text-body-s text-critical">{fe.slug}</p>}
      </div>
      <div className="space-y-space-1">
        <Label htmlFor="pitch">Pitch</Label>
        <textarea
          id="pitch"
          name="pitch"
          defaultValue={drop.pitch}
          rows={3}
          className="border-line bg-surface-raised px-space-3 py-space-2 text-body text-ink w-full rounded-xs border"
        />
      </div>

      <fieldset className="gap-space-3 border-line p-space-3 grid border">
        <legend className="label px-space-1 text-ink-muted">Hero image (optional)</legend>
        {drop.hero_storage_path && (
          <div className="gap-space-3 flex items-center">
            <div className="w-24 shrink-0">
              <ProductImage path={drop.hero_storage_path} alt={drop.hero_alt || drop.name} sizes="96px" />
            </div>
            <label className="gap-space-2 text-body-s text-ink flex min-h-11 items-center">
              <input type="checkbox" name="remove_hero" className="accent-action size-4 rounded-none" />
              <span>Remove this image</span>
            </label>
          </div>
        )}
        <div className="space-y-space-1">
          <Label htmlFor="hero">{drop.hero_storage_path ? "Replace image" : "Upload image"}</Label>
          <input
            id="hero"
            name="hero"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="text-body-s text-ink block w-full"
          />
          <p className="text-body-s text-ink-muted">JPEG, PNG, WebP or AVIF, up to 8 MB.</p>
        </div>
        <div className="space-y-space-1">
          <Label htmlFor="hero_alt">Describe the image</Label>
          <Input id="hero_alt" name="hero_alt" defaultValue={drop.hero_alt} aria-invalid={!!fe.hero_alt} />
          {fe.hero_alt && <p className="text-body-s text-critical">{fe.hero_alt}</p>}
        </div>
      </fieldset>

      <p className="text-body-s text-ink-muted">
        Times are entered in your timezone{tz ? ` (${tz})` : ""} and stored in UTC. Shoppers see their own
        local time.
      </p>
      <TimeField
        name="vip_opens_at"
        label="Privé opens"
        hint="Set the same as public opening for no early window."
        value={vip}
        onChange={setVip}
        required
        error={fe.vip_opens_at}
      />
      <TimeField
        name="public_opens_at"
        label="Public opens"
        value={pub}
        onChange={setPub}
        required
        error={fe.public_opens_at}
      />
      <TimeField
        name="closes_at"
        label="Closes (optional)"
        value={close}
        onChange={setClose}
        error={fe.closes_at}
      />

      <div className="space-y-space-1">
        <Label htmlFor="vip_limit_per_member">Privé limit per member, per design (optional)</Label>
        <Input
          id="vip_limit_per_member"
          name="vip_limit_per_member"
          type="number"
          min={1}
          step={1}
          defaultValue={drop.vip_limit_per_member ?? ""}
          aria-invalid={!!fe.vip_limit_per_member}
        />
        {fe.vip_limit_per_member && <p className="text-body-s text-critical">{fe.vip_limit_per_member}</p>}
      </div>

      <div className="space-y-space-1">
        <Label htmlFor="on_close">When the drop closes</Label>
        <select
          id="on_close"
          name="on_close"
          defaultValue={drop.on_close}
          className="border-line bg-surface-raised px-space-3 text-body text-ink h-12 w-full rounded-xs border"
        >
          <option value="move_to_available">Move designs to Available Now</option>
          <option value="hide">Hide designs</option>
        </select>
      </div>

      <label className="gap-space-3 text-body text-ink flex min-h-11 items-center">
        <input
          type="checkbox"
          name="published"
          defaultChecked={drop.published}
          className="accent-action size-4 rounded-none"
        />
        <span>Published. Unpublished drops are visible to staff only.</span>
      </label>

      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={state.status === "error" ? "text-body-s text-critical" : "text-body-s text-ink"}
        >
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving" : drop.id ? "Save drop" : "Create drop"}
      </Button>
    </form>
  );
}
