/**
 * Specialty map filter state and application logic.
 * Filter providers by search, status, specialty, provider type, benchmark group, matched market.
 */

import type { ProviderRecord } from '../types/provider';

export type MappingStatus = 'mapped' | 'needs-mapping' | 'override';

export interface SpecialtyMapFilters {
  searchText: string;
  statuses: MappingStatus[];
  specialties: string[];
  providerTypes: string[];
  benchmarkGroups: string[];
  matchedMarkets: string[];
}

export const DEFAULT_SPECIALTY_MAP_FILTERS: SpecialtyMapFilters = {
  searchText: '',
  statuses: [],
  specialties: [],
  providerTypes: [],
  benchmarkGroups: [],
  matchedMarkets: [],
};

const SEARCH_FIELDS: (keyof ProviderRecord)[] = [
  'Provider_Name',
  'Employee_ID',
  'Specialty',
  'Benchmark_Group',
];

function normalizeSearch(s: string): string {
  return s.trim().toLowerCase();
}

function recordMatchesSearch(record: ProviderRecord, searchLower: string): boolean {
  if (!searchLower) return true;
  for (const key of SEARCH_FIELDS) {
    const val = record[key];
    if (val != null && String(val).toLowerCase().includes(searchLower)) return true;
  }
  return false;
}

function selectedSetMatches(value: string | undefined, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const normalized = (value ?? '').trim();
  const blankKey = '—';
  if (normalized === '') return selected.includes(blankKey);
  return selected.includes(normalized);
}

export interface ProviderWithStatus {
  provider: ProviderRecord;
  status: MappingStatus;
  matchedMarket: string | undefined;
}

/**
 * Apply filters to a list of providers. Returns filtered providers.
 */
export function applySpecialtyMapFilters(
  providers: ProviderRecord[],
  filters: SpecialtyMapFilters,
  providerStatuses: Map<string, { status: MappingStatus; matchedMarket?: string }>
): ProviderRecord[] {
  const searchLower = normalizeSearch(filters.searchText);

  return providers.filter((p) => {
    if (!recordMatchesSearch(p, searchLower)) return false;

    const statusInfo = providerStatuses.get(p.Employee_ID);
    const status = statusInfo?.status ?? 'needs-mapping';
    const matchedMarket = statusInfo?.matchedMarket;

    if (filters.statuses.length > 0 && !filters.statuses.includes(status)) return false;
    if (filters.specialties.length > 0 && !selectedSetMatches(p.Specialty, filters.specialties)) return false;
    if (filters.providerTypes.length > 0 && !selectedSetMatches(p.Provider_Type, filters.providerTypes)) return false;
    if (filters.benchmarkGroups.length > 0 && !selectedSetMatches(p.Benchmark_Group, filters.benchmarkGroups)) return false;
    if (filters.matchedMarkets.length > 0 && !selectedSetMatches(matchedMarket, filters.matchedMarkets)) return false;

    return true;
  });
}

export interface SpecialtyMapFilterOptions {
  specialties: string[];
  providerTypes: string[];
  benchmarkGroups: string[];
  matchedMarkets: string[];
}

/**
 * Derive filter options from providers and their statuses.
 */
export function deriveSpecialtyMapFilterOptions(
  providers: ProviderRecord[],
  providerStatuses: Map<string, { status: MappingStatus; matchedMarket?: string }>
): SpecialtyMapFilterOptions {
  const specialties = new Set<string>();
  const providerTypes = new Set<string>();
  const benchmarkGroups = new Set<string>();
  const matchedMarkets = new Set<string>();

  for (const p of providers) {
    const s = (p.Specialty ?? '').trim();
    if (s) specialties.add(s); else specialties.add('—');
    const pt = (p.Provider_Type ?? '').trim();
    if (pt) providerTypes.add(pt); else providerTypes.add('—');
    const bg = (p.Benchmark_Group ?? '').trim();
    if (bg) benchmarkGroups.add(bg); else benchmarkGroups.add('—');
    const mm = providerStatuses.get(p.Employee_ID)?.matchedMarket;
    if (mm) matchedMarkets.add(mm); else matchedMarkets.add('—');
  }

  return {
    specialties: [...specialties].sort((a, b) => a.localeCompare(b)),
    providerTypes: [...providerTypes].sort((a, b) => a.localeCompare(b)),
    benchmarkGroups: [...benchmarkGroups].sort((a, b) => a.localeCompare(b)),
    matchedMarkets: [...matchedMarkets].sort((a, b) => a.localeCompare(b)),
  };
}
