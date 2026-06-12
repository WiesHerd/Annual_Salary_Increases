/**
 * Persisted snapshots of provider review state when a merit cycle is finalized.
 */

import type { ProviderRecord } from '../types/provider';
import { safeLocalStorageSetItem } from './safe-local-storage';

export interface CycleSnapshot {
  cycleId: string;
  finalizedAt: string;
  providerCount: number;
  totalIncreaseDollars: number;
  /** Full copy of each provider in the cycle at finalize time. */
  records: ProviderRecord[];
}

const STORAGE_KEY = 'meritly-cycle-snapshots';

type SnapshotStore = Record<string, CycleSnapshot>;

function loadStore(): SnapshotStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as unknown;
    if (typeof data !== 'object' || data == null || Array.isArray(data)) return {};
    return data as SnapshotStore;
  } catch {
    return {};
  }
}

function saveStore(store: SnapshotStore): void {
  safeLocalStorageSetItem(STORAGE_KEY, JSON.stringify(store));
}

export function saveCycleSnapshot(snapshot: CycleSnapshot): void {
  const store = loadStore();
  store[snapshot.cycleId] = snapshot;
  saveStore(store);
}

export function loadCycleSnapshot(cycleId: string): CycleSnapshot | null {
  return loadStore()[cycleId] ?? null;
}

export function deleteCycleSnapshot(cycleId: string): void {
  const store = loadStore();
  delete store[cycleId];
  saveStore(store);
}
