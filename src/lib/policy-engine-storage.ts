/**
 * Persist policy engine data: policies, custom models, tier tables, active matrix id.
 * Custom models are migrated to CUSTOM_MODEL policies on first load (one-time).
 */

import type { AnnualIncreasePolicy, CustomCompensationModel, PolicyModelConfig } from '../types/compensation-policy';
import type { TierTable } from '../types/tier-table';
import { migratedStorageGetItem, migratedStorageSetItem, migratedStorageRemoveItem } from './migrated-local-storage';
const KEY_POLICIES = 'tcc-policy-engine-policies';
const KEY_CUSTOM_MODELS = 'tcc-policy-engine-custom-models';
const KEY_TIER_TABLES = 'tcc-policy-engine-tier-tables';
const KEY_ACTIVE_MATRIX_ID = 'tcc-policy-engine-active-matrix-id';
const KEY_MIGRATED_CUSTOM_MODELS = 'tcc-policy-engine-migrated-custom-models';
const KEY_ADDED_CARDIOLOGY_3TIER = 'tcc-policy-engine-added-cardiology-3tier';
function loadJson<T>(key: string, defaultValue: T): T {
  try {
    const raw = migratedStorageGetItem(key);
    if (!raw) return defaultValue;
    const data = JSON.parse(raw) as unknown;
    return (data ?? defaultValue) as T;
  } catch {
    return defaultValue;
  }
}

function saveJson<T>(key: string, value: T): void {
  migratedStorageSetItem(key, JSON.stringify(value));
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
    if (migratedStorageGetItem(KEY_MIGRATED_CUSTOM_MODELS) === '1') {
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
    migratedStorageSetItem(KEY_MIGRATED_CUSTOM_MODELS, '1');
    return { policies: merged, customModels: [] };
  } catch {
    return { policies, customModels };
  }
}

function ts(): string {
  return new Date().toISOString();
}

/**
 * Demo set of 6 policies that work together: guardrails supersede first,
 * then custom models by specialty/division, then modifier, then cap.
 * Seeded when the policy list is empty so users can see filtering and superseding.
 */
