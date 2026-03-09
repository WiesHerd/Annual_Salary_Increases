/**
 * Export provider records to CSV and XLSX (full schema).
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ProviderRecord } from '../types/provider';

function recordToRow(r: ProviderRecord): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(r)) {
    if (v === undefined || v === null) row[k] = '';
    else row[k] = typeof v === 'number' ? v : String(v);
  }
  return row;
}

export function exportToCsv(records: ProviderRecord[]): string {
  const rows = records.map(recordToRow);
  return Papa.unparse(rows);
}

export function exportToXlsx(records: ProviderRecord[]): ArrayBuffer {
  const rows = records.map(recordToRow);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Provider Records');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
