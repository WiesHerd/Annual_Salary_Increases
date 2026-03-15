import { describe, it, expect } from 'vitest';
import type { ProviderRecord } from '../types/provider';
import type { Cycle } from '../types/cycle';
import type { BudgetSettingsRow } from '../types/budget-settings';
import {
  getIncreaseDollars,
  computeSummary,
  computeSummaryByDimension,
  resolveBudgetForCycle,
  type SummaryDimension,
} from './salary-review-summary';

function makeRecord(overrides: Partial<ProviderRecord> = {}): ProviderRecord {
  return {
    Employee_ID: 'e1',
    Current_Base_Salary: 200_000,
    Proposed_Base_Salary: 206_000,
    Primary_Division: 'Cardiology',
    Department: 'Adult',
    Population: 'Physician',
    Specialty: 'Cardiology',
    Compensation_Plan: 'wRVU',
    ...overrides,
  };
}

describe('getIncreaseDollars', () => {
  it('returns proposed - current when both set', () => {
    expect(getIncreaseDollars(makeRecord({ Current_Base_Salary: 100_000, Proposed_Base_Salary: 103_000 }))).toBe(3_000);
  });

  it('uses current as proposed when proposed missing', () => {
    expect(getIncreaseDollars(makeRecord({ Proposed_Base_Salary: undefined }))).toBe(0);
  });

  it('treats missing current as 0', () => {
    expect(getIncreaseDollars(makeRecord({ Current_Base_Salary: undefined, Proposed_Base_Salary: 50_000 }))).toBe(50_000);
  });
});

describe('computeSummary', () => {
  it('returns zeros for empty list', () => {
    const s = computeSummary([]);
    expect(s.totalIncreaseDollars).toBe(0);
    expect(s.totalCurrentBase).toBe(0);
    expect(s.totalProposedBase).toBe(0);
    expect(s.totalCurrentTcc).toBe(0);
    expect(s.totalProposedTcc).toBe(0);
    expect(s.avgCurrentTccPercentile).toBeUndefined();
    expect(s.avgProposedTccPercentile).toBeUndefined();
    expect(s.providerCountWithPercentile).toBe(0);
    expect(s.avgPercentIncrease).toBeUndefined();
    expect(s.providerCount).toBe(0);
  });

  it('aggregates single row', () => {
    const r = makeRecord({
      Current_Base_Salary: 200_000,
      Proposed_Base_Salary: 206_000,
      Current_TCC: 250_000,
      Proposed_TCC: 256_000,
    });
    const s = computeSummary([r]);
    expect(s.totalIncreaseDollars).toBe(6_000);
    expect(s.totalCurrentBase).toBe(200_000);
    expect(s.totalProposedBase).toBe(206_000);
    expect(s.totalCurrentTcc).toBe(250_000);
    expect(s.totalProposedTcc).toBe(256_000);
    expect(s.providerCountWithPercentile).toBe(0);
    expect(s.providerCount).toBe(1);
  });

  it('computes average TCC percentile (mean) across providers with percentile data', () => {
    const records = [
      makeRecord({
        Employee_ID: 'e1',
        Current_TCC_Percentile: 40,
        Proposed_TCC_Percentile: 50,
      }),
      makeRecord({
        Employee_ID: 'e2',
        Current_TCC_Percentile: 60,
        Proposed_TCC_Percentile: 70,
      }),
    ];
    const s = computeSummary(records);
    expect(s.avgCurrentTccPercentile).toBe(50); // (40 + 60) / 2
    expect(s.avgProposedTccPercentile).toBe(60); // (50 + 70) / 2
    expect(s.providerCountWithPercentile).toBe(2);
  });

  it('excludes providers without percentile from average', () => {
    const records = [
      makeRecord({ Employee_ID: 'e1', Current_TCC_Percentile: 50, Proposed_TCC_Percentile: 55 }),
      makeRecord({ Employee_ID: 'e2' }), // no percentiles
    ];
    const s = computeSummary(records);
    expect(s.avgCurrentTccPercentile).toBe(50);
    expect(s.avgProposedTccPercentile).toBe(55);
    expect(s.providerCountWithPercentile).toBe(1);
  });

  it('computes average percent increase (only providers with current base > 0)', () => {
    const records = [
      makeRecord({ Employee_ID: 'e1', Current_Base_Salary: 100_000, Proposed_Base_Salary: 103_000 }), // 3%
      makeRecord({ Employee_ID: 'e2', Current_Base_Salary: 200_000, Proposed_Base_Salary: 206_000 }), // 3%
    ];
    const s = computeSummary(records);
    expect(s.avgPercentIncrease).toBe(3); // (3 + 3) / 2
  });

  it('aggregates multiple rows', () => {
    const records = [
      makeRecord({
        Employee_ID: 'e1',
        Current_Base_Salary: 200_000,
        Proposed_Base_Salary: 206_000,
        Current_TCC: 250_000,
        Proposed_TCC: 256_000,
      }),
      makeRecord({
        Employee_ID: 'e2',
        Current_Base_Salary: 150_000,
        Proposed_Base_Salary: 154_500,
        Current_TCC: 180_000,
        Proposed_TCC: 184_500,
      }),
    ];
    const s = computeSummary(records);
    expect(s.totalIncreaseDollars).toBe(6_000 + 4_500);
    expect(s.totalCurrentBase).toBe(350_000);
    expect(s.totalProposedBase).toBe(360_500);
    expect(s.totalCurrentTcc).toBe(430_000);
    expect(s.totalProposedTcc).toBe(440_500);
    expect(s.providerCount).toBe(2);
  });
});

