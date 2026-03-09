/**
 * Normalize ProviderRecord to legacy ReviewRecord when needed.
 */

import type { ProviderRecord } from '../../types/provider';
import type { ReviewRecord } from '../../types/review';
import { ReviewStatus } from '../../types/enums';

export function providerRecordToReviewRecord(p: ProviderRecord, defaultStatus = ReviewStatus.Draft): ReviewRecord {
  return {
    providerId: { id: p.Employee_ID, externalId: p.Employee_ID },
    name: p.Provider_Name,
    specialty: p.Specialty ?? '',
    population: (p.Population as import('../../types/enums').Population) ?? ('physician' as const),
    planType: (p.Compensation_Plan as import('../../types/enums').CompensationPlanType) ?? ('wrvu' as const),
    currentTcc: p.Current_TCC ?? 0,
    currentWrvu: p.Current_Target_WRVUs ?? p.Prior_Year_WRVUs,
    fte: p.Current_FTE ?? 1,
    cycleId: p.Cycle ?? 'FY2025',
    status: (p.Review_Status as ReviewStatus) ?? defaultStatus,
    marketPosition: p.Current_TCC_Percentile != null || p.WRVU_Percentile != null
      ? { tccPercentile: p.Current_TCC_Percentile, wrvuPercentile: p.WRVU_Percentile }
      : undefined,
  };
}

export function toReviewRecords(
  providers: ProviderRecord[],
  _cycleId?: string,
  options?: { defaultStatus?: ReviewStatus }
): ReviewRecord[] {
  return providers.map((p) => providerRecordToReviewRecord(p, options?.defaultStatus));
}
