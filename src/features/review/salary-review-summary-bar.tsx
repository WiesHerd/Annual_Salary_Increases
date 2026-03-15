/**
 * Summary bar for Salary Review: total increase, budget, base salary delta, TCC delta, percentiles.
 * Each metric is shown in a card with icon for clear separation and scannability.
 * Expandable breakdown by dimension (division, department, etc.).
 */

import { useState, type ReactNode } from 'react';
import type { SummaryTotals, SummaryRow } from '../../lib/salary-review-summary';
import { formatCurrencyTwoDecimals } from './review-table-columns';

const BLANK_LABEL = '—';

const iconCls = 'w-5 h-5 shrink-0';

/** Icons for summary cards (Heroicons outline). */
const SummaryIcons = {
  totalIncrease: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  budget: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
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
};

export interface SalaryReviewSummaryBarProps {
  summaryTotals: SummaryTotals;
  /** Budget amount for the selected cycle (undefined if not set). */
  budgetAmount: number | undefined;
  /** Optional warning threshold (e.g. 95 = warn at 95% of budget). */
  budgetWarningThresholdPercent?: number;
  breakdown: {
    division: SummaryRow[];
    department: SummaryRow[];
    population: SummaryRow[];
    specialty: SummaryRow[];
    planType: SummaryRow[];
  };
}

const DIMENSION_TABS: { id: keyof SalaryReviewSummaryBarProps['breakdown']; label: string }[] = [
  { id: 'division', label: 'By Division' },
  { id: 'department', label: 'By Department' },
  { id: 'population', label: 'By Provider Type' },
  { id: 'specialty', label: 'By Specialty' },
  { id: 'planType', label: 'By Plan Type' },
];

/** Card with icon, label, value, optional subline. */
function SummaryCard({
  icon,
  iconBgClassName = 'bg-indigo-100 text-indigo-600',
  label,
  value,
  subline,
  valueClassName = 'text-slate-900',
}: {
  icon: ReactNode;
  iconBgClassName?: string;
  label: string;
  value: ReactNode;
  subline?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-[110px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-start gap-2">
        <div className={`flex shrink-0 items-center justify-center rounded-md p-1.5 ${iconBgClassName}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
          <div className={`mt-1 tabular-nums text-base font-semibold ${valueClassName}`}>{value}</div>
          {subline != null && <div className="mt-0.5 text-xs text-slate-500">{subline}</div>}
        </div>
      </div>
    </div>
  );
}

export function SalaryReviewSummaryBar({
  summaryTotals,
  budgetAmount,
  budgetWarningThresholdPercent,
  breakdown,
}: SalaryReviewSummaryBarProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownTab, setBreakdownTab] = useState<keyof SalaryReviewSummaryBarProps['breakdown']>('division');

  const totalIncrease = summaryTotals.totalIncreaseDollars;
  const totalCurrentBase = summaryTotals.totalCurrentBase;
  const totalProposedBase = summaryTotals.totalProposedBase;
  const baseSalaryDelta = totalProposedBase - totalCurrentBase;
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
  const percentOfBudget =
    budgetAmount != null && Number.isFinite(budgetAmount) && budgetAmount > 0
      ? (totalIncrease / budgetAmount) * 100
      : null;
  const isOverBudget = percentOfBudget != null && percentOfBudget > 100;
  const isWarning =
    budgetWarningThresholdPercent != null &&
    percentOfBudget != null &&
    percentOfBudget >= budgetWarningThresholdPercent &&
    percentOfBudget <= 100;

  const currentBreakdownRows = breakdown[breakdownTab];
  const totalForPercent = summaryTotals.totalIncreaseDollars;

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white">
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
          {/* Budget first: frame for "how much we have" before "what we're spending" */}
          <SummaryCard
            icon={SummaryIcons.budget}
            iconBgClassName="bg-sky-100 text-sky-700"
            label="Budget"
            value={
              budgetAmount != null && Number.isFinite(budgetAmount) ? (
                formatCurrencyTwoDecimals(budgetAmount)
              ) : (
                <span className="text-slate-400 font-normal">No budget set</span>
              )
            }
            subline={
              budgetAmount != null &&
              Number.isFinite(budgetAmount) &&
              percentOfBudget != null ? (
                <span
                  className={
                    isOverBudget ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-600'
                  }
                >
                  {percentOfBudget.toFixed(1)}% used
                </span>
              ) : undefined
            }
          />

          {/* Total increase */}
          <SummaryCard
            icon={SummaryIcons.totalIncrease}
            iconBgClassName="bg-emerald-100 text-emerald-700"
            label="Total increase"
            value={formatCurrencyTwoDecimals(totalIncrease)}
            valueClassName="text-slate-900"
          />

          {/* Base salary: delta only */}
          {hasBaseSalaryData && (
            <SummaryCard
              icon={SummaryIcons.baseSalary}
              iconBgClassName="bg-violet-100 text-violet-700"
              label="Base salary"
              value={
                <span
                  className={
                    baseSalaryDelta > 0
                      ? 'text-emerald-600'
                      : baseSalaryDelta < 0
                        ? 'text-amber-600'
                        : 'text-slate-600'
                  }
                >
                  {baseSalaryDelta > 0 ? '+' : ''}
                  {formatCurrencyTwoDecimals(baseSalaryDelta)}
                </span>
              }
            />
          )}

          {/* TCC impact: $ delta as primary, avg percentile change as subline (one card for "what happened to TCC") */}
          {hasTccOrPercentile && (
            <SummaryCard
              icon={SummaryIcons.tcc}
              iconBgClassName="bg-amber-100 text-amber-700"
              label="TCC impact"
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
          )}

          {/* Avg % increase (salary) */}
          {hasAvgPercentIncrease && avgPercentIncrease != null && (
            <SummaryCard
              icon={SummaryIcons.percent}
              iconBgClassName="bg-teal-100 text-teal-700"
              label="Avg % increase"
              value={<span className="text-slate-900">{avgPercentIncrease.toFixed(1)}%</span>}
            />
          )}

          {/* Breakdown toggle: compact icon-only */}
          <button
            type="button"
            onClick={() => setShowBreakdown((b) => !b)}
            className="shrink-0 self-center rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            aria-expanded={showBreakdown}
            aria-label={showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
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
      </div>

      {showBreakdown && (
        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4">
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
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Total increase</th>
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
