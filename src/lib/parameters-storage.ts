/**
 * Persist parameters/configuration to localStorage.
 * Keys: cycles, merit matrix, experience bands, PCP tiers, PCP APP rules,
 * plan assignment rules, APP benchmark mapping, budget settings.
 */

import type { Cycle } from '../types/cycle';
import type { MeritMatrixRow } from '../types/merit-matrix-row';
import type { ExperienceBand } from '../types/experience-band';
import type { PcpPhysicianTierRow } from '../types/pcp-tier';
import type { PcpAppRuleRow } from '../types/pcp-app-rules';
import type { PlanAssignmentRuleRow } from '../types/plan-assignment-row';
import type { AppBenchmarkMappingRow } from '../types/app-benchmark-mapping';
import type { BudgetSettingsRow } from '../types/budget-settings';
import {
  SAMPLE_CYCLES,
  SAMPLE_MERIT_MATRIX,
  SAMPLE_EXPERIENCE_BANDS,
  SAMPLE_PCP_TIER_SETTINGS,
  SAMPLE_PCP_APP_RULES,
  SAMPLE_PLAN_ASSIGNMENT_RULES,
  SAMPLE_APP_BENCHMARK_MAPPING,
  SAMPLE_BUDGET_SETTINGS,
} from './parameters-sample-data';

const KEY_CYCLES = 'tcc-cycles';
const KEY_MERIT_MATRIX = 'tcc-merit-matrix';
const KEY_EXPERIENCE_BANDS = 'tcc-experience-bands';
const KEY_PCP_TIER_SETTINGS = 'tcc-pcp-tier-settings';
const KEY_PCP_APP_RULES = 'tcc-pcp-app-rules';
const KEY_PLAN_ASSIGNMENT_RULES = 'tcc-plan-assignment-rules';
const KEY_APP_BENCHMARK_MAPPING = 'tcc-app-benchmark-mapping';
const KEY_BUDGET_SETTINGS = 'tcc-budget-settings';

function loadJson<T extends unknown[]>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return defaultValue;
    return (data.length === 0 ? defaultValue : data) as T;
  } catch {
    return defaultValue;
  }
}

function saveJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function loadCycles(): Cycle[] {
  return loadJson(KEY_CYCLES, SAMPLE_CYCLES);
}

export function saveCycles(rows: Cycle[]): void {
  saveJson(KEY_CYCLES, rows);
}

export function loadMeritMatrix(): MeritMatrixRow[] {
  return loadJson(KEY_MERIT_MATRIX, SAMPLE_MERIT_MATRIX);
}

export function saveMeritMatrix(rows: MeritMatrixRow[]): void {
  saveJson(KEY_MERIT_MATRIX, rows);
}

export function loadExperienceBands(): ExperienceBand[] {
  return loadJson(KEY_EXPERIENCE_BANDS, SAMPLE_EXPERIENCE_BANDS);
}

export function saveExperienceBands(rows: ExperienceBand[]): void {
  saveJson(KEY_EXPERIENCE_BANDS, rows);
}

export function loadPcpTierSettings(): PcpPhysicianTierRow[] {
  return loadJson(KEY_PCP_TIER_SETTINGS, SAMPLE_PCP_TIER_SETTINGS);
}

export function savePcpTierSettings(rows: PcpPhysicianTierRow[]): void {
  saveJson(KEY_PCP_TIER_SETTINGS, rows);
}

export function loadPcpAppRules(): PcpAppRuleRow[] {
  return loadJson(KEY_PCP_APP_RULES, SAMPLE_PCP_APP_RULES);
}

export function savePcpAppRules(rows: PcpAppRuleRow[]): void {
  saveJson(KEY_PCP_APP_RULES, rows);
}

export function loadPlanAssignmentRules(): PlanAssignmentRuleRow[] {
  return loadJson(KEY_PLAN_ASSIGNMENT_RULES, SAMPLE_PLAN_ASSIGNMENT_RULES);
}

export function savePlanAssignmentRules(rows: PlanAssignmentRuleRow[]): void {
  saveJson(KEY_PLAN_ASSIGNMENT_RULES, rows);
}

export function loadAppBenchmarkMapping(): AppBenchmarkMappingRow[] {
  return loadJson(KEY_APP_BENCHMARK_MAPPING, SAMPLE_APP_BENCHMARK_MAPPING);
}

export function saveAppBenchmarkMapping(rows: AppBenchmarkMappingRow[]): void {
  saveJson(KEY_APP_BENCHMARK_MAPPING, rows);
}

export function loadBudgetSettings(): BudgetSettingsRow[] {
  return loadJson(KEY_BUDGET_SETTINGS, SAMPLE_BUDGET_SETTINGS);
}

export function saveBudgetSettings(rows: BudgetSettingsRow[]): void {
  saveJson(KEY_BUDGET_SETTINGS, rows);
}
