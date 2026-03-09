/**
 * Join additional datasets (market, incentives, productivity) into provider records.
 * Market: match by Market_Specialty_Override, then Specialty, then Benchmark_Group.
 * Incentives/Productivity: match by Employee_ID.
 */

import type { ProviderRecord } from '../types/provider';
import type { MarketRow } from '../types/market';
import type { IncentiveJoinRow, ProductivityJoinRow, EvaluationJoinRow } from '../types/upload';
import { interpolatePercentile } from './calculations/recalculate-provider-row';

/** FTE-normalized wRVU for percentile comparison (market wRVU benchmarks are at 1.0 FTE). */
function getNormalizedWrvu(p: ProviderRecord): number | undefined {
  const raw = p.Normalized_WRVUs ?? p.Prior_Year_WRVUs ?? p.Adjusted_WRVUs;
  if (raw == null || !Number.isFinite(raw)) return undefined;
  if (p.Normalized_WRVUs != null) return raw;
  const fte = p.Current_FTE ?? 1;
  return fte > 0 ? raw / fte : raw;
}

/** Build a lookup: (key) => market row. Exact match first, then case-insensitive. Used for auto-mapping and display. */
export function buildMarketLookup(marketRows: MarketRow[]): (key: string) => MarketRow | undefined {
  const bySpecialty = new Map<string, MarketRow>();
  const bySpecialtyLower = new Map<string, MarketRow>();
  for (const row of marketRows) {
    const s = row.specialty.trim();
    bySpecialty.set(s, row);
    bySpecialtyLower.set(s.toLowerCase(), row);
  }
  return (key: string) => {
    const k = key.trim();
    if (!k) return undefined;
    return bySpecialty.get(k) ?? bySpecialtyLower.get(k.toLowerCase());
  };
}

/** Merge market survey data into providers by Market_Specialty_Override, then Specialty, then Benchmark_Group. Uses exact match first, then case-insensitive auto-match. Fills Market_TCC_*, Market_WRVU_*, and WRVU_Percentile (FTE-normalized wRVU vs market). */
export function mergeMarketIntoProviders(
  providers: ProviderRecord[],
  marketRows: MarketRow[]
): ProviderRecord[] {
  const getMarket = buildMarketLookup(marketRows);
  return providers.map((p) => {
    const key = (p.Market_Specialty_Override ?? p.Specialty ?? p.Benchmark_Group ?? '').trim();
    const market = key ? getMarket(key) : undefined;
    if (!market) return p;
    const normalizedWrvu = getNormalizedWrvu(p);
    const wrvuPercentile =
      normalizedWrvu != null &&
      Number.isFinite(normalizedWrvu) &&
      market.wrvuPercentiles &&
      market.wrvuPercentiles[50] != null
        ? interpolatePercentile(normalizedWrvu, market.wrvuPercentiles)
        : p.WRVU_Percentile;
    return {
      ...p,
      Market_TCC_25: market.tccPercentiles[25] ?? p.Market_TCC_25,
      Market_TCC_50: market.tccPercentiles[50] ?? p.Market_TCC_50,
      Market_TCC_75: market.tccPercentiles[75] ?? p.Market_TCC_75,
      Market_TCC_90: market.tccPercentiles[90] ?? p.Market_TCC_90,
      Market_WRVU_25: market.wrvuPercentiles[25] ?? p.Market_WRVU_25,
      Market_WRVU_50: market.wrvuPercentiles[50] ?? p.Market_WRVU_50,
      Market_WRVU_75: market.wrvuPercentiles[75] ?? p.Market_WRVU_75,
      Market_WRVU_90: market.wrvuPercentiles[90] ?? p.Market_WRVU_90,
      WRVU_Percentile: wrvuPercentile ?? p.WRVU_Percentile,
    };
  });
}

/** Merge incentive rows into providers by Employee_ID. Fills incentive fields on ProviderRecord. */
export function mergeIncentivesIntoProviders(
  providers: ProviderRecord[],
  incentiveRows: IncentiveJoinRow[]
): ProviderRecord[] {
  const byId = new Map<string, IncentiveJoinRow>();
  for (const row of incentiveRows) byId.set(row.Employee_ID, row);
  return providers.map((p) => {
    const row = byId.get(p.Employee_ID);
    if (!row) return p;
    return {
      ...p,
      Prior_Year_WRVU_Incentive: row.Prior_Year_WRVU_Incentive ?? p.Prior_Year_WRVU_Incentive,
      Division_Chief_Pay: row.Division_Chief_Pay ?? p.Division_Chief_Pay,
      Medical_Director_Pay: row.Medical_Director_Pay ?? p.Medical_Director_Pay,
      Teaching_Pay: row.Teaching_Pay ?? p.Teaching_Pay,
      PSQ_Pay: row.PSQ_Pay ?? p.PSQ_Pay,
      Quality_Bonus: row.Quality_Bonus ?? p.Quality_Bonus,
      Other_Recurring_Comp: row.Other_Recurring_Comp ?? p.Other_Recurring_Comp,
    };
  });
}

/** Merge productivity rows into providers by Employee_ID. Fills productivity fields on ProviderRecord. */
export function mergeProductivityIntoProviders(
  providers: ProviderRecord[],
  productivityRows: ProductivityJoinRow[]
): ProviderRecord[] {
  const byId = new Map<string, ProductivityJoinRow>();
  for (const row of productivityRows) byId.set(row.Employee_ID, row);
  return providers.map((p) => {
    const row = byId.get(p.Employee_ID);
    if (!row) return p;
    return {
      ...p,
      Prior_Year_WRVUs: row.Prior_Year_WRVUs ?? p.Prior_Year_WRVUs,
      Adjusted_WRVUs: row.Adjusted_WRVUs ?? p.Adjusted_WRVUs,
      Normalized_WRVUs: row.Normalized_WRVUs ?? p.Normalized_WRVUs,
      WRVU_Percentile: row.WRVU_Percentile ?? p.WRVU_Percentile,
    };
  });
}

/** Merge evaluation rows into providers by Employee_ID. Fills merit/evaluation fields on ProviderRecord. */
export function mergeEvaluationsIntoProviders(
  providers: ProviderRecord[],
  evaluationRows: EvaluationJoinRow[]
): ProviderRecord[] {
  const byId = new Map<string, EvaluationJoinRow>();
  for (const row of evaluationRows) byId.set(row.Employee_ID, row);
  return providers.map((p) => {
    const row = byId.get(p.Employee_ID);
    if (!row) return p;
    return {
      ...p,
      Evaluation_Score: row.Evaluation_Score ?? p.Evaluation_Score,
      Performance_Category: row.Performance_Category ?? p.Performance_Category,
      Default_Increase_Percent: row.Default_Increase_Percent ?? p.Default_Increase_Percent,
    };
  });
}
