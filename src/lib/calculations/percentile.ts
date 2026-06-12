/**
 * Centralized, FMV-defensible percentile interpolation for market survey benchmarks.
 *
 * Survey vendors (MGMA, SullivanCotter, etc.) publish discrete knots — typically the
 * 25th, 50th, 75th, and 90th percentiles. To place a provider's value on that curve we
 * interpolate linearly between knots. This module is the SINGLE source of truth for that
 * math so the review grid, policy engine, and joins all agree.
 *
 * Guarantees (the reason this is centralized):
 * - Requires a median (P50); returns undefined if absent.
 * - Sanitizes non-monotonic survey data (e.g. P75 < P50) by clamping to non-decreasing knots.
 * - Never divides by zero on equal adjacent knots — returns the segment boundary instead.
 * - Always clamps the result to [0, 100].
 * - Above P90, continues the P75→P90 slope (capped at 100) rather than an arbitrary scale.
 */

import type { MarketRow } from '../../types/market';

function finiteOr(value: number | undefined | null, fallback: number): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

/**
 * Interpolate a percentile (0–100) for `value` given survey knots keyed by percentile.
 * `percentiles` is a record like { 25: 380000, 50: 450000, 75: 520000, 90: 600000 }.
 * Returns undefined when no usable median is present or value is not finite.
 */
export function interpolatePercentile(
  value: number,
  percentiles: Record<number, number> | undefined | null
): number | undefined {
  if (!percentiles || !Number.isFinite(value)) return undefined;

  const p50 = percentiles[50];
  if (p50 == null || !Number.isFinite(p50)) return undefined;

  // Fill missing knots from the nearest inner knot, then enforce a non-decreasing curve so
  // malformed survey rows can never produce NaN/Infinity or a non-monotonic percentile.
  let p25 = finiteOr(percentiles[25], p50);
  let p75 = finiteOr(percentiles[75], p50);
  let p90 = finiteOr(percentiles[90], p75);
  p25 = Math.min(p25, p50);
  p75 = Math.max(p75, p50);
  p90 = Math.max(p90, p75);

  /** Linear segment between two knots; returns the upper percentile if the span is degenerate. */
  const segment = (lowPct: number, highPct: number, lowVal: number, highVal: number): number =>
    highVal > lowVal ? lowPct + (highPct - lowPct) * ((value - lowVal) / (highVal - lowVal)) : highPct;

  let result: number;
  if (value <= p25) {
    result = p25 > 0 ? 25 * (value / p25) : 0;
  } else if (value <= p50) {
    result = segment(25, 50, p25, p50);
  } else if (value <= p75) {
    result = segment(50, 75, p50, p75);
  } else if (value <= p90) {
    result = segment(75, 90, p75, p90);
  } else {
    // Extrapolate above the 90th using the same slope as the 75th→90th segment.
    result = p90 > p75 ? 90 + 15 * ((value - p90) / (p90 - p75)) : 100;
  }

  return Math.max(0, Math.min(100, result));
}

/** Interpolate a TCC percentile from a market row (TCC knots are at 1.0 FTE — pass TCC at 1.0 FTE). */
export function interpolateTccPercentile(tccAt1Fte: number, market: MarketRow | undefined | null): number | undefined {
  return interpolatePercentile(tccAt1Fte, market?.tccPercentiles);
}

/** Interpolate a wRVU percentile from a market row (wRVU knots are at 1.0 FTE — pass wRVU at 1.0 FTE). */
export function interpolateWrvuPercentile(wrvuAt1Fte: number, market: MarketRow | undefined | null): number | undefined {
  return interpolatePercentile(wrvuAt1Fte, market?.wrvuPercentiles);
}

/** Build a percentile record from the flat Market_TCC_* fields stored on a provider row. */
export function tccPercentilesFromRecordFields(fields: {
  Market_TCC_25?: number;
  Market_TCC_50?: number;
  Market_TCC_75?: number;
  Market_TCC_90?: number;
}): Record<number, number> {
  const out: Record<number, number> = {};
  if (fields.Market_TCC_25 != null && Number.isFinite(fields.Market_TCC_25)) out[25] = fields.Market_TCC_25;
  if (fields.Market_TCC_50 != null && Number.isFinite(fields.Market_TCC_50)) out[50] = fields.Market_TCC_50;
  if (fields.Market_TCC_75 != null && Number.isFinite(fields.Market_TCC_75)) out[75] = fields.Market_TCC_75;
  if (fields.Market_TCC_90 != null && Number.isFinite(fields.Market_TCC_90)) out[90] = fields.Market_TCC_90;
  return out;
}
