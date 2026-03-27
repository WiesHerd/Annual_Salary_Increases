/**
 * Download CSV/XLSX templates with column headers plus one example data row so users see expected formats.
 *
 * Provider / market / evaluation header lists align with `public/sample-*.csv`.
 * Current TCC is app-calculated from components (see Parameters → Current TCC). The provider parser accepts extra
 * columns (TCC components, market join fields, proposed pay).
 */

import * as XLSX from 'xlsx';

/**
 * Recommended roster columns aligned with typical HR/payroll extracts: division, name, org,
 * benchmark vs subspecialty, tenure, FTE, salary, evaluation, plan, CF, wRVUs.
 * Extra columns remain supported via mapping.
 */
export const PROVIDER_UPLOAD_TEMPLATE_HEADERS = [
  'Primary_Division',
  'Provider_Name',
  'Department',
  'Provider_Type',
  'Employee_ID',
  'Benchmark_Group',
  'Subspecialty',
  'Hire_Date',
  'Years_of_Experience',
  'Clinical_FTE',
  'Current_FTE',
  'Current_Base_Salary',
  'Prior_Year_WRVU_Incentive',
  'Value_Based_Payment',
  'Shift_Incentive',
  'Quality_Bonus',
  'Division_Chief_Pay',
  'Medical_Director_Pay',
  'Teaching_Pay',
  'PSQ_Pay',
  'Other_Recurring_Comp',
  'TCC_Other_Clinical_1',
  'TCC_Other_Clinical_2',
  'TCC_Other_Clinical_3',
  'Evaluation_Score',
  'Compensation_Plan',
  'Current_CF',
  'Prior_Year_WRVUs',
] as const;

/**
 * One example roster row (same order as PROVIDER_UPLOAD_TEMPLATE_HEADERS). Fictional SAMPLE001 — replace with real IDs and amounts.
 */
export const PROVIDER_UPLOAD_TEMPLATE_SAMPLE_ROW: readonly string[] = [
  'Heart Center',
  'Jane Smith',
  'Medical',
  'Physician',
  'SAMPLE001',
  'Cardiology',
  'Interventional Cardiology',
  '2015-03-01',
  '12',
  '0.85',
  '1',
  '280000',
  '45000',
  '10000',
  '5000',
  '8000',
  '',
  '',
  '3000',
  '',
  '',
  '',
  '',
  '',
  '4.2',
  'wrvu',
  '52.5',
  '6500',
];

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

/** Example benchmark row (same order as MARKET_UPLOAD_TEMPLATE_HEADERS). Replace specialty and percentiles with your survey slice. */
export const MARKET_UPLOAD_TEMPLATE_SAMPLE_ROW: readonly string[] = [
  'Cardiology',
  '380000',
  '450000',
  '520000',
  '600000',
  '5500',
  '6500',
  '7500',
  '9000',
  '58',
  '62',
  '65',
  '70',
  '145',
  '28',
];

/** Header row for evaluation uploads — keep in sync with `public/sample-evaluations.csv`. */
export const EVALUATION_UPLOAD_TEMPLATE_HEADERS = [
  'Employee_ID',
  'Evaluation_Score',
  'Performance_Category',
  'Default_Increase_Percent',
] as const;

/** Example evaluation row (same order as EVALUATION_UPLOAD_TEMPLATE_HEADERS). */
export const EVALUATION_UPLOAD_TEMPLATE_SAMPLE_ROW: readonly string[] = [
  'SAMPLE001',
  '4.2',
  'Meets',
  '3',
];

/** Custom stream: provider-linked columns + example row. */
export const CUSTOM_PROVIDER_TEMPLATE_SAMPLE_ROW: readonly string[] = [
  'SAMPLE001',
  '0.92',
  'Example — add your metric columns when you create the stream',
];

/** Custom stream: standalone columns + example row. */
export const CUSTOM_STANDALONE_TEMPLATE_SAMPLE_ROW: readonly string[] = [
  'RECORD-001',
  '100',
  'Example — replace Record_Key with your file key column',
];

export type UploadTemplateKind =
  | 'provider'
  | 'market'
  | 'evaluation'
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

function templateSampleRow(kind: UploadTemplateKind): string[] {
  switch (kind) {
    case 'provider':
      return [...PROVIDER_UPLOAD_TEMPLATE_SAMPLE_ROW];
    case 'market':
      return [...MARKET_UPLOAD_TEMPLATE_SAMPLE_ROW];
    case 'evaluation':
      return [...EVALUATION_UPLOAD_TEMPLATE_SAMPLE_ROW];
    case 'customProvider':
      return [...CUSTOM_PROVIDER_TEMPLATE_SAMPLE_ROW];
    case 'customStandalone':
      return [...CUSTOM_STANDALONE_TEMPLATE_SAMPLE_ROW];
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

function buildCsv(headers: string[], sampleRow: string[]): string {
  if (sampleRow.length !== headers.length) {
    throw new Error(
      `Template sample row length (${sampleRow.length}) must match headers (${headers.length}).`
    );
  }
  const lines = [
    headers.map(escapeCsvCell).join(','),
    sampleRow.map(escapeCsvCell).join(','),
  ];
  return lines.join('\n');
}

function buildXlsxBuffer(headers: string[], sampleRow: string[]): ArrayBuffer {
  if (sampleRow.length !== headers.length) {
    throw new Error(
      `Template sample row length (${sampleRow.length}) must match headers (${headers.length}).`
    );
  }
  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
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

/** Download a template file (header row + one example data row) for the given upload kind. */
export function downloadUploadTemplate(kind: UploadTemplateKind, format: 'csv' | 'xlsx'): void {
  const headers = templateHeaders(kind);
  const sampleRow = templateSampleRow(kind);
  const base = filenameBase(kind);
  if (format === 'csv') {
    const csv = buildCsv(headers, sampleRow);
    triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${base}.csv`);
  } else {
    const buf = buildXlsxBuffer(headers, sampleRow);
    triggerDownload(
      new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `${base}.xlsx`
    );
  }
}
