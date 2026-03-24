/**
 * Parse a raw row into ProviderRecord using column mapping.
 * All ProviderRecord keys are supported; only Employee_ID is required for the row to be valid.
 */

import type { RawRow, ProviderColumnMapping } from '../types';
import type { ProviderRecord } from '../types/provider';
import {
  loadLearnedProviderMapping,
  applyLearnedProviderMapping,
} from './column-mapping-storage';

function getCell(row: RawRow, col: string | undefined): string | number | undefined {
  if (col == null || col === '') return undefined;
  const v = row[col];
  if (v === '' || v === null || v === undefined) return undefined;
  return v;
}

function num(val: string | number | undefined): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,$]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function str(val: string | number | undefined): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s === '' ? undefined : s;
}

/** Keys that are numeric (all others are string). */
const NUMERIC_KEYS = new Set<keyof ProviderRecord>([
  'Years_of_Experience', 'APP_YOE', 'RN_YOE', 'Total_YOE', 'Percent_of_Year_Employed',
  'Current_FTE', 'Clinical_FTE', 'Administrative_FTE', 'Research_FTE', 'Teaching_FTE',
  'Current_Base_Salary', 'Current_Salary_at_1FTE', 'Current_TCC', 'Current_TCC_at_1FTE', 'Current_CF',
  'Current_Target_WRVUs', 'Current_Threshold', 'Current_TCC_Percentile', 'Current_Compa_Ratio',
  'Proposed_Base_Salary', 'Proposed_Salary_at_1FTE', 'Proposed_CF', 'Proposed_Target_WRVUs', 'Proposed_Threshold',
  'Proposed_TCC', 'Proposed_TCC_at_1FTE', 'Proposed_TCC_Percentile', 'Proposed_Compa_Ratio',
  'Prior_Year_WRVUs', 'Adjusted_WRVUs', 'Normalized_WRVUs', 'WRVU_Percentile',
  'Prior_Year_WRVU_Incentive', 'Division_Chief_Pay', 'Medical_Director_Pay', 'Teaching_Pay', 'PSQ_Pay', 'Quality_Bonus', 'Other_Recurring_Comp',
  'Tier_Base_Salary', 'Fixed_Productivity_Target', 'CF_Override', 'Target_Override',
  'Evaluation_Score', 'Default_Increase_Percent', 'Approved_Increase_Percent', 'Approved_Increase_Amount',
  'Applied_Increase_Percent', 'Merit_Increase_Amount',
  'Market_TCC_25', 'Market_TCC_50', 'Market_TCC_75', 'Market_TCC_90',
  'Market_WRVU_25', 'Market_WRVU_50', 'Market_WRVU_75', 'Market_WRVU_90',
  'Estimated_TCC_from_WRVU_Percentile', 'WRVU_to_TCC_Ratio', 'TCC_WRVU_Gap', 'Estimated_Pay_Gap',
]);

/** All ProviderRecord keys that can be mapped from upload (wide roster; includes fields often filled later by the app or joins). */
export const PROVIDER_RECORD_KEYS: (keyof ProviderRecord)[] = [
  'Employee_ID', 'Provider_Name', 'Primary_Division', 'Department', 'Location', 'Job_Code', 'Provider_Type',
  'Specialty', 'Benchmark_Group', 'Population', 'Compensation_Plan', 'Cycle',
  'Hire_Date', 'Adjusted_Hire_Date', 'Residency_Graduation_Date', 'RN_Start_Date', 'RN_End_Date', 'Non_RN_Start_Date',
  'Years_of_Experience', 'APP_YOE', 'RN_YOE', 'Total_YOE', 'Percent_of_Year_Employed',
  'Current_FTE', 'Clinical_FTE', 'Administrative_FTE', 'Research_FTE', 'Teaching_FTE',
  'Current_Base_Salary', 'Current_Salary_at_1FTE', 'Current_TCC', 'Current_TCC_at_1FTE', 'Current_CF',
  'Current_Target_WRVUs', 'Current_Threshold', 'Current_TCC_Percentile', 'Current_Compa_Ratio',
  'Proposed_Base_Salary', 'Proposed_Salary_at_1FTE', 'Proposed_CF', 'Proposed_Target_WRVUs', 'Proposed_Threshold',
  'Proposed_TCC', 'Proposed_TCC_at_1FTE', 'Proposed_TCC_Percentile', 'Proposed_Compa_Ratio',
  'Prior_Year_WRVUs', 'Adjusted_WRVUs', 'Normalized_WRVUs', 'WRVU_Percentile',
  'Prior_Year_WRVU_Incentive', 'Division_Chief_Pay', 'Medical_Director_Pay', 'Teaching_Pay', 'PSQ_Pay', 'Quality_Bonus', 'Other_Recurring_Comp',
  'Tier_System', 'Current_Tier', 'Proposed_Tier', 'Tier_Override', 'Tier_Base_Salary',
  'Fixed_Productivity_Target', 'CF_Override', 'Target_Override',
  'Evaluation_Score', 'Performance_Category', 'Default_Increase_Percent', 'Approved_Increase_Percent', 'Approved_Increase_Amount',
  'Applied_Increase_Percent', 'Merit_Increase_Amount', 'Pay_Change_Indicator',
  'Market_TCC_25', 'Market_TCC_50', 'Market_TCC_75', 'Market_TCC_90',
  'Market_WRVU_25', 'Market_WRVU_50', 'Market_WRVU_75', 'Market_WRVU_90',
  'Estimated_TCC_from_WRVU_Percentile', 'WRVU_to_TCC_Ratio', 'TCC_WRVU_Gap', 'Estimated_Pay_Gap',
  'Review_Status', 'Reviewer', 'Review_Date', 'Notes', 'Adjustment_Rationale',
];

