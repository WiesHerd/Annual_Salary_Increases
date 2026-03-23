/**
 * Recalculate derived provider fields when editable fields change.
 * Input: ProviderRecord, optional MarketRow for specialty, optional ExperienceBand[].
 * Output: Updated ProviderRecord with Proposed_Base_Salary, Proposed_TCC,
 * Proposed_TCC_Percentile, Approved_Increase_*, Applied_*, increase $/%, etc.
 */

import type { ProviderRecord } from '../../types/provider';
import type { MarketRow } from '../../types/market';
import type { ExperienceBand } from '../../types/experience-band';
import type { MeritMatrixRow } from '../../types/merit-matrix-row';
import type { PolicyEvaluationResult } from '../../types/compensation-policy';
import type { CfBySpecialtyRow } from '../../types/cf-by-specialty';
import type { ExperienceBandSurveyContext } from '../../types/market-survey-config';
import { DEFAULT_SURVEY_ID } from '../../types/market-survey-config';
import type { AppCombinedGroupRow } from '../../types/app-combined-group';
import { getEffectiveCfForProvider } from '../cf-resolver';
import { getEffectiveYoe } from '../effective-yoe';
import { getBandMarketDollarRange, getDollarRangeAlignment, formatBandMarketDollarRangeSummary } from '../experience-band-dollar-range';

/** FTE below this is flagged as higher risk when normalizing to 1.0 FTE for market comparison. */
export const FTE_NORMALIZATION_CAUTION_THRESHOLD = 0.7;

/**
 * True if the provider's Current FTE or Clinical FTE is below the caution threshold.
 * Normalizing to 1.0 FTE (dividing by a small FTE) can make percentiles less reliable.
 */
export function isLowFteForNormalization(record: ProviderRecord): boolean {
  const currentFte = record.Current_FTE ?? 1;
  const clinicalFte = record.Clinical_FTE ?? record.Current_FTE ?? 1;
  return currentFte < FTE_NORMALIZATION_CAUTION_THRESHOLD || clinicalFte < FTE_NORMALIZATION_CAUTION_THRESHOLD;
}

/** Supplemental pay components that add to TCC. */
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

/** Productivity component: CF × wRVUs (use prior year or normalized). */
function getProductivityComponent(cf: number, p: ProviderRecord): number {
  const wrvu = p.Prior_Year_WRVUs ?? p.Normalized_WRVUs ?? p.Adjusted_WRVUs ?? 0;
  return cf * wrvu;
}

/**
 * Interpolate percentile from value and bands (25, 50, 75, 90). Shared by TCC and wRVU.
 */
export function interpolatePercentile(value: number, percentiles: Record<number, number>): number | undefined {
  if (!percentiles || percentiles[50] == null) return undefined;
  const p25 = percentiles[25] ?? percentiles[50];
  const p50 = percentiles[50];
  const p75 = percentiles[75] ?? percentiles[50];
  const p90 = percentiles[90] ?? percentiles[75] ?? percentiles[50];
  if (value <= p25) return 25 * (value / p25) || 0;
  if (value <= p50) return 25 + 25 * ((value - p25) / (p50 - p25));
  if (value <= p75) return 50 + 25 * ((value - p50) / (p75 - p50));
  if (value <= p90) return 75 + 15 * ((value - p75) / (p90 - p75));
  return 90 + 10 * Math.min(1, (value - p90) / (p90 - p50) || 0);
}

/**
 * Interpolate TCC percentile from market bands (25, 50, 75, 90).
 * Market survey TCC benchmarks are typically at 1.0 FTE; call with TCC at 1 FTE for correct comparison.
 */
function interpolateTccPercentile(tcc: number, market: MarketRow): number | undefined {
  return interpolatePercentile(tcc, market.tccPercentiles ?? {});
}

function inListExact(value: string | undefined, list: string[] | undefined): boolean {
  if (!list || list.length === 0) return true;
  if (value == null || value.trim() === '') return false;
  const v = value.trim().toLowerCase();
  return list.some((s) => s.trim().toLowerCase() === v);
}

/**
 * True if provider specialty key matches a band specialty scope token, including APP combined-group names:
 * when a token equals a group's combinedGroupName, any listed providerSpecialties (or the name itself) match.
 */
