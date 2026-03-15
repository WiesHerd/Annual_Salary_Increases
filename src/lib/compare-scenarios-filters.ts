/**
 * Filter state and logic for Compare Scenarios.
 * Filters applied to compare rows (record + scenario results).
 */

import type { ProviderRecord } from '../types/provider';
import type { ScenarioRunResult } from '../types/scenario';

export interface CompareScenarioRow {
  record: ProviderRecord;
  pctA: number;
  pctB: number;
  dollarA: number;
  dollarB: number;
  deltaPct: number;
  deltaDollars: number;
  differs: boolean;
  sourceA: string;
  sourceB: string;
}

export interface CompareScenariosFilters {
  searchText: string;
  specialties: string[];
  divisions: string[];
  departments: string[];
  populations: string[];
  showOnlyDiffering: boolean;
  deltaPercentMin?: number;
  deltaPercentMax?: number;
  policySourceA: string[];
  policySourceB: string[];
}

export const DEFAULT_COMPARE_SCENARIOS_FILTERS: CompareScenariosFilters = {
  searchText: '',
  specialties: [],
  divisions: [],
  departments: [],
  populations: [],
  showOnlyDiffering: false,
  policySourceA: [],
  policySourceB: [],
};

const SEARCH_FIELDS: (keyof ProviderRecord)[] = [
  'Provider_Name',
  'Employee_ID',
  'Specialty',
  'Primary_Division',
  'Department',
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

function selectedMatches(value: string | undefined, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const normalized = (value ?? '').trim();
  if (normalized === '') return selected.includes('—');
  return selected.includes(normalized);
}

/** Apply filters to compare rows. */
export function applyCompareFilters(
  rows: CompareScenarioRow[],
  filters: CompareScenariosFilters
): CompareScenarioRow[] {
  const searchLower = normalizeSearch(filters.searchText);

  return rows.filter((r) => {
    if (!recordMatchesSearch(r.record, searchLower)) return false;
    if (filters.showOnlyDiffering && !r.differs) return false;
    if (filters.specialties.length > 0 && !selectedMatches(r.record.Specialty, filters.specialties))
      return false;
    if (filters.divisions.length > 0 && !selectedMatches(r.record.Primary_Division, filters.divisions))
      return false;
    if (filters.departments.length > 0 && !selectedMatches(r.record.Department, filters.departments))
      return false;
    if (filters.populations.length > 0) {
      const pop = r.record.Population ?? r.record.Provider_Type ?? '';
      if (!selectedMatches(pop, filters.populations)) return false;
    }
    if (
      filters.deltaPercentMin != null &&
      Number.isFinite(filters.deltaPercentMin) &&
      r.deltaPct < filters.deltaPercentMin
    )
      return false;
    if (
      filters.deltaPercentMax != null &&
      Number.isFinite(filters.deltaPercentMax) &&
      r.deltaPct > filters.deltaPercentMax
    )
      return false;
    if (filters.policySourceA.length > 0 && !selectedMatches(r.sourceA, filters.policySourceA))
      return false;
    if (filters.policySourceB.length > 0 && !selectedMatches(r.sourceB, filters.policySourceB))
      return false;
    return true;
  });
}

/** Build compare rows from records and scenario results. */
export function buildCompareRows(
  records: ProviderRecord[],
  resultA: ScenarioRunResult,
  resultB: ScenarioRunResult
): CompareScenarioRow[] {
  return records.map((r) => {
    const evalA = resultA.evaluationResults.get(r.Employee_ID);
    const evalB = resultB.evaluationResults.get(r.Employee_ID);
    const derivedA = resultA.derivedResults.get(r.Employee_ID);
    const derivedB = resultB.derivedResults.get(r.Employee_ID);
    const pctA = evalA?.finalRecommendedIncreasePercent ?? 0;
    const pctB = evalB?.finalRecommendedIncreasePercent ?? 0;
    const dollarA = derivedA?.increaseDollars ?? 0;
    const dollarB = derivedB?.increaseDollars ?? 0;
    const deltaPct = pctB - pctA;
    const deltaDollars = dollarB - dollarA;
    const differs = Math.abs(pctA - pctB) > 0.001;
    return {
      record: r,
      pctA,
      pctB,
      dollarA,
      dollarB,
      deltaPct,
      deltaDollars,
      differs,
      sourceA: evalA?.finalPolicySource ?? '—',
      sourceB: evalB?.finalPolicySource ?? '—',
    };
  });
}

/** Derive filter options from compare rows. */
export function getCompareFilterOptions(rows: CompareScenarioRow[]) {
  const specialties = new Set<string>();
  const divisions = new Set<string>();
  const departments = new Set<string>();
  const populations = new Set<string>();
  const policySourceA = new Set<string>();
  const policySourceB = new Set<string>();
  for (const row of rows) {
    if ((row.record.Specialty ?? '').trim()) specialties.add(row.record.Specialty!);
    if ((row.record.Primary_Division ?? '').trim()) divisions.add(row.record.Primary_Division!);
    if ((row.record.Department ?? '').trim()) departments.add(row.record.Department!);
    const pop = (row.record.Population ?? row.record.Provider_Type ?? '').trim();
    if (pop) populations.add(pop);
    if ((row.sourceA ?? '').trim()) policySourceA.add(row.sourceA);
    if ((row.sourceB ?? '').trim()) policySourceB.add(row.sourceB);
  }
  return {
    specialties: Array.from(specialties).sort(),
    divisions: Array.from(divisions).sort(),
    departments: Array.from(departments).sort(),
    populations: Array.from(populations).sort(),
    policySourceA: Array.from(policySourceA).sort(),
    policySourceB: Array.from(policySourceB).sort(),
  };
}
