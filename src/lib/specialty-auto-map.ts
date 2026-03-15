/**
 * Auto-mapping for specialty → market survey matching.
 * Physician: 1:1 fuzzy match (provider Specialty/Benchmark_Group → market specialty).
 * APP: suggest mapping unmatched providers to combined groups by name similarity.
 */

import { extract, token_sort_ratio } from 'fuzzball';
import type { ProviderRecord } from '../types/provider';
import type { MarketRow } from '../types/market';
import type { AppCombinedGroupRow } from '../types/app-combined-group';
import { buildMarketLookup } from './joins';

/** Match key for a provider: Override → Specialty → Benchmark_Group. */
export function getMatchKey(p: ProviderRecord): string {
  return (p.Market_Specialty_Override ?? p.Specialty ?? p.Benchmark_Group ?? '').trim();
}

export interface PhysicianMappingSuggestion {
  employeeId: string;
  providerName: string;
  providerType: string;
  currentKey: string;
  suggestedMarketSpecialty: string;
  confidence: number;
}

export interface SuggestPhysicianMappingsOptions {
  /** Minimum confidence (0-1) to include a suggestion. Default 0.85. */
  minConfidence?: number;
  /** Only process providers with these Provider_Type values. Empty = all. */
  providerTypes?: string[];
  /** Use token_sort_ratio for reordered words (e.g. "Medicine Internal" → "Internal Medicine"). Default true. */
  useTokenSort?: boolean;
}

/**
 * Suggest Market_Specialty_Override for physicians whose match key doesn't resolve.
 * Uses fuzzy matching against market specialty names.
 */
