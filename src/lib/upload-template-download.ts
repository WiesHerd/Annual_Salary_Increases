/**
 * Download empty CSV/XLSX templates with column headers that match upload parsers and default mapping.
 *
 * Provider / market / evaluation / payments header lists are kept identical to `public/sample-*.csv`.
 * The provider parser still accepts extra columns (proposed pay, market join fields, etc.) when present.
 */

import * as XLSX from 'xlsx';

/** Header row for provider uploads — keep in sync with `public/sample-providers.csv`. */
export const PROVIDER_UPLOAD_TEMPLATE_HEADERS = [
  'Employee_ID',
  'Provider_Name',
  'Provider_Type',
  'Specialty',
  'Benchmark_Group',
  'Department',
  'Population',
  'Compensation_Plan',
  'Cycle',
  'Current_FTE',
  'Current_TCC',
  'Current_Target_WRVUs',
  'Current_TCC_Percentile',
  'Review_Status',
] as const;

/** Header row for market survey uploads — keep in sync with `public/sample-market.csv`. */
export const MARKET_UPLOAD_TEMPLATE_HEADERS = [
  'specialty',
  'TCC_25',
  'TCC_50',
  'TCC_75',
  'TCC_90',
  'WRVU_25',
  'WRVU_50',
  'WRVU_75',
  'WRVU_90',
  'CF_25',
  'CF_50',
  'CF_75',
  'CF_90',
  'incumbents',
  'orgCount',
] as const;

/** Header row for evaluation uploads — keep in sync with `public/sample-evaluations.csv`. */
export const EVALUATION_UPLOAD_TEMPLATE_HEADERS = [
  'Employee_ID',
  'Evaluation_Score',
  'Performance_Category',
  'Default_Increase_Percent',
] as const;

/** Header row for payments uploads — keep in sync with `public/sample-payments.csv`. */
export const PAYMENTS_UPLOAD_TEMPLATE_HEADERS = [
  'providerKey',
  'amount',
  'date',
  'category',
  'cycleId',
] as const;

export type UploadTemplateKind =
  | 'provider'
  | 'market'
  | 'evaluation'
  | 'payments'
  | 'customProvider'
  | 'customStandalone';

function templateHeaders(kind: UploadTemplateKind): string[] {
  switch (kind) {
    case 'provider':
      return [...PROVIDER_UPLOAD_TEMPLATE_HEADERS];
    case 'market':
      return [...MARKET_UPLOAD_TEMPLATE_HEADERS];
    case 'evaluation':
      return [...EVALUATION_UPLOAD_TEMPLATE_HEADERS];
    case 'payments':
      return [...PAYMENTS_UPLOAD_TEMPLATE_HEADERS];
    case 'customProvider':
      return ['Employee_ID', 'Example_Metric', 'Notes'];
    case 'customStandalone':
      return ['Record_Key', 'Example_Metric', 'Notes'];
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}

function filenameBase(kind: UploadTemplateKind): string {
  switch (kind) {
    case 'provider':
      return 'provider-upload-template';
    case 'market':
      return 'market-survey-upload-template';
    case 'evaluation':
      return 'evaluations-upload-template';
    case 'payments':
      return 'payments-upload-template';
    case 'customProvider':
      return 'custom-stream-provider-linked-template';
    case 'customStandalone':
      return 'custom-stream-standalone-template';
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}

function escapeCsvCell(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function buildCsv(headers: string[]): string {
  return headers.map(escapeCsvCell).join(',');
}

function buildXlsxBuffer(headers: string[]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download a header-only template file for the given upload kind. */
export function downloadUploadTemplate(kind: UploadTemplateKind, format: 'csv' | 'xlsx'): void {
  const headers = templateHeaders(kind);
  const base = filenameBase(kind);
  if (format === 'csv') {
    const csv = buildCsv(headers);
    triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${base}.csv`);
  } else {
    const buf = buildXlsxBuffer(headers);
    triggerDownload(
      new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `${base}.xlsx`
    );
  }
}