function getDemoPolicies(): AnnualIncreasePolicy[] {
  return [
    // 1. Guardrail (1st): FMV TCC cap – runs first, supersedes for anyone above 75th TCC
    {
      id: 'demo-guardrail-fmv-tcc-cap',
      key: 'demo-guardrail-fmv-tcc-cap',
      name: 'FMV TCC cap (75th percentile)',
      description: 'TCC above 75th percentile → 0% and flag. Runs first; supersedes all other policies for those providers.',
      status: 'active',
      stage: 'EXCLUSION_GUARDRAIL',
      policyType: 'Guardrail',
      priority: 5,
      targetScope: {},
      conditions: { and: [{ '>': [{ var: 'tccPercentile' }, 75] }] },
      actions: [
        { type: 'ZERO_OUT_INCREASE' },
        { type: 'FLAG_MANUAL_REVIEW', metadata: 'FMV: TCC above 75th' },
      ],
      conflictStrategy: 'FORCE_RESULT',
      stopProcessing: true,
      createdAt: ts(),
      updatedAt: ts(),
    },
    // 2. Guardrail (2nd): Low performer – flags only; does not zero out
    {
      id: 'demo-guardrail-low-performer',
      key: 'demo-guardrail-low-performer',
      name: 'Low performer guardrail',
      description: 'Evaluation score ≤ 2 → flag for manual review. Does not change increase %; other policies still apply.',
      status: 'active',
      stage: 'EXCLUSION_GUARDRAIL',
      policyType: 'Guardrail',
      priority: 10,
      targetScope: {},
      conditions: { and: [{ '<=': [{ var: 'evaluationScore' }, 2] }] },
      actions: [{ type: 'FLAG_MANUAL_REVIEW', metadata: 'Below expectations' }],
      conflictStrategy: 'ANNOTATE_ONLY',
      stopProcessing: false,
      createdAt: ts(),
      updatedAt: ts(),
    },
    // 3. Custom model: General Pediatrics – increase % by YOE tier (runs before PCP so Gen Peds gets this)
    {
      id: 'demo-custom-gen-peds-yoe',
      key: 'demo-custom-gen-peds-yoe',
      name: 'General Pediatrics – Increase % by YOE tier',
      description: 'Targets General Pediatrics / Pediatrics. 0–2 YOE: 3.5%; 3–5: 4%; 6–10: 4.25%; 11+: 4.5%. Supersedes broader PCP tier for matched providers.',
      status: 'active',
      stage: 'CUSTOM_MODEL',
      policyType: 'Custom model',
      priority: 25,
      targetScope: {
        specialties: ['General Pediatrics', 'Pediatrics'],
        divisions: ['PCP', 'Primary Care', 'Pediatrics'],
      },
      conditions: undefined,
      modelConfig: {
        type: 'YOE_TIER_TABLE',
        tierRows: [
          { minYoe: 0, maxYoe: 2, label: '0–2 YOE', increasePercent: 3.5 },
          { minYoe: 2.01, maxYoe: 5, label: '3–5 YOE', increasePercent: 4 },
          { minYoe: 5.01, maxYoe: 10, label: '6–10 YOE', increasePercent: 4.25 },
          { minYoe: 10.01, maxYoe: 999, label: '11+ YOE', increasePercent: 4.5 },
        ],
      },
      actions: [],
      conflictStrategy: 'REPLACE_BASE_RESULT',
      createdAt: ts(),
      updatedAt: ts(),
    },
    // 4. Custom model: PCP / Primary Care – increase % by YOE tier (broader; Gen Peds gets Gen Peds policy first)
    {
      id: 'demo-custom-pcp-yoe',
      key: 'demo-custom-pcp-yoe',
      name: 'PCP / Primary Care – Increase % by YOE tier',
      description: 'Targets PCP, Primary Care, Family Medicine, Internal Medicine. 0–3 YOE: 3.5%; 4–7: 4%; 8+: 4.5%. Applies when no more specific custom model matches.',
      status: 'active',
      stage: 'CUSTOM_MODEL',
      policyType: 'Custom model',
      priority: 50,
      targetScope: {
        divisions: ['PCP', 'Primary Care', 'Family Medicine'],
        specialties: ['Family Medicine', 'Internal Medicine', 'General Pediatrics', 'Pediatrics'],
      },
      conditions: undefined,
      modelConfig: {
        type: 'YOE_TIER_TABLE',
        tierRows: [
          { minYoe: 0, maxYoe: 3, label: '0–3 YOE', increasePercent: 3.5 },
          { minYoe: 3.01, maxYoe: 7, label: '4–7 YOE', increasePercent: 4 },
          { minYoe: 7.01, maxYoe: 999, label: '8+ YOE', increasePercent: 4.5 },
        ],
      },
      actions: [],
      conflictStrategy: 'REPLACE_BASE_RESULT',
      createdAt: ts(),
      updatedAt: ts(),
    },
    // 4b. Example: one specialty, three YOE tiers (0–3 = Tier 1, 3–8 = Tier 2, 8+ = Tier 3) – open this policy to see how it’s built
    {
      id: 'demo-custom-cardiology-yoe-3tier',
      key: 'demo-custom-cardiology-yoe-3tier',
      name: 'Cardiology – Increase % by YOE tier (example)',
      description: 'Example: one specialty (Cardiology) with 3 tiers. Tier 1: 0–3 YOE → 3.5%. Tier 2: 3–8 YOE → 4%. Tier 3: 8+ YOE → 4.5%. Open this policy to see Target scope + tier table.',
      status: 'active',
      stage: 'CUSTOM_MODEL',
      policyType: 'Custom model',
      priority: 45,
      targetScope: {
        specialties: ['Cardiology'],
      },
      conditions: undefined,
      modelConfig: {
        type: 'YOE_TIER_TABLE',
        tierRows: [
          { minYoe: 0, maxYoe: 3, label: 'Tier 1 (0–3 YOE)', increasePercent: 3.5 },
          { minYoe: 3.01, maxYoe: 8, label: 'Tier 2 (3–8 YOE)', increasePercent: 4 },
          { minYoe: 8.01, maxYoe: 999, label: 'Tier 3 (8+ YOE)', increasePercent: 4.5 },
        ],
      },
      actions: [],
      conflictStrategy: 'REPLACE_BASE_RESULT',
      createdAt: ts(),
      updatedAt: ts(),
    },
    // 5. Modifier: High wRVU – adds 0.5% when wRVU percentile > 60 (stacks on base from matrix or custom model)
    {
      id: 'demo-modifier-high-wrvu',
      key: 'demo-modifier-high-wrvu',
      name: 'High wRVU productivity modifier',
      description: 'wRVU percentile > 60 → add +0.5% to base increase. Stacks on merit matrix or custom model result.',
      status: 'active',
      stage: 'MODIFIER',
      policyType: 'Modifier',
      priority: 10,
      targetScope: {},
      conditions: { and: [{ '>': [{ var: 'wrvuPercentile' }, 60] }] },
      actions: [{ type: 'ADD_INCREASE_PERCENT', value: 0.5 }],
      conflictStrategy: 'ADDITIVE_MODIFIER',
      createdAt: ts(),
      updatedAt: ts(),
    },
    // 6. Cap/floor: Cap at 5% – runs last, constrains final increase
    {
      id: 'demo-cap-5pct',
      key: 'demo-cap-5pct',
      name: 'Cap at 5%',
      description: 'Final increase cannot exceed 5%. Applies after all other policies (guardrails, custom models, modifiers).',
      status: 'active',
      stage: 'CAP_FLOOR',
      policyType: 'Cap / Floor',
      priority: 10,
      targetScope: {},
      conditions: undefined,
      actions: [{ type: 'CAP_INCREASE_PERCENT', value: 5 }],
      conflictStrategy: 'CAP_RESULT',
      createdAt: ts(),
      updatedAt: ts(),
    },
  ];
}

