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
import type { BudgetSettingsRow } from '../types/budget-settings';
import type { CfBySpecialtyRow } from '../types/cf-by-specialty';
import type { AppCombinedGroupRow } from '../types/app-combined-group';
import type { SurveySpecialtyMappingSet, ProviderTypeToSurveyMapping } from '../types/market-survey-config';
import { DEFAULT_SURVEY_ID } from '../types/market-survey-config';
import {
  SAMPLE_CYCLES,
  SAMPLE_MERIT_MATRIX,
  SAMPLE_EXPERIENCE_BANDS,
  SAMPLE_PCP_TIER_SETTINGS,
  SAMPLE_PCP_APP_RULES,
  SAMPLE_PLAN_ASSIGNMENT_RULES,
  SAMPLE_SURVEY_SPECIALTY_MAPPING_SET,
  SAMPLE_BUDGET_SETTINGS,
  SAMPLE_CF_BY_SPECIALTY,
  SAMPLE_PROVIDER_TYPE_TO_SURVEY,
} from './parameters-sample-data';
import { migratedStorageGetItem, migratedStorageSetItem, migratedStorageRemoveItem } from './migrated-local-storage';
import { parseCyclesFromStorage } from './schemas/persisted-data';

const KEY_CYCLES = 'tcc-cycles';
const KEY_MERIT_MATRIX = 'tcc-merit-matrix';
const KEY_EXPERIENCE_BANDS = 'tcc-experience-bands';
const KEY_PCP_TIER_SETTINGS = 'tcc-pcp-tier-settings';
const KEY_PCP_APP_RULES = 'tcc-pcp-app-rules';
const KEY_PLAN_ASSIGNMENT_RULES = 'tcc-plan-assignment-rules';
const KEY_APP_COMBINED_GROUPS = 'tcc-app-combined-groups';
const KEY_SURVEY_SPECIALTY_MAPPING = 'tcc-survey-specialty-mapping';
const KEY_PROVIDER_TYPE_TO_SURVEY = 'tcc-provider-type-to-survey';
const KEY_BUDGET_SETTINGS = 'tcc-budget-settings';
const KEY_CF_BY_SPECIALTY = 'tcc-cf-by-specialty';

function loadJson<T extends unknown[]>(key: string, defaultValue: T): T {
  try {
    const raw = migratedStorageGetItem(key);
    if (!raw) return defaultValue;
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return defaultValue;
    return (data.length === 0 ? defaultValue : data) as T;
  } catch {
    return defaultValue;
  }
}

function saveJson<T>(key: string, value: T): void {
  migratedStorageSetItem(key, JSON.stringify(value));
}

export function loadCycles(): Cycle[] {
  try {
    const raw = migratedStorageGetItem(KEY_CYCLES);
    if (!raw) return SAMPLE_CYCLES;
    const parsed = JSON.parse(raw) as unknown;
    const validated = parseCyclesFromStorage(parsed);
    if (validated == null || validated.length === 0) return SAMPLE_CYCLES;
    return validated;
  } catch {
    return SAMPLE_CYCLES;
  }
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

function isAppCombinedGroupRow(r: unknown): r is AppCombinedGroupRow {
  return (
    typeof r === 'object' &&
    r != null &&
    'combinedGroupName' in r &&
    Array.isArray((r as AppCombinedGroupRow).surveySpecialties)
  );
}

/** Migrate legacy survey specialty mapping (1:1) to app combined groups (many:1). */
function migrateFromLegacySurveyMapping(): AppCombinedGroupRow[] | null {
  try {
    const raw = migratedStorageGetItem('tcc-app-benchmark-mapping');
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0] as Record<string, unknown>;
    if (first?.surveySpecialty != null && first?.combinedGroup != null) {
      const byGroup = new Map<string, string[]>();
      for (const row of data as { surveySpecialty?: string; combinedGroup?: string }[]) {
        const cg = (row.combinedGroup ?? '').trim();
        const spec = (row.surveySpecialty ?? '').trim();
        if (!cg || !spec) continue;
        if (!byGroup.has(cg)) byGroup.set(cg, []);
        if (!byGroup.get(cg)!.includes(spec)) byGroup.get(cg)!.push(spec);
      }
      return Array.from(byGroup.entries()).map(([name, specs], i) => ({
        id: `migrated-${i}`,
        combinedGroupName: name,
        surveySpecialties: specs,
      }));
    }
  } catch {
    // ignore
  }
  return null;
}

/** Migrate legacy app combined groups to per-survey format. */
function migrateLegacyAppCombinedGroups(): SurveySpecialtyMappingSet | null {
  const migrated = migrateFromLegacySurveyMapping();
  if (migrated) {
    const set: SurveySpecialtyMappingSet = { [DEFAULT_SURVEY_ID]: { appCombinedGroups: migrated } };
    saveSurveySpecialtyMappingSet(set);
    migratedStorageRemoveItem('tcc-app-benchmark-mapping');
    migratedStorageRemoveItem(KEY_APP_COMBINED_GROUPS);
    return set;
  }
  try {
    const raw = migratedStorageGetItem(KEY_APP_COMBINED_GROUPS);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    if (!isAppCombinedGroupRow(first)) return null;
    const set: SurveySpecialtyMappingSet = { [DEFAULT_SURVEY_ID]: { appCombinedGroups: data as AppCombinedGroupRow[] } };
    saveSurveySpecialtyMappingSet(set);
    migratedStorageRemoveItem(KEY_APP_COMBINED_GROUPS);
    return set;
  } catch {
    return null;
  }
}

