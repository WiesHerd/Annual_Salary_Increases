/**
 * Merit matrix / PEVL row: evaluation score + performance label → default increase %.
 * Used for configuration UI and lookup when computing default increase.
 */

export interface MeritMatrixRow {
  id: string;
  /** Evaluation score (e.g. 1–5 or numeric band). */
  evaluationScore: number;
  /** Performance label (e.g. "Exceeds", "Meets", "Below"). */
  performanceLabel: string;
  /** Default merit increase as percent (e.g. 3.5). */
  defaultIncreasePercent: number;
  notes?: string;
}
