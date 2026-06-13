import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { useAppState } from '../../hooks/use-app-state';
import { useParametersState } from '../../hooks/use-parameters-state';
import { usePolicyEngineState } from '../../hooks/use-policy-engine-state';
import { useSelectedCycle } from '../../hooks/use-selected-cycle';
import { useCustomStreams } from '../../hooks/use-custom-streams';
import type { ProviderRecord } from '../../types/provider';
import { ReviewStatus } from '../../types/enums';
import { filterProvidersForCycle } from '../../lib/cycle-match';
import { EmptyStatePanel } from '../../components/empty-state-panel';
import { recalculateProviderRow } from '../../lib/calculations/recalculate-provider-row';
import { getEquityRecommendation } from '../../lib/calculations/equity-recommendation';
import { enrichReviewDetail } from '../../lib/review-detail-enrichment';
import {
  applyFilters,
  deriveFilterOptionsCascading,
  loadFiltersFromStorage,
  saveFiltersToStorage,
  getPresetFilters,
  DEFAULT_SALARY_REVIEW_FILTERS,
  type SalaryReviewFilters,
} from '../../lib/review-filters';
import { computeGovernanceMetrics } from '../../lib/governance-metrics';
import {
  getReviewCellSortValue,
  type ReviewTableColumnId,
} from './review-table-columns';
import {
  computeSummary,
  computeSummaryByDimension,
  resolveBudgetForCycle,
} from '../../lib/salary-review-summary';
import { SalaryReviewFilterBar } from './salary-review-filter-bar';
import { SalaryReviewSummaryBar } from './salary-review-summary-bar';
import { SalaryReviewBandLegend } from './salary-review-band-legend';
import { SalaryReviewCompareBar } from './salary-review-compare-bar';
import { LazyExperienceSalaryTrendChart } from './salary-review-lazy-charts';
import { SalaryReviewModals } from './salary-review-modals';
import { SalaryReviewHeaderToolbar } from './salary-review-header-toolbar';
import { SalaryReviewDataTable, SalaryReviewTablePagination } from './salary-review-data-table';
import { useSalaryReviewExport } from './use-salary-review-export';
import { useSalaryReviewTableLayout } from './use-salary-review-table-layout';
import { WorkflowChecklist } from '../../components/workflow-checklist';
import { useAppNavigation } from '../../context/app-navigation-context';
import { loadProviderTypeToSurveyMapping } from '../../lib/parameters-storage';
import type { ExperienceSalaryGroupBy } from '../../lib/experience-salary-chart-data';
import { useSalaryReviewPolicyEngine } from './use-salary-review-policy-engine';
import { useToast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';
import { computeBudgetScalePreview, buildBudgetScalePatches } from '../../lib/budget-allocator';
import { isCycleLocked } from '../../lib/cycle-finalize';
import { loadCycleSnapshot } from '../../lib/cycle-snapshot-storage';
import {
  snapshotProviderRecords,
  restoreProviderRecordsSnapshot,
} from '../../lib/provider-records-snapshot';
import { BulkReviewStatusMenu } from '../../components/bulk-review-status-menu';
import { Lock } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

type SortDir = 'asc' | 'desc';

interface SalaryReviewPageProps {
  fullScreen?: boolean;
  onFullScreenChange?: (full: boolean) => void;
}

export function SalaryReviewPage({
  fullScreen = false,
  onFullScreenChange,
}: SalaryReviewPageProps) {
  const { navigateWorkflow, navigateToView, openControls } = useAppNavigation();
  const { records, setRecords, marketSurveys, customDatasets, loaded, loadDemoData } = useAppState();
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
  const [selectedCycleId] = useSelectedCycle();
  const layout = useSalaryReviewTableLayout();
  const { visibleColumnIds, visibleColumns, columnWidths, frozenLeftOffsets, isFrozenColumn, totalTableWidthPx } =
    layout;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<ReviewTableColumnId>('providerName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [notesModalEmployeeId, setNotesModalEmployeeId] = useState<string | null>(null);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState<SalaryReviewFilters>(() => loadFiltersFromStorage());
  const [goToPageInput, setGoToPageInput] = useState('');
  const [editingCell, setEditingCell] = useState<{ employeeId: string; columnId: ReviewTableColumnId } | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [reviewViewMode, setReviewViewMode] = useState<'table' | 'trend'>('table');
  const [trendGroupBy, setTrendGroupBy] = useState<ExperienceSalaryGroupBy>('population');
  const [equityApplyAck, setEquityApplyAck] = useState(false);
  const { toast } = useToast();

  const DRAWER_MIN_WIDTH = 320;
  const DRAWER_MAX_WIDTH = 900;
  const DRAWER_DEFAULT_WIDTH = 380;
  const [drawerWidth, setDrawerWidth] = useState(DRAWER_DEFAULT_WIDTH);
  const [isDrawerResizing, setIsDrawerResizing] = useState(false);
  const drawerResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleDrawerResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    drawerResizeRef.current = { startX: e.clientX, startWidth: drawerWidth };
    setIsDrawerResizing(true);
  }, [drawerWidth]);

  useEffect(() => {
    if (!isDrawerResizing) return;
    const onMove = (e: MouseEvent) => {
      const ref = drawerResizeRef.current;
      if (!ref) return;
      const delta = ref.startX - e.clientX;
      setDrawerWidth(() => Math.min(DRAWER_MAX_WIDTH, Math.max(DRAWER_MIN_WIDTH, ref.startWidth + delta)));
    };
    const onUp = () => {
      drawerResizeRef.current = null;
      setIsDrawerResizing(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDrawerResizing]);

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

  const getMarketRowForRecord = useCallback(
    (r: ProviderRecord) => {
      const matchKey = (r.Market_Specialty_Override ?? r.Specialty ?? r.Benchmark_Group ?? '').trim();
      return matchKey ? marketResolver(r, matchKey) : undefined;
    },
    [marketResolver]
  );

  const cycleScopedRecords = useMemo(
    () => filterProvidersForCycle(records, selectedCycleId, cycles),
    [records, selectedCycleId, cycles]
  );

  const filteredRecords = useMemo(
    () =>
      applyFilters(
        cycleScopedRecords,
        filters,
        experienceBands,
        policySourceByEmployeeId,
        experienceBandSurveyContext,
        getMarketRowForRecord
      ),
    [
      cycleScopedRecords,
      filters,
      experienceBands,
      policySourceByEmployeeId,
      experienceBandSurveyContext,
      getMarketRowForRecord,
    ]
  );
  const filterOptions = useMemo(
    () =>
      deriveFilterOptionsCascading(
        cycleScopedRecords,
        filters,
        experienceBands,
        policySourceByEmployeeId,
        experienceBandSurveyContext,
        getMarketRowForRecord
      ),
    [
      cycleScopedRecords,
      filters,
      experienceBands,
      policySourceByEmployeeId,
      experienceBandSurveyContext,
      getMarketRowForRecord,
    ]
  );

  const reviewExportOptions = useMemo(
    () => ({
      columnIds: visibleColumnIds,
      experienceBands,
      evaluationResults,
      cfBySpecialty,
      getMarketRowForRecord,
      experienceBandSurveyContext,
    }),
    [
      visibleColumnIds,
      experienceBands,
      evaluationResults,
      cfBySpecialty,
      getMarketRowForRecord,
      experienceBandSurveyContext,
    ]
  );

  const summaryTotals = useMemo(() => computeSummary(filteredRecords), [filteredRecords]);
  const governanceMetrics = useMemo(
    () => computeGovernanceMetrics(filteredRecords, evaluationResults),
    [filteredRecords, evaluationResults]
  );
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
  const budgetHardStopThresholdPercent = useMemo(() => {
    const row = budgetSettings.find((b) => b.cycleId === selectedCycleId);
    return row?.hardStopThresholdPercent;
  }, [selectedCycleId, budgetSettings]);

  const headerBudgetUsagePercent = useMemo(() => {
    const b = budgetAmount;
    if (b == null || !Number.isFinite(b) || b <= 0) return null;
    return (summaryTotals.totalIncreaseDollars / b) * 100;
  }, [summaryTotals.totalIncreaseDollars, budgetAmount]);

  const headerBudgetIsHardStop = useMemo(() => {
    if (budgetHardStopThresholdPercent == null || headerBudgetUsagePercent == null) return false;
    return headerBudgetUsagePercent >= budgetHardStopThresholdPercent;
  }, [budgetHardStopThresholdPercent, headerBudgetUsagePercent]);

  const headerBudgetIsWarning = useMemo(() => {
    if (headerBudgetIsHardStop) return false;
    if (budgetWarningThresholdPercent == null || headerBudgetUsagePercent == null) return false;
    return headerBudgetUsagePercent >= budgetWarningThresholdPercent;
  }, [budgetWarningThresholdPercent, headerBudgetUsagePercent, headerBudgetIsHardStop]);

  const budgetScalePreview = useMemo(() => {
    if (budgetAmount == null || !Number.isFinite(budgetAmount) || budgetAmount <= 0) return null;
    return computeBudgetScalePreview(filteredRecords, budgetAmount);
  }, [filteredRecords, budgetAmount]);

  const selectedCycleLabel = useMemo(
    () => cycles.find((c) => c.id === selectedCycleId)?.label ?? 'Current cycle',
    [cycles, selectedCycleId]
  );

  const selectedCycle = useMemo(
    () => cycles.find((c) => c.id === selectedCycleId),
    [cycles, selectedCycleId]
  );
  const cycleLocked = isCycleLocked(selectedCycle);
  const cycleSnapshot = useMemo(
    () => (selectedCycleId ? loadCycleSnapshot(selectedCycleId) : null),
    [selectedCycleId, selectedCycle?.finalizedAt]
  );

  const selectedCompareNames = useMemo(
    () =>
      selectedForCompare
        .map((id) => records.find((r) => r.Employee_ID === id)?.Provider_Name ?? id)
        .filter(Boolean) as string[],
    [selectedForCompare, records]
  );

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
    setPage(1);
  }, [selectedCycleId]);

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
      if (cycleLocked) return;
      const record = records.find((r) => r.Employee_ID === employeeId);
      if (!record) return;
      const merged = { ...record, ...updates };
      if ('Approved_Increase_Amount' in updates) {
        merged.Approved_Increase_Percent = undefined;
      } else if ('Approved_Increase_Percent' in updates) {
        merged.Approved_Increase_Amount = undefined;
      }
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
      cycleLocked,
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

  const showUndoToast = useCallback(
    (
      snapshot: ReturnType<typeof snapshotProviderRecords>,
      title: string,
      description: string
    ) => {
      toast({
        variant: 'success',
        title,
        description,
        action: {
          label: 'Undo',
          onClick: () => {
            setRecords((prev) => restoreProviderRecordsSnapshot(prev, snapshot));
            toast({ title: 'Changes reverted', description: 'Restored previous values.' });
          },
        },
      });
    },
    [setRecords, toast]
  );

  const handleApplyAllEquitySuggestions = useCallback(() => {
    if (cycleLocked) return;
    const employeeIds: string[] = [];
    const updates = new Map<string, number>();
    for (const r of filteredRecords) {
      const matchKey = (r.Market_Specialty_Override ?? r.Specialty ?? r.Benchmark_Group ?? '').trim();
      const marketRow = matchKey ? marketResolver(r, matchKey) : undefined;
      const rec = getEquityRecommendation(r, experienceBands, marketRow, experienceBandSurveyContext);
      if (
        rec?.suggestedIncreaseAmount != null &&
        Number.isFinite(rec.suggestedIncreaseAmount)
      ) {
        employeeIds.push(r.Employee_ID);
        updates.set(r.Employee_ID, rec.suggestedIncreaseAmount);
      }
    }
    if (updates.size === 0) return;
    const undoSnapshot = snapshotProviderRecords(records, employeeIds);
    setEquityApplyAck(true);
    window.setTimeout(() => setEquityApplyAck(false), 1600);
    setRecords(
      records.map((r) => {
        const amount = updates.get(r.Employee_ID);
        if (amount == null) return r;
        const merged = { ...r, Approved_Increase_Amount: amount, Approved_Increase_Percent: undefined };
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
    showUndoToast(
      undoSnapshot,
      'Equity suggestions applied',
      `Updated approved increases for ${updates.size} provider${updates.size !== 1 ? 's' : ''} in the current view.`
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
    showUndoToast,
    cycleLocked,
  ]);

  const handleScaleToBudget = useCallback(() => {
    if (cycleLocked) return;
    if (!budgetScalePreview?.overBudget || budgetScalePreview.scaleFactor >= 1) return;
    const patches = buildBudgetScalePatches(filteredRecords, budgetScalePreview.scaleFactor);
    if (patches.size === 0) return;

    const pctBefore = Math.round(headerBudgetUsagePercent ?? 0);
    const undoSnapshot = snapshotProviderRecords(records, patches.keys());
    setRecords(
      records.map((r) => {
        const patch = patches.get(r.Employee_ID);
        if (!patch) return r;
        const merged = { ...r, ...patch };
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
    showUndoToast(
      undoSnapshot,
      'Scaled to budget',
      `Proportionally reduced increases for ${patches.size} provider${patches.size !== 1 ? 's' : ''} (${pctBefore}% → 100% of cycle budget).`
    );
  }, [
    cycleLocked,
    budgetScalePreview,
    filteredRecords,
    records,
    setRecords,
    marketResolver,
    evaluationResults,
    experienceBands,
    experienceBandSurveyContext,
    meritMatrix,
    cfBySpecialty,
    headerBudgetUsagePercent,
    showUndoToast,
  ]);

  const handleBulkStatusChange = useCallback(
    (status: ReviewStatus) => {
      if (cycleLocked || filteredRecords.length === 0) return;
      const employeeIds = filteredRecords.map((r) => r.Employee_ID);
      const undoSnapshot = snapshotProviderRecords(records, employeeIds);
      setRecords(
        records.map((r) => {
          if (!employeeIds.includes(r.Employee_ID)) return r;
          return { ...r, Review_Status: status };
        })
      );
      showUndoToast(
        undoSnapshot,
        'Status updated',
        `Set ${employeeIds.length} visible provider${employeeIds.length !== 1 ? 's' : ''} to ${status.replace(/_/g, ' ')}.`
      );
    },
    [cycleLocked, filteredRecords, records, setRecords, showUndoToast]
  );

  const { handleExportCsv, handleExportXlsx, handleExportCommitteeXlsx } = useSalaryReviewExport({
    records,
    cycleScopedRecords,
    filteredRecords,
    evaluationResults,
    customDatasets,
    customStreamLookups,
    reviewExportOptions,
    cycleLabel: selectedCycleLabel,
  });

  const handleManualReviewFilter = useCallback(() => {
    handleFiltersChange({
      ...filters,
      ...getPresetFilters('manual-review'),
      searchText: filters.searchText,
    } as SalaryReviewFilters);
  }, [filters, handleFiltersChange]);

  const mappingCount = useMemo(() => Object.keys(loadProviderTypeToSurveyMapping()).length, []);
  const totalMarketRows = useMemo(
    () => Object.values(marketSurveys).reduce((acc, rows) => acc + rows.length, 0),
    [marketSurveys]
  );
  const hasReviewedProviders = useMemo(
    () =>
      records.some((r) => {
        const s = (r.Review_Status ?? '').trim();
        return s === ReviewStatus.InReview || s === ReviewStatus.Approved || s === ReviewStatus.Effective;
      }),
    [records]
  );

  useEffect(() => {
    if (!fullScreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFullScreenChange?.(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullScreen, onFullScreenChange]);

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
      <div className="mx-auto max-w-2xl space-y-4">
        <WorkflowChecklist
          recordsCount={0}
          marketRowCount={totalMarketRows}
          cycles={cycles}
          meritMatrix={meritMatrix}
          policies={policies}
          mappingCount={mappingCount}
          budgetSettings={budgetSettings}
          selectedCycleId={selectedCycleId}
          hasReviewedProviders={false}
          onNavigate={navigateWorkflow}
        />
        <EmptyStatePanel
          title="Start your merit review"
          message={
            <span>
              Bring in your provider roster and market surveys to benchmark pay, flag below-market providers,
              and model merit increases against your cycle budget. New here? Load a realistic sample dataset to
              explore the full workflow in seconds.
            </span>
          }
          compact
        >
          <button type="button" onClick={loadDemoData} className="app-btn-primary">
            Load sample data
          </button>
          <button
            type="button"
            onClick={() => navigateToView('import', { returnToCurrent: true })}
            className="app-btn-secondary"
          >
            Import your own data
          </button>
          <p className="text-xs text-slate-400">
            Sample data is local to your browser and can be cleared anytime.
          </p>
        </EmptyStatePanel>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-w-0 ${fullScreen ? 'p-3' : ''}`}>
      <WorkflowChecklist
        className="mb-4"
        hideWhenSetupComplete
        recordsCount={records.length}
        marketRowCount={totalMarketRows}
        cycles={cycles}
        meritMatrix={meritMatrix}
        policies={policies}
        mappingCount={mappingCount}
        budgetSettings={budgetSettings}
        selectedCycleId={selectedCycleId}
        hasReviewedProviders={hasReviewedProviders}
        onNavigate={navigateWorkflow}
      />
      <div className="min-w-0 flex flex-col border border-indigo-100 rounded-2xl bg-white shadow-[0_4px_6px_-1px_rgba(79,70,229,0.08)]">
        {cycleLocked && (
          <div className="flex flex-wrap items-center gap-3 border-b border-emerald-200 bg-emerald-50/90 px-5 py-3 text-sm text-emerald-900">
            <Lock className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            <div className="min-w-0 flex-1">
              <span className="font-semibold">{selectedCycleLabel} is finalized.</span>{' '}
              Merit review is read-only
              {cycleSnapshot
                ? ` — snapshot: ${cycleSnapshot.providerCount} providers, ${formatCurrency(cycleSnapshot.totalIncreaseDollars)} total increases`
                : ''}
              .
            </div>
            <button
              type="button"
              onClick={() => openControls('review-cycles')}
              className="shrink-0 text-sm font-medium text-emerald-800 hover:text-emerald-950 hover:underline"
            >
              Unlock in Controls
            </button>
          </div>
        )}
        <SalaryReviewHeaderToolbar
          layout={layout}
          selectedCycleLabel={selectedCycleLabel}
          cycleScopedCount={cycleScopedRecords.length}
          filteredCount={filteredRecords.length}
          totalRecordsCount={records.length}
          budgetAmount={budgetAmount}
          selectedForCompare={selectedForCompare}
          onOpenCompare={() => setCompareModalOpen(true)}
          onExportCsv={handleExportCsv}
          onExportXlsx={handleExportXlsx}
          onExportCommitteeXlsx={handleExportCommitteeXlsx}
          reviewViewMode={reviewViewMode}
          onReviewViewModeChange={setReviewViewMode}
        />
        <SalaryReviewSummaryBar
          summaryTotals={summaryTotals}
          breakdown={summaryBreakdown}
          governanceMetrics={governanceMetrics}
          onManualReviewFilter={handleManualReviewFilter}
          budgetUsage={
            headerBudgetUsagePercent != null &&
            budgetAmount != null &&
            Number.isFinite(budgetAmount) &&
            budgetAmount > 0
              ? {
                  percentOfBudget: headerBudgetUsagePercent,
                  budgetAmount,
                  isWarning: headerBudgetIsWarning,
                  isHardStop: headerBudgetIsHardStop,
                }
              : undefined
          }
        />
        <div className="shrink-0 px-5">
          <SalaryReviewFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            filterOptions={filterOptions}
            totalCount={cycleScopedRecords.length}
            filteredCount={filteredRecords.length}
            rightAction={
              <div className="flex items-center gap-2">
                <BulkReviewStatusMenu
                  filteredCount={filteredRecords.length}
                  disabled={cycleLocked}
                  onApplyStatus={handleBulkStatusChange}
                />
                {budgetScalePreview?.overBudget && budgetScalePreview.eligibleCount > 0 && (
                  <button
                    type="button"
                    onClick={handleScaleToBudget}
                    disabled={cycleLocked}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Scale all visible increases proportionally to fit the ${selectedCycleLabel} budget (${Math.round((budgetScalePreview.scaleFactor) * 1000) / 10}% of current amounts)`}
                  >
                    Scale to budget
                    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-200/80 px-1.5 text-xs font-semibold tabular-nums">
                      {Math.round(headerBudgetUsagePercent ?? 0)}%
                    </span>
                  </button>
                )}
                {equitySuggestionsApplyCount > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyAllEquitySuggestions}
                    disabled={headerBudgetIsHardStop || cycleLocked}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 active:scale-[0.98]',
                      headerBudgetIsHardStop
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : equityApplyAck
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                          : 'bg-indigo-600 text-white hover:bg-indigo-800 hover:shadow-md hover:shadow-indigo-600/20'
                    )}
                    title={
                      headerBudgetIsHardStop
                        ? 'Budget hard-stop reached — adjust increases or budget before bulk apply'
                        : 'Apply equity suggestions (configured in Controls → Experience & equity) to visible below-target providers'
                    }
                    aria-label={`Apply equity suggestions to ${equitySuggestionsApplyCount} provider${equitySuggestionsApplyCount !== 1 ? 's' : ''}`}
                  >
                    {equityApplyAck ? (
                      <>
                        <Check className="h-4 w-4 animate-in zoom-in-50 duration-200" aria-hidden />
                        Applied
                      </>
                    ) : (
                      <>
                        Apply equity
                        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-semibold">
                          {equitySuggestionsApplyCount}
                        </span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openControls('experience-bands', 'equity')}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline px-1"
                  title="Open equity settings in Controls"
                >
                  Equity settings
                </button>
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
        {reviewViewMode === 'table' && filteredRecords.length > 0 && <SalaryReviewBandLegend />}
        <div
          className={`flex flex-col min-w-0 ${reviewViewMode === 'table' && filteredRecords.length === 0 ? 'min-h-[420px]' : ''}`}
        >
          {reviewViewMode === 'trend' ? (
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="salary-review-trend-group-by" className="text-sm font-medium text-slate-700">
                  Group by
                </label>
                <select
                  id="salary-review-trend-group-by"
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
              <LazyExperienceSalaryTrendChart records={filteredRecords} groupBy={trendGroupBy} />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-slate-600 font-medium">No providers match your filters.</p>
              <p className="text-sm text-slate-500 mt-1">Clear filters or change criteria to see providers.</p>
              <button
                type="button"
                onClick={() => handleFiltersChange({ ...DEFAULT_SALARY_REVIEW_FILTERS })}
                className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
          <>
            <SalaryReviewDataTable
              visibleColumns={visibleColumns}
              columnWidths={columnWidths}
              frozenLeftOffsets={frozenLeftOffsets}
              isFrozenColumn={isFrozenColumn}
              totalTableWidthPx={totalTableWidthPx}
              paginatedRecords={paginatedRecords}
              sortKey={sortKey}
              sortDir={sortDir}
              fullScreen={fullScreen}
              tableScrollRef={tableScrollRef}
              selectedEmployeeId={selectedEmployeeId}
              selectedForCompare={selectedForCompare}
              experienceBands={experienceBands}
              experienceBandSurveyContext={experienceBandSurveyContext}
              cfBySpecialty={cfBySpecialty}
              evaluationResults={evaluationResults}
              marketResolver={marketResolver}
              editingCell={editingCell}
              editBuffer={editBuffer}
              draggingColumnIndex={layout.draggingColumnIndex}
              dragOverColumnIndex={layout.dragOverColumnIndex}
              resizingColumnIndex={layout.resizingColumnIndex}
              onSort={handleSort}
              onResizeStart={layout.handleResizeStart}
              onHeaderDragStart={layout.handleHeaderDragStart}
              onHeaderDragOver={layout.handleHeaderDragOver}
              onHeaderDragLeave={layout.handleHeaderDragLeave}
              onHeaderDrop={layout.handleHeaderDrop}
              onHeaderDragEnd={layout.handleHeaderDragEnd}
              onToggleProviderForCompare={toggleProviderForCompare}
              onSelectAllOnPageForCompare={selectAllOnPageForCompare}
              onUpdateRecord={updateRecord}
              onSetSelectedEmployeeId={setSelectedEmployeeId}
              onSetDrawerClosing={setDrawerClosing}
              onSetNotesModalEmployeeId={setNotesModalEmployeeId}
              onSetEditingCell={setEditingCell}
              onSetEditBuffer={setEditBuffer}
              readOnly={cycleLocked}
            />
          </>
          )}
          {reviewViewMode === 'table' && filteredRecords.length > 0 && (
          <SalaryReviewTablePagination
            startRow={startRow}
            endRow={endRow}
            sortedRecordsLength={sortedRecords.length}
            pageSize={pageSize}
            setPageSize={setPageSize}
            setPage={setPage}
            safePage={safePage}
            totalPages={totalPages}
            goToPageInput={goToPageInput}
            setGoToPageInput={setGoToPageInput}
            handleGoToPage={handleGoToPage}
          />
          )}
        </div>
      </div>

      <SalaryReviewModals
        selectedEmployeeId={selectedEmployeeId}
        selectedRecord={selectedRecord}
        selectedEnrichment={selectedEnrichment}
        selectedMarketRow={selectedMarketRow}
        evaluationResult={selectedEmployeeId ? evaluationResults.get(selectedEmployeeId) ?? null : null}
        experienceBands={experienceBands}
        experienceBandSurveyContext={experienceBandSurveyContext}
        drawerClosing={drawerClosing}
        drawerWidth={drawerWidth}
        onDrawerResizeStart={handleDrawerResizeStart}
        onCloseDrawer={handleCloseDrawer}
        onSelectPrev={handleSelectPrev}
        onSelectNext={handleSelectNext}
        hasPrevInList={hasPrevInList}
        hasNextInList={hasNextInList}
        onApplyEquitySuggestion={
          selectedEmployeeId
            ? (suggestedIncreaseAmount) => {
                updateRecord(selectedEmployeeId, { Approved_Increase_Amount: suggestedIncreaseAmount });
                toast({
                  variant: 'success',
                  title: 'Equity suggestion applied',
                  description: `Updated approved increase for ${selectedRecord?.Provider_Name?.trim() || 'this provider'}.`,
                });
              }
            : undefined
        }
        compareModalOpen={compareModalOpen}
        selectedForCompare={selectedForCompare}
        records={records}
        onCloseCompare={() => setCompareModalOpen(false)}
        onClearCompare={clearCompareSelection}
        presetLabelsModalOpen={layout.presetLabelsModalOpen}
        onClosePresetLabels={() => layout.setPresetLabelsModalOpen(false)}
        draftPresetLabels={layout.draftPresetLabels}
        onDraftPresetLabelsChange={layout.setDraftPresetLabels}
        draftPresetOrder={layout.draftPresetOrder}
        onDraftPresetOrderChange={layout.setDraftPresetOrder}
        onSavePresetLabels={layout.savePresetLabels}
        notesModalEmployeeId={notesModalEmployeeId}
        onCloseNotes={() => setNotesModalEmployeeId(null)}
        onUpdateNotes={(employeeId, notes) => updateRecord(employeeId, { Notes: notes })}
      />

      <SalaryReviewCompareBar
        selectedCount={selectedForCompare.length}
        selectedNames={selectedCompareNames}
        onCompare={() => setCompareModalOpen(true)}
        onClear={clearCompareSelection}
      />
    </div>
  );
}
