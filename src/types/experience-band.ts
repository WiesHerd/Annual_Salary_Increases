/**
 * Experience band configuration for compensation positioning guidance.
 * Each band defines a YOE range and target TCC percentile range.
 */

/** Where to aim TCC at 1.0 FTE when a provider is below the experience-band target. */
export type EquityTargetPoint =
  | 'percentileLow'
  | 'percentileMid'
  | 'percentileHigh'
  | 'percentileCustom'
  | 'dollarMin'
  | 'dollarMidpoint'
  | 'dollarMax'
  | 'dollarAnchor';

/** Which compensation snapshot drives below / in / above alignment for equity. */
export type EquityJudgeOn = 'proposedOrCurrent' | 'proposed' | 'current';

export interface ExperienceBand {
  id: string;
  label: string;
  /** Min years of experience (inclusive). */
  minYoe: number;
  /** Max years of experience (inclusive). */
  maxYoe: number;
  /** Target TCC percentile low (e.g. 25). */
  targetTccPercentileLow: number;
  /** Target TCC percentile high (e.g. 50). */
  targetTccPercentileHigh: number;
  /** Optional: limit to population or specialty. */
  populationScope?: string[];
  specialtyScope?: string[];
  /** Optional: limit to plan type(s). */
  planScope?: string[];
  /** When true, show suggested base (and Apply) in review so TCC at 1.0 FTE hits target. */
  suggestBaseToHitTarget?: boolean;

  /**
   * Optional market-anchored TCC dollar band at 1.0 FTE.
   * Midpoint is the survey TCC at this percentile; min/max are anchor × (1 − minSpread%) and × (1 + maxSpread%).
   * Equivalent to triple **(100−minSpread)/100 / 1.00 / (100+maxSpread)/100** of anchor (e.g. 20/20 → 80/100/120).
   *
   * When `dollarRangeFixedAnchorDollars` is set, it **replaces** the survey midpoint (same min/max % math).
   * Use for policy midpoints that are adjusted off-survey (e.g. hourly rate you set); keep units consistent
   * with how **total cash at 1.0 FTE** is shown in review, or interpret alignment accordingly.
   */
  dollarRangeAnchorPercentile?: number;
  /** Optional fixed midpoint ($); when set, overrides survey TCC at anchor percentile for the dollar band only. */
  dollarRangeFixedAnchorDollars?: number;
  /** Percent below anchor for range minimum (e.g. 20 → min = 80% of anchor TCC; triple 80/100/…). */
  dollarRangeMinSpreadPercent?: number;
  /** Percent above anchor for range maximum (e.g. 20 → max = 120% of anchor TCC; triple …/100/120). */
  dollarRangeMaxSpreadPercent?: number;
  /**
   * When below the dollar range and this flag is set, equity suggestion targets TCC at 1.0 FTE
   * at the midpoint of the dollar min/max (in addition to percentile-based logic when no dollar range).
   * @deprecated Use `equitySuggestionsEnabled` + `equityTargetPoint` / `equityPreferDollarTarget`.
   */
  suggestBaseToHitDollarRangeMidpoint?: boolean;

  // --- Internal equity suggestions (Merit review → Apply equity) ---

  /** Master switch: show suggestions and allow Apply equity for providers in this band. */
  equitySuggestionsEnabled?: boolean;
  /** Where to aim TCC at 1.0 FTE when below target. */
  equityTargetPoint?: EquityTargetPoint;
  /** Used when equityTargetPoint is percentileCustom (0–100). */
  equityCustomPercentile?: number;
  /** % of the gap to close toward target (100 = full target, 50 = halfway). */
  equityGapClosePercent?: number;
  /** Which TCC snapshot drives below / in / above for equity. */
  equityJudgeOn?: EquityJudgeOn;
  /** When the band has a dollar range, use dollar target vs percentile target. */
  equityPreferDollarTarget?: boolean;
  /** Optional cap on suggested approved increase percent. */
  equityMaxIncreasePercent?: number;
  /** Optional floor on suggested approved increase percent. */
  equityMinIncreasePercent?: number;
  /** When true (default), back-solve holds CF×wRVU fixed. */
  equityHoldProductivityFixed?: boolean;
  /** When true (default), back-solve holds supplemental comp fixed. */
  equityHoldSupplementalFixed?: boolean;
}
