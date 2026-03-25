/**
 * Specialty map: after Parameters assign each Provider_Type to a market survey, align
 * provider benchmark keys to market rows or APP combined groups. Per-survey tabs;
 * direct 1:1 match vs APP sections; Auto Map and status badges.
 */

import { useMemo, useCallback, useState, useEffect, type ReactNode } from 'react';
import type { ProviderRecord } from '../../types/provider';
import type { MarketSurveySet } from '../../types/market-survey-config';
import {
  collectActiveSurveyIds,
  getSurveyLabel,
  sortSurveyIdsByLabel,
} from '../../types/market-survey-config';
import {
  loadSurveySpecialtyMappingSet,
  loadProviderTypeToSurveyMapping,
} from '../../lib/parameters-storage';
import { mergeMarketIntoProvidersMulti, buildMarketLookup } from '../../lib/joins';
import { getProvidersForSpecialtyMapTab, resolveSpecialtyMapMarketSurveyId } from '../../lib/specialty-map-cohort';
import {
  getMatchKey,
  suggestPhysicianMappings,
  suggestAppGroupMappings,
  partitionProvidersByMappingMode,
} from '../../lib/specialty-auto-map';
import type { PhysicianMappingSuggestion, AppGroupMappingSuggestion } from '../../lib/specialty-auto-map';
import { SearchableSelect, type SearchableSelectOptionGroup } from '../../components/searchable-select';
import {
  type SpecialtyMapFilters,
  DEFAULT_SPECIALTY_MAP_FILTERS,
  applySpecialtyMapFilters,
  deriveSpecialtyMapFilterOptions,
} from '../../lib/specialty-map-filters';
import { InfoIconTip } from '../../components/info-icon-tip';
import { SpecialtyMapFilterBar } from './specialty-map-filter-bar';

interface SpecialtyMapProps {
  records: ProviderRecord[];
  marketSurveys: MarketSurveySet;
  surveyMetadata?: Record<string, { label: string }>;
  setRecords: (records: ProviderRecord[] | ((prev: ProviderRecord[]) => ProviderRecord[])) => void;
  /** Optional: navigate to Parameters → Provider type → Market survey (e.g. from empty state). */
  onOpenProviderTypeSurvey?: () => void;
}

type MappingStatus = 'mapped' | 'needs-mapping' | 'override';

interface ProviderMatchTableProps {
  providers: ProviderRecord[];
  providerStatuses: Map<string, { status: MappingStatus; matchedMarket?: string }>;
  getMarket: (key: string) => { specialty: string } | undefined;
  allTargetsForOverride: string[];
  handleOverrideChange: (employeeId: string, specialty: string | null) => void;
  /** APP survey: column lists single survey rows plus saved combined group names (if any). */
  appMapColumn?: boolean;
  /** When set with APP column, dropdown is sectioned (survey rows vs buckets). */
  mapOptionGroups?: SearchableSelectOptionGroup[];
}

