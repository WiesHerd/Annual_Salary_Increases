import { useState, useCallback } from 'react';
import {
  parseCsv,
  parseXlsx,
  buildDefaultProviderMapping,
  getCsvHeaders,
  getXlsxHeaders,
  DEFAULT_CYCLE_ID,
} from '../../lib/parse-file';
import { persistLearnedProviderMapping } from '../../lib/column-mapping-storage';
import type { ProviderColumnMapping, ProviderUploadResult } from '../../types';
import type { ProviderRecord } from '../../types/provider';
import { FileDropzone } from '../../components/file-dropzone';
import { SearchableSelect } from '../../components/searchable-select';
import { ImportStepper } from '../../components/import-stepper';
import { UploadPreviewTable } from '../../components/upload-preview-table';
import { downloadErrorReport } from '../../lib/error-report-csv';
import { MAX_UPLOAD_FILE_BYTES, UPLOAD_FORMAT_HINT } from '../../lib/upload-constants';

type UploadMode = 'replace' | 'add';
type Step = 1 | 2 | 3 | 4;

interface UploadAndMappingProps {
  onUpload: (result: ProviderUploadResult, cycleId: string, mode: UploadMode) => void;
  cycleId: string;
  setCycleId: (v: string) => void;
  onDone?: () => void;
}

