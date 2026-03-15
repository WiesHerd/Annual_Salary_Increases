/**
 * Join additional datasets (market, incentives, productivity) into provider records.
 * Market: match by Market_Specialty_Override, then Specialty, then Benchmark_Group.
 * Physicians: 1:1 mapping. APPs: many survey rows can blend into one combined benchmark.
 * Incentives/Productivity: match by Employee_ID.
 */

import type { ProviderRecord } from '../types/provider';
import type { MarketRow } from '../types/market';
import type { AppCombinedGroupRow } from '../types/app-combined-group';
import type { MarketSurveySet, SurveySpecialtyMappingSet, ProviderTypeToSurveyMapping } from '../types/market-survey-config';
import { DEFAULT_SURVEY_ID } from '../types/market-survey-config';
import type {
  IncentiveJoinRow,
  ProductivityJoinRow,
  EvaluationJoinRow,
  ParsedPaymentRow,
  CustomDataset,
  RawRow,
} from '../types/upload';
import { interpolatePercentile } from './calculations/recalculate-provider-row';

const PERCENTILES = [25, 50, 75, 90];

/** FTE-normalized wRVU for percentile comparison (market wRVU benchmarks are at 1.0 FTE). */
function getNormalizedWrvu(p: ProviderRecord): number | undefined {
  const raw = p.Normalized_WRVUs ?? p.Prior_Year_WRVUs ?? p.Adjusted_WRVUs;
  if (raw == null || !Number.isFinite(raw)) return undefined;
  if (p.Normalized_WRVUs != null) return raw;
  const fte = p.Current_FTE ?? 1;
  return fte > 0 ? raw / fte : raw;
}

/** Blend multiple market rows by averaging percentiles. */
function blendMarketRows(rows: MarketRow[], combinedGroupName: string): MarketRow {
  const tccPercentiles: Record<number, number> = {};
  const wrvuPercentiles: Record<number, number> = {};
  const cfPercentiles: Record<number, number> = {};
  for (const p of PERCENTILES) {
    let tccSum = 0;
    let wrvuSum = 0;
    let cfSum = 0;
    let tccCount = 0;
    let wrvuCount = 0;
    let cfCount = 0;
    for (const r of rows) {
      const t = r.tccPercentiles?.[p];
      const w = r.wrvuPercentiles?.[p];
      const c = r.cfPercentiles?.[p];
      if (t != null && Number.isFinite(t)) {
        tccSum += t;
        tccCount++;
      }
      if (w != null && Number.isFinite(w)) {
        wrvuSum += w;
        wrvuCount++;
      }
      if (c != null && Number.isFinite(c)) {
        cfSum += c;
        cfCount++;
      }
    }
    if (tccCount > 0) tccPercentiles[p] = tccSum / tccCount;
    if (wrvuCount > 0) wrvuPercentiles[p] = wrvuSum / wrvuCount;
    if (cfCount > 0) cfPercentiles[p] = cfSum / cfCount;
  }
  return {
    specialty: combinedGroupName,
    tccPercentiles,
    wrvuPercentiles,
    cfPercentiles: Object.keys(cfPercentiles).length > 0 ? cfPercentiles : undefined,
  };
}

/** Build a lookup: (key) => market row. Exact match first, then case-insensitive. With appCombinedGroups: blends multiple survey rows into one for APP combined groups. */
export function buildMarketLookup(
  marketRows: MarketRow[],
  appCombinedGroups?: AppCombinedGroupRow[]
): (key: string) => MarketRow | undefined {
  const bySpecialty = new Map<string, MarketRow>();
  const bySpecialtyLower = new Map<string, MarketRow>();
  for (const row of marketRows) {
    const s = row.specialty.trim();
    bySpecialty.set(s, row);
    bySpecialtyLower.set(s.toLowerCase(), row);
  }
  const combinedToRow = new Map<string, MarketRow>();
  const combinedToRowLower = new Map<string, MarketRow>();
  const providerSpecialtyToRow = new Map<string, MarketRow>();
  const providerSpecialtyToRowLower = new Map<string, MarketRow>();
  if (appCombinedGroups && appCombinedGroups.length > 0) {
    for (const g of appCombinedGroups) {
      const cg = g.combinedGroupName.trim();
      if (!cg || combinedToRow.has(cg)) continue;
      const toBlend: MarketRow[] = [];
      for (const spec of g.surveySpecialties) {
        const s = spec.trim();
        const row = bySpecialty.get(s) ?? bySpecialtyLower.get(s.toLowerCase());
        if (row) toBlend.push(row);
      }
      if (toBlend.length > 0) {
        const blended = blendMarketRows(toBlend, cg);
        combinedToRow.set(cg, blended);
        combinedToRowLower.set(cg.toLowerCase(), blended);
        for (const ps of g.providerSpecialties ?? []) {
          const p = ps.trim();
          if (!p || providerSpecialtyToRow.has(p)) continue;
          providerSpecialtyToRow.set(p, blended);
          providerSpecialtyToRowLower.set(p.toLowerCase(), blended);
        }
      }
    }
  }
  return (key: string) => {
    const k = key.trim();
    if (!k) return undefined;
    return (
      bySpecialty.get(k) ??
      bySpecialtyLower.get(k.toLowerCase()) ??
      combinedToRow.get(k) ??
      combinedToRowLower.get(k.toLowerCase()) ??
      providerSpecialtyToRow.get(k) ??
      providerSpecialtyToRowLower.get(k.toLowerCase())
    );
  };
}

