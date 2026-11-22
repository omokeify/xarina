import type { ActionState } from "../actions";

// Small layout helpers shared by the product editor forms.

export function Section({
  title,
  description,
  children,
  id,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`border border-line bg-surface-raised p-space-4 flex flex-col gap-space-3 ${className ?? ""}`}
    >
      <div className="flex flex-col gap-space-1 border-b border-line pb-space-3">
        <h2 id={id} className="font-display text-title text-ink font-normal">
          {title}
        </h2>
        {description && <p className="text-body-s text-ink-muted leading-relaxed">{description}</p>}
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
    <div className="flex flex-col gap-space-1">
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
  "h-11 w-full min-w-0 border border-line bg-surface px-space-3 text-body-s text-ink focus:border-ink focus:outline-none transition-colors aria-invalid:border-critical";