export function UploadAndMapping({ onUpload, cycleId, setCycleId, onDone }: UploadAndMappingProps) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<ProviderColumnMapping>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [mode, setMode] = useState<UploadMode>('replace');
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<ProviderUploadResult | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [ackErrors, setAckErrors] = useState(false);

  const handleFileSelect = useCallback((f: File | null) => {
    setFile(f ?? null);
    setFileError(null);
    if (!f) {
      setHeaders([]);
      setMapping({});
      return;
    }
    if (f.size > MAX_UPLOAD_FILE_BYTES) {
      setFileError(`File exceeds 10 MB limit. Size: ${(f.size / 1024 / 1024).toFixed(1)} MB.`);
      setHeaders([]);
      setMapping({});
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
        setMapping(buildDefaultProviderMapping(h));
      } else if (buf instanceof ArrayBuffer) {
        const h = getXlsxHeaders(buf);
        setHeaders(h);
        setMapping(buildDefaultProviderMapping(h));
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

  const goToStep2 = useCallback(() => {
    setPreviewResult(null);
    setStep(2);
  }, []);

  const runValidation = useCallback(() => {
    if (!file) return;
    setLoading(true);
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      try {
        let result: ProviderUploadResult;
        if (typeof buf === 'string') result = parseCsv(buf, mapping);
        else if (buf instanceof ArrayBuffer) result = parseXlsx(buf, mapping);
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
    onUpload(previewResult, cycleId, mode);
    persistLearnedProviderMapping(previewResult.mapping);
    setSuccessCount(previewResult.rows.length);
    setStep(4);
  }, [previewResult, cycleId, mode, onUpload, ackErrors]);

  const mappingKeys = [
    'Employee_ID',
    'Provider_Name',
    'Primary_Division',
    'Department',
    'Provider_Type',
    'Specialty',
    'Benchmark_Group',
    'Subspecialty',
    'Hire_Date',
    'Years_of_Experience',
    'Clinical_FTE',
    'Current_FTE',
    'Current_Base_Salary',
    'Evaluation_Score',
    'Compensation_Plan',
    'Current_CF',
    'Prior_Year_WRVUs',
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
    'Proposed_CF',
    'Current_Target_WRVUs',
    'Population',
    'Cycle',
    'Administrative_FTE',
    'Research_FTE',
    'Teaching_FTE',
    'Performance_Category',
    'Review_Status',
  ] as const;

  const previewColumns = previewResult?.rows[0]
    ? (Object.keys(previewResult.rows[0]) as (keyof ProviderRecord)[])
    : [];

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07),0_2px_4px_-2px_rgba(79,70,229,0.07)]">
      <ImportStepper step={step} className="mb-6" />
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        {step === 1 && 'Select file'}
        {step === 2 && 'Map columns'}
        {step === 3 && 'Preview & validate'}
        {step === 4 && 'Result'}
      </h2>

      {/* Step 1: Select file */}
      {step === 1 && (
        <>
          <div className="flex flex-wrap gap-4 items-end mb-4">
            <div className="min-w-[200px] flex-1">
              <FileDropzone
                onFileSelect={handleFileSelect}
                selectedFile={file}
                label="Provider data file"
                hint={UPLOAD_FORMAT_HINT}
              />
              {fileError && <p className="text-sm text-amber-700 mt-1">{fileError}</p>}
              {loading && <p className="text-sm text-slate-500 mt-1">Reading file…</p>}
            </div>
            <div>
              <label htmlFor="upload-provider-cycle-id" className="block text-sm font-medium text-slate-700 mb-1">
                Cycle
              </label>
              <input
                id="upload-provider-cycle-id"
                type="text"
                value={cycleId}
                onChange={(e) => setCycleId(e.target.value)}
                placeholder={DEFAULT_CYCLE_ID}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 mb-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="provider-mode"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              Replace all
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="provider-mode" checked={mode === 'add'} onChange={() => setMode('add')} className="text-indigo-600 focus:ring-indigo-500" />
              Add to existing
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={goToStep2}
              disabled={!file || loading || !!fileError}
              className="app-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Step 2: Map columns */}
      {step === 2 && (
        <>
          <p className="text-sm text-slate-600 mb-2">Map your file columns to provider fields. Your choices are saved for future uploads.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {mappingKeys.map((key) => (
              <div key={key}>
                <SearchableSelect
                  label={key === 'Population' ? 'Provider Type' : key}
                  value={mapping[key] ?? ''}
                  options={headers}
                  onChange={(v) => setMapping((m) => ({ ...m, [key]: v || undefined }))}
                  emptyOptionLabel="—"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="app-btn-secondary">
              Back
            </button>
            <button
              type="button"
              onClick={runValidation}
              disabled={loading}
              className="app-btn-primary disabled:opacity-50"
            >
              {loading ? 'Validating…' : 'Next'}
            </button>
          </div>
        </>
      )}

      {/* Step 3: Preview & validate */}
      {step === 3 && previewResult && (
        <>
          <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm font-medium text-slate-800">
              {previewResult.rows.length} valid row{previewResult.rows.length !== 1 ? 's' : ''}
              {previewResult.errors.length > 0 && (
                <span className="text-amber-700 ml-2">
                  · {previewResult.errors.length} error{previewResult.errors.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          {previewResult.errors.length > 0 && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => downloadErrorReport(previewResult.errors, 'provider-upload-errors')}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
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
            <UploadPreviewTable<ProviderRecord>
              rows={previewResult.rows}
              columnOrder={previewColumns}
              maxRows={10}
              emptyMessage="No valid rows to preview."
            />
          </div>
          {previewResult.rows.length === 0 && (
            <p className="text-sm text-amber-700 mb-4">No valid rows. Fix errors and try again, or go back to adjust mapping.</p>
          )}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="app-btn-secondary">
              Back
            </button>
            <button
              type="button"
              onClick={doImport}
              disabled={previewResult.rows.length === 0 || (previewResult.errors.length > 0 && !ackErrors)}
              className="app-btn-primary disabled:opacity-50"
            >
              Import
            </button>
          </div>
        </>
      )}

      {/* Step 4: Result */}
      {step === 4 && (
        <>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 mb-4">
            <p className="text-sm font-semibold text-emerald-800">
              Imported {successCount ?? 0} row{(successCount ?? 0) !== 1 ? 's' : ''}.
            </p>
            <p className="text-sm text-emerald-700 mt-1">You can view and edit data in the Data browser.</p>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={onDone} className="app-btn-primary">
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}
