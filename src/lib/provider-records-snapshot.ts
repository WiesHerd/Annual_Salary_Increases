/**
 * Snapshot / restore provider records for bulk-action undo.
 */

import type { ProviderRecord } from '../types/provider';

export type ProviderRecordsSnapshot = Map<string, ProviderRecord>;

/** Deep-copy matching rows before a bulk mutation. */
export function snapshotProviderRecords(
  records: ProviderRecord[],
  employeeIds: Iterable<string>
): ProviderRecordsSnapshot {
  const idSet = new Set(employeeIds);
  const map: ProviderRecordsSnapshot = new Map();
  for (const r of records) {
    if (idSet.has(r.Employee_ID)) {
      map.set(r.Employee_ID, { ...r });
    }
  }
  return map;
}

/** Replace rows from a prior snapshot; other rows unchanged. */
export function restoreProviderRecordsSnapshot(
  records: ProviderRecord[],
  snapshot: ProviderRecordsSnapshot
): ProviderRecord[] {
  if (snapshot.size === 0) return records;
  return records.map((r) => {
    const prev = snapshot.get(r.Employee_ID);
    return prev ? { ...prev } : r;
  });
}
