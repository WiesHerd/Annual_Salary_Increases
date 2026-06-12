/**
 * Compensation policy engine types: policies, targeting, actions, evaluation results.
 * Supports staged evaluation (exclusions → custom models → modifiers → general matrix → caps/floors).
 */

/** Evaluation stage order. Lower number runs first. */
export type PolicyStage =
  | 'EXCLUSION_GUARDRAIL'
  | 'CUSTOM_MODEL'
  | 'MODIFIER'
  | 'GENERAL_MATRIX'
  | 'CAP_FLOOR';

export const POLICY_STAGE_ORDER: PolicyStage[] = [
  'EXCLUSION_GUARDRAIL',
  'CUSTOM_MODEL',
  'MODIFIER',
  'GENERAL_MATRIX',
  'CAP_FLOOR',
];

export const POLICY_STAGE_LABELS: Record<PolicyStage, string> = {
  EXCLUSION_GUARDRAIL: 'Exclusions',
  CUSTOM_MODEL: 'Custom model',
  MODIFIER: 'Modifier',
  GENERAL_MATRIX: 'General merit matrix',
  CAP_FLOOR: 'Caps / Floors',
};

/** Plain-language description for admins (rule editor, help, tooltips). */
export const POLICY_STAGE_DESCRIPTIONS: Record<PolicyStage, string> = {
  EXCLUSION_GUARDRAIL:
    'Hard stops first—exclude from standard processing, zero out increases, or flag manual review before other stages apply.',
  CUSTOM_MODEL:
    'Plan-specific models (e.g. YOE tier tables) that set or replace the base increase for providers who match.',
  MODIFIER:
    'Adjustments on top of the current result—typically additive (e.g. +% or lump-sum $) after a base is set.',
  GENERAL_MATRIX:
    'Default merit matrix from evaluation score and performance category—often the fallback when no custom model applies.',
  CAP_FLOOR:
    'Final limits on the increase—maximum caps and minimum floors so every result stays within policy bounds.',
};

/** One-line pipeline order for inline UI hints. */
export const POLICY_STAGE_PIPELINE_HINT =
  'Pipeline order: Exclusions → Custom model → Modifier → General merit matrix → Caps / Floors';

/** How this policy interacts with the current result. */
export type ConflictStrategy =
  | 'REPLACE_BASE_RESULT'
  | 'ADDITIVE_MODIFIER'
  | 'CAP_RESULT'
  | 'FLOOR_RESULT'
  | 'FORCE_RESULT'
  | 'BLOCK_AUTOMATION'
  | 'FALLBACK_ONLY'
  | 'ANNOTATE_ONLY';

export const CONFLICT_STRATEGY_LABELS: Record<ConflictStrategy, string> = {
  REPLACE_BASE_RESULT: 'Replace base result',
  ADDITIVE_MODIFIER: 'Add to result',
  CAP_RESULT: 'Cap result',
  FLOOR_RESULT: 'Floor result',
  FORCE_RESULT: 'Force result',
  BLOCK_AUTOMATION: 'Block automation',
  FALLBACK_ONLY: 'Fallback only',
  ANNOTATE_ONLY: 'Annotate only',
};

/** Action types the engine can apply. */
export type PolicyActionType =
  | 'SET_BASE_INCREASE_PERCENT'
  | 'ASSIGN_GENERAL_MATRIX'
  | 'ASSIGN_CUSTOM_MODEL'
  | 'ASSIGN_TIER_TABLE'
  | 'ASSIGN_TIER_BY_YOE'
  | 'ADD_INCREASE_PERCENT'
  | 'ADD_INCREASE_DOLLARS'
  | 'SET_INCREASE_DOLLARS'
  | 'CAP_INCREASE_PERCENT'
  | 'CAP_INCREASE_DOLLARS'
  | 'FLOOR_INCREASE_PERCENT'
  | 'FLOOR_INCREASE_DOLLARS'
  | 'FORCE_INCREASE_PERCENT'
  | 'FORCE_INCREASE_DOLLARS'
  | 'ZERO_OUT_INCREASE'
  | 'EXCLUDE_FROM_STANDARD_PROCESS'
  | 'FLAG_MANUAL_REVIEW'
  | 'ADD_REASON_CODE'
  | 'ADD_POLICY_LABEL'
  | 'ANNOTATE_RESULT'
  | 'SET_MODEL_TYPE';

export interface PolicyAction {
  type: PolicyActionType;
  /** Numeric value (e.g. percent for SET_BASE, ADD, CAP, FLOOR). */
  value?: number;
  /** Model id, tier table id, or other config. */
  config?: Record<string, unknown>;
  metadata?: string;
}

