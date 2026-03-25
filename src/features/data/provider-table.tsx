/**
 * Enterprise-grade provider data table with filtering, sorting, and pagination.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { ProviderRecord } from '../../types/provider';
import type { CustomDataset } from '../../types/upload';
import { exportToCsv, exportToXlsx, type CustomStreamExportLookup } from '../../lib/batch-export';
import { formatCurrency, formatFte } from '../../utils/format';
import { ProviderEditModal } from './provider-edit-modal';
import { getModifiedProviderIds } from '../../lib/audit';
import { EmptyStatePanel } from '../../components/empty-state-panel';

export interface ProviderTableFilters {
  searchText: string;
  specialties: string[];
  departments: string[];
  providerTypes: string[];
  plans: string[];
  statuses: string[];
}

const DEFAULT_FILTERS: ProviderTableFilters = {
  searchText: '',
  specialties: [],
  departments: [],
  providerTypes: [],
  plans: [],
  statuses: [],
};

type SortKey =
  | 'Employee_ID'
  | 'Provider_Name'
  | 'Specialty'
  | 'Department'
  | 'Population'
  | 'Compensation_Plan'
  | 'Current_FTE'
  | 'Current_TCC'
  | 'Current_Target_WRVUs'
  | 'Current_TCC_Percentile'
  | 'WRVU_Percentile'
  | 'Review_Status';

const PAGE_SIZES = [10, 25, 50, 100, 200] as const;

interface ProviderTableProps {
  records: ProviderRecord[];
  marketSpecialties: string[];
  onUpdate: (employeeId: string, updates: Partial<ProviderRecord>) => void;
  onRemove: (employeeId: string) => void;
  /** Optional: include these custom dataset columns in CSV/XLSX export when join key matches Employee_ID. */
  onClear: () => void;
  /** Loads bundled demo providers/market/payments (browser-only). */
  onLoadSampleData?: () => void;
  customDatasets?: CustomDataset[];
  /** Optional: provider-linked custom streams to include in export. */
  customStreamLookups?: CustomStreamExportLookup[];
  /** When true, empty state offers reset (e.g. market/payments still loaded). */
  hasOtherImportedData?: boolean;
}

