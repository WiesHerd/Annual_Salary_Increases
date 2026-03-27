import { describe, expect, it } from 'vitest';
import { meritMatrixEvaluationMatches, parseEvaluationScore } from './evaluation-score';

describe('parseEvaluationScore', () => {
  it('returns number for plain numeric cells', () => {
    expect(parseEvaluationScore('4.2')).toBe(4.2);
    expect(parseEvaluationScore(4)).toBe(4);
    expect(parseEvaluationScore('1,234.5')).toBe(1234.5);
  });

  it('returns string for alphanumeric values', () => {
    expect(parseEvaluationScore('A+')).toBe('A+');
    expect(parseEvaluationScore('4a')).toBe('4a');
    expect(parseEvaluationScore('B')).toBe('B');
  });

  it('returns undefined for empty', () => {
    expect(parseEvaluationScore(undefined)).toBeUndefined();
    expect(parseEvaluationScore('')).toBeUndefined();
    expect(parseEvaluationScore('   ')).toBeUndefined();
  });
});

describe('meritMatrixEvaluationMatches', () => {
  it('matches numeric matrix to number or numeric string', () => {
    expect(meritMatrixEvaluationMatches(4, 4)).toBe(true);
    expect(meritMatrixEvaluationMatches(4, '4')).toBe(true);
    expect(meritMatrixEvaluationMatches(4.5, '4.5')).toBe(true);
    expect(meritMatrixEvaluationMatches(4, 5)).toBe(false);
  });

  it('does not match alphanumeric roster to numeric matrix', () => {
    expect(meritMatrixEvaluationMatches(4, 'A+')).toBe(false);
  });
});
