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
}

export function UploadPreviewTable<T extends object>({
  rows,
  columnOrder,
  maxRows = DEFAULT_PREVIEW_ROWS,
  emptyMessage = 'No rows to preview.',
}: UploadPreviewTableProps<T>) {
  const slice = rows.slice(0, maxRows);
  const cols = columnOrder?.length
    ? columnOrder
    : slice[0]
      ? Object.keys(slice[0])
      : [];

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
              <th key={col} className="text-left whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slice.map((row, i) => (
            <tr key={i}>
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
