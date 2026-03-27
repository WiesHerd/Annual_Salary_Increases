/**
 * Parse CSV/XLSX and apply column mapping to produce upload results.
 * Provider upload produces ProviderRecord[]; market uploads unchanged.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type {
  RawRow,
  ProviderColumnMapping,
  ProviderUploadResult,
  MarketColumnMapping,
  MarketUploadResult,
  EvaluationColumnMapping,
  EvaluationUploadResult,
  EvaluationJoinRow,
  CustomUploadResult,
} from '../types';
import type { MarketRow } from '../types/market';
import { parseProviderRow, buildDefaultProviderMapping as buildProviderMapping } from './provider-parse';
import {
  loadLearnedMarketMapping,
  applyLearnedMarketMapping,
  loadLearnedEvaluationMapping,
  applyLearnedEvaluationMapping,
} from './column-mapping-storage';
import { parseEvaluationScore } from './evaluation-score';

const DEFAULT_CYCLE_ID = 'FY2025';

function getCell(row: RawRow, col: string | undefined): string | number | undefined {
  if (col == null || col === '') return undefined;
  const v = row[col];
  if (v === '' || v === null || v === undefined) return undefined;
  return v;
}

function num(val: string | number | undefined): number {
  if (val === undefined || val === null || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,$]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function isMissingSentinel(v: string): boolean {
  const s = v.trim().toLowerCase();
  if (!s) return true;
  // Common “not available” / placeholder values from exports.
  if (['n/a', 'na', 'n.a.', 'none', 'null', '--', '---', '-'].includes(s)) return true;
  // Handles sequences like "-----" or em-dash placeholders.
  if (/^-+$/.test(s)) return true;
  if (s === '—' || s === '–') return true; // em/en dash
  return false;
}

function numMaybe(val: string | number | undefined): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'string' && isMissingSentinel(val)) return undefined;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,$]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function str(val: string | number | undefined): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/** Build default provider column mapping from headers. Re-export from provider-parse. */
export const buildDefaultProviderMapping = buildProviderMapping;

/** Parse CSV string with provider mapping. */
export function parseCsv(csv: string, mapping: ProviderColumnMapping): ProviderUploadResult {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const errors: string[] = parsed.errors.map((e) => e.message ?? 'Parse error');
  const rawRows: RawRow[] = parsed.data as RawRow[];
  const rows: import('../types/provider').ProviderRecord[] = [];
  rawRows.forEach((row, i) => {
    const r = parseProviderRow(row, mapping, i, errors);
    if (r) rows.push(r);
  });
  return { rows, errors, mapping };
}

/** Parse XLSX file (first sheet) with provider mapping. */
export function parseXlsx(buffer: ArrayBuffer, mapping: ProviderColumnMapping): ProviderUploadResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const first = wb.SheetNames[0];
  if (!first) return { rows: [], errors: ['No sheet in workbook'], mapping };
  const sheet = wb.Sheets[first];
  const data = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet) as RawRow[];
  const errors: string[] = [];
  const rows: import('../types/provider').ProviderRecord[] = [];
  data.forEach((row, i) => {
    const r = parseProviderRow(row, mapping, i, errors);
    if (r) rows.push(r);
  });
  return { rows, errors, mapping };
}

/** Get headers from CSV string. */
export function getCsvHeaders(csv: string): string[] {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true });
  const first = parsed.data[0];
  return first ? Object.keys(first) : [];
}

/** Get headers from XLSX buffer (first sheet). */
export function getXlsxHeaders(buffer: ArrayBuffer): string[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const sheet = wb.Sheets[first];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
  const headerRow = data[0];
  return Array.isArray(headerRow) ? headerRow.map(String) : [];
}

// ---------- Market ----------

const PERCENTILES = [25, 50, 75, 90];

function matchesTccCol(l: string): boolean {
  return (
    l.includes('tcc') ||
    l.includes('total cash') ||
    l.includes('total comp') ||
    l.includes('cash comp') ||
    (l.includes('compensation') && !l.includes('base'))
  );
}

function matchesWrvuCol(l: string): boolean {
  return (
    l.includes('wrvu') ||
    l.includes('work rvu') ||
    (l.includes(' rvu') && !l.includes('total') && !l.includes('asa')) ||
    (l.includes('wrvu') && l.includes('work'))
  );
}

function matchesCfCol(l: string): boolean {
  return l.includes('cf') || l.includes('conversion');
}

function matchesPercentile(l: string, p: number): boolean {
  const s = String(p);
  return (
    l.includes(s) ||
    l.includes('p' + s) ||
    l.includes(s + 'th') ||
    l.includes('percentile ' + s)
  );
}

