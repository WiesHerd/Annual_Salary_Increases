/**
 * Scenario presets for Compare Scenarios feature.
 * Derives alternate policy config from current config for Scenario B.
 * Conservative cap is sourced from the policy template library (policy-templates.ts), not hardcoded here.
 */

import type { ScenarioConfigSnapshot, ScenarioPresetId } from '../types/scenario';
import {
  getConservativeCapTemplate,
  instantiateTemplate,
} from './policy-templates';

export const SCENARIO_PRESET_LABELS: Record<ScenarioPresetId, string> = {
  'merit-matrix-only': 'Baseline (merit matrix only)',
  'no-custom-models': 'Turn off custom models',
  'conservative-cap': 'Tighter cap (replace cap/floor rules)',
};

/** Build Scenario B config from a preset. */
export function buildScenarioConfigFromPreset(
  presetId: ScenarioPresetId,
  currentConfig: ScenarioConfigSnapshot
): ScenarioConfigSnapshot {
  switch (presetId) {
    case 'merit-matrix-only':
      return {
        policies: [],
        customModels: [],
        tierTables: [],
        meritMatrixRows: currentConfig.meritMatrixRows,
        asOfDate: currentConfig.asOfDate,
      };
    case 'no-custom-models':
      return {
        policies: currentConfig.policies,
        customModels: [],
        tierTables: currentConfig.tierTables,
        meritMatrixRows: currentConfig.meritMatrixRows,
        asOfDate: currentConfig.asOfDate,
      };
    case 'conservative-cap': {
      // Source cap from policy template library (single source of truth for percent and name)
      const template = getConservativeCapTemplate();
      const conservativeCapPolicy = template
        ? instantiateTemplate(template.policy, '-scenario-preset')
        : null;
      if (!conservativeCapPolicy) {
        return currentConfig;
      }
      // Replace existing cap policies with the conservative cap from template
      const otherPolicies = currentConfig.policies.filter((p) => p.stage !== 'CAP_FLOOR');
      return {
        policies: [...otherPolicies, conservativeCapPolicy],
        customModels: currentConfig.customModels,
        tierTables: currentConfig.tierTables,
        meritMatrixRows: currentConfig.meritMatrixRows,
        asOfDate: currentConfig.asOfDate,
      };
    }
    default:
      return currentConfig;
  }
}
