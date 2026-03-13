/**
 * Policy engine dashboard: summary of active policies, custom models, and pipeline.
 */

import { useMemo } from 'react';
import type { useParametersState } from '../../../hooks/use-parameters-state';
import type { usePolicyEngineState } from '../../../hooks/use-policy-engine-state';
import { POLICY_STAGE_LABELS } from '../../../types/compensation-policy';
import type { PolicyStage } from '../../../types/compensation-policy';
import { sortPoliciesByStageAndPriority } from '../../../lib/policy-engine/stages';

interface PolicyEngineDashboardTabProps {
  meritMatrix: ReturnType<typeof useParametersState>['meritMatrix'];
  policyState: ReturnType<typeof usePolicyEngineState>;
  onStartCreatePolicy?: () => void;
}

function hasManualReviewAction(p: { actions: { type: string }[] }): boolean {
  return p.actions.some(
    (a) => a.type === 'FLAG_MANUAL_REVIEW' || a.type === 'EXCLUDE_FROM_STANDARD_PROCESS'
  );
}

export function PolicyEngineDashboardTab({ meritMatrix, policyState, onStartCreatePolicy }: PolicyEngineDashboardTabProps) {
  const { policies, customModels, tierTables } = policyState;
  const activePolicies = policies.filter((p) => p.status === 'active');
  const activeModels = customModels.filter((m) => m.status === 'active');
  const byStage = activePolicies.reduce(
    (acc, p) => {
      acc[p.stage] = (acc[p.stage] ?? 0) + 1;
      return acc;
    },
    {} as Record<PolicyStage, number>
  );
  const manualReviewCount = activePolicies.filter(hasManualReviewAction).length;
  const guardrailsCount = byStage['EXCLUSION_GUARDRAIL'] ?? 0;
  const modifiersCount = byStage['MODIFIER'] ?? 0;

  const pipelineOrder = useMemo(() => {
    const sorted = sortPoliciesByStageAndPriority(activePolicies);
    const byStage: Record<PolicyStage, { name: string; priority: number }[]> = {
      EXCLUSION_GUARDRAIL: [],
      CUSTOM_MODEL: [],
      MODIFIER: [],
      GENERAL_MATRIX: [],
      CAP_FLOOR: [],
    };
    for (const p of sorted) {
      byStage[p.stage].push({ name: p.name, priority: p.priority });
    }
    return byStage;
  }, [activePolicies]);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Compensation Policy Engine</h3>
          <p className="text-sm text-slate-600 mt-1">
            Summary of how salary increases are currently determined. The general merit matrix is the default baseline when no custom model applies.
          </p>
        </div>
        {onStartCreatePolicy && (
          <button
            type="button"
            onClick={onStartCreatePolicy}
            className="shrink-0 px-4 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          >
            Create Policy
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="text-2xl font-semibold text-slate-800">{activePolicies.length}</div>
          <div className="text-sm text-slate-600">Active policies</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="text-2xl font-semibold text-slate-800">{activeModels.length}</div>
          <div className="text-sm text-slate-600">Custom models</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="text-2xl font-semibold text-slate-800">{meritMatrix.length}</div>
          <div className="text-sm text-slate-600">General merit matrix</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="text-2xl font-semibold text-slate-800">{guardrailsCount}</div>
          <div className="text-sm text-slate-600">Guardrails</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="text-2xl font-semibold text-slate-800">{modifiersCount}</div>
          <div className="text-sm text-slate-600">Modifiers</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="text-2xl font-semibold text-slate-800">{manualReviewCount}</div>
          <div className="text-sm text-slate-600">Manual review rules</div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Evaluation pipeline (order of execution)</h4>
        <p className="text-xs text-slate-500 mt-1">Policies run in this order: stage first, then priority (lower number = higher priority). Guardrails can stop processing for a provider.</p>
        <ul className="mt-3 space-y-3">
          {(['EXCLUSION_GUARDRAIL', 'CUSTOM_MODEL', 'MODIFIER', 'GENERAL_MATRIX', 'CAP_FLOOR'] as const).map((stage) => {
            const list = pipelineOrder[stage];
            return (
              <li key={stage} className="flex flex-col gap-1">
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-48 text-slate-600 font-medium">{POLICY_STAGE_LABELS[stage]}</span>
                  <span className="text-slate-500 text-xs">{list.length} polic{list.length === 1 ? 'y' : 'ies'}</span>
                </div>
                {list.length > 0 && (
                  <ul className="ml-4 pl-2 border-l-2 border-slate-200 space-y-0.5 text-sm text-slate-700">
                    {list.map((item, i) => (
                      <li key={i}>
                        {item.name}
                        <span className="text-slate-400 text-xs ml-1">(priority {item.priority})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Tier tables</h4>
        <p className="text-sm text-slate-600 mt-1">{tierTables.length} tier table(s) available for custom models.</p>
      </div>
    </div>
  );
}