function extractOptions(records: ProviderRecord[], key: keyof ProviderRecord): string[] {
  const set = new Set<string>();
  for (const r of records) {
    const v = r[key];
    if (v != null && String(v).trim() !== '') set.add(String(v).trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function matchesSearch(r: ProviderRecord, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.trim().toLowerCase();
  const fields = [
    r.Employee_ID,
    r.Provider_Name,
    r.Specialty,
    r.Department,
    r.Population,
    r.Provider_Type,
    r.Compensation_Plan,
    r.Review_Status,
  ];
  return fields.some((f) => f != null && String(f).toLowerCase().includes(lower));
}

function matchesFilters(r: ProviderRecord, f: ProviderTableFilters): boolean {
  if (f.specialties.length > 0 && !f.specialties.includes(r.Specialty ?? '')) return false;
  if (f.departments.length > 0 && !f.departments.includes(r.Department ?? '')) return false;
  if (f.providerTypes.length > 0) {
    const pt = r.Population ?? r.Provider_Type ?? '';
    if (!f.providerTypes.includes(pt)) return false;
  }
  if (f.plans.length > 0 && !f.plans.includes(r.Compensation_Plan ?? '')) return false;
  if (f.statuses.length > 0 && !f.statuses.includes(r.Review_Status ?? '')) return false;
  return true;
}

function sortRecords(records: ProviderRecord[], key: SortKey, dir: 'asc' | 'desc'): ProviderRecord[] {
  return [...records].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
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
    return dir === 'asc' ? cmp : -cmp;
  });
}

function FilterDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      queueMicrotask(() => searchRef.current?.focus());
    }
  }, [open]);

  const q = search.trim().toLowerCase();
  const filteredOptions =
    q === '' ? options : options.filter((opt) => (opt || '(blank)').toLowerCase().includes(q));

  const display = selected.length === 0 ? 'All' : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          selected.length > 0
            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
        }`}
        aria-expanded={open}
      >
        <span className="text-slate-500">{label}:</span>
        <span>{display}</span>
        <span className="text-slate-400">▾</span>
      </button>
      {open && options.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search…"
              aria-label={`Search ${label}`}
              className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">No matches</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) onChange(selected.filter((s) => s !== opt));
                        else onChange([...selected, opt]);
                      }}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span className="truncate">{opt || '(blank)'}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProviderTable({
  records,
  marketSpecialties,
  onUpdate,
  onRemove,
  onClear,
  onLoadSampleData,
  customDatasets,
  customStreamLookups,
  hasOtherImportedData = false,
}: ProviderTableProps) {
  const [editRecord, setEditRecord] = useState<ProviderRecord | null>(null);
  const [filters, setFilters] = useState<ProviderTableFilters>(DEFAULT_FILTERS);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const modifiedIds = useMemo(() => getModifiedProviderIds(), [records]);
  const [sortKey, setSortKey] = useState<SortKey>('Provider_Name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(1);
  const [goToPageInput, setGoToPageInput] = useState('');

  const handleClearAllImportedData = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Remove all imported data on this device? Provider, market, evaluation, payment, and custom data will be deleted. Parameters and policies are unchanged.'
      )
    ) {
      return;
    }
    onClear();
  }, [onClear]);

  const options = useMemo(() => {
    const ptSet = new Set<string>();
    for (const r of records) {
      const v = r.Population ?? r.Provider_Type;
      if (v != null && String(v).trim() !== '') ptSet.add(String(v).trim());
    }
    const providerTypes = [...ptSet].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return {
      specialties: extractOptions(records, 'Specialty'),
      departments: extractOptions(records, 'Department'),
      providerTypes,
      plans: extractOptions(records, 'Compensation_Plan'),
      statuses: extractOptions(records, 'Review_Status'),
    };
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => matchesSearch(r, filters.searchText) && matchesFilters(r, filters));
  }, [records, filters]);

  const sorted = useMemo(() => sortRecords(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated =
    pageSize > 0 ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize) : sorted;
  const startRow = paginated.length > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const endRow = Math.min(safePage * pageSize, sorted.length);

  useEffect(() => {
    setPage(1);
  }, [filters, sortKey, sortDir, pageSize]);
  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(totalPages);
  }, [page, totalPages]);

  const handleExportCsv = () => {
    const csv = exportToCsv(sorted, undefined, customDatasets, customStreamLookups);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'provider-records.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXlsx = async () => {
    const buffer = exportToXlsx(sorted, undefined, customDatasets, customStreamLookups);
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'provider-records.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => setFilters(DEFAULT_FILTERS);
  const hasFilters =
    filters.searchText.trim() !== '' ||
    filters.specialties.length > 0 ||
    filters.departments.length > 0 ||
    filters.providerTypes.length > 0 ||
    filters.plans.length > 0 ||
    filters.statuses.length > 0;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="ml-0.5 text-slate-300">⇅</span>;
    return <span className="ml-0.5 text-blue-600">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (records.length === 0) {
    return (
      <EmptyStatePanel
        title="Provider data"
        message="No provider records yet."
        compact
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          {onLoadSampleData && (
            <button
              type="button"
              onClick={onLoadSampleData}
              className="app-btn-primary"
            >
              Load sample data
            </button>
          )}
          {hasOtherImportedData && (
            <button
              type="button"
              onClick={handleClearAllImportedData}
              className="app-btn-ghost-sm"
            >
              Clear all imports
            </button>
          )}
        </div>
      </EmptyStatePanel>
    );
  }

  const handleGoToPage = () => {
    const num = parseInt(goToPageInput.trim(), 10);
    if (!Number.isNaN(num) && num >= 1 && num <= totalPages) setPage(num);
    setGoToPageInput('');
  };

  return (
    <div className="app-card overflow-hidden flex flex-col min-w-0">
      {/* Header + actions */}
      <div className="shrink-0 border-b border-slate-200 px-5 pt-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-800">Provider records ({records.length})</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportDropdownOpen((o) => !o)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1.5"
                aria-expanded={exportDropdownOpen}
                aria-haspopup="menu"
                title="Export table"
              >
                Export
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {exportDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" aria-hidden onClick={() => setExportDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[10rem] py-1 app-dropdown-panel">
                    <button
                      type="button"
                      onClick={() => {
                        handleExportCsv();
                        setExportDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg transition-colors"
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportXlsx();
                        setExportDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-b-lg transition-colors"
                    >
                      Excel (.xlsx)
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleClearAllImportedData}
              className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              title="Remove all imported data on this device"
            >
              Clear all data
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={filters.searchText}
              onChange={(e) => setFilters((f) => ({ ...f, searchText: e.target.value }))}
              placeholder="Search by name, ID, specialty, division…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-indigo-500/20"
              aria-label="Search"
            />
            {filters.searchText && (
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, searchText: '' }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <span className="text-sm text-slate-500 shrink-0">
            <span className="font-medium text-slate-800">{sorted.length}</span>
            {hasFilters && <span> / {records.length} providers</span>}
          </span>
          <FilterDropdown
            label="Specialty"
            options={options.specialties}
            selected={filters.specialties}
            onChange={(v) => setFilters((f) => ({ ...f, specialties: v }))}
          />
          <FilterDropdown
            label="Dept"
            options={options.departments}
            selected={filters.departments}
            onChange={(v) => setFilters((f) => ({ ...f, departments: v }))}
          />
          <FilterDropdown
            label="Provider Type"
            options={options.providerTypes}
            selected={filters.providerTypes}
            onChange={(v) => setFilters((f) => ({ ...f, providerTypes: v }))}
          />
          <FilterDropdown
            label="Plan"
            options={options.plans}
            selected={filters.plans}
            onChange={(v) => setFilters((f) => ({ ...f, plans: v }))}
          />
          <FilterDropdown
            label="Status"
            options={options.statuses}
            selected={filters.statuses}
            onChange={(v) => setFilters((f) => ({ ...f, statuses: v }))}
          />
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table - scrollable */}
      <div className="app-data-table-wrapper">
        <table className="app-data-table">
          <thead>
            <tr>
              {(
                [
                  ['Employee_ID', 'ID', 'left'],
                  ['Provider_Name', 'Name', 'left'],
                  ['Specialty', 'Specialty', 'left'],
                  ['Department', 'Dept', 'left'],
                  ['Population', 'Provider Type', 'left'],
                  ['Compensation_Plan', 'Plan', 'left'],
                  ['Current_FTE', 'FTE', 'right'],
                  ['Current_TCC', 'Current TCC', 'right'],
                  ['Current_Target_WRVUs', 'Target wRVU', 'right'],
                  ['Current_TCC_Percentile', 'TCC %ile', 'right'],
                  ['WRVU_Percentile', 'wRVU %ile', 'right'],
                  ['Review_Status', 'Status', 'left'],
                ] as [SortKey, string, 'left' | 'right'][]
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
              <th className="w-24 text-left text-slate-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => {
              const isModified = modifiedIds.has(r.Employee_ID);
              return (
              <tr
                key={r.Employee_ID}
                className={isModified ? 'bg-indigo-50/50 border-l-2 border-l-indigo-400' : undefined}
              >
                <td>{r.Employee_ID}</td>
                <td className="text-slate-900">{r.Provider_Name ?? '—'}</td>
                <td>{r.Specialty ?? '—'}</td>
                <td>{r.Department ?? '—'}</td>
                <td>{r.Population ?? r.Provider_Type ?? '—'}</td>
                <td>{r.Compensation_Plan ?? '—'}</td>
                <td className="text-right">{r.Current_FTE != null ? formatFte(r.Current_FTE) : '—'}</td>
                <td className="text-right">{r.Current_TCC != null ? formatCurrency(r.Current_TCC) : '—'}</td>
                <td className="text-right">{r.Current_Target_WRVUs != null ? r.Current_Target_WRVUs.toLocaleString() : '—'}</td>
                <td className="text-right">{r.Current_TCC_Percentile != null ? `${Number(r.Current_TCC_Percentile).toFixed(2)}%` : '—'}</td>
                <td className="text-right">{r.WRVU_Percentile != null ? `${Number(r.WRVU_Percentile).toFixed(2)}%` : '—'}</td>
                <td>{r.Review_Status ?? '—'}</td>
                <td>
                  <div className="flex items-center gap-1">
                    {isModified && (
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded bg-indigo-100 text-indigo-700 shrink-0"
                        title="This record has been edited"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditRecord(r)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                      title="Edit"
                      aria-label="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(r.Employee_ID)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                      title="Remove"
                      aria-label="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination footer - matches Salary Review */}
      <div className="app-data-table-pagination">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm text-slate-600">
            Showing <span className="font-medium text-slate-800">{startRow}</span>–<span className="font-medium text-slate-800">{endRow}</span> of{' '}
            <span className="font-medium text-slate-800">{sorted.length}</span> provider{sorted.length !== 1 ? 's' : ''}
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
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value={0}>All</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              setGoToPageInput('');
            }}
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
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1));
              setGoToPageInput('');
            }}
            disabled={safePage >= totalPages}
            className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
          >
            Next
          </button>
        </div>
      </div>

      {editRecord && (
        <ProviderEditModal
          record={editRecord}
          records={records}
          marketSpecialties={marketSpecialties}
          onSave={(updates) => {
            onUpdate(editRecord.Employee_ID, updates);
            setEditRecord(null);
          }}
          onClose={() => setEditRecord(null)}
        />
      )}
    </div>
  );
}
