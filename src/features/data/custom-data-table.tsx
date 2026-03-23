import { useState, useMemo } from 'react';
import type { CustomDataset, RawRow } from '../../types';

const PAGE_SIZES = [10, 25, 50, 100] as const;

interface CustomDataTableProps {
  datasets: CustomDataset[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

function formatCell(val: string | number | undefined): string {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'number' && Number.isFinite(val)) return String(val);
  return String(val).trim() || '—';
}

export function CustomDataTable({ datasets, onRemove, onClear }: CustomDataTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(datasets[0]?.id ?? null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const selected = useMemo(
    () => datasets.find((d) => d.id === selectedId) ?? datasets[0] ?? null,
    [datasets, selectedId]
  );

  const paginatedRows = useMemo(() => {
    if (!selected || selected.rows.length === 0) return [];
    const totalPages = Math.max(1, Math.ceil(selected.rows.length / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    return selected.rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [selected, page, pageSize]);

  const totalPages = selected
    ? Math.max(1, Math.ceil(selected.rows.length / pageSize))
    : 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  if (datasets.length === 0) {
    return (
      <div className="app-card p-8 text-center text-slate-500">
        <p>
          No custom data. Use Import → Custom data to upload a CSV or XLSX with any columns. You can optionally
          choose a column to join to providers (e.g. Employee_ID) so these columns are included in exports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Custom datasets</h2>
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Clear all
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {datasets.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              setSelectedId(d.id);
              setPage(1);
            }}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              selectedId === d.id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {d.name} ({d.rows.length})
            {d.joinKeyColumn ? ` · join: ${d.joinKeyColumn}` : ''}
          </button>
        ))}
      </div>
      {selected && (
        <div className="app-card overflow-hidden flex flex-col min-w-0">
          <div className="shrink-0 border-b border-slate-200 px-5 pt-4 pb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700">
              {selected.name} — {selected.rows.length} rows, {selected.columns.length} columns
            </span>
            <button
              type="button"
              onClick={() => onRemove(selected.id)}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Remove dataset
            </button>
          </div>
          <div className="app-data-table-wrapper overflow-x-auto">
            <table className="app-data-table">
              <thead>
                <tr>
                  {selected.columns.map((col) => (
                    <th key={col} className="text-left">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row: RawRow, i) => (
                  <tr key={i}>
                    {selected.columns.map((col) => (
                      <td key={col} className="text-slate-900 whitespace-nowrap">
                        {formatCell(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selected.rows.length > pageSize && (
            <div className="app-data-table-pagination flex flex-wrap items-center justify-between gap-2 px-5 py-2 border-t border-slate-100">
              <span className="text-sm text-slate-600">
                Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, selected.rows.length)} of{' '}
                {selected.rows.length} rows
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  Rows per page
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
