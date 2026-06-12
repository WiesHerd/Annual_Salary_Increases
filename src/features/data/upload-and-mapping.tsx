import { useState, useCallback } from 'react';
import {
  parseCsv,
  parseXlsx,
  buildDefaultProviderMapping,
  getCsvHeaders,
  getXlsxHeaders,
} from '../../lib/parse-file';
import { persistLearnedProviderMapping } from '../../lib/column-mapping-storage';
import type { ProviderColumnMapping, ProviderUploadResult } from '../../types';
import type { ProviderRecord } from '../../types/provider';
import { Button } from '../../components/ui/button';
import { FileDropzone } from '../../components/file-dropzone';
import { SearchableSelect } from '../../components/searchable-select';
import { ImportWizardShell } from '../../components/import-wizard-shell';
import { UploadPreviewTable } from '../../components/upload-preview-table';
import { ImportModeCards, type UploadMode } from '../../components/import-mode-cards';
import { UploadValidationSummary } from '../../components/upload-validation-summary';
import { UploadResultStep } from '../../components/upload-result-step';
import { CycleSelect } from '../../components/cycle-select';
import { MAX_UPLOAD_FILE_BYTES, UPLOAD_FORMAT_HINT } from '../../lib/upload-constants';
import { mappingGridClass, type ImportWizardLayout } from '../../lib/import-wizard-layout';

type Step = 1 | 2 | 3 | 4;

interface UploadAndMappingProps {
  onUpload: (result: ProviderUploadResult, cycleId: string, mode: UploadMode) => void;
  cycleId: string;
  setCycleId: (v: string) => void;
  onDone?: () => void;
  layout?: ImportWizardLayout;
}

const STEP_DESCRIPTIONS: Record<Step, string | undefined> = {
  1: undefined,
  2: 'Match your file columns to provider fields.',
  3: 'Confirm rows before importing.',
  4: undefined,
};

export function UploadAndMapping({ onUpload, cycleId, setCycleId, onDone, layout = 'page' }: UploadAndMappingProps) {
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
    reader.onload = async () => {
      const buf = reader.result;
      if (typeof buf === 'string') {
        const h = getCsvHeaders(buf);
        setHeaders(h);
        setMapping(buildDefaultProviderMapping(h));
      } else if (buf instanceof ArrayBuffer) {
        const h = await getXlsxHeaders(buf);
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
    reader.onload = async () => {
      const buf = reader.result;
      try {
        let result: ProviderUploadResult;
        if (typeof buf === 'string') result = parseCsv(buf, mapping);
        else if (buf instanceof ArrayBuffer) result = await parseXlsx(buf, mapping);
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

  const footerLeft =
    step === 2 ? (
      <Button type="button" variant="outline" onClick={() => setStep(1)}>
        Back
      </Button>
    ) : step === 3 ? (
      <Button type="button" variant="outline" onClick={() => setStep(2)}>
        Back
      </Button>
    ) : undefined;

  const footerRight =
    step === 1 ? (
      <Button type="button" onClick={goToStep2} disabled={!file || loading || !!fileError}>
        Next
      </Button>
    ) : step === 2 ? (
      <Button type="button" onClick={runValidation} disabled={loading}>
        {loading ? 'Validating…' : 'Next'}
      </Button>
    ) : step === 3 ? (
      <Button
        type="button"
        onClick={doImport}
        disabled={
          !previewResult ||
          previewResult.rows.length === 0 ||
          (previewResult.errors.length > 0 && !ackErrors)
        }
      >
        Import
      </Button>
    ) : (
      <Button type="button" onClick={onDone}>
        Done
      </Button>
    );

  return (
    <ImportWizardShell
      step={step}
      layout={layout}
      description={STEP_DESCRIPTIONS[step]}
      headerTrailing={
        step === 1 ? <CycleSelect layout="inline" value={cycleId} onChange={setCycleId} /> : undefined
      }
      footerLeft={footerLeft}
      footerRight={footerRight}
    >
      {step === 1 && (
        <div className="space-y-3.5">
          <FileDropzone
            onFileSelect={handleFileSelect}
            selectedFile={file}
            label="Provider data file"
            hint={UPLOAD_FORMAT_HINT}
          />
          {fileError && <p className="text-sm text-amber-700">{fileError}</p>}
          {loading && <p className="text-sm text-slate-500">Reading file…</p>}
          <ImportModeCards name="provider-mode" value={mode} onChange={setMode} />
        </div>
      )}

      {step === 2 && (
        <div className={mappingGridClass(layout)}>
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
      )}

      {step === 3 && previewResult && (
        <div className="space-y-4">
          <UploadValidationSummary
            validCount={previewResult.rows.length}
            errors={previewResult.errors}
            errorReportName="provider-upload-errors"
            ackErrors={ackErrors}
            onAckChange={setAckErrors}
          />
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Preview (first 10 rows)</p>
            <UploadPreviewTable<ProviderRecord>
              rows={previewResult.rows}
              columnOrder={previewColumns}
              maxRows={10}
              emptyMessage="No valid rows to preview."
            />
          </div>
          {previewResult.rows.length === 0 && (
            <p className="text-sm text-amber-700">No valid rows. Fix errors and try again, or go back to adjust mapping.</p>
          )}
        </div>
      )}

      {step === 4 && <UploadResultStep count={successCount ?? 0} />}
    </ImportWizardShell>
  );
}