/** Merge market survey data into providers by Market_Specialty_Override, then Specialty, then Benchmark_Group. Physicians: 1:1. APPs: combined groups use blended percentiles from multiple survey rows. Fills Market_TCC_*, Market_WRVU_*, WRVU_Percentile. */
export function mergeMarketIntoProviders(
  providers: ProviderRecord[],
  marketRows: MarketRow[],
  appCombinedGroups?: AppCombinedGroupRow[]
): ProviderRecord[] {
  const getMarket = buildMarketLookup(marketRows, appCombinedGroups);
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

/** Resolve survey ID for a provider from Provider_Type. */
export function getSurveyIdForProvider(
  provider: ProviderRecord,
  providerTypeToSurvey: ProviderTypeToSurveyMapping
): string {
  const pt = (provider.Provider_Type ?? '').trim();
  return pt ? (providerTypeToSurvey[pt] ?? DEFAULT_SURVEY_ID) : DEFAULT_SURVEY_ID;
}

/** Merge multiple market surveys into providers. Each provider uses the survey mapped by Provider_Type. */
export function mergeMarketIntoProvidersMulti(
  providers: ProviderRecord[],
  marketSurveys: MarketSurveySet,
  surveyMappings: SurveySpecialtyMappingSet,
  providerTypeToSurvey: ProviderTypeToSurveyMapping
): ProviderRecord[] {
  const lookupCache = new Map<string, (key: string) => MarketRow | undefined>();
  const getLookup = (surveyId: string) => {
    let fn = lookupCache.get(surveyId);
    if (!fn) {
      const rows = marketSurveys[surveyId] ?? [];
      const mapping = surveyMappings[surveyId];
      const groups = mapping?.appCombinedGroups;
      fn = buildMarketLookup(rows, groups);
      lookupCache.set(surveyId, fn);
    }
    return fn;
  };
  return providers.map((p) => {
    const surveyId = getSurveyIdForProvider(p, providerTypeToSurvey);
    const getMarket = getLookup(surveyId);
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

/** Build per-provider market resolver: (provider, key) => MarketRow. */
export function buildMarketResolver(
  marketSurveys: MarketSurveySet,
  surveyMappings: SurveySpecialtyMappingSet,
  providerTypeToSurvey: ProviderTypeToSurveyMapping
): (provider: ProviderRecord, key: string) => MarketRow | undefined {
  const lookupCache = new Map<string, (k: string) => MarketRow | undefined>();
  const getLookup = (surveyId: string) => {
    let fn = lookupCache.get(surveyId);
    if (!fn) {
      const rows = marketSurveys[surveyId] ?? [];
      const mapping = surveyMappings[surveyId];
      fn = buildMarketLookup(rows, mapping?.appCombinedGroups);
      lookupCache.set(surveyId, fn);
    }
    return fn;
  };
  return (provider, key) => {
    const surveyId = getSurveyIdForProvider(provider, providerTypeToSurvey);
    return getLookup(surveyId)(key.trim()) ?? undefined;
  };
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

/** Roll up payments by providerKey (matches Employee_ID) and merge TCC into providers. */
export function rollupPaymentsByProvider(
  payments: ParsedPaymentRow[],
  options?: { cycleId?: string }
): Map<string, number> {
  const byProvider = new Map<string, number>();
  for (const row of payments) {
    if (options?.cycleId && row.cycleId && row.cycleId !== options.cycleId) continue;
    const key = row.providerKey.trim();
    if (!key) continue;
    const current = byProvider.get(key) ?? 0;
    byProvider.set(key, current + (Number.isFinite(row.amount) ? row.amount : 0));
  }
  return byProvider;
}

/** Merge rolled-up payment TCC into providers. providerKey in payments must match Employee_ID. */
export function mergePaymentsIntoProviders(
  providers: ProviderRecord[],
  payments: ParsedPaymentRow[],
  options?: { cycleId?: string }
): ProviderRecord[] {
  const tccByProvider = rollupPaymentsByProvider(payments, options);
  if (tccByProvider.size === 0) return providers;
  return providers.map((p) => {
    const tcc = tccByProvider.get(p.Employee_ID.trim());
    if (tcc == null || !Number.isFinite(tcc)) return p;
    const fte = p.Current_FTE ?? 1;
    const tccAt1Fte = fte > 0 ? tcc / fte : tcc;
    return {
      ...p,
      Current_TCC: tcc,
      Current_TCC_at_1FTE: tccAt1Fte,
    };
  });
}

/**
 * Build a lookup from provider key to custom row for a single custom dataset.
 * Used at export time to add custom columns when join key matches provider (e.g. Employee_ID).
 * Returns a function (providerKey) => RawRow | undefined.
 */
export function buildCustomDatasetLookup(dataset: CustomDataset): (providerKey: string) => RawRow | undefined {
  if (!dataset.joinKeyColumn || dataset.rows.length === 0) {
    return () => undefined;
  }
  const byKey = new Map<string, RawRow>();
  for (const row of dataset.rows) {
    const keyVal = row[dataset.joinKeyColumn];
    const key = keyVal !== undefined && keyVal !== null && keyVal !== '' ? String(keyVal).trim() : '';
    if (key) byKey.set(key, row);
  }
  return (providerKey: string) => byKey.get(providerKey.trim());
}
