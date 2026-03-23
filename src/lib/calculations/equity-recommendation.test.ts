import { describe, it, expect } from 'vitest';
import type { ProviderRecord } from '../../types/provider';
import type { ExperienceBand } from '../../types/experience-band';
import type { MarketRow } from '../../types/market';
import { getEquityRecommendation } from './equity-recommendation';

const BANDS: ExperienceBand[] = [
  { id: 'b1', label: '0-2 YOE', minYoe: 0, maxYoe: 2, targetTccPercentileLow: 25, targetTccPercentileHigh: 50 },
  { id: 'b2', label: '3-5 YOE', minYoe: 3, maxYoe: 5, targetTccPercentileLow: 50, targetTccPercentileHigh: 75 },
];

function makeRecord(overrides: Partial<ProviderRecord> = {}): ProviderRecord {
  return {
    Employee_ID: 'e1',
    Provider_Name: 'Test',
    Years_of_Experience: 1,
    Current_TCC_Percentile: 40,
    Proposed_TCC_Percentile: 40,
    ...overrides,
  } as ProviderRecord;
}

describe('getEquityRecommendation', () => {
  it('returns undefined when experienceBands is empty', () => {
    expect(getEquityRecommendation(makeRecord(), [])).toBeUndefined();
  });

  it('returns "below" recommendation when percentile is below band target', () => {
    const rec = getEquityRecommendation(makeRecord({ Current_TCC_Percentile: 10, Proposed_TCC_Percentile: 10 }), BANDS);
    expect(rec).toBeDefined();
    expect(rec!.action).toContain('Consider increase');
    expect(rec!.detail).toMatch(/Target band:|1\.0 FTE/);
  });

  it('returns "in" recommendation when percentile is within band target', () => {
    const rec = getEquityRecommendation(makeRecord({ Current_TCC_Percentile: 35, Proposed_TCC_Percentile: 35 }), BANDS);
    expect(rec).toBeDefined();
    expect(rec!.action).toBe('Within internal equity target.');
  });

  it('returns "above" recommendation when percentile is above band target', () => {
    const rec = getEquityRecommendation(makeRecord({ Current_TCC_Percentile: 60, Proposed_TCC_Percentile: 60 }), BANDS);
    expect(rec).toBeDefined();
    expect(rec!.action).toContain('Above internal equity target');
  });

  it('uses proposed TCC percentile when available', () => {
    const rec = getEquityRecommendation(
      makeRecord({ Current_TCC_Percentile: 60, Proposed_TCC_Percentile: 35 }),
      BANDS
    );
    expect(rec).toBeDefined();
    expect(rec!.action).toBe('Within internal equity target.');
  });

  it('includes suggestedTccAt1Fte when below and market TCC exists on record', () => {
    const rec = getEquityRecommendation(
      makeRecord({
        Years_of_Experience: 1,
        Current_TCC_Percentile: 10,
        Proposed_TCC_Percentile: 10,
        Market_TCC_25: 280000,
      }),
      BANDS
    );
    expect(rec).toBeDefined();
    expect(rec!.suggestedTccAt1Fte).toBe(280000);
  });

  it('includes suggestedTccAt1Fte when below and marketRow is provided', () => {
    const marketRow: MarketRow = {
      specialty: 'Test',
      tccPercentiles: { 25: 300000, 50: 350000, 75: 400000, 90: 450000 },
      wrvuPercentiles: {},
    };
    const rec = getEquityRecommendation(
      makeRecord({ Years_of_Experience: 1, Current_TCC_Percentile: 10, Proposed_TCC_Percentile: 10 }),
      BANDS,
      marketRow
    );
    expect(rec).toBeDefined();
    expect(rec!.suggestedTccAt1Fte).toBe(300000);
  });
});
