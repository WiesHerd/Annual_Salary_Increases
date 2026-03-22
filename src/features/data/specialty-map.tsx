/**
 * Specialty map: show how providers map to market and allow overrides.
 * Per-survey: select survey, see providers that use it, configure APP combined groups.
 * Physician (1:1) and APP (many-to-one) sections with Auto Map and status badges.
 */

import { useMemo, useCallback, useState, useEffect, type ReactNode } from 'react';
import type { ProviderRecord } from '../../types/provider';
import type { MarketSurveySet } from '../../types/market-survey-config';
import type { AppCombinedGroupRow } from '../../types/app-combined-group';
import { SURVEY_LABELS, getSurveyLabel } from '../../types/market-survey-config';
import {
  loadSurveySpecialtyMappingSet,
  saveAppCombinedGroups,
  loadProviderTypeToSurveyMapping,
} from '../../lib/parameters-storage';
import { mergeMarketIntoProvidersMulti, buildMarketLookup } from '../../lib/joins';
import {
  getMatchKey,
  suggestPhysicianMappings,
  suggestAppGroupMappings,
  partitionProvidersByMappingMode,
} from '../../lib/specialty-auto-map';
import type { PhysicianMappingSuggestion, AppGroupMappingSuggestion } from '../../lib/specialty-auto-map';
import { SearchableSelect } from '../../components/searchable-select';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { standardDonutPieSeriesBase } from '../../lib/echarts-donut-style';
import {
  type SpecialtyMapFilters,
  DEFAULT_SPECIALTY_MAP_FILTERS,
  applySpecialtyMapFilters,
  deriveSpecialtyMapFilterOptions,
} from '../../lib/specialty-map-filters';
import { SpecialtyMapFilterBar } from './specialty-map-filter-bar';

interface SpecialtyMapProps {
  records: ProviderRecord[];
  marketSurveys: MarketSurveySet;
  surveyMetadata?: Record<string, { label: string }>;
  setRecords: (records: ProviderRecord[] | ((prev: ProviderRecord[]) => ProviderRecord[])) => void;
}

type MappingStatus = 'mapped' | 'needs-mapping' | 'override';

interface ProviderMatchTableProps {
  providers: ProviderRecord[];
  providerStatuses: Map<string, { status: MappingStatus; matchedMarket?: string }>;
  getMarket: (key: string) => { specialty: string } | undefined;
  allTargetsForOverride: string[];
  handleOverrideChange: (employeeId: string, specialty: string | null) => void;
}

