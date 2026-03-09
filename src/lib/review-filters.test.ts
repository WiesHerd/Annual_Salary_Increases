import { describe, it, expect, beforeEach } from 'vitest';
import type { ProviderRecord } from '../types/provider';
import { ReviewStatus } from '../types/enums';
import {
  applyFilters,
  DEFAULT_SALARY_REVIEW_FILTERS,
  getPresetFilters,
  getActivePresetId,
  deriveFilterOptions,
  deriveFilterOptionsCascading,
  type SalaryReviewFilters,
} from './review-filters';

function makeRecord(overrides: Partial<ProviderRecord> = {}): ProviderRecord {
  return {
    Employee_ID: 'e1',
    Provider_Name: 'Alice Smith',
    Primary_Division: 'Cardiology',
    Department: 'Adult',
    Specialty: 'Cardiology',
    Compensation_Plan: 'wrvu',
    Population: 'physician',
    Review_Status: ReviewStatus.Draft,
    Approved_Increase_Percent: 3,
    Proposed_TCC_Percentile: 45,
    ...overrides,
  };
}

describe('applyFilters', () => {
  it('returns all records when filters are default', () => {
    const records = [makeRecord(), makeRecord({ Employee_ID: 'e2' })];
    expect(applyFilters(records, DEFAULT_SALARY_REVIEW_FILTERS)).toHaveLength(2);
  });

  it('filters by search text (name)', () => {
    const records = [
      makeRecord({ Provider_Name: 'Alice Smith' }),
      makeRecord({ Employee_ID: 'e2', Provider_Name: 'Bob Jones' }),
    ];
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, searchText: 'alice' })).toHaveLength(1);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, searchText: 'Bob' })).toHaveLength(1);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, searchText: 'xyz' })).toHaveLength(0);
  });

  it('filters by search text (Employee_ID, Specialty, Division, Department, Location)', () => {
    const records = [
      makeRecord({ Employee_ID: 'EMP-100', Specialty: 'Neurology', Primary_Division: 'Neuro', Department: 'Pediatric', Location: 'Building A' }),
    ];
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, searchText: 'EMP-100' })).toHaveLength(1);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, searchText: 'neuro' })).toHaveLength(1);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, searchText: 'Neuro' })).toHaveLength(1);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, searchText: 'Pediatric' })).toHaveLength(1);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, searchText: 'Building' })).toHaveLength(1);
  });

  it('filters by review status', () => {
    const records = [
      makeRecord({ Employee_ID: 'e1', Review_Status: ReviewStatus.Draft }),
      makeRecord({ Employee_ID: 'e2', Review_Status: ReviewStatus.Approved }),
      makeRecord({ Employee_ID: 'e3', Review_Status: ReviewStatus.InReview }),
    ];
    const f: SalaryReviewFilters = { ...DEFAULT_SALARY_REVIEW_FILTERS, reviewStatuses: [ReviewStatus.Draft] };
    expect(applyFilters(records, f)).toHaveLength(1);
    expect(applyFilters(records, { ...f, reviewStatuses: [ReviewStatus.Draft, ReviewStatus.InReview] })).toHaveLength(2);
  });

  it('filters by provider names (multi-select)', () => {
    const records = [
      makeRecord({ Provider_Name: 'Alice Smith' }),
      makeRecord({ Employee_ID: 'e2', Provider_Name: 'Bob Jones' }),
      makeRecord({ Employee_ID: 'e3', Provider_Name: 'Carol Lee' }),
    ];
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, providerNames: ['Alice Smith'] })).toHaveLength(1);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, providerNames: ['Alice Smith', 'Carol Lee'] })).toHaveLength(2);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, providerNames: ['Unknown'] })).toHaveLength(0);
  });

  it('filters by specialty, division, department, plan, population', () => {
    const records = [
      makeRecord({ Specialty: 'Cardiology', Primary_Division: 'Cardio', Department: 'Adult', Compensation_Plan: 'wrvu', Population: 'physician' }),
      makeRecord({ Employee_ID: 'e2', Specialty: 'Ortho', Primary_Division: 'Surgery', Department: 'Pediatric', Compensation_Plan: 'salary', Population: 'app' }),
    ];
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, specialties: ['Cardiology'] })).toHaveLength(1);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, divisions: ['Surgery'] })).toHaveLength(1);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, departments: ['Adult'] })).toHaveLength(1);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, planTypes: ['salary'] })).toHaveLength(1);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, populations: ['physician'] })).toHaveLength(1);
  });

  it('treats empty dimension selection as no filter', () => {
    const records = [makeRecord(), makeRecord({ Employee_ID: 'e2' })];
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, specialties: [] })).toHaveLength(2);
  });

  it('filters by approved increase percent min/max', () => {
    const records = [
      makeRecord({ Employee_ID: 'e1', Approved_Increase_Percent: 2 }),
      makeRecord({ Employee_ID: 'e2', Approved_Increase_Percent: 5 }),
      makeRecord({ Employee_ID: 'e3', Approved_Increase_Percent: 10 }),
    ];
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, approvedIncreasePercentMin: 4 })).toHaveLength(2);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, approvedIncreasePercentMax: 6 })).toHaveLength(2);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, approvedIncreasePercentMin: 3, approvedIncreasePercentMax: 7 })).toHaveLength(1);
  });

  it('filters by TCC percentile min/max', () => {
    const records = [
      makeRecord({ Employee_ID: 'e1', Proposed_TCC_Percentile: 20 }),
      makeRecord({ Employee_ID: 'e2', Proposed_TCC_Percentile: 50 }),
      makeRecord({ Employee_ID: 'e3', Proposed_TCC_Percentile: 80 }),
    ];
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, tccPercentileMax: 50 })).toHaveLength(2);
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, tccPercentileMin: 60 })).toHaveLength(1);
  });

  it('excludes records with null percentile when tccPercentileMax is set', () => {
    const records = [
      makeRecord({ Employee_ID: 'e1', Proposed_TCC_Percentile: undefined }),
      makeRecord({ Employee_ID: 'e2', Proposed_TCC_Percentile: 40 }),
    ];
    expect(applyFilters(records, { ...DEFAULT_SALARY_REVIEW_FILTERS, tccPercentileMax: 50 })).toHaveLength(1);
  });
});

