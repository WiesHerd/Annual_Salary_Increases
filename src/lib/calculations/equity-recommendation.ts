/**
 * Internal equity action recommendation: configurable per experience band.
 * Uses FTE-normalized TCC; settings from Controls → Experience bands.
 */

import type { ProviderRecord } from '../../types/provider';
import type { MarketRow } from '../../types/market';
import type { ExperienceBand } from '../../types/experience-band';
import type { ExperienceBandSurveyContext } from '../../types/market-survey-config';
import {
  getBandMarketDollarRange,
  getTccDollarsAtPercentileFromMarketRow,
  getTccDollarsAtPercentileFromRecord,
  type BandMarketDollarRange,
} from '../experience-band-dollar-range';
import {
  equityTargetPointLabel,
  resolveEquityBandSettings,
  type ResolvedEquityBandSettings,
} from '../equity-settings';
import {
  findMatchingExperienceBand,
  getExperienceBandAlignmentForProvider,
  getTargetTccRangeForProvider,
} from './recalculate-provider-row';

export interface EquityRecommendationMethod {
  bandLabel: string;
  alignment: 'below' | 'in' | 'above';
  judgeOn: string;
  targetPath: 'percentile' | 'dollar';
  targetLabel: string;
  gapClosePercent: number;
  holdProductivityFixed: boolean;
  holdSupplementalFixed: boolean;
  capsApplied: string[];
}

