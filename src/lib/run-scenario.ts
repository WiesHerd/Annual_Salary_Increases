/**
 * Run policy evaluation for a scenario and derive proposed base/TCC/increase dollars.
 * Used by Compare Scenarios feature.
 */

import type { ProviderRecord } from '../types/provider';
import type { MarketResolver } from '../types/market-survey-config';
import type { ScenarioConfigSnapshot, ScenarioRunResult, ScenarioDerivedResult } from '../types/scenario';
import type { PolicyEvaluationResult } from '../types/compensation-policy';
import { evaluatePolicyForProvider } from './policy-engine/evaluator';
import type { PolicyEvaluationContext } from './policy-engine/evaluator';
import { recalculateProviderRow } from './calculations/recalculate-provider-row';

/** Run evaluation for all records and build ScenarioRunResult. */
export function runScenario(
  records: ProviderRecord[],
  config: ScenarioConfigSnapshot,
  marketResolver: MarketResolver,
  scenarioId: string,
  scenarioLabel: string
): ScenarioRunResult {
  const context: PolicyEvaluationContext = {
    policies: config.policies,
    customModels: config.customModels,
    tierTables: config.tierTables,
    meritMatrixRows: config.meritMatrixRows,
    asOfDate: config.asOfDate,
  };

  const evaluationResults = new Map<string, PolicyEvaluationResult>();
  const derivedResults = new Map<string, ScenarioDerivedResult>();

  let totalIncreaseDollars = 0;
  let zeroedCount = 0;
  let manualReviewCount = 0;

  for (const record of records) {
    const matchKey = (record.Market_Specialty_Override ?? record.Specialty ?? record.Benchmark_Group ?? '').trim();
    const marketRow = matchKey ? marketResolver(record, matchKey) : undefined;
    const result = evaluatePolicyForProvider(record, { ...context, marketRow });
    evaluationResults.set(record.Employee_ID, result);

    const recalculated = recalculateProviderRow({
      record,
      marketRow,
      policyResult: result,
      meritMatrixRows: config.meritMatrixRows,
    });

    const currentBase = record.Current_Base_Salary ?? 0;
    const proposedBase = recalculated.Proposed_Base_Salary ?? currentBase;
    const proposedTcc = recalculated.Proposed_TCC ?? record.Current_TCC ?? 0;
    const increaseDollars = proposedBase - currentBase;

    derivedResults.set(record.Employee_ID, {
      proposedBase,
      proposedTcc,
      increaseDollars,
    });

    totalIncreaseDollars += increaseDollars;
    if (result.finalRecommendedIncreasePercent === 0) zeroedCount++;
    if (result.manualReview) manualReviewCount++;
  }

  return {
    scenarioId,
    scenarioLabel,
    configSnapshot: config,
    evaluationResults,
    derivedResults,
    summary: {
      totalIncreaseDollars,
      providerCount: records.length,
      zeroedCount,
      manualReviewCount,
    },
  };
}