function ProviderMatchTable({
  providers,
  providerStatuses,
  getMarket,
  allTargetsForOverride,
  handleOverrideChange,
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
    <div className="app-data-table-wrapper">
      <table className="app-data-table">
        <thead>
          <tr>
            <th className="text-left">Status</th>
            <th className="text-left">Employee ID</th>
            <th className="text-left">Name</th>
            <th className="text-left">Provider type</th>
            <th className="text-left">Specialty</th>
            <th className="text-left">Benchmark group</th>
            <th className="text-left">Matched market</th>
            <th className="text-left">Map to survey specialty</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const key = getMatchKey(p);
            const matched = key ? getMarket(key) : undefined;
            const status = providerStatuses.get(p.Employee_ID)?.status ?? 'needs-mapping';
            return (
              <tr key={p.Employee_ID} className={status === 'needs-mapping' ? 'bg-amber-50/40' : undefined}>
                <td><StatusBadge status={status} /></td>
                <td>{p.Employee_ID}</td>
                <td className="text-slate-900">{p.Provider_Name ?? '—'}</td>
                <td>{p.Provider_Type ?? '—'}</td>
                <td>{p.Specialty ?? '—'}</td>
                <td>{p.Benchmark_Group ?? '—'}</td>
                <td>
                  {matched ? <span>{matched.specialty}</span> : <span className="text-amber-700 font-medium">No match</span>}
                </td>
                <td>
                  <SearchableSelect
                    value={p.Market_Specialty_Override ?? ''}
                    options={allTargetsForOverride}
                    onChange={(v) => handleOverrideChange(p.Employee_ID, v === '' ? null : v)}
                    emptyOptionLabel="Search and select survey specialty…"
                    aria-label="Select survey specialty to map this provider"
                    className="min-w-[200px]"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Donut chart showing matched vs needs-mapping in a compact card. */
function MappingDonutChart({
  matchedCount,
  unmatchedCount,
}: {
  matchedCount: number;
  unmatchedCount: number;
}) {
  const total = matchedCount + unmatchedCount;
  const option = useMemo((): EChartsOption => {
    const data = [
      { value: matchedCount, name: 'Matched', itemStyle: { color: '#10b981' } }, // emerald-500
      { value: unmatchedCount, name: 'Needs mapping', itemStyle: { color: '#f59e0b' } }, // amber-500
    ].filter((d) => d.value > 0);
    if (data.length === 0) {
      data.push({ value: 1, name: 'No data', itemStyle: { color: '#e2e8f0' } });
    }
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      series: [
        {
          ...standardDonutPieSeriesBase,
          padAngle: 2,
          data,
        },
      ],
    };
  }, [matchedCount, unmatchedCount]);

  return (
    <div className="relative shrink-0 w-[100px] h-[100px]">
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        notMerge
        opts={{ renderer: 'canvas' }}
      />
      {total > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-lg font-semibold text-slate-700 tabular-nums">{total}</span>
        </div>
      )}
    </div>
  );
}

function BulkMappingApply({
  providerSpecialtyOptions,
  allTargetsForOverride,
  appsForSurvey,
  getMatchKey,
  onApply,
}: {
  providerSpecialtyOptions: string[];
  allTargetsForOverride: string[];
  appsForSurvey: ProviderRecord[];
  getMatchKey: (p: ProviderRecord) => string;
  onApply: (sourceSpecialties: string[], target: string) => void;
}) {
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState('');
  const matchCount = useMemo(() => {
    if (selectedSources.size === 0) return 0;
    return appsForSurvey.filter((p) => selectedSources.has(getMatchKey(p))).length;
  }, [appsForSurvey, selectedSources, getMatchKey]);
  const handleToggleSource = (s: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };
  const handleApply = () => {
    if (selectedSources.size === 0 || !target.trim()) return;
    onApply([...selectedSources], target.trim());
    setSelectedSources(new Set());
    setTarget('');
  };
  return (
    <div className="p-4 border-b border-slate-200">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Provider specialties to map</label>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-white">
            {providerSpecialtyOptions.length === 0 ? (
              <span className="text-xs text-slate-400">No provider specialties</span>
            ) : (
              providerSpecialtyOptions.map((s) => (
                <label key={s} className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSources.has(s)}
                    onChange={() => handleToggleSource(s)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-700">{s}</span>
                </label>
              ))
            )}
          </div>
        </div>
        <div className="min-w-[180px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Map to</label>
          <SearchableSelect
            value={target}
            options={allTargetsForOverride}
            onChange={(v) => setTarget(v ?? '')}
            emptyOptionLabel="Select target…"
            className="min-w-[180px]"
          />
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={selectedSources.size === 0 || !target.trim()}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply to {matchCount} provider{matchCount !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}

function ProviderSpecialtyCustomAdd({
  groupId,
  onAdd,
  existing,
}: {
  groupId: string;
  onAdd: (groupId: string, specialty: string) => void;
  existing: string[];
}) {
  const [value, setValue] = useState('');
  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed && !existing.includes(trimmed)) {
      onAdd(groupId, trimmed);
      setValue('');
    }
  };
  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
        placeholder="Or type custom…"
        className="px-2 py-1 text-xs border border-slate-300 rounded-lg min-w-[120px]"
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!value.trim() || existing.includes(value.trim())}
        className="px-2 py-1 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
      >
        Add
      </button>
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

/** Setup checklist: guides users through the mapping workflow. */
function SetupChecklist({
  recordsCount,
  hasMarketData,
  providerTypeMappingComplete,
  allMapped,
}: {
  recordsCount: number;
  hasMarketData: boolean;
  providerTypeMappingComplete: boolean;
  allMapped: boolean;
}) {
  const [open, setOpen] = useState(false);
  const steps = [
    { label: 'Upload providers', done: recordsCount > 0 },
    { label: 'Upload surveys', done: hasMarketData },
    { label: 'Set Provider_Type → Survey in Parameters', done: providerTypeMappingComplete },
    { label: 'Map specialties (Auto Map or manual)', done: allMapped },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-2 text-sm font-medium border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-700 flex items-center gap-2"
        aria-expanded={open}
      >
        <span>Setup: {doneCount}/{steps.length}</span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-72 max-w-[calc(100vw-2rem)] p-3 bg-white border border-slate-200 rounded-xl shadow-lg text-xs text-slate-600 space-y-2">
            <p className="font-medium text-slate-800">Mapping workflow</p>
            <ol className="list-decimal list-inside space-y-1">
              {steps.map((s, i) => (
                <li key={i} className={s.done ? 'text-emerald-700' : 'text-slate-600'}>
                  {s.done && <span className="mr-1">✓</span>}
                  {s.label}
                </li>
              ))}
            </ol>
            <p className="text-slate-500 pt-1">Then click &quot;Sync market data&quot; to refresh.</p>
          </div>
        </>
      )}
    </div>
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

/** Compact help trigger - icon only, tooltip/popover on click. */
function HowMappingWorksIcon() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-400 transition-colors"
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
            <p><strong className="text-slate-800">Physicians (1:1):</strong> Map Specialty/Benchmark_Group to market. Use Override when labels differ.</p>
            <p><strong className="text-slate-800">APPs (many-to-one):</strong> Blend specialties into one benchmark via combined groups below.</p>
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

export function SpecialtyMap({ records, marketSurveys, surveyMetadata = {}, setRecords }: SpecialtyMapProps) {
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('physicians');
  const [appsMarketSurveyId, setAppsMarketSurveyId] = useState<string>('mental-health-therapists');
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

  useEffect(() => {
    const realIds = Object.keys(marketSurveys).filter((id) => id !== 'apps');
    if (realIds.length > 0 && !realIds.includes(appsMarketSurveyId)) {
      setAppsMarketSurveyId(realIds[0]);
    }
  }, [marketSurveys, appsMarketSurveyId]);

  const surveyIds = useMemo(() => {
    const fromData = Object.keys(marketSurveys);
    const fromLabels = Object.keys(SURVEY_LABELS);
    return [...new Set([...fromLabels, ...fromData])];
  }, [marketSurveys]);

  /** Only show tabs for surveys that are in use: have market data or at least one provider type mapped. */
  const surveyIdsInUse = useMemo(() => {
    const typeToSurvey = loadProviderTypeToSurveyMapping();
    const mappedSurveyIds = new Set(Object.values(typeToSurvey));
    const realSurveyIds = Object.keys(marketSurveys).filter((id) => id !== 'apps');
    return surveyIds.filter((id) => {
      if (id === 'apps') {
        return realSurveyIds.some((rid) => mappedSurveyIds.has(rid));
      }
      return (marketSurveys[id]?.length ?? 0) > 0 || mappedSurveyIds.has(id);
    });
  }, [marketSurveys, surveyIds]);

  /** When the selected tab is no longer in use, switch to the first in-use tab. */
  useEffect(() => {
    if (surveyIdsInUse.length > 0 && !surveyIdsInUse.includes(selectedSurveyId)) {
      setSelectedSurveyId(surveyIdsInUse[0]);
    }
  }, [surveyIdsInUse, selectedSurveyId]);

  const realSurveyIds = useMemo(() => 
    Object.keys(marketSurveys).filter((id) => id !== 'apps'),
    [marketSurveys]
  );

  const effectiveSurveyId = selectedSurveyId === 'apps' ? appsMarketSurveyId : selectedSurveyId;
  const marketData = marketSurveys[effectiveSurveyId] ?? [];
  const appCombinedGroups = surveyMappings[effectiveSurveyId]?.appCombinedGroups ?? [];

  const setAppCombinedGroups = useCallback((updater: AppCombinedGroupRow[] | ((prev: AppCombinedGroupRow[]) => AppCombinedGroupRow[])) => {
    setSurveyMappingsState((prev) => {
      const next = { ...prev };
      const groups = typeof updater === 'function' ? updater(next[effectiveSurveyId]?.appCombinedGroups ?? []) : updater;
      next[effectiveSurveyId] = { appCombinedGroups: groups };
      saveAppCombinedGroups(effectiveSurveyId, groups);
      return next;
    });
  }, [effectiveSurveyId]);

  const providersForSurvey = useMemo(() => {
    const typeToSurvey = loadProviderTypeToSurveyMapping();
    if (selectedSurveyId === 'apps') {
      const forMarket = records.filter((p) => (typeToSurvey[(p.Provider_Type ?? '').trim()] ?? 'physicians') === appsMarketSurveyId);
      return partitionProvidersByMappingMode(forMarket).apps;
    }
    return records.filter((p) => (typeToSurvey[(p.Provider_Type ?? '').trim()] ?? 'physicians') === selectedSurveyId);
  }, [records, selectedSurveyId, appsMarketSurveyId]);

  const { physicians: physiciansForSurvey, apps: appsForSurvey } = useMemo(
    () => (selectedSurveyId === 'apps'
      ? { physicians: [] as ProviderRecord[], apps: providersForSurvey }
      : partitionProvidersByMappingMode(providersForSurvey)),
    [providersForSurvey, selectedSurveyId]
  );

  const isAppsView = selectedSurveyId === 'apps';

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

  const { matchedCount, unmatchedCount, orphanSpecialties } = useMemo(() => {
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

  const addCombinedGroup = useCallback(() => {
    setAppCombinedGroups((prev) => [
      ...prev,
      { id: `cg-${Date.now()}`, combinedGroupName: '', surveySpecialties: [] },
    ]);
  }, [setAppCombinedGroups]);

  const updateCombinedGroup = useCallback((id: string, updates: Partial<AppCombinedGroupRow>) => {
    setAppCombinedGroups((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, [setAppCombinedGroups]);

  const removeCombinedGroup = useCallback((id: string) => {
    setAppCombinedGroups((prev) => prev.filter((r) => r.id !== id));
  }, [setAppCombinedGroups]);

  const addSpecialtyToGroup = useCallback((groupId: string, specialty: string) => {
    setAppCombinedGroups((prev) =>
      prev.map((r) =>
        r.id === groupId && !r.surveySpecialties.includes(specialty)
          ? { ...r, surveySpecialties: [...r.surveySpecialties, specialty] }
          : r
      )
    );
  }, [setAppCombinedGroups]);

  const removeSpecialtyFromGroup = useCallback((groupId: string, specialty: string) => {
    setAppCombinedGroups((prev) =>
      prev.map((r) =>
        r.id === groupId
          ? { ...r, surveySpecialties: r.surveySpecialties.filter((s) => s !== specialty) }
          : r
      )
    );
  }, [setAppCombinedGroups]);

  const addProviderSpecialtyToGroup = useCallback((groupId: string, specialty: string) => {
    const trimmed = specialty.trim();
    if (!trimmed) return;
    setAppCombinedGroups((prev) =>
      prev.map((r) => {
        if (r.id !== groupId) return r;
        const existing = r.providerSpecialties ?? [];
        if (existing.includes(trimmed)) return r;
        return { ...r, providerSpecialties: [...existing, trimmed] };
      })
    );
  }, [setAppCombinedGroups]);

  const removeProviderSpecialtyFromGroup = useCallback((groupId: string, specialty: string) => {
    setAppCombinedGroups((prev) =>
      prev.map((r) =>
        r.id === groupId && r.providerSpecialties
          ? { ...r, providerSpecialties: r.providerSpecialties.filter((s) => s !== specialty) }
          : r
      )
    );
  }, [setAppCombinedGroups]);

  const providerSpecialtyOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const p of appsForSurvey) {
      const s = (p.Specialty ?? '').trim();
      const b = (p.Benchmark_Group ?? '').trim();
      if (s) keys.add(s);
      if (b) keys.add(b);
    }
    return [...keys].sort();
  }, [appsForSurvey]);

  const totalSuggestions = physicianSuggestions.length + appSuggestions.length;
  const canAutoMap = marketData.length > 0 && providersForSurvey.length > 0;
  const surveyLabel = isAppsView
    ? `${getSurveyLabel(appsMarketSurveyId, surveyMetadata)} market`
    : getSurveyLabel(selectedSurveyId, surveyMetadata);

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-indigo-100 p-10 text-center shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07)]">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Specialty map</h2>
        <p className="text-slate-600 mb-4">No provider records yet. Upload provider data in the Provider data tab first.</p>
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
        {/* Header bar - matches Salary Review */}
        <div className="shrink-0 px-5 pt-4 pb-2 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-xl font-semibold text-slate-800">Specialty map</h2>
              <div className="flex rounded-xl border border-slate-300 bg-slate-50">
                {surveyIdsInUse.map((id, idx) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedSurveyId(id)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${idx === 0 ? 'rounded-l-xl' : ''} ${idx === surveyIdsInUse.length - 1 ? 'rounded-r-xl' : ''} ${
                      selectedSurveyId === id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {getSurveyLabel(id, surveyMetadata)}
                  </button>
                ))}
              </div>
              {isAppsView && realSurveyIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Using market:</span>
                <select
                  value={appsMarketSurveyId}
                  onChange={(e) => setAppsMarketSurveyId(e.target.value)}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {realSurveyIds.map((id) => (
                    <option key={id} value={id}>{getSurveyLabel(id, surveyMetadata)}</option>
                  ))}
                </select>
              </div>
            )}
            </div>
            <p className="text-xs text-slate-500">By market survey. Add a survey in Import to get another tab.</p>
          </div>
          <div className="flex items-center gap-3">
            <MappingDonutChart matchedCount={matchedCount} unmatchedCount={unmatchedCount} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-emerald-700">{matchedCount} matched</span>
              {unmatchedCount > 0 && (
                <span className="text-xs font-medium text-amber-700">{unmatchedCount} need mapping</span>
              )}
            </div>
            <SetupChecklist
              recordsCount={records.length}
              hasMarketData={Object.values(marketSurveys).some((rows) => rows.length > 0)}
              providerTypeMappingComplete={Object.keys(loadProviderTypeToSurveyMapping()).length > 0}
              allMapped={unmatchedCount === 0 && providersForSurvey.length > 0}
            />
          </div>
        </div>

        {/* Provider tables - scrollable area like Salary Review */}
        <div className="flex flex-col min-w-0">
          {providersForSurvey.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-slate-600 font-medium">
                {isAppsView ? `No APP providers use the ${getSurveyLabel(appsMarketSurveyId, surveyMetadata)} market.` : `No providers map to ${surveyLabel}.`}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {isAppsView ? 'Configure Provider_Type → Survey in Parameters to assign APPs to a market.' : 'Configure Provider_Type → Survey in Parameters.'}
              </p>
            </div>
          ) : (
            <>
            <div className="px-5">
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
                className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              {filteredPhysicians.length > 0 && (
                <>
                  <div className="shrink-0 px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700">Physician mapping (1:1)</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Match key: Override → Specialty → Benchmark group</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={doMerge}
                        className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700"
                      >
                        Sync market data
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAutoMap}
                        disabled={!canAutoMap}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg ${
                          canAutoMap
                            ? 'bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700'
                            : 'border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                        title={autoMapDisabledReason ?? (totalSuggestions > 0 ? `${totalSuggestions} suggested mapping(s)` : 'Open to preview or lower confidence for more suggestions')}
                      >
                        <AutoMapIcon className="w-5 h-5 shrink-0" />
                        Auto Map{totalSuggestions > 0 ? ` (${totalSuggestions})` : ''}
                      </button>
                      <HowMappingWorksIcon />
                    </div>
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
                  <div className="app-data-table-pagination shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-t border-slate-200 bg-slate-50/80">
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
                        Showing <span className="font-medium">{Math.min((physicianSafePage - 1) * physicianPageSize + 1, filteredPhysicians.length)}</span>–<span className="font-medium">{Math.min(physicianSafePage * physicianPageSize, filteredPhysicians.length)}</span> of <span className="font-medium">{filteredPhysicians.length}</span>
                      </span>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        Rows per page
                        <select
                          value={physicianPageSize}
                          onChange={(e) => { setPhysicianPageSize(Number(e.target.value)); setPhysicianPage(1); }}
                          className="px-2 py-1 text-sm border border-slate-300 rounded-lg bg-white"
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
                  <div className={`shrink-0 px-5 py-3 border-b border-slate-100 ${filteredPhysicians.length === 0 ? 'flex flex-wrap items-center justify-between gap-3' : ''}`}>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700">APP provider mapping</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isAppsView
                          ? 'Use Auto Map for 1:1, or select a survey specialty or combined group from the dropdown.'
                          : 'Set Override to a market specialty or combined group name'}
                      </p>
                    </div>
                    {filteredPhysicians.length === 0 && (
                      <div className="flex gap-2 items-center">
                        <button
                          type="button"
                          onClick={doMerge}
                          className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700"
                        >
                          Sync market data
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenAutoMap}
                          disabled={!canAutoMap}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg ${
                          canAutoMap
                            ? 'bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700'
                            : 'border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                          title={autoMapDisabledReason ?? (totalSuggestions > 0 ? `${totalSuggestions} suggested mapping(s)` : 'Open to preview or lower confidence for more suggestions')}
                        >
                          <AutoMapIcon className="w-5 h-5 shrink-0" />
                          Auto Map{totalSuggestions > 0 ? ` (${totalSuggestions})` : ''}
                        </button>
                        <HowMappingWorksIcon />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 border-t border-neutral-200/80">
                    <ProviderMatchTable
                      providers={paginatedApps}
                      providerStatuses={providerStatuses}
                      getMarket={getMarket}
                      allTargetsForOverride={allTargetsForOverride}
                      handleOverrideChange={handleOverrideChange}
                    />
                  </div>
                  <div className="app-data-table-pagination shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-t border-slate-200 bg-slate-50/80">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-sm text-slate-600">
                        APP providers — <span className="font-medium text-slate-800">{filteredApps.length}</span> providers
                      </span>
                      {filteredPhysicians.length === 0 && orphanSpecialties.length > 0 && (
                        <span className="text-xs text-slate-400">
                          Unused: {orphanSpecialties.slice(0, 6).join(', ')}{orphanSpecialties.length > 6 ? '…' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="text-sm text-slate-600">
                        Showing <span className="font-medium">{Math.min((appSafePage - 1) * appPageSize + 1, filteredApps.length)}</span>–<span className="font-medium">{Math.min(appSafePage * appPageSize, filteredApps.length)}</span> of <span className="font-medium">{filteredApps.length}</span>
                      </span>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        Rows per page
                        <select
                          value={appPageSize}
                          onChange={(e) => { setAppPageSize(Number(e.target.value)); setAppPage(1); }}
                          className="px-2 py-1 text-sm border border-slate-300 rounded-lg bg-white"
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

          {/* Bulk provider-specialty mapping - only shown in APPs tab */}
          {isAppsView && (
          <div className="shrink-0 border-t border-slate-200">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-sm font-semibold text-slate-800">Bulk apply mapping</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set Market_Specialty_Override for all providers whose Specialty or Benchmark_Group matches the selected values.
              </p>
            </div>
            <BulkMappingApply
              providerSpecialtyOptions={providerSpecialtyOptions}
              allTargetsForOverride={allTargetsForOverride}
              appsForSurvey={appsForSurvey}
              getMatchKey={getMatchKey}
              onApply={(sourceSpecialties, target) => {
                setRecords((prev) => {
                  const sourceSet = new Set(sourceSpecialties);
                  const appIds = new Set(appsForSurvey.map((p) => p.Employee_ID));
                  const updated = prev.map((p) => {
                    if (!appIds.has(p.Employee_ID)) return p;
                    const key = getMatchKey(p);
                    if (!sourceSet.has(key)) return p;
                    return { ...p, Market_Specialty_Override: target };
                  });
                  const mappings = loadSurveySpecialtyMappingSet();
                  const typeToSurvey = loadProviderTypeToSurveyMapping();
                  return mergeMarketIntoProvidersMulti(updated, marketSurveys, mappings, typeToSurvey);
                });
              }}
            />
          </div>
          )}

          {/* APP combined groups - only shown in APPs tab */}
          {isAppsView && (
          <div className="shrink-0 border-t border-slate-200">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-sm font-semibold text-slate-800">APP combined groups</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Blend survey specialties into one benchmark. Add provider specialties that auto-map here (e.g. General Surgery Pediatrics → Surgical APP Specialties), or set Override per provider.
              </p>
            </div>
            <div className="p-4 space-y-4">
              {appCombinedGroups.map((g) => (
                <div key={g.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <input
                  type="text"
                  value={g.combinedGroupName}
                  onChange={(e) => updateCombinedGroup(g.id, { combinedGroupName: e.target.value })}
                  placeholder="Combined group name (e.g. Medical Specialty Combined)"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg min-w-[200px]"
                />
                <button
                  type="button"
                  onClick={() => removeCombinedGroup(g.id)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded"
                  aria-label="Remove"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Survey specialties to blend:</span>
                    {g.surveySpecialties.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                    {s}
                    <button type="button" onClick={() => removeSpecialtyFromGroup(g.id, s)} className="hover:text-red-600" aria-label={`Remove ${s}`}>×</button>
                  </span>
                ))}
                {marketSpecialties.filter((s) => !g.surveySpecialties.includes(s)).length > 0 ? (
                  <SearchableSelect
                    value=""
                    options={marketSpecialties.filter((s) => !g.surveySpecialties.includes(s))}
                    onChange={(v) => v && addSpecialtyToGroup(g.id, v)}
                    emptyOptionLabel="+ Add survey specialty"
                    className="min-w-[160px]"
                  />
                    ) : (
                    <span className="text-xs text-slate-400">All market specialties added</span>
                  )}
                </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Provider specialties that map here:</span>
                    {(g.providerSpecialties ?? []).map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-800 rounded text-xs">
                        {s}
                        <button type="button" onClick={() => removeProviderSpecialtyFromGroup(g.id, s)} className="hover:text-red-600" aria-label={`Remove ${s}`}>×</button>
                      </span>
                    ))}
                    {providerSpecialtyOptions.filter((s) => !(g.providerSpecialties ?? []).includes(s)).length > 0 ? (
                      <SearchableSelect
                        value=""
                        options={providerSpecialtyOptions.filter((s) => !(g.providerSpecialties ?? []).includes(s))}
                        onChange={(v) => v && addProviderSpecialtyToGroup(g.id, v)}
                        emptyOptionLabel="+ Add provider specialty"
                        className="min-w-[160px]"
                      />
                    ) : null}
                    <ProviderSpecialtyCustomAdd groupId={g.id} onAdd={addProviderSpecialtyToGroup} existing={g.providerSpecialties ?? []} />
                  </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addCombinedGroup}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Add combined group
            </button>
          </div>
          <div className="px-5 py-2 border-t border-slate-200 bg-slate-50/50">
            <button type="button" onClick={doMerge} className="text-sm text-indigo-600 hover:text-indigo-800">
              Sync market data
            </button>
          </div>
          </div>
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
