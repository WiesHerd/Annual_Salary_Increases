import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useAppState } from '../../hooks/use-app-state';
import { useParametersState } from '../../hooks/use-parameters-state';
import { usePolicyEngineState } from '../../hooks/use-policy-engine-state';
import { useSelectedCycle } from '../../hooks/use-selected-cycle';
import { useCustomStreams } from '../../hooks/use-custom-streams';
import type { ProviderRecord } from '../../types/provider';
import { ReviewStatus } from '../../types/enums';
import { exportToCsv, exportToXlsx } from '../../lib/batch-export';
import { EmptyStatePanel } from '../../components/empty-state-panel';
import {
  getExperienceBandAlignmentForProvider,
  recalculateProviderRow,
} from '../../lib/calculations/recalculate-provider-row';
import { getEquityRecommendation } from '../../lib/calculations/equity-recommendation';
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
  DEFAULT_PRESET_LABELS,
  DEFAULT_PRESET_ORDER,
  getReviewCellValue,
  getReviewCellSortValue,
  formatReviewCellValue,
  formatCurrencyTwoDecimals,
  parseCurrencyInput,
  formatPercentTwoDecimals,
  parsePercentInput,
  getDefaultColumnWidths,
  type ReviewTableColumnId,
  type ReviewViewPresetId,
  type SavedCustomView,
} from './review-table-columns';
import { loadReviewTableFromStorage, saveReviewTableToStorage } from '../../lib/review-table-storage';
import {
  computeSummary,
  computeSummaryByDimension,
  resolveBudgetForCycle,
} from '../../lib/salary-review-summary';
import { ProviderDetailPanel } from './provider-detail-panel';
import { ProviderCompareModal } from './provider-compare-modal';
import { SalaryReviewFilterBar } from './salary-review-filter-bar';
import { SalaryReviewSummaryBar } from './salary-review-summary-bar';
import { ExperienceSalaryTrendChart } from './experience-salary-trend-chart';
import type { ExperienceSalaryGroupBy } from '../../lib/experience-salary-chart-data';
import { useSalaryReviewPolicyEngine } from './use-salary-review-policy-engine';

type SortDir = 'asc' | 'desc';

interface SalaryReviewPageProps {
  onNavigateToImport?: () => void;
  fullScreen?: boolean;
  onFullScreenChange?: (full: boolean) => void;
}

