import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useAppState } from '../../hooks/use-app-state';
import { useParametersState } from '../../hooks/use-parameters-state';
import type { ProviderRecord } from '../../types/provider';
import type { MarketRow } from '../../types/market';
import { ReviewStatus } from '../../types/enums';
import { exportToCsv, exportToXlsx } from '../../lib/batch-export';
import { recalculateProviderRow } from '../../lib/calculations/recalculate-provider-row';
import { enrichReviewDetail } from '../../lib/review-detail-enrichment';
import {
  applyFilters,
  deriveFilterOptionsCascading,
  loadFiltersFromStorage,
  saveFiltersToStorage,
  DEFAULT_SALARY_REVIEW_FILTERS,
  type SalaryReviewFilters,
} from '../../lib/review-filters';
import {
  REVIEW_TABLE_COLUMNS,
  REVIEW_VIEW_PRESETS,
  getReviewCellValue,
  getReviewCellSortValue,
  formatReviewCellValue,
  formatCurrencyTwoDecimals,
  parseCurrencyInput,
  formatPercentTwoDecimals,
  parsePercentInput,
  type ReviewTableColumnId,
  type ReviewViewPresetId,
} from './review-table-columns';
import { loadReviewTableFromStorage, saveReviewTableToStorage } from '../../lib/review-table-storage';
import { ProviderDetailPanel } from './provider-detail-panel';
import { SalaryReviewFilterBar } from './salary-review-filter-bar';

type SortDir = 'asc' | 'desc';

interface SalaryReviewPageProps {
  onNavigateToImport?: () => void;
}

