/**
 * Policy library coverage by evaluation stage (the engine pipeline order).
 */

import type { AnnualIncreasePolicy, PolicyStage } from '../types/compensation-policy';
import { POLICY_STAGE_LABELS, POLICY_STAGE_ORDER } from '../types/compensation-policy';

/** Stages most orgs expect before running a cycle; gaps are hints, not blockers. */
export const RECOMMENDED_POLICY_STAGES: PolicyStage[] = [
  'EXCLUSION_GUARDRAIL',
  'GENERAL_MATRIX',
  'CAP_FLOOR',
];

export interface PolicyPipelineStageItem {
  stage: PolicyStage;
  label: string;
  activeCount: number;
  /** True when this stage is commonly expected but has no active policies. */
  suggestedGap: boolean;
}

export function computePolicyPipelineCoverage(policies: AnnualIncreasePolicy[]): PolicyPipelineStageItem[] {
  const active = policies.filter((p) => p.status === 'active');
  const countByStage = new Map<PolicyStage, number>();
  for (const stage of POLICY_STAGE_ORDER) countByStage.set(stage, 0);
  for (const p of active) {
    countByStage.set(p.stage, (countByStage.get(p.stage) ?? 0) + 1);
  }

  return POLICY_STAGE_ORDER.map((stage) => {
    const activeCount = countByStage.get(stage) ?? 0;
    return {
      stage,
      label: POLICY_STAGE_LABELS[stage],
      activeCount,
      suggestedGap: RECOMMENDED_POLICY_STAGES.includes(stage) && activeCount === 0,
    };
  });
}

export function policyPipelineSuggestedGapCount(items: PolicyPipelineStageItem[]): number {
  return items.filter((item) => item.suggestedGap).length;
}
