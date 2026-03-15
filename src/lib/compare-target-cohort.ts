/**
 * Target cohort filters for Compare Scenarios: which providers to include in the run.
 * Applied before running scenarios (run-time target); same cohort used for both Scenario A and B.
 */

import type { ProviderRecord } from '../types/provider';

export interface CompareTargetCohortFilters {
  searchText: string;
  specialties: string[];
  divisions: string[];
  departments: string[];
  populations: string[];
}

export const DEFAULT_COMPARE_TARGET_COHORT_FILTERS: CompareTargetCohortFilters = {
  searchText: '',
  specialties: [],
  divisions: [],
  departments: [],
  populations: [],
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

/**
 * Apply target cohort filters to provider records. Returns the subset to run scenarios on.
 * If no filters are set, returns all records.
 */
export function applyTargetCohortFilters(
  records: ProviderRecord[],
  filters: CompareTargetCohortFilters
): ProviderRecord[] {
  const searchLower = normalizeSearch(filters.searchText);

  return records.filter((r) => {
    if (!recordMatchesSearch(r, searchLower)) return false;
    if (filters.specialties.length > 0 && !selectedMatches(r.Specialty, filters.specialties))
      return false;
    if (filters.divisions.length > 0 && !selectedMatches(r.Primary_Division, filters.divisions))
      return false;
    if (filters.departments.length > 0 && !selectedMatches(r.Department, filters.departments))
      return false;
    if (filters.populations.length > 0) {
      const pop = r.Population ?? r.Provider_Type ?? '';
      if (!selectedMatches(pop, filters.populations)) return false;
    }
    return true;
  });
}

/** Whether any target cohort filter is active (so we know if we're running on a subset). */
export function hasTargetCohortFilters(filters: CompareTargetCohortFilters): boolean {
  return (
    (filters.searchText ?? '').trim() !== '' ||
    filters.specialties.length > 0 ||
    filters.divisions.length > 0 ||
    filters.departments.length > 0 ||
    filters.populations.length > 0
  );
}

/** Derive filter options for target cohort dropdowns from all loaded records. */
export function getTargetCohortFilterOptions(records: ProviderRecord[]) {
  const specialties = new Set<string>();
  const divisions = new Set<string>();
  const departments = new Set<string>();
  const populations = new Set<string>();
  for (const r of records) {
    if ((r.Specialty ?? '').trim()) specialties.add(r.Specialty!);
    if ((r.Primary_Division ?? '').trim()) divisions.add(r.Primary_Division!);
    if ((r.Department ?? '').trim()) departments.add(r.Department!);
    const pop = (r.Population ?? r.Provider_Type ?? '').trim();
    if (pop) populations.add(pop);
  }
  return {
    specialties: Array.from(specialties).sort(),
    divisions: Array.from(divisions).sort(),
    departments: Array.from(departments).sort(),
    populations: Array.from(populations).sort(),
  };
}
