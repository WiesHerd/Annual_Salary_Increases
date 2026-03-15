/**
 * Domain enums for populations and compensation plan types.
 * Kept extensible and configuration-driven; add new values as needed.
 */

/** Provider type (role/category) used for plan assignment and reporting. */
export enum Population {
  Physician = 'physician',
  APP = 'app',
  Allied = 'allied',
  Other = 'other',
  StaffPhysician = 'Staff Physician',
  DivisionChief = 'Division Chief',
  AdvancedPracticeProvider = 'Advanced Practice Provider',
  MentalHealthTherapist = 'Mental Health Therapist',
  Optometrist = 'Optometrist',
  Psychologist = 'Psychologist',
  Neuropsychologist = 'Neuropsychologist',
  Dentist = 'Dentist',
}

/** Compensation plan structure / methodology. */
export enum CompensationPlanType {
  /** Work RVU–based (productivity) */
  WRVU = 'wrvu',
  /** Fixed salary (no productivity component) */
  Salary = 'salary',
  /** Base salary + WRVU or bonus */
  Hybrid = 'hybrid',
  /** Hourly or shift-based */
  Hourly = 'hourly',
  /** Contract / per-diem or other */
  Contract = 'contract',
}

/** Review or cycle status for a provider/record. */
export enum ReviewStatus {
  Draft = 'draft',
  InReview = 'in_review',
  Approved = 'approved',
  Effective = 'effective',
  Deferred = 'deferred',
}

/** Display labels for review status (used in table and filters). Simplified to two states: In progress | Complete. */
export const REVIEW_STATUS_LABELS: Record<string, string> = {
  [ReviewStatus.Draft]: 'In progress',
  [ReviewStatus.InReview]: 'In progress',
  [ReviewStatus.Approved]: 'Complete',
  [ReviewStatus.Effective]: 'Complete',
  [ReviewStatus.Deferred]: 'In progress',
  '': 'In progress',
};

/** Status values that count as "In progress" (not yet complete). */
export const REVIEW_STATUS_IN_PROGRESS = [
  ReviewStatus.Draft,
  ReviewStatus.InReview,
  ReviewStatus.Deferred,
  '',
] as const;

/** Status values that count as "Complete". */
export const REVIEW_STATUS_COMPLETE = [ReviewStatus.Approved, ReviewStatus.Effective] as const;

/** Map raw Review_Status to filter bucket. Used for Status filter dropdown. */
export function getReviewStatusBucket(value: string | undefined): 'In progress' | 'Complete' {
  const key = (value ?? '').trim();
  return REVIEW_STATUS_COMPLETE.includes(key as (typeof REVIEW_STATUS_COMPLETE)[number])
    ? 'Complete'
    : 'In progress';
}

/** Short labels for compact table UI (Silicon Valley–style density). */
export const REVIEW_STATUS_SHORT_LABELS: Record<string, string> = {
  [ReviewStatus.Draft]: 'New',
  [ReviewStatus.InReview]: 'In progress',
  [ReviewStatus.Approved]: 'Done',
  [ReviewStatus.Effective]: 'Done',
  [ReviewStatus.Deferred]: 'Later',
  '': 'New',
};

/** Human-readable label for a stored Review_Status value (In progress | Complete). */
export function getReviewStatusLabel(value: string | undefined): string {
  const key = (value ?? '').trim();
  return REVIEW_STATUS_LABELS[key] ?? (key ? 'In progress' : 'In progress');
}

/** Short label for compact UI (table, narrow columns). */
export function getReviewStatusShortLabel(value: string | undefined): string {
  const key = (value ?? '').trim();
  return REVIEW_STATUS_SHORT_LABELS[key] ?? (key || 'New');
}

/** Source of benchmark data (survey or internal). */
export enum BenchmarkSource {
  Survey = 'survey',
  Internal = 'internal',
  Blended = 'blended',
}

/** Percentile bands commonly used in market and merit logic. */
export const PERCENTILE_BANDS = [25, 50, 75, 90] as const;
export type PercentileBand = (typeof PERCENTILE_BANDS)[number];
