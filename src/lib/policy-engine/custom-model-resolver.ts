/**
 * Resolve base increase % and tier from a custom compensation model or policy model config.
 */

import type { CustomCompensationModel, AnnualIncreasePolicy, PolicyModelConfig } from '../../types/compensation-policy';
import type { PolicyFacts } from './facts';
import type { TierTable } from '../../types/tier-table';
import { matchesTargetScope } from './targeting';
import { evaluateConditions } from './conditions';

export interface CustomModelResult {
  increasePercent: number;
  /** When set, model assigns fixed base salary (YOE_TIER_BASE_SALARY); recalc uses this instead of current + increase %. */
  baseSalary?: number;
  tierLabel?: string;
  modelName: string;
  modelId: string;
}

/**
 * Get tier rows from custom model (inline tierRows or from tierTables by tierTableId).
 */
function getTierRows(
  model: CustomCompensationModel,
  tierTables: TierTable[]
): { minYoe: number; maxYoe: number; label: string; increasePercent: number }[] {
  if (model.tierRows?.length) return model.tierRows;
  if (model.tierTableId) {
    const table = tierTables.find((t) => t.id === model.tierTableId);
    if (table?.tiers?.length) {
      return table.tiers.map((t) => ({
        minYoe: t.minYoe,
        maxYoe: t.maxYoe,
        label: t.label,
        increasePercent: t.increasePercent,
      }));
    }
  }
  return [];
}

/**
 * Find tier for given YOE from ordered tier rows.
 */
function findTierByYoe(
  yoe: number,
  tierRows: { minYoe: number; maxYoe: number; label: string; increasePercent: number }[]
): { label: string; increasePercent: number } | undefined {
  const row = tierRows.find((r) => yoe >= r.minYoe && yoe <= r.maxYoe);
  return row ? { label: row.label, increasePercent: row.increasePercent } : undefined;
}

function findTierBaseSalaryByYoe(
  yoe: number,
  tierRows: { minYoe: number; maxYoe: number; label: string; baseSalary: number }[]
): { label: string; baseSalary: number } | undefined {
  const row = tierRows.find((r) => yoe >= r.minYoe && yoe <= r.maxYoe);
  return row ? { label: row.label, baseSalary: row.baseSalary } : undefined;
}

/**
 * Resolve custom model result for given facts. Returns undefined if model does not match.
 */
export function resolveCustomModel(
  model: CustomCompensationModel,
  facts: PolicyFacts,
  tierTables: TierTable[]
): CustomModelResult | undefined {
  if (model.status !== 'active') return undefined;
  if (!matchesTargetScope(model.targetScope, facts)) return undefined;
  if (model.conditions && !evaluateConditions(model.conditions, facts)) return undefined;

  if (model.type === 'FIXED_PERCENT' && model.fixedIncreasePercent != null) {
    return {
      increasePercent: model.fixedIncreasePercent,
      modelName: model.name,
      modelId: model.id,
    };
  }

  if (model.type === 'YOE_TIER_TABLE') {
    const tierRows = getTierRows(model, tierTables);
    const yoe = facts.yoe ?? facts.totalYoe ?? 0;
    const tier = findTierByYoe(yoe, tierRows);
    if (tier) {
      return {
        increasePercent: tier.increasePercent,
        tierLabel: tier.label,
        modelName: model.name,
        modelId: model.id,
      };
    }
  }

  if (model.type === 'YOE_TIER_BASE_SALARY' && model.tierBaseSalaryRows?.length) {
    const yoe = facts.yoe ?? facts.totalYoe ?? 0;
    const tier = findTierBaseSalaryByYoe(yoe, model.tierBaseSalaryRows);
    if (tier) {
      return {
        increasePercent: 0,
        baseSalary: tier.baseSalary,
        tierLabel: tier.label,
        modelName: model.name,
        modelId: model.id,
      };
    }
  }

  return undefined;
}

/**
 * Get tier rows from policy model config (inline or from tierTables by tierTableId).
 */
function getTierRowsFromPolicyConfig(
  config: Extract<PolicyModelConfig, { type: 'YOE_TIER_TABLE' }>,
  tierTables: TierTable[]
): { minYoe: number; maxYoe: number; label: string; increasePercent: number }[] {
  if (config.tierRows?.length) return config.tierRows;
  if (config.tierTableId) {
    const table = tierTables.find((t) => t.id === config.tierTableId);
    if (table?.tiers?.length) {
      return table.tiers.map((t) => ({
        minYoe: t.minYoe,
        maxYoe: t.maxYoe,
        label: t.label,
        increasePercent: t.increasePercent,
      }));
    }
  }
  return [];
}

/**
 * Resolve policy model config for given facts. Returns result when policy has modelConfig and scope/conditions matched (caller checks those).
 * Used when policy stage is CUSTOM_MODEL and policy has modelConfig.
 */
export function resolvePolicyModelConfig(
  policy: AnnualIncreasePolicy,
  facts: PolicyFacts,
  tierTables: TierTable[]
): CustomModelResult | undefined {
  const config = policy.modelConfig;
  if (!config) return undefined;

  if (config.type === 'FIXED_PERCENT' && config.fixedIncreasePercent != null) {
    return {
      increasePercent: config.fixedIncreasePercent,
      modelName: policy.name,
      modelId: policy.id,
    };
  }

  if (config.type === 'YOE_TIER_TABLE') {
    const tierRows = getTierRowsFromPolicyConfig(config, tierTables);
    const yoe = facts.yoe ?? facts.totalYoe ?? 0;
    const tier = findTierByYoe(yoe, tierRows);
    if (tier) {
      return {
        increasePercent: tier.increasePercent,
        tierLabel: tier.label,
        modelName: policy.name,
        modelId: policy.id,
      };
    }
  }

  if (config.type === 'YOE_TIER_BASE_SALARY' && config.tierBaseSalaryRows?.length) {
    const yoe = facts.yoe ?? facts.totalYoe ?? 0;
    const tier = findTierBaseSalaryByYoe(yoe, config.tierBaseSalaryRows);
    if (tier) {
      return {
        increasePercent: 0,
        baseSalary: tier.baseSalary,
        tierLabel: tier.label,
        modelName: policy.name,
        modelId: policy.id,
      };
    }
  }

  return undefined;
}
