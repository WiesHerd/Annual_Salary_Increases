/**
 * Parse evaluation score from CSV/cells: plain numbers become number; anything else (e.g. "A+", "4a") stays string.
 */

export function parseEvaluationScore(raw: string | number | undefined): string | number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const s = String(raw).trim();
  if (s === '') return undefined;
  const normalized = s.replace(/,/g, '');
  const n = parseFloat(normalized);
  if (Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(normalized)) {
    return n;
  }
  return s;
}

/** True when a roster score matches a merit-matrix row (matrix uses numeric evaluation scores only). */
export function meritMatrixEvaluationMatches(matrixScore: number, recordScore: string | number): boolean {
  if (typeof recordScore === 'number') return matrixScore === recordScore;
  const n = Number(recordScore);
  const t = String(recordScore).trim().replace(/,/g, '');
  if (Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(t)) {
    return matrixScore === n;
  }
  return false;
}
