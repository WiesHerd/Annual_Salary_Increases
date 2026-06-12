/**
 * Policy engine evaluator: run staged evaluation for one provider and return result + trace.
 */

import type { ProviderRecord } from '../../types/provider';
import type { MarketRow } from '../../types/market';
import type { MeritMatrixRow } from '../../types/merit-matrix-row';
import type {
  AnnualIncreasePolicy,
  CustomCompensationModel,
  PolicyEvaluationResult,
  MatchedPolicyInfo,
} from '../../types/compensation-policy';
import type { TierTable } from '../../types/tier-table';
import { buildFactsFromRecord } from './facts';
import { matchesTargetScope } from './targeting';
import { evaluateConditions } from './conditions';
import { sortPoliciesByStageAndPriority } from './stages';
import { resolveGeneralMatrixIncrease } from './matrix-resolver';
import { resolveCustomModel, resolvePolicyModelConfig } from './custom-model-resolver';

export interface PolicyEvaluationContext {
  policies: AnnualIncreasePolicy[];
  customModels: CustomCompensationModel[];
  tierTables: TierTable[];
  meritMatrixRows: MeritMatrixRow[];
  marketRow?: MarketRow;
  /** ISO date (YYYY-MM-DD) for policy effective date checks. Uses today if omitted. */
  asOfDate?: string;
}

/** Active = status is active. Date gating is by merit cycle only; per-policy effective dates are not used. */
function isPolicyActive(p: AnnualIncreasePolicy): boolean {
  return p.status === 'active';
}

interface PolicyApplyState {
  increasePercent: number;
  fixedIncreaseDollars: number | undefined;
  lumpSumDollars: number;
  capDollars: number | undefined;
  floorDollars: number | undefined;
  manualReview: boolean;
  explanation: string[];
  reasonCodes: string[];
  policyLabels: string[];
}

function newPolicyApplyState(
  increasePercent: number,
  manualReview: boolean,
  explanation: string[]
): PolicyApplyState {
  return {
    increasePercent,
    fixedIncreaseDollars: undefined,
    lumpSumDollars: 0,
    capDollars: undefined,
    floorDollars: undefined,
    manualReview,
    explanation,
    reasonCodes: [],
    policyLabels: [],
  };
}

