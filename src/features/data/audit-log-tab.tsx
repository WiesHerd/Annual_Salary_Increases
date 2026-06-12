/**
 * Data browser tab: view and export the change audit log.
 */

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { loadAuditEntries, type AuditEntityType, type AuditEntry } from '../../lib/audit';
import { downloadAuditLogCsv } from '../../lib/audit-export';
import { EmptyStatePanel } from '../../components/empty-state-panel';
import { formatCurrency } from '../../utils/format';

const PAGE_SIZES = [25, 50, 100, 200] as const;

const ENTITY_TYPES: { value: '' | AuditEntityType; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'provider', label: 'Provider' },
  { value: 'market', label: 'Market' },
  { value: 'evaluation', label: 'Evaluation' },
];

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'number') {
    if (Math.abs(value) > 1000) return formatCurrency(value);
    return value.toLocaleString();
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function AuditLogTab() {
  const [entityFilter, setEntityFilter] = useState<'' | AuditEntityType>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const allEntries = useMemo(() => {
    const entries = loadAuditEntries();
    return [...entries].reverse();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEntries.filter((e) => {
      if (entityFilter && e.entityType !== entityFilter) return false;
      if (!q) return true;
      return (
        e.entityId.toLowerCase().includes(q) ||
        e.field.toLowerCase().includes(q) ||
        formatValue(e.oldValue).toLowerCase().includes(q) ||
        formatValue(e.newValue).toLowerCase().includes(q)
      );
    });
  }, [allEntries, entityFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleExport = () => {
    downloadAuditLogCsv(filtered.length > 0 ? filtered : allEntries);
  };

  if (allEntries.length === 0) {
    return (
      <EmptyStatePanel
        title="Audit log"
        message="No changes recorded yet. Edits to provider records in the Data browser are logged here."
        compact
      />
    );
  }

  return (
    <div className="app-card overflow-hidden flex flex-col min-w-0">
      <div className="shrink-0 border-b border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Audit log ({allEntries.length})</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Field-level change history for providers, market, and evaluations.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          Export CSV
        </button>
      </div>

      <div className="shrink-0 border-b border-slate-100 px-5 py-3 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by ID, field, or value…"
          className="min-w-[200px] flex-1 max-w-md rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          aria-label="Search audit log"
        />
        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value as '' | AuditEntityType);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
          aria-label="Filter by entity type"
        >
          {ENTITY_TYPES.map(({ value, label }) => (
            <option key={value || 'all'} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="app-data-table min-w-full">
          <thead>
            <tr>
              <th className="whitespace-nowrap">When</th>
              <th>Type</th>
              <th>Entity ID</th>
              <th>Field</th>
              <th>Old</th>
              <th>New</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((e: AuditEntry) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-sm text-slate-600">
                  {new Date(e.timestamp).toLocaleString()}
                </td>
                <td className="text-sm capitalize text-slate-600">{e.entityType}</td>
                <td className="text-sm font-medium text-slate-800">{e.entityId}</td>
                <td className="text-sm text-slate-600">{e.field}</td>
                <td className="text-sm text-slate-500 max-w-[160px] truncate" title={formatValue(e.oldValue)}>
                  {formatValue(e.oldValue)}
                </td>
                <td className="text-sm text-slate-800 max-w-[160px] truncate" title={formatValue(e.newValue)}>
                  {formatValue(e.newValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > pageSize && (
        <div className="app-data-table-pagination px-5 py-3 flex flex-wrap items-center gap-3 border-t border-slate-100">
          <span className="text-sm text-slate-600">
            Page {safePage} of {totalPages}
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded border border-slate-200 px-2 py-1 text-sm"
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 py-1 text-sm rounded border border-slate-200 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 py-1 text-sm rounded border border-slate-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
