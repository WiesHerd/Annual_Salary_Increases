/**
 * Build a flat facts object from ProviderRecord for policy condition evaluation.
 * Keys match JsonLogic var paths (e.g. tccPercentile, wrvuPercentile, yoe).
 */

import type { ProviderRecord } from '../../types/provider';
import type { MarketRow } from '../../types/market';
import { getEffectiveYoe } from '../effective-yoe';
import { interpolateTccPercentile } from '../calculations/percentile';

export interface PolicyFacts {
  employeeId: string;
  providerName?: string;
  providerType?: string;
  specialty?: string;
  subspecialty?: string;
  division?: string;
  department?: string;
  location?: string;
  population?: string;
  compensationPlan?: string;
  jobCode?: string;
  yoe?: number;
  totalYoe?: number;
  currentFte?: number;
  clinicalFte?: number;
  evaluationScore?: number;
  performanceCategory?: string;
  currentBaseSalary?: number;
  currentTcc?: number;
  tccPercentile?: number;
  wrvuPercentile?: number;
  currentTier?: string;
  proposedTier?: string;
  reviewStatus?: string;
  /** For condition checks (e.g. in list). */
  providerTypeLower?: string;
  specialtyLower?: string;
  divisionLower?: string;
  /** Raw APP years of experience when present on the row. */
  appYoe?: number;
}

/**
 * Build facts from a provider record (and optional market row for TCC percentile if not on record).
 */
export function buildFactsFromRecord(
  record: ProviderRecord,
  options?: { marketRow?: MarketRow }
): PolicyFacts {
  const yoe = getEffectiveYoe(record);
  const tccPercentile =
    record.Current_TCC_Percentile ??
    (options?.marketRow && record.Current_TCC_at_1FTE != null
      ? interpolateTccPercentile(record.Current_TCC_at_1FTE, options.marketRow)
      : undefined);

  const facts: PolicyFacts = {
    employeeId: record.Employee_ID,
    providerName: record.Provider_Name,
    providerType: record.Provider_Type ?? record.Population,
    specialty: record.Specialty ?? record.Market_Specialty_Override ?? record.Benchmark_Group,
    subspecialty: record.Subspecialty,
    division: record.Primary_Division,
    department: record.Department,
    location: record.Location,
    population: record.Population,
    compensationPlan: record.Compensation_Plan,
    jobCode: record.Job_Code,
    yoe: yoe != null && Number.isFinite(yoe) ? yoe : undefined,
    totalYoe: record.Total_YOE,
    appYoe:
      record.APP_YOE != null && Number.isFinite(record.APP_YOE) ? record.APP_YOE : undefined,
    currentFte: record.Current_FTE,
    clinicalFte: record.Clinical_FTE,
    evaluationScore:
      record.Evaluation_Score != null && Number.isFinite(Number(record.Evaluation_Score))
        ? Number(record.Evaluation_Score)
        : undefined,
    performanceCategory: record.Performance_Category,
    currentBaseSalary: record.Current_Base_Salary,
    currentTcc: record.Current_TCC,
    tccPercentile: tccPercentile != null && Number.isFinite(tccPercentile) ? tccPercentile : undefined,
    wrvuPercentile:
      record.WRVU_Percentile != null && Number.isFinite(record.WRVU_Percentile)
        ? record.WRVU_Percentile
        : undefined,
    currentTier: record.Current_Tier,
    proposedTier: record.Proposed_Tier,
    reviewStatus: record.Review_Status,
  };

  facts.providerTypeLower = facts.providerType?.toLowerCase();
  facts.specialtyLower = facts.specialty?.toLowerCase();
  facts.divisionLower = facts.division?.toLowerCase();

  return facts;
}
