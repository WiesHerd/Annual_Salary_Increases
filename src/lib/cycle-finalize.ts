/**
 * Finalize / unlock merit review cycles with immutable snapshots.
 */

import type { ProviderRecord } from '../types/provider';
import type { Cycle } from '../types/cycle';
import { filterProvidersForCycle } from './cycle-match';
import { computeSummary } from './salary-review-summary';
import { saveCycleSnapshot, deleteCycleSnapshot, type CycleSnapshot } from './cycle-snapshot-storage';
import { getSupabaseClient } from './supabase/client';
import {
  scheduleCloudCycleSnapshot,
  scheduleCloudCycleSnapshotDelete,
} from './supabase/cloud-cycle-snapshots';

export function isCycleLocked(cycle: Cycle | undefined): boolean {
  return !!cycle?.finalizedAt?.trim();
}

export function finalizeCycle(
  cycleId: string,
  cycles: Cycle[],
  records: ProviderRecord[]
): { nextCycles: Cycle[]; snapshot: CycleSnapshot } {
  const scoped = filterProvidersForCycle(records, cycleId, cycles);
  const summary = computeSummary(scoped);
  const finalizedAt = new Date().toISOString();
  const snapshot: CycleSnapshot = {
    cycleId,
    finalizedAt,
    providerCount: scoped.length,
    totalIncreaseDollars: summary.totalIncreaseDollars,
    records: scoped.map((r) => ({ ...r })),
  };
  saveCycleSnapshot(snapshot);
  scheduleCloudCycleSnapshot(getSupabaseClient(), snapshot);
  const nextCycles = cycles.map((c) =>
    c.id === cycleId ? { ...c, finalizedAt } : c
  );
  return { nextCycles, snapshot };
}

export function unlockCycle(cycleId: string, cycles: Cycle[]): Cycle[] {
  deleteCycleSnapshot(cycleId);
  scheduleCloudCycleSnapshotDelete(getSupabaseClient(), cycleId);
  return cycles.map((c) => (c.id === cycleId ? { ...c, finalizedAt: undefined } : c));
}