export function SalaryReviewPage({ onNavigateToImport, fullScreen = false, onFullScreenChange }: SalaryReviewPageProps) {
  const { records, setRecords, marketSurveys, customDatasets, loaded } = useAppState();
  const { definitions: customStreamDefinitions, getStreamData, buildProviderLookup } = useCustomStreams();
  const customStreamLookups = useMemo(
    () =>
      customStreamDefinitions
        .filter((d) => d.linkType === 'provider')
        .map((d) => ({
          label: d.label,
          columnOrder: getStreamData(d.id)?.columnOrder ?? [],
          getRow: buildProviderLookup(d.id),
        })),
    [customStreamDefinitions, getStreamData, buildProviderLookup]
  );
  const { experienceBands, meritMatrix, cycles, budgetSettings, cfBySpecialty } = useParametersState();
  const { policies, customModels, tierTables } = usePolicyEngineState();
  const [selectedCycleId] = useSelectedCycle(cycles);
  const [reviewTableState, setReviewTableState] = useState(loadReviewTableFromStorage);
  const visibleColumnIds = reviewTableState.visibleColumnIds;
  const activePreset = reviewTableState.preset;
  const savedCustomViews = reviewTableState.savedCustomViews ?? [];
  const activeCustomViewId = reviewTableState.activeCustomViewId ?? null;
  const columnWidths = reviewTableState.columnWidths ?? getDefaultColumnWidths();
  const frozenColumnIds = reviewTableState.frozenColumnIds ?? ['compareCheckbox', 'providerName'];
  const presetLabels = reviewTableState.presetLabels ?? {};
  const presetOrder = reviewTableState.presetOrder ?? [...DEFAULT_PRESET_ORDER];
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<ReviewTableColumnId>('providerName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [notesModalEmployeeId, setNotesModalEmployeeId] = useState<string | null>(null);
  const [customViewDropdownOpen, setCustomViewDropdownOpen] = useState(false);
  const [columnDropdownOpen, setColumnDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState<SalaryReviewFilters>(() => loadFiltersFromStorage());
  const [draggingColumnIndex, setDraggingColumnIndex] = useState<number | null>(null);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState<number | null>(null);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [editingCell, setEditingCell] = useState<{ employeeId: string; columnId: ReviewTableColumnId } | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [resizingColumnIndex, setResizingColumnIndex] = useState<number | null>(null);
  const resizeRef = useRef<{ columnId: ReviewTableColumnId; startX: number; startWidth: number } | null>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [reviewViewMode, setReviewViewMode] = useState<'table' | 'trend'>('table');
  const [presetLabelsModalOpen, setPresetLabelsModalOpen] = useState(false);
  const [draftPresetLabels, setDraftPresetLabels] = useState<Record<ReviewViewPresetId, string>>({ ...DEFAULT_PRESET_LABELS });
  const [draftPresetOrder, setDraftPresetOrder] = useState<ReviewViewPresetId[]>([...DEFAULT_PRESET_ORDER]);
  const [trendGroupBy, setTrendGroupBy] = useState<ExperienceSalaryGroupBy>('population');
  const [showLayoutOptions, setShowLayoutOptions] = useState(false);

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

  const { marketResolver, evaluationResults, policySourceByEmployeeId, experienceBandSurveyContext } =
    useSalaryReviewPolicyEngine({
    records,
    setRecords,
    marketSurveys,
    cycles,
    selectedCycleId,
    policies,
    customModels,
    tierTables,
    meritMatrix,
    experienceBands,
    cfBySpecialty,
  });

  const orderedColumnIds = useMemo((): ReviewTableColumnId[] => {
    const frozenOrdered = frozenColumnIds.filter((id) => visibleColumnIds.includes(id));
    const rest = visibleColumnIds.filter((id) => !frozenColumnIds.includes(id));
    const order: ReviewTableColumnId[] = [...frozenOrdered, ...rest];
    // Always show compare checkbox left of provider name when visible (column is not draggable).
    if (visibleColumnIds.includes('compareCheckbox') && order[0] !== 'compareCheckbox') {
      return ['compareCheckbox', ...order.filter((id) => id !== 'compareCheckbox')];
    }
    return order;
  }, [visibleColumnIds, frozenColumnIds]);

  const visibleColumns = useMemo(
    () =>
      orderedColumnIds
        .map((id) => REVIEW_TABLE_COLUMNS.find((c) => c.id === id))
        .filter((c): c is (typeof REVIEW_TABLE_COLUMNS)[number] => c != null),
    [orderedColumnIds]
  );

  const totalTableWidthPx = useMemo(() => {
    return visibleColumns.reduce((sum, col) => sum + (columnWidths[col.id] ?? 128), 0);
  }, [visibleColumns, columnWidths]);

  const frozenLeftOffsets = useMemo(() => {
    const offsets: number[] = [];
    let sum = 0;
    for (let i = 0; i < orderedColumnIds.length; i++) {
      const colId = orderedColumnIds[i];
      offsets[i] = sum;
      if (frozenColumnIds.includes(colId)) {
        sum += columnWidths[colId] ?? 128;
      }
    }
    return offsets;
  }, [orderedColumnIds, frozenColumnIds, columnWidths]);

  const isFrozenColumn = useCallback(
    (colIndex: number) => {
      const id = orderedColumnIds[colIndex];
      return id != null && frozenColumnIds.includes(id);
    },
    [orderedColumnIds, frozenColumnIds]
  );

  const handleResizeStart = useCallback(
    (colIndex: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const col = visibleColumns[colIndex];
      if (!col) return;
      setResizingColumnIndex(colIndex);
      resizeRef.current = {
        columnId: col.id,
        startX: e.clientX,
        startWidth: columnWidths[col.id] ?? 128,
      };
    },
    [visibleColumns, columnWidths]
  );

  useEffect(() => {
    saveReviewTableToStorage(reviewTableState);
  }, [reviewTableState]);

  const closeCustomDropdown = useCallback(() => {
    setCustomViewDropdownOpen(false);
    setSaveViewOpen(false);
    setSaveViewName('');
  }, []);

  const openCustomDropdown = useCallback(() => {
    setReviewTableState((prev) => {
      if (prev.preset === 'custom') return prev;
      const presetIds = REVIEW_VIEW_PRESETS[prev.preset as ReviewViewPresetId];
      return {
        ...prev,
        preset: 'custom',
        activeCustomViewId: null,
        visibleColumnIds: presetIds ? [...presetIds] : prev.visibleColumnIds,
      };
    });
    setCustomViewDropdownOpen(true);
  }, []);

  useEffect(() => {
    if (!customViewDropdownOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCustomDropdown();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [customViewDropdownOpen, closeCustomDropdown]);

  useEffect(() => {
    if (!exportDropdownOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportDropdownOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exportDropdownOpen]);

  useEffect(() => {
    if (!fullScreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFullScreenChange?.(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullScreen, onFullScreenChange]);

  useEffect(() => {
    if (presetLabelsModalOpen) {
      setDraftPresetLabels({ ...DEFAULT_PRESET_LABELS, ...(reviewTableState.presetLabels ?? {}) });
      setDraftPresetOrder([...(reviewTableState.presetOrder ?? DEFAULT_PRESET_ORDER)]);
    }
  }, [presetLabelsModalOpen]);

  const applyPreset = useCallback((presetId: ReviewViewPresetId) => {
    setReviewTableState((prev) => ({
      ...prev,
      visibleColumnIds: [...REVIEW_VIEW_PRESETS[presetId]],
      preset: presetId,
      activeCustomViewId: null,
    }));
  }, []);

  const applySavedCustomView = useCallback((view: SavedCustomView) => {
    setReviewTableState((prev) => ({
      ...prev,
      visibleColumnIds: [...view.columnIds],
      preset: 'custom',
      activeCustomViewId: view.id,
    }));
    setCustomViewDropdownOpen(false);
  }, []);

  const addSavedCustomView = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed || visibleColumnIds.length === 0) return;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `view-${Date.now()}`;
    const newView: SavedCustomView = { id, name: trimmed, columnIds: [...visibleColumnIds] };
    setReviewTableState((prev) => {
      const nextViews = [...(prev.savedCustomViews ?? []), newView].slice(-10);
      return {
        ...prev,
        savedCustomViews: nextViews,
        visibleColumnIds: newView.columnIds,
        preset: 'custom',
        activeCustomViewId: id,
      };
    });
    setSaveViewName('');
    setSaveViewOpen(false);
    setCustomViewDropdownOpen(false);
  }, [visibleColumnIds]);

  const removeSavedCustomView = useCallback((id: string) => {
    setReviewTableState((prev) => {
      const nextViews = (prev.savedCustomViews ?? []).filter((v) => v.id !== id);
      return {
        ...prev,
        savedCustomViews: nextViews,
        activeCustomViewId: prev.activeCustomViewId === id ? null : prev.activeCustomViewId,
      };
    });
  }, []);

  const selectCurrentSelection = useCallback(() => {
    setReviewTableState((prev) => ({ ...prev, preset: 'custom', activeCustomViewId: null }));
    setCustomViewDropdownOpen(false);
  }, []);

  const filteredRecords = useMemo(
    () =>
      applyFilters(records, filters, experienceBands, policySourceByEmployeeId, experienceBandSurveyContext),
    [records, filters, experienceBands, policySourceByEmployeeId, experienceBandSurveyContext]
  );
  const filterOptions = useMemo(
    () =>
      deriveFilterOptionsCascading(
        records,
        filters,
        experienceBands,
        policySourceByEmployeeId,
        experienceBandSurveyContext
      ),
    [records, filters, experienceBands, policySourceByEmployeeId, experienceBandSurveyContext]
  );

  const summaryTotals = useMemo(() => computeSummary(filteredRecords), [filteredRecords]);
  const summaryBreakdown = useMemo(
    () => ({
      division: computeSummaryByDimension(filteredRecords, 'division'),
      department: computeSummaryByDimension(filteredRecords, 'department'),
      population: computeSummaryByDimension(filteredRecords, 'population'),
      specialty: computeSummaryByDimension(filteredRecords, 'specialty'),
      planType: computeSummaryByDimension(filteredRecords, 'planType'),
    }),
    [filteredRecords]
  );
  const budgetAmount = useMemo(
    () => resolveBudgetForCycle(selectedCycleId, budgetSettings, cycles),
    [selectedCycleId, budgetSettings, cycles]
  );
  const budgetWarningThresholdPercent = useMemo(() => {
    const row = budgetSettings.find((b) => b.cycleId === selectedCycleId);
    return row?.warningThresholdPercent;
  }, [selectedCycleId, budgetSettings]);

  const headerBudgetUsagePercent = useMemo(() => {
    const b = budgetAmount;
    if (b == null || !Number.isFinite(b) || b <= 0) return null;
    return (summaryTotals.totalIncreaseDollars / b) * 100;
  }, [summaryTotals.totalIncreaseDollars, budgetAmount]);

  const headerBudgetIsWarning = useMemo(() => {
    if (budgetWarningThresholdPercent == null || headerBudgetUsagePercent == null) return false;
    return (
      headerBudgetUsagePercent >= budgetWarningThresholdPercent && headerBudgetUsagePercent <= 100
    );
  }, [budgetWarningThresholdPercent, headerBudgetUsagePercent]);

  const sortedRecords = useMemo(() => {
    const bandOpts = (r: (typeof filteredRecords)[0]) => {
      const mk = (r.Market_Specialty_Override ?? r.Specialty ?? r.Benchmark_Group ?? '').trim();
      return {
        marketRow: mk ? marketResolver(r, mk) : undefined,
        experienceBandSurveyContext,
      };
    };
    return [...filteredRecords].sort((a, b) => {
      const aVal = getReviewCellSortValue(
        a,
        sortKey,
        experienceBands,
        evaluationResults.get(a.Employee_ID),
        cfBySpecialty,
        bandOpts(a)
      );
      const bVal = getReviewCellSortValue(
        b,
        sortKey,
        experienceBands,
        evaluationResults.get(b.Employee_ID),
        cfBySpecialty,
        bandOpts(b)
      );
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
      else cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    filteredRecords,
    sortKey,
    sortDir,
    experienceBands,
    evaluationResults,
    cfBySpecialty,
    marketResolver,
    experienceBandSurveyContext,
  ]);

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
  const selectedMarketRow = useMemo(() => {
    if (!selectedRecord) return undefined;
    const k = (selectedRecord.Market_Specialty_Override ?? selectedRecord.Specialty ?? selectedRecord.Benchmark_Group ?? '').trim();
    return k ? marketResolver(selectedRecord, k) : undefined;
  }, [selectedRecord, marketResolver]);
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
    if (id === 'compareCheckbox') return;
    setSortKey(id);
    setSortDir((d) => (sortKey === id ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
    setPage(1);
  }, [sortKey]);

  const toggleProviderForCompare = useCallback((employeeId: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(employeeId)) return prev.filter((id) => id !== employeeId);
      if (prev.length >= 4) return prev;
      return [...prev, employeeId];
    });
  }, []);

  const selectAllOnPageForCompare = useCallback(() => {
    const onPage = paginatedRecords.map((r) => r.Employee_ID);
    const current = new Set(selectedForCompare);
    const added = onPage.filter((id) => !current.has(id));
    if (added.length === 0) {
      setSelectedForCompare((prev) => prev.filter((id) => !onPage.includes(id)));
    } else {
      setSelectedForCompare((prev) => {
        const next = [...prev];
        for (const id of added) {
          if (next.length >= 4) break;
          next.push(id);
        }
        return next;
      });
    }
  }, [paginatedRecords, selectedForCompare]);

  const clearCompareSelection = useCallback(() => setSelectedForCompare([]), []);

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
      const marketRow = matchKey ? marketResolver(merged, matchKey) : undefined;
      const policyResult = evaluationResults.get(employeeId);
      const next = recalculateProviderRow({
        record: merged,
        marketRow,
        experienceBands,
        experienceBandSurveyContext,
        meritMatrixRows: meritMatrix,
        policyResult,
        cfBySpecialty,
      });
      setRecords(records.map((r) => (r.Employee_ID === employeeId ? next : r)));
    },
    [
      records,
      setRecords,
      marketResolver,
      experienceBands,
      experienceBandSurveyContext,
      meritMatrix,
      evaluationResults,
      cfBySpecialty,
    ]
  );

  const equitySuggestionsApplyCount = useMemo(() => {
    return filteredRecords.filter((r) => {
      const matchKey = (r.Market_Specialty_Override ?? r.Specialty ?? r.Benchmark_Group ?? '').trim();
      const marketRow = matchKey ? marketResolver(r, matchKey) : undefined;
      const rec = getEquityRecommendation(r, experienceBands, marketRow, experienceBandSurveyContext);
      return (
        rec?.suggestedIncreaseAmount != null &&
        Number.isFinite(rec.suggestedIncreaseAmount)
      );
    }).length;
  }, [filteredRecords, experienceBands, marketResolver, experienceBandSurveyContext]);

  const handleApplyAllEquitySuggestions = useCallback(() => {
    const updates = new Map<string, number>();
    for (const r of filteredRecords) {
      const matchKey = (r.Market_Specialty_Override ?? r.Specialty ?? r.Benchmark_Group ?? '').trim();
      const marketRow = matchKey ? marketResolver(r, matchKey) : undefined;
      const rec = getEquityRecommendation(r, experienceBands, marketRow, experienceBandSurveyContext);
      if (
        rec?.suggestedIncreaseAmount != null &&
        Number.isFinite(rec.suggestedIncreaseAmount)
      ) {
        updates.set(r.Employee_ID, rec.suggestedIncreaseAmount);
      }
    }
    if (updates.size === 0) return;
    setRecords(
      records.map((r) => {
        const amount = updates.get(r.Employee_ID);
        if (amount == null) return r;
        const merged = { ...r, Approved_Increase_Amount: amount };
        const matchKey = (merged.Market_Specialty_Override ?? merged.Specialty ?? merged.Benchmark_Group ?? '').trim();
        const marketRow = matchKey ? marketResolver(merged, matchKey) : undefined;
        const policyResult = evaluationResults.get(r.Employee_ID);
        return recalculateProviderRow({
          record: merged,
          marketRow,
          experienceBands,
          experienceBandSurveyContext,
          meritMatrixRows: meritMatrix,
          policyResult,
          cfBySpecialty,
        });
      })
    );
  }, [
    filteredRecords,
    records,
    setRecords,
    marketResolver,
    experienceBands,
    experienceBandSurveyContext,
    meritMatrix,
    evaluationResults,
    cfBySpecialty,
  ]);

  const handleExportCsv = () => {
    const csv = exportToCsv(records, evaluationResults, customDatasets, customStreamLookups);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salary-review.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXlsx = async () => {
    const buffer = exportToXlsx(records, evaluationResults, customDatasets, customStreamLookups);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salary-review.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleColumn = useCallback((id: ReviewTableColumnId) => {
    setReviewTableState((prev) => {
      const nextVisible = prev.visibleColumnIds.includes(id)
        ? prev.visibleColumnIds.filter((x) => x !== id)
        : [...prev.visibleColumnIds, id];
      const nextFrozen = (prev.frozenColumnIds ?? []).filter((fid) => nextVisible.includes(fid));
      return { ...prev, visibleColumnIds: nextVisible, frozenColumnIds: nextFrozen, preset: 'custom' };
    });
  }, []);

  const setColumnWidth = useCallback((columnId: ReviewTableColumnId, widthPx: number) => {
    const clamped = Math.max(80, Math.min(400, widthPx));
    setReviewTableState((prev) => ({
      ...prev,
      columnWidths: { ...(prev.columnWidths ?? getDefaultColumnWidths()), [columnId]: clamped },
    }));
  }, []);

  const resetColumnWidths = useCallback(() => {
    setReviewTableState((prev) => ({
      ...prev,
      columnWidths: getDefaultColumnWidths(),
    }));
  }, []);

  const setFrozenColumnIds = useCallback((updater: (prev: ReviewTableColumnId[]) => ReviewTableColumnId[]) => {
    setReviewTableState((prev) => ({
      ...prev,
      frozenColumnIds: updater(prev.frozenColumnIds ?? ['providerName']),
      preset: 'custom',
    }));
  }, []);

  const toggleFrozenColumn = useCallback((id: ReviewTableColumnId) => {
    setFrozenColumnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, [setFrozenColumnIds]);

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

  const moveColumn = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setReviewTableState((prev) => {
      const ordered = [...(prev.frozenColumnIds ?? []).filter((id) => prev.visibleColumnIds.includes(id)), ...prev.visibleColumnIds.filter((id) => !(prev.frozenColumnIds ?? []).includes(id))];
      const next = [...ordered];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return { ...prev, visibleColumnIds: next };
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
      <EmptyStatePanel
        title="Salary review"
        message="No providers yet."
      >
        {onNavigateToImport && (
          <button
            type="button"
            onClick={onNavigateToImport}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 hover:text-indigo-900"
          >
            Go to Import data
          </button>
        )}
      </EmptyStatePanel>
    );
  }

  return (
    <div className={`flex flex-col min-w-0 ${fullScreen ? 'p-3' : ''}`}>
      <div className="min-w-0 flex flex-col border border-indigo-100 rounded-2xl bg-white shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07)]">
        <div className="shrink-0 border-b border-slate-200 px-5 pb-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-800">Salary review</h2>
                <span className="group relative inline-flex shrink-0">
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    aria-label="How salary review works"
                    aria-describedby="salary-review-works-tooltip"
                  >
                    i
                  </button>
                  <div
                    id="salary-review-works-tooltip"
                    role="tooltip"
                    className="pointer-events-auto invisible absolute left-1/2 top-[calc(100%-4px)] z-50 max-h-[70vh] w-[min(22rem,calc(100vw-2.5rem))] -translate-x-1/2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 pt-4 text-left text-[11px] leading-snug text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
                  >
                    <p className="font-medium text-slate-800">How salary review works</p>
                    <p className="mt-2">
                      Recommended increases are calculated from your merit matrix, experience band guardrails, and active
                      Compensation Policy Engine rules, using the current cycle&apos;s effective date.
                    </p>
                    <p className="mt-2">
                      Use the filters below to focus on a population, and color cues to see who is below, in, or above
                      their experience band targets. Update review status and override amounts directly in the grid where
                      needed.
                    </p>
                    <p className="mt-2">
                      Budget usage lines up total base salary changes for whoever is in the table with the cycle budget
                      number. Change filters or search and the totals update to match what you see in the grid.
                    </p>
                  </div>
                </span>
              </div>
              {(budgetAmount == null || !Number.isFinite(budgetAmount) || budgetAmount <= 0) && (
                <p className="text-xs text-amber-800">
                  No budget set for this cycle — add a budget in Parameters to compare usage to a target.
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="app-segmented-track w-fit">
              {(['table', 'trend'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setReviewViewMode(mode)}
                  className={`app-segmented-segment ${mode === 'table' ? 'rounded-l-full' : 'rounded-r-full'} ${
                    reviewViewMode === mode ? 'app-segmented-segment-active' : ''
                  }`}
                >
                  {mode === 'table' ? 'Table' : 'Trend'}
                </button>
              ))}
            </div>
            {reviewViewMode === 'table' && (
              <>
            <span className="text-sm font-medium text-slate-600 mr-1">View</span>
            <div className="app-segmented-track w-fit flex items-center">
              {presetOrder.map((presetId, idx) =>
                (presetId as ReviewViewPresetId | 'custom') === 'custom' ? (
                  <div key="custom" className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setColumnDropdownOpen(false);
                        if (customViewDropdownOpen) {
                          setCustomViewDropdownOpen(false);
                        } else {
                          openCustomDropdown();
                        }
                      }}
                      className={`app-segmented-segment flex items-center gap-1 ${
                        activePreset === 'custom' ? 'app-segmented-segment-active' : ''
                      }`}
                      aria-expanded={customViewDropdownOpen}
                      aria-haspopup="menu"
                    >
                      Custom
                      <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {customViewDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          aria-hidden
                          onClick={closeCustomDropdown}
                        />
                        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 max-h-[20rem] flex flex-col app-dropdown-panel">
                          <button
                            type="button"
                            onClick={selectCurrentSelection}
                            className={`w-full px-3 py-2 text-sm text-left ${
                              activePreset === 'custom' && !activeCustomViewId
                                ? 'bg-indigo-50 text-indigo-800 font-medium'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            Current selection
                          </button>
                          {savedCustomViews.length > 0 ? (
                            <>
                              <p className="px-3 pt-2 pb-1 text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Saved views
                              </p>
                              <div className="overflow-y-auto flex-1 min-h-0 max-h-48">
                                {savedCustomViews.map((view) => (
                                  <div
                                    key={view.id}
                                    className={`flex items-center gap-1 px-3 py-2 text-sm ${
                                      activeCustomViewId === view.id
                                        ? 'bg-indigo-50 text-indigo-800 font-medium'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => applySavedCustomView(view)}
                                      className="flex-1 min-w-0 text-left truncate"
                                    >
                                      {view.name}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeSavedCustomView(view.id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded shrink-0"
                                      title="Delete view"
                                      aria-label={`Delete ${view.name}`}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="px-3 py-2 text-sm text-slate-500">No saved views yet.</p>
                          )}
                          <div className="border-t border-slate-200 p-2 shrink-0">
                            {saveViewOpen ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={saveViewName}
                                  onChange={(e) => setSaveViewName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') addSavedCustomView(saveViewName);
                                    if (e.key === 'Escape') setSaveViewOpen(false);
                                  }}
                                  placeholder="View name"
                                  className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => addSavedCustomView(saveViewName)}
                                  disabled={!saveViewName.trim()}
                                  className="px-2 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setSaveViewOpen(false); setSaveViewName(''); }}
                                  className="px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSaveViewOpen(true)}
                                className="w-full px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg text-left"
                              >
                                Save current columns as view…
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    key={presetId}
                    type="button"
                    onClick={() => applyPreset(presetId)}
                    className={`app-segmented-segment shrink-0 ${idx === 0 ? 'rounded-l-full' : ''} ${
                      activePreset === presetId ? 'app-segmented-segment-active' : ''
                    }`}
                  >
                    {presetLabels[presetId] ?? DEFAULT_PRESET_LABELS[presetId]}
                  </button>
                )
              )}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowLayoutOptions((o) => !o);
                    if (!showLayoutOptions) {
                      setColumnDropdownOpen(false);
                      setCustomViewDropdownOpen(false);
                    }
                  }}
                  className={`app-segmented-segment flex shrink-0 items-center gap-1.5 rounded-none pr-3 pl-3 ${
                    showLayoutOptions ? 'app-segmented-segment-active' : ''
                  }`}
                  aria-expanded={showLayoutOptions}
                  aria-haspopup="menu"
                  title="Columns, saved views, and table layout"
                >
                  <svg
                    className="h-4 w-4 opacity-80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Layout</span>
                  <svg
                    className={`h-3.5 w-3.5 opacity-50 transition-transform duration-200 ${showLayoutOptions ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showLayoutOptions && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      aria-hidden
                      onClick={() => {
                        setShowLayoutOptions(false);
                        setColumnDropdownOpen(false);
                        setCustomViewDropdownOpen(false);
                      }}
                    />
                    <div
                      className="absolute left-0 top-[calc(100%+6px)] z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg shadow-slate-200/40 ring-1 ring-black/[0.03]"
                      role="menu"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setColumnDropdownOpen((o) => !o);
                          setCustomViewDropdownOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 px-2.5 py-2 text-left text-[13px] font-medium leading-snug transition-colors ${
                          columnDropdownOpen ? 'bg-slate-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 6h16M4 10h16M4 14h16M4 18h16"
                            />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1">Show &amp; pin columns</span>
                        <svg
                          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                            columnDropdownOpen ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setColumnDropdownOpen(false);
                          if (customViewDropdownOpen) {
                            setCustomViewDropdownOpen(false);
                          } else {
                            setShowLayoutOptions(false);
                            openCustomDropdown();
                          }
                        }}
                        className="flex w-full items-center gap-3 px-2.5 py-2 text-left text-[13px] font-medium leading-snug text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1">Saved views</span>
                        <svg
                          className="h-4 w-4 shrink-0 text-slate-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div className="mx-2 my-1 h-px bg-slate-100" aria-hidden />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          resetColumnWidths();
                          setShowLayoutOptions(false);
                          setColumnDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-2.5 py-2 text-left text-[13px] font-medium leading-snug text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6a2 2 0 01-2-2v-2"
                            />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1">Reset column widths</span>
                      </button>
                      {columnDropdownOpen && (
                        <div className="max-h-52 overflow-y-auto border-t border-slate-100 bg-slate-50/80 px-1.5 py-1">
                          <div
                            className="mb-0.5 grid grid-cols-[1rem_11rem_auto] items-center gap-x-1.5 border-b border-slate-200/70 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                            aria-hidden
                          >
                            <span />
                            <span className="min-w-0 truncate">Column</span>
                            <span title="Pinned columns stay visible when scrolling horizontally">Pin</span>
                          </div>
                          {REVIEW_TABLE_COLUMNS.filter((col) => col.id !== 'compareCheckbox').map((col) => {
                            const visId = `review-col-vis-${col.id}`;
                            return (
                              <div
                                key={col.id}
                                className="grid grid-cols-[1rem_11rem_auto] items-center gap-x-1.5 rounded px-1 py-0.5 hover:bg-white/80"
                              >
                                <input
                                  id={visId}
                                  type="checkbox"
                                  checked={visibleColumnIds.includes(col.id)}
                                  onChange={() => toggleColumn(col.id)}
                                  className="h-3.5 w-3.5 place-self-center rounded border-slate-300"
                                  aria-label={col.label ? `Show ${col.label}` : 'Show column'}
                                />
                                <label
                                  htmlFor={visId}
                                  className="min-w-0 cursor-pointer truncate text-[13px] leading-tight text-slate-700"
                                >
                                  {col.label || '—'}
                                </label>
                                <label
                                  className="flex cursor-pointer justify-self-start rounded p-0.5 hover:bg-slate-200/60"
                                  title={
                                    col.label
                                      ? `Pin “${col.label}” (stays visible when scrolling)`
                                      : 'Pin column'
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    checked={frozenColumnIds.includes(col.id)}
                                    disabled={!visibleColumnIds.includes(col.id)}
                                    onChange={() => toggleFrozenColumn(col.id)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 disabled:opacity-50"
                                    aria-label={col.label ? `Pin ${col.label}` : 'Pin column'}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPresetLabelsModalOpen(true)}
                className="app-segmented-segment shrink-0 rounded-r-full px-2.5 py-2 text-slate-500 hover:text-slate-700"
                title="Customize view button labels and order"
                aria-label="Customize view buttons"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCompareModalOpen(true)}
              disabled={selectedForCompare.length < 2}
              className={
                selectedForCompare.length >= 2
                  ? 'app-btn-secondary inline-flex items-center gap-1.5'
                  : 'app-btn-secondary inline-flex items-center gap-1.5 opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-sm'
              }
              title={
                selectedForCompare.length < 2
                  ? 'Select 2–4 providers to compare'
                  : `Compare ${selectedForCompare.length} selected provider${selectedForCompare.length !== 1 ? 's' : ''}`
              }
              aria-label={
                selectedForCompare.length < 2
                  ? 'Compare — select 2 to 4 providers using row checkboxes'
                  : `Compare ${selectedForCompare.length} selected provider${selectedForCompare.length !== 1 ? 's' : ''}`
              }
            >
              Compare
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportDropdownOpen((o) => !o)}
                className="app-btn-secondary inline-flex items-center gap-1.5"
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
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden
                    onClick={() => setExportDropdownOpen(false)}
                  />
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
              </>
            )}
          </div>
          </div>
        </div>
        <SalaryReviewSummaryBar
          summaryTotals={summaryTotals}
          breakdown={summaryBreakdown}
          budgetUsage={
            headerBudgetUsagePercent != null &&
            budgetAmount != null &&
            Number.isFinite(budgetAmount) &&
            budgetAmount > 0
              ? {
                  percentOfBudget: headerBudgetUsagePercent,
                  budgetAmount,
                  isWarning: headerBudgetIsWarning,
                }
              : undefined
          }
        />
        <div className="shrink-0 px-5">
          <SalaryReviewFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            filterOptions={filterOptions}
            totalCount={records.length}
            filteredCount={filteredRecords.length}
            rightAction={
              <div className="flex items-center gap-2">
                {equitySuggestionsApplyCount > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyAllEquitySuggestions}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    title="Apply internal-equity suggested base to all visible below-target providers"
                  >
                    Apply equity suggestions ({equitySuggestionsApplyCount})
                  </button>
                )}
                {onFullScreenChange ? (
                  <button
                    type="button"
                    onClick={() => onFullScreenChange(!fullScreen)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    title={fullScreen ? 'Exit full screen (Esc)' : 'Expand to full screen'}
                    aria-label={fullScreen ? 'Exit full screen' : 'Expand to full screen'}
                  >
                    {fullScreen ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                    )}
                  </button>
                ) : null}
              </div>
            }
          />
        </div>
        <div
          className={`flex flex-col min-w-0 ${reviewViewMode === 'table' && filteredRecords.length === 0 ? 'min-h-[420px]' : ''}`}
        >
          {reviewViewMode === 'trend' ? (
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Group by</label>
                <select
                  value={trendGroupBy}
                  onChange={(e) => setTrendGroupBy(e.target.value as ExperienceSalaryGroupBy)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[160px]"
                  aria-label="Group chart by"
                >
                  <option value="none">No grouping</option>
                  <option value="population">Population</option>
                  <option value="specialty">Specialty</option>
                  <option value="division">Division</option>
                </select>
              </div>
              <ExperienceSalaryTrendChart records={filteredRecords} groupBy={trendGroupBy} />
            </div>
          ) : filteredRecords.length === 0 ? (
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
          <>
          <div
              ref={tableScrollRef}
              className={`min-w-0 overflow-auto border-t border-neutral-200/80 ${fullScreen ? 'max-h-[calc(100vh-10rem)]' : 'max-h-[calc(100vh-12rem)]'}`}
            >
            <table
              className="border-collapse table-fixed"
              style={{
                width: totalTableWidthPx,
                minWidth: `max(100%, ${totalTableWidthPx}px)`,
              }}
            >
              <colgroup>
                {visibleColumns.map((col) => (
                  <col key={col.id} style={{ width: columnWidths[col.id] ?? 128, minWidth: columnWidths[col.id] ?? 128 }} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-20 bg-neutral-50 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                <tr className="bg-neutral-50">
                  {visibleColumns.map((col, index) => {
                    const frozen = isFrozenColumn(index);
                    const left = frozen ? frozenLeftOffsets[index] : undefined;
                    const widthPx = columnWidths[col.id] ?? 128;
                    return (
                      <th
                        key={col.id}
                        draggable={col.id !== 'compareCheckbox'}
                        onDragStart={col.id === 'compareCheckbox' ? undefined : handleHeaderDragStart(index)}
                        onDragOver={handleHeaderDragOver(index)}
                        onDragLeave={handleHeaderDragLeave}
                        onDrop={handleHeaderDrop(index)}
                        onDragEnd={handleHeaderDragEnd}
                        title={col.id === 'compareCheckbox' ? 'Select for compare' : col.label}
                        style={{
                          width: widthPx,
                          minWidth: widthPx,
                          maxWidth: widthPx,
                          ...(frozen && left !== undefined ? { position: 'sticky', left, zIndex: 21 } : {}),
                        }}
                        className={`relative px-2 py-3 text-[11px] font-semibold text-neutral-600 uppercase tracking-wide select-none bg-neutral-50 hover:bg-neutral-100 transition-colors whitespace-normal overflow-hidden ${
                          col.id === 'compareCheckbox' ? 'cursor-default' : 'cursor-pointer'
                        } ${frozen ? 'shadow-[2px_0_4px_rgba(0,0,0,0.06)]' : ''} ${col.align === 'right' ? 'text-right' : 'text-left'} ${draggingColumnIndex === index ? 'opacity-50' : ''} ${
                          dragOverColumnIndex === index ? 'bg-indigo-100 ring-1 ring-indigo-300' : ''
                        } ${resizingColumnIndex === index ? 'select-none' : ''}`}
                        onClick={col.id === 'compareCheckbox' ? undefined : () => handleSort(col.id)}
                      >
                        {col.id === 'compareCheckbox' ? (
                          <label className="flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedForCompare.includes(r.Employee_ID))}
                              ref={(el) => {
                                if (el) el.indeterminate = paginatedRecords.length > 0 && paginatedRecords.some((r) => selectedForCompare.includes(r.Employee_ID)) && !paginatedRecords.every((r) => selectedForCompare.includes(r.Employee_ID));
                              }}
                              onChange={selectAllOnPageForCompare}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-slate-300"
                              aria-label="Select all on page for compare"
                            />
                          </label>
                        ) : (
                        <span className={`flex items-start gap-1 min-w-0 ${col.align === 'right' ? 'justify-end' : ''}`}>
                          <span
                            className="shrink-0 w-3 cursor-grab active:cursor-grabbing text-neutral-400"
                            aria-hidden
                            title="Drag to reorder column"
                            onClick={(e) => e.stopPropagation()}
                          >
                            ⋮⋮
                          </span>
                          <span className={`min-w-0 break-words leading-tight ${col.align === 'right' ? 'text-right' : 'text-left'}`} title={col.label}>
                            {col.label}
                          </span>
                          {sortKey === col.id && (
                            <span className="text-blue-600 shrink-0" aria-hidden>
                              {sortDir === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </span>
                        )}
                        <span
                          role="separator"
                          aria-label={`Resize column ${col.label}`}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize shrink-0 touch-none z-30 hover:bg-blue-300/50 active:bg-blue-400/50"
                          style={{ marginRight: '-4px' }}
                          onMouseDown={handleResizeStart(index)}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {paginatedRecords.map((r) => {
                  const matchKeyRow = (r.Market_Specialty_Override ?? r.Specialty ?? r.Benchmark_Group ?? '').trim();
                  const marketRowForBand = matchKeyRow ? marketResolver(r, matchKeyRow) : undefined;
                  const bandAlignment = getExperienceBandAlignmentForProvider(
                    r,
                    r.Proposed_TCC_Percentile ?? r.Current_TCC_Percentile,
                    experienceBands,
                    marketRowForBand,
                    experienceBandSurveyContext
                  );
                  const rowAlignmentClass =
                    bandAlignment === 'below'
                      ? 'bg-amber-50/50'
                      : bandAlignment === 'above'
                        ? 'bg-sky-50/50'
                        : '';
                  return (
                  <tr
                    key={r.Employee_ID}
                    className={`group transition-colors ${
                      selectedEmployeeId === r.Employee_ID ? 'bg-indigo-100/60' : 'hover:bg-indigo-50/30'
                    } ${rowAlignmentClass}`}
                  >
                    {visibleColumns.map((col, colIndex) => {
                      const value = getReviewCellValue(
                        r,
                        col.id,
                        experienceBands,
                        evaluationResults.get(r.Employee_ID),
                        cfBySpecialty,
                        {
                          marketRow: marketRowForBand,
                          experienceBandSurveyContext,
                        }
                      );
                      const display = formatReviewCellValue(value, col.format);
                      const isEditable = col.editable && col.id !== 'notesIndicator';
                      const isNotes = col.id === 'notesIndicator';
                      const frozen = isFrozenColumn(colIndex);
                      const left = frozen ? frozenLeftOffsets[colIndex] : undefined;
                      const widthPx = columnWidths[col.id] ?? 128;
                      const stickyCellClass = frozen
                        ? `z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)] ${
                            selectedEmployeeId === r.Employee_ID ? 'bg-indigo-100' : 'bg-white group-hover:bg-indigo-50'
                          }`
                        : '';
                      const alignmentCellClass =
                        col.id === 'bandAlignment' && bandAlignment
                          ? bandAlignment === 'below'
                            ? 'bg-amber-100'
                            : bandAlignment === 'in'
                              ? 'bg-emerald-50'
                              : 'bg-sky-100'
                          : col.id === 'currentTccPercentile' && bandAlignment && bandAlignment !== 'in'
                            ? bandAlignment === 'below'
                              ? 'bg-amber-100'
                              : 'bg-sky-100'
                            : '';

                      return (
                        <td
                          key={col.id}
                          style={{
                            width: widthPx,
                            minWidth: widthPx,
                            maxWidth: widthPx,
                            ...(frozen && left !== undefined ? { position: 'sticky', left } : {}),
                          }}
                          className={`px-2 py-1.5 text-sm text-slate-800 whitespace-nowrap overflow-hidden ${stickyCellClass} ${alignmentCellClass} ${col.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                          onClick={(e) => isNotes && e.stopPropagation()}
                        >
                          {col.id === 'compareCheckbox' ? (
                            <label className="flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedForCompare.includes(r.Employee_ID)}
                                onChange={() => toggleProviderForCompare(r.Employee_ID)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-slate-300"
                                aria-label={`Select ${r.Provider_Name ?? r.Employee_ID} for compare`}
                              />
                            </label>
                          ) : col.id === 'reviewStatus' && col.editable ? (
                            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()} role="group" aria-label="Set status">
                              {[
                                { status: ReviewStatus.InReview, icon: 'progress', label: 'In progress' },
                                { status: ReviewStatus.Approved, icon: 'done', label: 'Complete' },
                              ].map(({ status, icon, label }) => {
                                const current = (r.Review_Status ?? '').trim();
                                const isEffectiveAsComplete = current === ReviewStatus.Effective;
                                const isInProgress =
                                  current === ReviewStatus.InReview ||
                                  current === '' ||
                                  current === ReviewStatus.Draft ||
                                  current === ReviewStatus.Deferred;
                                const isActive =
                                  current === status ||
                                  (status === ReviewStatus.Approved && isEffectiveAsComplete) ||
                                  (status === ReviewStatus.InReview && isInProgress);
                                const activeClass =
                                  isActive && status === ReviewStatus.Approved
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : isActive
                                      ? 'bg-indigo-100 text-indigo-700'
                                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600';
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => updateRecord(r.Employee_ID, { Review_Status: status })}
                                    className={`p-1 rounded transition-colors ${activeClass}`}
                                    title={label}
                                    aria-label={label}
                                    aria-pressed={isActive}
                                  >
                                    {icon === 'progress' && (
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    )}
                                    {icon === 'done' && (
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : isNotes && col.editable ? (
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotesModalEmployeeId(r.Employee_ID);
                              }}
                              className="p-1 rounded hover:bg-slate-200 text-slate-600"
                              title={r.Notes ?? 'Add note'}
                              aria-label={r.Notes ? 'Edit note' : 'Add note'}
                            >
                              {r.Notes ? '📝' : '+'}
                            </button>
                          ) : col.id === 'providerName' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployeeId(r.Employee_ID);
                                setDrawerClosing(false);
                              }}
                              className="text-left w-full min-w-0 truncate block text-indigo-600 hover:text-indigo-800 hover:underline focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded px-0.5 -mx-0.5"
                              title="View provider details"
                            >
                              {display}
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
                                  className="w-full max-w-full min-w-0 px-2 py-1 text-sm border border-slate-300 rounded-lg tabular-nums text-right focus:ring-2 focus:ring-indigo-500"
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
                                  className="w-full max-w-full min-w-0 px-2 py-1 text-sm border border-slate-300 rounded-lg tabular-nums text-right focus:ring-2 focus:ring-indigo-500"
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
                              className="w-full max-w-full min-w-0 px-2 py-1 text-sm border border-slate-300 rounded-lg tabular-nums text-right focus:ring-2 focus:ring-indigo-500"
                              step={1}
                            />
                          ) : isEditable && col.id === 'proposedTier' ? (
                            <input
                              type="text"
                              value={r.Proposed_Tier ?? ''}
                              onChange={(e) => updateRecord(r.Employee_ID, { Proposed_Tier: e.target.value || undefined })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full max-w-full min-w-0 px-2 py-1 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                          ) : col.id === 'policySource' && (r.Policy_Rule_Id || evaluationResults.get(r.Employee_ID)?.appliedPolicies?.[0]?.id) ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const ruleId = r.Policy_Rule_Id ?? evaluationResults.get(r.Employee_ID)?.appliedPolicies?.[0]?.id ?? '';
                                if (ruleId) {
                                  const search = `?tab=policy-engine&sub=rules&ruleId=${encodeURIComponent(ruleId)}`;
                                  const hash = '#parameters';
                                  const url = `${window.location.pathname}${search}${hash}`;
                                  history.pushState(null, '', url);
                                  window.dispatchEvent(new HashChangeEvent('hashchange'));
                                }
                              }}
                              className="text-left w-full min-w-0 truncate block text-indigo-600 hover:text-indigo-800 hover:underline focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded px-0.5 -mx-0.5"
                              title="Open rule in Policy Engine"
                            >
                              {display}
                            </button>
                          ) : (
                            <span className="block truncate min-w-0" title={String(display)}>
                              {display}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
          )}
          {reviewViewMode === 'table' && filteredRecords.length > 0 && (
          <div className="shrink-0 border-t border-slate-200">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              <span className="font-semibold text-slate-800">Color key (row highlight):</span>
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded border-2 border-amber-400 bg-amber-100 shrink-0" aria-hidden />
                <span className="text-slate-700">Below target</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded border-2 border-emerald-400 bg-emerald-100 shrink-0" aria-hidden />
                <span className="text-slate-700">In range</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded border-2 border-sky-400 bg-sky-100 shrink-0" aria-hidden />
                <span className="text-slate-700">Above target</span>
              </span>
            </div>
            <div className="px-4 py-2.5 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-sm text-slate-600">
                Showing <span className="font-medium text-slate-800">{startRow}</span>–<span className="font-medium text-slate-800">{endRow}</span> of{' '}
                <span className="font-medium text-slate-800">{sortedRecords.length}</span> provider{sortedRecords.length !== 1 ? 's' : ''}
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
              experienceBands={experienceBands}
              experienceBandSurveyContext={experienceBandSurveyContext}
              marketRow={selectedMarketRow}
              policyResult={selectedEmployeeId ? evaluationResults.get(selectedEmployeeId) ?? null : null}
              onClose={handleCloseDrawer}
              onSelectPrev={handleSelectPrev}
              onSelectNext={handleSelectNext}
              hasPrev={hasPrevInList}
              hasNext={hasNextInList}
              onApplyEquitySuggestion={
                selectedEmployeeId
                  ? (suggestedIncreaseAmount) =>
                      updateRecord(selectedEmployeeId, { Approved_Increase_Amount: suggestedIncreaseAmount })
                  : undefined
              }
            />
          </div>
        </>
      )}

      {/* Provider compare modal */}
      {compareModalOpen && (
        <ProviderCompareModal
          providerIds={selectedForCompare}
          records={records}
          experienceBands={experienceBands}
          onClose={() => setCompareModalOpen(false)}
          onClearSelection={clearCompareSelection}
        />
      )}

      {/* Customize view buttons modal */}
      {presetLabelsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          onClick={() => setPresetLabelsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="preset-labels-modal-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="preset-labels-modal-title" className="font-semibold text-slate-800 mb-4">
              Customize view buttons
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Change the labels and order of the Meeting, Full, Comp, and Policy view buttons. Column sets stay the same.
            </p>
            <div className="space-y-3 mb-6">
              {draftPresetOrder.map((presetId, idx) => (
                <div key={presetId} className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (idx === 0) return;
                        const next = [...draftPresetOrder];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        setDraftPresetOrder(next);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-40"
                      disabled={idx === 0}
                      aria-label={`Move ${draftPresetLabels[presetId] ?? DEFAULT_PRESET_LABELS[presetId]} up`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (idx === draftPresetOrder.length - 1) return;
                        const next = [...draftPresetOrder];
                        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                        setDraftPresetOrder(next);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-40"
                      disabled={idx === draftPresetOrder.length - 1}
                      aria-label={`Move ${draftPresetLabels[presetId] ?? DEFAULT_PRESET_LABELS[presetId]} down`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  <label className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-16 shrink-0 capitalize">{presetId}</span>
                    <input
                      type="text"
                      value={draftPresetLabels[presetId] ?? ''}
                      onChange={(e) => setDraftPresetLabels((prev) => ({ ...prev, [presetId]: e.target.value }))}
                      placeholder={DEFAULT_PRESET_LABELS[presetId]}
                      className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setDraftPresetLabels({ ...DEFAULT_PRESET_LABELS });
                  setDraftPresetOrder([...DEFAULT_PRESET_ORDER]);
                }}
                className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Reset to defaults
              </button>
              <button
                type="button"
                onClick={() => setPresetLabelsModalOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const labelsToSave: Partial<Record<ReviewViewPresetId, string>> = {};
                  for (const id of DEFAULT_PRESET_ORDER) {
                    const v = draftPresetLabels[id]?.trim();
                    if (v && v !== DEFAULT_PRESET_LABELS[id]) labelsToSave[id] = v;
                  }
                  setReviewTableState((prev) => ({
                    ...prev,
                    presetLabels: labelsToSave,
                    presetOrder: [...draftPresetOrder],
                  }));
                  setPresetLabelsModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
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
