/**
 * Salary review filter state and application logic.
 * Pure filter functions for targeting providers by search, dimensions, and numeric ranges.
 */

import type { ProviderRecord } from '../types/provider';
import type { ExperienceBand } from '../types/experience-band';
import {
  getExperienceBandAlignment,
  getExperienceBandLabel,
} from './calculations/recalculate-provider-row';
import { getReviewStatusBucket } from '../types/enums';

/** Filter state for the Salary Review screen. */
export interface SalaryReviewFilters {
  searchText: string;
  providerNames: string[];
  reviewStatuses: string[];
  specialties: string[];
  divisions: string[];
  departments: string[];
  planTypes: string[];
  populations: string[];
  experienceBands: string[];
  bandAlignments: string[];
  policySources: string[];
  approvedIncreasePercentMin?: number;
  approvedIncreasePercentMax?: number;
  tccPercentileMin?: number;
  tccPercentileMax?: number;
}

export const DEFAULT_SALARY_REVIEW_FILTERS: SalaryReviewFilters = {
  searchText: '',
  providerNames: [],
  reviewStatuses: [],
  specialties: [],
  divisions: [],
  departments: [],
  planTypes: [],
  populations: [],
  experienceBands: [],
  bandAlignments: [],
  policySources: [],
};

const SEARCH_FIELDS: (keyof ProviderRecord)[] = [
  'Provider_Name',
  'Employee_ID',
  'Specialty',
  'Primary_Division',
  'Department',
  'Location',
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

function getYoe(record: ProviderRecord): number | undefined {
  return record.Years_of_Experience ?? record.Total_YOE;
}

/**
 * Apply filters to a list of provider records. Returns a new array (does not mutate).
 * Pass experienceBandsConfig when filtering by experience band (band labels are derived from YOE + config).
 * Pass policySourceByEmployeeId when filtering by policy source (from live evaluation results).
 */
export function applyFilters(
  records: ProviderRecord[],
  filters: SalaryReviewFilters,
  experienceBandsConfig?: ExperienceBand[],
  policySourceByEmployeeId?: Map<string, string>
): ProviderRecord[] {
  const searchLower = normalizeSearch(filters.searchText);

  return records.filter((r) => {
    if (!recordMatchesSearch(r, searchLower)) return false;

    if (filters.providerNames.length > 0 && !selectedSetMatches(r.Provider_Name, filters.providerNames))
      return false;

    if (filters.reviewStatuses.length > 0) {
      const bucket = getReviewStatusBucket(r.Review_Status);
      if (!filters.reviewStatuses.includes(bucket)) return false;
    }

    if (filters.specialties.length > 0 && !selectedSetMatches(r.Specialty, filters.specialties)) return false;
    if (filters.divisions.length > 0 && !selectedSetMatches(r.Primary_Division, filters.divisions)) return false;
    if (filters.departments.length > 0 && !selectedSetMatches(r.Department, filters.departments)) return false;
    if (filters.planTypes.length > 0 && !selectedSetMatches(r.Compensation_Plan, filters.planTypes)) return false;
    if (filters.populations.length > 0 && !selectedSetMatches(r.Population, filters.populations)) return false;

    if (
      filters.experienceBands.length > 0 &&
      experienceBandsConfig &&
      experienceBandsConfig.length > 0
    ) {
      const bandLabel = getExperienceBandLabel(getYoe(r), experienceBandsConfig);
      if (!selectedSetMatches(bandLabel, filters.experienceBands)) return false;
    }

    if (filters.bandAlignments.length > 0 && experienceBandsConfig?.length) {
      const alignment = getExperienceBandAlignment(
        getYoe(r),
        r.Current_TCC_Percentile,
        experienceBandsConfig
      );
      const display =
        alignment === 'below'
          ? 'Below target'
          : alignment === 'in'
            ? 'In range'
            : alignment === 'above'
              ? 'Above target'
              : '—';
      if (!selectedSetMatches(display, filters.bandAlignments)) return false;
    }

    if (filters.policySources.length > 0) {
      const policySource =
        policySourceByEmployeeId?.get(r.Employee_ID) ?? r.Policy_Source_Name ?? '—';
      if (!selectedSetMatches(policySource, filters.policySources)) return false;
    }

    const incPct = r.Approved_Increase_Percent;
    if (filters.approvedIncreasePercentMin != null && (incPct == null || incPct < filters.approvedIncreasePercentMin))
      return false;
    if (filters.approvedIncreasePercentMax != null && (incPct == null || incPct > filters.approvedIncreasePercentMax))
      return false;

    const tccPct = r.Proposed_TCC_Percentile;
    if (filters.tccPercentileMin != null && (tccPct == null || tccPct < filters.tccPercentileMin)) return false;
    if (filters.tccPercentileMax != null && (tccPct == null || tccPct > filters.tccPercentileMax)) return false;

    return true;
  });
}

/** Preset identifier for one-click filter application. */
export type SalaryReviewPresetId =
  | 'all'
  | 'needs-review'
  | 'draft'
  | 'in-review'
  | 'approved'
  | 'below-market'
  | 'high-increase';

const HIGH_INCREASE_PERCENT_THRESHOLD = 5;

/**
 * Return filter state for a given preset. "all" clears everything; others set only status/numeric filters.
 */
export function getPresetFilters(presetId: SalaryReviewPresetId): Partial<SalaryReviewFilters> {
  switch (presetId) {
    case 'all':
      return { ...DEFAULT_SALARY_REVIEW_FILTERS };
    case 'needs-review':
      return {
        reviewStatuses: ['In progress'],
        providerNames: [],
        specialties: [],
        divisions: [],
        departments: [],
        planTypes: [],
        populations: [],
        experienceBands: [],
        bandAlignments: [],
        policySources: [],
        approvedIncreasePercentMin: undefined,
        approvedIncreasePercentMax: undefined,
        tccPercentileMin: undefined,
        tccPercentileMax: undefined,
      };
    case 'draft':
      return {
        reviewStatuses: ['In progress'],
        providerNames: [],
        specialties: [],
        divisions: [],
        departments: [],
        planTypes: [],
        populations: [],
        experienceBands: [],
        bandAlignments: [],
        policySources: [],
      };
    case 'in-review':
      return {
        reviewStatuses: ['In progress'],
        providerNames: [],
        specialties: [],
        divisions: [],
        departments: [],
        planTypes: [],
        populations: [],
        experienceBands: [],
        bandAlignments: [],
        policySources: [],
      };
    case 'approved':
      return {
        reviewStatuses: ['Complete'],
        providerNames: [],
        specialties: [],
        divisions: [],
        departments: [],
        planTypes: [],
        populations: [],
        experienceBands: [],
        bandAlignments: [],
        policySources: [],
      };
    case 'below-market':
      return {
        reviewStatuses: [],
        providerNames: [],
        specialties: [],
        divisions: [],
        departments: [],
        planTypes: [],
        populations: [],
        experienceBands: [],
        bandAlignments: [],
        policySources: [],
        tccPercentileMin: undefined,
        tccPercentileMax: 50,
      };
    case 'high-increase':
      return {
        reviewStatuses: [],
        providerNames: [],
        specialties: [],
        divisions: [],
        departments: [],
        planTypes: [],
        populations: [],
        experienceBands: [],
        bandAlignments: [],
        policySources: [],
        approvedIncreasePercentMin: HIGH_INCREASE_PERCENT_THRESHOLD,
        approvedIncreasePercentMax: undefined,
      };
    default:
      return {};
  }
}

/** Check if the current filters match a preset (for highlighting the active preset). */
export function getActivePresetId(filters: SalaryReviewFilters): SalaryReviewPresetId | null {
  const hasSearch =
    (filters.searchText ?? '').trim() !== '';
  const hasDimension =
    (filters.providerNames?.length ?? 0) > 0 ||
    filters.specialties.length > 0 ||
    filters.divisions.length > 0 ||
    filters.departments.length > 0 ||
    filters.planTypes.length > 0 ||
    filters.populations.length > 0 ||
    (filters.experienceBands?.length ?? 0) > 0 ||
    (filters.bandAlignments?.length ?? 0) > 0 ||
    (filters.policySources?.length ?? 0) > 0;

  if (!hasSearch && !hasDimension) {
    if (
      filters.reviewStatuses.length === 0 &&
      filters.approvedIncreasePercentMin == null &&
      filters.approvedIncreasePercentMax == null &&
      filters.tccPercentileMin == null &&
      filters.tccPercentileMax == null
    ) {
      return 'all';
    }
    const noDimension =
      (filters.providerNames?.length ?? 0) === 0 &&
      filters.specialties.length === 0 &&
      filters.divisions.length === 0 &&
      filters.departments.length === 0 &&
      filters.planTypes.length === 0 &&
      filters.populations.length === 0 &&
      (filters.experienceBands?.length ?? 0) === 0 &&
      (filters.bandAlignments?.length ?? 0) === 0 &&
      (filters.policySources?.length ?? 0) === 0;
    if (
      filters.reviewStatuses.length === 1 &&
      filters.reviewStatuses[0] === 'In progress' &&
      noDimension
    ) {
      return 'needs-review';
    }
    if (
      filters.reviewStatuses.length === 1 &&
      filters.reviewStatuses[0] === 'Complete' &&
      noDimension
    ) {
      return 'approved';
    }
    if (
      filters.tccPercentileMax === 50 &&
      filters.tccPercentileMin == null &&
      filters.reviewStatuses.length === 0 &&
      filters.approvedIncreasePercentMin == null &&
      filters.approvedIncreasePercentMax == null &&
      noDimension
    ) {
      return 'below-market';
    }
    if (
      filters.approvedIncreasePercentMin === HIGH_INCREASE_PERCENT_THRESHOLD &&
      filters.approvedIncreasePercentMax == null &&
      filters.reviewStatuses.length === 0 &&
      filters.tccPercentileMin == null &&
      filters.tccPercentileMax == null &&
      noDimension
    ) {
      return 'high-increase';
    }
  }
  return null;
}

/** Derive unique dimension values from records for filter dropdowns (from full list, not filtered). */
export function deriveFilterOptions(
  records: ProviderRecord[],
  experienceBandsConfig?: ExperienceBand[],
  policySourceByEmployeeId?: Map<string, string>
): {
  providerNames: string[];
  reviewStatuses: string[];
  specialties: string[];
  divisions: string[];
  departments: string[];
  planTypes: string[];
  populations: string[];
  experienceBands: string[];
  bandAlignments: string[];
  policySources: string[];
} {
  const blank = '—';
  const add = (set: Set<string>, val: string | undefined) => {
    const v = (val ?? '').trim();
    set.add(v === '' ? blank : v);
  };
  const providerNames = new Set<string>();
  const reviewStatuses = new Set<string>();
  const specialties = new Set<string>();
  const divisions = new Set<string>();
  const departments = new Set<string>();
  const planTypes = new Set<string>();
  const populations = new Set<string>();
  const experienceBands = new Set<string>();
  const bandAlignments = new Set<string>();
  const policySources = new Set<string>();

  for (const r of records) {
    add(providerNames, r.Provider_Name);
    reviewStatuses.add(getReviewStatusBucket(r.Review_Status));
    add(specialties, r.Specialty);
    add(divisions, r.Primary_Division);
    add(departments, r.Department);
    add(planTypes, r.Compensation_Plan);
    add(populations, r.Population);
    const policySource = policySourceByEmployeeId?.get(r.Employee_ID) ?? r.Policy_Source_Name;
    add(policySources, policySource);
    if (experienceBandsConfig?.length) {
      add(experienceBands, getExperienceBandLabel(getYoe(r), experienceBandsConfig));
      const alignment = getExperienceBandAlignment(
        getYoe(r),
        r.Current_TCC_Percentile,
        experienceBandsConfig
      );
      const display =
        alignment === 'below'
          ? 'Below target'
          : alignment === 'in'
            ? 'In range'
            : alignment === 'above'
              ? 'Above target'
              : '—';
      bandAlignments.add(display);
    }
  }

  const sort = (a: string, b: string) => (a === blank ? -1 : b === blank ? 1 : a.localeCompare(b));
  const statusSort = (a: string, b: string) =>
    a === 'In progress' ? -1 : b === 'In progress' ? 1 : a.localeCompare(b);
  return {
    providerNames: Array.from(providerNames).sort(sort),
    reviewStatuses: Array.from(reviewStatuses).sort(statusSort),
    specialties: Array.from(specialties).sort(sort),
    divisions: Array.from(divisions).sort(sort),
    departments: Array.from(departments).sort(sort),
    planTypes: Array.from(planTypes).sort(sort),
    populations: Array.from(populations).sort(sort),
    experienceBands: Array.from(experienceBands).sort(sort),
    bandAlignments: Array.from(bandAlignments).sort(sort),
    policySources: Array.from(policySources).sort(sort),
  };
}

type DimensionKey = keyof Pick<
  SalaryReviewFilters,
  | 'providerNames'
  | 'reviewStatuses'
  | 'specialties'
  | 'divisions'
  | 'departments'
  | 'planTypes'
  | 'populations'
  | 'experienceBands'
  | 'bandAlignments'
  | 'policySources'
>;

const DIMENSION_FIELDS: { key: Exclude<DimensionKey, 'experienceBands' | 'bandAlignments' | 'policySources' | 'reviewStatuses'>; field: keyof ProviderRecord }[] = [
  { key: 'providerNames', field: 'Provider_Name' },
  { key: 'specialties', field: 'Specialty' },
  { key: 'divisions', field: 'Primary_Division' },
  { key: 'departments', field: 'Department' },
  { key: 'planTypes', field: 'Compensation_Plan' },
  { key: 'populations', field: 'Population' },
];

/**
 * Apply filters to records while ignoring a single dimension (for cascading options).
 * When building options for dimension K, we use records that match all other filters so dropdowns only show values that still exist in the filtered set.
 */
function applyFiltersExceptDimension(
  records: ProviderRecord[],
  filters: SalaryReviewFilters,
  excludeDimension: DimensionKey,
  experienceBandsConfig?: ExperienceBand[],
  policySourceByEmployeeId?: Map<string, string>
): ProviderRecord[] {
  const searchLower = normalizeSearch(filters.searchText);
  return records.filter((r) => {
    if (!recordMatchesSearch(r, searchLower)) return false;
    if (excludeDimension !== 'providerNames' && filters.providerNames.length > 0 && !selectedSetMatches(r.Provider_Name, filters.providerNames))
      return false;
    if (excludeDimension !== 'reviewStatuses' && filters.reviewStatuses.length > 0) {
      const bucket = getReviewStatusBucket(r.Review_Status);
      if (!filters.reviewStatuses.includes(bucket)) return false;
    }
    if (excludeDimension !== 'specialties' && filters.specialties.length > 0 && !selectedSetMatches(r.Specialty, filters.specialties))
      return false;
    if (excludeDimension !== 'divisions' && filters.divisions.length > 0 && !selectedSetMatches(r.Primary_Division, filters.divisions))
      return false;
    if (excludeDimension !== 'departments' && filters.departments.length > 0 && !selectedSetMatches(r.Department, filters.departments))
      return false;
    if (excludeDimension !== 'planTypes' && filters.planTypes.length > 0 && !selectedSetMatches(r.Compensation_Plan, filters.planTypes))
      return false;
    if (excludeDimension !== 'populations' && filters.populations.length > 0 && !selectedSetMatches(r.Population, filters.populations))
      return false;
    if (excludeDimension !== 'experienceBands' && filters.experienceBands.length > 0 && experienceBandsConfig?.length) {
      const bandLabel = getExperienceBandLabel(getYoe(r), experienceBandsConfig);
      if (!selectedSetMatches(bandLabel, filters.experienceBands)) return false;
    }
    if (excludeDimension !== 'bandAlignments' && filters.bandAlignments.length > 0 && experienceBandsConfig?.length) {
      const alignment = getExperienceBandAlignment(getYoe(r), r.Current_TCC_Percentile, experienceBandsConfig);
      const display =
        alignment === 'below'
          ? 'Below target'
          : alignment === 'in'
            ? 'In range'
            : alignment === 'above'
              ? 'Above target'
              : '—';
      if (!selectedSetMatches(display, filters.bandAlignments)) return false;
    }
    if (excludeDimension !== 'policySources' && filters.policySources.length > 0) {
      const policySource = policySourceByEmployeeId?.get(r.Employee_ID) ?? r.Policy_Source_Name ?? '—';
      if (!selectedSetMatches(policySource, filters.policySources)) return false;
    }
    const incPct = r.Approved_Increase_Percent;
    if (filters.approvedIncreasePercentMin != null && (incPct == null || incPct < filters.approvedIncreasePercentMin))
      return false;
    if (filters.approvedIncreasePercentMax != null && (incPct == null || incPct > filters.approvedIncreasePercentMax))
      return false;
    const tccPct = r.Proposed_TCC_Percentile;
    if (filters.tccPercentileMin != null && (tccPct == null || tccPct < filters.tccPercentileMin)) return false;
    if (filters.tccPercentileMax != null && (tccPct == null || tccPct > filters.tccPercentileMax)) return false;
    return true;
  });
}

/**
 * Derive filter options with cascading: each dimension's options are built from records that match all *other* filters.
 * So e.g. after selecting a specialty, the Provider Name list only shows providers in that specialty.
 * Pass experienceBandsConfig to include Experience Band in options (derived from YOE + config).
 * Pass policySourceByEmployeeId to include Policy source options (from live evaluation results).
 */
export function deriveFilterOptionsCascading(
  records: ProviderRecord[],
  filters: SalaryReviewFilters,
  experienceBandsConfig?: ExperienceBand[],
  policySourceByEmployeeId?: Map<string, string>
): {
  providerNames: string[];
  reviewStatuses: string[];
  specialties: string[];
  divisions: string[];
  departments: string[];
  planTypes: string[];
  populations: string[];
  experienceBands: string[];
  bandAlignments: string[];
  policySources: string[];
} {
  const blank = '—';
  const add = (set: Set<string>, val: string | undefined) => {
    const v = (val ?? '').trim();
    set.add(v === '' ? blank : v);
  };
  const sort = (a: string, b: string) => (a === blank ? -1 : b === blank ? 1 : a.localeCompare(b));

  const result = {
    providerNames: [] as string[],
    reviewStatuses: [] as string[],
    specialties: [] as string[],
    divisions: [] as string[],
    departments: [] as string[],
    planTypes: [] as string[],
    populations: [] as string[],
    experienceBands: [] as string[],
    bandAlignments: [] as string[],
    policySources: [] as string[],
  };

  for (const { key, field } of DIMENSION_FIELDS) {
    const subset = applyFiltersExceptDimension(records, filters, key, experienceBandsConfig, policySourceByEmployeeId);
    const set = new Set<string>();
    for (const r of subset) add(set, r[field] as string | undefined);
    result[key] = Array.from(set).sort(sort);
  }

  const statusSort = (a: string, b: string) =>
    a === 'In progress' ? -1 : b === 'In progress' ? 1 : a.localeCompare(b);
  const subsetStatus = applyFiltersExceptDimension(records, filters, 'reviewStatuses', experienceBandsConfig, policySourceByEmployeeId);
  const statusSet = new Set<string>();
  for (const r of subsetStatus) statusSet.add(getReviewStatusBucket(r.Review_Status));
  result.reviewStatuses = Array.from(statusSet).sort(statusSort);

  if (experienceBandsConfig?.length) {
    const subset = applyFiltersExceptDimension(records, filters, 'experienceBands', experienceBandsConfig, policySourceByEmployeeId);
    const set = new Set<string>();
    for (const r of subset) add(set, getExperienceBandLabel(getYoe(r), experienceBandsConfig));
    result.experienceBands = Array.from(set).sort(sort);
  }

  if (experienceBandsConfig?.length) {
    const subset = applyFiltersExceptDimension(records, filters, 'bandAlignments', experienceBandsConfig, policySourceByEmployeeId);
    const set = new Set<string>();
    for (const r of subset) {
      const alignment = getExperienceBandAlignment(getYoe(r), r.Current_TCC_Percentile, experienceBandsConfig);
      const display =
        alignment === 'below'
          ? 'Below target'
          : alignment === 'in'
            ? 'In range'
            : alignment === 'above'
              ? 'Above target'
              : '—';
      set.add(display);
    }
    result.bandAlignments = Array.from(set).sort(sort);
  }

  const subsetPolicy = applyFiltersExceptDimension(records, filters, 'policySources', experienceBandsConfig, policySourceByEmployeeId);
  const policySet = new Set<string>();
  for (const r of subsetPolicy) {
    add(policySet, policySourceByEmployeeId?.get(r.Employee_ID) ?? r.Policy_Source_Name);
  }
  result.policySources = Array.from(policySet).sort(sort);

  return result;
}

const STORAGE_KEY = 'salary-review-filters';

/** Load filter state from sessionStorage. Returns defaults if missing or invalid. */
export function loadFiltersFromStorage(): SalaryReviewFilters {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SALARY_REVIEW_FILTERS };
    const parsed = JSON.parse(raw) as Partial<SalaryReviewFilters>;
    return {
      searchText: typeof parsed.searchText === 'string' ? parsed.searchText : DEFAULT_SALARY_REVIEW_FILTERS.searchText,
      providerNames: Array.isArray(parsed.providerNames) ? parsed.providerNames : [],
      reviewStatuses: Array.isArray(parsed.reviewStatuses) ? parsed.reviewStatuses : [],
      specialties: Array.isArray(parsed.specialties) ? parsed.specialties : [],
      divisions: Array.isArray(parsed.divisions) ? parsed.divisions : [],
      departments: Array.isArray(parsed.departments) ? parsed.departments : [],
      planTypes: Array.isArray(parsed.planTypes) ? parsed.planTypes : [],
      populations: Array.isArray(parsed.populations) ? parsed.populations : [],
      experienceBands: Array.isArray(parsed.experienceBands) ? parsed.experienceBands : [],
      bandAlignments: Array.isArray(parsed.bandAlignments) ? parsed.bandAlignments : [],
      policySources: Array.isArray(parsed.policySources) ? parsed.policySources : [],
      approvedIncreasePercentMin:
        typeof parsed.approvedIncreasePercentMin === 'number' ? parsed.approvedIncreasePercentMin : undefined,
      approvedIncreasePercentMax:
        typeof parsed.approvedIncreasePercentMax === 'number' ? parsed.approvedIncreasePercentMax : undefined,
      tccPercentileMin: typeof parsed.tccPercentileMin === 'number' ? parsed.tccPercentileMin : undefined,
      tccPercentileMax: typeof parsed.tccPercentileMax === 'number' ? parsed.tccPercentileMax : undefined,
    };
  } catch {
    return { ...DEFAULT_SALARY_REVIEW_FILTERS };
  }
}

/** Persist filter state to sessionStorage. */
export function saveFiltersToStorage(filters: SalaryReviewFilters): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignore
  }
}
