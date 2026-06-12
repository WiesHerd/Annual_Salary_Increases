import { describe, it, expect } from 'vitest';
import { searchControlsActions } from './controls-actions';

describe('searchControlsActions', () => {
  it('returns popular defaults when query is empty', () => {
    const results = searchControlsActions('');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === 'equity-suggestions')).toBe(true);
  });

  it('finds policy setup intents', () => {
    const results = searchControlsActions('set up a policy');
    expect(results.some((r) => r.id === 'create-policy' || r.id === 'policy-library')).toBe(true);
  });

  it('finds equity configuration', () => {
    const results = searchControlsActions('apply equity');
    expect(results[0]?.id).toBe('equity-suggestions');
  });

  it('finds FMV exclusion', () => {
    const results = searchControlsActions('fmv 75th');
    expect(results.some((r) => r.id === 'fmv-exclusion')).toBe(true);
  });
});
