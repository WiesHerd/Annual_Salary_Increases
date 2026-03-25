import { useState, useCallback } from 'react';
import {
  parsePaymentCsv,
  parsePaymentXlsx,
  buildDefaultPaymentMapping,
  getCsvHeaders,
  getXlsxHeaders,
} from '../../lib/parse-file';
import { persistLearnedPaymentsMapping } from '../../lib/column-mapping-storage';
import type { PaymentColumnMapping, PaymentUploadResult, ParsedPaymentRow } from '../../types';
import { FileDropzone } from '../../components/file-dropzone';
import { SearchableSelect } from '../../components/searchable-select';
import { ImportStepper } from '../../components/import-stepper';
import { UploadPreviewTable } from '../../components/upload-preview-table';
import { downloadErrorReport } from '../../lib/error-report-csv';
import { MAX_UPLOAD_FILE_BYTES, UPLOAD_FORMAT_HINT } from '../../lib/upload-constants';

type UploadMode = 'replace' | 'add';
type Step = 1 | 2 | 3 | 4;

interface PaymentsUploadProps {
  onUpload: (result: PaymentUploadResult, mode: UploadMode) => void;
  onDone?: () => void;
}

const PAYMENT_PREVIEW_KEYS: (keyof ParsedPaymentRow)[] = ['providerKey', 'amount', 'date', 'category', 'cycleId'];

