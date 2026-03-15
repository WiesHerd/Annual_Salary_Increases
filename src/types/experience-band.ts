/**
 * Experience band configuration for compensation positioning guidance.
 * Each band defines a YOE range and target TCC percentile range.
 */

export interface ExperienceBand {
  id: string;
  label: string;
  /** Min years of experience (inclusive). */
  minYoe: number;
  /** Max years of experience (inclusive). */
  maxYoe: number;
  /** Target TCC percentile low (e.g. 25). */
  targetTccPercentileLow: number;
  /** Target TCC percentile high (e.g. 50). */
  targetTccPercentileHigh: number;
  /** Optional: limit to population or specialty. */
  populationScope?: string[];
  specialtyScope?: string[];
  /** Optional: limit to plan type(s). */
  planScope?: string[];
}
