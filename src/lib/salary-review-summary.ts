/**
 * Salary review summary: aggregate increase dollars and breakdowns by dimension.
 * Used by the summary bar on the Salary Review page for budget vs actual.
 */

import type { ProviderRecord } from '../types/provider';
import type { Cycle } from '../types/cycle';
import type { BudgetSettingsRow } from '../types/budget-settings';

/** Increase dollars for one provider: proposed base - current base. */
export function getIncreaseDollars(record: ProviderRecord): number {
  const current = record.Current_Base_Salary ?? 0;
  const proposed = record.Proposed_Base_Salary ?? record.Current_Base_Salary ?? 0;
  return proposed - current;
}

export interface SummaryTotals {
  totalIncreaseDollars: number;
  totalCurrentBase: number;
  totalProposedBase: number;
  totalCurrentTcc: number;
  totalProposedTcc: number;
  /** Mean of Current_TCC_Percentile across providers with a defined value. */
  avgCurrentTccPercentile: number | undefined;
  /** Mean of Proposed_TCC_Percentile across providers with a defined value. */
  avgProposedTccPercentile: number | undefined;
  /** Number of providers with at least one TCC percentile (current or proposed). */
  providerCountWithPercentile: number;
  /** Mean of WRVU_Percentile across providers with a defined value (market productivity position). */
  avgWrvuPercentile: number | undefined;
  /** Average percent increase in base salary (only providers with current base > 0). */
  avgPercentIncrease: number | undefined;
  providerCount: number;
}

