/**
 * Internal equity action recommendation: what to do when compensation is off from
 * the configured experience-band target. Uses FTE-normalized TCC percentile.
 */

import type { ProviderRecord } from '../../types/provider';
import type { MarketRow } from '../../types/market';
import type { ExperienceBand } from '../../types/experience-band';
import type { ExperienceBandSurveyContext } from '../../types/market-survey-config';
import { getBandMarketDollarRange } from '../experience-band-dollar-range';
import {
  findMatchingExperienceBand,
  getExperienceBandAlignmentForProvider,
  getTargetTccRangeForProvider,
} from './recalculate-provider-row';

export interface EquityRecommendation {
  action: string;
  detail?: string;
  suggestedTccAt1Fte?: number;
  /** Suggested base salary (at provider FTE) to achieve target TCC at 1.0 FTE. Set when below target and band has suggestBaseToHitTarget. */
  suggestedBaseAtFte?: number;
  /** Suggested increase amount (suggestedBaseAtFte - current base). */
  suggestedIncreaseAmount?: number;
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

/** Supplemental total (same components as recalculate-provider-row). */
function getSupplementalTotal(p: ProviderRecord): number {
  return (
    (p.Division_Chief_Pay ?? 0) +
    (p.Medical_Director_Pay ?? 0) +
    (p.Teaching_Pay ?? 0) +
    (p.PSQ_Pay ?? 0) +
    (p.Quality_Bonus ?? 0) +
    (p.Other_Recurring_Comp ?? 0)
  );
}

/** Productivity component: CF × wRVUs (same as recalculate-provider-row). */
function getProductivityComponent(cf: number, p: ProviderRecord): number {
  const wrvu = p.Prior_Year_WRVUs ?? p.Normalized_WRVUs ?? p.Adjusted_WRVUs ?? 0;
  return cf * wrvu;
}

/**
 * Compute suggested base at provider FTE so that TCC at 1.0 FTE equals targetTccAt1Fte.
 * suggestedBase = targetTccAt1Fte * fte - productivity - supplemental.
 */
export function getSuggestedBaseForTargetTcc(
  record: ProviderRecord,
  targetTccAt1Fte: number
): { suggestedBaseAtFte: number; suggestedIncreaseAmount: number } | undefined {
  const fte = record.Current_FTE ?? 1;
  if (!Number.isFinite(fte) || fte <= 0) return undefined;
  const cf = record.Proposed_CF ?? record.Current_CF ?? 0;
  const productivity = getProductivityComponent(cf, record);
  const supplemental = getSupplementalTotal(record);
  const suggestedBaseAtFte = targetTccAt1Fte * fte - productivity - supplemental;
  const currentBase = record.Current_Base_Salary ?? 0;
  const suggestedIncreaseAmount = suggestedBaseAtFte - currentBase;
  return { suggestedBaseAtFte, suggestedIncreaseAmount };
}

/**
 * Returns an internal-equity recommendation based on whether the provider's
 * compensation (TCC percentile at 1.0 FTE) is below, in, or above the experience-band target.
 * Uses proposed TCC percentile when available, else current. Comparisons are FTE-normalized.
 */
export function getEquityRecommendation(
  record: ProviderRecord,
  experienceBands: ExperienceBand[],
  marketRow?: MarketRow,
  experienceBandSurveyContext?: ExperienceBandSurveyContext
): EquityRecommendation | undefined {
  if (experienceBands.length === 0) return undefined;

  const tccPercentile = record.Proposed_TCC_Percentile ?? record.Current_TCC_Percentile;
  const alignment = getExperienceBandAlignmentForProvider(
    record,
    tccPercentile,
    experienceBands,
    marketRow,
    experienceBandSurveyContext
  );
  const targetRange = getTargetTccRangeForProvider(
    record,
    experienceBands,
    marketRow,
    experienceBandSurveyContext
  );

  if (alignment === undefined) return undefined;

  const targetDetail =
    targetRange !== '—' ? `Target band: ${targetRange}. Comparisons use TCC at 1.0 FTE.` : undefined;

  if (alignment === 'below') {
    const band = findMatchingExperienceBand(record, experienceBands, experienceBandSurveyContext);
    const dollar = band ? getBandMarketDollarRange(band, record, marketRow) : undefined;
    const tcc1 = record.Proposed_TCC_at_1FTE ?? record.Current_TCC_at_1FTE;
    const usedDollarAlignment =
      dollar != null && tcc1 != null && Number.isFinite(tcc1);

    let suggestedTccAt1Fte: number | undefined;
    let suggestedBaseAtFte: number | undefined;
    let suggestedIncreaseAmount: number | undefined;

    if (usedDollarAlignment && dollar && band) {
      const targetMid = dollar.midpoint;
      suggestedTccAt1Fte = targetMid;
      if (band.suggestBaseToHitDollarRangeMidpoint) {
        const suggested = getSuggestedBaseForTargetTcc(record, targetMid);
        if (suggested) {
          suggestedBaseAtFte = suggested.suggestedBaseAtFte;
          suggestedIncreaseAmount = suggested.suggestedIncreaseAmount;
        }
      }
    } else if (band) {
      const targetLow = band.targetTccPercentileLow;
      const atLow =
        targetLow != null
          ? (marketRow ? getMarketTccAtPercentileFromRow(marketRow, targetLow) : getMarketTccAtPercentile(record, targetLow))
          : undefined;
      suggestedTccAt1Fte = atLow != null && Number.isFinite(atLow) ? atLow : undefined;
      if (band.suggestBaseToHitTarget && suggestedTccAt1Fte != null) {
        const suggested = getSuggestedBaseForTargetTcc(record, suggestedTccAt1Fte);
        if (suggested) {
          suggestedBaseAtFte = suggested.suggestedBaseAtFte;
          suggestedIncreaseAmount = suggested.suggestedIncreaseAmount;
        }
      }
    }

    return {
      action: 'Consider increase to bring compensation to experience band target.',
      detail: targetDetail,
      suggestedTccAt1Fte,
      suggestedBaseAtFte,
      suggestedIncreaseAmount,
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
