/**
 * Summary bar for Salary Review: base salary change, optional budget vs cycle, TCC delta, percentiles.
 * `summaryTotals.totalIncreaseDollars` is the sum of per-provider (proposed − current) base only;
 * budget % uses the same aggregate when a cycle budget exists.
 * Metrics are one horizontal row (flex-nowrap + overflow-x-auto on narrow screens).
 * Expandable breakdown by dimension (division, department, etc.).
 */

import { useState, type ReactNode } from 'react';
import type { SummaryTotals, SummaryRow } from '../../lib/salary-review-summary';
import { formatCurrencyTwoDecimals } from './review-table-columns';
const BLANK_LABEL = '—';

/** Native tooltips (hover) — plain language; keeps labels short on the card. */
const SUMMARY_HINTS = {
  baseSalaryChange:
    "Adds up each provider's dollar change in base salary (recommended vs. current pay) for everyone in the table right now. Respects filters and search. When a cycle budget exists, the first card shows that total as a percent of budget.",
  tccImpact:
    'Total cash compensation in dollars and/or how the group’s average market percentile moves, using values shown for providers in the current table.',
  avgTccPct:
    'Average market percentile for total cash compensation. The large figure uses recommended values when they exist; the line below compares to the current average when available.',
  avgTccCurrentOnly:
    'Only current (pre-recommendation) TCC percentiles are available for the listed providers—no proposed average yet.',
  avgWrvu:
    'Average productivity (wRVU) market percentile across providers in the current table view.',
  avgPctIncrease:
    'Straight average of each listed provider’s percent change in base salary. Anyone without a current base salary is left out of this average.',
  budgetUse:
    'Share of the cycle budget used by aggregate base pay changes in the current table. Hover for exact dollars. The next card shows the same total as full currency.',
} as const;

const iconCls = 'w-5 h-5 shrink-0';

/** Icons for summary cards (Heroicons outline). */
const SummaryIcons = {
  tcc: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  baseSalary: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  percent: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
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
  wrvu: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  ),
  budget: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

