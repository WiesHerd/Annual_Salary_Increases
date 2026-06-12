import { describe, it, expect } from 'vitest';
import { computeControlsReadiness, controlsReadinessProgress } from './controls-readiness';

describe('computeControlsReadiness', () => {
  it('tracks five configuration areas including mappings', () => {
    const items = computeControlsReadiness({
      recordsCount: 10,
      cycles: [{ id: 'c1', label: 'FY26', effectiveDate: '2026-01-01' }],
      meritMatrix: [{ id: 'm1', evaluationScore: 3, performanceLabel: 'Meets', defaultIncreasePercent: 3 }],
      policies: [{ id: 'p1', status: 'active' } as never],
      mappingCount: 2,
    });
    expect(items).toHaveLength(5);
    expect(controlsReadinessProgress(items)).toEqual({ complete: 5, total: 5 });
  });

  it('flags missing data and inactive-only policies', () => {
    const items = computeControlsReadiness({
      recordsCount: 0,
      cycles: [],
      meritMatrix: [],
      policies: [{ id: 'p1', status: 'inactive' } as never],
      mappingCount: 0,
    });
    expect(items.find((i) => i.id === 'data')?.ready).toBe(false);
    expect(items.find((i) => i.id === 'mappings')?.ready).toBe(false);
    expect(items.find((i) => i.id === 'policies')?.ready).toBe(false);
    expect(items.find((i) => i.id === 'policies')?.detail).toContain('inactive');
  });
});
