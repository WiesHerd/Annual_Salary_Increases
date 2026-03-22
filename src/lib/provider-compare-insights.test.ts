import { describe, expect, it } from 'vitest';
import type { ProviderRecord } from '../types/provider';
import { buildProviderCompareInsights, getProviderCompBreakdown, getSalaryAt1Fte } from './provider-compare-insights';

function row(partial: Partial<ProviderRecord> & Pick<ProviderRecord, 'Employee_ID'>): ProviderRecord {
  return partial as ProviderRecord;
}

describe('getSalaryAt1Fte', () => {
  it('derives from base ÷ FTE when stored salary at 1 FTE is absent', () => {
    const p = row({
      Employee_ID: '1',
      Proposed_Base_Salary: 200_000,
      Current_FTE: 0.8,
    });
    expect(getSalaryAt1Fte(p)).toBe(250_000);
  });
});

describe('getProviderCompBreakdown', () => {
  it('sums base, CF×wRVU, and supplemental into tcc', () => {
    const p = row({
      Employee_ID: '1',
      Proposed_Base_Salary: 100_000,
      Proposed_CF: 50,
      Prior_Year_WRVUs: 1000,
      Quality_Bonus: 10_000,
    });
    const b = getProviderCompBreakdown(p);
    expect(b.base).toBe(100_000);
    expect(b.prod).toBe(50_000);
    expect(b.supp).toBe(10_000);
    expect(b.tcc).toBe(160_000);
  });
});

describe('buildProviderCompareInsights', () => {
  it('explains lower base but higher total cash using productivity and supplemental deltas', () => {
    const lowBaseHighTcc = row({
      Employee_ID: 'a',
      Provider_Name: 'Dr. Alpha',
      Proposed_Base_Salary: 200_000,
      Proposed_CF: 60,
      Prior_Year_WRVUs: 5000,
      Current_FTE: 1,
      Proposed_TCC_at_1FTE: 500_000,
    });
    const highBaseLowTcc = row({
      Employee_ID: 'b',
      Provider_Name: 'Dr. Beta',
      Proposed_Base_Salary: 350_000,
      Proposed_CF: 40,
      Prior_Year_WRVUs: 2000,
      Current_FTE: 1,
      Proposed_TCC_at_1FTE: 430_000,
    });
    const bullets = buildProviderCompareInsights([lowBaseHighTcc, highBaseLowTcc]);
    const joined = bullets.join(' ');
    expect(joined).toMatch(/Alpha/);
    expect(joined).toMatch(/below/);
    expect(joined).toMatch(/Beta/);
    expect(joined).toMatch(/total cash is about/);
    expect(joined).toMatch(/productivity pay/);
  });

  it('mentions FTE when commitment differs', () => {
    const a = row({
      Employee_ID: '1',
      Provider_Name: 'Part',
      Proposed_Base_Salary: 160_000,
      Proposed_CF: 0,
      Current_FTE: 0.6,
      Proposed_TCC_at_1FTE: 200_000,
    });
    const b = row({
      Employee_ID: '2',
      Provider_Name: 'Full',
      Proposed_Base_Salary: 300_000,
      Proposed_CF: 0,
      Current_FTE: 1,
      Proposed_TCC_at_1FTE: 300_000,
    });
    const bullets = buildProviderCompareInsights([a, b]);
    expect(bullets.some((x) => x.includes('FTE differs'))).toBe(true);
  });

  it('returns a generic hint when no strong pattern applies', () => {
    const a = row({
      Employee_ID: '1',
      Provider_Name: 'A',
      Proposed_Base_Salary: 300_000,
      Proposed_CF: 0,
      Current_FTE: 1,
    });
    const b = row({
      Employee_ID: '2',
      Provider_Name: 'B',
      Proposed_Base_Salary: 310_000,
      Proposed_CF: 0,
      Current_FTE: 1,
    });
    const bullets = buildProviderCompareInsights([a, b]);
    expect(bullets.length).toBeGreaterThan(0);
    expect(bullets[0]).toMatch(/rows below|1\.0 FTE/i);
  });
});