export function SalaryReviewPage({ onNavigateToImport }: SalaryReviewPageProps) {
  const { records, setRecords, marketData, loaded } = useAppState();
  const { experienceBands, meritMatrix } = useParametersState();
  const [reviewTableState, setReviewTableState] = useState(loadReviewTableFromStorage);
  const visibleColumnIds = reviewTableState.visibleColumnIds;
  const activePreset = reviewTableState.preset;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<ReviewTableColumnId>('providerName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [notesModalEmployeeId, setNotesModalEmployeeId] = useState<string | null>(null);
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState<SalaryReviewFilters>(() => loadFiltersFromStorage());
  const [draggingColumnIndex, setDraggingColumnIndex] = useState<number | null>(null);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState<number | null>(null);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [editingCell, setEditingCell] = useState<{ employeeId: string; columnId: ReviewTableColumnId } | null>(null);
  const [editBuffer, setEditBuffer] = useState('');

  const DRAWER_MIN_WIDTH = 320;
  const DRAWER_MAX_WIDTH = 900;
  const DRAWER_DEFAULT_WIDTH = 380;
  const [drawerWidth, setDrawerWidth] = useState(DRAWER_DEFAULT_WIDTH);
  const drawerResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleDrawerResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    drawerResizeRef.current = { startX: e.clientX, startWidth: drawerWidth };
  }, [drawerWidth]);

  useEffect(() => {
    if (drawerResizeRef.current == null) return;
    const onMove = (e: MouseEvent) => {
      const ref = drawerResizeRef.current;
      if (!ref) return;
      const delta = ref.startX - e.clientX;
      setDrawerWidth(() => Math.min(DRAWER_MAX_WIDTH, Math.max(DRAWER_MIN_WIDTH, ref.startWidth + delta)));
    };
    const onUp = () => {
      drawerResizeRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleCloseDrawer = useCallback(() => {
    if (!selectedEmployeeId) return;
    setDrawerClosing(true);
    const t = setTimeout(() => {
      setSelectedEmployeeId(null);
      setDrawerClosing(false);
    }, 300);
    return () => clearTimeout(t);
  }, [selectedEmployeeId]);

  const marketBySpecialty = useMemo(() => {
    const m = new Map<string, MarketRow>();
    for (const row of marketData) m.set(row.specialty.trim(), row);
    return m;
  }, [marketData]);

  const visibleColumns = useMemo(
    () =>
      visibleColumnIds
        .map((id) => REVIEW_TABLE_COLUMNS.find((c) => c.id === id))
        .filter((c): c is (typeof REVIEW_TABLE_COLUMNS)[number] => c != null),
    [visibleColumnIds]
  );

  useEffect(() => {
    saveReviewTableToStorage({ visibleColumnIds, preset: activePreset });
  }, [visibleColumnIds, activePreset]);

  const applyPreset = useCallback((presetId: ReviewViewPresetId) => {
    setReviewTableState({ visibleColumnIds: [...REVIEW_VIEW_PRESETS[presetId]], preset: presetId });
  }, []);

  const setVisibleColumnIds = useCallback((updater: (prev: ReviewTableColumnId[]) => ReviewTableColumnId[]) => {
    setReviewTableState((prev) => ({ ...prev, visibleColumnIds: updater(prev.visibleColumnIds), preset: 'custom' }));
  }, []);

  const filteredRecords = useMemo(
    () => applyFilters(records, filters, experienceBands),
    [records, filters, experienceBands]
  );
  const filterOptions = useMemo(
    () => deriveFilterOptionsCascading(records, filters, experienceBands),
    [records, filters, experienceBands]
  );

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const aVal = getReviewCellSortValue(a, sortKey, experienceBands);
      const bVal = getReviewCellSortValue(b, sortKey, experienceBands);
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
      else cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRecords, sortKey, sortDir, experienceBands]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedRecords = useMemo(
    () => sortedRecords.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sortedRecords, safePage, pageSize]
  );
  const startRow = (safePage - 1) * pageSize + 1;
  const endRow = Math.min(safePage * pageSize, sortedRecords.length);

  const selectedRecord = useMemo(
    () => (selectedEmployeeId ? records.find((r) => r.Employee_ID === selectedEmployeeId) ?? null : null),
    [records, selectedEmployeeId]
  );
  const selectedEnrichment = useMemo(
    () => (selectedRecord ? enrichReviewDetail(selectedRecord) : null),
    [selectedRecord]
  );

  const selectedIndexInSorted = useMemo(
    () => (selectedEmployeeId ? sortedRecords.findIndex((r) => r.Employee_ID === selectedEmployeeId) : -1),
    [sortedRecords, selectedEmployeeId]
  );
  const hasPrevInList = selectedIndexInSorted > 0;
  const hasNextInList = selectedIndexInSorted >= 0 && selectedIndexInSorted < sortedRecords.length - 1;
  const handleSelectPrev = useCallback(() => {
    if (!hasPrevInList) return;
    const prevIndex = selectedIndexInSorted - 1;
    const newPage = Math.floor(prevIndex / pageSize) + 1;
    setPage(newPage);
    setSelectedEmployeeId(sortedRecords[prevIndex].Employee_ID);
    setDrawerClosing(false);
  }, [hasPrevInList, selectedIndexInSorted, pageSize, sortedRecords]);
  const handleSelectNext = useCallback(() => {
    if (!hasNextInList) return;
    const nextIndex = selectedIndexInSorted + 1;
    const newPage = Math.floor(nextIndex / pageSize) + 1;
    setPage(newPage);
    setSelectedEmployeeId(sortedRecords[nextIndex].Employee_ID);
    setDrawerClosing(false);
  }, [hasNextInList, selectedIndexInSorted, pageSize, sortedRecords]);

  const handleFiltersChange = useCallback((next: SalaryReviewFilters) => {
    setFilters(next);
    saveFiltersToStorage(next);
    setPage(1);
  }, []);

  const handleSort = useCallback((id: ReviewTableColumnId) => {
    setSortKey(id);
    setSortDir((d) => (sortKey === id ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
    setPage(1);
  }, [sortKey]);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hasNextInList) handleSelectNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hasPrevInList) handleSelectPrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedEmployeeId, hasNextInList, hasPrevInList, handleSelectNext, handleSelectPrev]);

  const updateRecord = useCallback(
    (employeeId: string, updates: Partial<ProviderRecord>) => {
      const record = records.find((r) => r.Employee_ID === employeeId);
      if (!record) return;
      const merged = { ...record, ...updates };
      const matchKey = (merged.Market_Specialty_Override ?? merged.Specialty ?? merged.Benchmark_Group ?? '').trim();
      const marketRow = matchKey ? marketBySpecialty.get(matchKey) : undefined;
      const next = recalculateProviderRow({
        record: merged,
        marketRow,
        experienceBands,
        meritMatrixRows: meritMatrix,
      });
      setRecords(records.map((r) => (r.Employee_ID === employeeId ? next : r)));
    },
    [records, setRecords, marketBySpecialty, experienceBands, meritMatrix]
  );

  const handleExportCsv = () => {
    const csv = exportToCsv(records);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salary-review.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXlsx = async () => {
    const buffer = exportToXlsx(records);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salary-review.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleColumn = useCallback((id: ReviewTableColumnId) => {
    setVisibleColumnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, [setVisibleColumnIds]);

  const moveColumn = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setVisibleColumnIds((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
    setDraggingColumnIndex(null);
    setDragOverColumnIndex(null);
  }, []);

  const handleHeaderDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggingColumnIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
  };

  const handleHeaderDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumnIndex(index);
  };

  const handleHeaderDragLeave = () => {
    setDragOverColumnIndex(null);
  };

  const handleHeaderDrop = (toIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = draggingColumnIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (Number.isNaN(fromIndex)) return;
    moveColumn(fromIndex, toIndex);
    setDragOverColumnIndex(null);
  };

  const handleHeaderDragEnd = () => {
    setDraggingColumnIndex(null);
    setDragOverColumnIndex(null);
  };

  const handleGoToPage = useCallback(() => {
    const num = parseInt(goToPageInput.trim(), 10);
    if (Number.isNaN(num) || num < 1 || num > totalPages) {
      setGoToPageInput(String(safePage));
      return;
    }
    setPage(num);
    setGoToPageInput('');
  }, [goToPageInput, totalPages, safePage]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-500 font-medium">
        Loading…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-indigo-100 p-10 text-center shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07)]">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Salary review</h2>
        <p className="text-slate-600 mb-4">No provider records yet. Import provider data from the Import data screen first.</p>
        {onNavigateToImport && (
          <button type="button" onClick={onNavigateToImport} className="text-indigo-600 font-medium hover:underline">
            Go to Import data
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0">
      <div className="min-w-0 flex flex-col border border-indigo-100 rounded-2xl bg-white shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07)]">
        <div className="shrink-0 px-5 pt-4 pb-2 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Salary review</h2>
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm text-slate-600 mr-1">View:</span>
            <div className="flex rounded-xl border border-slate-300 overflow-hidden bg-slate-50">
              {(['meeting', 'full', 'comp'] as const).map((presetId) => (
                <button
                  key={presetId}
                  type="button"
                  onClick={() => applyPreset(presetId)}
                  className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    activePreset === presetId
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {presetId}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setReviewTableState((prev) => ({ ...prev, preset: 'custom' }))}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activePreset === 'custom'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                Custom
              </button>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setColumnPickerOpen((o) => !o)}
                className="px-3 py-2 text-sm font-medium border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-700"
              >
                Columns
              </button>
              {columnPickerOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setColumnPickerOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-64 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-2">
                    {REVIEW_TABLE_COLUMNS.map((col) => (
                      <label key={col.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumnIds.includes(col.id)}
                          onChange={() => toggleColumn(col.id)}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 text-sm font-medium border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-700"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportXlsx}
              className="px-3 py-2 text-sm font-medium border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-700"
            >
              Export XLSX
            </button>
          </div>
        </div>
        <div className="shrink-0 px-5">
          <SalaryReviewFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            filterOptions={filterOptions}
            totalCount={records.length}
            filteredCount={filteredRecords.length}
          />
        </div>
        <div
          className={`flex flex-col min-w-0 ${filteredRecords.length === 0 ? 'min-h-[420px]' : ''}`}
        >
          {filteredRecords.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-slate-600 font-medium">No providers match your filters.</p>
              <p className="text-sm text-slate-500 mt-1">Clear filters or change criteria to see providers.</p>
              <button
                type="button"
                onClick={() => handleFiltersChange({ ...DEFAULT_SALARY_REVIEW_FILTERS })}
                className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
          <div className="min-w-0 overflow-x-auto">
            <table className="min-w-full border-collapse table-auto">
              <thead className="sticky top-0 z-20 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_1px_0_0_rgba(203,213,225,0.8)]">
                <tr className="bg-slate-100">
                  {visibleColumns.map((col, index) => (
                    <th
                      key={col.id}
                      draggable
                      onDragStart={handleHeaderDragStart(index)}
                      onDragOver={handleHeaderDragOver(index)}
                      onDragLeave={handleHeaderDragLeave}
                      onDrop={handleHeaderDrop(index)}
                      onDragEnd={handleHeaderDragEnd}
                      title={col.label}
                      className={`px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer select-none bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap w-max ${
                        index === 0 ? 'sticky left-0 z-[21] min-w-[12rem] shadow-[2px_0_4px_rgba(0,0,0,0.06)]' : 'min-w-[8rem]'
                      } ${col.align === 'right' ? 'text-right' : 'text-left'} ${draggingColumnIndex === index ? 'opacity-50' : ''} ${
                        dragOverColumnIndex === index ? 'bg-indigo-200 ring-1 ring-indigo-400' : ''
                      }`}
                      onClick={() => handleSort(col.id)}
                    >
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="inline-block w-3 shrink-0 cursor-grab active:cursor-grabbing text-slate-400"
                          aria-hidden
                          title="Drag to reorder column"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ⋮⋮
                        </span>
                        {col.label}
                        {sortKey === col.id && (
                          <span className="text-indigo-600" aria-hidden>
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {paginatedRecords.map((r) => (
                  <tr
                    key={r.Employee_ID}
                    onClick={() => {
                      setSelectedEmployeeId(r.Employee_ID);
                      setDrawerClosing(false);
                    }}
                    className={`group transition-colors cursor-pointer ${
                      selectedEmployeeId === r.Employee_ID ? 'bg-indigo-100/60' : 'hover:bg-indigo-50/30'
                    }`}
                  >
                    {visibleColumns.map((col, colIndex) => {
                      const value = getReviewCellValue(r, col.id, experienceBands);
                      const display = formatReviewCellValue(value, col.format);
                      const isEditable = col.editable && col.id !== 'notesIndicator';
                      const isNotes = col.id === 'notesIndicator';
                      const isFirstCol = colIndex === 0;
                      const stickyCellClass = isFirstCol
                        ? `sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)] ${
                            selectedEmployeeId === r.Employee_ID ? 'bg-indigo-100/60' : 'bg-white group-hover:bg-indigo-50/30'
                          }`
                        : '';

                      return (
                        <td
                          key={col.id}
                          className={`px-3 py-2 text-sm text-slate-800 whitespace-nowrap w-max ${stickyCellClass} ${col.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                          onClick={(e) => isNotes && e.stopPropagation()}
                        >
                          {col.id === 'reviewStatus' && col.editable ? (
                            <select
                              value={r.Review_Status ?? ''}
                              onChange={(e) => updateRecord(r.Employee_ID, { Review_Status: e.target.value as ReviewStatus })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full min-w-[100px] px-2 py-1 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              {Object.values(ReviewStatus).map((s) => (
                                <option key={s} value={s}>
                                  {s.replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                          ) : isNotes && col.editable ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotesModalEmployeeId(r.Employee_ID);
                              }}
                              className="p-1 rounded hover:bg-slate-200 text-slate-600"
                              title={r.Notes ?? 'Add note'}
                            >
                              {r.Notes ? '📝' : '+'}
                            </button>
                          ) : isEditable && (col.id === 'proposedBaseSalary' || col.id === 'approvedIncreaseAmount') ? (
                            (() => {
                              const isEditing = editingCell?.employeeId === r.Employee_ID && editingCell?.columnId === col.id;
                              const displayValue = typeof value === 'number' ? formatCurrencyTwoDecimals(value) : '';
                              return (
                                <input
                                  type="text"
                                  value={isEditing ? editBuffer : displayValue}
                                  onFocus={() => {
                                    setEditingCell({ employeeId: r.Employee_ID, columnId: col.id });
                                    setEditBuffer(typeof value === 'number' ? String(value) : '');
                                  }}
                                  onChange={(e) => setEditBuffer(e.target.value)}
                                  onBlur={() => {
                                    const num = parseCurrencyInput(editBuffer);
                                    if (col.id === 'proposedBaseSalary') updateRecord(r.Employee_ID, { Proposed_Base_Salary: num });
                                    if (col.id === 'approvedIncreaseAmount') updateRecord(r.Employee_ID, { Approved_Increase_Amount: num });
                                    setEditingCell(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-28 px-2 py-1 text-sm border border-slate-300 rounded-lg tabular-nums text-right focus:ring-2 focus:ring-indigo-500"
                                />
                              );
                            })()
                          ) : isEditable && col.id === 'approvedIncreasePercent' ? (
                            (() => {
                              const isEditing = editingCell?.employeeId === r.Employee_ID && editingCell?.columnId === col.id;
                              const displayValue = typeof value === 'number' ? formatPercentTwoDecimals(value) : '';
                              return (
                                <input
                                  type="text"
                                  value={isEditing ? editBuffer : displayValue}
                                  onFocus={() => {
                                    setEditingCell({ employeeId: r.Employee_ID, columnId: col.id });
                                    setEditBuffer(typeof value === 'number' ? String(value) : '');
                                  }}
                                  onChange={(e) => setEditBuffer(e.target.value)}
                                  onBlur={() => {
                                    const num = parsePercentInput(editBuffer);
                                    updateRecord(r.Employee_ID, { Approved_Increase_Percent: num });
                                    setEditingCell(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-24 px-2 py-1 text-sm border border-slate-300 rounded-lg tabular-nums text-right focus:ring-2 focus:ring-indigo-500"
                                />
                              );
                            })()
                          ) : isEditable && col.id === 'proposedCf' ? (
                            <input
                              type="number"
                              value={typeof value === 'number' ? value : ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const num = raw === '' ? undefined : Number(raw);
                                updateRecord(r.Employee_ID, { Proposed_CF: num });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-24 px-2 py-1 text-sm border border-slate-300 rounded-lg tabular-nums text-right focus:ring-2 focus:ring-indigo-500"
                              step={1}
                            />
                          ) : isEditable && col.id === 'proposedTier' ? (
                            <input
                              type="text"
                              value={r.Proposed_Tier ?? ''}
                              onChange={(e) => updateRecord(r.Employee_ID, { Proposed_Tier: e.target.value || undefined })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-24 px-2 py-1 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                          ) : (
                            display
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
          {filteredRecords.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/80 shrink-0 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                Showing <span className="font-medium text-slate-800">{startRow}</span>–<span className="font-medium text-slate-800">{endRow}</span> of{' '}
                <span className="font-medium text-slate-800">{sortedRecords.length}</span> provider{sortedRecords.length !== 1 ? 's' : ''}
              </span>
              <span className="text-slate-400">|</span>
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
                  {[10, 25, 50, 100, 200].map((n) => (
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
          )}
        </div>
      </div>

      {/* Provider detail drawer: slides in from right when a row is selected */}
      {selectedEmployeeId && (
        <>
          <div
            role="presentation"
            className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ease-out ${
              drawerClosing ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={handleCloseDrawer}
            aria-hidden
          />
          <div
            className={`fixed right-0 top-0 bottom-0 z-50 bg-white border-l border-slate-200 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
              drawerClosing ? 'translate-x-full' : 'translate-x-0'
            }`}
            style={{ width: drawerWidth }}
            role="dialog"
            aria-label="Provider details"
          >
            <div
              role="separator"
              aria-label="Resize drawer"
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize shrink-0 touch-none hover:bg-indigo-200/50 active:bg-indigo-300/50 transition-colors z-10"
              onMouseDown={handleDrawerResizeStart}
            />
            <ProviderDetailPanel
              provider={selectedRecord}
              enrichment={selectedEnrichment}
              onClose={handleCloseDrawer}
              onSelectPrev={handleSelectPrev}
              onSelectNext={handleSelectNext}
              hasPrev={hasPrevInList}
              hasNext={hasNextInList}
            />
          </div>
        </>
      )}

      {/* Notes modal */}
      {notesModalEmployeeId && (() => {
        const rec = records.find((r) => r.Employee_ID === notesModalEmployeeId);
        return rec ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setNotesModalEmployeeId(null)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-slate-800 mb-2">Notes — {rec.Provider_Name ?? rec.Employee_ID}</h3>
              <textarea
                value={rec.Notes ?? ''}
                onChange={(e) => updateRecord(notesModalEmployeeId, { Notes: e.target.value || undefined })}
                className="w-full h-32 px-3 py-2 border border-slate-300 rounded-xl text-sm resize-y"
                placeholder="Add notes…"
              />
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setNotesModalEmployeeId(null)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
}
