/**
 * Summary bar for Compare Scenarios: Scenario A totals, Scenario B totals, Delta, Budget.
 */

import type { ScenarioRunResult } from '../../types/scenario';
import { formatCurrencyTwoDecimals } from '../review/review-table-columns';

export interface CompareScenariosSummaryProps {
  resultA: ScenarioRunResult | null;
  resultB: ScenarioRunResult | null;
  budgetAmount: number | undefined;
}

const iconCls = 'w-5 h-5 shrink-0';

function SummaryCard({
  icon,
  iconBgClassName,
  label,
  value,
  subline,
}: {
  icon: React.ReactNode;
  iconBgClassName: string;
  label: string;
  value: React.ReactNode;
  subline?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-[110px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-start gap-2">
        <div className={`flex shrink-0 items-center justify-center rounded-md p-1.5 ${iconBgClassName}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
          <div className="mt-1 tabular-nums text-base font-semibold text-slate-900">{value}</div>
          {subline != null && <div className="mt-0.5 text-xs text-slate-500">{subline}</div>}
        </div>
      </div>
    </div>
  );
}

export function CompareScenariosSummary({
  resultA,
  resultB,
  budgetAmount,
}: CompareScenariosSummaryProps) {
  const totalA = resultA?.summary.totalIncreaseDollars ?? 0;
  const totalB = resultB?.summary.totalIncreaseDollars ?? 0;
  const deltaDollars = totalB - totalA;
  const deltaPercent =
    totalA > 0 ? ((deltaDollars / totalA) * 100).toFixed(1) : totalB > 0 ? '—' : '0';
  const percentOfBudgetA =
    budgetAmount != null && budgetAmount > 0 ? ((totalA / budgetAmount) * 100).toFixed(1) : null;
  const percentOfBudgetB =
    budgetAmount != null && budgetAmount > 0 ? ((totalB / budgetAmount) * 100).toFixed(1) : null;

  return (
    <div className="shrink-0 border-b border-slate-200 px-5 py-4">
      <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
      <SummaryCard
        icon={
          <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        iconBgClassName="bg-indigo-100 text-indigo-600"
        label="Scenario A (Current)"
        value={
          resultA ? (
            formatCurrencyTwoDecimals(totalA)
          ) : (
            <span className="text-slate-400 font-normal">—</span>
          )
        }
        subline={
          resultA ? (
            <span>
              {resultA.summary.providerCount} providers · {resultA.summary.zeroedCount} zeroed ·{' '}
              {resultA.summary.manualReviewCount} manual review
            </span>
          ) : undefined
        }
      />
      <SummaryCard
        icon={
          <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        iconBgClassName="bg-sky-100 text-sky-600"
        label="Scenario B (Alternate)"
        value={
          resultB ? (
            formatCurrencyTwoDecimals(totalB)
          ) : (
            <span className="text-slate-400 font-normal">—</span>
          )
        }
        subline={
          resultB ? (
            <span>
              {resultB.summary.providerCount} providers · {resultB.summary.zeroedCount} zeroed ·{' '}
              {resultB.summary.manualReviewCount} manual review
            </span>
          ) : undefined
        }
      />
      <SummaryCard
        icon={
          <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        }
        iconBgClassName="bg-emerald-100 text-emerald-600"
        label="Delta (B − A)"
        value={
          <span
            className={
              deltaDollars > 0
                ? 'text-emerald-600'
                : deltaDollars < 0
                  ? 'text-amber-600'
                  : 'text-slate-600'
            }
          >
            {deltaDollars > 0 ? '+' : ''}
            {formatCurrencyTwoDecimals(deltaDollars)}
          </span>
        }
        subline={resultA && resultB ? `${deltaPercent}% vs Scenario A` : undefined}
      />
      <SummaryCard
        icon={
          <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
        iconBgClassName="bg-slate-100 text-slate-600"
        label="Budget target"
        value={
          budgetAmount != null && Number.isFinite(budgetAmount) ? (
            formatCurrencyTwoDecimals(budgetAmount)
          ) : (
            <span className="text-slate-400 font-normal">No budget set</span>
          )
        }
        subline={
          percentOfBudgetA != null && percentOfBudgetB != null ? (
            <span>
              A: {percentOfBudgetA}% · B: {percentOfBudgetB}%
            </span>
          ) : undefined
        }
      />
      </div>
    </div>
  );
}