/** Build default market mapping: specialty + TCC_25..TCC_90, WRVU_25..WRVU_90, CF_25..CF_90. */
export function buildDefaultMarketMapping(headers: string[]): MarketColumnMapping {
  const m: MarketColumnMapping = { specialty: '' };
  const lower = (h: string) => h.trim().toLowerCase();
  for (const h of headers) {
    const l = lower(h);
    if (
      ((l.includes('specialty') || l.includes('spec') || l.includes('job')) && !l.includes('job code') && !m.specialty)
    )
      m.specialty = h;
    else if (l.includes('label') && !m.label) m.label = h;
    else if (
      (l.includes('incumbent') || l === 'physicians') &&
      !l.includes('percentile') &&
      !m.incumbents
    )
      m.incumbents = h;
    else if (
      (l.includes('org') || l.includes('organization') || l === 'practices') &&
      !l.includes('percentile') &&
      !l.includes('organizational') &&
      !m.orgCount
    )
      m.orgCount = h;
    else {
      for (const p of PERCENTILES) {
        if (matchesTccCol(l) && matchesPercentile(l, p) && !m[`TCC_${p}`]) m[`TCC_${p}`] = h;
        if (matchesWrvuCol(l) && matchesPercentile(l, p) && !m[`WRVU_${p}`]) m[`WRVU_${p}`] = h;
        if (matchesCfCol(l) && matchesPercentile(l, p) && !m[`CF_${p}`]) m[`CF_${p}`] = h;
      }
    }
  }
  const learned = loadLearnedMarketMapping();
  return applyLearnedMarketMapping(m, headers, learned) as MarketColumnMapping;
}

function parseMarketRow(
  row: RawRow,
  mapping: MarketColumnMapping,
  index: number,
  errors: string[]
): MarketRow | null {
  const specialty = str(getCell(row, mapping.specialty));
  if (!specialty) {
    errors.push(`Row ${index + 1}: missing specialty`);
    return null;
  }
  const tccPercentiles: Record<number, number> = {};
  const wrvuPercentiles: Record<number, number> = {};
  const cfPercentiles: Record<number, number> = {};
  for (const p of PERCENTILES) {
    const tccCol = mapping[`TCC_${p}`];
    const wrvuCol = mapping[`WRVU_${p}`];
    const cfCol = mapping[`CF_${p}`];
    if (tccCol != null) {
      const cell = getCell(row, tccCol);
      if (cell !== undefined) {
        const missing = typeof cell === 'string' && isMissingSentinel(cell);
        if (!missing) {
          const n = numMaybe(cell);
          if (n === undefined) errors.push(`Row ${index + 1}: invalid TCC_${p}`);
          else tccPercentiles[p] = n;
        }
      }
    }
    if (wrvuCol != null) {
      const cell = getCell(row, wrvuCol);
      if (cell !== undefined) {
        const missing = typeof cell === 'string' && isMissingSentinel(cell);
        if (!missing) {
          const n = numMaybe(cell);
          if (n === undefined) errors.push(`Row ${index + 1}: invalid WRVU_${p}`);
          else wrvuPercentiles[p] = n;
        }
      }
    }
    if (cfCol != null) {
      const cell = getCell(row, cfCol);
      if (cell !== undefined) {
        const missing = typeof cell === 'string' && isMissingSentinel(cell);
        if (!missing) {
          const n = numMaybe(cell);
          if (n === undefined) errors.push(`Row ${index + 1}: invalid CF_${p}`);
          else cfPercentiles[p] = n;
        }
      }
    }
  }
  const label = mapping.label ? str(getCell(row, mapping.label)) : undefined;
  const incumbentsCol = mapping.incumbents;
  const orgCountCol = mapping.orgCount;
  let incumbents: number | undefined;
  let orgCount: number | undefined;
  if (incumbentsCol != null) {
    const cell = getCell(row, incumbentsCol);
    if (cell !== undefined) {
      const missing = typeof cell === 'string' && isMissingSentinel(cell);
      if (!missing) {
        const n = numMaybe(cell);
        if (n === undefined) errors.push(`Row ${index + 1}: invalid incumbents`);
        else incumbents = n;
      }
    }
  }
  if (orgCountCol != null) {
    const cell = getCell(row, orgCountCol);
    if (cell !== undefined) {
      const missing = typeof cell === 'string' && isMissingSentinel(cell);
      if (!missing) {
        const n = numMaybe(cell);
        if (n === undefined) errors.push(`Row ${index + 1}: invalid orgCount`);
        else orgCount = n;
      }
    }
  }
  return {
    specialty,
    tccPercentiles,
    wrvuPercentiles,
    cfPercentiles: Object.keys(cfPercentiles).length > 0 ? cfPercentiles : undefined,
    label: label || undefined,
    incumbents: incumbents != null && Number.isFinite(incumbents) ? incumbents : undefined,
    orgCount: orgCount != null && Number.isFinite(orgCount) ? orgCount : undefined,
  };
}

export function parseMarketCsv(csv: string, mapping: MarketColumnMapping): MarketUploadResult {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const errors: string[] = parsed.errors.map((e) => e.message ?? 'Parse error');
  const rawRows: RawRow[] = parsed.data as RawRow[];
  const rows: MarketRow[] = [];
  rawRows.forEach((row, i) => {
    const r = parseMarketRow(row, mapping, i, errors);
    if (r) rows.push(r);
  });
  return { rows, errors, mapping };
}

