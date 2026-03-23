/**
 * Market-anchored TCC dollar ranges for experience bands (APP-style midpoint spreads).
 * Min/max are TCC at 1.0 FTE relative to survey anchor (e.g. P50 ± 20%).
 */

import type { ExperienceBand } from '../types/experience-band';
import type { MarketRow } from '../types/market';
import type { ProviderRecord } from '../types/provider';
import { computeMidpointAnchoredRangeFromBandSpreads } from './market-range-spread';

function nearestStandardPercentile(p: number): 25 | 50 | 75 | 90 {
  const options = [25, 50, 75, 90] as const;
  return options.reduce((best, curr) => (Math.abs(curr - p) < Math.abs(best - p) ? curr : best));
}

export function getTccDollarsAtPercentileFromRecord(
  record: ProviderRecord,
  percentile: number
): number | undefined {
  const p = nearestStandardPercentile(percentile);
  const v =
    p === 25
      ? record.Market_TCC_25
      : p === 50
        ? record.Market_TCC_50
        : p === 75
          ? record.Market_TCC_75
          : record.Market_TCC_90;
  return v != null && Number.isFinite(v) ? v : undefined;
}

export function getTccDollarsAtPercentileFromMarketRow(
  marketRow: MarketRow,
  percentile: number
): number | undefined {
  const p = nearestStandardPercentile(percentile);
  const v = marketRow.tccPercentiles?.[p];
  return v != null && Number.isFinite(v) ? v : undefined;
}

export type BandMarketDollarRange = {
  /** Dollar midpoint used for spreads (survey TCC at percentile, or fixed policy value). */
  anchor: number;
  /** Same as anchor for standard midPct=100 triples. */
  midpoint: number;
  min: number;
  max: number;
  /** Set when anchor came from survey; omitted when using a fixed dollar midpoint. */
  anchorPercentile?: number;
  /** True when anchor came from `dollarRangeFixedAnchorDollars`. */
  anchorIsFixed?: boolean;
};

/** When the band defines spreads + anchor (survey percentile or fixed $), returns min/max dollars. */
export function getBandMarketDollarRange(
  band: ExperienceBand,
  record: ProviderRecord,
  marketRow?: MarketRow
): BandMarketDollarRange | undefined {
  if (band.dollarRangeMinSpreadPercent == null || !Number.isFinite(band.dollarRangeMinSpreadPercent)) {
    return undefined;
  }
  if (band.dollarRangeMaxSpreadPercent == null || !Number.isFinite(band.dollarRangeMaxSpreadPercent)) {
    return undefined;
  }

  const fixed = band.dollarRangeFixedAnchorDollars;
  const useFixed = fixed != null && Number.isFinite(fixed) && fixed > 0;

  let anchor: number | undefined;
  let anchorPercentile: number | undefined;
  let anchorIsFixed: boolean | undefined;

  if (useFixed) {
    anchor = fixed;
    anchorIsFixed = true;
  } else {
    if (band.dollarRangeAnchorPercentile == null || !Number.isFinite(band.dollarRangeAnchorPercentile)) {
      return undefined;
    }
    anchor =
      (marketRow ? getTccDollarsAtPercentileFromMarketRow(marketRow, band.dollarRangeAnchorPercentile) : undefined) ??
      getTccDollarsAtPercentileFromRecord(record, band.dollarRangeAnchorPercentile);
    anchorPercentile = band.dollarRangeAnchorPercentile;
  }

  if (anchor == null || !Number.isFinite(anchor)) return undefined;

  const { min, midpoint, max } = computeMidpointAnchoredRangeFromBandSpreads(
    anchor,
    band.dollarRangeMinSpreadPercent,
    band.dollarRangeMaxSpreadPercent
  );
  return {
    anchor,
    midpoint,
    min,
    max,
    ...(anchorPercentile != null ? { anchorPercentile } : {}),
    ...(anchorIsFixed ? { anchorIsFixed: true } : {}),
  };
}

export function getDollarRangeAlignment(
  tccAt1Fte: number | undefined,
  min: number,
  max: number
): 'below' | 'in' | 'above' | undefined {
  if (tccAt1Fte == null || !Number.isFinite(tccAt1Fte)) return undefined;
  if (tccAt1Fte < min) return 'below';
  if (tccAt1Fte > max) return 'above';
  return 'in';
}

export function formatBandMarketDollarRangeSummary(
  range: { min: number; max: number },
  options?: { fractionDigits?: number }
): string {
  const digits = options?.fractionDigits ?? 0;
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });
  return `${fmt(range.min)}–${fmt(range.max)}`;
}
