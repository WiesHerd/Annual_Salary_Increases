/**
 * Midpoint-anchored market compensation range spreads.
 *
 * Notation like **85 / 100 / 115** means: range **minimum** = 85% of the market midpoint,
 * **midpoint** = 100% (the survey TCC dollar at the selected anchor percentile, 1.0 FTE),
 * **maximum** = 115% of that midpoint. Same anchor can use different triples (e.g. 80/100/120)
 * without changing percentile selection—only the spread structure changes.
 *
 * Persisted experience bands store **percent below** and **percent above** the anchor
 * (`dollarRangeMinSpreadPercent`, `dollarRangeMaxSpreadPercent`), which round-trip to triples
 * when **midPct = 100**.
 */

export type SpreadTriple = {
  /** Lower bound as % of midpoint when midPct = 100 (e.g. 85 → min = 85% of anchor). */
  lowerPct: number;
  /** Normalization of midpoint; use 100 so midpoint equals market anchor dollars. */
  midPct: number;
  /** Upper bound as % of midpoint (e.g. 115 → max = 115% of anchor). */
  upperPct: number;
};

export type MidpointAnchoredRange = {
  /** Survey TCC dollars at the chosen anchor percentile (1.0 FTE) — input anchor. */
  anchorDollars: number;
  /** Same as anchor when midPct = 100; otherwise anchor × midPct/100. */
  midpoint: number;
  min: number;
  max: number;
};

/**
 * Compute min / midpoint / max from market anchor dollars and a spread triple.
 * Midpoint is anchored to the market value (× midPct/100); min and max scale with lower/upper relative to midPct.
 */
export function computeRangeFromSpreadTriple(
  anchorDollars: number,
  lowerPct: number,
  midPct: number,
  upperPct: number
): MidpointAnchoredRange {
  if (!Number.isFinite(anchorDollars) || anchorDollars <= 0) {
    throw new Error('anchorDollars must be a positive finite number');
  }
  if (!Number.isFinite(midPct) || midPct === 0) {
    throw new Error('midPct must be a non-zero finite number');
  }
  if (!Number.isFinite(lowerPct) || !Number.isFinite(upperPct)) {
    throw new Error('lowerPct and upperPct must be finite');
  }

  const midpoint = anchorDollars * (midPct / 100);
  const min = midpoint * (lowerPct / midPct);
  const max = midpoint * (upperPct / midPct);

  return {
    anchorDollars,
    midpoint,
    min,
    max,
  };
}

/**
 * Convert UI triple (e.g. 85/100/115) to stored band spreads (% below / % above anchor).
 * Valid when midPct = 100: min = anchor × (1 - minSpread/100), max = anchor × (1 + maxSpread/100).
 */
export function spreadTripleToBandSpreadPercents(
  lowerPct: number,
  midPct: number,
  upperPct: number
): { minSpreadPercent: number; maxSpreadPercent: number } {
  if (midPct === 0) throw new Error('midPct cannot be 0');
  // Exact integers when mid = 100 (avoids float drift on round-trip to triple)
  if (midPct === 100) {
    return { minSpreadPercent: 100 - lowerPct, maxSpreadPercent: upperPct - 100 };
  }
  const minSpreadPercent = 100 - (lowerPct / midPct) * 100;
  const maxSpreadPercent = (upperPct / midPct) * 100 - 100;
  return { minSpreadPercent, maxSpreadPercent };
}

/**
 * Convert stored band spreads to a display triple (lower / 100 / upper as % of anchor when mid was 100).
 */
export function bandSpreadPercentsToSpreadTriple(
  minSpreadPercent: number,
  maxSpreadPercent: number
): SpreadTriple {
  return {
    lowerPct: 100 - minSpreadPercent,
    midPct: 100,
    upperPct: 100 + maxSpreadPercent,
  };
}

/**
 * Apply stored experience-band spread percents to anchor dollars (same math as spread triple with mid 100).
 */
export function computeMidpointAnchoredRangeFromBandSpreads(
  anchorDollars: number,
  minSpreadPercent: number,
  maxSpreadPercent: number
): MidpointAnchoredRange {
  const triple = bandSpreadPercentsToSpreadTriple(minSpreadPercent, maxSpreadPercent);
  return computeRangeFromSpreadTriple(anchorDollars, triple.lowerPct, triple.midPct, triple.upperPct);
}
