/**
 * Configurable internal-equity suggestion settings per experience band.
 * Resolved settings drive getEquityRecommendation() and Controls UI copy.
 */

import type {
  ExperienceBand,
  EquityJudgeOn,
  EquityTargetPoint,
} from '../types/experience-band';
import type { BandMarketDollarRange } from './experience-band-dollar-range';

export type { EquityJudgeOn, EquityTargetPoint };

export interface ResolvedEquityBandSettings {
  enabled: boolean;
  targetPoint: EquityTargetPoint;
  customPercentile: number;
  gapClosePercent: number;
  judgeOn: EquityJudgeOn;
  preferDollarTarget: boolean;
  maxIncreasePercent?: number;
  minIncreasePercent?: number;
  holdProductivityFixed: boolean;
  holdSupplementalFixed: boolean;
}

export const EQUITY_TARGET_POINT_OPTIONS: {
  value: EquityTargetPoint;
  label: string;
  description: string;
  requiresDollarRange?: boolean;
}[] = [
  {
    value: 'percentileLow',
    label: 'Percentile band low',
    description: 'Market TCC at the band’s low target percentile (e.g. P25).',
  },
  {
    value: 'percentileMid',
    label: 'Percentile band midpoint',
    description: 'Market TCC at the average of the band’s low and high percentiles.',
  },
  {
    value: 'percentileHigh',
    label: 'Percentile band high',
    description: 'Market TCC at the band’s high target percentile (e.g. P50).',
  },
  {
    value: 'percentileCustom',
    label: 'Custom percentile',
    description: 'Market TCC at a percentile you specify (0–100).',
  },
  {
    value: 'dollarMin',
    label: 'Dollar range minimum',
    description: 'Bottom of the band’s market-anchored dollar range at 1.0 FTE.',
    requiresDollarRange: true,
  },
  {
    value: 'dollarMidpoint',
    label: 'Dollar range midpoint',
    description: 'Middle of the band’s dollar range at 1.0 FTE.',
    requiresDollarRange: true,
  },
  {
    value: 'dollarMax',
    label: 'Dollar range maximum',
    description: 'Top of the band’s dollar range at 1.0 FTE.',
    requiresDollarRange: true,
  },
  {
    value: 'dollarAnchor',
    label: 'Dollar anchor',
    description: 'Survey or fixed anchor TCC before min/max spreads.',
    requiresDollarRange: true,
  },
];

export const EQUITY_JUDGE_ON_OPTIONS: { value: EquityJudgeOn; label: string; description: string }[] = [
  {
    value: 'proposedOrCurrent',
    label: 'Proposed, else current',
    description: 'Use proposed TCC after merit changes when available; otherwise current.',
  },
  {
    value: 'proposed',
    label: 'Proposed only',
    description: 'Judge alignment on proposed TCC only (after merit modeling).',
  },
  {
    value: 'current',
    label: 'Current only',
    description: 'Judge alignment on current compensation only.',
  },
];

export function bandHasDollarRangeConfig(band: ExperienceBand): boolean {
  const hasSpreads =
    band.dollarRangeMinSpreadPercent != null &&
    band.dollarRangeMaxSpreadPercent != null &&
    Number.isFinite(band.dollarRangeMinSpreadPercent) &&
    Number.isFinite(band.dollarRangeMaxSpreadPercent);
  if (!hasSpreads) return false;
  const fixed = band.dollarRangeFixedAnchorDollars;
  if (fixed != null && Number.isFinite(fixed) && fixed > 0) return true;
  return band.dollarRangeAnchorPercentile != null && Number.isFinite(band.dollarRangeAnchorPercentile);
}

function legacyEnabled(band: ExperienceBand): boolean {
  return band.equitySuggestionsEnabled === true
    || band.suggestBaseToHitTarget === true
    || band.suggestBaseToHitDollarRangeMidpoint === true;
}

function legacyTargetPoint(band: ExperienceBand): EquityTargetPoint {
  if (band.equityTargetPoint) return band.equityTargetPoint;
  if (band.suggestBaseToHitDollarRangeMidpoint && bandHasDollarRangeConfig(band)) {
    return 'dollarMidpoint';
  }
  if (band.suggestBaseToHitTarget) return 'percentileLow';
  return 'percentileLow';
}

function legacyPreferDollar(band: ExperienceBand): boolean {
  if (band.equityPreferDollarTarget != null) return band.equityPreferDollarTarget;
  return band.suggestBaseToHitDollarRangeMidpoint === true && bandHasDollarRangeConfig(band);
}

/** Merge stored band fields + legacy flags into one resolved config. */
export function resolveEquityBandSettings(band: ExperienceBand): ResolvedEquityBandSettings {
  return {
    enabled: band.equitySuggestionsEnabled ?? legacyEnabled(band),
    targetPoint: legacyTargetPoint(band),
    customPercentile: band.equityCustomPercentile ?? 50,
    gapClosePercent: band.equityGapClosePercent ?? 100,
    judgeOn: band.equityJudgeOn ?? 'proposedOrCurrent',
    preferDollarTarget: legacyPreferDollar(band),
    maxIncreasePercent: band.equityMaxIncreasePercent,
    minIncreasePercent: band.equityMinIncreasePercent,
    holdProductivityFixed: band.equityHoldProductivityFixed !== false,
    holdSupplementalFixed: band.equityHoldSupplementalFixed !== false,
  };
}

export function equityTargetPointLabel(point: EquityTargetPoint, customPercentile?: number): string {
  const opt = EQUITY_TARGET_POINT_OPTIONS.find((o) => o.value === point);
  if (point === 'percentileCustom' && customPercentile != null) {
    return `P${customPercentile} (custom)`;
  }
  return opt?.label ?? point;
}

export function describeEquityBandSettings(
  band: ExperienceBand,
  dollarRange?: BandMarketDollarRange
): string {
  const s = resolveEquityBandSettings(band);
  if (!s.enabled) {
    return 'Equity suggestions are off for this band. Enable below to show recommendations and Apply equity in merit review.';
  }

  const target = equityTargetPointLabel(s.targetPoint, s.customPercentile);
  const path =
    s.preferDollarTarget && dollarRange != null ? 'dollar range' : 'percentile band';
  const gap =
    s.gapClosePercent >= 100
      ? 'full gap to target'
      : s.gapClosePercent <= 0
        ? 'no gap closure'
        : `${s.gapClosePercent}% of the gap to target`;
  const judge = EQUITY_JUDGE_ON_OPTIONS.find((o) => o.value === s.judgeOn)?.label ?? s.judgeOn;
  const caps: string[] = [];
  if (s.maxIncreasePercent != null && Number.isFinite(s.maxIncreasePercent)) {
    caps.push(`max ${s.maxIncreasePercent}% increase`);
  }
  if (s.minIncreasePercent != null && Number.isFinite(s.minIncreasePercent)) {
    caps.push(`min ${s.minIncreasePercent}% increase`);
  }
  const hold: string[] = [];
  if (s.holdProductivityFixed) hold.push('productivity');
  if (s.holdSupplementalFixed) hold.push('supplemental');
  const holdText =
    hold.length === 2
      ? 'Holds productivity and supplemental pay fixed when backing into base.'
      : hold.length === 1
        ? `Holds ${hold[0]} fixed when backing into base.`
        : 'Does not hold productivity or supplemental fixed (full target applied to base).';

  return [
    `When below target (${judge}), aim TCC at 1.0 FTE via ${path} → ${target}, closing ${gap}.`,
    holdText,
    caps.length ? `Caps: ${caps.join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}
