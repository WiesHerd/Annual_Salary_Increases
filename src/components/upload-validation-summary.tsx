/**
 * Shared step-3 header for upload wizards: valid/error counts, error-report
 * download, and the "I understand there are errors" acknowledgement.
 * Keeps the preview/validate step identical across every importer.
 */

import { downloadErrorReport } from '../lib/error-report-csv';

interface UploadValidationSummaryProps {
  validCount: number;
  errors: string[];
  /** File stem for the downloaded error report, e.g. "provider-upload-errors". */
  errorReportName: string;
  ackErrors: boolean;
  onAckChange: (next: boolean) => void;
}

export function UploadValidationSummary({
  validCount,
  errors,
  errorReportName,
  ackErrors,
  onAckChange,
}: UploadValidationSummaryProps) {
  const errorCount = errors.length;
  const hasErrors = errorCount > 0;

  return (
    <>
      <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <p className="text-sm font-medium text-slate-800">
          {validCount} valid row{validCount !== 1 ? 's' : ''}
          {hasErrors && (
            <span className="text-amber-700 ml-2">
              · {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      {hasErrors && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => downloadErrorReport(errors, errorReportName)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Download error report
          </button>
        </div>
      )}

      {hasErrors && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <label className="flex items-start gap-2 text-sm text-amber-900">
            <input
              type="checkbox"
              checked={ackErrors}
              onChange={(e) => onAckChange(e.target.checked)}
              className="mt-1 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              I understand there are validation errors. I reviewed the error report and still want to import the rows that parsed successfully.
            </span>
          </label>
          <p className="mt-2 text-xs text-amber-800">
            Note: the preview shows parsed rows; error row numbers refer to the original file.
          </p>
        </div>
      )}
    </>
  );
}