/** Targeting scope: who this policy applies to. */
export interface PolicyTargetScope {
  providerTypes?: string[];
  specialties?: string[];
  subspecialties?: string[];
  divisions?: string[];
  departments?: string[];
  sections?: string[];
  providerIds?: string[];
  excludedProviderIds?: string[];
  locations?: string[];
  compensationPlanTypes?: string[];
  /** Optional tags/cohorts if app supports them. */
  tags?: string[];
  /** Optional numeric ranges (inclusive). Applied in addition to list filters. */
  yoeMin?: number;
  yoeMax?: number;
  tccPercentileMin?: number;
  tccPercentileMax?: number;
  wrvuPercentileMin?: number;
  wrvuPercentileMax?: number;
}

export type PolicyStatus = 'draft' | 'active' | 'inactive' | 'archived';

/** JsonLogic-compatible condition tree. Stored as JSON. */
export type ConditionTree = Record<string, unknown>;

/** Inline model config for CUSTOM_MODEL policies. Replaces separate CustomCompensationModel. */
export type PolicyModelConfig =
  | {
      type: 'YOE_TIER_TABLE';
      tierTableId?: string;
      tierRows?: { minYoe: number; maxYoe: number; label: string; increasePercent: number }[];
    }
  | {
      type: 'YOE_TIER_BASE_SALARY';
      tierBaseSalaryRows: { minYoe: number; maxYoe: number; label: string; baseSalary: number }[];
    }
  | {
      type: 'FIXED_PERCENT';
      fixedIncreasePercent: number;
    };

export interface AnnualIncreasePolicy {
  id: string;
  /** Stable unique key for references. */
  key: string;
  name: string;
  description?: string;
  status: PolicyStatus;
  stage: PolicyStage;
  /** Policy type for display (e.g. guardrail, custom model, modifier). */
  policyType: string;
  /** Lower number = higher priority within stage. */
  priority: number;
  version?: string;
  targetScope: PolicyTargetScope;
  /** JsonLogic condition tree. Empty or missing = always match. */
  conditions?: ConditionTree;
  /** Inline model config when stage is CUSTOM_MODEL. Replaces separate custom model library. */
  modelConfig?: PolicyModelConfig;
  actions: PolicyAction[];
  conflictStrategy: ConflictStrategy;
  /** When true, no later policies apply after this one. */
  stopProcessing?: boolean;
  /** When true, only applies if no base result set yet (fallback). */
  isFallback?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/** One policy's match/apply outcome for a provider. */
export interface MatchedPolicyInfo {
  id: string;
  name: string;
  stage: PolicyStage;
  matched: boolean;
  applied?: boolean;
  skippedReason?: string;
}

/** Full evaluation result for one provider. */
export interface PolicyEvaluationResult {
  providerId: string;
  matchedPolicies: MatchedPolicyInfo[];
  appliedPolicies: MatchedPolicyInfo[];
  skippedPolicies: MatchedPolicyInfo[];
  overriddenPolicies: MatchedPolicyInfo[];
  finalPolicySource?: string;
  finalModelType?: string;
  finalRecommendedIncreasePercent: number;
  /** Total recommended merit increase in dollars (percent-derived + lump-sum, after $ caps/floors). */
  recommendedIncreaseDollars?: number;
  /** Lump-sum dollars added on top of percent-based increase (e.g. retention award). */
  lumpSumDollars?: number;
  /** When set, merit increase is this fixed dollar amount before lump-sum add-ons. */
  fixedIncreaseDollars?: number;
  /** Audit reason codes from ADD_REASON_CODE actions. */
  reasonCodes?: string[];
  /** Display labels from ADD_POLICY_LABEL actions. */
  policyLabels?: string[];
  /** When set, policy assigns a fixed base salary (e.g. YOE tier); recalc uses this instead of current + increase. */
  proposedBaseSalary?: number;
  tierAssigned?: string;
  manualReview: boolean;
  blocked?: boolean;
  explanation: string[];
  warnings?: string[];
}

/** Custom model: replaces general matrix for a targeted population. */
export type CustomModelType = 'YOE_TIER_TABLE' | 'YOE_TIER_BASE_SALARY' | 'CUSTOM_MATRIX' | 'FIXED_PERCENT';

export interface CustomCompensationModel {
  id: string;
  key: string;
  name: string;
  description?: string;
  type: CustomModelType;
  status: PolicyStatus;
  targetScope: PolicyTargetScope;
  conditions?: ConditionTree;
  /** For YOE_TIER_TABLE: tier table id or inline tiers. */
  tierTableId?: string;
  tierRows?: { minYoe: number; maxYoe: number; label: string; increasePercent: number }[];
  /** For YOE_TIER_BASE_SALARY: fixed base salary by YOE tier (not increase %). */
  tierBaseSalaryRows?: { minYoe: number; maxYoe: number; label: string; baseSalary: number }[];
  /** For FIXED_PERCENT. */
  fixedIncreasePercent?: number;
  /** For CUSTOM_MATRIX: score/label → percent (future). */
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}
