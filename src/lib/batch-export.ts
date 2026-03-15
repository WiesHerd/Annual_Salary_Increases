/**
 * Export provider records to CSV and XLSX (full schema).
 * Optional evaluationResults map merges policy metadata into each row for export.
 * Optional customDatasets: include their columns in export when join key matches Employee_ID.
 * Optional customStreamLookups: provider-linked custom streams (label, columnOrder, getRow) to append columns.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ProviderRecord } from '../types/provider';
import type { PolicyEvaluationResult } from '../types/compensation-policy';
import type { CustomDataset, RawRow } from '../types/upload';
import { buildCustomDatasetLookup } from './joins';

/** Provider-linked custom stream: append its columns to each provider row in export. */
export interface CustomStreamExportLookup {
  label: string;
  columnOrder: string[];
  getRow: (providerKey: string) => Record<string, string | number | undefined> | undefined;
}

function safePrefix(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32) || 'Custom';
}

function appendCustomColumns(
  row: Record<string, string | number>,
  providerKey: string,
  customDatasets: CustomDataset[]
): void {
  for (const dataset of customDatasets) {
    if (!dataset.joinKeyColumn || dataset.rows.length === 0) continue;
    const lookup = buildCustomDatasetLookup(dataset);
    const customRow: RawRow | undefined = lookup(providerKey);
    if (!customRow) continue;
    const prefix = `Custom_${safePrefix(dataset.name)}_`;
    for (const col of dataset.columns) {
      const v = customRow[col];
      const key = prefix + col.replace(/[^a-zA-Z0-9_]/g, '_');
      row[key] = v === undefined || v === null ? '' : typeof v === 'number' ? v : String(v);
    }
  }
}

function appendCustomStreamColumns(
  row: Record<string, string | number>,
  providerKey: string,
  customStreamLookups: CustomStreamExportLookup[]
): void {
  for (const { label, columnOrder, getRow } of customStreamLookups) {
    const customRow = getRow(providerKey);
    if (!customRow) continue;
    const prefix = `Stream_${safePrefix(label)}_`;
    for (const col of columnOrder) {
      const v = customRow[col];
      const key = prefix + col.replace(/[^a-zA-Z0-9_]/g, '_');
      row[key] = v === undefined || v === null ? '' : typeof v === 'number' ? v : String(v);
    }
  }
}

function recordToRow(
  r: ProviderRecord,
  evaluationResult?: PolicyEvaluationResult,
  customDatasets?: CustomDataset[],
  customStreamLookups?: CustomStreamExportLookup[]
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
  if (customDatasets?.length) {
    appendCustomColumns(row, r.Employee_ID ?? '', customDatasets);
  }
  if (customStreamLookups?.length) {
    appendCustomStreamColumns(row, r.Employee_ID ?? '', customStreamLookups);
  }
  return row;
}

export function exportToCsv(
  records: ProviderRecord[],
  evaluationResults?: Map<string, PolicyEvaluationResult>,
  customDatasets?: CustomDataset[],
  customStreamLookups?: CustomStreamExportLookup[]
): string {
  const rows = records.map((r) =>
    recordToRow(r, evaluationResults?.get(r.Employee_ID), customDatasets, customStreamLookups)
  );
  return Papa.unparse(rows);
}

export function exportToXlsx(
  records: ProviderRecord[],
  evaluationResults?: Map<string, PolicyEvaluationResult>,
  customDatasets?: CustomDataset[],
  customStreamLookups?: CustomStreamExportLookup[]
): ArrayBuffer {
  const rows = records.map((r) =>
    recordToRow(r, evaluationResults?.get(r.Employee_ID), customDatasets, customStreamLookups)
  );
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Provider Records');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