/** Short USD for summary tiles (e.g. $2.4M). */
function formatUsdCompact(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    const s = Number.isInteger(m) ? String(m) : m.toFixed(1).replace(/\.0$/, '');
    return `${sign}$${s}M`;
  }
  if (abs >= 10_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}${formatCurrencyTwoDecimals(abs)}`;
}

export interface SalaryReviewSummaryBarProps {
  summaryTotals: SummaryTotals;
  breakdown: {
    division: SummaryRow[];
    department: SummaryRow[];
    population: SummaryRow[];
    specialty: SummaryRow[];
    planType: SummaryRow[];
  };
  /** When set, shows a budget-usage tile with a compact bar (same math as the former header donut). */
  budgetUsage?: {
    percentOfBudget: number;
    budgetAmount: number;
    isWarning: boolean;
  };
}

/** Metric cards grow evenly across the row width; stretch to one height. */
function SummaryMetricTile({ children }: { children: ReactNode }) {
  return <div className="min-w-[9.5rem] flex-1 basis-0 sm:min-w-[10rem]">{children}</div>;
}

const DIMENSION_TABS: { id: keyof SalaryReviewSummaryBarProps['breakdown']; label: string }[] = [
  { id: 'division', label: 'By Division' },
  { id: 'department', label: 'By Department' },
  { id: 'population', label: 'By Provider Type' },
  { id: 'specialty', label: 'By Specialty' },
  { id: 'planType', label: 'By Plan Type' },
];

/** Card with icon, label, value, optional subline. Use `hint` for hover details (plain language). */
function SummaryCard({
  icon,
  iconBgClassName = 'bg-indigo-100 text-indigo-600',
  label,
  value,
  subline,
  hint,
  valueClassName = 'text-slate-900',
  className = '',
}: {
  icon: ReactNode;
  iconBgClassName?: string;
  label: string;
  value: ReactNode;
  subline?: ReactNode;
  /** Shown as native tooltip on hover */
  hint?: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div
      title={hint}
      className={`flex h-full min-h-0 min-w-0 w-full items-center gap-1.5 rounded-md border border-slate-200/90 bg-white px-2.5 py-2 shadow-sm outline-none ${className}`}
    >
      <div className={`flex shrink-0 items-center justify-center rounded-md p-1 ${iconBgClassName}`}>
        {icon}
      </div>
      <div className="min-h-0 min-w-0 flex-1 text-center">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <div className={`mt-0.5 truncate tabular-nums text-sm font-semibold ${valueClassName}`}>{value}</div>
        {subline != null && <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{subline}</div>}
      </div>
    </div>
  );
}

export function SalaryReviewSummaryBar({ summaryTotals, breakdown, budgetUsage }: SalaryReviewSummaryBarProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownTab, setBreakdownTab] = useState<keyof SalaryReviewSummaryBarProps['breakdown']>('division');

  const totalIncrease = summaryTotals.totalIncreaseDollars;
  const totalCurrentBase = summaryTotals.totalCurrentBase;
  const totalProposedBase = summaryTotals.totalProposedBase;
  const hasBaseSalaryData = totalCurrentBase !== 0 || totalProposedBase !== 0;
  const totalCurrentTcc = summaryTotals.totalCurrentTcc;
  const totalProposedTcc = summaryTotals.totalProposedTcc;
  const tccDelta = totalProposedTcc - totalCurrentTcc;
  const hasTccData = totalCurrentTcc > 0 || totalProposedTcc > 0;
  const avgCurrentPct = summaryTotals.avgCurrentTccPercentile;
  const avgProposedPct = summaryTotals.avgProposedTccPercentile;
  const hasPercentileData =
    (avgCurrentPct != null && Number.isFinite(avgCurrentPct)) ||
    (avgProposedPct != null && Number.isFinite(avgProposedPct));
  const percentileDelta =
    avgCurrentPct != null &&
    avgProposedPct != null &&
    Number.isFinite(avgCurrentPct) &&
    Number.isFinite(avgProposedPct)
      ? avgProposedPct - avgCurrentPct
      : null;
  const hasTccOrPercentile = hasTccData || hasPercentileData;
  const avgPercentIncrease = summaryTotals.avgPercentIncrease;
  const hasAvgPercentIncrease =
    avgPercentIncrease != null && Number.isFinite(avgPercentIncrease);
  const currentBreakdownRows = breakdown[breakdownTab];
  const totalForPercent = summaryTotals.totalIncreaseDollars;

  const avgWrvuPct = summaryTotals.avgWrvuPercentile;
  const hasAvgWrvuPct = avgWrvuPct != null && Number.isFinite(avgWrvuPct);

  const tccPctUsesProposed =
    avgProposedPct != null && Number.isFinite(avgProposedPct);
  const tccPctPrimaryValue = tccPctUsesProposed
    ? avgProposedPct
    : avgCurrentPct != null && Number.isFinite(avgCurrentPct)
      ? avgCurrentPct
      : null;
  const hasAvgTccPercentileCard = tccPctPrimaryValue != null;

  const pctBudget = budgetUsage?.percentOfBudget;
  const showBudgetTile =
    budgetUsage != null &&
    pctBudget != null &&
    Number.isFinite(pctBudget) &&
    Number.isFinite(budgetUsage.budgetAmount) &&
    budgetUsage.budgetAmount > 0;

  return (
    <div className="shrink-0 border-b border-slate-200/90 bg-slate-50/95">
      <div className="flex min-w-0 items-stretch gap-2 px-4 py-4 sm:px-5 md:py-5">
        <div className="flex min-h-[4rem] min-w-0 flex-1 items-stretch gap-2.5 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] sm:overflow-visible">
          {showBudgetTile && budgetUsage && pctBudget != null && (
            <SummaryMetricTile>
              <div
                title={`${SUMMARY_HINTS.budgetUse} Aggregate base change: ${formatCurrencyTwoDecimals(totalIncrease)}. Cycle budget: ${formatCurrencyTwoDecimals(budgetUsage.budgetAmount)}.`}
                className="flex h-full min-h-0 min-w-0 w-full flex-col justify-center gap-1.5 rounded-md border border-slate-200/90 bg-white px-2.5 py-2 shadow-sm outline-none"
              >
                <div className="flex min-h-0 min-w-0 flex-1 items-center gap-1.5">
                  <div className="flex shrink-0 items-center justify-center rounded-md bg-emerald-100 p-1 text-emerald-700">
                    {SummaryIcons.budget}
                  </div>
                  <div className="min-h-0 min-w-0 flex-1 text-center">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Budget use
                    </span>
                    <div
                      className={`mt-0.5 truncate tabular-nums text-sm font-semibold ${
                        pctBudget > 100
                          ? 'text-red-600'
                          : budgetUsage.isWarning
                            ? 'text-amber-600'
                            : 'text-slate-900'
                      }`}
                    >
                      {pctBudget.toFixed(1)}%
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      {pctBudget > 100 ? (
                        <span className="font-medium text-red-600">Over cycle cap</span>
                      ) : budgetUsage.isWarning ? (
                        <span className="font-medium text-amber-700">Near cap</span>
                      ) : pctBudget <= 0 ? (
                        <span>of {formatUsdCompact(budgetUsage.budgetAmount)} · net decrease</span>
                      ) : (
                        <span>of {formatUsdCompact(budgetUsage.budgetAmount)} budget</span>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className="h-1 w-full overflow-hidden rounded-full bg-slate-200/80"
                  aria-hidden
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      pctBudget > 100
                        ? 'bg-red-500/90'
                        : pctBudget <= 0
                          ? 'bg-slate-400/70'
                          : budgetUsage.isWarning
                            ? 'bg-amber-500/90'
                            : 'bg-emerald-600/85'
                    }`}
                    style={{
                      width: pctBudget <= 0 ? '100%' : `${Math.min(100, pctBudget)}%`,
                    }}
                  />
                </div>
              </div>
            </SummaryMetricTile>
          )}

          <SummaryMetricTile>
            <SummaryCard
            icon={SummaryIcons.baseSalary}
            iconBgClassName="bg-violet-100 text-violet-700"
            label="Base salary change"
            hint={SUMMARY_HINTS.baseSalaryChange}
            value={
              hasBaseSalaryData ? (
                <span className="text-slate-900">
                  {totalIncrease > 0 ? '+' : ''}
                  {formatCurrencyTwoDecimals(totalIncrease)}
                </span>
              ) : (
                <span className="font-normal text-slate-400">—</span>
              )
            }
            subline={
              hasBaseSalaryData ? undefined : <span className="text-slate-400">No base data in view</span>
            }
          />
          </SummaryMetricTile>

          {hasTccOrPercentile && (
            <SummaryMetricTile>
            <SummaryCard
              icon={SummaryIcons.tcc}
              iconBgClassName="bg-amber-100 text-amber-700"
              label="TCC impact"
              hint={SUMMARY_HINTS.tccImpact}
              value={
                hasTccData ? (
                  <span
                    className={
                      tccDelta > 0 ? 'text-emerald-600' : tccDelta < 0 ? 'text-slate-600' : 'text-slate-500'
                    }
                  >
                    {tccDelta > 0 ? '+' : ''}
                    {formatCurrencyTwoDecimals(tccDelta)}
                  </span>
                ) : percentileDelta != null ? (
                  <span
                    className={
                      percentileDelta > 0
                        ? 'text-emerald-600'
                        : percentileDelta < 0
                          ? 'text-amber-600'
                          : 'text-slate-500'
                    }
                  >
                    {percentileDelta > 0 ? '+' : ''}
                    {percentileDelta.toFixed(1)} pts
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )
              }
              subline={
                hasTccData && hasPercentileData && percentileDelta != null ? (
                  <span
                    className={
                      percentileDelta > 0
                        ? 'text-emerald-600'
                        : percentileDelta < 0
                          ? 'text-amber-600'
                          : 'text-slate-500'
                    }
                  >
                    Avg percentile {percentileDelta > 0 ? '+' : ''}
                    {percentileDelta.toFixed(1)} pts
                  </span>
                ) : undefined
              }
            />
            </SummaryMetricTile>
          )}

          {hasAvgTccPercentileCard && (
            <SummaryMetricTile>
              <SummaryCard
                icon={SummaryIcons.chartBars}
                iconBgClassName="bg-indigo-100 text-indigo-700"
                label="Avg TCC %ile"
                hint={
                  !tccPctUsesProposed ? SUMMARY_HINTS.avgTccCurrentOnly : SUMMARY_HINTS.avgTccPct
                }
                value={<span className="text-slate-900">{tccPctPrimaryValue!.toFixed(1)}%</span>}
                subline={
                  tccPctUsesProposed &&
                  avgCurrentPct != null &&
                  Number.isFinite(avgCurrentPct) ? (
                    <span className="text-slate-500">Was {avgCurrentPct.toFixed(1)}% avg</span>
                  ) : !tccPctUsesProposed ? (
                    <span className="text-slate-500">Current only</span>
                  ) : undefined
                }
              />
            </SummaryMetricTile>
          )}

          {hasAvgWrvuPct && avgWrvuPct != null && (
            <SummaryMetricTile>
              <SummaryCard
                icon={SummaryIcons.wrvu}
                iconBgClassName="bg-cyan-100 text-cyan-800"
                label="Avg wRVU %ile"
                hint={SUMMARY_HINTS.avgWrvu}
                value={<span className="text-slate-900">{avgWrvuPct.toFixed(1)}%</span>}
              />
            </SummaryMetricTile>
          )}

          {hasAvgPercentIncrease && avgPercentIncrease != null && (
            <SummaryMetricTile>
            <SummaryCard
              icon={SummaryIcons.percent}
              iconBgClassName="bg-teal-100 text-teal-700"
              label="Avg % increase"
              hint={SUMMARY_HINTS.avgPctIncrease}
              value={<span className="text-slate-900">{avgPercentIncrease.toFixed(1)}%</span>}
            />
            </SummaryMetricTile>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowBreakdown((b) => !b)}
          className="flex w-9 shrink-0 items-center justify-center self-stretch rounded-md border border-transparent text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50/95"
          aria-expanded={showBreakdown}
          aria-label={showBreakdown ? 'Hide summary breakdown by division and other views' : 'Show summary breakdown by division and other views'}
          title={showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
        >
          {showBreakdown ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {showBreakdown && (
        <div className="border-t border-slate-200/90 bg-white px-5 py-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {DIMENSION_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setBreakdownTab(id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  breakdownTab === id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                    {DIMENSION_TABS.find((t) => t.id === breakdownTab)?.label.replace('By ', '')}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Providers</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Base change</th>
                  {hasTccData && (
                    <>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Current TCC</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Proposed TCC</th>
                    </>
                  )}
                  {hasPercentileData && (
                    <>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Avg current %ile</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Avg proposed %ile</th>
                    </>
                  )}
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase">% of total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentBreakdownRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        4 + (hasTccData ? 2 : 0) + (hasPercentileData ? 2 : 0)
                      }
                      className="px-3 py-4 text-center text-slate-500"
                    >
                      No data
                    </td>
                  </tr>
                ) : (
                  currentBreakdownRows.map((row) => {
                    const pct =
                      totalForPercent > 0 ? ((row.totalIncreaseDollars / totalForPercent) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={row.key || '__blank__'} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-800">
                          {row.key === '' ? BLANK_LABEL : row.key}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">{row.providerCount}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-800">
                          {formatCurrencyTwoDecimals(row.totalIncreaseDollars)}
                        </td>
                        {hasTccData && (
                          <>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                              {formatCurrencyTwoDecimals(row.totalCurrentTcc)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-800">
                              {formatCurrencyTwoDecimals(row.totalProposedTcc)}
                            </td>
                          </>
                        )}
                        {hasPercentileData && (
                          <>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                              {row.avgCurrentTccPercentile != null && Number.isFinite(row.avgCurrentTccPercentile)
                                ? `${row.avgCurrentTccPercentile.toFixed(1)}%`
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-800">
                              {row.avgProposedTccPercentile != null && Number.isFinite(row.avgProposedTccPercentile)
                                ? `${row.avgProposedTccPercentile.toFixed(1)}%`
                                : '—'}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">{pct}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
