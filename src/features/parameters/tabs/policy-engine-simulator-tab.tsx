/**
 * Policy engine simulator: run evaluation on current records and show impact.
 * Styled to match the Salary Review screen for consistency.
 */

import { useMemo, useState } from 'react';
import type { ProviderRecord } from '../../../types/provider';
import type { MarketResolver } from '../../../types/market-survey-config';
import type { useParametersState } from '../../../hooks/use-parameters-state';
import type { usePolicyEngineState } from '../../../hooks/use-policy-engine-state';
import { evaluatePolicyForProvider } from '../../../lib/policy-engine/evaluator';
import type { PolicyEvaluationContext } from '../../../lib/policy-engine/evaluator';
import type { PolicyEvaluationResult } from '../../../types/compensation-policy';
import { formatCurrencyTwoDecimals } from '../../review/review-table-columns';

const iconCls = 'w-5 h-5 shrink-0';

const SummaryIcons = {
  providers: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  totalIncrease: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  zeroed: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  manualReview: (
    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
};

function SimulatorRow({
  record,
  result,
}: {
  record: ProviderRecord;
  result: PolicyEvaluationResult;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasExplanation = result.explanation && result.explanation.length > 0;
  return (
    <>
      <tr className="group transition-colors hover:bg-indigo-50/30">
        <td className="px-2 py-1.5 text-sm text-slate-800">{record.Provider_Name ?? record.Employee_ID}</td>
        <td className="px-2 py-1.5 text-sm text-slate-800 text-right tabular-nums">{result.finalRecommendedIncreasePercent.toFixed(2)}%</td>
        <td className="px-2 py-1.5 text-sm text-slate-600">{result.finalPolicySource ?? '—'}</td>
        <td className="px-2 py-1.5 text-sm text-slate-600">{result.tierAssigned ?? '—'}</td>
        <td className="px-2 py-1.5 text-sm text-slate-600">{result.manualReview ? 'Yes' : '—'}</td>
        <td className="px-2 py-1.5">
          {hasExplanation && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
              title="Show policy explanation"
            >
              {expanded ? '−' : '⋯'}
            </button>
          )}
        </td>
      </tr>
      {expanded && hasExplanation && (
        <tr className="bg-slate-50/80">
          <td colSpan={6} className="px-2 py-1.5 text-slate-600 text-xs">
            <div className="space-y-1">
              {result.explanation!.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface PolicyEngineSimulatorTabProps {
  policyState: ReturnType<typeof usePolicyEngineState>;
  params: ReturnType<typeof useParametersState>;
  records: ProviderRecord[];
  marketResolver: MarketResolver;
  /** ISO date for policy effective date checks (from selected cycle). */
  asOfDate?: string;
}

export function PolicyEngineSimulatorTab({
  policyState,
  params,
  records,
  marketResolver,
  asOfDate,
}: PolicyEngineSimulatorTabProps) {
  const [limit, setLimit] = useState(50);

  const context = useMemo(
    (): PolicyEvaluationContext => ({
      policies: policyState.policies,
      customModels: policyState.customModels,
      tierTables: policyState.tierTables,
      meritMatrixRows: params.meritMatrix,
      asOfDate,
    }),
    [policyState.policies, policyState.customModels, policyState.tierTables, params.meritMatrix, asOfDate]
  );

  const results = useMemo(() => {
    const list: { record: ProviderRecord; result: ReturnType<typeof evaluatePolicyForProvider> }[] = [];
    const slice = records.slice(0, limit);
    for (const r of slice) {
      const matchKey = (r.Market_Specialty_Override ?? r.Specialty ?? r.Benchmark_Group ?? '').trim();
      const marketRow = matchKey ? marketResolver(r, matchKey) : undefined;
      const result = evaluatePolicyForProvider(r, { ...context, marketRow });
      list.push({ record: r, result });
    }
    return list;
  }, [records, limit, context, marketResolver]);

  const summary = useMemo(() => {
    let totalCurrent = 0;
    let totalProposed = 0;
    let zeroed = 0;
    let manualReview = 0;
    for (const { record, result } of results) {
      const base = record.Current_Base_Salary ?? 0;
      const increaseAmt = (base * result.finalRecommendedIncreasePercent) / 100;
      totalCurrent += base;
      totalProposed += base + increaseAmt;
      if (result.finalRecommendedIncreasePercent === 0) zeroed++;
      if (result.manualReview) manualReview++;
    }
    return {
      count: results.length,
      totalCurrent,
      totalProposed,
      totalIncrease: totalProposed - totalCurrent,
      zeroed,
      manualReview,
    };
  }, [results]);

  if (records.length === 0) {
    return (
      <div className="flex flex-col min-w-0">
        <div className="min-w-0 flex flex-col border border-indigo-100 rounded-2xl bg-white p-10 text-center shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07)]">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Policy impact simulator</h2>
          <p className="text-slate-600 mb-4">No provider records yet. Import provider data from the Import data screen first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0">
      <div className="min-w-0 flex flex-col border border-indigo-100 rounded-2xl bg-white shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07)]">
        {/* Header — matches Salary Review */}
        <div className="shrink-0 px-5 pt-4 pb-2 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Policy impact simulator</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Run the current policy set on a slice of provider records. Shows recommended increase %, manual review flags, and budget impact.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Step 1: choose how many providers to include. Step 2: adjust policies in the Policy library. Step 3: return
              here and rerun to see the impact.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Max providers:
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(Math.max(1, Math.min(records.length, Number(e.target.value) || 50)))}
                className="w-20 px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </label>
          </div>
        </div>

        {/* Summary bar — matches SalaryReviewSummaryBar card style */}
        <div className="shrink-0 border-b border-slate-200 bg-white">
          <div className="px-5 py-4">
            <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
              <div className="flex min-w-[110px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="flex shrink-0 items-center justify-center rounded-md p-1.5 bg-indigo-100 text-indigo-600">
                    {SummaryIcons.providers}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Providers</span>
                    <div className="mt-1 tabular-nums text-base font-semibold text-slate-900">{summary.count}</div>
                  </div>
                </div>
              </div>
              <div className="flex min-w-[110px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="flex shrink-0 items-center justify-center rounded-md p-1.5 bg-emerald-100 text-emerald-700">
                    {SummaryIcons.totalIncrease}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total increase</span>
                    <div className="mt-1 tabular-nums text-base font-semibold text-slate-900">
                      {formatCurrencyTwoDecimals(summary.totalIncrease ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex min-w-[110px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="flex shrink-0 items-center justify-center rounded-md p-1.5 bg-amber-100 text-amber-700">
                    {SummaryIcons.zeroed}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Zeroed (0%)</span>
                    <div className="mt-1 tabular-nums text-base font-semibold text-slate-900">{summary.zeroed}</div>
                  </div>
                </div>
              </div>
              <div className="flex min-w-[110px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="flex shrink-0 items-center justify-center rounded-md p-1.5 bg-teal-100 text-teal-700">
                    {SummaryIcons.manualReview}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Manual review</span>
                    <div className="mt-1 tabular-nums text-base font-semibold text-slate-900">{summary.manualReview}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table — matches Salary Review table styling */}
        <div className="min-w-0 overflow-auto border-t border-neutral-200/80 max-h-[calc(100vh-16rem)]">
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 z-20 bg-neutral-50 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
              <tr className="bg-neutral-50">
                <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Provider</th>
                <th className="px-2 py-3 text-right text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Recommended %</th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Source</th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Tier</th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Manual review</th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide w-10" title="Policy explanation" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {results.map(({ record, result }) => (
                <SimulatorRow key={record.Employee_ID} record={record} result={result} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer — matches Salary Review pagination bar styling */}
        <div className="shrink-0 border-t border-slate-200">
          <div className="px-4 py-2.5 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-600">
              Showing <span className="font-medium text-slate-800">1</span>–<span className="font-medium text-slate-800">{results.length}</span> of{' '}
              <span className="font-medium text-slate-800">{records.length}</span> provider{records.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
