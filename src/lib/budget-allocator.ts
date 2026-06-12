/**
 * Scale merit increases proportionally to fit a cycle budget pool.
 */

import type { ProviderRecord } from '../types/provider';
import { getIncreaseDollars } from './salary-review-summary';

export interface BudgetScalePreview {
  totalIncreaseDollars: number;
  budgetAmount: number;
  scaleFactor: number;
  /** Providers with a positive increase in scope. */
  eligibleCount: number;
  overBudget: boolean;
}

/** Compute uniform scale factor to bring total increases to budget (≤ 1 when over budget). */
export function computeBudgetScalePreview(
  records: ProviderRecord[],
  budgetAmount: number
): BudgetScalePreview | null {
  if (!Number.isFinite(budgetAmount) || budgetAmount <= 0) return null;

  let totalIncreaseDollars = 0;
  let eligibleCount = 0;
  for (const r of records) {
    const inc = getIncreaseDollars(r);
    totalIncreaseDollars += inc;
    if (inc > 0) eligibleCount += 1;
  }

  if (eligibleCount === 0 || totalIncreaseDollars <= 0) {
    return {
      totalIncreaseDollars: 0,
      budgetAmount,
      scaleFactor: 1,
      eligibleCount: 0,
      overBudget: false,
    };
  }

  const overBudget = totalIncreaseDollars > budgetAmount;
  const scaleFactor = overBudget ? budgetAmount / totalIncreaseDollars : 1;

  return {
    totalIncreaseDollars,
    budgetAmount,
    scaleFactor,
    eligibleCount,
    overBudget,
  };
}

export interface ApplyBudgetScaleOptions {
  /** When true, providers with zero or negative increase are unchanged. Default true. */
  skipNonPositive?: boolean;
}

/**
 * Return updated field patches per employee id after proportional budget scaling.
 * Sets Approved_Increase_Amount and clears Approved_Increase_Percent.
 */
export function buildBudgetScalePatches(
  records: ProviderRecord[],
  scaleFactor: number,
  options: ApplyBudgetScaleOptions = {}
): Map<string, Partial<ProviderRecord>> {
  const skipNonPositive = options.skipNonPositive ?? true;
  const patches = new Map<string, Partial<ProviderRecord>>();

  if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) return patches;

  for (const r of records) {
    const increase = getIncreaseDollars(r);
    if (skipNonPositive && increase <= 0) continue;

    const scaled = increase * scaleFactor;
    patches.set(r.Employee_ID, {
      Approved_Increase_Amount: scaled,
      Approved_Increase_Percent: undefined,
      Budget_Scale_Factor: scaleFactor < 1 ? scaleFactor : undefined,
    });
  }

  return patches;
}
