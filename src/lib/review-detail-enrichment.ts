/**
 * Build TCC breakdown and driver summary from ProviderRecord for the detail panel.
 */

import type { ProviderRecord } from '../types/provider';
import type { TccComponent } from '../types/provider-review-record';

export interface ReviewDetailEnrichment {
  currentTccBreakdown: TccComponent[];
  proposedTccBreakdown: TccComponent[];
  driverSummary: string;
}

function supplementalComponents(p: ProviderRecord): TccComponent[] {
  const out: TccComponent[] = [];
  if (p.Division_Chief_Pay && p.Division_Chief_Pay !== 0) out.push({ label: 'Division Chief', amount: p.Division_Chief_Pay, key: 'division_chief' });
  if (p.Medical_Director_Pay && p.Medical_Director_Pay !== 0) out.push({ label: 'Medical Director', amount: p.Medical_Director_Pay, key: 'medical_director' });
  if (p.Teaching_Pay && p.Teaching_Pay !== 0) out.push({ label: 'Teaching', amount: p.Teaching_Pay, key: 'teaching' });
  if (p.PSQ_Pay && p.PSQ_Pay !== 0) out.push({ label: 'PSQ', amount: p.PSQ_Pay, key: 'psq' });
  if (p.Quality_Bonus && p.Quality_Bonus !== 0) out.push({ label: 'Quality Bonus', amount: p.Quality_Bonus, key: 'quality' });
  if (p.Other_Recurring_Comp && p.Other_Recurring_Comp !== 0) out.push({ label: 'Other recurring', amount: p.Other_Recurring_Comp, key: 'other' });
  return out;
}

function productivityAmount(cf: number, p: ProviderRecord): number {
  const wrvu = p.Prior_Year_WRVUs ?? p.Normalized_WRVUs ?? p.Adjusted_WRVUs ?? 0;
  return cf * wrvu;
}

/**
 * Build current and proposed TCC breakdown plus a short driver summary from a ProviderRecord.
 */
export function enrichReviewDetail(record: ProviderRecord): ReviewDetailEnrichment {
  const baseCurrent = record.Current_Base_Salary ?? 0;
  const baseProposed = record.Proposed_Base_Salary ?? record.Current_Base_Salary ?? 0;
  const cfCurrent = record.Current_CF ?? 0;
  const cfProposed = record.Proposed_CF ?? record.Current_CF ?? 0;
  const prodCurrent = productivityAmount(cfCurrent, record);
  const prodProposed = productivityAmount(cfProposed, record);
  const supplemental = supplementalComponents(record);

  const currentTccBreakdown: TccComponent[] = [
    { label: 'Base salary', amount: baseCurrent, key: 'base' },
    { label: 'Productivity (CF × wRVU)', amount: prodCurrent, key: 'productivity' },
    ...supplemental,
  ].filter((c) => c.amount !== 0 || c.key === 'base');

  const proposedTccBreakdown: TccComponent[] = [
    { label: 'Base salary', amount: baseProposed, key: 'base' },
    { label: 'Productivity (CF × wRVU)', amount: prodProposed, key: 'productivity' },
    ...supplemental,
  ].filter((c) => c.amount !== 0 || c.key === 'base');

  const parts: string[] = [];
  parts.push(`Base salary $${baseProposed.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
  if (prodProposed > 0) parts.push(`productivity (CF × wRVU) $${prodProposed.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
  const suppTotal = supplemental.reduce((s, c) => s + c.amount, 0);
  if (suppTotal > 0) parts.push(`supplemental $${suppTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
  const driverSummary = parts.join(', ') + '.';

  return {
    currentTccBreakdown,
    proposedTccBreakdown,
    driverSummary,
  };
}
