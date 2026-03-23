import { describe, it, expect } from 'vitest';
import {
  computeRangeFromSpreadTriple,
  spreadTripleToBandSpreadPercents,
  bandSpreadPercentsToSpreadTriple,
  computeMidpointAnchoredRangeFromBandSpreads,
} from './market-range-spread';

const ANCHOR = 100_000;

/** Formats rows for readable test output (same midpoint, different spread structures). */
function formatComparisonTable(
  anchor: number,
  structures: { label: string; lower: number; mid: number; upper: number }[]
): string {
  const lines = [
    'Spread structure | Min ($)   | Midpoint ($) | Max ($)   | Width below mid | Width above mid',
    '-----------------+-----------+--------------+-----------+-----------------+---------------',
  ];
  for (const s of structures) {
    const r = computeRangeFromSpreadTriple(anchor, s.lower, s.mid, s.upper);
    const below = r.midpoint - r.min;
    const above = r.max - r.midpoint;
    lines.push(
      `${s.label.padEnd(16)} | ${String(Math.round(r.min)).padStart(9)} | ${String(Math.round(r.midpoint)).padStart(12)} | ${String(Math.round(r.max)).padStart(9)} | ${String(Math.round(below)).padStart(15)} | ${String(Math.round(above)).padStart(13)}`
    );
  }
  return lines.join('\n');
}

describe('midpoint-anchored spread structures', () => {
  it('keeps the same market midpoint when only the spread triple changes (anchor = 100,000)', () => {
    const table = formatComparisonTable(ANCHOR, [
      { label: '85 / 100 / 115', lower: 85, mid: 100, upper: 115 },
      { label: '80 / 100 / 120', lower: 80, mid: 100, upper: 120 },
      { label: '90 / 100 / 110', lower: 90, mid: 100, upper: 110 },
      { label: '90 / 100 / 125', lower: 90, mid: 100, upper: 125 },
    ]);

    expect(table).toMatchInlineSnapshot(`
      "Spread structure | Min ($)   | Midpoint ($) | Max ($)   | Width below mid | Width above mid
      -----------------+-----------+--------------+-----------+-----------------+---------------
      85 / 100 / 115   |     85000 |       100000 |    115000 |           15000 |         15000
      80 / 100 / 120   |     80000 |       100000 |    120000 |           20000 |         20000
      90 / 100 / 110   |     90000 |       100000 |    110000 |           10000 |         10000
      90 / 100 / 125   |     90000 |       100000 |    125000 |           10000 |         25000"
    `);

    for (const s of [
      { lower: 85, mid: 100, upper: 115 },
      { lower: 80, mid: 100, upper: 120 },
      { lower: 90, mid: 100, upper: 110 },
    ]) {
      const r = computeRangeFromSpreadTriple(ANCHOR, s.lower, s.mid, s.upper);
      expect(r.midpoint).toBe(ANCHOR);
      expect(r.anchorDollars).toBe(ANCHOR);
    }
  });

  it('round-trips triple ↔ stored band spread percents (mid = 100)', () => {
    const triples = [
      [85, 100, 115] as const,
      [80, 100, 120] as const,
      [90, 100, 110] as const,
    ];
    for (const [lo, mid, hi] of triples) {
      const { minSpreadPercent, maxSpreadPercent } = spreadTripleToBandSpreadPercents(lo, mid, hi);
      const back = bandSpreadPercentsToSpreadTriple(minSpreadPercent, maxSpreadPercent);
      expect(back).toEqual({ lowerPct: lo, midPct: 100, upperPct: hi });
      const range = computeMidpointAnchoredRangeFromBandSpreads(ANCHOR, minSpreadPercent, maxSpreadPercent);
      const direct = computeRangeFromSpreadTriple(ANCHOR, lo, mid, hi);
      expect(range.min).toBeCloseTo(direct.min, 6);
      expect(range.midpoint).toBeCloseTo(direct.midpoint, 6);
      expect(range.max).toBeCloseTo(direct.max, 6);
    }
  });

  it('switching spread structures does not break: same anchor + new triple recomputes min/mid/max', () => {
    const anchor = 185_432.5;
    const a = computeRangeFromSpreadTriple(anchor, 85, 100, 115);
    const b = computeRangeFromSpreadTriple(anchor, 80, 100, 120);
    expect(a.midpoint).toBe(b.midpoint);
    expect(a.midpoint).toBe(anchor);
    expect(a.min).toBeGreaterThan(b.min);
    expect(a.max).toBeLessThan(b.max);
  });
});