function applyPolicyActions(
  actions: AnnualIncreasePolicy['actions'],
  state: PolicyApplyState,
  policyName: string
): void {
  for (const a of actions) {
    switch (a.type) {
      case 'ZERO_OUT_INCREASE':
        state.increasePercent = 0;
        state.fixedIncreaseDollars = 0;
        state.lumpSumDollars = 0;
        state.explanation.push(`${policyName}: increase set to 0%`);
        break;
      case 'SET_BASE_INCREASE_PERCENT':
        if (a.value != null) {
          state.increasePercent = a.value;
          state.fixedIncreaseDollars = undefined;
          state.explanation.push(`${policyName}: base set to ${a.value}%`);
        }
        break;
      case 'ADD_INCREASE_PERCENT':
        if (a.value != null) {
          state.increasePercent += a.value;
          state.explanation.push(`${policyName}: added ${a.value}%`);
        }
        break;
      case 'ADD_INCREASE_DOLLARS':
        if (a.value != null) {
          state.lumpSumDollars += a.value;
          state.explanation.push(`${policyName}: added $${a.value.toLocaleString()} lump-sum`);
        }
        break;
      case 'SET_INCREASE_DOLLARS':
        if (a.value != null) {
          state.fixedIncreaseDollars = a.value;
          state.explanation.push(`${policyName}: set increase to $${a.value.toLocaleString()}`);
        }
        break;
      case 'CAP_INCREASE_PERCENT':
        if (a.value != null && state.increasePercent > a.value) {
          state.increasePercent = a.value;
          state.explanation.push(`${policyName}: capped at ${a.value}%`);
        }
        break;
      case 'CAP_INCREASE_DOLLARS':
        if (a.value != null) {
          state.capDollars =
            state.capDollars == null ? a.value : Math.min(state.capDollars, a.value);
          state.explanation.push(`${policyName}: cap at $${a.value.toLocaleString()}`);
        }
        break;
      case 'FLOOR_INCREASE_PERCENT':
        if (a.value != null && state.increasePercent < a.value) {
          state.increasePercent = a.value;
          state.explanation.push(`${policyName}: floored at ${a.value}%`);
        }
        break;
      case 'FLOOR_INCREASE_DOLLARS':
        if (a.value != null) {
          state.floorDollars =
            state.floorDollars == null ? a.value : Math.max(state.floorDollars, a.value);
          state.explanation.push(`${policyName}: floor at $${a.value.toLocaleString()}`);
        }
        break;
      case 'FORCE_INCREASE_PERCENT':
        if (a.value != null) {
          state.increasePercent = a.value;
          state.fixedIncreaseDollars = undefined;
          state.explanation.push(`${policyName}: forced to ${a.value}%`);
        }
        break;
      case 'FORCE_INCREASE_DOLLARS':
        if (a.value != null) {
          state.fixedIncreaseDollars = a.value;
          state.explanation.push(`${policyName}: forced to $${a.value.toLocaleString()}`);
        }
        break;
      case 'FLAG_MANUAL_REVIEW':
        state.manualReview = true;
        state.explanation.push(`${policyName}: manual review required${a.metadata ? ` (${a.metadata})` : ''}`);
        break;
      case 'EXCLUDE_FROM_STANDARD_PROCESS':
        state.manualReview = true;
        state.explanation.push(`${policyName}: excluded from standard process`);
        break;
      case 'ADD_REASON_CODE':
        if (a.metadata?.trim()) {
          state.reasonCodes.push(a.metadata.trim());
          state.explanation.push(`${policyName}: reason ${a.metadata.trim()}`);
        }
        break;
      case 'ADD_POLICY_LABEL':
        if (a.metadata?.trim()) {
          state.policyLabels.push(a.metadata.trim());
          state.explanation.push(`${policyName}: label ${a.metadata.trim()}`);
        }
        break;
      case 'ANNOTATE_RESULT':
        if (a.metadata?.trim()) {
          state.explanation.push(`${policyName}: ${a.metadata.trim()}`);
        }
        break;
      default:
        break;
    }
  }
}

function finalizePolicyDollars(
  state: PolicyApplyState,
  currentBaseSalary: number
): {
  recommendedIncreaseDollars: number;
  finalRecommendedIncreasePercent: number;
  lumpSumDollars?: number;
  fixedIncreaseDollars?: number;
} {
  let totalDollars: number;
  if (state.fixedIncreaseDollars != null) {
    totalDollars = state.fixedIncreaseDollars;
  } else {
    totalDollars = (currentBaseSalary * state.increasePercent) / 100;
  }
  if (state.lumpSumDollars !== 0) {
    totalDollars += state.lumpSumDollars;
  }
  if (state.capDollars != null && totalDollars > state.capDollars) {
    totalDollars = state.capDollars;
  }
  if (state.floorDollars != null && totalDollars < state.floorDollars) {
    totalDollars = state.floorDollars;
  }

  const finalRecommendedIncreasePercent =
    currentBaseSalary > 0 ? (totalDollars / currentBaseSalary) * 100 : state.increasePercent;

  return {
    recommendedIncreaseDollars: totalDollars,
    finalRecommendedIncreasePercent,
    lumpSumDollars: state.lumpSumDollars !== 0 ? state.lumpSumDollars : undefined,
    fixedIncreaseDollars: state.fixedIncreaseDollars,
  };
}

/**
 * Evaluate policy engine for one provider. Returns recommended increase % and full trace.
 */
