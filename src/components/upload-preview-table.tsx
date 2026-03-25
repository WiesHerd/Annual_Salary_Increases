/**
 * Read-only preview of first N rows for import validation step.
 * Uses app-data-table styling; columns from columnOrder or object keys.
 */

const DEFAULT_PREVIEW_ROWS = 10;

function formatCell(val: unknown): string {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'number' && Number.isFinite(val)) return String(val);
  return String(val).trim() || '—';
}

interface UploadPreviewTableProps<T extends object> {
  rows: T[];
  columnOrder?: string[];
  maxRows?: number;
  emptyMessage?: string;
  /**
   * One-based row indices to highlight (best-effort).
   * Note: indices are relative to the `rows` array being previewed, not the original upload file.
   */
  highlightRowIndices?: Set<number> | number[];
}

export function UploadPreviewTable<T extends object>({
  rows,
  columnOrder,
  maxRows = DEFAULT_PREVIEW_ROWS,
  emptyMessage = 'No rows to preview.',
  highlightRowIndices,
}: UploadPreviewTableProps<T>) {
  const slice = rows.slice(0, maxRows);
  const cols = columnOrder?.length
    ? columnOrder
    : slice[0]
      ? Object.keys(slice[0])
      : [];
  const highlight =
    highlightRowIndices == null
      ? null
      : Array.isArray(highlightRowIndices)
        ? new Set(highlightRowIndices)
        : highlightRowIndices;

  if (cols.length === 0 || slice.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-4">{emptyMessage}</p>
    );
  }

  return (
    <div className="app-data-table-wrapper overflow-x-auto rounded-lg border border-slate-200">
      <table className="app-data-table">
        <thead>
          <tr>
            {cols.map((col) => (
              <th key={col} className="text-left">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slice.map((row, i) => (
            <tr
              key={i}
              className={
                highlight?.has(i + 1)
                  ? 'bg-amber-50/60'
                  : undefined
              }
            >
              {cols.map((col) => (
                <td key={col} className="text-slate-900 whitespace-nowrap">
                  {formatCell((row as Record<string, unknown>)[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <p className="text-xs text-slate-500 px-2 py-1.5 border-t border-slate-100">
          Showing first {maxRows} of {rows.length} rows.
        </p>
      )}
    </div>
  );
}
