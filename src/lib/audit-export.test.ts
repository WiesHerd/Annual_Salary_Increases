import { describe, expect, it } from 'vitest';
import { auditEntriesToCsv } from './audit-export';
import type { AuditEntry } from './audit';

describe('audit-export', () => {
  it('formats CSV with header row', () => {
    const entries: AuditEntry[] = [
      {
        id: '1',
        entityType: 'provider',
        entityId: 'EXT001',
        field: 'Current_Base_Salary',
        oldValue: 100000,
        newValue: 105000,
        timestamp: '2026-06-01T12:00:00.000Z',
      },
    ];
    const csv = auditEntriesToCsv(entries);
    expect(csv.split('\r\n')[0]).toContain('Timestamp');
    expect(csv).toContain('EXT001');
    expect(csv).toContain('Current_Base_Salary');
  });
});