function cloneSurveySpecialtyMappingSet(source: SurveySpecialtyMappingSet): SurveySpecialtyMappingSet {
  return JSON.parse(JSON.stringify(source)) as SurveySpecialtyMappingSet;
}

/** Fill missing survey keys or empty group lists from demo defaults (non-destructive for saved groups). */
function mergeSurveyMappingDefaults(set: SurveySpecialtyMappingSet): SurveySpecialtyMappingSet {
  const out = cloneSurveySpecialtyMappingSet(set);
  for (const [surveyId, def] of Object.entries(SAMPLE_SURVEY_SPECIALTY_MAPPING_SET)) {
    const cur = out[surveyId]?.appCombinedGroups;
    if (!cur || cur.length === 0) {
      const seeded = cloneSurveySpecialtyMappingSet({ [surveyId]: def });
      out[surveyId] = seeded[surveyId]!;
    }
  }
  if (!out[DEFAULT_SURVEY_ID]) {
    out[DEFAULT_SURVEY_ID] = { appCombinedGroups: [] };
  }
  return out;
}

export function loadSurveySpecialtyMappingSet(): SurveySpecialtyMappingSet {
  const migrated = migrateLegacyAppCombinedGroups();
  if (migrated) return mergeSurveyMappingDefaults(migrated);
  try {
    const raw = migratedStorageGetItem(KEY_SURVEY_SPECIALTY_MAPPING);
    if (!raw) return cloneSurveySpecialtyMappingSet(SAMPLE_SURVEY_SPECIALTY_MAPPING_SET);
    const data = JSON.parse(raw) as unknown;
    if (typeof data !== 'object' || data === null)
      return cloneSurveySpecialtyMappingSet(SAMPLE_SURVEY_SPECIALTY_MAPPING_SET);
    return mergeSurveyMappingDefaults(data as SurveySpecialtyMappingSet);
  } catch {
    return cloneSurveySpecialtyMappingSet(SAMPLE_SURVEY_SPECIALTY_MAPPING_SET);
  }
}

export function saveSurveySpecialtyMappingSet(set: SurveySpecialtyMappingSet): void {
  migratedStorageSetItem(KEY_SURVEY_SPECIALTY_MAPPING, JSON.stringify(set));
}

/** Get APP combined groups for a survey (backward compat). */
export function loadAppCombinedGroups(surveyId?: string): AppCombinedGroupRow[] {
  const set = loadSurveySpecialtyMappingSet();
  const id = surveyId ?? DEFAULT_SURVEY_ID;
  return set[id]?.appCombinedGroups ?? SAMPLE_SURVEY_SPECIALTY_MAPPING_SET[id]?.appCombinedGroups ?? [];
}

/** Save APP combined groups for a survey. */
export function saveAppCombinedGroups(surveyId: string, rows: AppCombinedGroupRow[]): void {
  const set = loadSurveySpecialtyMappingSet();
  set[surveyId] = { appCombinedGroups: rows };
  saveSurveySpecialtyMappingSet(set);
}

export function loadProviderTypeToSurveyMapping(): ProviderTypeToSurveyMapping {
  let stored: ProviderTypeToSurveyMapping = {};
  try {
    const raw = migratedStorageGetItem(KEY_PROVIDER_TYPE_TO_SURVEY);
    if (raw) {
      const data = JSON.parse(raw) as unknown;
      if (typeof data === 'object' && data !== null) stored = data as ProviderTypeToSurveyMapping;
    }
  } catch {
    stored = {};
  }
  const merged: ProviderTypeToSurveyMapping = { ...stored };
  for (const [providerType, surveyId] of Object.entries(SAMPLE_PROVIDER_TYPE_TO_SURVEY)) {
    const cur = merged[providerType];
    if (cur == null || String(cur).trim() === '') {
      merged[providerType] = surveyId;
    }
  }
  // Legacy sample routed APP/MHT to physicians; correct when still on that stale value.
  if (merged['Mental Health Therapist'] === 'physicians') {
    merged['Mental Health Therapist'] = 'mental-health-therapists';
  }
  for (const pt of ['NP', 'PA', 'APP'] as const) {
    if (merged[pt] === 'physicians') merged[pt] = 'apps';
  }
  return merged;
}

export function saveProviderTypeToSurveyMapping(mapping: ProviderTypeToSurveyMapping): void {
  migratedStorageSetItem(KEY_PROVIDER_TYPE_TO_SURVEY, JSON.stringify(mapping));
}

export function loadBudgetSettings(): BudgetSettingsRow[] {
  return loadJson(KEY_BUDGET_SETTINGS, SAMPLE_BUDGET_SETTINGS);
}

export function saveBudgetSettings(rows: BudgetSettingsRow[]): void {
  saveJson(KEY_BUDGET_SETTINGS, rows);
}

export function loadCfBySpecialty(): CfBySpecialtyRow[] {
  return loadJson(KEY_CF_BY_SPECIALTY, SAMPLE_CF_BY_SPECIALTY);
}

export function saveCfBySpecialty(rows: CfBySpecialtyRow[]): void {
  saveJson(KEY_CF_BY_SPECIALTY, rows);
}
