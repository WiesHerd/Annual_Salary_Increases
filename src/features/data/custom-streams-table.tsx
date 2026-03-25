/**
 * Data browser tab for custom data streams: list streams, select one, show read-only table of rows.
 */

import { useState, useMemo } from 'react';
import type { CustomStreamDefinition, CustomStreamRow } from '../../types/custom-stream';
import type { CustomStreamData } from '../../lib/custom-stream-storage';
import { EmptyStatePanel } from '../../components/empty-state-panel';

const PAGE_SIZES = [10, 25, 50, 100] as const;

interface CustomStreamsTableProps {
  definitions: CustomStreamDefinition[];
  getStreamData: (streamId: string) => CustomStreamData | null;
}

function formatCell(val: string | number | undefined): string {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'number' && Number.isFinite(val)) return String(val);
  return String(val).trim() || '—';
}

export function CustomStreamsTable({ definitions, getStreamData }: CustomStreamsTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(definitions[0]?.id ?? null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const selectedDef = useMemo(
    () => definitions.find((d) => d.id === selectedId) ?? definitions[0] ?? null,
    [definitions, selectedId]
  );
  const selectedData = selectedDef ? getStreamData(selectedDef.id) : null;

  const columns = useMemo(
    () => (selectedData?.columnOrder?.length ? selectedData.columnOrder : Object.keys(selectedData?.rows?.[0] ?? {})),
    [selectedData]
  );

  const paginatedRows = useMemo(() => {
    if (!selectedData?.rows?.length) return [];
    const totalPages = Math.max(1, Math.ceil(selectedData.rows.length / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    return selectedData.rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [selectedData, page, pageSize]);

  const totalPages = selectedData?.rows?.length
    ? Math.max(1, Math.ceil(selectedData.rows.length / pageSize))
    : 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rowCount = selectedData?.rows?.length ?? 0;

  if (definitions.length === 0) {
    return (
      <EmptyStatePanel
        title="Custom data"
        message="No custom data streams yet."
        compact
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Custom data streams</h2>
      <div className="flex flex-wrap gap-2">
        {definitions.map((d) => {
          const data = getStreamData(d.id);
          const count = data?.rows?.length ?? 0;
          return (
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
              {d.label} ({count})
              {d.linkType === 'provider' ? ' · Provider-linked' : ` · ${d.keyColumn ?? 'Key'}`}
            </button>
          );
        })}
      </div>
      {selectedDef && selectedData && (
        <div className="app-card overflow-hidden flex flex-col min-w-0">
          <div className="shrink-0 border-b border-slate-200 px-5 pt-4 pb-2">
            <span className="text-sm font-medium text-slate-700">
              {selectedDef.label} — {rowCount} rows, {columns.length} columns
            </span>
          </div>
          {rowCount === 0 ? (
            <EmptyStatePanel
              title={selectedDef?.label ?? 'Stream'}
              message="No rows yet."
              compact
              containerClassName="p-8 text-center text-slate-600"
            />
          ) : (
            <>
              <div className="app-data-table-wrapper overflow-x-auto">
                <table className="app-data-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="text-left">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row: CustomStreamRow, i) => (
                      <tr key={i}>
                        {columns.map((col) => (
                          <td key={col} className="text-slate-900 whitespace-nowrap">
                            {formatCell(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rowCount > pageSize && (
                <div className="app-data-table-pagination flex flex-wrap items-center justify-between gap-2 px-5 py-2 border-t border-slate-100">
                  <span className="text-sm text-slate-600">
                    Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, rowCount)} of {rowCount} rows
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