function specialtyMatchesBandScope(
  specialty: string | undefined,
  list: string[] | undefined,
  appCombinedGroups?: AppCombinedGroupRow[]
): boolean {
  if (!list || list.length === 0) return true;
  if (specialty == null || specialty.trim() === '') return false;
  const v = specialty.trim().toLowerCase();
  const groups = appCombinedGroups?.length ? appCombinedGroups : undefined;
  for (const tokenRaw of list) {
    const t = tokenRaw.trim().toLowerCase();
    if (t === '') continue;
    if (v === t || v.includes(t) || t.includes(v)) return true;
    if (groups) {
      for (const g of groups) {
        const cg = g.combinedGroupName.trim().toLowerCase();
        if (cg !== t) continue;
        if (v === cg) return true;
        for (const ps of g.providerSpecialties ?? []) {
          if (ps.trim().toLowerCase() === v) return true;
        }
      }
    }
  }
  return false;
}

function resolveAppCombinedGroupsForBandMatching(
  record: ProviderRecord,
  experienceBandSurveyContext?: ExperienceBandSurveyContext
): AppCombinedGroupRow[] | undefined {
  if (!experienceBandSurveyContext) return undefined;
  const pt = (record.Provider_Type ?? '').trim();
  const surveyId = pt
    ? (experienceBandSurveyContext.providerTypeToSurvey[pt] ?? DEFAULT_SURVEY_ID)
    : DEFAULT_SURVEY_ID;
  const rows = experienceBandSurveyContext.surveyMappings[surveyId]?.appCombinedGroups ?? [];
  return rows.length > 0 ? rows : undefined;
}

/** True when provider matches optional population (provider type), specialty, and plan scopes on the band. */
export function experienceBandMatchesProvider(
  band: ExperienceBand,
  record: ProviderRecord,
  experienceBandSurveyContext?: ExperienceBandSurveyContext
): boolean {
  const providerTypeOrPop = (record.Provider_Type ?? record.Population ?? '').trim();
  if (!inListExact(providerTypeOrPop || undefined, band.populationScope)) return false;
  const spec =
    (record.Specialty ?? record.Market_Specialty_Override ?? record.Benchmark_Group ?? '').trim() || undefined;
  const appGroups = resolveAppCombinedGroupsForBandMatching(record, experienceBandSurveyContext);
  if (!specialtyMatchesBandScope(spec, band.specialtyScope, appGroups)) return false;
  const plan = (record.Compensation_Plan ?? '').trim() || undefined;
  if (!inListExact(plan, band.planScope)) return false;
  return true;
}

/**
 * First band in list order where effective YOE is in range and scopes match.
 * Put more specific (narrower scope) bands above general ones in Parameters.
 */
export function findMatchingExperienceBand(
  record: ProviderRecord,
  bands: ExperienceBand[],
  experienceBandSurveyContext?: ExperienceBandSurveyContext
): ExperienceBand | undefined {
  const yoe = getEffectiveYoe(record);
  if (yoe == null || !Number.isFinite(yoe)) return undefined;
  for (const b of bands) {
    if (yoe < b.minYoe || yoe > b.maxYoe) continue;
    if (!experienceBandMatchesProvider(b, record, experienceBandSurveyContext)) continue;
    return b;
  }
  return undefined;
}

/** Band label using effective YOE and scope matching (preferred in Salary Review). */
export function getExperienceBandLabelForProvider(
  record: ProviderRecord,
  bands: ExperienceBand[],
  experienceBandSurveyContext?: ExperienceBandSurveyContext
): string {
  return findMatchingExperienceBand(record, bands, experienceBandSurveyContext)?.label ?? '—';
}

/** Target percentile range, and optional market TCC dollar range when configured on the matched band. */
export function getTargetTccRangeForProvider(
  record: ProviderRecord,
  bands: ExperienceBand[],
  marketRow?: MarketRow,
  experienceBandSurveyContext?: ExperienceBandSurveyContext
): string {
  const band = findMatchingExperienceBand(record, bands, experienceBandSurveyContext);
  if (!band) return '—';
  const pct = `${band.targetTccPercentileLow}–${band.targetTccPercentileHigh}`;
  const dollar = getBandMarketDollarRange(band, record, marketRow);
  if (dollar)
    return `${pct} | ${formatBandMarketDollarRangeSummary(dollar, { fractionDigits: dollar.anchorIsFixed ? 2 : 0 })}`;
  return pct;
}

/**
 * Band alignment: when the matched band defines a dollar range, compares TCC at 1.0 FTE to min/max;
 * otherwise compares TCC percentile to the band's target percentile range.
 */
