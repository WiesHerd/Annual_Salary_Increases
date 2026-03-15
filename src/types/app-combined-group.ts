/**
 * APP combined group: blend multiple survey specialties into one market benchmark.
 * Unlike physicians (1:1 mapping), APPs often combine several survey rows
 * (e.g. Medical Inpatient, Medical Outpatient) into a single blended benchmark.
 */

export interface AppCombinedGroupRow {
  id: string;
  /** Name of the combined group (used as Benchmark_Group for providers). */
  combinedGroupName: string;
  /** Survey specialties to blend together (average percentiles). */
  surveySpecialties: string[];
  /** Provider specialties that map to this group (optional; alternative to Benchmark_Group = combinedGroupName). */
  providerSpecialties?: string[];
}
