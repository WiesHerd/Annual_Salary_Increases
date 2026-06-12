import { describe, it, expect } from 'vitest';
import { interpolatePercentile, interpolateTccPercentile, tccPercentilesFromRecordFields } from './percentile';

const KNOTS = { 25: 380_000, 50: 450_000, 75: 520_000, 90: 600_000 };

describe('interpolatePercentile', () => {
  it('returns undefined without a usable median', () => {
    expect(interpolatePercentile(100, undefined)).toBeUndefined();
    expect(interpolatePercentile(100, {})).toBeUndefined();
    expect(interpolatePercentile(100, { 25: 1, 75: 3 })).toBeUndefined();
  });

  it('returns undefined for non-finite values', () => {
    expect(interpolatePercentile(NaN, KNOTS)).toBeUndefined();
    expect(interpolatePercentile(Infinity, KNOTS)).toBeUndefined();
    expect(interpolatePercentile(-Infinity, KNOTS)).toBeUndefined();
  });

  it('hits the knots exactly', () => {
    expect(interpolatePercentile(380_000, KNOTS)).toBeCloseTo(25, 6);
    expect(interpolatePercentile(450_000, KNOTS)).toBeCloseTo(50, 6);
    expect(interpolatePercentile(520_000, KNOTS)).toBeCloseTo(75, 6);
    expect(interpolatePercentile(600_000, KNOTS)).toBeCloseTo(90, 6);
  });

  it('interpolates linearly between knots', () => {
    expect(interpolatePercentile(415_000, KNOTS)).toBeCloseTo(37.5, 6); // midpoint 25↔50
    expect(interpolatePercentile(485_000, KNOTS)).toBeCloseTo(62.5, 6); // midpoint 50↔75
  });

  it('extrapolates below P25 toward 0 and clamps at 0', () => {
    expect(interpolatePercentile(190_000, KNOTS)).toBeCloseTo(12.5, 6);
    expect(interpolatePercentile(0, KNOTS)).toBe(0);
    expect(interpolatePercentile(-50_000, KNOTS)).toBe(0);
  });

  it('extrapolates above P90 using the P75→P90 slope and clamps at 100', () => {
    // P75→P90 slope: 15 points per 80,000. One more 80,000 above P90 = +15 → 100 (clamped from 105).
    expect(interpolatePercentile(680_000, KNOTS)).toBe(100);
    // Half a step above P90 = +7.5 → 97.5
    expect(interpolatePercentile(640_000, KNOTS)).toBeCloseTo(97.5, 6);
  });

  it('never divides by zero on equal adjacent knots', () => {
    const flat = { 25: 100, 50: 100, 75: 100, 90: 100 };
    expect(interpolatePercentile(100, flat)).toBeCloseTo(25, 6);
    expect(interpolatePercentile(120, flat)).toBe(100);
    expect(Number.isFinite(interpolatePercentile(80, flat)!)).toBe(true);
  });

  it('sanitizes non-monotonic survey data (P75 < P50)', () => {
    const messy = { 25: 100, 50: 300, 75: 200, 90: 400 };
    const result = interpolatePercentile(300, messy);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
    expect(Number.isFinite(result!)).toBe(true);
  });

  it('handles P25 = 0 without producing Infinity', () => {
    const zeroLow = { 25: 0, 50: 100, 75: 200, 90: 300 };
    const result = interpolatePercentile(50, zeroLow);
    expect(Number.isFinite(result!)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe('interpolateTccPercentile', () => {
  it('reads tccPercentiles off the market row', () => {
    expect(interpolateTccPercentile(450_000, { specialty: 'X', tccPercentiles: KNOTS, wrvuPercentiles: {} })).toBeCloseTo(
      50,
      6
    );
    expect(interpolateTccPercentile(450_000, undefined)).toBeUndefined();
  });
});

describe('tccPercentilesFromRecordFields', () => {
  it('builds a knot record from flat Market_TCC_* fields', () => {
    expect(
      tccPercentilesFromRecordFields({
        Market_TCC_25: 380_000,
        Market_TCC_50: 450_000,
        Market_TCC_75: 520_000,
        Market_TCC_90: 600_000,
      })
    ).toEqual(KNOTS);
  });

  it('omits missing or non-finite knots', () => {
    expect(tccPercentilesFromRecordFields({ Market_TCC_50: 450_000 })).toEqual({ 50: 450_000 });
    expect(tccPercentilesFromRecordFields({})).toEqual({});
  });
});