function ProviderMatchTable({
  providers,
  providerStatuses,
  getMarket,
  allTargetsForOverride,
  handleOverrideChange,
  appMapColumn = false,
  mapOptionGroups,
}: ProviderMatchTableProps) {
  const sorted = useMemo(
    () =>
      [...providers].sort((a, b) => {
        const statusA = providerStatuses.get(a.Employee_ID)?.status ?? 'needs-mapping';
        const statusB = providerStatuses.get(b.Employee_ID)?.status ?? 'needs-mapping';
        const order = { 'needs-mapping': 0, mapped: 1, override: 2 };
        return order[statusA] - order[statusB];
      }),
    [providers, providerStatuses]
  );

  return (
    <div className="min-w-0 overflow-auto max-h-[calc(100vh-14rem)]">
      <table className="min-w-full border-collapse">
        <thead className="sticky top-0 z-20 bg-neutral-50 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
          <tr className="bg-neutral-50">
            <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide whitespace-nowrap">
              Status
            </th>
            <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide whitespace-nowrap">
              Employee ID
            </th>
            <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide whitespace-nowrap">
              Name
            </th>
            <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide whitespace-nowrap">
              Provider type
            </th>
            <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide whitespace-nowrap">
              Specialty
            </th>
            <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide whitespace-nowrap">
              Benchmark group
            </th>
            <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide whitespace-nowrap">
              Matched market
            </th>
            <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide min-w-[14rem]">
              {appMapColumn ? 'Manual override (market/bucket)' : 'Manual override (survey specialty)'}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {sorted.map((p) => {
            const key = getMatchKey(p);
            const matched = key ? getMarket(key) : undefined;
            const status = providerStatuses.get(p.Employee_ID)?.status ?? 'needs-mapping';
            return (
              <tr
                key={p.Employee_ID}
                className={`group transition-colors hover:bg-indigo-50/30 ${
                  status === 'needs-mapping' ? 'bg-amber-50/50' : ''
                }`}
              >
                <td className="px-2 py-1.5 text-sm text-slate-800 whitespace-nowrap align-middle">
                  <StatusBadge status={status} />
                </td>
                <td className="px-2 py-1.5 text-sm text-slate-800 whitespace-nowrap tabular-nums">{p.Employee_ID}</td>
                <td className="px-2 py-1.5 text-sm text-slate-800 whitespace-nowrap font-medium">{p.Provider_Name ?? '—'}</td>
                <td className="px-2 py-1.5 text-sm text-slate-800 whitespace-nowrap">{p.Provider_Type ?? '—'}</td>
                <td className="px-2 py-1.5 text-sm text-slate-800 whitespace-nowrap">{p.Specialty ?? '—'}</td>
                <td className="px-2 py-1.5 text-sm text-slate-800 whitespace-nowrap">{p.Benchmark_Group ?? '—'}</td>
                <td className="px-2 py-1.5 text-sm whitespace-nowrap">
                  {matched ? (
                    <span className="text-slate-800">{matched.specialty}</span>
                  ) : (
                    <span className="text-amber-700 font-medium">No match</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-sm text-slate-800 align-middle">
                  <div className="flex items-center gap-1.5">
                  <SearchableSelect
                    value={p.Market_Specialty_Override ?? ''}
                    {...(appMapColumn && mapOptionGroups && mapOptionGroups.length > 0
                      ? { optionGroups: mapOptionGroups }
                      : { options: allTargetsForOverride })}
                    onChange={(v) => handleOverrideChange(p.Employee_ID, v === '' ? null : v)}
                    emptyOptionLabel="Select"
                    includeEmptyOption={false}
                    aria-label={
                      appMapColumn
                        ? 'Select market survey row or custom bucket for this provider'
                        : 'Select survey specialty to map this provider'
                    }
                    className="min-w-[200px]"
                  />
                  {p.Market_Specialty_Override && (
                    <button
                      type="button"
                      onClick={() => handleOverrideChange(p.Employee_ID, null)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Clear manual override"
                      title="Clear manual override"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: MappingStatus }) {
  const config = {
    mapped: {
      label: 'Mapped',
      className: 'text-emerald-700',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    'needs-mapping': {
      label: 'Needs mapping',
      className: 'text-amber-700 font-medium',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    override: {
      label: 'Override set',
      className: 'text-slate-600',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
  };
  const { label, className, icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      {icon}
      {label}
    </span>
  );
}

/** Icon for Auto Map - sparkles suggest automatic/smart mapping. */
function AutoMapIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function RefreshIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-2.64-6.36M21 4v6h-6"
      />
    </svg>
  );
}

/** Compact help trigger - icon only, tooltip/popover on click. */
function HowMappingWorksIcon() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 hover:border-slate-400"
        aria-expanded={open}
        aria-label="How mapping works"
        title="How mapping works"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-72 max-w-[calc(100vw-2rem)] p-3 bg-white border border-slate-200 rounded-xl shadow-lg text-xs text-slate-600 space-y-2">
            <p><strong className="text-slate-800">Direct match:</strong> Match roster keys to market rows. Use Override when labels differ.</p>
            <p><strong className="text-slate-800">APP:</strong> Use <strong>Map to market / bucket</strong> for each person. Configure bucket names under <strong>Controls → Mappings → APP map buckets</strong>; they appear in the same list as survey specialties.</p>
          </div>
        </>
      )}
    </div>
  );
}

type AutoMapEmptyReason = 'no-market' | 'all-matched' | 'no-keys' | 'low-confidence' | null;

interface AutoMapPreviewModalProps {
  open: boolean;
  onClose: () => void;
  physicianSuggestions: PhysicianMappingSuggestion[];
  appSuggestions: AppGroupMappingSuggestion[];
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
  onApply: () => void;
  surveyLabel: string;
  minConfidence: number;
  onMinConfidenceChange: (v: number) => void;
  emptyReason: AutoMapEmptyReason;
  marketRowCount: number;
  unmappedCount: number;
}

function AutoMapPreviewModal({
  open,
  onClose,
  physicianSuggestions,
  appSuggestions,
  selectedIds,
  onToggleSelected,
  onApply,
  surveyLabel,
  minConfidence,
  onMinConfidenceChange,
  emptyReason,
  marketRowCount,
  unmappedCount,
}: AutoMapPreviewModalProps) {
  if (!open) return null;

  const allSuggestions = [
    ...physicianSuggestions.map((s) => ({ ...s, kind: 'physician' as const })),
    ...appSuggestions.map((s) => ({ ...s, kind: 'app' as const })),
  ];
  const selectedCount = allSuggestions.filter((s) => selectedIds.has(s.employeeId)).length;

  const emptyMessage = ((): { message: string | ReactNode } => {
    switch (emptyReason) {
      case 'no-market':
        return {
          message: (
            <>
              No market data for {surveyLabel}. Upload a market file for this survey in the <strong>Import</strong> tab.
            </>
          ),
        };
      case 'all-matched':
        return { message: 'All providers are already matched for this survey.' };
      case 'no-keys':
        return {
          message: (
            <>
              Unmapped providers have no Specialty or Benchmark_Group. Add these in your provider file or{' '}
              <strong>Data browser</strong>.
            </>
          ),
        };
      case 'low-confidence':
        return {
          message: `No fuzzy matches above ${Math.round(minConfidence * 100)}% confidence. Try lowering the slider.`,
        };
      default:
        return {
          message:
            'No suggestions found. All providers may already be matched, or market data may be empty.',
        };
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Preview auto-mapping</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Review suggested mappings for {surveyLabel}. Uncheck any you want to skip.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-xs font-medium text-slate-600">Min confidence</label>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={minConfidence}
              onChange={(e) => onMinConfidenceChange(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-xs text-slate-500">{Math.round(minConfidence * 100)}%</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {allSuggestions.length === 0 ? (
            <div className="py-4">
              <p className="text-slate-700 text-sm font-medium">{emptyMessage.message}</p>
              <p className="text-slate-500 text-xs mt-2">
                Market specialties: {marketRowCount} · Unmapped: {unmappedCount}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allSuggestions.map((s) => (
                <label
                  key={s.employeeId}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.employeeId)}
                    onChange={() => onToggleSelected(s.employeeId)}
                    className="mt-1 rounded border-slate-300"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">{s.providerName || s.employeeId}</span>
                      <span className="text-xs text-slate-400">{s.employeeId}</span>
                      <span className="text-xs text-slate-500">
                        {s.kind === 'physician' ? '1:1' : 'APP'}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {s.kind === 'physician' ? 'fuzzy' : (s as AppGroupMappingSuggestion).suggestedTargetType === 'combined' ? 'combined group' : 'market'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">
                      <span className="text-amber-700">{s.kind === 'physician' ? (s as PhysicianMappingSuggestion).currentKey : (s as AppGroupMappingSuggestion).providerSpecialty}</span>
                      {' → '}
                      <span className="text-emerald-700 font-medium">
                        {s.kind === 'physician' ? (s as PhysicianMappingSuggestion).suggestedMarketSpecialty : (s as AppGroupMappingSuggestion).suggestedTarget}
                      </span>
                      {' '}
                      <span className="text-slate-400">({Math.round((s.confidence * 100))}% match)</span>
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
          <span className="text-sm text-slate-600">
            {selectedCount} of {allSuggestions.length} selected to apply
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={selectedCount === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply {selectedCount} mapping{selectedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpecialtyMap({
  records,
  marketSurveys,
  surveyMetadata = {},
  setRecords,
  onOpenProviderTypeSurvey,
}: SpecialtyMapProps) {
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const [surveyMappings, setSurveyMappingsState] = useState(loadSurveySpecialtyMappingSet);
  const [autoMapModalOpen, setAutoMapModalOpen] = useState(false);
  const [autoMapSelectedIds, setAutoMapSelectedIds] = useState<Set<string>>(new Set());
  const [autoMapMinConfidence, setAutoMapMinConfidence] = useState(0.85);
  const [filters, setFilters] = useState<SpecialtyMapFilters>(() => DEFAULT_SPECIALTY_MAP_FILTERS);
  const [physicianPage, setPhysicianPage] = useState(1);
  const [physicianPageSize, setPhysicianPageSize] = useState(25);
  const [appPage, setAppPage] = useState(1);
  const [appPageSize, setAppPageSize] = useState(25);
  const PAGE_SIZES = [10, 25, 50, 100] as const;

  useEffect(() => {
    setSurveyMappingsState(loadSurveySpecialtyMappingSet());
  }, []);

  /** Tabs follow org data: market rows + provider-type routing only (no fixed three-slot list). */
  const specialtyMapSurveyTabIds = useMemo(() => {
    const typeToSurvey = loadProviderTypeToSurveyMapping();
    return sortSurveyIdsByLabel(collectActiveSurveyIds(marketSurveys, typeToSurvey), surveyMetadata);
  }, [marketSurveys, surveyMetadata]);

  /** When the selected tab is missing or invalid, follow the first available survey. */
  useEffect(() => {
    if (specialtyMapSurveyTabIds.length === 0) {
      if (selectedSurveyId !== '') setSelectedSurveyId('');
      return;
    }
    if (!specialtyMapSurveyTabIds.includes(selectedSurveyId)) {
      setSelectedSurveyId(specialtyMapSurveyTabIds[0]);
    }
  }, [specialtyMapSurveyTabIds, selectedSurveyId]);

  const activeSurveyId =
    specialtyMapSurveyTabIds.length > 0 && specialtyMapSurveyTabIds.includes(selectedSurveyId)
      ? selectedSurveyId
      : (specialtyMapSurveyTabIds[0] ?? '');

  const effectiveSurveyId = resolveSpecialtyMapMarketSurveyId(activeSurveyId);
  const marketData = marketSurveys[effectiveSurveyId] ?? [];
  const appCombinedGroups = surveyMappings[effectiveSurveyId]?.appCombinedGroups ?? [];

  /** Sectioned targets for APP-style map column: survey file rows vs named combined groups. */
  const appMapTargetGroups = useMemo((): SearchableSelectOptionGroup[] => {
    const surveySpecs = [...new Set(marketData.map((r) => r.specialty).filter((s) => s.trim() !== ''))].sort(
      (a, b) => a.localeCompare(b)
    );
    const surveySet = new Set(surveySpecs);
    const bucketNames = appCombinedGroups
      .map((g) => (g.combinedGroupName ?? '').trim())
      .filter(Boolean);
    const buckets = [...new Set(bucketNames)]
      .filter((b) => !surveySet.has(b))
      .sort((a, b) => a.localeCompare(b));
    return [
      { heading: 'Survey specialties', options: surveySpecs },
      { heading: 'Custom buckets', options: buckets },
    ].filter((g) => g.options.length > 0);
  }, [marketData, appCombinedGroups]);

  const providersForSurvey = useMemo(() => {
    const typeToSurvey = loadProviderTypeToSurveyMapping();
    return getProvidersForSpecialtyMapTab(records, activeSurveyId, typeToSurvey);
  }, [records, activeSurveyId]);

  const { physicians: physiciansForSurvey, apps: appsForSurvey } = useMemo(
    () => (activeSurveyId === 'apps'
      ? { physicians: [] as ProviderRecord[], apps: providersForSurvey }
      : partitionProvidersByMappingMode(providersForSurvey)),
    [providersForSurvey, activeSurveyId]
  );

  const isAppsView = activeSurveyId === 'apps';

  const getMarket = useMemo(
    () => buildMarketLookup(marketData, appCombinedGroups),
    [marketData, appCombinedGroups]
  );

  const providerStatuses = useMemo(() => {
    const map = new Map<string, { status: MappingStatus; matchedMarket?: string }>();
    for (const p of providersForSurvey) {
      const key = getMatchKey(p);
      const market = key ? getMarket(key) : undefined;
      const status: MappingStatus = market
        ? (p.Market_Specialty_Override ? 'override' : 'mapped')
        : 'needs-mapping';
      map.set(p.Employee_ID, { status, matchedMarket: market?.specialty });
    }
    return map;
  }, [providersForSurvey, getMarket]);

  const filterOptions = useMemo(
    () => deriveSpecialtyMapFilterOptions(providersForSurvey, providerStatuses),
    [providersForSurvey, providerStatuses]
  );

  const filteredPhysicians = useMemo(
    () => applySpecialtyMapFilters(physiciansForSurvey, filters, providerStatuses),
    [physiciansForSurvey, filters, providerStatuses]
  );

  const filteredApps = useMemo(
    () => applySpecialtyMapFilters(appsForSurvey, filters, providerStatuses),
    [appsForSurvey, filters, providerStatuses]
  );

  const filteredTotalCount = filteredPhysicians.length + filteredApps.length;

  useEffect(() => {
    setPhysicianPage(1);
    setAppPage(1);
  }, [filters]);

  const physicianTotalPages = Math.max(1, Math.ceil(filteredPhysicians.length / physicianPageSize) || 1);
  const physicianSafePage = Math.min(Math.max(1, physicianPage), physicianTotalPages);
  const paginatedPhysicians = useMemo(
    () => {
      const start = (physicianSafePage - 1) * physicianPageSize;
      return filteredPhysicians.slice(start, start + physicianPageSize);
    },
    [filteredPhysicians, physicianSafePage, physicianPageSize]
  );

  const appTotalPages = Math.max(1, Math.ceil(filteredApps.length / appPageSize) || 1);
  const appSafePage = Math.min(Math.max(1, appPage), appTotalPages);
  const paginatedApps = useMemo(
    () => {
      const start = (appSafePage - 1) * appPageSize;
      return filteredApps.slice(start, start + appPageSize);
    },
    [filteredApps, appSafePage, appPageSize]
  );

  const handleFiltersChange = useCallback((next: SpecialtyMapFilters) => {
    setFilters(next);
  }, []);

  const { unmatchedCount, orphanSpecialties } = useMemo(() => {
    let matched = 0;
    let unmatched = 0;
    for (const p of providersForSurvey) {
      const key = getMatchKey(p);
      const market = key ? getMarket(key) : undefined;
      if (market) matched++;
      else unmatched++;
    }
    const orphan = marketData.filter(
      (r) => !providersForSurvey.some((p) => getMarket(getMatchKey(p)) === r)
    ).map((r) => r.specialty);
    return { matchedCount: matched, unmatchedCount: unmatched, orphanSpecialties: orphan };
  }, [providersForSurvey, marketData, getMarket]);

  /** Why Auto Map returned no suggestions; used for specific empty-state messaging. */
  const emptyReason = useMemo((): 'no-market' | 'all-matched' | 'no-keys' | 'low-confidence' | null => {
    if (marketData.length === 0) return 'no-market';
    if (unmatchedCount === 0) return 'all-matched';
    const unmappedWithKey = providersForSurvey.filter((p) => {
      const key = getMatchKey(p);
      return key.trim() !== '' && !getMarket(key);
    }).length;
    if (unmappedWithKey === 0) return 'no-keys';
    return 'low-confidence';
  }, [marketData.length, unmatchedCount, providersForSurvey, getMarket]);

  const physicianSuggestions = useMemo(
    () =>
      physiciansForSurvey.length > 0
        ? suggestPhysicianMappings(physiciansForSurvey, marketData, appCombinedGroups, { minConfidence: autoMapMinConfidence })
        : [],
    [physiciansForSurvey, marketData, appCombinedGroups, autoMapMinConfidence]
  );

  const appSuggestions = useMemo(
    () =>
      appsForSurvey.length > 0
        ? suggestAppGroupMappings(appsForSurvey, marketData, appCombinedGroups, { minConfidence: autoMapMinConfidence })
        : [],
    [appsForSurvey, marketData, appCombinedGroups, autoMapMinConfidence]
  );

  const handleOpenAutoMap = useCallback(() => {
    const ids = new Set([
      ...physicianSuggestions.map((s) => s.employeeId),
      ...appSuggestions.map((s) => s.employeeId),
    ]);
    setAutoMapSelectedIds(ids);
    setAutoMapModalOpen(true);
  }, [physicianSuggestions, appSuggestions]);

  const handleToggleAutoMapSelected = useCallback((id: string) => {
    setAutoMapSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleApplyAutoMap = useCallback(() => {
    const toApply = [
      ...physicianSuggestions.filter((s) => autoMapSelectedIds.has(s.employeeId)),
      ...appSuggestions.filter((s) => autoMapSelectedIds.has(s.employeeId)),
    ];
    setRecords((prev) => {
      const overrides = new Map<string, string>();
      for (const s of toApply) {
        const target = 'suggestedMarketSpecialty' in s ? s.suggestedMarketSpecialty : s.suggestedTarget;
        overrides.set(s.employeeId, target);
      }
      const updated = prev.map((p) => {
        const override = overrides.get(p.Employee_ID);
        if (override == null) return p;
        return { ...p, Market_Specialty_Override: override };
      });
      const mappings = loadSurveySpecialtyMappingSet();
      const typeToSurvey = loadProviderTypeToSurveyMapping();
      return mergeMarketIntoProvidersMulti(updated, marketSurveys, mappings, typeToSurvey);
    });
    setAutoMapModalOpen(false);
  }, [physicianSuggestions, appSuggestions, autoMapSelectedIds, setRecords, marketSurveys]);

  const doMerge = useCallback(() => {
    const mappings = loadSurveySpecialtyMappingSet();
    const typeToSurvey = loadProviderTypeToSurveyMapping();
    setRecords((prev) => mergeMarketIntoProvidersMulti(prev, marketSurveys, mappings, typeToSurvey));
  }, [marketSurveys, setRecords]);

  const handleOverrideChange = useCallback(
    (employeeId: string, specialty: string | null) => {
      setRecords((prev) => {
        const updated = prev.map((p) =>
          p.Employee_ID === employeeId
            ? { ...p, Market_Specialty_Override: specialty ?? undefined }
            : p
        );
        const mappings = loadSurveySpecialtyMappingSet();
        const typeToSurvey = loadProviderTypeToSurveyMapping();
        return mergeMarketIntoProvidersMulti(updated, marketSurveys, mappings, typeToSurvey);
      });
    },
    [setRecords, marketSurveys]
  );

  const totalSuggestions = physicianSuggestions.length + appSuggestions.length;
  const canAutoMap = marketData.length > 0 && providersForSurvey.length > 0;
  const surveyLabel = getSurveyLabel(resolveSpecialtyMapMarketSurveyId(activeSurveyId), surveyMetadata);

  if (specialtyMapSurveyTabIds.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-indigo-100 p-10 text-center shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07)]">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Specialty map</h2>
        <p className="text-slate-600 mb-4 max-w-lg mx-auto">
          No market surveys are active yet. Upload market data for a survey in <strong>Data → Market survey</strong>, or set{' '}
          <strong>Provider type → Market survey</strong> in Parameters so types route to a survey you use.
        </p>
        {onOpenProviderTypeSurvey && (
          <button
            type="button"
            onClick={onOpenProviderTypeSurvey}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline-offset-2 hover:underline"
          >
            Open Provider type → Market survey
          </button>
        )}
      </div>
    );
  }

  const marketSpecialties = marketData.map((r) => r.specialty).filter((s) => s.trim() !== '');
  const allTargetsForOverride = [...new Set([...marketSpecialties, ...appCombinedGroups.map((g) => g.combinedGroupName).filter(Boolean)])];

  const autoMapDisabledReason =
    marketData.length === 0
      ? 'Upload market data for this survey first.'
      : providersForSurvey.length === 0
        ? 'No providers use this survey. Set Provider_Type → Survey in Parameters.'
        : null;

  return (
    <div className="flex flex-col min-w-0">
      <div className="min-w-0 flex flex-col border border-indigo-100 rounded-2xl bg-white shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07)]">
        <div className="shrink-0 border-b border-slate-200 px-5 pb-3 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-800">Specialty map</h2>
                <span className="group relative inline-flex shrink-0">
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    aria-label="How specialty map works"
                    aria-describedby="specialty-map-works-tooltip"
                  >
                    i
                  </button>
                  <div
                    id="specialty-map-works-tooltip"
                    role="tooltip"
                    className="pointer-events-auto invisible absolute left-1/2 top-[calc(100%-4px)] z-50 max-h-[70vh] w-[min(22rem,calc(100vw-2.5rem))] -translate-x-1/2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 pt-4 text-left text-[11px] leading-snug text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
                  >
                    <p className="font-medium text-slate-800">How specialty map works</p>
                    <p className="mt-2">
                      Set <strong className="text-slate-800">Provider type → Market survey</strong> in Parameters first.
                      Here you tie each person&apos;s keys to a market row for that survey file.
                    </p>
                    <p className="mt-2">
                      On <strong>APP</strong>, use <strong>Map to market / bucket</strong>. Add combined names in <strong>Controls → Mappings → APP map buckets</strong>; they appear alongside survey specialties in that list.
                    </p>
                    <p className="mt-2 text-slate-500">
                      Refresh matches when done so Salary review uses updated percentiles.
                    </p>
                  </div>
                </span>
                {onOpenProviderTypeSurvey && (
                  <button
                    type="button"
                    onClick={onOpenProviderTypeSurvey}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline-offset-2 hover:underline"
                  >
                    Parameters → Provider → survey
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-600 mr-1">Survey</span>
                <div className="app-segmented-track w-fit flex flex-wrap">
                  {specialtyMapSurveyTabIds.map((id, idx) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedSurveyId(id)}
                      className={`app-segmented-segment shrink-0 ${idx === 0 ? 'rounded-l-full' : ''} ${
                        idx === specialtyMapSurveyTabIds.length - 1 ? 'rounded-r-full' : ''
                      } ${activeSurveyId === id ? 'app-segmented-segment-active' : ''}`}
                    >
                      {getSurveyLabel(id, surveyMetadata)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 self-end">
              {providersForSurvey.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleOpenAutoMap}
                    disabled={!canAutoMap}
                    className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium leading-none transition-colors ${
                      canAutoMap
                        ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                        : 'app-btn-secondary opacity-60 cursor-not-allowed'
                    }`}
                    title={
                      autoMapDisabledReason ??
                      (totalSuggestions > 0
                        ? `${totalSuggestions} suggested mapping(s)`
                        : 'Open to preview or lower confidence for more suggestions')
                    }
                  >
                    <AutoMapIcon className="w-4 h-4 shrink-0" />
                    Auto Map{totalSuggestions > 0 ? ` (${totalSuggestions})` : ''}
                  </button>
                </>
              )}
              {providersForSurvey.length > 0 && (
                <button
                  type="button"
                  onClick={doMerge}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 hover:border-slate-400"
                  title="Refresh matches"
                  aria-label="Refresh matches"
                >
                  <RefreshIcon className="h-5 w-5" />
                </button>
              )}
              <HowMappingWorksIcon />
            </div>
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          {providersForSurvey.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
              {records.length === 0 ? (
                <p className="text-slate-600 font-medium">
                  No provider records yet. Upload provider data in the Provider data tab first.
                </p>
              ) : (
                <>
                  <p className="text-slate-600 font-medium">
                    {isAppsView
                      ? `No APP providers are mapped to the ${surveyLabel} survey.`
                      : `No providers map to ${surveyLabel}.`}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {isAppsView
                      ? 'Assign NP, PA, APP, and similar types to the APP market survey in Parameters (not the Physicians survey unless that is intentional).'
                      : 'Configure Provider type → Market survey in Parameters so each role uses this tab’s market file.'}
                  </p>
                  {onOpenProviderTypeSurvey && (
                    <button
                      type="button"
                      onClick={onOpenProviderTypeSurvey}
                      className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Type → Market
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
            <div className="shrink-0 px-5">
              <SpecialtyMapFilterBar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                filterOptions={filterOptions}
                totalCount={providersForSurvey.length}
                filteredCount={filteredTotalCount}
              />
            </div>
          {filteredTotalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-slate-600 font-medium">No providers match your filters.</p>
              <p className="text-sm text-slate-500 mt-1">Clear filters or change criteria to see providers.</p>
              <button
                type="button"
                onClick={() => handleFiltersChange(DEFAULT_SPECIALTY_MAP_FILTERS)}
                className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              {filteredPhysicians.length > 0 && (
                <>
                  <div className="shrink-0 px-5 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-700">1:1 market match</h3>
                    <InfoIconTip aria-label="Match order">
                      <p>Resolution order: <strong className="text-slate-800">Override</strong>, then <strong>Specialty</strong>, then <strong>Benchmark group</strong>.</p>
                    </InfoIconTip>
                  </div>
                  <div className="min-w-0 border-t border-neutral-200/80">
                    <ProviderMatchTable
                      providers={paginatedPhysicians}
                      providerStatuses={providerStatuses}
                      getMarket={getMarket}
                      allTargetsForOverride={allTargetsForOverride}
                      handleOverrideChange={handleOverrideChange}
                    />
                  </div>
                  <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-t border-slate-200 bg-slate-50/80">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-sm text-slate-600">
                        {surveyLabel} — <span className="font-medium text-slate-800">{filteredPhysicians.length}</span> providers
                      </span>
                      {orphanSpecialties.length > 0 && (
                        <span className="text-xs text-slate-400">
                          Unused: {orphanSpecialties.slice(0, 6).join(', ')}{orphanSpecialties.length > 6 ? '…' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="text-sm text-slate-600">
                        Showing <span className="font-medium text-slate-800">{Math.min((physicianSafePage - 1) * physicianPageSize + 1, filteredPhysicians.length)}</span>–<span className="font-medium text-slate-800">{Math.min(physicianSafePage * physicianPageSize, filteredPhysicians.length)}</span> of{' '}
                        <span className="font-medium text-slate-800">{filteredPhysicians.length}</span>
                      </span>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        Rows per page
                        <select
                          value={physicianPageSize}
                          onChange={(e) => { setPhysicianPageSize(Number(e.target.value)); setPhysicianPage(1); }}
                          className="px-2 py-1 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                          <option value={99999}>All</option>
                        </select>
                      </label>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setPhysicianPage((p) => Math.max(1, p - 1))} disabled={physicianSafePage <= 1} className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700">Previous</button>
                        <span className="text-sm text-slate-600">Page <span className="font-medium">{physicianSafePage}</span> of <span className="font-medium">{physicianTotalPages}</span></span>
                        <button type="button" onClick={() => setPhysicianPage((p) => Math.min(physicianTotalPages, p + 1))} disabled={physicianSafePage >= physicianTotalPages} className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700">Next</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {filteredApps.length > 0 && (
                <>
                  <div className="shrink-0 px-5 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-700">APP roster</h3>
                    <InfoIconTip aria-label="APP mapping">
                      <p>
                        Use <strong className="text-slate-800">Map to market / bucket</strong> for each person. The dropdown lists every APP survey specialty plus <strong className="text-slate-800">custom buckets</strong> you define under <strong className="text-slate-800">Controls → Mappings → APP map buckets</strong>.
                      </p>
                      <p className="text-slate-500">Auto Map suggests matches when roster labels align to those rows or buckets.</p>
                    </InfoIconTip>
                  </div>
                  <div className="min-w-0 border-t border-neutral-200/80">
                    <ProviderMatchTable
                      providers={paginatedApps}
                      providerStatuses={providerStatuses}
                      getMarket={getMarket}
                      allTargetsForOverride={allTargetsForOverride}
                      handleOverrideChange={handleOverrideChange}
                      appMapColumn
                      mapOptionGroups={appMapTargetGroups}
                    />
                  </div>
                  <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-t border-slate-200 bg-slate-50/80">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-sm text-slate-600">
                        APP providers — <span className="font-medium text-slate-800">{filteredApps.length}</span> providers
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="text-sm text-slate-600">
                        Showing <span className="font-medium text-slate-800">{Math.min((appSafePage - 1) * appPageSize + 1, filteredApps.length)}</span>–<span className="font-medium text-slate-800">{Math.min(appSafePage * appPageSize, filteredApps.length)}</span> of{' '}
                        <span className="font-medium text-slate-800">{filteredApps.length}</span>
                      </span>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        Rows per page
                        <select
                          value={appPageSize}
                          onChange={(e) => { setAppPageSize(Number(e.target.value)); setAppPage(1); }}
                          className="px-2 py-1 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                          <option value={99999}>All</option>
                        </select>
                      </label>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setAppPage((p) => Math.max(1, p - 1))} disabled={appSafePage <= 1} className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700">Previous</button>
                        <span className="text-sm text-slate-600">Page <span className="font-medium">{appSafePage}</span> of <span className="font-medium">{appTotalPages}</span></span>
                        <button type="button" onClick={() => setAppPage((p) => Math.min(appTotalPages, p + 1))} disabled={appSafePage >= appTotalPages} className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700">Next</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
            </>
          )}
        </div>
      </div>
      <AutoMapPreviewModal
        open={autoMapModalOpen}
        onClose={() => setAutoMapModalOpen(false)}
        physicianSuggestions={physicianSuggestions}
        appSuggestions={appSuggestions}
        selectedIds={autoMapSelectedIds}
        onToggleSelected={handleToggleAutoMapSelected}
        onApply={handleApplyAutoMap}
        surveyLabel={surveyLabel}
        minConfidence={autoMapMinConfidence}
        onMinConfidenceChange={setAutoMapMinConfidence}
        emptyReason={emptyReason}
        marketRowCount={marketData.length}
        unmappedCount={unmatchedCount}
      />
    </div>
  );
}
