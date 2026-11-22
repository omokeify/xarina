"use client";

/**
 * Shop filter drop-down (concept layout). A plain GET form, so it works without
 * JavaScript via the Apply button; with JavaScript it submits on change.
 */
export function FilterSelect({
  label,
  name,
  value,
  options,
  keep,
}: {
  label: string;
  name: string;
  value: string;
  options: readonly { value: string; label: string }[];
  /** Other query params to carry over. */
  keep: Record<string, string | undefined>;
}) {
  const id = `shop-${name}`;
  return (
    <form action="/shop" method="get" className="gap-space-2 flex items-center">
      {Object.entries(keep).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <label htmlFor={id} className="text-body-s text-ink-muted">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="border-line text-body-s text-ink focus:border-ink px-space-3 min-h-11 cursor-pointer rounded-xs border bg-transparent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="label text-ink min-h-11 underline underline-offset-4">
          Apply
        </button>
      </noscript>
    </form>
  );
}
