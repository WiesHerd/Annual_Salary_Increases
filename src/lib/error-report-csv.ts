/**
 * Build a downloadable CSV error report from parse errors (row-level messages).
 * Enterprise pattern: let users fix rows and re-upload.
 */

/** Parse "Row N: message" into { rowIndex, message }. One-based row index. */
export function parseErrorRow(error: string): { rowIndex: number; message: string } | null {
  const match = error.match(/^Row\s+(\d+):\s*(.+)$/i);
  if (!match) return null;
  const rowIndex = parseInt(match[1], 10);
  return Number.isFinite(rowIndex) ? { rowIndex, message: match[2].trim() } : null;
}

/**
 * Build CSV string for error report: columns Row, Error, and optionally extra columns from row snapshots.
 * errors: from parse result (e.g. "Row 3: missing Employee_ID").
 * rowSnapshots: optional array of key-value rows for error rows (e.g. { Employee_ID: '', Provider_Name: 'X' }).
 */
export function buildErrorReportCsv(
  errors: string[],
  rowSnapshots?: Record<string, string | number | undefined>[]
): string {
  const rows: { rowIndex: number; message: string; snapshot?: Record<string, string | number | undefined> }[] = [];
  for (let i = 0; i < errors.length; i++) {
    const parsed = parseErrorRow(errors[i]);
    if (parsed) {
      const snapshot = rowSnapshots && rowSnapshots[parsed.rowIndex - 1];
      rows.push({ ...parsed, snapshot });
    } else {
      rows.push({ rowIndex: i + 1, message: errors[i], snapshot: rowSnapshots?.[i] });
    }
  }
  const allKeys = new Set<string>(['Row', 'Error']);
  rows.forEach((r) => r.snapshot && Object.keys(r.snapshot).forEach((k) => allKeys.add(k)));
  const extraCols = [...allKeys].filter((k) => k !== 'Row' && k !== 'Error').sort();
  const headers = ['Row', 'Error', ...extraCols];
  const escape = (v: string | number | undefined): string => {
    const s = v === undefined || v === null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    const cells = [r.rowIndex, escape(r.message)];
    for (const col of extraCols) {
      cells.push(escape(r.snapshot?.[col]));
    }
    lines.push(cells.join(','));
  }
  return lines.join('\n');
}

/** Trigger download of error report CSV. */
export function downloadErrorReport(errors: string[], filenameBase = 'upload-errors'): void {
  const csv = buildErrorReportCsv(errors);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameBase}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
