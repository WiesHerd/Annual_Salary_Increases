/**
 * Policy evaluation stage order and helpers.
 */

import type { PolicyStage } from '../../types/compensation-policy';
import { POLICY_STAGE_ORDER } from '../../types/compensation-policy';

const STAGE_ORDER_MAP: Record<PolicyStage, number> = {
  EXCLUSION_GUARDRAIL: 0,
  CUSTOM_MODEL: 1,
  MODIFIER: 2,
  GENERAL_MATRIX: 3,
  CAP_FLOOR: 4,
};

export function getStageOrder(stage: PolicyStage): number {
  return STAGE_ORDER_MAP[stage] ?? 99;
}

export function sortPoliciesByStageAndPriority<T extends { stage: PolicyStage; priority: number }>(
  policies: T[]
): T[] {
  return [...policies].sort((a, b) => {
    const stageA = getStageOrder(a.stage);
    const stageB = getStageOrder(b.stage);
    if (stageA !== stageB) return stageA - stageB;
    return a.priority - b.priority;
  });
}

export { POLICY_STAGE_ORDER };
