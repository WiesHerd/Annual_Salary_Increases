/**
 * Scenario types for Compare Scenarios feature.
 * A scenario = policy config snapshot + batch run results against provider data.
 */

import type { AnnualIncreasePolicy, CustomCompensationModel, PolicyEvaluationResult } from './compensation-policy';
import type { TierTable } from './tier-table';
import type { MeritMatrixRow } from './merit-matrix-row';

/** Snapshot of policy config used for a scenario run. */
export interface ScenarioConfigSnapshot {
  policies: AnnualIncreasePolicy[];
  customModels: CustomCompensationModel[];
  tierTables: TierTable[];
  meritMatrixRows: MeritMatrixRow[];
  asOfDate?: string;
}

/** Derived compensation result for one provider in a scenario. */
export interface ScenarioDerivedResult {
  proposedBase: number;
  proposedTcc: number;
  increaseDollars: number;
}

/** Summary totals for one scenario run. */
export interface ScenarioSummary {
  totalIncreaseDollars: number;
  providerCount: number;
  zeroedCount: number;
  manualReviewCount: number;
}

/** One scenario's results for comparison. */
export interface ScenarioRunResult {
  scenarioId: string;
  scenarioLabel: string;
  configSnapshot?: ScenarioConfigSnapshot;
  /** providerId -> PolicyEvaluationResult */
  evaluationResults: Map<string, PolicyEvaluationResult>;
  /** providerId -> derived proposed base, TCC, increase $ */
  derivedResults: Map<string, ScenarioDerivedResult>;
  summary: ScenarioSummary;
}

/** Preset id for alternate scenario (derived from current config). */
export type ScenarioPresetId = 'merit-matrix-only' | 'no-custom-models' | 'conservative-cap';
