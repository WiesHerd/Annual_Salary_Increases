/**
 * Compare table: Provider | Specialty | Scenario A % | Scenario A $ | Scenario B % | Scenario B $ | Delta % | Delta $ | Policy source A | Policy source B
 * Matches Salary Review look and feel with resizable columns.
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { CompareScenarioRow } from '../../lib/compare-scenarios-filters';
import { formatCurrencyTwoDecimals } from '../review/review-table-columns';
import { safeLocalStorageSetItem } from '../../lib/safe-local-storage';

const PAGE_SIZES = [10, 25, 50, 100, 200] as const;

const STORAGE_KEY_WIDTHS = 'compare-scenarios-column-widths';
const COL_MIN = 60;
const COL_MAX = 400;

export type CompareTableColumnId =
  | 'compareCheckbox'
  | 'providerName'
  | 'specialty'
  | 'scenarioAPercent'
  | 'scenarioADollars'
  | 'scenarioBPercent'
  | 'scenarioBDollars'
  | 'deltaPercent'
  | 'deltaDollars'
  | 'policySourceA'
  | 'policySourceB';

const DEFAULT_WIDTHS: Record<CompareTableColumnId, number> = {
  compareCheckbox: 44,
  providerName: 160,
  specialty: 100,
  scenarioAPercent: 96,
  scenarioADollars: 100,
  scenarioBPercent: 96,
  scenarioBDollars: 100,
  deltaPercent: 80,
  deltaDollars: 100,
  policySourceA: 120,
  policySourceB: 120,
};

function loadColumnWidths(): Record<CompareTableColumnId, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WIDTHS);
    if (!raw) return { ...DEFAULT_WIDTHS };
    const parsed = JSON.parse(raw) as Record<string, number>;
    const out = { ...DEFAULT_WIDTHS };
    for (const key of Object.keys(DEFAULT_WIDTHS) as CompareTableColumnId[]) {
      if (Number.isFinite(parsed[key])) {
        out[key] = Math.max(COL_MIN, Math.min(COL_MAX, parsed[key]));
      }
    }
    return out;
  } catch {
    return { ...DEFAULT_WIDTHS };
  }
}

function saveColumnWidths(widths: Record<CompareTableColumnId, number>): void {
  safeLocalStorageSetItem(STORAGE_KEY_WIDTHS, JSON.stringify(widths));
}

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
  const [columnWidths, setColumnWidths] = useState<Record<CompareTableColumnId, number>>(loadColumnWidths);
  const [resizingColumnIndex, setResizingColumnIndex] = useState<number | null>(null);
  const resizeRef = useRef<{ columnId: CompareTableColumnId; startX: number; startWidth: number } | null>(null);

  const orderedColumnIds = useMemo((): CompareTableColumnId[] => {
    const base = [
      'providerName',
      'specialty',
      'scenarioAPercent',
      'scenarioADollars',
      'scenarioBPercent',
      'scenarioBDollars',
      'deltaPercent',
      'deltaDollars',
      'policySourceA',
      'policySourceB',
    ] as CompareTableColumnId[];
    return onToggleCompare ? (['compareCheckbox', ...base] as CompareTableColumnId[]) : base;
  }, [onToggleCompare]);

  const setColumnWidth = useCallback((columnId: CompareTableColumnId, widthPx: number) => {
    const clamped = Math.max(COL_MIN, Math.min(COL_MAX, widthPx));
    setColumnWidths((prev) => {
      const next = { ...prev, [columnId]: clamped };
      saveColumnWidths(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (resizeRef.current == null) return;
    const onMove = (e: MouseEvent) => {
      const ref = resizeRef.current;
      if (!ref) return;
      const delta = e.clientX - ref.startX;
      setColumnWidth(ref.columnId, ref.startWidth + delta);
    };
    const onUp = () => {
      resizeRef.current = null;
      setResizingColumnIndex(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setColumnWidth]);

  const handleResizeStart = useCallback(
    (index: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const columnId = orderedColumnIds[index];
      if (!columnId) return;
      setResizingColumnIndex(index);
      resizeRef.current = {
        columnId,
        startX: e.clientX,
        startWidth: columnWidths[columnId] ?? DEFAULT_WIDTHS[columnId],
      };
    },
    [orderedColumnIds, columnWidths]
  );

  const totalTableWidthPx = useMemo(
    () => orderedColumnIds.reduce((sum, id) => sum + (columnWidths[id] ?? DEFAULT_WIDTHS[id]), 0),
    [orderedColumnIds, columnWidths]
  );

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

  const getHeaderContent = (colId: CompareTableColumnId) => {
    switch (colId) {
      case 'compareCheckbox':
        return (
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
        );
      case 'providerName':
        return <>Provider <SortIcon col="providerName" /></>;
      case 'specialty':
        return <>Specialty <SortIcon col="specialty" /></>;
      case 'scenarioAPercent':
        return <>{scenarioALabel} % <SortIcon col="scenarioAPercent" /></>;
      case 'scenarioADollars':
        return <>{scenarioALabel} $</>;
      case 'scenarioBPercent':
        return <>{scenarioBLabel} % <SortIcon col="scenarioBPercent" /></>;
      case 'scenarioBDollars':
        return <>{scenarioBLabel} $</>;
      case 'deltaPercent':
        return <>Delta % <SortIcon col="deltaPercent" /></>;
      case 'deltaDollars':
        return <>Delta $ <SortIcon col="deltaDollars" /></>;
      case 'policySourceA':
        return 'Policy source A';
      case 'policySourceB':
        return 'Policy source B';
      default:
        return null;
    }
  };

  const getCellContent = (colId: CompareTableColumnId, row: CompareScenarioRow) => {
    switch (colId) {
      case 'compareCheckbox':
        return (
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
        );
      case 'providerName':
        return row.record.Provider_Name ?? row.record.Employee_ID;
      case 'specialty':
        return row.record.Specialty ?? '—';
      case 'scenarioAPercent':
        return `${row.pctA.toFixed(2)}%`;
      case 'scenarioADollars':
        return formatCurrencyTwoDecimals(row.dollarA);
      case 'scenarioBPercent':
        return `${row.pctB.toFixed(2)}%`;
      case 'scenarioBDollars':
        return formatCurrencyTwoDecimals(row.dollarB);
      case 'deltaPercent':
        return `${row.deltaPct > 0 ? '+' : ''}${row.deltaPct.toFixed(2)}%`;
      case 'deltaDollars':
        return `${row.deltaDollars > 0 ? '+' : ''}${formatCurrencyTwoDecimals(row.deltaDollars)}`;
      case 'policySourceA':
        return row.sourceA;
      case 'policySourceB':
        return row.sourceB;
      default:
        return null;
    }
  };

  const isRightAlign = (colId: CompareTableColumnId) =>
    ['scenarioAPercent', 'scenarioADollars', 'scenarioBPercent', 'scenarioBDollars', 'deltaPercent', 'deltaDollars'].includes(colId);

  const isSortable = (colId: CompareTableColumnId): colId is SortKey =>
    ['providerName', 'specialty', 'scenarioAPercent', 'scenarioBPercent', 'deltaPercent', 'deltaDollars'].includes(colId);

  return (
    <div className="flex flex-col min-w-0 flex-1 border-t border-neutral-200/80">
      <div className="app-data-table-wrapper">
        <table
          className="app-data-table border-collapse table-fixed"
          style={{
            width: totalTableWidthPx,
            minWidth: `max(100%, ${totalTableWidthPx}px)`,
          }}
        >
          <colgroup>
            {orderedColumnIds.map((id) => (
              <col key={id} style={{ width: columnWidths[id] ?? DEFAULT_WIDTHS[id], minWidth: columnWidths[id] ?? DEFAULT_WIDTHS[id] }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-neutral-50 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
            <tr className="bg-neutral-50">
              {orderedColumnIds.map((colId, index) => {
                const widthPx = columnWidths[colId] ?? DEFAULT_WIDTHS[colId];
                const sortable = isSortable(colId);
                const rightAlign = isRightAlign(colId);
                return (
                  <th
                    key={colId}
                    style={{ width: widthPx, minWidth: widthPx, maxWidth: widthPx }}
                    className={`relative px-2 py-3 text-[11px] font-semibold text-neutral-600 uppercase tracking-wide select-none bg-neutral-50 hover:bg-neutral-100 transition-colors overflow-hidden whitespace-nowrap ${
                      colId === 'compareCheckbox' ? 'cursor-default text-left' : sortable ? 'cursor-pointer' : ''
                    } ${rightAlign ? 'text-right' : 'text-left'} ${resizingColumnIndex === index ? 'select-none' : ''}`}
                    onClick={colId === 'compareCheckbox' ? undefined : sortable ? () => handleSort(colId) : undefined}
                    title={colId === 'compareCheckbox' ? 'Select 2–4 providers to compare in detail' : undefined}
                  >
                    <span className={`flex items-center gap-1 min-w-0 ${rightAlign ? 'justify-end' : ''}`}>
                      {getHeaderContent(colId)}
                    </span>
                    <span
                      role="separator"
                      aria-label={`Resize column`}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize shrink-0 touch-none z-30 hover:bg-blue-300/50 active:bg-blue-400/50"
                      style={{ marginRight: '-4px' }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleResizeStart(index)(e);
                      }}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {paginatedRows.map((row) => (
              <tr key={row.record.Employee_ID} className="hover:bg-indigo-50/30 transition-colors">
                {orderedColumnIds.map((colId) => {
                  const rightAlign = isRightAlign(colId);
                  const content = getCellContent(colId, row);
                  const isDeltaPct = colId === 'deltaPercent';
                  const isDeltaDollars = colId === 'deltaDollars';
                  const deltaClass =
                    isDeltaPct || isDeltaDollars
                      ? (row.deltaPct > 0 || row.deltaDollars > 0 ? 'text-emerald-600' : row.deltaPct < 0 || row.deltaDollars < 0 ? 'text-amber-600' : '')
                      : '';
                  return (
                    <td
                      key={colId}
                      className={`px-2 py-1.5 text-sm text-slate-800 whitespace-nowrap overflow-hidden ${colId === 'providerName' ? 'text-slate-900 font-medium' : ''} ${rightAlign ? 'text-right tabular-nums' : ''} ${colId === 'policySourceA' || colId === 'policySourceB' ? 'text-slate-600 text-xs' : ''} ${deltaClass}`}
                    >
                      {content}
                    </td>
                  );
                })}
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
