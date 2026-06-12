import { describe, expect, it } from 'vitest';
import type { ProviderRecord } from '../types/provider';
import { defaultTccCalculationSettings } from '../types/tcc-calculation';
import { applyDerivedCurrentTcc, sumExplicitTccComponents } from './tcc-components';

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

  it('derives Current_TCC from components', () => {
    const p: ProviderRecord = {
      Employee_ID: 'E1',
      Current_Base_Salary: 100_000,
      Prior_Year_WRVU_Incentive: 50_000,
      Current_FTE: 0.8,
    };
    const out = applyDerivedCurrentTcc(p);
    expect(out.Current_TCC).toBe(150_000);
    expect(out.Current_TCC_at_1FTE).toBe(150_000 / 0.8);
  });

  it('overrides stale uploaded Current_TCC with computed sum', () => {
    const p: ProviderRecord = {
      Employee_ID: 'E1',
      Current_Base_Salary: 100_000,
      Current_TCC: 500_000,
    };
    const out = applyDerivedCurrentTcc(p);
    expect(out.Current_TCC).toBe(100_000);
  });

  it('respects disabled components in settings', () => {
    const settings = defaultTccCalculationSettings();
    settings.componentIncluded.Prior_Year_WRVU_Incentive = false;
    const p: ProviderRecord = {
      Employee_ID: 'E1',
      Current_Base_Salary: 100_000,
      Prior_Year_WRVU_Incentive: 50_000,
    };
    expect(sumExplicitTccComponents(p, settings)).toBe(100_000);
    expect(applyDerivedCurrentTcc(p, settings).Current_TCC).toBe(100_000);
  });

  it('derives Current_TCC_Percentile from market knots present on the row', () => {
    const p: ProviderRecord = {
      Employee_ID: 'E1',
      Current_Base_Salary: 450_000,
      Current_FTE: 1,
      Market_TCC_25: 380_000,
      Market_TCC_50: 450_000,
      Market_TCC_75: 520_000,
      Market_TCC_90: 600_000,
    };
    const out = applyDerivedCurrentTcc(p);
    expect(out.Current_TCC_at_1FTE).toBe(450_000);
    expect(out.Current_TCC_Percentile).toBeCloseTo(50, 6);
  });

  it('leaves Current_TCC_Percentile untouched when no market knots are present', () => {
    const p: ProviderRecord = {
      Employee_ID: 'E1',
      Current_Base_Salary: 300_000,
      Current_TCC_Percentile: 42,
    };
    expect(applyDerivedCurrentTcc(p).Current_TCC_Percentile).toBe(42);
  });
});
