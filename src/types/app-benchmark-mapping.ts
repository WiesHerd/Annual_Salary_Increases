/**
 * Survey specialty mapping: map vendor survey specialty names to combined benchmark groups.
 * e.g. SullivanCotter "NPA:Cardiology" → "Medical Specialty Combined";
 *      "Psychiatry" → "NP:PA Combined Psychiatry" (unique specialty, no rollup).
 * Used when matching providers to market data after uploading survey files.
 */

/** Row mapping survey specialty (from uploaded file) to combined benchmark group. */
export interface SurveySpecialtyMappingRow {
  id: string;
  /** Survey vendor/source (e.g. SullivanCotter, MGMA, AMGA). */
  surveySource: string;
  /** Raw specialty value from the uploaded survey file. */
  surveySpecialty: string;
  /** Combined/standardized benchmark group name. */
  combinedGroup: string;
}

/** @deprecated Legacy type. Replaced by SurveySpecialtyMappingRow (survey specialty → combined group mapping). */
export interface AppBenchmarkMappingRow {
  id: string;
  division?: string;
  specialtyOrGroup: string;
  benchmarkGroup: string;
  surveySource?: string;
}
