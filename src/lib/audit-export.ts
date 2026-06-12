/**
 * Export audit log entries to CSV.
 */

import type { AuditEntry } from './audit';

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function formatAuditValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function auditEntriesToCsv(entries: AuditEntry[]): string {
  const header = ['Timestamp', 'Entity type', 'Entity ID', 'Field', 'Old value', 'New value'];
  const rows = entries.map((e) =>
    [
      e.timestamp,
      e.entityType,
      e.entityId,
      e.field,
      formatAuditValue(e.oldValue),
      formatAuditValue(e.newValue),
    ]
      .map(escapeCsv)
      .join(',')
  );
  return [header.join(','), ...rows].join('\r\n');
}

export function downloadAuditLogCsv(entries: AuditEntry[], filename = 'meritly-audit-log.csv'): void {
  const csv = auditEntriesToCsv(entries);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
