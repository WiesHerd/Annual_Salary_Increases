import { useState, useMemo, useEffect } from 'react';
import type { EvaluationJoinRow } from '../../types';

const PAGE_SIZES = [10, 25, 50, 100, 200] as const;

interface EvaluationTableProps {
  rows: EvaluationJoinRow[];
  onClear: () => void;
}

export function EvaluationTable({ rows, onClear }: EvaluationTableProps) {
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<'Employee_ID' | 'Evaluation_Score' | 'Performance_Category' | 'Default_Increase_Percent'>(
    'Employee_ID'
  );
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    if (!searchText.trim()) return rows;
    const q = searchText.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (r.Employee_ID && r.Employee_ID.toLowerCase().includes(q)) ||
        (r.Performance_Category && r.Performance_Category.toLowerCase().includes(q))
    );
  }, [rows, searchText]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const aNum = typeof va === 'number' ? va : null;
      const bNum = typeof vb === 'number' ? vb : null;
      let cmp: number;
      if (aNum != null && bNum != null) {
        cmp = aNum - bNum;
      } else {
        const as = va != null ? String(va) : '';
        const bs = vb != null ? String(vb) : '';
        cmp = as.localeCompare(bs, undefined, { sensitivity: 'base', numeric: true });
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

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

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc((s) => !s);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
    setPage(1);
  };

  if (rows.length === 0) {
    return (
      <div className="app-card p-8 text-center text-slate-500">
        <p>
          No evaluation data. Upload a file above to match providers by Employee ID (e.g. evaluation score, performance
          category such as Exceeds / Meets / Needs Improvement).
        </p>
      </div>
    );
  }

  const SortIcon = ({ column }: { column: typeof sortKey }) =>
    sortKey === column ? (
      <span className="ml-0.5 text-blue-600">{sortAsc ? '↑' : '↓'}</span>
    ) : (
      <span className="ml-0.5 text-slate-300">⇅</span>
    );

  return (
    <div className="app-card overflow-hidden flex flex-col min-w-0">
      <div className="shrink-0 border-b border-slate-200 px-5 pt-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-800">Evaluation data ({rows.length} rows)</h2>
          <button
            type="button"
            onClick={onClear}
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
              placeholder="Search by Employee ID, performance…"
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
            {searchText.trim() && <span> / {rows.length} rows</span>}
          </span>
        </div>
      </div>
      <div className="app-data-table-wrapper">
        <table className="app-data-table">
          <thead>
            <tr>
              {(
                [
                  ['Employee_ID', 'Employee ID', 'left'],
                  ['Evaluation_Score', 'Evaluation score', 'right'],
                  ['Performance_Category', 'Performance category', 'left'],
                  ['Default_Increase_Percent', 'Default increase %', 'right'],
                ] as [keyof EvaluationJoinRow, string, 'left' | 'right'][]
              ).map(([key, label, align]) => (
                <th
                  key={key}
                  className={`sortable ${align === 'right' ? 'text-right' : 'text-left'}`}
                  onClick={() => toggleSort(key)}
                >
                  {label}
                  <SortIcon column={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, i) => (
              <tr key={`${r.Employee_ID}-${i}`}>
                <td className="text-slate-900">{r.Employee_ID}</td>
                <td className="text-right">{r.Evaluation_Score != null ? String(r.Evaluation_Score) : '—'}</td>
                <td>{r.Performance_Category ?? '—'}</td>
                <td className="text-right">
                  {r.Default_Increase_Percent != null ? `${Number(r.Default_Increase_Percent).toFixed(2)}%` : '—'}
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
            <span className="font-medium text-slate-800">{sorted.length}</span> row{sorted.length !== 1 ? 's' : ''}
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
