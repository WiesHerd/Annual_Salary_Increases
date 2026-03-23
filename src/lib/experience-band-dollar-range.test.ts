import { describe, it, expect } from 'vitest';
import type { ExperienceBand } from '../types/experience-band';
import type { ProviderRecord } from '../types/provider';
import type { MarketRow } from '../types/market';
import {
  getBandMarketDollarRange,
  getDollarRangeAlignment,
  getTccDollarsAtPercentileFromRecord,
} from './experience-band-dollar-range';

const band: ExperienceBand = {
  id: 'b1',
  label: 'Test',
  minYoe: 0,
  maxYoe: 99,
  targetTccPercentileLow: 25,
  targetTccPercentileHigh: 75,
  dollarRangeAnchorPercentile: 50,
  dollarRangeMinSpreadPercent: 20,
  dollarRangeMaxSpreadPercent: 20,
};

describe('getBandMarketDollarRange', () => {
  it('computes min/max from market TCC P50 on record', () => {
    const record = {
      Employee_ID: '1',
      Market_TCC_50: 100_000,
    } as ProviderRecord;
    const r = getBandMarketDollarRange(band, record);
    expect(r).toEqual({
      anchor: 100_000,
      midpoint: 100_000,
      min: 80_000,
      max: 120_000,
      anchorPercentile: 50,
    });
  });

  it('returns undefined when anchor market value missing', () => {
    const record = { Employee_ID: '1' } as ProviderRecord;
    expect(getBandMarketDollarRange(band, record)).toBeUndefined();
  });

  it('prefers marketRow percentiles when provided', () => {
    const row: MarketRow = {
      specialty: 'X',
      tccPercentiles: { 25: 1, 50: 200_000, 75: 3, 90: 4 },
      wrvuPercentiles: {},
    };
    const record = { Employee_ID: '1', Market_TCC_50: 100_000 } as ProviderRecord;
    const r = getBandMarketDollarRange(band, record, row);
    expect(r?.anchor).toBe(200_000);
  });

  it('uses fixed anchor dollars when set (ignores survey)', () => {
    const record = { Employee_ID: '1', Market_TCC_50: 999_999 } as ProviderRecord;
    const row: MarketRow = {
      specialty: 'X',
      tccPercentiles: { 25: 1, 50: 888_888, 75: 3, 90: 4 },
      wrvuPercentiles: {},
    };
    const b: ExperienceBand = {
      ...band,
      dollarRangeFixedAnchorDollars: 55.34,
      dollarRangeMinSpreadPercent: 15,
      dollarRangeMaxSpreadPercent: 10,
    };
    const r = getBandMarketDollarRange(b, record, row);
    expect(r?.anchor).toBe(55.34);
    expect(r?.midpoint).toBe(55.34);
    expect(r?.min).toBeCloseTo(55.34 * 0.85, 5);
    expect(r?.max).toBeCloseTo(55.34 * 1.1, 5);
    expect(r?.anchorIsFixed).toBe(true);
    expect(r?.anchorPercentile).toBeUndefined();
  });
});

describe('getDollarRangeAlignment', () => {
  it('classifies TCC at 1 FTE vs range', () => {
    expect(getDollarRangeAlignment(70_000, 80_000, 120_000)).toBe('below');
    expect(getDollarRangeAlignment(100_000, 80_000, 120_000)).toBe('in');
    expect(getDollarRangeAlignment(130_000, 80_000, 120_000)).toBe('above');
  });
});

describe('getTccDollarsAtPercentileFromRecord', () => {
  it('snaps to nearest standard percentile column', () => {
    const record = {
      Employee_ID: '1',
      Market_TCC_50: 123,
      Market_TCC_75: 456,
    } as ProviderRecord;
    expect(getTccDollarsAtPercentileFromRecord(record, 48)).toBe(123);
    expect(getTccDollarsAtPercentileFromRecord(record, 72)).toBe(456);
  });
});
