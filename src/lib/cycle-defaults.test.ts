import { describe, expect, it } from 'vitest';
import type { Cycle } from '../types/cycle';
import type { BudgetSettingsRow } from '../types/budget-settings';
import {
  budgetRowVisibleInTimeScope,
  compareCycleEffectiveDate,
  cycleVisibleInTimeScope,
  getPreferredCycleId,
  getRecentCyclesCutoffMs,
  sortCyclesNewestFirst,
} from './cycle-defaults';

function c(id: string, label: string, effectiveDate?: string): Cycle {
  return { id, label, effectiveDate };
}

describe('getPreferredCycleId', () => {
  it('returns undefined for empty list', () => {
    expect(getPreferredCycleId([])).toBeUndefined();
  });

  it('picks the latest effectiveDate', () => {
    const cycles = [c('a', 'FY24', '2024-07-01'), c('b', 'FY26', '2026-07-01'), c('c', 'FY25', '2025-07-01')];
    expect(getPreferredCycleId(cycles)).toBe('b');
  });

  it('on equal effectiveDate prefers later array index', () => {
    const cycles = [c('a', 'A', '2026-07-01'), c('b', 'B', '2026-07-01')];
    expect(getPreferredCycleId(cycles)).toBe('b');
  });

  it('with no valid dates uses last non-empty label', () => {
    const cycles = [c('a', '', ''), c('b', 'FY26', ''), c('c', '', '')];
    expect(getPreferredCycleId(cycles)).toBe('b');
  });

  it('with no valid dates and no labels uses last id', () => {
    const cycles = [c('a', '', ''), c('b', '', '')];
    expect(getPreferredCycleId(cycles)).toBe('b');
  });
});

describe('sortCyclesNewestFirst', () => {
  it('orders by date descending and puts missing dates last', () => {
    const cycles = [c('a', 'Old', '2020-01-01'), c('b', 'No date'), c('c', 'New', '2025-01-01')];
    expect(sortCyclesNewestFirst(cycles).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('getRecentCyclesCutoffMs', () => {
  it('returns null when no valid dates', () => {
    expect(getRecentCyclesCutoffMs([c('a', 'x', ''), c('b', 'y')])).toBeNull();
  });

  it('returns five years before latest date', () => {
    const latest = Date.parse('2026-07-01');
    const cycles = [c('a', 'old', '2010-01-01'), c('b', 'new', '2026-07-01')];
    const cut = getRecentCyclesCutoffMs(cycles);
    expect(cut).not.toBeNull();
    expect(cut!).toBeLessThan(latest);
    expect(latest - cut!).toBeCloseTo(5 * 365.25 * 24 * 60 * 60 * 1000, -3);
  });
});

describe('cycleVisibleInTimeScope', () => {
  const cut = Date.parse('2020-01-01');

  it('all scope always true', () => {
    expect(cycleVisibleInTimeScope(c('a', '', '1990-01-01'), 'all', cut)).toBe(true);
  });

  it('recent with null cutoff shows all', () => {
    expect(cycleVisibleInTimeScope(c('a', '', '1990-01-01'), 'recent', null)).toBe(true);
  });

  it('undated cycle visible in recent', () => {
    expect(cycleVisibleInTimeScope(c('a', 'new', ''), 'recent', cut)).toBe(true);
  });

  it('dated before cutoff hidden in recent', () => {
    expect(cycleVisibleInTimeScope(c('a', '', '1990-01-01'), 'recent', cut)).toBe(false);
  });
});

describe('budgetRowVisibleInTimeScope', () => {
  const cycles: Cycle[] = [c('c1', 'FY20', '2020-07-01'), c('c2', 'FY26', '2026-07-01')];
  const cut = getRecentCyclesCutoffMs(cycles)!;

  it('hides row for old cycle in recent scope', () => {
    const row: BudgetSettingsRow = {
      id: 'b1',
      cycleId: 'c1',
      cycleLabel: 'FY20',
    };
    expect(budgetRowVisibleInTimeScope(row, cycles, 'recent', cut)).toBe(false);
  });

  it('shows row for new cycle in recent scope', () => {
    const row: BudgetSettingsRow = {
      id: 'b1',
      cycleId: 'c2',
      cycleLabel: 'FY26',
    };
    expect(budgetRowVisibleInTimeScope(row, cycles, 'recent', cut)).toBe(true);
  });
});

describe('compareCycleEffectiveDate', () => {
  it('sorts desc with newer first', () => {
    const a = c('a', '', '2024-01-01');
    const b = c('b', '', '2025-01-01');
    expect(compareCycleEffectiveDate(a, b, 'desc')).toBeGreaterThan(0);
    expect(compareCycleEffectiveDate(b, a, 'desc')).toBeLessThan(0);
  });

  it('empty dates sort after valid when ascending', () => {
    const a = c('a', '', '');
    const b = c('b', '', '2025-01-01');
    expect(compareCycleEffectiveDate(a, b, 'asc')).toBeGreaterThan(0);
  });
});
