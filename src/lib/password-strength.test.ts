import { describe, expect, it } from 'vitest';
import { assessPasswordStrength, passwordMatchState } from './password-strength';

describe('assessPasswordStrength', () => {
  it('returns empty for blank password', () => {
    expect(assessPasswordStrength('').level).toBe('empty');
  });

  it('scores weak for short simple password', () => {
    expect(assessPasswordStrength('abc').level).toBe('weak');
  });

  it('scores strong for complex password', () => {
    expect(assessPasswordStrength('Meritly2026!').level).toBe('strong');
  });
});

describe('passwordMatchState', () => {
  it('is idle until confirm is typed', () => {
    expect(passwordMatchState('abc', '')).toBe('idle');
  });

  it('detects match and mismatch', () => {
    expect(passwordMatchState('abc', 'abc')).toBe('match');
    expect(passwordMatchState('abc', 'abd')).toBe('mismatch');
  });
});