export function parseMarketXlsx(buffer: ArrayBuffer, mapping: MarketColumnMapping): MarketUploadResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const first = wb.SheetNames[0];
  if (!first) return { rows: [], errors: ['No sheet in workbook'], mapping };
  const sheet = wb.Sheets[first];
  const data = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet) as RawRow[];
  const errors: string[] = [];
  const rows: MarketRow[] = [];
  data.forEach((row, i) => {
    const r = parseMarketRow(row, mapping, i, errors);
    if (r) rows.push(r);
  });
  return { rows, errors, mapping };
}

// ---------- Evaluation (join by Employee_ID) ----------

/** Build default evaluation mapping from headers. */
export function buildDefaultEvaluationMapping(headers: string[]): EvaluationColumnMapping {
  const m: EvaluationColumnMapping = { Employee_ID: '' };
  const lower = (h: string) => h.trim().toLowerCase();
  for (const h of headers) {
    const l = lower(h);
    if ((l.includes('employee') && l.includes('id')) || l === 'emp_id' || l === 'empid') m.Employee_ID = m.Employee_ID || h;
    else if ((l.includes('evaluation') && l.includes('score')) || l === 'eval_score') m.Evaluation_Score = m.Evaluation_Score || h;
    else if (l.includes('performance') || l.includes('category') || l === 'perf_cat') m.Performance_Category = m.Performance_Category || h;
    else if (l.includes('default') && l.includes('increase')) m.Default_Increase_Percent = m.Default_Increase_Percent || h;
  }
  const learned = loadLearnedEvaluationMapping();
  return applyLearnedEvaluationMapping(m, headers, learned) as EvaluationColumnMapping;
}

function parseEvaluationRow(
  row: RawRow,
  mapping: EvaluationColumnMapping,
  index: number,
  errors: string[]
): EvaluationJoinRow | null {
  const employeeId = str(getCell(row, mapping.Employee_ID));
  if (!employeeId) {
    errors.push(`Row ${index + 1}: missing Employee_ID`);
    return null;
  }
  const evalScoreRaw = mapping.Evaluation_Score ? getCell(row, mapping.Evaluation_Score) : undefined;
  const evaluationScore = parseEvaluationScore(evalScoreRaw);
  const performanceCategory = mapping.Performance_Category ? str(getCell(row, mapping.Performance_Category)) : undefined;
  const defaultPctRaw = mapping.Default_Increase_Percent ? getCell(row, mapping.Default_Increase_Percent) : undefined;
  const defaultIncreasePercent = defaultPctRaw !== undefined && defaultPctRaw !== '' ? num(defaultPctRaw) : undefined;
  return {
    Employee_ID: employeeId,
    ...(evaluationScore !== undefined ? { Evaluation_Score: evaluationScore } : {}),
    ...(performanceCategory !== undefined && performanceCategory !== '' ? { Performance_Category: performanceCategory } : {}),
    ...(defaultIncreasePercent !== undefined && Number.isFinite(defaultIncreasePercent) ? { Default_Increase_Percent: defaultIncreasePercent } : {}),
  };
}

export function parseEvaluationCsv(csv: string, mapping: EvaluationColumnMapping): EvaluationUploadResult {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const errors: string[] = parsed.errors.map((e) => e.message ?? 'Parse error');
  const rawRows: RawRow[] = parsed.data as RawRow[];
  const rows: EvaluationJoinRow[] = [];
  rawRows.forEach((row, i) => {
    const r = parseEvaluationRow(row, mapping, i, errors);
    if (r) rows.push(r);
  });
  return { rows, errors, mapping };
}

export function parseEvaluationXlsx(buffer: ArrayBuffer, mapping: EvaluationColumnMapping): EvaluationUploadResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const first = wb.SheetNames[0];
  if (!first) return { rows: [], errors: ['No sheet in workbook'], mapping };
  const sheet = wb.Sheets[first];
  const data = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet) as RawRow[];
  const errors: string[] = [];
  const rows: EvaluationJoinRow[] = [];
  data.forEach((row, i) => {
    const r = parseEvaluationRow(row, mapping, i, errors);
    if (r) rows.push(r);
  });
  return { rows, errors, mapping };
}

// ---------- Custom data (generic rows, no fixed schema) ----------

/** Parse CSV for custom upload: returns raw rows and column names. No schema applied. */
export function parseCustomCsv(csv: string): CustomUploadResult {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const errors: string[] = parsed.errors.map((e) => e.message ?? 'Parse error');
  const rawRows: RawRow[] = parsed.data as RawRow[];
  const first = rawRows[0];
  const columns = first ? Object.keys(first) : [];
  return { rows: rawRows, errors, columns, joinKeyColumn: null };
}

/** Parse XLSX (first sheet) for custom upload: returns raw rows and column names. No schema applied. */
export function parseCustomXlsx(buffer: ArrayBuffer): CustomUploadResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const first = wb.SheetNames[0];
  if (!first) return { rows: [], errors: ['No sheet in workbook'], columns: [], joinKeyColumn: null };
  const sheet = wb.Sheets[first];
  const data = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet) as RawRow[];
  const columns = data[0] ? Object.keys(data[0]) : [];
  return { rows: data, errors: [], columns, joinKeyColumn: null };
}

export { DEFAULT_CYCLE_ID };
