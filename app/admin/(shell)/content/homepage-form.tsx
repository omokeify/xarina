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
    <form action={action} className="flex flex-col gap-6">
      <fieldset disabled={!canEdit || pending} className="flex flex-col gap-6">
        <Group title="Hero Banner Configuration">
          <Field label="Featured Drop" htmlFor="featured_drop_id" hint="Leave on automatic to feature the active or next upcoming drop.">
            <select
              id="featured_drop_id"
              name="featured_drop_id"
              defaultValue={hero.featured_drop_id ?? ""}
              className="h-11 w-full rounded-none border border-line bg-surface px-space-3 text-body-s text-ink focus:border-ink focus:outline-none transition-colors"
            >
              <option value="">Automatic (next drop)</option>
              {drops.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {new Date(d.public_opens_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Editorial Headline" htmlFor="headline" hint="Defaults to the drop name.">
            <Input id="headline" name="headline" defaultValue={hero.headline ?? ""} maxLength={80} />
          </Field>
          <Field label="Curated Pitch" htmlFor="pitch" hint="Defaults to the drop pitch.">
            <Input id="pitch" name="pitch" defaultValue={hero.pitch ?? ""} maxLength={140} />
          </Field>
          <fieldset className="flex flex-col gap-space-2 pt-space-2">
            <legend className="label text-ink-muted mb-space-2">Color Atmosphere</legend>
            <Radio name="theme" value="ivory" defaultChecked={hero.theme !== "prive"} label="Ivory &amp; Ink" hint="The signature serene daytime aesthetic of the maison." />
            <Radio name="theme" value="prive" defaultChecked={hero.theme === "prive"} label="Noir &amp; Champagne" hint="Private Salon night atmosphere for VIP launches." />
          </fieldset>
          <Field label="Hero Visual" htmlFor="media_file" hint="JPG, PNG, WebP or AVIF, up to 8 MB. Defaults to the drop's primary editorial photo.">
            {mediaUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- admin preview only
              <img src={mediaUrl} alt={hero.media?.alt ?? ""} className="mb-3 aspect-[4/5] w-44 border border-line bg-surface-sunk object-cover" />
            )}
            <input id="media_file" name="media_file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-caption" />
          </Field>
          <Field label="Visual Description (Alt Text)" htmlFor="media_alt" hint="Required with custom hero imagery.">
            <Input id="media_alt" name="media_alt" defaultValue={hero.media?.alt ?? ""} maxLength={200} />
          </Field>
          {hero.media && (
            <Check name="remove_media" label="Remove custom hero image (reverts to drop default)" />
          )}
        </Group>

        <Group title="Announcement Bar">
          <Check name="announcement_enabled" label="Enable top announcement ticker bar" defaultChecked={bar.enabled} />
          <Field label="Announcement Copy" htmlFor="announcement_text">
            <Input id="announcement_text" name="announcement_text" defaultValue={bar.text} maxLength={120} />
          </Field>
          <Field label="Destination URL (Optional)" htmlFor="announcement_href" hint="Internal path (e.g. /shop) or external URL.">
            <Input id="announcement_href" name="announcement_href" defaultValue={bar.href ?? ""} maxLength={200} />
          </Field>
        </Group>

        <Group title="Private Client Concierge (WhatsApp)">
          <Field label="Concierge WhatsApp Number" htmlFor="whatsapp_number" hint="International format with country code, e.g. +2348012345678. Powers all boutique stylist and concierge links.">
            <Input id="whatsapp_number" name="whatsapp_number" type="tel" defaultValue={whatsapp.number ?? ""} />
          </Field>
        </Group>

        {canEdit && (
          <div className="flex flex-col gap-2 sm:max-w-xs pt-2">
            <Button type="submit" block className="h-11">
              {pending ? "Saving…" : "Save Storefront Content"}
            </Button>
          </div>
        )}
      </fieldset>
      <p role="status" aria-live="polite" className={state.status === "error" ? "text-body-s text-critical font-medium" : "text-body-s text-ink-muted"}>
        {state.status === "saved" ? "Saved. The storefront has been updated." : state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-line bg-surface-raised p-space-4 flex flex-col gap-space-3">
      <div className="border-b border-line pb-space-2">
        <h2 className="font-display text-title text-ink font-normal">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-space-1">
      <Label htmlFor={htmlFor} className="label text-ink-muted">{label}</Label>
      {children}
      {hint && <p className="text-caption text-ink-muted">{hint}</p>}
    </div>
  );
}

function Radio({ name, value, label, hint, defaultChecked }: { name: string; value: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex min-h-11 items-start gap-3 text-body-s cursor-pointer select-none">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="mt-1 size-4 accent-ink" />
      <span className="flex flex-col">
        <span className="text-ink font-medium">{label}</span>
        <span className="text-caption text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex min-h-11 items-center gap-2.5 text-body-s cursor-pointer select-none">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-ink" />
      <span className="text-ink">{label}</span>
    </label>
  );
}
