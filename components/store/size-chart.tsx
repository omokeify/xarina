import type { ProductDetail } from "@/lib/catalogue";

const COLUMNS = [
  { key: "bust_cm", label: "Bust" },
  { key: "waist_cm", label: "Waist" },
  { key: "hip_cm", label: "Hip" },
  { key: "length_cm", label: "Length" },
] as const;

/** PDP-3 measurements table (cm). Columns with no data are hidden. */
export function SizeChart({ rows }: { rows: ProductDetail["measurements"] }) {
  const cols = COLUMNS.filter((c) => rows.some((r) => r[c.key] != null));
  if (rows.length === 0 || cols.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="text-body-s border-line w-full border text-left tabular-nums">
        <caption className="sr-only">Garment measurements in centimetres</caption>
        <thead>
          <tr className="border-line bg-surface-sunk border-b">
            <th scope="col" className="label py-space-2 px-space-3 text-ink-muted">
              Size
            </th>
            {cols.map((c) => (
              <th key={c.key} scope="col" className="label py-space-2 px-space-3 text-ink-muted">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.size} className="border-line border-b last:border-b-0">
              <th scope="row" className="py-space-2 px-space-3 font-semibold">
                {r.size}
              </th>
              {cols.map((c) => (
                <td key={c.key} className="py-space-2 px-space-3 text-ink-muted">
                  {r[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-space-2 text-caption text-ink-muted">Garment measurements in centimetres.</p>
    </div>
  );
}