describe('getPresetFilters', () => {
  it('all returns full default state', () => {
    const out = getPresetFilters('all');
    expect(out.searchText).toBe('');
    expect(out.reviewStatuses).toEqual([]);
    expect(out.specialties).toEqual([]);
  });

  it('needs-review sets Draft and InReview only', () => {
    const out = getPresetFilters('needs-review');
    expect(out.reviewStatuses).toEqual([ReviewStatus.Draft, ReviewStatus.InReview]);
  });

  it('below-market sets tccPercentileMax 50', () => {
    const out = getPresetFilters('below-market');
    expect(out.tccPercentileMax).toBe(50);
  });

  it('high-increase sets approvedIncreasePercentMin', () => {
    const out = getPresetFilters('high-increase');
    expect(out.approvedIncreasePercentMin).toBe(5);
  });
});

describe('getActivePresetId', () => {
  it('returns "all" when no filters applied', () => {
    expect(getActivePresetId(DEFAULT_SALARY_REVIEW_FILTERS)).toBe('all');
  });

  it('returns needs-review when only Draft and InReview selected', () => {
    expect(
      getActivePresetId({
        ...DEFAULT_SALARY_REVIEW_FILTERS,
        reviewStatuses: [ReviewStatus.Draft, ReviewStatus.InReview],
      })
    ).toBe('needs-review');
  });

  it('returns null when search is set', () => {
    expect(getActivePresetId({ ...DEFAULT_SALARY_REVIEW_FILTERS, searchText: 'x' })).toBe(null);
  });
});

describe('deriveFilterOptions', () => {
  it('returns unique values with — for blank', () => {
    const records = [
      makeRecord({ Provider_Name: 'Alice', Specialty: 'Cardiology', Review_Status: ReviewStatus.Draft }),
      makeRecord({ Employee_ID: 'e2', Provider_Name: 'Bob', Specialty: 'Ortho', Review_Status: ReviewStatus.Approved }),
      makeRecord({ Employee_ID: 'e3', Provider_Name: undefined, Specialty: undefined, Review_Status: undefined }),
    ];
    const opts = deriveFilterOptions(records);
    expect(opts.providerNames).toContain('Alice');
    expect(opts.providerNames).toContain('Bob');
    expect(opts.providerNames).toContain('—');
    expect(opts.specialties).toContain('Cardiology');
    expect(opts.specialties).toContain('Ortho');
    expect(opts.specialties).toContain('—');
    expect(opts.reviewStatuses).toContain(ReviewStatus.Draft);
    expect(opts.reviewStatuses).toContain(ReviewStatus.Approved);
    expect(opts.reviewStatuses).toContain('—');
  });
});

describe('deriveFilterOptionsCascading', () => {
  it('limits each dimension options to values in records matching other filters', () => {
    const records = [
      makeRecord({ Employee_ID: 'e1', Provider_Name: 'Alice', Specialty: 'Cardiology', Primary_Division: 'North' }),
      makeRecord({ Employee_ID: 'e2', Provider_Name: 'Bob', Specialty: 'Cardiology', Primary_Division: 'North' }),
      makeRecord({ Employee_ID: 'e3', Provider_Name: 'Carol', Specialty: 'Ortho', Primary_Division: 'South' }),
    ];
    const filters: SalaryReviewFilters = {
      ...DEFAULT_SALARY_REVIEW_FILTERS,
      specialties: ['Cardiology'],
    };
    const opts = deriveFilterOptionsCascading(records, filters);
    expect(opts.providerNames).toEqual(expect.arrayContaining(['Alice', 'Bob']));
    expect(opts.providerNames).not.toContain('Carol');
    expect(opts.specialties).toEqual(expect.arrayContaining(['Cardiology', 'Ortho']));
    expect(opts.divisions).toContain('North');
    expect(opts.divisions).not.toContain('South');
  });
});
