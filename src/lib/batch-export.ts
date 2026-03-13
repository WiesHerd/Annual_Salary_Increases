/**
 * Export provider records to CSV and XLSX (full schema).
 * Optional evaluationResults map merges policy metadata into each row for export.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ProviderRecord } from '../types/provider';
import type { PolicyEvaluationResult } from '../types/compensation-policy';

function recordToRow(
  r: ProviderRecord,
  evaluationResult?: PolicyEvaluationResult
): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(r)) {
    if (v === undefined || v === null) row[k] = '';
    else row[k] = typeof v === 'number' ? v : String(v);
  }
  if (evaluationResult) {
    row['Policy_Source_Name'] = evaluationResult.finalPolicySource ?? '';
    row['Policy_Type'] = evaluationResult.finalModelType ?? '';
    row['Policy_Logic_Status'] = evaluationResult.blocked ? 'Blocked' : (evaluationResult.finalModelType ?? '');
    row['Policy_Explanation_Summary'] = evaluationResult.explanation?.slice(0, 2).join('; ') ?? '';
    row['Policy_Tier_Assigned'] = evaluationResult.tierAssigned ?? '';
    row['Manual_Review_Flag'] = evaluationResult.manualReview ? 'Yes' : '';
  }
  return row;
}

export function exportToCsv(
  records: ProviderRecord[],
  evaluationResults?: Map<string, PolicyEvaluationResult>
): string {
  const rows = records.map((r) => recordToRow(r, evaluationResults?.get(r.Employee_ID)));
  return Papa.unparse(rows);
}

export function exportToXlsx(
  records: ProviderRecord[],
  evaluationResults?: Map<string, PolicyEvaluationResult>
): ArrayBuffer {
  const rows = records.map((r) => recordToRow(r, evaluationResults?.get(r.Employee_ID)));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Provider Records');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
