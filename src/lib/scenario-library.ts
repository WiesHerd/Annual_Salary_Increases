/**
 * Built-in scenario library for Compare Scenarios.
 * Example configs so users can compare 3% vs 4% vs 3% with 75th percentile cap without building from scratch.
 */

import type { ScenarioConfigSnapshot } from '../types/scenario';
import type { MeritMatrixRow } from '../types/merit-matrix-row';
import type { AnnualIncreasePolicy } from '../types/compensation-policy';

const ts = () => new Date().toISOString();

/** Stable ids for library scenarios (used in dropdown; not stored in localStorage). */
export const LIBRARY_SCENARIO_IDS = {
  FLAT_3: 'library-3pct',
  FLAT_4: 'library-4pct',
  FLAT_3_75TH_CAP: 'library-3pct-75th-cap',
} as const;

export const LIBRARY_SCENARIO_LABELS: Record<string, string> = {
  [LIBRARY_SCENARIO_IDS.FLAT_3]: '3% increase (example)',
  [LIBRARY_SCENARIO_IDS.FLAT_4]: '4% increase (example)',
  [LIBRARY_SCENARIO_IDS.FLAT_3_75TH_CAP]: '3% with cap at 75th percentile (example)',
};

/** Merit matrix where every row gives the same percent (for flat scenarios). */
function meritMatrixFlatPercent(percent: number): MeritMatrixRow[] {
  return [
    { id: 'lib-merit-1', evaluationScore: 5, performanceLabel: 'Exceeds', defaultIncreasePercent: percent, notes: '' },
    { id: 'lib-merit-2', evaluationScore: 4, performanceLabel: 'Strongly Meets', defaultIncreasePercent: percent, notes: '' },
    { id: 'lib-merit-3', evaluationScore: 3, performanceLabel: 'Meets', defaultIncreasePercent: percent, notes: '' },
    { id: 'lib-merit-4', evaluationScore: 2, performanceLabel: 'Partially Meets', defaultIncreasePercent: percent, notes: '' },
    { id: 'lib-merit-5', evaluationScore: 1, performanceLabel: 'Below', defaultIncreasePercent: percent, notes: '' },
  ];
}

/** Guardrail: TCC percentile > 75 → 0% and flag manual review. */
function guardrail75thPolicy(): AnnualIncreasePolicy {
  return {
    id: 'lib-guardrail-75th',
    key: 'lib-guardrail-75th',
    name: 'FMV cap – TCC above 75th percentile',
    description: 'Fair market value: TCC > 75th → 0% increase.',
    status: 'active',
    stage: 'EXCLUSION_GUARDRAIL',
    policyType: 'Guardrail',
    priority: 5,
    targetScope: {},
    conditions: { and: [{ '>': [{ var: 'tccPercentile' }, 75] }] },
    actions: [{ type: 'ZERO_OUT_INCREASE' }, { type: 'FLAG_MANUAL_REVIEW', metadata: 'FMV: TCC above 75th' }],
    conflictStrategy: 'FORCE_RESULT',
    stopProcessing: true,
    createdAt: ts(),
    updatedAt: ts(),
  };
}

function buildConfig(meritMatrixRows: MeritMatrixRow[], policies: AnnualIncreasePolicy[]): ScenarioConfigSnapshot {
  return {
    policies,
    customModels: [],
    tierTables: [],
    meritMatrixRows,
    asOfDate: undefined,
  };
}

/** Get config for a library scenario by id. */
export function getLibraryScenarioConfig(id: string): ScenarioConfigSnapshot | undefined {
  switch (id) {
    case LIBRARY_SCENARIO_IDS.FLAT_3:
      return buildConfig(meritMatrixFlatPercent(3), []);
    case LIBRARY_SCENARIO_IDS.FLAT_4:
      return buildConfig(meritMatrixFlatPercent(4), []);
    case LIBRARY_SCENARIO_IDS.FLAT_3_75TH_CAP:
      return buildConfig(meritMatrixFlatPercent(3), [guardrail75thPolicy()]);
    default:
      return undefined;
  }
}

/** All library scenario ids in display order. */
export const LIBRARY_SCENARIO_ID_LIST: string[] = [
  LIBRARY_SCENARIO_IDS.FLAT_3,
  LIBRARY_SCENARIO_IDS.FLAT_4,
  LIBRARY_SCENARIO_IDS.FLAT_3_75TH_CAP,
];

/** Check if a scenario selection value is a library scenario. */
export function isLibraryScenarioId(value: string): boolean {
  return value.startsWith('library:');
}

/** Get library scenario id from selection value (e.g. "library:library-3pct" -> "library-3pct"). */
export function getLibraryIdFromValue(value: string): string | null {
  if (!value.startsWith('library:')) return null;
  return value.slice('library:'.length) || null;
}
