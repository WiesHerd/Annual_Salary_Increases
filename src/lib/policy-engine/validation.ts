/**
 * Policy and scenario config validation.
 * Surfaces duplicate keys, tier range issues, required fields, and condition key checks.
 */

import type { AnnualIncreasePolicy, PolicyModelConfig, ConditionTree } from '../../types/compensation-policy';
import type { ScenarioConfigSnapshot } from '../../types/scenario';
import { CONDITION_FACT_OPTIONS } from './condition-builder';
import { evaluateConditions } from './conditions';
import type { PolicyFacts } from './facts';

/** Valid condition fact keys (from PolicyFacts / condition builder). */
const VALID_CONDITION_KEYS = new Set([
  ...CONDITION_FACT_OPTIONS.map((o) => o.value),
  'providerTypeLower',
  'specialtyLower',
  'divisionLower',
  'employeeId',
  'providerName',
  'subspecialty',
  'jobCode',
  'clinicalFte',
  'currentTier',
  'proposedTier',
  'reviewStatus',
]);

function collectVarKeysFromTree(tree: unknown): string[] {
  const keys: string[] = [];
  if (tree != null && typeof tree === 'object' && !Array.isArray(tree)) {
    const obj = tree as Record<string, unknown>;
    if ('var' in obj && typeof obj.var === 'string') {
      keys.push(obj.var);
    }
    for (const v of Object.values(obj)) {
      keys.push(...collectVarKeysFromTree(v));
    }
  }
  if (Array.isArray(tree)) {
    for (const item of tree) {
      keys.push(...collectVarKeysFromTree(item));
    }
  }
  return keys;
}

/**
 * Validate condition tree: ensure all "var" references use known PolicyFacts keys.
 */
export function validateConditionTree(conditions: ConditionTree | undefined): { errors: string[] } {
  const errors: string[] = [];
  if (!conditions || Object.keys(conditions).length === 0) return { errors };
  const varKeys = collectVarKeysFromTree(conditions);
  const unknown = varKeys.filter((k) => !VALID_CONDITION_KEYS.has(k));
  if (unknown.length > 0) {
    const unique = [...new Set(unknown)];
    errors.push(`Condition references unknown field(s): ${unique.join(', ')}. Use fields from the condition builder.`);
  }
  return { errors };
}

/**
 * Test a condition tree against an array of facts (e.g. from sample provider records).
 * Returns how many facts matched the condition.
 */
export function testConditionAgainstFacts(
  conditions: ConditionTree | undefined,
  factsArray: PolicyFacts[]
): { matched: number; total: number } {
  if (!factsArray.length) return { matched: 0, total: 0 };
  let matched = 0;
  for (const facts of factsArray) {
    if (evaluateConditions(conditions, facts)) matched++;
  }
  return { matched, total: factsArray.length };
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(s: string | undefined): boolean {
  if (!s || !ISO_DATE_REGEX.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export interface PolicyValidationResult {
  errors: string[];
  warnings: string[];
}

/**
 * Validate a single policy: required fields, effective dates, tier rows.
 */
export function validatePolicy(policy: AnnualIncreasePolicy): PolicyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!policy.name?.trim()) {
    errors.push('Policy name is required.');
  }
  if (!policy.key?.trim()) {
    errors.push('Policy key is required.');
  }

  if (policy.stage === 'CUSTOM_MODEL' && !policy.modelConfig && (!policy.actions || policy.actions.length === 0)) {
    warnings.push('Custom model policies should have either model config (e.g. YOE tier table) or actions.');
  }

  const tierValidation = validateTierRows(policy.modelConfig);
  errors.push(...tierValidation.errors);
  warnings.push(...tierValidation.warnings);

  const conditionValidation = validateConditionTree(policy.conditions);
  warnings.push(...conditionValidation.errors);

  return { errors, warnings };
}

function validateTierRows(modelConfig: PolicyModelConfig | undefined): PolicyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!modelConfig) return { errors, warnings };

  if (modelConfig.type === 'YOE_TIER_TABLE' && modelConfig.tierRows?.length) {
    const sorted = [...modelConfig.tierRows].sort((a, b) => a.minYoe - b.minYoe);
    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i];
      if (row.minYoe > row.maxYoe) {
        errors.push(`Tier "${row.label}": min YOE (${row.minYoe}) cannot be greater than max YOE (${row.maxYoe}).`);
      }
      if (i > 0 && row.minYoe <= sorted[i - 1].maxYoe) {
        errors.push(`Tier "${row.label}": YOE ranges must not overlap. Previous tier ends at ${sorted[i - 1].maxYoe}.`);
      }
    }
  }

  if (modelConfig.type === 'YOE_TIER_BASE_SALARY' && modelConfig.tierBaseSalaryRows?.length) {
    const sorted = [...modelConfig.tierBaseSalaryRows].sort((a, b) => a.minYoe - b.minYoe);
    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i];
      if (row.minYoe > row.maxYoe) {
        errors.push(`Tier "${row.label}": min YOE (${row.minYoe}) cannot be greater than max YOE (${row.maxYoe}).`);
      }
      if (i > 0 && row.minYoe <= sorted[i - 1].maxYoe) {
        errors.push(`Tier "${row.label}": YOE ranges must not overlap. Previous tier ends at ${sorted[i - 1].maxYoe}.`);
      }
    }
  }

  if (modelConfig.type === 'FIXED_PERCENT') {
    const pct = modelConfig.fixedIncreasePercent;
    if (pct != null && (typeof pct !== 'number' || Number.isNaN(pct))) {
      errors.push('Fixed increase percent must be a valid number.');
    }
  }

  return { errors, warnings };
}

export interface ScenarioConfigValidationResult {
  errors: string[];
  warnings: string[];
}

/**
 * Validate a scenario config: duplicate policy keys and per-policy validation.
 */
export function validateScenarioConfig(config: ScenarioConfigSnapshot): ScenarioConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const keys = new Map<string, string>();
  for (const p of config.policies) {
    const key = (p.key ?? '').trim();
    if (key) {
      const existing = keys.get(key);
      if (existing && existing !== p.id) {
        errors.push(`Duplicate policy key "${key}". Policy keys must be unique.`);
      }
      keys.set(key, p.id);
    }
    const policyResult = validatePolicy(p);
    for (const e of policyResult.errors) {
      errors.push(`${p.name || p.id}: ${e}`);
    }
    for (const w of policyResult.warnings) {
      warnings.push(`${p.name || p.id}: ${w}`);
    }
  }

  if (config.asOfDate != null && config.asOfDate !== '' && !isValidIsoDate(config.asOfDate)) {
    errors.push('Scenario as-of date must be a valid ISO date (YYYY-MM-DD).');
  }

  return { errors, warnings };
}