function isFiniteNum(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** Aggregate totals across all records (e.g. filtered list). */
export function computeSummary(records: ProviderRecord[]): SummaryTotals {
  let totalIncreaseDollars = 0;
  let totalCurrentBase = 0;
  let totalProposedBase = 0;
  let totalCurrentTcc = 0;
  let totalProposedTcc = 0;
  let sumCurrentPct = 0;
  let sumProposedPct = 0;
  let countCurrentPct = 0;
  let countProposedPct = 0;
  let sumPercentIncrease = 0;
  let countPercentIncrease = 0;
  let sumWrvuPct = 0;
  let countWrvuPct = 0;
  for (const r of records) {
    totalIncreaseDollars += getIncreaseDollars(r);
    totalCurrentBase += r.Current_Base_Salary ?? 0;
    totalProposedBase += r.Proposed_Base_Salary ?? r.Current_Base_Salary ?? 0;
    totalCurrentTcc += r.Current_TCC ?? 0;
    totalProposedTcc += r.Proposed_TCC ?? r.Current_TCC ?? 0;
    if (isFiniteNum(r.Current_TCC_Percentile)) {
      sumCurrentPct += r.Current_TCC_Percentile;
      countCurrentPct += 1;
    }
    if (isFiniteNum(r.Proposed_TCC_Percentile)) {
      sumProposedPct += r.Proposed_TCC_Percentile;
      countProposedPct += 1;
    }
    const current = r.Current_Base_Salary ?? 0;
    if (current > 0) {
      const pct = (getIncreaseDollars(r) / current) * 100;
      sumPercentIncrease += pct;
      countPercentIncrease += 1;
    }
    if (isFiniteNum(r.WRVU_Percentile)) {
      sumWrvuPct += r.WRVU_Percentile;
      countWrvuPct += 1;
    }
  }
  const providerCountWithPercentile = records.filter(
    (r) => isFiniteNum(r.Current_TCC_Percentile) || isFiniteNum(r.Proposed_TCC_Percentile)
  ).length;
  return {
    totalIncreaseDollars,
    totalCurrentBase,
    totalProposedBase,
    totalCurrentTcc,
    totalProposedTcc,
    avgCurrentTccPercentile: countCurrentPct > 0 ? sumCurrentPct / countCurrentPct : undefined,
    avgProposedTccPercentile: countProposedPct > 0 ? sumProposedPct / countProposedPct : undefined,
    providerCountWithPercentile,
    avgWrvuPercentile: countWrvuPct > 0 ? sumWrvuPct / countWrvuPct : undefined,
    avgPercentIncrease:
      countPercentIncrease > 0 ? sumPercentIncrease / countPercentIncrease : undefined,
    providerCount: records.length,
  };
}

export type SummaryDimension = 'division' | 'department' | 'population' | 'specialty' | 'planType';

const DIMENSION_FIELD: Record<SummaryDimension, keyof ProviderRecord> = {
  division: 'Primary_Division',
  department: 'Department',
  population: 'Population',
  specialty: 'Specialty',
  planType: 'Compensation_Plan',
};

export interface SummaryRow {
  key: string;
  totalIncreaseDollars: number;
  totalCurrentBase: number;
  totalProposedBase: number;
  totalCurrentTcc: number;
  totalProposedTcc: number;
  /** Mean current TCC percentile for this group (undefined if none). */
  avgCurrentTccPercentile: number | undefined;
  /** Mean proposed TCC percentile for this group (undefined if none). */
  avgProposedTccPercentile: number | undefined;
  providerCount: number;
}

/** Group records by dimension and compute summary per group. Keys blank/empty; caller can display as "—". */
export function computeSummaryByDimension(
  records: ProviderRecord[],
  dimension: SummaryDimension
): SummaryRow[] {
  const field = DIMENSION_FIELD[dimension];
  const map = new Map<
    string,
    {
      totalIncrease: number;
      totalCurrent: number;
      totalProposed: number;
      totalCurrentTcc: number;
      totalProposedTcc: number;
      sumCurrentPct: number;
      sumProposedPct: number;
      countCurrentPct: number;
      countProposedPct: number;
      count: number;
    }
  >();

  for (const r of records) {
    const raw = r[field];
    const key = raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
    const existing = map.get(key);
    const inc = getIncreaseDollars(r);
    const cur = r.Current_Base_Salary ?? 0;
    const prop = r.Proposed_Base_Salary ?? r.Current_Base_Salary ?? 0;
    const curTcc = r.Current_TCC ?? 0;
    const propTcc = r.Proposed_TCC ?? r.Current_TCC ?? 0;
    const curPct = isFiniteNum(r.Current_TCC_Percentile) ? r.Current_TCC_Percentile : null;
    const propPct = isFiniteNum(r.Proposed_TCC_Percentile) ? r.Proposed_TCC_Percentile : null;
    if (existing) {
      existing.totalIncrease += inc;
      existing.totalCurrent += cur;
      existing.totalProposed += prop;
      existing.totalCurrentTcc += curTcc;
      existing.totalProposedTcc += propTcc;
      if (curPct != null) {
        existing.sumCurrentPct += curPct;
        existing.countCurrentPct += 1;
      }
      if (propPct != null) {
        existing.sumProposedPct += propPct;
        existing.countProposedPct += 1;
      }
      existing.count += 1;
    } else {
      map.set(key, {
        totalIncrease: inc,
        totalCurrent: cur,
        totalProposed: prop,
        totalCurrentTcc: curTcc,
        totalProposedTcc: propTcc,
        sumCurrentPct: curPct ?? 0,
        sumProposedPct: propPct ?? 0,
        countCurrentPct: curPct != null ? 1 : 0,
        countProposedPct: propPct != null ? 1 : 0,
        count: 1,
      });
    }
  }

  const rows: SummaryRow[] = [];
  for (const [key, v] of map.entries()) {
    rows.push({
      key,
      totalIncreaseDollars: v.totalIncrease,
      totalCurrentBase: v.totalCurrent,
      totalProposedBase: v.totalProposed,
      totalCurrentTcc: v.totalCurrentTcc,
      totalProposedTcc: v.totalProposedTcc,
      avgCurrentTccPercentile: v.countCurrentPct > 0 ? v.sumCurrentPct / v.countCurrentPct : undefined,
      avgProposedTccPercentile: v.countProposedPct > 0 ? v.sumProposedPct / v.countProposedPct : undefined,
      providerCount: v.count,
    });
  }
  rows.sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : a.key.localeCompare(b.key)));
  return rows;
}

/** Resolve budget amount for a cycle: prefer budgetSettings, then cycles. */
export function resolveBudgetForCycle(
  cycleId: string,
  budgetSettings: BudgetSettingsRow[],
  cycles: Cycle[]
): number | undefined {
  const fromSettings = budgetSettings.find((b) => b.cycleId === cycleId)?.budgetTargetAmount;
  if (fromSettings != null && Number.isFinite(fromSettings)) return fromSettings;
  const fromCycle = cycles.find((c) => c.id === cycleId)?.budgetTargetAmount;
  if (fromCycle != null && Number.isFinite(fromCycle)) return fromCycle;
  return undefined;
}
