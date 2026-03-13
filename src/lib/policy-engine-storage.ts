/**
 * Persist policy engine data: policies, custom models, tier tables, active matrix id.
 * Custom models are migrated to CUSTOM_MODEL policies on first load (one-time).
 */

import type { AnnualIncreasePolicy, CustomCompensationModel, PolicyModelConfig } from '../types/compensation-policy';
import type { TierTable } from '../types/tier-table';
const KEY_POLICIES = 'tcc-policy-engine-policies';
const KEY_CUSTOM_MODELS = 'tcc-policy-engine-custom-models';
const KEY_TIER_TABLES = 'tcc-policy-engine-tier-tables';
const KEY_ACTIVE_MATRIX_ID = 'tcc-policy-engine-active-matrix-id';
const KEY_MIGRATED_CUSTOM_MODELS = 'tcc-policy-engine-migrated-custom-models';

function loadJson<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const data = JSON.parse(raw) as unknown;
    return (data ?? defaultValue) as T;
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

/** Convert a custom model to a CUSTOM_MODEL policy. */
function customModelToPolicy(model: CustomCompensationModel): AnnualIncreasePolicy {
  let modelConfig: PolicyModelConfig;
  if (model.type === 'FIXED_PERCENT' && model.fixedIncreasePercent != null) {
    modelConfig = { type: 'FIXED_PERCENT', fixedIncreasePercent: model.fixedIncreasePercent };
  } else if (model.type === 'YOE_TIER_BASE_SALARY' && model.tierBaseSalaryRows?.length) {
    modelConfig = { type: 'YOE_TIER_BASE_SALARY', tierBaseSalaryRows: model.tierBaseSalaryRows };
  } else if (model.type === 'YOE_TIER_TABLE') {
    modelConfig = {
      type: 'YOE_TIER_TABLE',
      tierTableId: model.tierTableId,
      tierRows: model.tierRows,
    };
  } else {
    modelConfig = { type: 'YOE_TIER_TABLE', tierRows: model.tierRows ?? [] };
  }
  return {
    id: model.id,
    key: model.key,
    name: model.name,
    description: model.description,
    status: model.status,
    stage: 'CUSTOM_MODEL',
    policyType: 'Custom model',
    priority: 50,
    targetScope: model.targetScope ?? {},
    conditions: model.conditions,
    modelConfig,
    actions: [],
    conflictStrategy: 'REPLACE_BASE_RESULT',
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

/** One-time migration: convert custom models to CUSTOM_MODEL policies and merge. */
export function migrateCustomModelsToPolicies(
  policies: AnnualIncreasePolicy[],
  customModels: CustomCompensationModel[]
): { policies: AnnualIncreasePolicy[]; customModels: CustomCompensationModel[] } {
  if (typeof localStorage === 'undefined') return { policies, customModels };
  if (customModels.length === 0) return { policies, customModels };
  try {
    if (localStorage.getItem(KEY_MIGRATED_CUSTOM_MODELS) === '1') {
      return { policies, customModels: [] };
    }
    const existingIds = new Set(policies.map((p) => p.id));
    const migrated: AnnualIncreasePolicy[] = [];
    for (const model of customModels) {
      if (!existingIds.has(model.id)) {
        migrated.push(customModelToPolicy(model));
        existingIds.add(model.id);
      }
    }
    const merged = [...policies, ...migrated];
    saveJson(KEY_POLICIES, merged);
    saveJson(KEY_CUSTOM_MODELS, []);
    localStorage.setItem(KEY_MIGRATED_CUSTOM_MODELS, '1');
    return { policies: merged, customModels: [] };
  } catch {
    return { policies, customModels };
  }
}

/** Load policies from storage. Default is empty — policies are only added via Add from library or Create new, and can be edited/deleted. */
export function loadPolicies(): AnnualIncreasePolicy[] {
  return loadJson(KEY_POLICIES, []);
}

export function savePolicies(policies: AnnualIncreasePolicy[]): void {
  saveJson(KEY_POLICIES, policies);
}

const PCP_BASE_SALARY_TIER_MODEL: CustomCompensationModel = {
  id: 'model-pcp-base-salary-tier',
  key: 'pcp-base-salary-tier',
  name: 'PCP Base Salary by YOE Tier',
  description: 'Fixed base salary by Years of Experience for PCP / Primary Care physicians. 0–4 YOE: $175,000; 4–8 YOE: $190,000; 8+ YOE: $200,000.',
  type: 'YOE_TIER_BASE_SALARY',
  status: 'active',
  targetScope: {
    divisions: ['PCP', 'Primary Care', 'Family Medicine', 'Pediatrics', 'General Pediatrics'],
    specialties: ['Family Medicine', 'General Pediatrics', 'Pediatrics', 'Internal Medicine'],
  },
  tierBaseSalaryRows: [
    { minYoe: 0, maxYoe: 4, label: '0–4 YOE', baseSalary: 175_000 },
    { minYoe: 4.01, maxYoe: 8, label: '4–8 YOE', baseSalary: 190_000 },
    { minYoe: 8.01, maxYoe: 999, label: '8+ YOE', baseSalary: 200_000 },
  ],
  effectiveStart: new Date().toISOString().slice(0, 10),
  version: '1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const YOE_TIER_DEMO_MODEL: CustomCompensationModel = {
  id: 'model-yoe-tier-demo',
  key: 'yoe-tier-demo',
  name: 'YOE Tier (Demo)',
  description: 'Experience-based tier model that applies to all providers. Use this to see how tier changes salary by Years of Experience.',
  type: 'YOE_TIER_TABLE',
  status: 'active',
  targetScope: {},
  tierRows: [
    { minYoe: 0, maxYoe: 2, label: 'Tier 1 (0–2 YOE)', increasePercent: 2.5 },
    { minYoe: 2.01, maxYoe: 5, label: 'Tier 2 (3–5 YOE)', increasePercent: 3.5 },
    { minYoe: 5.01, maxYoe: 10, label: 'Tier 3 (6–10 YOE)', increasePercent: 4.5 },
    { minYoe: 10.01, maxYoe: 999, label: 'Tier 4 (11+ YOE)', increasePercent: 5.5 },
  ],
  effectiveStart: new Date().toISOString().slice(0, 10),
  version: '1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function loadCustomModels(): CustomCompensationModel[] {
  const loaded = loadJson(KEY_CUSTOM_MODELS, SAMPLE_CUSTOM_MODELS);
  const hasPcpTier = loaded.some((m) => m.id === 'model-pcp-base-salary-tier');
  const hasDemo = loaded.some((m) => m.id === 'model-yoe-tier-demo');
  let out = loaded;
  // Add missing models at the END so user's models (e.g. PCP Base Salary) match first
  if (!hasPcpTier) out = [...out, PCP_BASE_SALARY_TIER_MODEL];
  if (!hasDemo) out = [...out, YOE_TIER_DEMO_MODEL];
  return out;
}

export function saveCustomModels(models: CustomCompensationModel[]): void {
  saveJson(KEY_CUSTOM_MODELS, models);
}

export function loadTierTables(): TierTable[] {
  return loadJson(KEY_TIER_TABLES, SAMPLE_TIER_TABLES);
}

export function saveTierTables(tables: TierTable[]): void {
  saveJson(KEY_TIER_TABLES, tables);
}

export function loadActiveMatrixId(): string | null {
  const v = localStorage.getItem(KEY_ACTIVE_MATRIX_ID);
  return v || null;
}

export function saveActiveMatrixId(id: string | null): void {
  if (id == null) localStorage.removeItem(KEY_ACTIVE_MATRIX_ID);
  else localStorage.setItem(KEY_ACTIVE_MATRIX_ID, id);
}

const SAMPLE_CUSTOM_MODELS: CustomCompensationModel[] = [
  PCP_BASE_SALARY_TIER_MODEL,
  YOE_TIER_DEMO_MODEL,
  {
    id: 'model-pcp-peds-yoe',
    key: 'pcp-peds-yoe',
    name: 'PCP General Pediatrics YOE model',
    description: 'YOE-based increase tiers for PCP General Pediatrics physicians.',
    type: 'YOE_TIER_TABLE',
    status: 'active',
    targetScope: {
      providerTypes: ['Physician', 'Staff Physician'],
      specialties: ['General Pediatrics', 'Pediatrics'],
      divisions: ['PCP', 'Primary Care', 'Pediatrics'],
    },
    tierRows: [
      { minYoe: 0, maxYoe: 2, label: 'Tier 1', increasePercent: 3.5 },
      { minYoe: 2.01, maxYoe: 5, label: 'Tier 2', increasePercent: 4.0 },
      { minYoe: 5.01, maxYoe: 10, label: 'Tier 3', increasePercent: 4.25 },
      { minYoe: 10.01, maxYoe: 999, label: 'Tier 4', increasePercent: 4.5 },
    ],
    effectiveStart: new Date().toISOString().slice(0, 10),
    version: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SAMPLE_TIER_TABLES: TierTable[] = [
  {
    id: 'tier-table-yoe-demo',
    name: 'YOE Tier Demo',
    version: '1',
    tiers: [
      { minYoe: 0, maxYoe: 2, label: 'Tier 1 (0–2 YOE)', increasePercent: 2.5 },
      { minYoe: 2.01, maxYoe: 5, label: 'Tier 2 (3–5 YOE)', increasePercent: 3.5 },
      { minYoe: 5.01, maxYoe: 10, label: 'Tier 3 (6–10 YOE)', increasePercent: 4.5 },
      { minYoe: 10.01, maxYoe: 999, label: 'Tier 4 (11+ YOE)', increasePercent: 5.5 },
    ],
    active: true,
  },
  {
    id: 'tier-table-pcp-1',
    name: 'PCP YOE tiers (default)',
    version: '1',
    tiers: [
      { minYoe: 0, maxYoe: 2, label: 'Tier 1', increasePercent: 3.5 },
      { minYoe: 2.01, maxYoe: 5, label: 'Tier 2', increasePercent: 4.0 },
      { minYoe: 5.01, maxYoe: 10, label: 'Tier 3', increasePercent: 4.25 },
      { minYoe: 10.01, maxYoe: 999, label: 'Tier 4', increasePercent: 4.5 },
    ],
    active: true,
  },
];