export function parseProviderRow(
  row: RawRow,
  mapping: ProviderColumnMapping,
  index: number,
  errors: string[]
): ProviderRecord | null {
  const record: Record<string, unknown> = {};
  for (const key of PROVIDER_RECORD_KEYS) {
    const col = mapping[key];
    if (col == null) continue;
    const raw = getCell(row, col);
    if (raw === undefined) continue;
    if (NUMERIC_KEYS.has(key as keyof ProviderRecord)) {
      const n = num(raw);
      if (n !== undefined) record[key] = n;
    } else {
      const s = str(raw);
      if (s !== undefined) record[key] = s;
    }
  }
  const employeeId = str(getCell(row, mapping.Employee_ID)) ?? str(getCell(row, mapping['Employee ID'])) ?? record.Employee_ID as string | undefined;
  if (!employeeId) {
    errors.push(`Row ${index + 1}: missing Employee_ID`);
    return null;
  }
  record.Employee_ID = employeeId;
  return record as unknown as ProviderRecord;
}

/** Build default provider column mapping from headers (match by label similarity). */
export function buildDefaultProviderMapping(headers: string[]): ProviderColumnMapping {
  const m: ProviderColumnMapping = {};
  const lower = (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_');
  const norm = (h: string) => h.trim().toLowerCase().replace(/\s+/g, ' ');
  for (const h of headers) {
    const l = norm(h);
    const u = lower(h);
    // Exact or near-exact matches for identity and common fields
    if ((u.includes('employee') && u.includes('id') || u === 'emp_id' || u === 'empid') && !m.Employee_ID) m.Employee_ID = h;
    else if ((l.includes('provider name') || l === 'name') && !m.Provider_Name) m.Provider_Name = h;
    else if (l.includes('primary division') && !m.Primary_Division) m.Primary_Division = h;
    else if (l.includes('department') && !m.Department) m.Department = h;
    else if (l.includes('location') && !m.Location) m.Location = h;
    else if (l.includes('job code') && !m.Job_Code) m.Job_Code = h;
    else if (l.includes('provider type') && !m.Provider_Type) m.Provider_Type = h;
    else if ((l.includes('specialty') || l.includes('spec')) && !m.Specialty) m.Specialty = h;
    else if (l.includes('benchmark group') && !m.Benchmark_Group) m.Benchmark_Group = h;
    else if ((l.includes('population') || l.includes('provider type')) && !m.Population) m.Population = h;
    else if ((l.includes('compensation plan') || l.includes('comp plan')) && !m.Compensation_Plan) m.Compensation_Plan = h;
    else if (l.includes('cycle') && !m.Cycle) m.Cycle = h;
    else if (l.includes('hire date') && !l.includes('adjusted') && !m.Hire_Date) m.Hire_Date = h;
    else if (l.includes('adjusted hire date') && !m.Adjusted_Hire_Date) m.Adjusted_Hire_Date = h;
    else if (l.includes('residency graduation') && !m.Residency_Graduation_Date) m.Residency_Graduation_Date = h;
    else if (l.includes('years of experience') && !m.Years_of_Experience) m.Years_of_Experience = h;
    else if (l.includes('current fte') && !m.Current_FTE) m.Current_FTE = h;
    else if (l.includes('clinical fte') && !m.Clinical_FTE) m.Clinical_FTE = h;
    else if (l.includes('current base salary') && !m.Current_Base_Salary) m.Current_Base_Salary = h;
    else if (l.includes('current tcc') && !l.includes('percentile') && !l.includes('at_1fte') && !m.Current_TCC) m.Current_TCC = h;
    else if ((l.includes('current cf') || l.includes('current conversion factor') || (l.includes('conversion factor') && !l.includes('proposed'))) && !m.Current_CF) m.Current_CF = h;
    else if ((l.includes('proposed cf') || l.includes('proposed conversion factor')) && !m.Proposed_CF) m.Proposed_CF = h;
    else if ((l === 'cf' || l === 'conversion factor') && !m.Current_CF) m.Current_CF = h;
    else if (l.includes('current target wrvu') && !m.Current_Target_WRVUs) m.Current_Target_WRVUs = h;
    else if (l.includes('current tcc percentile') && !m.Current_TCC_Percentile) m.Current_TCC_Percentile = h;
    else if (l.includes('proposed base salary') && !m.Proposed_Base_Salary) m.Proposed_Base_Salary = h;
    else if (l.includes('proposed tcc') && !l.includes('percentile') && !m.Proposed_TCC) m.Proposed_TCC = h;
    else if (l.includes('prior year wrvu') && !m.Prior_Year_WRVUs) m.Prior_Year_WRVUs = h;
    else if (l.includes('wrvu percentile') && !m.WRVU_Percentile) m.WRVU_Percentile = h;
    else if (l.includes('division chief pay') && !m.Division_Chief_Pay) m.Division_Chief_Pay = h;
    else if ((l.includes('evaluation score') || l.includes('eval_score')) && !m.Evaluation_Score) m.Evaluation_Score = h;
    else if ((l.includes('performance category') || l.includes('performance_category') || l.includes('perf category')) && !m.Performance_Category) m.Performance_Category = h;
    else if (l.includes('review status') && !m.Review_Status) m.Review_Status = h;
    else if (l.includes('reviewer') && !m.Reviewer) m.Reviewer = h;
    else if (l.includes('review date') && !m.Review_Date) m.Review_Date = h;
    else if (l.includes('notes') && !m.Notes) m.Notes = h;
    // Market positioning columns
    else if (l.includes('market_tcc_25') || (l.includes('market') && l.includes('tcc') && l.includes('25'))) m.Market_TCC_25 = h;
    else if (l.includes('market_tcc_50') || (l.includes('market') && l.includes('tcc') && l.includes('50'))) m.Market_TCC_50 = h;
    else if (l.includes('market_tcc_75') || (l.includes('market') && l.includes('tcc') && l.includes('75'))) m.Market_TCC_75 = h;
    else if (l.includes('market_tcc_90') || (l.includes('market') && l.includes('tcc') && l.includes('90'))) m.Market_TCC_90 = h;
    else if (l.includes('market_wrvu_25') || (l.includes('market') && l.includes('wrvu') && l.includes('25'))) m.Market_WRVU_25 = h;
    else if (l.includes('market_wrvu_50') || (l.includes('market') && l.includes('wrvu') && l.includes('50'))) m.Market_WRVU_50 = h;
    else if (l.includes('market_wrvu_75') || (l.includes('market') && l.includes('wrvu') && l.includes('75'))) m.Market_WRVU_75 = h;
    else if (l.includes('market_wrvu_90') || (l.includes('market') && l.includes('wrvu') && l.includes('90'))) m.Market_WRVU_90 = h;
  }
  // Fallback: if header exactly matches a key (with space or underscore), map it
  for (const h of headers) {
    const key = h.trim().replace(/\s+/g, '_') as keyof ProviderRecord;
    if (PROVIDER_RECORD_KEYS.includes(key) && m[key] === undefined) m[key] = h;
  }
  // Apply learned mappings (user's past choices) when source header exists in file
  const learned = loadLearnedProviderMapping();
  return applyLearnedProviderMapping(m, headers, learned) as ProviderColumnMapping;
}
