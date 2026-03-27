import { describe, expect, it } from 'vitest';
import type { ProviderRecord } from '../types/provider';
import { sumExplicitTccComponents, withDerivedCurrentTccIfMissing } from './tcc-components';

describe('tcc-components', () => {
  it('sums explicit TCC building blocks', () => {
    const p: ProviderRecord = {
      Employee_ID: 'E1',
      Current_Base_Salary: 200_000,
      Prior_Year_WRVU_Incentive: 50_000,
      Value_Based_Payment: 10_000,
      Shift_Incentive: 5_000,
      Quality_Bonus: 2_000,
    };
    expect(sumExplicitTccComponents(p)).toBe(267_000);
  });

  it('derives Current_TCC when missing', () => {
    const p: ProviderRecord = {
      Employee_ID: 'E1',
      Current_Base_Salary: 100_000,
      Prior_Year_WRVU_Incentive: 50_000,
      Current_FTE: 0.8,
    };
    const out = withDerivedCurrentTccIfMissing(p);
    expect(out.Current_TCC).toBe(150_000);
    expect(out.Current_TCC_at_1FTE).toBe(150_000 / 0.8);
  });

  it('does not override explicit Current_TCC', () => {
    const p: ProviderRecord = {
      Employee_ID: 'E1',
      Current_Base_Salary: 100_000,
      Current_TCC: 500_000,
    };
    expect(withDerivedCurrentTccIfMissing(p)).toEqual(p);
  });
});
