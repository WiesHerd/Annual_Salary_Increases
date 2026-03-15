/**
 * Review cycle: one period (e.g. FY2026) for which compensation is reviewed.
 * Links all provider review records and budget target.
 */

export interface Cycle {
  id: string;
  label: string;
  /** Effective date of changes (ISO date). */
  effectiveDate?: string;
  /** Target increase pool amount for the cycle. */
  budgetTargetAmount?: number;
  /** Optional target as percent of current total comp. */
  budgetTargetPercent?: number;
  currency?: string;
}
