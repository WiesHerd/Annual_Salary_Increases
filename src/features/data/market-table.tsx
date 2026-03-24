import { useState, useMemo, useEffect } from 'react';
import type { MarketRow } from '../../types/market';
import { formatCurrency } from '../../utils/format';

/** Format with comma and 2 decimals (e.g. 5,500.00). */
function formatWrvu(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PAGE_SIZES = [10, 25, 50, 100, 200] as const;

interface MarketTableProps {
  surveyLabel: string;
  rows: MarketRow[];
  onRemove: (surveyId: string, specialty: string) => void;
  onClear: (surveyId: string) => void;
  surveyId: string;
}

export function MarketTable({ surveyId, surveyLabel, rows, onRemove, onClear }: MarketTableProps) {
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    if (!searchText.trim()) return rows;
    const q = searchText.trim().toLowerCase();
    return rows.filter((r) => r.specialty.toLowerCase().includes(q));
  }, [rows, searchText]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const cmp = a.specialty.localeCompare(b.specialty, undefined, { sensitivity: 'base' });
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = pageSize > 0 ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize) : sorted;
  const startRow = paginated.length > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const endRow = Math.min(safePage * pageSize, sorted.length);
  const [goToPageInput, setGoToPageInput] = useState('');

  useEffect(() => {
    setPage(1);
  }, [searchText, pageSize]);
  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(totalPages);
  }, [page, totalPages]);

  const handleGoToPage = () => {
    const num = parseInt(goToPageInput.trim(), 10);
    if (!Number.isNaN(num) && num >= 1 && num <= totalPages) setPage(num);
    setGoToPageInput('');
  };

  if (rows.length === 0) {
    return (
      <div className="app-card p-8 text-center text-slate-500">
        <p>No market data yet. Upload a market survey file (CSV or XLSX) above.</p>
      </div>
    );
  }

  const percentiles = [25, 50, 75, 90];

  return (
    <div className="app-card overflow-hidden flex flex-col min-w-0">
      <div className="shrink-0 border-b border-slate-200 px-5 pt-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-800">{surveyLabel} ({rows.length} specialties)</h2>
          <button
            type="button"
            onClick={() => onClear(surveyId)}
            className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Clear
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by specialty…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-indigo-500/20"
              aria-label="Search"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <span className="text-sm text-slate-500 shrink-0">
            <span className="font-medium text-slate-800">{sorted.length}</span>
            {searchText.trim() && <span> / {rows.length} specialties</span>}
          </span>
        </div>
      </div>
      <div className="app-data-table-wrapper">
        <table className="app-data-table">
          <thead>
            <tr>
              <th
                className="sortable text-left"
                onClick={() => setSortAsc((s) => !s)}
              >
                Specialty {sortAsc ? '↑' : '↓'}
              </th>
              <th className="text-right">Incumbents</th>
              <th className="text-right">Orgs</th>
              {percentiles.map((p) => (
                <th key={p} className="text-right">TCC {p}</th>
              ))}
              {percentiles.map((p) => (
                <th key={`w${p}`} className="text-right">wRVU {p}</th>
              ))}
              {percentiles.map((p) => (
                <th key={`cf${p}`} className="text-right">CF {p}</th>
              ))}
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr key={r.specialty}>
                <td className="text-slate-900">{r.specialty}</td>
                <td className="text-right tabular-nums">{r.incumbents != null ? r.incumbents.toLocaleString() : '—'}</td>
                <td className="text-right tabular-nums">{r.orgCount != null ? r.orgCount.toLocaleString() : '—'}</td>
                {percentiles.map((p) => (
                  <td key={p} className="text-right">
                    {r.tccPercentiles[p] != null ? formatCurrency(r.tccPercentiles[p]) : '—'}
                  </td>
                ))}
                {percentiles.map((p) => (
                  <td key={`w${p}`} className="text-right">
                    {r.wrvuPercentiles[p] != null ? formatWrvu(r.wrvuPercentiles[p]) : '—'}
                  </td>
                ))}
                {percentiles.map((p) => (
                  <td key={`cf${p}`} className="text-right">
                    {r.cfPercentiles?.[p] != null ? formatCurrency(r.cfPercentiles[p]) : '—'}
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    onClick={() => onRemove(surveyId, r.specialty)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="app-data-table-pagination">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm text-slate-600">
            Showing <span className="font-medium text-slate-800">{startRow}</span>–<span className="font-medium text-slate-800">{endRow}</span> of{' '}
            <span className="font-medium text-slate-800">{sorted.length}</span> {sorted.length !== 1 ? 'specialties' : 'specialty'}
          </span>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value={0}>All</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setPage((p) => Math.max(1, p - 1)); setGoToPageInput(''); }}
            disabled={safePage <= 1}
            className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600 flex items-center gap-1.5">
            Page
            <input
              type="number"
              min={1}
              max={totalPages}
              value={goToPageInput !== '' ? goToPageInput : safePage}
              onChange={(e) => setGoToPageInput(e.target.value)}
              onBlur={handleGoToPage}
              onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
              className="w-12 px-1.5 py-1 text-sm text-center border border-slate-300 rounded-lg tabular-nums focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Go to page"
            />
            of <span className="font-medium text-slate-800">{totalPages}</span>
          </span>
          <button
            type="button"
            onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); setGoToPageInput(''); }}
            disabled={safePage >= totalPages}
            className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
