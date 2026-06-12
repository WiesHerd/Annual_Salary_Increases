import { describe, expect, it } from 'vitest';
import type { ProviderRecord } from '../types/provider';
import {
  snapshotProviderRecords,
  restoreProviderRecordsSnapshot,
} from './provider-records-snapshot';

const records: ProviderRecord[] = [
  { Employee_ID: 'A', Proposed_Base_Salary: 100 } as ProviderRecord,
  { Employee_ID: 'B', Proposed_Base_Salary: 200 } as ProviderRecord,
];

describe('provider-records-snapshot', () => {
  it('round-trips selected rows', () => {
    const snap = snapshotProviderRecords(records, ['A']);
    const restored = restoreProviderRecordsSnapshot(
      [{ Employee_ID: 'A', Proposed_Base_Salary: 999 } as ProviderRecord, records[1]],
      snap
    );
    expect(restored[0].Proposed_Base_Salary).toBe(100);
    expect(restored[1].Proposed_Base_Salary).toBe(200);
  });
});
