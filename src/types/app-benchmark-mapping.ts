/**
 * APP benchmark mapping: which benchmark/survey to use for APPs by division or specialty.
 */

export interface AppBenchmarkMappingRow {
  id: string;
  division?: string;
  /** Specialty or group code. */
  specialtyOrGroup: string;
  benchmarkGroup: string;
  surveySource?: string;
}
