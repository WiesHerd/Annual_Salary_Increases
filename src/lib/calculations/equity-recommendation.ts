/**
 * Internal equity action recommendation: what to do when compensation is off from
 * the configured experience-band target. Uses FTE-normalized TCC percentile.
 */

import type { ProviderRecord } from '../../types/provider';
import type { MarketRow } from '../../types/market';
import type { ExperienceBand } from '../../types/experience-band';
import {
  getExperienceBandAlignment,
  getTargetTccRange,
} from './recalculate-provider-row';

export interface EquityRecommendation {
  action: string;
  detail?: string;
  suggestedTccAt1Fte?: number;
}

const STANDARD_PERCENTILES = [25, 50, 75, 90] as const;

function getMarketTccAtPercentile(record: ProviderRecord, percentile: number): number | undefined {
  const p = STANDARD_PERCENTILES.reduce((prev, curr) =>
    Math.abs(curr - percentile) < Math.abs(prev - percentile) ? curr : prev
  );
  switch (p) {
    case 25:
      return record.Market_TCC_25;
    case 50:
      return record.Market_TCC_50;
    case 75:
      return record.Market_TCC_75;
    case 90:
      return record.Market_TCC_90;
    default:
      return undefined;
  }
}

function getMarketTccAtPercentileFromRow(marketRow: MarketRow, percentile: number): number | undefined {
  const p = STANDARD_PERCENTILES.reduce((prev, curr) =>
    Math.abs(curr - percentile) < Math.abs(prev - percentile) ? curr : prev
  );
  return marketRow.tccPercentiles?.[p];
}

/**
 * Returns an internal-equity recommendation based on whether the provider's
 * compensation (TCC percentile at 1.0 FTE) is below, in, or above the experience-band target.
 * Uses proposed TCC percentile when available, else current. Comparisons are FTE-normalized.
 */
export function getEquityRecommendation(
  record: ProviderRecord,
  experienceBands: ExperienceBand[],
  marketRow?: MarketRow
): EquityRecommendation | undefined {
  if (experienceBands.length === 0) return undefined;

  const yoe = record.Years_of_Experience ?? record.Total_YOE;
  const tccPercentile = record.Proposed_TCC_Percentile ?? record.Current_TCC_Percentile;
  const alignment = getExperienceBandAlignment(yoe, tccPercentile, experienceBands);
  const targetRange = getTargetTccRange(yoe, experienceBands);

  if (alignment === undefined) return undefined;

  const targetDetail =
    targetRange !== '—' ? `Target: ${targetRange} percentile at 1.0 FTE. Comparisons use compensation at 1.0 FTE.` : undefined;

  if (alignment === 'below') {
    const band = experienceBands.find((b) => yoe != null && yoe >= b.minYoe && yoe <= b.maxYoe);
    const targetLow = band?.targetTccPercentileLow;
    const suggestedTccAt1Fte =
      targetLow != null
        ? (marketRow ? getMarketTccAtPercentileFromRow(marketRow, targetLow) : getMarketTccAtPercentile(record, targetLow))
        : undefined;

    return {
      action: 'Consider increase to bring compensation to experience band target.',
      detail: targetDetail,
      suggestedTccAt1Fte: suggestedTccAt1Fte != null && Number.isFinite(suggestedTccAt1Fte) ? suggestedTccAt1Fte : undefined,
    };
  }

  if (alignment === 'in') {
    return {
      action: 'Within internal equity target.',
      detail: targetDetail,
    };
  }

  // above
  return {
    action: 'Above internal equity target; consider reviewing for sustainability or deferring increase.',
    detail: targetDetail,
  };
}