const CARDIOLOGY_3TIER_EXAMPLE_ID = 'demo-custom-cardiology-yoe-3tier';

/** Load policies from storage. When storage is empty, seeds the demo set (including Cardiology 3-tier example). When user already has policies, add the Cardiology 3-tier example once if missing. */
export function loadPolicies(): AnnualIncreasePolicy[] {
  let policies = loadJson<AnnualIncreasePolicy[]>(KEY_POLICIES, []);
  if (typeof localStorage !== 'undefined') {
    if (policies.length === 0) {
      policies = getDemoPolicies();
      saveJson(KEY_POLICIES, policies);
    } else {
      const hasCardiologyExample = policies.some((p) => p.id === CARDIOLOGY_3TIER_EXAMPLE_ID);
      if (!hasCardiologyExample && migratedStorageGetItem(KEY_ADDED_CARDIOLOGY_3TIER) !== '1') {
        const demo = getDemoPolicies();
        const cardiology = demo.find((p) => p.id === CARDIOLOGY_3TIER_EXAMPLE_ID);
        if (cardiology) {
          policies = [...policies, cardiology];
          saveJson(KEY_POLICIES, policies);
          migratedStorageSetItem(KEY_ADDED_CARDIOLOGY_3TIER, '1');
        }
      }
    }
  }
  return policies;
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
  const v = migratedStorageGetItem(KEY_ACTIVE_MATRIX_ID);
  return v || null;
}

export function saveActiveMatrixId(id: string | null): void {
  if (id == null) migratedStorageRemoveItem(KEY_ACTIVE_MATRIX_ID);
  else migratedStorageSetItem(KEY_ACTIVE_MATRIX_ID, id);
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