export function suggestPhysicianMappings(
  providers: ProviderRecord[],
  marketRows: MarketRow[],
  appCombinedGroups: AppCombinedGroupRow[] | undefined,
  options: SuggestPhysicianMappingsOptions = {}
): PhysicianMappingSuggestion[] {
  const {
    minConfidence = 0.85,
    providerTypes = [],
    useTokenSort = true,
  } = options;

  const getMarket = buildMarketLookup(marketRows, appCombinedGroups);

  const marketSpecialties = marketRows.map((r) => r.specialty.trim()).filter(Boolean);
  const combinedNames = (appCombinedGroups ?? [])
    .map((g) => g.combinedGroupName.trim())
    .filter(Boolean);
  const allTargets = [...new Set([...marketSpecialties, ...combinedNames])];
  if (allTargets.length === 0) return [];

  const providerTypeSet = new Set(providerTypes.map((t) => t.trim().toLowerCase()));
  const filterByType = providerTypeSet.size > 0;

  const suggestions: PhysicianMappingSuggestion[] = [];

  for (const p of providers) {
    if (filterByType) {
      const pt = (p.Provider_Type ?? '').trim().toLowerCase();
      if (!pt || !providerTypeSet.has(pt)) continue;
    }

    const key = getMatchKey(p);
    if (!key) continue;

    const alreadyMatched = getMarket(key);
    if (alreadyMatched) continue;

    const results = extract(key, allTargets, {
      scorer: useTokenSort ? token_sort_ratio : undefined,
      limit: 1,
    });
    const first = results[0];
    if (!first) continue;
    const [match, score] = first;

    if (!match || typeof score !== 'number') continue;

    const confidence = score / 100;
    if (confidence < minConfidence) continue;

    suggestions.push({
      employeeId: p.Employee_ID,
      providerName: p.Provider_Name ?? '',
      providerType: p.Provider_Type ?? '',
      currentKey: key,
      suggestedMarketSpecialty: match,
      confidence,
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/** Provider types typically using 1:1 physician mapping. */
const PHYSICIAN_TYPES = new Set(['physician', 'md', 'do', 'mental health therapist']);

/** Provider types typically using APP group mapping. */
const APP_TYPES = new Set(['app', 'np', 'pa', 'crna', 'cnm', 'nurse practitioner', 'physician assistant']);

export function isPhysicianType(providerType: string): boolean {
  const t = (providerType ?? '').trim().toLowerCase();
  return t ? PHYSICIAN_TYPES.has(t) : false;
}

export function isAppType(providerType: string): boolean {
  const t = (providerType ?? '').trim().toLowerCase();
  return t ? APP_TYPES.has(t) : false;
}

/** Split providers for selected survey into physician and APP buckets. */
export function partitionProvidersByMappingMode(
  providers: ProviderRecord[]
): { physicians: ProviderRecord[]; apps: ProviderRecord[] } {
  const physicians: ProviderRecord[] = [];
  const apps: ProviderRecord[] = [];
  for (const p of providers) {
    const pt = (p.Provider_Type ?? '').trim().toLowerCase();
    if (isAppType(pt) || (pt && !PHYSICIAN_TYPES.has(pt))) {
      apps.push(p);
    } else {
      physicians.push(p);
    }
  }
  return { physicians, apps };
}

export interface AppGroupMappingSuggestion {
  employeeId: string;
  providerName: string;
  providerType: string;
  providerSpecialty: string;
  suggestedTarget: string;
  /** 'market' = direct market row, 'combined' = blended combined group */
  suggestedTargetType: 'market' | 'combined';
  confidence: number;
}

export interface SuggestAppGroupMappingsOptions {
  /** Minimum confidence (0-1). Default 0.85. */
  minConfidence?: number;
  /** Provider_Type values treated as APP (e.g. APP, NP, PA). Empty = use all unmatched. */
  appProviderTypes?: string[];
  useTokenSort?: boolean;
}

/**
 * Suggest mappings for unmatched APP providers: either direct market specialty match
 * or mapping to an existing combined group (Benchmark_Group = combinedGroupName).
 */
export function suggestAppGroupMappings(
  providers: ProviderRecord[],
  marketRows: MarketRow[],
  appCombinedGroups: AppCombinedGroupRow[] | undefined,
  options: SuggestAppGroupMappingsOptions = {}
): AppGroupMappingSuggestion[] {
  const {
    minConfidence = 0.85,
    appProviderTypes = [],
    useTokenSort = true,
  } = options;

  const getMarket = buildMarketLookup(marketRows, appCombinedGroups);

  const marketSpecialties = marketRows.map((r) => r.specialty.trim()).filter(Boolean);
  const combinedNames = (appCombinedGroups ?? [])
    .map((g) => g.combinedGroupName.trim())
    .filter(Boolean);
  const allTargets = [...new Set([...marketSpecialties, ...combinedNames])];
  if (allTargets.length === 0) return [];

  const appTypeSet = new Set(appProviderTypes.map((t) => t.trim().toLowerCase()));
  const filterByType = appTypeSet.size > 0;

  const suggestions: AppGroupMappingSuggestion[] = [];

  for (const p of providers) {
    if (filterByType) {
      const pt = (p.Provider_Type ?? '').trim().toLowerCase();
      if (!pt || !appTypeSet.has(pt)) continue;
    }

    const key = getMatchKey(p);
    if (!key) continue;

    const alreadyMatched = getMarket(key);
    if (alreadyMatched) continue;

    const [match, score] = (() => {
      const results = extract(key, allTargets, {
        scorer: useTokenSort ? token_sort_ratio : undefined,
        limit: 1,
      });
      const first = results[0];
      return first ? [first[0], first[1]] as [string, number] : [null, 0];
    })();

    if (!match || typeof score !== 'number') continue;

    const confidence = score / 100;
    if (confidence < minConfidence) continue;

    const isCombined = combinedNames.includes(match);

    suggestions.push({
      employeeId: p.Employee_ID,
      providerName: p.Provider_Name ?? '',
      providerType: p.Provider_Type ?? '',
      providerSpecialty: key,
      suggestedTarget: match,
      suggestedTargetType: isCombined ? 'combined' : 'market',
      confidence,
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
