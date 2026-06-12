import { describe, it, expect } from 'vitest';
import type { ProviderRecord } from '../types/provider';
import { computeBudgetScalePreview, buildBudgetScalePatches } from './budget-allocator';

function rec(id: string, current: number, proposed: number): ProviderRecord {
  return {
    Employee_ID: id,
    Current_Base_Salary: current,
    Proposed_Base_Salary: proposed,
  };
}

describe('budget-allocator', () => {
  it('returns scale factor when over budget', () => {
    const records = [rec('a', 200_000, 210_000), rec('b', 150_000, 157_500)];
    const preview = computeBudgetScalePreview(records, 10_000);
    expect(preview).not.toBeNull();
    expect(preview!.totalIncreaseDollars).toBe(17_500);
    expect(preview!.overBudget).toBe(true);
    expect(preview!.scaleFactor).toBeCloseTo(10_000 / 17_500, 5);
    expect(preview!.eligibleCount).toBe(2);
  });

  it('returns factor 1 when within budget', () => {
    const records = [rec('a', 200_000, 205_000)];
    const preview = computeBudgetScalePreview(records, 50_000);
    expect(preview!.overBudget).toBe(false);
    expect(preview!.scaleFactor).toBe(1);
  });

  it('buildBudgetScalePatches scales approved amounts', () => {
    const records = [rec('a', 200_000, 220_000), rec('b', 100_000, 100_000)];
    const patches = buildBudgetScalePatches(records, 0.5);
    expect(patches.size).toBe(1);
    expect(patches.get('a')?.Approved_Increase_Amount).toBe(10_000);
    expect(patches.get('a')?.Budget_Scale_Factor).toBe(0.5);
  });
});
