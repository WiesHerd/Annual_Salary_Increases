/**
 * Total cash compensation (TCC) building blocks aligned with typical physician survey definitions
 * (e.g. Sullivan Cotter): base + productivity incentives + value/quality + stipends + other recurring.
 * Does not include CF×wRVU imputation — that path is modeled separately in recalculateProviderRow.
 */

import type { ProviderRecord } from '../types/provider';

/** Sum of uploaded / explicit cash components (annual, actual FTE). */
export function sumExplicitTccComponents(p: ProviderRecord): number {
  return (
    (p.Current_Base_Salary ?? 0) +
    (p.Prior_Year_WRVU_Incentive ?? 0) +
    (p.Value_Based_Payment ?? 0) +
    (p.Shift_Incentive ?? 0) +
    (p.Division_Chief_Pay ?? 0) +
    (p.Medical_Director_Pay ?? 0) +
    (p.Teaching_Pay ?? 0) +
    (p.PSQ_Pay ?? 0) +
    (p.Quality_Bonus ?? 0) +
    (p.Other_Recurring_Comp ?? 0) +
    (p.TCC_Other_Clinical_1 ?? 0) +
    (p.TCC_Other_Clinical_2 ?? 0) +
    (p.TCC_Other_Clinical_3 ?? 0)
  );
}

/**
 * When Current_TCC is absent, set Current_TCC and Current_TCC_at_1FTE from summed components.
 * Assumes component dollars are at the provider's current FTE (same convention as base salary).
 */
export function withDerivedCurrentTccIfMissing(p: ProviderRecord): ProviderRecord {
  if (p.Current_TCC != null && Number.isFinite(p.Current_TCC)) return p;
  const sum = sumExplicitTccComponents(p);
  if (sum <= 0) return p;
  const fte = p.Current_FTE ?? 1;
  const at1 = fte > 0 ? sum / fte : sum;
  return { ...p, Current_TCC: sum, Current_TCC_at_1FTE: at1 };
}

export function mapProvidersWithDerivedTcc(rows: ProviderRecord[]): ProviderRecord[] {
  return rows.map(withDerivedCurrentTccIfMissing);
}
