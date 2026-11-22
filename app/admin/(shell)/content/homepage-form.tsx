"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { SiteSettings } from "@/lib/site-settings";
import { saveHomepageSettings, type SaveState } from "./actions";

const initial: SaveState = { status: "idle" };

export function HomepageForm({
  settings,
  drops,
  mediaUrl,
  canEdit,
}: {
  settings: SiteSettings;
  drops: { id: string; name: string; public_opens_at: string }[];
  mediaUrl: string | null;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(saveHomepageSettings, initial);
  const { hero, announcement_bar: bar, whatsapp } = settings;

  return (
    <form action={action} className="flex flex-col gap-space-5">
      <fieldset disabled={!canEdit || pending} className="flex flex-col gap-space-5">
        <Group title="Hero">
          <Field label="Featured drop" htmlFor="featured_drop_id" hint="Leave on automatic to feature the next drop.">
            <select
              id="featured_drop_id"
              name="featured_drop_id"
              defaultValue={hero.featured_drop_id ?? ""}
              className="h-12 w-full rounded-xs border border-line bg-surface-raised px-space-3 text-body"
            >
              <option value="">Automatic (next drop)</option>
              {drops.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {new Date(d.public_opens_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Headline" htmlFor="headline" hint="Defaults to the drop name.">
            <Input id="headline" name="headline" defaultValue={hero.headline ?? ""} maxLength={80} />
          </Field>
          <Field label="One-line pitch" htmlFor="pitch" hint="Defaults to the drop's pitch.">
            <Input id="pitch" name="pitch" defaultValue={hero.pitch ?? ""} maxLength={140} />
          </Field>
          <fieldset className="flex flex-col gap-space-2">
            <legend className="label mb-space-2 text-ink-muted">Hero style</legend>
            <Radio name="theme" value="ivory" defaultChecked={hero.theme !== "prive"} label="Ivory & Ink" hint="The everyday look of the site." />
            <Radio name="theme" value="prive" defaultChecked={hero.theme === "prive"} label="Noir & Champagne" hint="For a Privé launch or an evening campaign moment." />
          </fieldset>
          <Field label="Hero image" htmlFor="media_file" hint="JPG, PNG, WebP or AVIF, up to 8 MB. Defaults to the drop's first product photo.">
            {mediaUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- admin preview only
              <img src={mediaUrl} alt={hero.media?.alt ?? ""} className="mb-space-2 aspect-[4/5] w-40 bg-surface-sunk object-cover" />
            )}
            <input id="media_file" name="media_file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-body-s" />
          </Field>
          <Field label="Image description (alt text)" htmlFor="media_alt" hint="Required with an image. Describe what a shopper would see.">
            <Input id="media_alt" name="media_alt" defaultValue={hero.media?.alt ?? ""} maxLength={200} />
          </Field>
          {hero.media && (
            <Check name="remove_media" label="Remove the hero image" />
          )}
        </Group>

        <Group title="Announcement bar">
          <Check name="announcement_enabled" label="Show the announcement bar" defaultChecked={bar.enabled} />
          <Field label="Text" htmlFor="announcement_text">
            <Input id="announcement_text" name="announcement_text" defaultValue={bar.text} maxLength={120} />
          </Field>
          <Field label="Link (optional)" htmlFor="announcement_href" hint="A page on this site such as /shop, or a full https:// address.">
            <Input id="announcement_href" name="announcement_href" defaultValue={bar.href ?? ""} maxLength={200} />
          </Field>
        </Group>

        <Group title="WhatsApp">
          <Field label="Number" htmlFor="whatsapp_number" hint="International format, e.g. +2348012345678. Used by every Ask us on WhatsApp link.">
            <Input id="whatsapp_number" name="whatsapp_number" type="tel" defaultValue={whatsapp.number ?? ""} />
          </Field>
        </Group>

        {canEdit && (
          <div className="flex flex-col gap-space-2 sm:max-w-xs">
            <Button type="submit" block>
              {pending ? "Saving" : "Save homepage"}
            </Button>
          </div>
        )}
      </fieldset>
      <p role="status" aria-live="polite" className={state.status === "error" ? "text-body-s text-critical" : "text-body-s text-ink-muted"}>
        {state.status === "saved" ? "Saved. The storefront is updated." : state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-space-4 border-t border-line pt-space-4">
      <h2 className="font-display text-title">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-space-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-caption text-ink-muted">{hint}</p>}
    </div>
  );
}

function Radio({ name, value, label, hint, defaultChecked }: { name: string; value: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex min-h-11 items-start gap-space-2 text-body-s">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="mt-1 size-5 accent-ink" />
      <span className="flex flex-col">
        <span className="text-ink">{label}</span>
        <span className="text-caption text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex min-h-11 items-center gap-space-2 text-body-s">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 accent-ink" />
      {label}
    </label>
  );
}
