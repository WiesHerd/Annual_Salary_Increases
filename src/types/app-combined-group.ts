/**
 * Survey map bucket (combined group): blend multiple survey specialties into one market benchmark.
 * Unlike physicians (1:1 mapping), many teams combine several survey rows
 * (e.g. APP lines like Medical Inpatient + Medical Outpatient) into one blended benchmark.
 */

export interface AppCombinedGroupRow {
  id: string;
  /** Name of the combined group (used as Benchmark_Group for providers). */
  combinedGroupName: string;
  /** Survey specialties to blend together (average percentiles). */
  surveySpecialties: string[];
  /**
   * Legacy: roster / benchmark labels that map to this bucket’s market row.
   * Cleared when saving from the survey map buckets UI; prefer bucket name match + Auto Map memory.
   */
  providerSpecialties?: string[];
  /** Optional free-text note for admins (not used in matching). */
  notes?: string;
}
