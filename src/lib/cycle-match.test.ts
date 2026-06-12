import { describe, it, expect } from 'vitest';
import type { ProviderRecord } from '../types/provider';
import {
  normalizeCycleToken,
  providerMatchesCycle,
  resolveCycleStampValue,
  filterProvidersForCycle,
} from './cycle-match';

const cycles = [
  { id: 'cycle-fy2026', label: 'FY 2026' },
  { id: 'cycle-fy2025', label: 'FY 2025' },
];

function rec(cycle?: string): ProviderRecord {
  return { Employee_ID: 'e1', Cycle: cycle };
}

describe('cycle-match', () => {
  it('normalizes cycle tokens', () => {
    expect(normalizeCycleToken(' FY 2025 ')).toBe('fy2025');
    expect(normalizeCycleToken('cycle-fy2025')).toBe('cycle-fy2025');
  });

  it('matches by cycle label, id, and legacy FY2025 token', () => {
    expect(providerMatchesCycle(rec('FY 2025'), 'cycle-fy2025', cycles)).toBe(true);
    expect(providerMatchesCycle(rec('cycle-fy2025'), 'cycle-fy2025', cycles)).toBe(true);
    expect(providerMatchesCycle(rec('FY2025'), 'cycle-fy2025', cycles)).toBe(true);
    expect(providerMatchesCycle(rec('FY 2026'), 'cycle-fy2025', cycles)).toBe(false);
  });

  it('includes unassigned providers by default', () => {
    expect(providerMatchesCycle(rec(undefined), 'cycle-fy2025', cycles)).toBe(true);
    expect(providerMatchesCycle(rec(''), 'cycle-fy2025', cycles, { includeUnassigned: false })).toBe(false);
  });

  it('resolveCycleStampValue prefers label', () => {
    expect(resolveCycleStampValue('cycle-fy2026', cycles)).toBe('FY 2026');
  });

  it('filterProvidersForCycle returns cycle subset', () => {
    const records = [rec('FY 2025'), rec('FY 2026'), rec()];
    expect(filterProvidersForCycle(records, 'cycle-fy2025', cycles)).toHaveLength(2);
  });
});
