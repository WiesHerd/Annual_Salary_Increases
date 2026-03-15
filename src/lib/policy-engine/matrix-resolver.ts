/**
 * Resolve default increase % from general merit matrix (evaluation score + performance category).
 */

import type { MeritMatrixRow } from '../../types/merit-matrix-row';
import type { PolicyFacts } from './facts';

/**
 * Look up default increase percent from merit matrix by evaluation score and performance category.
 * Returns undefined if no match (caller can fall back to 0 or other logic).
 */
export function resolveGeneralMatrixIncrease(
  meritMatrixRows: MeritMatrixRow[],
  facts: PolicyFacts
): { defaultIncreasePercent: number } | undefined {
  const score = facts.evaluationScore;
  const category = facts.performanceCategory?.trim().toLowerCase();
  if (score == null && !category) return undefined;
  const match = meritMatrixRows.find((row) => {
    const scoreMatch = score != null ? row.evaluationScore === Number(score) : true;
    const catMatch = category
      ? row.performanceLabel.trim().toLowerCase() === category
      : true;
    return scoreMatch && catMatch;
  });
  if (!match) return undefined;
  return { defaultIncreasePercent: match.defaultIncreasePercent };
}
