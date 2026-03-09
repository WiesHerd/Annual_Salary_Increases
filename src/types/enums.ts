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

/** Source of benchmark data (survey or internal). */
export enum BenchmarkSource {
  Survey = 'survey',
  Internal = 'internal',
  Blended = 'blended',
}

/** Percentile bands commonly used in market and merit logic. */
export const PERCENTILE_BANDS = [25, 50, 75, 90] as const;
export type PercentileBand = (typeof PERCENTILE_BANDS)[number];
