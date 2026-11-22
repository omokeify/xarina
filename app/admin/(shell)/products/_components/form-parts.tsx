import type { ActionState } from "../actions";

// Small layout helpers shared by the product editor forms.

export function Section({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section aria-labelledby={id} className="gap-space-4 border-line pt-space-4 flex flex-col border-t">
      <div className="gap-space-1 flex flex-col">
        <h2 id={id} className="font-display text-title">
          {title}
        </h2>
        {description && <p className="text-body-s text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gap-space-2 flex flex-col">
      <label htmlFor={htmlFor} className="label text-ink-muted block">
        {label}
      </label>
      {children}
      {hint && <p className="text-caption text-ink-muted">{hint}</p>}
    </div>
  );
}

export function FormStatus({ state, savedText = "Saved." }: { state: ActionState; savedText?: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={state.status === "error" ? "text-body-s text-critical" : "text-body-s text-ink-muted"}
    >
      {state.status === "saved"
        ? (state.message ?? savedText)
        : state.status === "error"
          ? state.message
          : ""}
    </p>
  );
}

/** Compact text input for table cells (still 44px tall for touch). */
export const cellInput =
  "h-11 w-full min-w-0 rounded-xs border border-line bg-surface-raised px-space-2 text-body-s text-ink aria-invalid:border-critical";