export function getExperienceBandAlignmentForProvider(
  record: ProviderRecord,
  currentTccPercentile: number | undefined,
  bands: ExperienceBand[],
  marketRow?: MarketRow,
  experienceBandSurveyContext?: ExperienceBandSurveyContext
): ExperienceBandAlignment | undefined {
  const band = findMatchingExperienceBand(record, bands, experienceBandSurveyContext);
  if (!band) return undefined;

  const dollar = getBandMarketDollarRange(band, record, marketRow);
  const tcc1 = record.Proposed_TCC_at_1FTE ?? record.Current_TCC_at_1FTE;
  if (dollar != null && tcc1 != null && Number.isFinite(tcc1)) {
    return getDollarRangeAlignment(tcc1, dollar.min, dollar.max);
  }

  return getExperienceBandAlignment(getEffectiveYoe(record), currentTccPercentile, [band]);
}

/** Get experience band label for YOE from config. */
export function getExperienceBandLabel(yoe: number | undefined, bands: ExperienceBand[]): string {
  if (yoe == null || !Number.isFinite(yoe) || bands.length === 0) return '—';
  const band = bands.find((b) => yoe >= b.minYoe && yoe <= b.maxYoe);
  return band?.label ?? '—';
}

/** Get target TCC range string (e.g. "25–50") for experience band. */
export function getTargetTccRange(yoe: number | undefined, bands: ExperienceBand[]): string {
  if (yoe == null || !Number.isFinite(yoe) || bands.length === 0) return '—';
  const band = bands.find((b) => yoe >= b.minYoe && yoe <= b.maxYoe);
  if (!band) return '—';
  return `${band.targetTccPercentileLow}–${band.targetTccPercentileHigh}`;
}

export type ExperienceBandAlignment = 'below' | 'in' | 'above';

/**
 * Compare current TCC percentile to the experience band target range.
 * Returns 'below' | 'in' | 'above' when determinable; undefined when band or percentile is missing.
 */
export function getExperienceBandAlignment(
  yoe: number | undefined,
  currentTccPercentile: number | undefined,
  bands: ExperienceBand[]
): ExperienceBandAlignment | undefined {
  if (yoe == null || !Number.isFinite(yoe) || bands.length === 0) return undefined;
  if (currentTccPercentile == null || !Number.isFinite(currentTccPercentile)) return undefined;
  const band = bands.find((b) => yoe >= b.minYoe && yoe <= b.maxYoe);
  if (!band) return undefined;
  const { targetTccPercentileLow, targetTccPercentileHigh } = band;
  if (currentTccPercentile < targetTccPercentileLow) return 'below';
  if (currentTccPercentile > targetTccPercentileHigh) return 'above';
  return 'in';
}

export interface RecalculateProviderRowInput {
  record: ProviderRecord;
  marketRow?: MarketRow;
  experienceBands?: ExperienceBand[];
  /** When set with experience bands, aligns APP cohort scope with Data → Specialty map combined groups. */
  experienceBandSurveyContext?: ExperienceBandSurveyContext;
  /** Optional merit matrix for default increase lookup by evaluation score + performance label. */
  meritMatrixRows?: MeritMatrixRow[];
  /** Optional policy engine result; when present, used as default % and source of policy metadata. */
  policyResult?: PolicyEvaluationResult;
  /** Optional CF by specialty; when record lacks Current_CF/Proposed_CF, lookup by specialty. */
  cfBySpecialty?: CfBySpecialtyRow[];
}

/**
 * Recalculate derived fields on a provider record after editable fields change.
 * - If Approved_Increase_Percent is set: compute Approved_Increase_Amount and Proposed_Base_Salary.
 * - If Approved_Increase_Amount is set: compute Approved_Increase_Percent and Proposed_Base_Salary.
 * - If Proposed_Base_Salary is set directly: optionally back out approved increase %/$ for display.
 * - Proposed_TCC = Proposed_Base_Salary + (Proposed_CF × wRVU) + supplemental.
 * - Proposed_TCC_Percentile from market interpolation.
 * - Applied_Increase_Percent, Merit_Increase_Amount, etc. from approved values.
 */
