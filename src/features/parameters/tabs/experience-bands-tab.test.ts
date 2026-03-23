import { describe, it, expect } from 'vitest';
import type { ExperienceBand } from '../../../types/experience-band';
import { summarizeExperienceBand } from './experience-bands-tab';

function band(overrides: Partial<ExperienceBand>): ExperienceBand {
  return {
    id: '1',
    label: 'Test',
    minYoe: 0,
    maxYoe: 5,
    targetTccPercentileLow: 25,
    targetTccPercentileHigh: 50,
    ...overrides,
  } as ExperienceBand;
}

describe('summarizeExperienceBand', () => {
  it('describes percentile-only band and everyone', () => {
    const s = summarizeExperienceBand(band({}));
    expect(s).toContain('YOE');
    expect(s).toContain('25');
    expect(s).toContain('50');
    expect(s).toContain('Pay ($): off');
    expect(s).toContain('Applies: everyone');
  });

  it('shows P50 dollar band as % of midpoint', () => {
    const s = summarizeExperienceBand(
      band({
        dollarRangeAnchorPercentile: 50,
        dollarRangeMinSpreadPercent: 15,
        dollarRangeMaxSpreadPercent: 15,
      })
    );
    expect(s).toContain('Pay ($): P50 85–115% of mid');
  });

  it('shows fixed dollar midpoint in summary', () => {
    const s = summarizeExperienceBand(
      band({
        dollarRangeFixedAnchorDollars: 55.34,
        dollarRangeMinSpreadPercent: 15,
        dollarRangeMaxSpreadPercent: 10,
      })
    );
    expect(s).toContain('Pay ($): $55.34 mid 85–110%');
  });

  it('lists cohort scopes', () => {
    const s = summarizeExperienceBand(
      band({
        populationScope: ['NP'],
        specialtyScope: ['Endocrinology'],
      })
    );
    expect(s).toContain('NP');
    expect(s).toContain('Endocrinology');
  });
});
