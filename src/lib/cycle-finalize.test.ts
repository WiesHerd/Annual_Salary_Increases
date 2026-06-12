import { describe, expect, it } from 'vitest';
import { finalizeCycle, isCycleLocked, unlockCycle } from './cycle-finalize';
import type { Cycle } from '../types/cycle';
import type { ProviderRecord } from '../types/provider';

const cycles: Cycle[] = [
  { id: 'cycle-fy2025', label: 'FY 2025' },
  { id: 'cycle-fy2026', label: 'FY 2026' },
];

const records: ProviderRecord[] = [
  {
    Employee_ID: 'EXT001',
    Provider_Name: 'Alice',
    Cycle: 'FY 2025',
    Current_Base_Salary: 200_000,
    Proposed_Base_Salary: 206_000,
  } as ProviderRecord,
];

describe('cycle finalize', () => {
  it('isCycleLocked when finalizedAt is set', () => {
    expect(isCycleLocked(undefined)).toBe(false);
    expect(isCycleLocked({ id: 'x', label: 'X' })).toBe(false);
    expect(isCycleLocked({ id: 'x', label: 'X', finalizedAt: '2026-01-01T00:00:00.000Z' })).toBe(true);
  });

  it('finalizeCycle stamps finalizedAt and saves snapshot metadata', () => {
    const { nextCycles, snapshot } = finalizeCycle('cycle-fy2025', cycles, records);
    expect(nextCycles.find((c) => c.id === 'cycle-fy2025')?.finalizedAt).toBeTruthy();
    expect(snapshot.providerCount).toBe(1);
    expect(snapshot.records[0].Employee_ID).toBe('EXT001');
    expect(snapshot.totalIncreaseDollars).toBe(6000);
  });

  it('unlockCycle clears finalizedAt', () => {
    const locked = cycles.map((c) =>
      c.id === 'cycle-fy2025' ? { ...c, finalizedAt: '2026-01-01T00:00:00.000Z' } : c
    );
    const unlocked = unlockCycle('cycle-fy2025', locked);
    expect(unlocked.find((c) => c.id === 'cycle-fy2025')?.finalizedAt).toBeUndefined();
  });
});
