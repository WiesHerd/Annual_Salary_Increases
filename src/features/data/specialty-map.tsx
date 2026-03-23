/**
 * Specialty map: after Parameters assign each Provider_Type to a market survey, align
 * provider benchmark keys to market rows or APP combined groups. Per-survey tabs;
 * direct 1:1 match vs APP sections; Auto Map and status badges.
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
import { getProvidersForSpecialtyMapTab, resolveSpecialtyMapMarketSurveyId } from '../../lib/specialty-map-cohort';
import {
  getMatchKey,
  suggestPhysicianMappings,
  suggestAppGroupMappings,
  partitionProvidersByMappingMode,
} from '../../lib/specialty-auto-map';
import type { PhysicianMappingSuggestion, AppGroupMappingSuggestion } from '../../lib/specialty-auto-map';
import { SearchableSelect, type SearchableSelectOptionGroup } from '../../components/searchable-select';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { standardDonutPieSeriesBase } from '../../lib/echarts-donut-style';
import {
  type SpecialtyMapFilters,
  DEFAULT_SPECIALTY_MAP_FILTERS,
  applySpecialtyMapFilters,
  deriveSpecialtyMapFilterOptions,
} from '../../lib/specialty-map-filters';
import { InfoIconTip } from '../../components/info-icon-tip';
import { SpecialtyMapFilterBar } from './specialty-map-filter-bar';
import { AppCombinedGroupsBulkPanel } from './app-combined-groups-bulk-panel';

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
  /** APP survey: column lists single survey rows plus named benchmark buckets from the bucket builder. */
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
              {appMapColumn ? 'Map to market / bucket' : 'Map to survey specialty'}
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
                  <SearchableSelect
                    value={p.Market_Specialty_Override ?? ''}
                    {...(appMapColumn && mapOptionGroups && mapOptionGroups.length > 0
                      ? { optionGroups: mapOptionGroups }
                      : { options: allTargetsForOverride })}
                    onChange={(v) => handleOverrideChange(p.Employee_ID, v === '' ? null : v)}
                    emptyOptionLabel={
                      appMapColumn
                        ? 'Survey row or bucket name…'
                        : 'Search and select survey specialty…'
                    }
                    aria-label={
                      appMapColumn
                        ? 'Select market survey row or benchmark bucket for this provider'
                        : 'Select survey specialty to map this provider'
                    }
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
  size = 100,
}: {
  matchedCount: number;
  unmatchedCount: number;
  /** Pixel width/height of the chart area. */
  size?: number;
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
    <div className="relative shrink-0" style={{ width: size, height: size }}>
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
  mapOptionGroups,
  appsForSurvey,
  getMatchKey,
  onApply,
}: {
  providerSpecialtyOptions: string[];
  allTargetsForOverride: string[];
  mapOptionGroups?: SearchableSelectOptionGroup[];
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
    <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-slate-800">Bulk overrides</span>
        <InfoIconTip aria-label="About bulk overrides">
          <p>
            Sets <strong className="text-slate-800">Market_Specialty_Override</strong> for every APP on this survey whose match key
            (override, then specialty, then benchmark group) is one of the labels you tick.
          </p>
          <p>Use after buckets exist so targets include combined group names.</p>
        </InfoIconTip>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div className="min-w-0">
          <span className="sr-only">Roster keys to match</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 max-h-[7.5rem] overflow-y-auto p-2 border border-slate-200 rounded-lg bg-white text-xs">
            {providerSpecialtyOptions.length === 0 ? (
              <span className="text-slate-400 col-span-full py-1">No keys on roster</span>
            ) : (
              providerSpecialtyOptions.map((s) => (
                <label key={s} className="inline-flex items-center gap-1.5 cursor-pointer min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedSources.has(s)}
                    onChange={() => handleToggleSource(s)}
                    className="rounded border-slate-300 shrink-0"
                  />
                  <span className="text-slate-700 truncate" title={s}>
                    {s}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
        <div className="min-w-0 flex flex-col gap-1">
          <SearchableSelect
            value={target}
            {...(mapOptionGroups && mapOptionGroups.length > 0
              ? { optionGroups: mapOptionGroups }
              : { options: allTargetsForOverride })}
            onChange={(v) => setTarget(v ?? '')}
            emptyOptionLabel="Map to…"
            className="w-full min-w-0"
          />
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={selectedSources.size === 0 || !target.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap justify-self-start lg:justify-self-end"
        >
          Apply ({matchCount})
        </button>
      </div>
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
            <p><strong className="text-slate-800">Direct match:</strong> Match roster keys to market rows. Use Override when labels differ.</p>
            <p><strong className="text-slate-800">APP:</strong> Use <strong>Map to market / bucket</strong> for each person. Expand <strong>Benchmark buckets</strong> below the table to name blends—those names appear in the same list as single survey rows.</p>
          </div>
        </>
      )}
    </div>
  );
}

/** Collapsible bucket builder on the APP tab; bucket names are selectable in each row’s map column. */
function AppBenchmarkBucketsSection({
  marketSpecialties,
  providerSpecialtyOptions,
  groups,
  setGroups,
  onSync,
}: {
  marketSpecialties: string[];
  providerSpecialtyOptions: string[];
  groups: AppCombinedGroupRow[];
  setGroups: (updater: AppCombinedGroupRow[] | ((prev: AppCombinedGroupRow[]) => AppCombinedGroupRow[])) => void;
  onSync: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="shrink-0 border-t border-slate-200 bg-slate-50/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-slate-100/80 border-b border-slate-200/60 bg-slate-50/50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-neutral-400 text-[10px] shrink-0" aria-hidden>
            {open ? '▼' : '▶'}
          </span>
          <span className="text-sm font-semibold text-slate-800">Benchmark buckets</span>
          <InfoIconTip aria-label="About benchmark buckets" align="left">
            <p>
              Create named buckets that blend one or more survey rows. Those names show up in{' '}
              <strong className="text-slate-800">Map to market / bucket</strong> next to each provider—same list as individual survey specialties.
            </p>
            <p className="text-slate-500">Optional: assign roster keys to buckets here in bulk; you can still pick a bucket per person in the table.</p>
          </InfoIconTip>
        </div>
        {groups.length > 0 && (
          <span className="text-xs text-slate-500 shrink-0 tabular-nums">
            {groups.length} bucket{groups.length === 1 ? '' : 's'}
          </span>
        )}
      </button>
      {open && (
        <>
          <AppCombinedGroupsBulkPanel
            marketSpecialties={marketSpecialties}
            providerSpecialtyOptions={providerSpecialtyOptions}
            groups={groups}
            setGroups={setGroups}
          />
          <div className="px-5 py-2 border-t border-slate-200 bg-slate-50/50">
            <button type="button" onClick={onSync} className="text-sm text-indigo-600 hover:text-indigo-800">
              Sync market data
            </button>
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
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('physicians');
  const [surveyMappings, setSurveyMappingsState] = useState(loadSurveySpecialtyMappingSet);
  const [autoMapModalOpen, setAutoMapModalOpen] = useState(false);
  const [autoMapSelectedIds, setAutoMapSelectedIds] = useState<Set<string>>(new Set());
  const [autoMapMinConfidence, setAutoMapMinConfidence] = useState(0.85);
  const [filters, setFilters] = useState<SpecialtyMapFilters>(() => DEFAULT_SPECIALTY_MAP_FILTERS);
  const [physicianPage, setPhysicianPage] = useState(1);
  const [physicianPageSize, setPhysicianPageSize] = useState(25);
  const [appPage, setAppPage] = useState(1);
  const [appPageSize, setAppPageSize] = useState(25);
  const [mapViewMode, setMapViewMode] = useState<'table' | 'chart'>('table');

  const PAGE_SIZES = [10, 25, 50, 100] as const;

  useEffect(() => {
    setSurveyMappingsState(loadSurveySpecialtyMappingSet());
  }, []);

  const surveyIds = useMemo(() => {
    const fromData = Object.keys(marketSurveys);
    const fromLabels = Object.keys(SURVEY_LABELS);
    return [...new Set([...fromLabels, ...fromData])];
  }, [marketSurveys]);

  /** Only show tabs for surveys that are in use: have market data or at least one provider type mapped. */
  const surveyIdsInUse = useMemo(() => {
    const typeToSurvey = loadProviderTypeToSurveyMapping();
    const mappedSurveyIds = new Set(Object.values(typeToSurvey));
    return surveyIds.filter((id) => {
      if (id === 'apps') {
        return (marketSurveys.apps?.length ?? 0) > 0 || mappedSurveyIds.has('apps');
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

  const effectiveSurveyId = resolveSpecialtyMapMarketSurveyId(selectedSurveyId);
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

  /** Sectioned targets for APP-style map column: survey file rows vs named benchmark blends. */
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
      { heading: 'Benchmark buckets', options: buckets },
    ].filter((g) => g.options.length > 0);
  }, [marketData, appCombinedGroups]);

  const providersForSurvey = useMemo(() => {
    const typeToSurvey = loadProviderTypeToSurveyMapping();
    return getProvidersForSpecialtyMapTab(records, selectedSurveyId, typeToSurvey);
  }, [records, selectedSurveyId]);

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
  const surveyLabel = getSurveyLabel(resolveSpecialtyMapMarketSurveyId(selectedSurveyId), surveyMetadata);

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
        <div className="shrink-0 border-b border-slate-200 px-5 pb-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
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
                      On <strong>APP</strong>, use <strong>Map to market / bucket</strong> and expand{' '}
                      <strong>Benchmark buckets</strong> under the table to define named blends.
                    </p>
                    <p className="mt-2 text-slate-500">
                      Sync market data when done so Salary review uses the same percentiles.
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
                  {surveyIdsInUse.map((id, idx) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedSurveyId(id)}
                      className={`app-segmented-segment shrink-0 ${idx === 0 ? 'rounded-l-full' : ''} ${
                        idx === surveyIdsInUse.length - 1 ? 'rounded-r-full' : ''
                      } ${selectedSurveyId === id ? 'app-segmented-segment-active' : ''}`}
                    >
                      {getSurveyLabel(id, surveyMetadata)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="app-segmented-track w-fit">
                {(['table', 'chart'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setMapViewMode(mode)}
                    className={`app-segmented-segment ${mode === 'table' ? 'rounded-l-full' : 'rounded-r-full'} ${
                      mapViewMode === mode ? 'app-segmented-segment-active' : ''
                    }`}
                  >
                    {mode === 'table' ? 'Table' : 'Chart'}
                  </button>
                ))}
              </div>
              {providersForSurvey.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={doMerge}
                    className="app-btn-secondary inline-flex items-center gap-1.5"
                  >
                    Sync market data
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAutoMap}
                    disabled={!canAutoMap}
                    className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full border transition-colors ${
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
              <SetupChecklist
                recordsCount={records.length}
                hasMarketData={Object.values(marketSurveys).some((rows) => rows.length > 0)}
                providerTypeMappingComplete={Object.keys(loadProviderTypeToSurveyMapping()).length > 0}
                allMapped={unmatchedCount === 0 && providersForSurvey.length > 0}
              />
              <HowMappingWorksIcon />
            </div>
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          {providersForSurvey.length === 0 ? (
            <>
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-slate-600 font-medium">
                {isAppsView
                  ? `No APP providers are mapped to the ${surveyLabel} survey.`
                  : `No providers map to ${surveyLabel}.`}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {isAppsView
                  ? 'Assign NP, PA, APP, and similar types to the APP market survey in Parameters (not the Physicians survey unless that is intentional). You can still expand Benchmark buckets below to set up blends before the roster appears.'
                  : 'Configure Provider type → Market survey in Parameters so each role uses this tab’s market file.'}
              </p>
              {onOpenProviderTypeSurvey && (
                <button
                  type="button"
                  onClick={onOpenProviderTypeSurvey}
                  className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Provider type → Market survey
                </button>
              )}
            </div>
            {isAppsView && (
              <AppBenchmarkBucketsSection
                marketSpecialties={marketSpecialties}
                providerSpecialtyOptions={providerSpecialtyOptions}
                groups={appCombinedGroups}
                setGroups={setAppCombinedGroups}
                onSync={doMerge}
              />
            )}
            </>
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
          {mapViewMode === 'chart' ? (
            <div className="border-t border-neutral-200/80">
              <div className="px-5 py-8 flex flex-col items-center justify-center gap-4">
                {filteredTotalCount === 0 && (
                  <p className="text-sm text-amber-800 text-center max-w-md">
                    No providers match your filters. The chart reflects the full survey cohort; switch to Table or clear filters to edit rows.
                  </p>
                )}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
                  <MappingDonutChart size={168} matchedCount={matchedCount} unmatchedCount={unmatchedCount} />
                  <div className="text-sm text-slate-600 space-y-2 text-center sm:text-left">
                    <p>
                      <span className="font-semibold text-emerald-700 tabular-nums text-lg">{matchedCount}</span>
                      <span className="ml-2">matched to market</span>
                    </p>
                    {unmatchedCount > 0 && (
                      <p>
                        <span className="font-semibold text-amber-700 tabular-nums text-lg">{unmatchedCount}</span>
                        <span className="ml-2">need mapping</span>
                      </p>
                    )}
                    <p className="text-xs text-slate-500 pt-1">
                      {surveyLabel} · {marketData.length} market rows
                      {orphanSpecialties.length > 0 ? ` · ${orphanSpecialties.length} unused row(s)` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : filteredTotalCount === 0 ? (
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
                        Use <strong className="text-slate-800">Map to market / bucket</strong> for each person—options include every survey row plus any named buckets you add under{' '}
                        <strong className="text-slate-800">Benchmark buckets</strong> below.
                      </p>
                      <p className="text-slate-500">Auto Map suggests matches once buckets exist or labels align to survey rows.</p>
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
                      {filteredPhysicians.length === 0 && orphanSpecialties.length > 0 && (
                        <span className="text-xs text-slate-400">
                          Unused: {orphanSpecialties.slice(0, 6).join(', ')}{orphanSpecialties.length > 6 ? '…' : ''}
                        </span>
                      )}
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
          {isAppsView && (
            <AppBenchmarkBucketsSection
              marketSpecialties={marketSpecialties}
              providerSpecialtyOptions={providerSpecialtyOptions}
              groups={appCombinedGroups}
              setGroups={setAppCombinedGroups}
              onSync={doMerge}
            />
          )}
          {isAppsView && (
            <BulkMappingApply
              providerSpecialtyOptions={providerSpecialtyOptions}
              allTargetsForOverride={allTargetsForOverride}
              mapOptionGroups={appMapTargetGroups}
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
