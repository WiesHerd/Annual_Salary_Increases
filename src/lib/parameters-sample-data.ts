/**
 * Sample/fake parameter data for Parameters screens when no data is saved.
 * Lets you see and adjust the UI with realistic placeholder values.
 */

import type { Cycle } from '../types/cycle';
import type { MeritMatrixRow } from '../types/merit-matrix-row';
import type { ExperienceBand } from '../types/experience-band';
import type { PcpPhysicianTierRow } from '../types/pcp-tier';
import type { PcpAppRuleRow } from '../types/pcp-app-rules';
import type { PlanAssignmentRuleRow } from '../types/plan-assignment-row';
import type { AppCombinedGroupRow } from '../types/app-combined-group';
import type { BudgetSettingsRow } from '../types/budget-settings';
import type { CfBySpecialtyRow } from '../types/cf-by-specialty';
import { CompensationPlanType } from '../types/enums';

export const SAMPLE_CYCLES: Cycle[] = [
  { id: 'cycle-fy2026', label: 'FY 2026', effectiveDate: '2026-07-01', budgetTargetAmount: 2_400_000, budgetTargetPercent: 3.5, currency: 'USD' },
  { id: 'cycle-fy2025', label: 'FY 2025', effectiveDate: '2025-07-01', budgetTargetAmount: 2_100_000, budgetTargetPercent: 3.25, currency: 'USD' },
];

export const SAMPLE_MERIT_MATRIX: MeritMatrixRow[] = [
  { id: 'merit-1', evaluationScore: 5, performanceLabel: 'Exceeds', defaultIncreasePercent: 4.5, notes: 'Top tier' },
  { id: 'merit-2', evaluationScore: 4, performanceLabel: 'Strongly Meets', defaultIncreasePercent: 3.75, notes: '' },
  { id: 'merit-3', evaluationScore: 3, performanceLabel: 'Meets', defaultIncreasePercent: 3.0, notes: 'Standard' },
  { id: 'merit-4', evaluationScore: 2, performanceLabel: 'Partially Meets', defaultIncreasePercent: 2.0, notes: '' },
  { id: 'merit-5', evaluationScore: 1, performanceLabel: 'Below', defaultIncreasePercent: 0.5, notes: 'PIP consideration' },
];

export const SAMPLE_EXPERIENCE_BANDS: ExperienceBand[] = [
  { id: 'band-1', label: '0–2 YOE', minYoe: 0, maxYoe: 2, targetTccPercentileLow: 25, targetTccPercentileHigh: 50, suggestBaseToHitTarget: true },
  { id: 'band-2', label: '3–5 YOE', minYoe: 3, maxYoe: 5, targetTccPercentileLow: 50, targetTccPercentileHigh: 75 },
  { id: 'band-3', label: '6–10 YOE', minYoe: 6, maxYoe: 10, targetTccPercentileLow: 50, targetTccPercentileHigh: 75 },
  { id: 'band-4', label: '11+ YOE', minYoe: 11, maxYoe: 99, targetTccPercentileLow: 75, targetTccPercentileHigh: 90 },
];

export const SAMPLE_PCP_TIER_SETTINGS: PcpPhysicianTierRow[] = [
  { id: 'tier-1', tierName: 'Tier 1 (0–2 YOE)', minYoe: 0, maxYoe: 2, baseSalary: 195_000, division: 'Primary Care', active: true },
  { id: 'tier-2', tierName: 'Tier 2 (3–5 YOE)', minYoe: 3, maxYoe: 5, baseSalary: 215_000, division: 'Primary Care', active: true },
  { id: 'tier-3', tierName: 'Tier 3 (6+ YOE)', minYoe: 6, maxYoe: 99, baseSalary: 235_000, division: 'Primary Care', active: true },
  { id: 'tier-4', tierName: 'Tier 1', minYoe: 0, maxYoe: 3, baseSalary: 185_000, division: 'Pediatrics', active: true },
  { id: 'tier-5', tierName: 'Tier 2', minYoe: 4, maxYoe: 99, baseSalary: 210_000, division: 'Pediatrics', active: true },
];

export const SAMPLE_PCP_APP_RULES: PcpAppRuleRow[] = [
  { id: 'app-1', division: 'Primary Care', fixedTarget: 125_000, defaultCurrentCf: 0.42, defaultProposedCf: 0.45, allowOverride: true },
  { id: 'app-2', division: 'Pediatrics', fixedTarget: 115_000, defaultCurrentCf: 0.40, defaultProposedCf: 0.43, allowOverride: true },
  { id: 'app-3', division: 'Urgent Care', fixedTarget: 118_000, defaultCurrentCf: 0.41, defaultProposedCf: 0.44, allowOverride: false },
];

export const SAMPLE_PLAN_ASSIGNMENT_RULES: PlanAssignmentRuleRow[] = [
  { id: 'plan-1', population: 'physician', division: 'Primary Care', assignedPlanType: CompensationPlanType.Hybrid, priority: 10 },
  { id: 'plan-2', population: 'physician', division: 'Pediatrics', assignedPlanType: CompensationPlanType.Hybrid, priority: 10 },
  { id: 'plan-3', population: 'app', division: 'Primary Care', assignedPlanType: CompensationPlanType.Salary, priority: 20 },
  { id: 'plan-4', population: 'app', benchmarkGroup: 'APP Primary Care', assignedPlanType: CompensationPlanType.Salary, priority: 5 },
  { id: 'plan-5', jobCode: 'HOURLY-*', assignedPlanType: CompensationPlanType.Hourly, priority: 100 },
];

/** APP combined groups: blend multiple survey specialties into one benchmark (many-to-one). */
export const SAMPLE_APP_COMBINED_GROUPS: AppCombinedGroupRow[] = [
  {
    id: 'cg-1',
    combinedGroupName: 'Medical Specialty Combined',
    surveySpecialties: ['Medical Inpatient', 'Medical Outpatient', 'Medical Specialty'],
  },
  { id: 'cg-2', combinedGroupName: 'NP:PA Combined Psychiatry', surveySpecialties: ['Psychiatry'] },
];

/** Provider_Type → survey ID mapping. */
export const SAMPLE_PROVIDER_TYPE_TO_SURVEY: Record<string, string> = {
  Physician: 'physicians',
  APP: 'physicians',
  'Mental Health Therapist': 'mental-health-therapists',
};

export const SAMPLE_CF_BY_SPECIALTY: CfBySpecialtyRow[] = [
  { id: 'cf-1', specialty: 'Cardiology', currentCf: 65, proposedCf: 68 },
  { id: 'cf-2', specialty: 'Orthopedics', currentCf: 72, proposedCf: 75 },
  { id: 'cf-3', specialty: 'Primary Care', currentCf: 58, proposedCf: 60 },
  { id: 'cf-4', specialty: 'Pediatrics', currentCf: 55, proposedCf: 57 },
  { id: 'cf-5', specialty: 'General Surgery', currentCf: 70, proposedCf: 73 },
];

export const SAMPLE_BUDGET_SETTINGS: BudgetSettingsRow[] = [
  { id: 'budget-1', cycleId: 'cycle-fy2026', cycleLabel: 'FY 2026', budgetTargetAmount: 2_400_000, budgetTargetPercent: 3.5, warningThresholdPercent: 95, hardStopThresholdPercent: 100 },
  { id: 'budget-2', cycleId: 'cycle-fy2025', cycleLabel: 'FY 2025', budgetTargetAmount: 2_100_000, budgetTargetPercent: 3.25, warningThresholdPercent: 95, hardStopThresholdPercent: 102 },
];