describe('computeSummaryByDimension', () => {
  it('returns empty array for empty records', () => {
    expect(computeSummaryByDimension([], 'division')).toEqual([]);
  });

  it('groups by division and sums correctly', () => {
    const records = [
      makeRecord({
        Employee_ID: 'e1',
        Primary_Division: 'Cardiology',
        Current_Base_Salary: 200_000,
        Proposed_Base_Salary: 206_000,
        Current_TCC: 250_000,
        Proposed_TCC: 256_000,
      }),
      makeRecord({
        Employee_ID: 'e2',
        Primary_Division: 'Cardiology',
        Current_Base_Salary: 180_000,
        Proposed_Base_Salary: 185_400,
        Current_TCC: 220_000,
        Proposed_TCC: 225_400,
      }),
      makeRecord({
        Employee_ID: 'e3',
        Primary_Division: 'Neurology',
        Current_Base_Salary: 190_000,
        Proposed_Base_Salary: 195_700,
        Current_TCC: 240_000,
        Proposed_TCC: 245_700,
      }),
    ];
    const rows = computeSummaryByDimension(records, 'division');
    expect(rows).toHaveLength(2);
    const card = rows.find((r) => r.key === 'Cardiology');
    const neuro = rows.find((r) => r.key === 'Neurology');
    expect(card?.providerCount).toBe(2);
    expect(card?.totalIncreaseDollars).toBe(6_000 + 5_400);
    expect(card?.totalCurrentTcc).toBe(470_000);
    expect(card?.totalProposedTcc).toBe(481_400);
    expect(neuro?.providerCount).toBe(1);
    expect(neuro?.totalIncreaseDollars).toBe(5_700);
    expect(neuro?.totalCurrentTcc).toBe(240_000);
    expect(neuro?.totalProposedTcc).toBe(245_700);
    expect(card?.avgCurrentTccPercentile).toBeUndefined();
    expect(card?.avgProposedTccPercentile).toBeUndefined();
  });

  it('computes average TCC percentile per dimension group', () => {
    const records = [
      makeRecord({
        Employee_ID: 'e1',
        Primary_Division: 'Cardiology',
        Current_TCC_Percentile: 30,
        Proposed_TCC_Percentile: 40,
      }),
      makeRecord({
        Employee_ID: 'e2',
        Primary_Division: 'Cardiology',
        Current_TCC_Percentile: 50,
        Proposed_TCC_Percentile: 55,
      }),
      makeRecord({
        Employee_ID: 'e3',
        Primary_Division: 'Neurology',
        Current_TCC_Percentile: 70,
        Proposed_TCC_Percentile: 75,
      }),
    ];
    const rows = computeSummaryByDimension(records, 'division');
    const card = rows.find((r) => r.key === 'Cardiology');
    const neuro = rows.find((r) => r.key === 'Neurology');
    expect(card?.avgCurrentTccPercentile).toBe(40); // (30 + 50) / 2
    expect(card?.avgProposedTccPercentile).toBe(47.5); // (40 + 55) / 2
    expect(neuro?.avgCurrentTccPercentile).toBe(70);
    expect(neuro?.avgProposedTccPercentile).toBe(75);
  });

  it('uses empty string for blank dimension value', () => {
    const records = [
      makeRecord({ Employee_ID: 'e1', Department: 'Adult' }),
      makeRecord({ Employee_ID: 'e2', Department: undefined }),
    ];
    const rows = computeSummaryByDimension(records, 'department');
    expect(rows).toHaveLength(2);
    const blank = rows.find((r) => r.key === '');
    const adult = rows.find((r) => r.key === 'Adult');
    expect(blank?.providerCount).toBe(1);
    expect(adult?.providerCount).toBe(1);
  });

  it('sorts rows with blank key last', () => {
    const records = [
      makeRecord({ Employee_ID: 'e1', Specialty: '' }),
      makeRecord({ Employee_ID: 'e2', Specialty: 'Cardiology' }),
    ];
    const rows = computeSummaryByDimension(records, 'specialty');
    expect(rows[0].key).toBe('Cardiology');
    expect(rows[1].key).toBe('');
  });

  it('works for all dimensions', () => {
    const records = [
      makeRecord({ Primary_Division: 'A', Department: 'D1', Population: 'P', Specialty: 'S1', Compensation_Plan: 'PlanX' }),
    ];
    const dims: SummaryDimension[] = ['division', 'department', 'population', 'specialty', 'planType'];
    for (const dim of dims) {
      const rows = computeSummaryByDimension(records, dim);
      expect(rows).toHaveLength(1);
      expect(rows[0].providerCount).toBe(1);
      expect(rows[0].totalIncreaseDollars).toBe(6_000);
      expect(rows[0].avgCurrentTccPercentile).toBeUndefined();
      expect(rows[0].avgProposedTccPercentile).toBeUndefined();
    }
  });
});

describe('resolveBudgetForCycle', () => {
  const cycles: Cycle[] = [
    { id: 'fy2026', label: 'FY 2026', budgetTargetAmount: 2_400_000 },
    { id: 'fy2025', label: 'FY 2025', budgetTargetAmount: 2_100_000 },
  ];
  const budgetSettings: BudgetSettingsRow[] = [
    { id: 'b1', cycleId: 'fy2026', budgetTargetAmount: 2_500_000, warningThresholdPercent: 95 },
  ];

  it('prefers budgetSettings when cycleId matches', () => {
    expect(resolveBudgetForCycle('fy2026', budgetSettings, cycles)).toBe(2_500_000);
  });

  it('falls back to cycles when no budgetSettings row', () => {
    expect(resolveBudgetForCycle('fy2025', budgetSettings, cycles)).toBe(2_100_000);
  });

  it('returns undefined when cycle has no budget', () => {
    expect(resolveBudgetForCycle('nonexistent', budgetSettings, cycles)).toBeUndefined();
  });

  it('returns undefined for empty inputs', () => {
    expect(resolveBudgetForCycle('fy2026', [], [])).toBeUndefined();
  });
});
