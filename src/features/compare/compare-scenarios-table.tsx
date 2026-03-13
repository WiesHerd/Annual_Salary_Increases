/**
 * Compare table: Provider | Specialty | Scenario A % | Scenario A $ | Scenario B % | Scenario B $ | Delta % | Delta $ | Policy source A | Policy source B
 * Matches Salary Review / provider-table layout with pagination.
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import type { CompareScenarioRow } from '../../lib/compare-scenarios-filters';
import { formatCurrencyTwoDecimals } from '../review/review-table-columns';

const PAGE_SIZES = [10, 25, 50, 100, 200] as const;

export interface CompareScenariosTableProps {
  rows: CompareScenarioRow[];
  scenarioALabel: string;
  scenarioBLabel: string;
  selectedForCompare?: string[];
  onToggleCompare?: (ids: string[]) => void;
  /** When true and rows empty, show "Run comparison" placeholder; when false and rows empty, show "No matches" */
  hasRunComparison?: boolean;
}

type SortKey = 'providerName' | 'specialty' | 'deltaPercent' | 'deltaDollars' | 'scenarioAPercent' | 'scenarioBPercent';
type SortDir = 'asc' | 'desc';

export function CompareScenariosTable({
  rows,
  scenarioALabel,
  scenarioBLabel,
  selectedForCompare = [],
  onToggleCompare,
  hasRunComparison = false,
}: CompareScenariosTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('providerName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [goToPageInput, setGoToPageInput] = useState('');

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'providerName':
          cmp = (a.record.Provider_Name ?? a.record.Employee_ID ?? '').localeCompare(
            b.record.Provider_Name ?? b.record.Employee_ID ?? ''
          );
          break;
        case 'specialty':
          cmp = (a.record.Specialty ?? '').localeCompare(b.record.Specialty ?? '');
          break;
        case 'deltaPercent':
          cmp = a.deltaPct - b.deltaPct;
          break;
        case 'deltaDollars':
          cmp = a.deltaDollars - b.deltaDollars;
          break;
        case 'scenarioAPercent':
          cmp = a.pctA - b.pctA;
          break;
        case 'scenarioBPercent':
          cmp = a.pctB - b.pctB;
          break;
        default:
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedRows = useMemo(
    () => sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sortedRows, safePage, pageSize]
  );
  const startRow = (safePage - 1) * pageSize + 1;
  const endRow = Math.min(safePage * pageSize, sortedRows.length);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(totalPages);
  }, [page, totalPages]);

  const handleGoToPage = useCallback(() => {
    const num = parseInt(goToPageInput.trim(), 10);
    if (Number.isNaN(num) || num < 1 || num > totalPages) {
      setGoToPageInput(String(safePage));
      return;
    }
    setPage(num);
    setGoToPageInput('');
  }, [goToPageInput, totalPages, safePage]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const toggleSelect = (employeeId: string) => {
    if (!onToggleCompare) return;
    if (selectedForCompare.includes(employeeId)) {
      onToggleCompare(selectedForCompare.filter((id) => id !== employeeId));
    } else {
      onToggleCompare([...selectedForCompare, employeeId]);
    }
  };

  const selectAllOnPage = () => {
    if (!onToggleCompare) return;
    const onPage = paginatedRows.map((r) => r.record.Employee_ID);
    const current = new Set(selectedForCompare);
    const added = onPage.filter((id) => !current.has(id));
    if (added.length === 0) {
      onToggleCompare(selectedForCompare.filter((id) => !onPage.includes(id)));
    } else {
      onToggleCompare([...selectedForCompare, ...added].slice(0, 4));
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="ml-0.5 text-slate-300">⇅</span>;
    return <span className="ml-0.5 text-blue-600">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-5 py-12 text-center text-slate-600">
        {hasRunComparison ? (
          <p>No providers match the current filters.</p>
        ) : (
          <p>Run a comparison to see the table.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0 flex-1 border-t border-neutral-200/80">
      <div className="app-data-table-wrapper">
        <table className="app-data-table">
          <thead>
            <tr>
              {onToggleCompare && (
                <th className="w-10 text-left cursor-default" title="Select for compare">
                  <label className="flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paginatedRows.length > 0 && paginatedRows.every((r) => selectedForCompare.includes(r.record.Employee_ID))}
                      ref={(el) => {
                        if (el)
                          el.indeterminate =
                            paginatedRows.length > 0 &&
                            paginatedRows.some((r) => selectedForCompare.includes(r.record.Employee_ID)) &&
                            !paginatedRows.every((r) => selectedForCompare.includes(r.record.Employee_ID));
                      }}
                      onChange={selectAllOnPage}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      aria-label="Select all on page for compare"
                    />
                  </label>
                </th>
              )}
              <th className="sortable text-left" onClick={() => handleSort('providerName')}>
                Provider
                <SortIcon col="providerName" />
              </th>
              <th className="sortable text-left" onClick={() => handleSort('specialty')}>
                Specialty
                <SortIcon col="specialty" />
              </th>
              <th className="sortable text-right" onClick={() => handleSort('scenarioAPercent')}>
                {scenarioALabel} %
                <SortIcon col="scenarioAPercent" />
              </th>
              <th className="text-right">{scenarioALabel} $</th>
              <th className="sortable text-right" onClick={() => handleSort('scenarioBPercent')}>
                {scenarioBLabel} %
                <SortIcon col="scenarioBPercent" />
              </th>
              <th className="text-right">{scenarioBLabel} $</th>
              <th className="sortable text-right" onClick={() => handleSort('deltaPercent')}>
                Delta %
                <SortIcon col="deltaPercent" />
              </th>
              <th className="sortable text-right" onClick={() => handleSort('deltaDollars')}>
                Delta $
                <SortIcon col="deltaDollars" />
              </th>
              <th className="text-left">Policy source A</th>
              <th className="text-left">Policy source B</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr key={row.record.Employee_ID}>
                {onToggleCompare && (
                  <td>
                    <label className="flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedForCompare.includes(row.record.Employee_ID)}
                        onChange={() => toggleSelect(row.record.Employee_ID)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        aria-label={`Select ${row.record.Provider_Name ?? row.record.Employee_ID} for compare`}
                      />
                    </label>
                  </td>
                )}
                <td className="text-slate-900">{row.record.Provider_Name ?? row.record.Employee_ID}</td>
                <td>{row.record.Specialty ?? '—'}</td>
                <td className="text-right tabular-nums">{row.pctA.toFixed(2)}%</td>
                <td className="text-right tabular-nums">{formatCurrencyTwoDecimals(row.dollarA)}</td>
                <td className="text-right tabular-nums">{row.pctB.toFixed(2)}%</td>
                <td className="text-right tabular-nums">{formatCurrencyTwoDecimals(row.dollarB)}</td>
                <td
                  className={`text-right tabular-nums ${
                    row.deltaPct > 0 ? 'text-emerald-600' : row.deltaPct < 0 ? 'text-amber-600' : ''
                  }`}
                >
                  {row.deltaPct > 0 ? '+' : ''}
                  {row.deltaPct.toFixed(2)}%
                </td>
                <td
                  className={`text-right tabular-nums ${
                    row.deltaDollars > 0 ? 'text-emerald-600' : row.deltaDollars < 0 ? 'text-amber-600' : ''
                  }`}
                >
                  {row.deltaDollars > 0 ? '+' : ''}
                  {formatCurrencyTwoDecimals(row.deltaDollars)}
                </td>
                <td className="text-slate-600 text-xs">{row.sourceA}</td>
                <td className="text-slate-600 text-xs">{row.sourceB}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="app-data-table-pagination">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm text-slate-600">
            Showing <span className="font-medium text-slate-800">{startRow}</span>–<span className="font-medium text-slate-800">{endRow}</span> of{' '}
            <span className="font-medium text-slate-800">{sortedRows.length}</span> provider{sortedRows.length !== 1 ? 's' : ''}
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
    </div>
  );
}
