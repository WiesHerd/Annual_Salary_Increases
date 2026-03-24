/**
 * KPI row for Specialty map — same card layout and typography as Salary review summary.
 * Values reflect the current filtered roster on the active survey tab.
 */

import type { ReactNode } from 'react';
import type { ProviderRecord } from '../../types/provider';

type MappingStatus = 'mapped' | 'needs-mapping' | 'override';

const iconCls = 'w-5 h-5 shrink-0';

const Icons = {
  chartBars: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  check: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warn: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  edit: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  grid: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  layers: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7l8-4 8 4M4 7v10l8 4 8-4V7M4 7l8 4 8-4" />
    </svg>
  ),
};

function SummaryMetricTile({ children }: { children: ReactNode }) {
  return <div className="min-w-[9.5rem] flex-1 basis-0 sm:min-w-[10rem]">{children}</div>;
}

function SummaryCard({
  icon,
  iconBgClassName = 'bg-indigo-100 text-indigo-600',
  label,
  value,
  subline,
  hint,
  valueClassName = 'text-slate-900',
}: {
  icon: ReactNode;
  iconBgClassName?: string;
  label: string;
  value: ReactNode;
  subline?: ReactNode;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div
      title={hint}
      className="flex h-full min-h-0 min-w-0 w-full items-center gap-1.5 rounded-md border border-slate-200/90 bg-white px-2.5 py-2 shadow-sm outline-none"
    >
      <div className={`flex shrink-0 items-center justify-center rounded-md p-1 ${iconBgClassName}`}>{icon}</div>
      <div className="min-h-0 min-w-0 flex-1 text-center">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <div className={`mt-0.5 truncate tabular-nums text-sm font-semibold ${valueClassName}`}>{value}</div>
        {subline != null && <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{subline}</div>}
      </div>
    </div>
  );
}

export interface SpecialtyMapSummaryBarProps {
  filteredProviders: ProviderRecord[];
  totalOnSurvey: number;
  providerStatuses: Map<string, { status: MappingStatus; matchedMarket?: string }>;
  marketRowCount: number;
  orphanMarketRowCount: number;
  appBucketCount: number;
  isAppsSurvey: boolean;
}

function statsForProviders(
  providers: ProviderRecord[],
  providerStatuses: Map<string, { status: MappingStatus; matchedMarket?: string }>
) {
  let needsMapping = 0;
  let mapped = 0;
  let override = 0;
  for (const p of providers) {
    const s = providerStatuses.get(p.Employee_ID)?.status ?? 'needs-mapping';
    if (s === 'needs-mapping') needsMapping++;
    else if (s === 'override') override++;
    else mapped++;
  }
  const n = providers.length;
  const resolved = mapped + override;
  const matchRatePct = n > 0 ? (resolved / n) * 100 : 0;
  return { needsMapping, mapped, override, n, resolved, matchRatePct };
}

export function SpecialtyMapSummaryBar({
  filteredProviders,
  totalOnSurvey,
  providerStatuses,
  marketRowCount,
  orphanMarketRowCount,
  appBucketCount,
  isAppsSurvey,
}: SpecialtyMapSummaryBarProps) {
  const { needsMapping, mapped, override, n, resolved, matchRatePct } = statsForProviders(
    filteredProviders,
    providerStatuses
  );

  return (
    <div className="shrink-0 border-b border-slate-200/90 bg-slate-50/95">
      <div className="flex min-w-0 items-stretch gap-2 px-4 py-4 sm:px-5 md:py-5">
        <div className="flex min-h-[4rem] min-w-0 flex-1 items-stretch gap-2.5 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] sm:overflow-visible">
          <SummaryMetricTile>
            <SummaryCard
              icon={Icons.chartBars}
              iconBgClassName="bg-indigo-100 text-indigo-700"
              label="Match rate"
              hint="Share of the visible roster on this survey that resolves to a market row (direct match or override)."
              value={
                <span
                  className={
                    matchRatePct >= 100
                      ? 'text-emerald-600'
                      : matchRatePct <= 0
                        ? 'text-rose-600'
                        : 'text-slate-900'
                  }
                >
                  {n > 0 ? `${matchRatePct.toFixed(1)}%` : '—'}
                </span>
              }
              subline={
                n > 0 ? (
                  <span>
                    {resolved} of {n} matched{n < totalOnSurvey ? ` · ${totalOnSurvey} on survey` : ''}
                  </span>
                ) : (
                  <span className="text-slate-400">No providers in view</span>
                )
              }
            />
          </SummaryMetricTile>

          <SummaryMetricTile>
            <SummaryCard
              icon={Icons.warn}
              iconBgClassName="bg-amber-100 text-amber-700"
              label="Needs mapping"
              hint="Providers in the current table who do not resolve to a market row for this survey."
              value={
                <span className={needsMapping > 0 ? 'text-amber-700' : 'text-slate-500'}>{needsMapping}</span>
              }
              subline={needsMapping > 0 ? <span className="font-medium text-amber-800">Review roster keys</span> : <span>All keys resolve</span>}
            />
          </SummaryMetricTile>

          <SummaryMetricTile>
            <SummaryCard
              icon={Icons.check}
              iconBgClassName="bg-emerald-100 text-emerald-700"
              label="Direct match"
              hint="Matched via specialty or benchmark key without a manual override."
              value={<span className="text-slate-900">{mapped}</span>}
              subline={<span>Auto-resolved rows</span>}
            />
          </SummaryMetricTile>

          <SummaryMetricTile>
            <SummaryCard
              icon={Icons.edit}
              iconBgClassName="bg-violet-100 text-violet-700"
              label="Overrides"
              hint="Providers with Market_Specialty_Override set (still counts as matched when the target exists)."
              value={<span className="text-slate-900">{override}</span>}
              subline={<span>Manual map targets</span>}
            />
          </SummaryMetricTile>

          <SummaryMetricTile>
            <SummaryCard
              icon={Icons.grid}
              iconBgClassName="bg-slate-200 text-slate-700"
              label="Market rows"
              hint="Number of specialty rows loaded for this survey’s market file."
              value={<span className="text-slate-900">{marketRowCount}</span>}
              subline={<span>Survey specialties</span>}
            />
          </SummaryMetricTile>

          <SummaryMetricTile>
            <SummaryCard
              icon={Icons.layers}
              iconBgClassName={
                isAppsSurvey ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200 text-slate-600'
              }
              label={isAppsSurvey ? 'APP buckets' : 'Unused rows'}
              hint={
                isAppsSurvey
                  ? 'Named combined groups saved for APP mapping on this survey (alongside survey rows).'
                  : 'Market survey rows with no roster match on this tab (informational).'
              }
              value={
                <span className={isAppsSurvey ? 'text-slate-900' : orphanMarketRowCount > 0 ? 'text-amber-700' : 'text-slate-500'}>
                  {isAppsSurvey ? appBucketCount : orphanMarketRowCount}
                </span>
              }
              subline={
                isAppsSurvey ? (
                  <span>Named blends</span>
                ) : orphanMarketRowCount > 0 ? (
                  <span>Orphan specialties</span>
                ) : (
                  <span>None</span>
                )
              }
            />
          </SummaryMetricTile>
        </div>
      </div>
    </div>
  );
}