export interface EquityRecommendation {
  action: string;
  detail?: string;
  /** One-line summary of the configured method (for table cells). */
  methodSummary?: string;
  /** Full transparency breakdown (for detail panel). */
  method?: EquityRecommendationMethod;
  suggestedTccAt1Fte?: number;
  /** Full target TCC before gap % is applied. */
  fullTargetTccAt1Fte?: number;
  suggestedBaseAtFte?: number;
  suggestedIncreaseAmount?: number;
  /** Raw increase before caps; present when a cap changed the outcome. */
  uncappedIncreaseAmount?: number;
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

function pickTccPercentile(record: ProviderRecord, judgeOn: ResolvedEquityBandSettings['judgeOn']): number | undefined {
  const proposed = record.Proposed_TCC_Percentile;
  const current = record.Current_TCC_Percentile;
  if (judgeOn === 'current') return current;
  if (judgeOn === 'proposed') return proposed;
  return proposed ?? current;
}

function pickTccAt1Fte(record: ProviderRecord, judgeOn: ResolvedEquityBandSettings['judgeOn']): number | undefined {
  const proposed = record.Proposed_TCC_at_1FTE;
  const current = record.Current_TCC_at_1FTE;
  if (judgeOn === 'current') return current;
  if (judgeOn === 'proposed') return proposed;
  return proposed ?? current;
}

function resolvePercentileForTarget(band: ExperienceBand, settings: ResolvedEquityBandSettings): number {
  switch (settings.targetPoint) {
    case 'percentileLow':
      return band.targetTccPercentileLow;
    case 'percentileHigh':
      return band.targetTccPercentileHigh;
    case 'percentileMid':
      return (band.targetTccPercentileLow + band.targetTccPercentileHigh) / 2;
    case 'percentileCustom':
      return settings.customPercentile;
    default:
      return band.targetTccPercentileLow;
  }
}

function resolveFullTargetTccAt1Fte(
  band: ExperienceBand,
  settings: ResolvedEquityBandSettings,
  record: ProviderRecord,
  marketRow: MarketRow | undefined,
  dollarRange: BandMarketDollarRange | undefined,
  useDollarPath: boolean
): { target: number | undefined; path: 'percentile' | 'dollar'; targetLabel: string } {
  if (useDollarPath && dollarRange) {
    let target: number | undefined;
    let targetLabel: string;
    switch (settings.targetPoint) {
      case 'dollarMin':
        target = dollarRange.min;
        targetLabel = 'Dollar range minimum';
        break;
      case 'dollarMax':
        target = dollarRange.max;
        targetLabel = 'Dollar range maximum';
        break;
      case 'dollarAnchor':
        target = dollarRange.anchor;
        targetLabel = 'Dollar anchor';
        break;
      case 'dollarMidpoint':
      default:
        target = dollarRange.midpoint;
        targetLabel = 'Dollar range midpoint';
        break;
    }
    return { target, path: 'dollar', targetLabel };
  }

  const pct = resolvePercentileForTarget(band, settings);
  const target =
    (marketRow ? getTccDollarsAtPercentileFromMarketRow(marketRow, pct) : undefined) ??
    getTccDollarsAtPercentileFromRecord(record, pct);
  return {
    target: target != null && Number.isFinite(target) ? target : undefined,
    path: 'percentile',
    targetLabel: equityTargetPointLabel(settings.targetPoint, settings.customPercentile),
  };
}

function applyGapClose(
  currentTccAt1Fte: number | undefined,
  fullTarget: number,
  gapClosePercent: number
): number {
  if (gapClosePercent >= 100) return fullTarget;
  if (gapClosePercent <= 0) {
    return currentTccAt1Fte != null && Number.isFinite(currentTccAt1Fte) ? currentTccAt1Fte : fullTarget;
  }
  const current = currentTccAt1Fte != null && Number.isFinite(currentTccAt1Fte) ? currentTccAt1Fte : fullTarget;
  return current + ((fullTarget - current) * gapClosePercent) / 100;
}

/**
 * Compute suggested base at provider FTE for a target TCC at 1.0 FTE.
 */
export function getSuggestedBaseForTargetTcc(
  record: ProviderRecord,
  targetTccAt1Fte: number,
  options?: { holdProductivityFixed?: boolean; holdSupplementalFixed?: boolean }
): { suggestedBaseAtFte: number; suggestedIncreaseAmount: number } | undefined {
  const fte = record.Current_FTE ?? 1;
  if (!Number.isFinite(fte) || fte <= 0) return undefined;
  const cf = record.Proposed_CF ?? record.Current_CF ?? 0;
  const holdProductivity = options?.holdProductivityFixed !== false;
  const holdSupplemental = options?.holdSupplementalFixed !== false;
  const productivity = holdProductivity ? getProductivityComponent(cf, record) : 0;
  const supplemental = holdSupplemental ? getSupplementalTotal(record) : 0;
  const suggestedBaseAtFte = targetTccAt1Fte * fte - productivity - supplemental;
  const currentBase = record.Current_Base_Salary ?? 0;
  const suggestedIncreaseAmount = suggestedBaseAtFte - currentBase;
  return { suggestedBaseAtFte, suggestedIncreaseAmount };
}

function applyIncreaseCaps(
  record: ProviderRecord,
  rawIncrease: number,
  settings: ResolvedEquityBandSettings
): { amount: number; capsApplied: string[]; uncapped?: number } {
  const currentBase = record.Current_Base_Salary ?? 0;
  let amount = rawIncrease;
  const capsApplied: string[] = [];
  const uncapped = rawIncrease;

  if (settings.maxIncreasePercent != null && Number.isFinite(settings.maxIncreasePercent) && currentBase > 0) {
    const maxAmt = (currentBase * settings.maxIncreasePercent) / 100;
    if (amount > maxAmt) {
      amount = maxAmt;
      capsApplied.push(`Capped at ${settings.maxIncreasePercent}% max increase`);
    }
  }
  if (settings.minIncreasePercent != null && Number.isFinite(settings.minIncreasePercent) && currentBase > 0) {
    const minAmt = (currentBase * settings.minIncreasePercent) / 100;
    if (amount < minAmt) {
      amount = minAmt;
      capsApplied.push(`Floored at ${settings.minIncreasePercent}% min increase`);
    }
  }

  return {
    amount,
    capsApplied,
    uncapped: capsApplied.length > 0 ? uncapped : undefined,
  };
}

/**
 * Returns an internal-equity recommendation from band config and provider state.
 */
export function getEquityRecommendation(
  record: ProviderRecord,
  experienceBands: ExperienceBand[],
  marketRow?: MarketRow,
  experienceBandSurveyContext?: ExperienceBandSurveyContext
): EquityRecommendation | undefined {
  if (experienceBands.length === 0) return undefined;

  const band = findMatchingExperienceBand(record, experienceBands, experienceBandSurveyContext);
  if (!band) return undefined;

  const settings = resolveEquityBandSettings(band);
  const tccPercentile = pickTccPercentile(record, settings.judgeOn);
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

  const judgeLabel =
    settings.judgeOn === 'proposedOrCurrent'
      ? 'Proposed, else current'
      : settings.judgeOn === 'proposed'
        ? 'Proposed'
        : 'Current';

  const methodBase: EquityRecommendationMethod = {
    bandLabel: band.label,
    alignment,
    judgeOn: judgeLabel,
    targetPath: 'percentile',
    targetLabel: '—',
    gapClosePercent: settings.gapClosePercent,
    holdProductivityFixed: settings.holdProductivityFixed,
    holdSupplementalFixed: settings.holdSupplementalFixed,
    capsApplied: [],
  };

  if (alignment === 'in') {
    return {
      action: 'Within internal equity target.',
      detail: targetDetail,
      methodSummary: `${band.label} · ${judgeLabel} · in range`,
      method: { ...methodBase, targetLabel: 'No adjustment (in range)' },
    };
  }

  if (alignment === 'above') {
    return {
      action: 'Above internal equity target; consider reviewing for sustainability or deferring increase.',
      detail: targetDetail,
      methodSummary: `${band.label} · ${judgeLabel} · above target`,
      method: { ...methodBase, targetLabel: 'No increase suggested (above target)' },
    };
  }

  // below target
  if (!settings.enabled) {
    return {
      action: 'Below experience band target. Enable equity suggestions on this band in Controls to compute an increase.',
      detail: targetDetail,
      methodSummary: `${band.label} · suggestions disabled in Controls`,
      method: { ...methodBase, targetLabel: 'Suggestions disabled for this band' },
    };
  }

  const dollarRange = getBandMarketDollarRange(band, record, marketRow);
  const useDollarPath = settings.preferDollarTarget && dollarRange != null;
  const { target: fullTarget, path, targetLabel } = resolveFullTargetTccAt1Fte(
    band,
    settings,
    record,
    marketRow,
    dollarRange,
    useDollarPath
  );

  const currentTcc1 = pickTccAt1Fte(record, settings.judgeOn);
  const suggestedTccAt1Fte =
    fullTarget != null && Number.isFinite(fullTarget)
      ? applyGapClose(currentTcc1, fullTarget, settings.gapClosePercent)
      : undefined;

  let suggestedBaseAtFte: number | undefined;
  let suggestedIncreaseAmount: number | undefined;
  let uncappedIncreaseAmount: number | undefined;
  const capsApplied: string[] = [];

  if (suggestedTccAt1Fte != null && Number.isFinite(suggestedTccAt1Fte)) {
    const suggested = getSuggestedBaseForTargetTcc(record, suggestedTccAt1Fte, {
      holdProductivityFixed: settings.holdProductivityFixed,
      holdSupplementalFixed: settings.holdSupplementalFixed,
    });
    if (suggested) {
      suggestedBaseAtFte = suggested.suggestedBaseAtFte;
      const capped = applyIncreaseCaps(record, suggested.suggestedIncreaseAmount, settings);
      suggestedIncreaseAmount = capped.amount;
      capsApplied.push(...capped.capsApplied);
      uncappedIncreaseAmount = capped.uncapped;
    }
  }

  const gapLabel =
    settings.gapClosePercent >= 100
      ? 'full gap'
      : `${settings.gapClosePercent}% of gap`;
  const methodSummary = [
    band.label,
    judgeLabel,
    useDollarPath ? 'dollar' : 'percentile',
    targetLabel,
    gapLabel,
    capsApplied.length ? 'capped' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const holdParts: string[] = [];
  if (settings.holdProductivityFixed) holdParts.push('productivity');
  if (settings.holdSupplementalFixed) holdParts.push('supplemental');
  const holdNote =
    holdParts.length > 0
      ? `Back-solve holds ${holdParts.join(' and ')} fixed.`
      : 'Back-solve does not hold productivity or supplemental fixed.';

  return {
    action: 'Consider increase to bring compensation toward the configured equity target.',
    detail: [targetDetail, holdNote, capsApplied.length ? capsApplied.join(' ') : null]
      .filter(Boolean)
      .join(' '),
    methodSummary,
    method: {
      ...methodBase,
      targetPath: path,
      targetLabel,
      capsApplied,
    },
    suggestedTccAt1Fte,
    fullTargetTccAt1Fte: fullTarget,
    suggestedBaseAtFte,
    suggestedIncreaseAmount,
    uncappedIncreaseAmount,
  };
}
