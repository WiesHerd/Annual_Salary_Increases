/**
 * Policy engine: staged evaluation for annual salary increase recommendations.
 */

export { buildFactsFromRecord } from './facts';
export type { PolicyFacts } from './facts';
export { evaluateConditions, factsToData } from './conditions';
export { matchesTargetScope } from './targeting';
export { getStageOrder, sortPoliciesByStageAndPriority, POLICY_STAGE_ORDER } from './stages';
export { resolveGeneralMatrixIncrease } from './matrix-resolver';
export { resolveCustomModel } from './custom-model-resolver';
export type { CustomModelResult } from './custom-model-resolver';
export {
  evaluatePolicyForProvider,
  evaluateAllRecords,
} from './evaluator';
export type { PolicyEvaluationContext } from './evaluator';
export { validatePolicy, validateScenarioConfig, validateConditionTree, testConditionAgainstFacts } from './validation';
export type { PolicyValidationResult, ScenarioConfigValidationResult } from './validation';