export function PaymentsUpload({ onUpload, onDone }: PaymentsUploadProps) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<PaymentColumnMapping>({ amount: '', date: '' });
  const [headers, setHeaders] = useState<string[]>([]);
  const [mode, setMode] = useState<UploadMode>('replace');
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<PaymentUploadResult | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [ackErrors, setAckErrors] = useState(false);

  const handleFileSelect = useCallback((f: File | null) => {
    setFile(f ?? null);
    setFileError(null);
    if (!f) {
      setHeaders([]);
      setMapping({ amount: '', date: '' });
      return;
    }
    if (f.size > MAX_UPLOAD_FILE_BYTES) {
      setFileError(`File exceeds 10 MB limit. Size: ${(f.size / 1024 / 1024).toFixed(1)} MB.`);
      setHeaders([]);
      setMapping({ amount: '', date: '' });
      return;
    }
    setLoading(true);
    const isCsv = f.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      if (typeof buf === 'string') {
        const h = getCsvHeaders(buf);
        setHeaders(h);
        setMapping(buildDefaultPaymentMapping(h));
      } else if (buf instanceof ArrayBuffer) {
        const h = getXlsxHeaders(buf);
        setHeaders(h);
        setMapping(buildDefaultPaymentMapping(h));
      }
      setLoading(false);
    };
    reader.onerror = () => {
      setFileError('Failed to read file.');
      setLoading(false);
    };
    if (isCsv) reader.readAsText(f);
    else reader.readAsArrayBuffer(f);
  }, []);

  const runValidation = useCallback(() => {
    if (!file || !mapping.amount || !mapping.date) return;
    setLoading(true);
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      try {
        let result: PaymentUploadResult;
        if (typeof buf === 'string') result = parsePaymentCsv(buf, mapping);
        else if (buf instanceof ArrayBuffer) result = parsePaymentXlsx(buf, mapping);
        else {
          setLoading(false);
          return;
        }
        setPreviewResult(result);
        setAckErrors(false);
        setStep(3);
      } catch {
        setPreviewResult({
          rows: [],
          errors: ['Parse failed. Check file format and encoding.'],
          mapping,
        });
        setAckErrors(false);
        setStep(3);
      }
      setLoading(false);
    };
    if (isCsv) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  }, [file, mapping]);

  const doImport = useCallback(() => {
    if (!previewResult || previewResult.rows.length === 0) return;
    if (previewResult.errors.length > 0 && !ackErrors) return;
    onUpload(previewResult, mode);
    persistLearnedPaymentsMapping(previewResult.mapping);
    setSuccessCount(previewResult.rows.length);
    setStep(4);
  }, [previewResult, mode, onUpload, ackErrors]);

  const mappingKeys = ['providerKey', 'externalId', 'amount', 'date', 'category', 'cycleId'] as const;
  const mappingLabels: Record<string, string> = {
    providerKey: 'Provider key',
    externalId: 'External ID',
    amount: 'Amount',
    date: 'Date',
    category: 'Category',
    cycleId: 'Cycle ID',
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07),0_2px_4px_-2px_rgba(79,70,229,0.07)]">
      <ImportStepper step={step} className="mb-6" />
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        {step === 1 && 'Select file'}
        {step === 2 && 'Map columns'}
        {step === 3 && 'Preview & validate'}
        {step === 4 && 'Result'}
      </h2>

      {step === 1 && (
        <>
          <p className="text-sm text-slate-600 mb-4">
            Map the provider key column to match <strong>Employee_ID</strong> from your Provider file. Amount and date
            required; optional category and cycle.
          </p>
          <div className="flex flex-wrap gap-4 items-end mb-4">
            <div className="min-w-[200px] flex-1">
              <FileDropzone
                onFileSelect={handleFileSelect}
                selectedFile={file}
                label="Payments file"
                hint={UPLOAD_FORMAT_HINT}
              />
              {fileError && <p className="text-sm text-amber-700 mt-1">{fileError}</p>}
              {loading && <p className="text-sm text-slate-500 mt-1">Reading file…</p>}
            </div>
          </div>
          <div className="flex items-center gap-4 mb-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="payments-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} className="text-indigo-600 focus:ring-indigo-500" />
              Replace all
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="payments-mode" checked={mode === 'add'} onChange={() => setMode('add')} className="text-indigo-600 focus:ring-indigo-500" />
              Add
            </label>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => setStep(2)} disabled={!file || loading || !!fileError} className="app-btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-sm text-slate-600 mb-2">
            Column mapping — map Provider key to the column holding Employee_ID. Your choices are saved for future
            uploads.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {mappingKeys.map((key) => (
              <div key={key}>
                <SearchableSelect
                  label={mappingLabels[key] ?? key}
                  value={mapping[key] ?? ''}
                  options={headers}
                  onChange={(v) => setMapping((m) => ({ ...m, [key]: v || undefined }))}
                  emptyOptionLabel="—"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="app-btn-secondary">Back</button>
            <button type="button" onClick={runValidation} disabled={!mapping.amount || !mapping.date || loading} className="app-btn-primary disabled:opacity-50">
              {loading ? 'Validating…' : 'Next'}
            </button>
          </div>
        </>
      )}

      {step === 3 && previewResult && (
        <>
          <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm font-medium text-slate-800">
              {previewResult.rows.length} valid row{previewResult.rows.length !== 1 ? 's' : ''}
              {previewResult.errors.length > 0 && (
                <span className="text-amber-700 ml-2">· {previewResult.errors.length} error{previewResult.errors.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          {previewResult.errors.length > 0 && (
            <div className="mb-4">
              <button type="button" onClick={() => downloadErrorReport(previewResult.errors, 'payments-upload-errors')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                Download error report
              </button>
            </div>
          )}
          {previewResult.errors.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <label className="flex items-start gap-2 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={ackErrors}
                  onChange={(e) => setAckErrors(e.target.checked)}
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
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Preview (first 10 rows)</p>
            <UploadPreviewTable<ParsedPaymentRow>
              rows={previewResult.rows}
              columnOrder={PAYMENT_PREVIEW_KEYS}
              maxRows={10}
              emptyMessage="No valid rows to preview."
            />
          </div>
          {previewResult.rows.length === 0 && (
            <p className="text-sm text-amber-700 mb-4">No valid rows. Fix errors and try again, or go back to adjust mapping.</p>
          )}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="app-btn-secondary">Back</button>
            <button type="button" onClick={doImport} disabled={previewResult.rows.length === 0 || (previewResult.errors.length > 0 && !ackErrors)} className="app-btn-primary disabled:opacity-50">
              Import payments
            </button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 mb-4">
            <p className="text-sm font-semibold text-emerald-800">Imported {successCount ?? 0} payment row{(successCount ?? 0) !== 1 ? 's' : ''}.</p>
            <p className="text-sm text-emerald-700 mt-1">TCC will be computed from rolled-up amounts by provider.</p>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={onDone} className="app-btn-primary">Done</button>
          </div>
        </>
      )}
    </div>
  );
}