export function evaluatePolicyForProvider(
  record: ProviderRecord,
  context: PolicyEvaluationContext
): PolicyEvaluationResult {
  const facts = buildFactsFromRecord(record, { marketRow: context.marketRow });
  const matched: MatchedPolicyInfo[] = [];
  const applied: MatchedPolicyInfo[] = [];
  const skipped: MatchedPolicyInfo[] = [];
  const overridden: MatchedPolicyInfo[] = [];
  const explanation: string[] = [];

  let baseIncreasePercent: number | undefined;
  let proposedBaseSalary: number | undefined;
  let tierAssigned: string | undefined;
  let finalPolicySource: string | undefined;
  let finalModelType: string | undefined;
  let blocked = false;
  let stopProcessing = false;

  const applyState = newPolicyApplyState(0, false, explanation);

  const activePolicies = context.policies.filter((p) => isPolicyActive(p));
  const sortedPolicies = sortPoliciesByStageAndPriority(activePolicies);

  // Stage 1: Exclusions / guardrails
  for (const policy of sortedPolicies) {
    if (policy.stage !== 'EXCLUSION_GUARDRAIL') continue;
    if (stopProcessing) break;
    if (!matchesTargetScope(policy.targetScope, facts)) continue;
    if (policy.conditions && !evaluateConditions(policy.conditions, facts)) continue;

    matched.push({ id: policy.id, name: policy.name, stage: policy.stage, matched: true });
    applied.push({ id: policy.id, name: policy.name, stage: policy.stage, matched: true, applied: true });

    applyState.increasePercent = baseIncreasePercent ?? applyState.increasePercent;
    applyPolicyActions(policy.actions, applyState, policy.name);
    baseIncreasePercent = applyState.increasePercent;
    if (policy.conflictStrategy === 'BLOCK_AUTOMATION') blocked = true;
    if (policy.stopProcessing) stopProcessing = true;
    finalPolicySource = policy.name;
    finalModelType = 'Guardrail';
  }

  // Stage 2: Custom models — CUSTOM_MODEL policies first, then legacy customModels (migration)
  if (!stopProcessing && baseIncreasePercent == null && proposedBaseSalary == null) {
    // 2a: CUSTOM_MODEL policies (unified policy library)
    for (const policy of sortedPolicies) {
      if (policy.stage !== 'CUSTOM_MODEL' || !policy.modelConfig) continue;
      if (!matchesTargetScope(policy.targetScope, facts)) continue;
      if (policy.conditions && !evaluateConditions(policy.conditions, facts)) continue;
      const result = resolvePolicyModelConfig(policy, facts, context.tierTables);
      if (result) {
        baseIncreasePercent = result.increasePercent;
        if (result.baseSalary != null) proposedBaseSalary = result.baseSalary;
        tierAssigned = result.tierLabel;
        finalPolicySource = result.modelName;
        finalModelType = 'Custom model';
        explanation.push(`Matched: ${result.modelName}${result.tierLabel ? ` (${result.tierLabel})` : ''}`);
        break;
      }
    }
    // 2b: Legacy customModels (backward compat during migration)
    if (baseIncreasePercent == null && proposedBaseSalary == null) {
      for (const model of context.customModels) {
        const result = resolveCustomModel(model, facts, context.tierTables);
        if (result) {
          baseIncreasePercent = result.increasePercent;
          if (result.baseSalary != null) proposedBaseSalary = result.baseSalary;
          tierAssigned = result.tierLabel;
          finalPolicySource = result.modelName;
          finalModelType = 'Custom model';
          explanation.push(`Matched custom model: ${result.modelName}${result.tierLabel ? ` (${result.tierLabel})` : ''}`);
          break;
        }
      }
    }
  }

  // Default general matrix (Stage 4 baseline) when no custom model set base
  if (!stopProcessing && baseIncreasePercent == null && proposedBaseSalary == null && context.meritMatrixRows.length > 0) {
    const matrixResult = resolveGeneralMatrixIncrease(context.meritMatrixRows, facts);
    if (matrixResult) {
      baseIncreasePercent = matrixResult.defaultIncreasePercent;
      finalPolicySource = finalPolicySource ?? 'Default merit matrix';
      finalModelType = finalModelType ?? 'General matrix';
      explanation.push(`Default merit matrix: ${baseIncreasePercent}%`);
    }
  }

  // Stage 3: Modifiers (add to base)
  if (!stopProcessing) {
    for (const policy of sortedPolicies) {
      if (policy.stage === 'EXCLUSION_GUARDRAIL') continue;
      if (policy.stage === 'CAP_FLOOR') continue;
      if (!matchesTargetScope(policy.targetScope, facts)) continue;
      if (policy.conditions && !evaluateConditions(policy.conditions, facts)) continue;

      matched.push({ id: policy.id, name: policy.name, stage: policy.stage, matched: true });

      if (policy.stage === 'MODIFIER') {
        applied.push({ id: policy.id, name: policy.name, stage: policy.stage, matched: true, applied: true });
        applyState.increasePercent = baseIncreasePercent ?? applyState.increasePercent;
        applyPolicyActions(policy.actions, applyState, policy.name);
        baseIncreasePercent = applyState.increasePercent;
      }

      if (policy.stage === 'GENERAL_MATRIX' && baseIncreasePercent == null && !policy.isFallback) {
        const matrixResult = resolveGeneralMatrixIncrease(context.meritMatrixRows, facts);
        if (matrixResult) {
          baseIncreasePercent = matrixResult.defaultIncreasePercent;
          finalPolicySource = finalPolicySource ?? policy.name;
          finalModelType = finalModelType ?? 'General matrix';
          explanation.push(`General merit matrix applied: ${baseIncreasePercent}%`);
          applied.push({ id: policy.id, name: policy.name, stage: policy.stage, matched: true, applied: true });
        }
      }
    }
  }

  baseIncreasePercent = baseIncreasePercent ?? 0;

  // Stage 5: Caps / floors
  for (const policy of sortedPolicies) {
    if (policy.stage !== 'CAP_FLOOR') continue;
    if (!matchesTargetScope(policy.targetScope, facts)) continue;
    if (policy.conditions && !evaluateConditions(policy.conditions, facts)) continue;

    matched.push({ id: policy.id, name: policy.name, stage: policy.stage, matched: true });
    applied.push({ id: policy.id, name: policy.name, stage: policy.stage, matched: true, applied: true });
    applyState.increasePercent = baseIncreasePercent ?? applyState.increasePercent;
    applyPolicyActions(policy.actions, applyState, policy.name);
    baseIncreasePercent = applyState.increasePercent;
  }

  applyState.increasePercent = baseIncreasePercent ?? applyState.increasePercent;
  const currentBase = facts.currentBaseSalary ?? record.Current_Base_Salary ?? 0;
  const finalized = finalizePolicyDollars(applyState, currentBase);

  return {
    providerId: record.Employee_ID,
    matchedPolicies: matched,
    appliedPolicies: applied,
    skippedPolicies: skipped,
    overriddenPolicies: overridden,
    finalPolicySource,
    finalModelType,
    finalRecommendedIncreasePercent: finalized.finalRecommendedIncreasePercent,
    recommendedIncreaseDollars: finalized.recommendedIncreaseDollars,
    lumpSumDollars: finalized.lumpSumDollars,
    fixedIncreaseDollars: finalized.fixedIncreaseDollars,
    reasonCodes: applyState.reasonCodes.length > 0 ? [...applyState.reasonCodes] : undefined,
    policyLabels: applyState.policyLabels.length > 0 ? [...applyState.policyLabels] : undefined,
    proposedBaseSalary,
    tierAssigned,
    manualReview: applyState.manualReview,
    blocked,
    explanation,
  };
}

/**
 * Batch evaluate all records. Returns a Map of employeeId -> PolicyEvaluationResult.
 */
export function evaluateAllRecords(
  records: ProviderRecord[],
  context: PolicyEvaluationContext
): Map<string, PolicyEvaluationResult> {
  const map = new Map<string, PolicyEvaluationResult>();
  for (const record of records) {
    const result = evaluatePolicyForProvider(record, context);
    map.set(record.Employee_ID, result);
  }
  return map;
}