export function recalculateProviderRow(input: RecalculateProviderRowInput): ProviderRecord {
  const { record: p, marketRow } = input;
  const currentBase = p.Current_Base_Salary ?? 0;
  let proposedBase = p.Proposed_Base_Salary;
  let approvedPct = p.Approved_Increase_Percent;
  let approvedAmt = p.Approved_Increase_Amount;

  // If policy assigns fixed base salary (e.g. YOE tier base salary model), use it — tier base wins over saved %/amt
  // Tier base salaries are defined at 1.0 FTE; normalize by provider's FTE when applying
  if (input.policyResult?.proposedBaseSalary != null && Number.isFinite(input.policyResult.proposedBaseSalary)) {
    const fte = p.Current_FTE ?? 1;
    proposedBase = input.policyResult.proposedBaseSalary * (fte > 0 ? fte : 1);
    approvedAmt = proposedBase - currentBase;
    approvedPct = currentBase > 0 ? (approvedAmt / currentBase) * 100 : 0;
  }
  // If user set approved %, derive amount and proposed base (override when no tier base from policy)
  else if (approvedPct != null && Number.isFinite(approvedPct)) {
    approvedAmt = (currentBase * approvedPct) / 100;
    proposedBase = currentBase + (approvedAmt ?? 0);
  }
  // If user set approved amount, derive percent and proposed base (override when no tier base from policy)
  else if (approvedAmt != null && Number.isFinite(approvedAmt)) {
    approvedPct = currentBase > 0 ? (approvedAmt / currentBase) * 100 : 0;
    proposedBase = currentBase + approvedAmt;
  }
  // If user set proposed base only, derive approved amount/percent
  else if (proposedBase != null && Number.isFinite(proposedBase)) {
    approvedAmt = proposedBase - currentBase;
    approvedPct = currentBase > 0 ? ((proposedBase - currentBase) / currentBase) * 100 : 0;
  }
  // Otherwise keep default increase and derive proposed base (policy result, record, or merit matrix lookup)
  else {
    let defaultPct = p.Default_Increase_Percent ?? input.policyResult?.finalRecommendedIncreasePercent;
    if (defaultPct == null && input.meritMatrixRows?.length && p.Evaluation_Score != null && p.Performance_Category) {
      const match = input.meritMatrixRows.find(
        (m) => m.evaluationScore === Number(p.Evaluation_Score) && m.performanceLabel.toLowerCase().trim() === String(p.Performance_Category).toLowerCase().trim()
      );
      if (match) defaultPct = match.defaultIncreasePercent;
    }
    defaultPct = defaultPct ?? 0;
    approvedPct = approvedPct ?? defaultPct;
    approvedAmt = (currentBase * (approvedPct ?? 0)) / 100;
    proposedBase = currentBase + (approvedAmt ?? 0);
  }

  let cf = p.Proposed_CF ?? p.Current_CF;
  if (cf == null && input.cfBySpecialty?.length) {
    cf = getEffectiveCfForProvider(p, input.cfBySpecialty).proposedCf;
  }
  cf = cf ?? 0;
  const productivity = getProductivityComponent(cf, p);
  const supplemental = getSupplementalTotal(p);
  const proposedTcc = (proposedBase ?? 0) + productivity + supplemental;

  // Market TCC percentiles are at 1.0 FTE; use TCC at 1 FTE when available, else derive from raw TCC / FTE
  const fte = p.Current_FTE ?? 1;
  const tccForPercentile =
    p.Proposed_TCC_at_1FTE ??
    p.Current_TCC_at_1FTE ??
    (fte > 0 && Number.isFinite(proposedTcc) ? proposedTcc / fte : proposedTcc);

  let proposedTccPercentile: number | undefined;
  if (marketRow && Number.isFinite(tccForPercentile)) {
    proposedTccPercentile = interpolateTccPercentile(tccForPercentile, marketRow);
  } else {
    proposedTccPercentile = p.Proposed_TCC_Percentile;
  }

  const policyResult = input.policyResult;
  return {
    ...p,
    Approved_Increase_Percent: approvedPct,
    Approved_Increase_Amount: approvedAmt,
    Proposed_Base_Salary: proposedBase,
    Applied_Increase_Percent: approvedPct,
    Merit_Increase_Amount: approvedAmt,
    Proposed_TCC: proposedTcc,
    Proposed_TCC_Percentile: proposedTccPercentile,
    ...(policyResult && {
      Policy_Applied: true,
      Policy_Source_Name: policyResult.finalPolicySource,
      Policy_Type: policyResult.finalModelType,
      Policy_Logic_Status: policyResult.blocked ? 'Blocked' : policyResult.finalModelType ?? 'Applied',
      Policy_Explanation_Summary: policyResult.explanation?.slice(0, 2).join('; ') ?? undefined,
      Policy_Rule_Id: policyResult.appliedPolicies?.[0]?.id,
      Policy_Tier_Assigned: policyResult.tierAssigned,
      Manual_Review_Flag: policyResult.manualReview,
      // When policy assigns a tier and Proposed_Tier is empty, populate so the tier is visible in "Proposed Tier" column
      ...(policyResult.tierAssigned != null &&
        (p.Proposed_Tier == null || String(p.Proposed_Tier).trim() === '') && {
          Proposed_Tier: policyResult.tierAssigned,
        }),
    }),
  };
}
