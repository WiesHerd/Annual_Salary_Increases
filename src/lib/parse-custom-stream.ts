/**
 * Parse CSV/XLSX for custom data streams with column mapping.
 * Produces rows keyed by logical column names for display and export.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { RawRow } from '../types';
import type {
  CustomStreamColumnMapping,
  CustomStreamRow,
  CustomStreamUploadResult,
} from '../types/custom-stream';
import {
  loadLearnedCustomStreamMapping,
  applyLearnedCustomStreamMapping,
} from './column-mapping-storage';

function getCell(row: RawRow, col: string | undefined): string | number | undefined {
  if (col == null || col === '') return undefined;
  const v = row[col];
  if (v === '' || v === null || v === undefined) return undefined;
  return v;
}

function toValue(val: string | number | undefined): string | number | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  if (s === '') return undefined;
  const n = parseFloat(s.replace(/[,$]/g, ''));
  return Number.isFinite(n) ? n : val;
}

/**
 * Build default mapping from file headers.
 * Provider-linked: map "Employee_ID" to first matching header; other headers as logical names.
 * Standalone: map keyColumn to first column if provided; other headers as logical names.
 * When streamId is provided, applies learned mapping for that stream.
 */
export function buildDefaultCustomStreamMapping(
  headers: string[],
  linkType: 'provider' | 'standalone',
  keyColumn?: string,
  streamId?: string
): CustomStreamColumnMapping {
  const lower = (h: string) => h.trim().toLowerCase();
  const m: CustomStreamColumnMapping = {};
  for (const h of headers) {
    const l = lower(h);
    if (linkType === 'provider' && (l.includes('employee') && l.includes('id') || l === 'emp_id' || l === 'empid')) {
      if (!m['Employee_ID']) m['Employee_ID'] = h;
    } else if (linkType === 'standalone' && keyColumn && (l === lower(keyColumn) || l.includes(lower(keyColumn)))) {
      if (!m[keyColumn]) m[keyColumn] = h;
    } else {
      if (!m[h]) m[h] = h;
    }
  }
  if (linkType === 'provider' && !m['Employee_ID'] && headers.length > 0) {
    m['Employee_ID'] = headers[0];
  }
  if (linkType === 'standalone' && keyColumn && !m[keyColumn] && headers.length > 0) {
    m[keyColumn] = headers[0];
  }
  if (streamId) {
    const learned = loadLearnedCustomStreamMapping(streamId);
    return applyLearnedCustomStreamMapping(m, headers, learned) as CustomStreamColumnMapping;
  }
  return m;
}

/**
 * Parse raw rows with mapping into CustomStreamUploadResult.
 * linkKeyLogicalName: "Employee_ID" for provider-linked, or the key column logical name for standalone.
 */
export function parseCustomStreamFromRawRows(
  rawRows: RawRow[],
  mapping: CustomStreamColumnMapping,
  linkKeyLogicalName: string
): CustomStreamUploadResult {
  const errors: string[] = [];
  const rows: CustomStreamRow[] = [];
  const sourceColForLink = mapping[linkKeyLogicalName];
  if (!sourceColForLink) {
    errors.push(`Link key "${linkKeyLogicalName}" must be mapped to a column`);
    return { rows: [], errors, mapping, columnOrder: [] };
  }
  const columnOrder = Object.keys(mapping).filter((k) => mapping[k]);
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const out: CustomStreamRow = {};
    let linkVal: string | number | undefined;
    for (const [logicalName, sourceCol] of Object.entries(mapping)) {
      if (!sourceCol) continue;
      const v = getCell(row, sourceCol);
      const value = toValue(v);
      out[logicalName] = value;
      if (logicalName === linkKeyLogicalName) linkVal = value;
    }
    if (linkVal === undefined || linkVal === '' || String(linkVal).trim() === '') {
      errors.push(`Row ${i + 1}: missing value for ${linkKeyLogicalName}`);
      continue;
    }
    rows.push(out);
  }
  return { rows, errors, mapping, columnOrder };
}

export function parseCustomStreamCsv(
  csv: string,
  mapping: CustomStreamColumnMapping,
  linkKeyLogicalName: string
): CustomStreamUploadResult {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const parseErrors = parsed.errors.map((e) => e.message ?? 'Parse error');
  const rawRows: RawRow[] = parsed.data as RawRow[];
  const result = parseCustomStreamFromRawRows(rawRows, mapping, linkKeyLogicalName);
  return { ...result, errors: [...parseErrors, ...result.errors] };
}

export function parseCustomStreamXlsx(
  buffer: ArrayBuffer,
  mapping: CustomStreamColumnMapping,
  linkKeyLogicalName: string
): CustomStreamUploadResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const first = wb.SheetNames[0];
  if (!first) return { rows: [], errors: ['No sheet in workbook'], mapping, columnOrder: [] };
  const sheet = wb.Sheets[first];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet) as RawRow[];
  return parseCustomStreamFromRawRows(rawRows, mapping, linkKeyLogicalName);
}

