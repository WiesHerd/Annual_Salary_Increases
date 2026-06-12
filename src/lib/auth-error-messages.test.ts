import { describe, expect, it } from 'vitest';
import { friendlyAuthError } from './auth-error-messages';

describe('friendlyAuthError', () => {
  it('maps known Supabase auth errors', () => {
    expect(friendlyAuthError('Invalid login credentials')).toMatch(/incorrect/i);
    expect(friendlyAuthError('Email not confirmed')).toMatch(/confirm/i);
  });

  it('sanitizes long technical errors', () => {
    expect(friendlyAuthError('PGRST301 something very wrong '.repeat(5))).toMatch(/something went wrong/i);
  });

  it('returns null for empty input', () => {
    expect(friendlyAuthError(null)).toBeNull();
    expect(friendlyAuthError('')).toBeNull();
  });
});
