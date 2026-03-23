/**
 * Example experience band configurations for **Guardrails → Experience band targets (review)**.
 *
 * These are **not** loaded automatically — they document patterns you can recreate in the UI.
 * Order matters: **first matching row wins** (narrow scopes above broad ones).
 *
 * Flexibility summary:
 * - Any number of rows; overlapping YOE is OK if **scopes** differ.
 * - **Percentile band** (TCC % low/high) for “where in market” guidance.
 * - Optional **$ band**: anchor %ile + −% / +% (e.g. 80/100/120 → 20 / 20 in the UI).
 * - **Scopes**: provider type, specialty/cohort, comp plan — empty = everyone.
 * - **Suggest** checkboxes: optional base suggestions in Salary Review when below target.
 */

import type { ExperienceBand } from '../types/experience-band';

/** Same idea as default sample: physicians only, percentile “walk” by YOE (no $ band, no scopes). */
export const EXAMPLE_PHYSICIAN_PERCENTILE_LADDER: ExperienceBand[] = [
  {
    id: 'ex-phys-1',
    label: 'Early career (0–2 YOE)',
    minYoe: 0,
    maxYoe: 2,
    targetTccPercentileLow: 25,
    targetTccPercentileHigh: 50,
    populationScope: ['Physician'],
    planScope: [],
    specialtyScope: [],
    suggestBaseToHitTarget: true,
  },
  {
    id: 'ex-phys-2',
    label: 'Mid (3–10 YOE)',
    minYoe: 3,
    maxYoe: 10,
    targetTccPercentileLow: 50,
    targetTccPercentileHigh: 75,
    populationScope: ['Physician'],
    planScope: [],
    specialtyScope: [],
  },
  {
    id: 'ex-phys-3',
    label: 'Senior (11+ YOE)',
    minYoe: 11,
    maxYoe: 99,
    targetTccPercentileLow: 75,
    targetTccPercentileHigh: 90,
    populationScope: ['Physician'],
    planScope: [],
    specialtyScope: [],
  },
];

/**
 * NP/PA with APP_YOE; critical care cohort; tighter percentile + **80/100/120** dollar band on P50.
 * UI: Anchor %ile 50, −% 20, +% 20.
 */
export const EXAMPLE_APP_CRITICAL_CARE_WITH_DOLLAR_BAND: ExperienceBand[] = [
  {
    id: 'ex-app-cc-1',
    label: 'APP critical care 0–5 (retention)',
    minYoe: 0,
    maxYoe: 5,
    targetTccPercentileLow: 40,
    targetTccPercentileHigh: 65,
    populationScope: ['NP', 'PA'],
    specialtyScope: ['Critical Care', 'Critical Care Medicine'],
    planScope: [],
    dollarRangeAnchorPercentile: 50,
    dollarRangeMinSpreadPercent: 20,
    dollarRangeMaxSpreadPercent: 20,
    suggestBaseToHitTarget: true,
    suggestBaseToHitDollarRangeMidpoint: true,
  },
  {
    id: 'ex-app-cc-2',
    label: 'APP critical care 6+',
    minYoe: 6,
    maxYoe: 99,
    targetTccPercentileLow: 50,
    targetTccPercentileHigh: 75,
    populationScope: ['NP', 'PA'],
    specialtyScope: ['Critical Care', 'Critical Care Medicine'],
    planScope: [],
    dollarRangeAnchorPercentile: 50,
    dollarRangeMinSpreadPercent: 15,
    dollarRangeMaxSpreadPercent: 15,
  },
];

/**
 * Stack: **specific** endocrine APP row first, then **all APP**, then physicians.
 * Endocrine: asymmetric dollar band **90/100/125** → UI −% 10, +% 25.
 */
export const EXAMPLE_STACKED_COHORTS_FIRST_WINS: ExperienceBand[] = [
  {
    id: 'ex-endo-app',
    label: 'APP endocrinology (narrow)',
    minYoe: 0,
    maxYoe: 99,
    targetTccPercentileLow: 45,
    targetTccPercentileHigh: 70,
    populationScope: ['NP', 'PA', 'APP'],
    specialtyScope: ['Endocrinology', 'Endocrine'],
    planScope: [],
    dollarRangeAnchorPercentile: 50,
    dollarRangeMinSpreadPercent: 10,
    dollarRangeMaxSpreadPercent: 25,
    suggestBaseToHitDollarRangeMidpoint: true,
  },
  {
    id: 'ex-app-broad',
    label: 'All other APPs',
    minYoe: 0,
    maxYoe: 99,
    targetTccPercentileLow: 35,
    targetTccPercentileHigh: 60,
    populationScope: ['NP', 'PA', 'APP'],
    planScope: [],
    specialtyScope: [],
    dollarRangeAnchorPercentile: 50,
    dollarRangeMinSpreadPercent: 20,
    dollarRangeMaxSpreadPercent: 20,
  },
  {
    id: 'ex-phys-fallback',
    label: 'Physicians (fallback)',
    minYoe: 0,
    maxYoe: 99,
    targetTccPercentileLow: 40,
    targetTccPercentileHigh: 65,
    populationScope: ['Physician'],
    planScope: [],
    specialtyScope: [],
  },
];

/** Inpatient vs ambulatory using Population (must match your file’s `Population` or `Provider_Type` values). */
export const EXAMPLE_APP_BY_POPULATION_BUCKET: ExperienceBand[] = [
  {
    id: 'ex-inpt',
    label: 'APP inpatient bucket',
    minYoe: 0,
    maxYoe: 99,
    targetTccPercentileLow: 45,
    targetTccPercentileHigh: 70,
    populationScope: ['Inpatient', 'APP Inpatient'],
    planScope: [],
    specialtyScope: [],
  },
  {
    id: 'ex-amb',
    label: 'APP ambulatory bucket',
    minYoe: 0,
    maxYoe: 99,
    targetTccPercentileLow: 40,
    targetTccPercentileHigh: 65,
    populationScope: ['Ambulatory', 'APP Ambulatory'],
    planScope: [],
    specialtyScope: [],
  },
];
