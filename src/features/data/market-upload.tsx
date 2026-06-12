import { useMemo, useState, useCallback } from 'react';
import {
  parseMarketCsv,
  parseMarketXlsx,
  buildDefaultMarketMapping,
  getCsvHeaders,
  getXlsxHeaders,
} from '../../lib/parse-file';
import { persistLearnedMarketMapping } from '../../lib/column-mapping-storage';
import type { MarketColumnMapping, MarketUploadResult } from '../../types';
import type { MarketRow } from '../../types/market';
import { FileDropzone } from '../../components/file-dropzone';
import { Button } from '../../components/ui/button';
import { SearchableSelect } from '../../components/searchable-select';
import { ImportWizardShell } from '../../components/import-wizard-shell';
import { UploadPreviewTable } from '../../components/upload-preview-table';
import { ImportModeCards, type UploadMode } from '../../components/import-mode-cards';
import { UploadValidationSummary } from '../../components/upload-validation-summary';
import { UploadResultStep } from '../../components/upload-result-step';
import { parseErrorRow } from '../../lib/error-report-csv';
import { MAX_UPLOAD_FILE_BYTES, UPLOAD_FORMAT_HINT } from '../../lib/upload-constants';
import { mappingGridClass, type ImportWizardLayout } from '../../lib/import-wizard-layout';

type Step = 1 | 2 | 3 | 4;

interface MarketUploadProps {
  surveyId: string;
  surveyLabel: string;
  onUpload: (result: MarketUploadResult, surveyId: string, mode: UploadMode) => void;
  onDone?: () => void;
  layout?: ImportWizardLayout;
}

function flattenMarketRowForPreview(r: MarketRow): Record<string, string | number | undefined> {
  const out: Record<string, string | number | undefined> = {
    specialty: r.specialty,
    label: r.label,
    incumbents: r.incumbents,
    orgCount: r.orgCount,
  };
  [25, 50, 75, 90].forEach((p) => {
    if (r.tccPercentiles?.[p] != null) out[`TCC_${p}`] = r.tccPercentiles[p];
    if (r.wrvuPercentiles?.[p] != null) out[`WRVU_${p}`] = r.wrvuPercentiles[p];
    if (r.cfPercentiles?.[p] != null) out[`CF_${p}`] = r.cfPercentiles[p];
  });
  return out;
}

export function MarketUpload({ surveyId, surveyLabel, onUpload, onDone, layout = 'page' }: MarketUploadProps) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<MarketColumnMapping>({ specialty: '' });
  const [headers, setHeaders] = useState<string[]>([]);
  const [mode, setMode] = useState<UploadMode>('replace');
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<MarketUploadResult | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [ackErrors, setAckErrors] = useState(false);

  const handleFileSelect = useCallback((f: File | null) => {
    setFile(f ?? null);
    setFileError(null);
    if (!f) {
      setHeaders([]);
      setMapping({ specialty: '' });
      return;
    }
    if (f.size > MAX_UPLOAD_FILE_BYTES) {
      setFileError(`File exceeds 10 MB limit. Size: ${(f.size / 1024 / 1024).toFixed(1)} MB.`);
      setHeaders([]);
      setMapping({ specialty: '' });
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
        setMapping(buildDefaultMarketMapping(h));
      } else if (buf instanceof ArrayBuffer) {
        const h = await getXlsxHeaders(buf);
        setHeaders(h);
        setMapping(buildDefaultMarketMapping(h));
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
    if (!file || !mapping.specialty) return;
    setLoading(true);
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = async () => {
      const buf = reader.result;
      try {
        let result: MarketUploadResult;
        if (typeof buf === 'string') result = parseMarketCsv(buf, mapping);
        else if (buf instanceof ArrayBuffer) result = await parseMarketXlsx(buf, mapping);
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
    onUpload(previewResult, surveyId, mode);
    persistLearnedMarketMapping(previewResult.mapping);
    setSuccessCount(previewResult.rows.length);
    setStep(4);
  }, [previewResult, surveyId, mode, onUpload, ackErrors]);

  const percentileKeys = [25, 50, 75, 90];
  const mappingKeys = [
    'specialty',
    'label',
    'incumbents',
    'orgCount',
    ...percentileKeys.flatMap((p) => [`TCC_${p}`, `WRVU_${p}`, `CF_${p}`]),
  ];
  const mappingLabels: Record<string, string> = {
    specialty: 'Specialty',
    label: 'Label',
    incumbents: 'Incumbents',
    orgCount: 'Number of Orgs',
  };
  const previewRows = previewResult?.rows?.map(flattenMarketRowForPreview) ?? [];
  const previewColumns = previewRows[0] ? Object.keys(previewRows[0]) : [];
  const highlightRowIndices = useMemo(() => {
    const errs = previewResult?.errors ?? [];
    const indices = new Set<number>();
    for (const e of errs) {
      const parsed = parseErrorRow(e);
      if (parsed) indices.add(parsed.rowIndex);
    }
    return indices.size ? indices : undefined;
  }, [previewResult?.errors]);
  const importDisabled =
    !previewResult || previewResult.rows.length === 0 || (previewResult.errors.length > 0 && !ackErrors);

  const stepDescription =
    step === 1
      ? undefined
      : step === 2
        ? 'Column mapping — your choices are saved for future uploads.'
        : step === 3
          ? 'Review parsed rows before importing.'
          : undefined;

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
      <Button type="button" onClick={() => setStep(2)} disabled={!file || loading || !!fileError}>
        Next
      </Button>
    ) : step === 2 ? (
      <Button type="button" onClick={runValidation} disabled={!mapping.specialty || loading}>
        {loading ? 'Validating…' : 'Next'}
      </Button>
    ) : step === 3 ? (
      <Button type="button" onClick={doImport} disabled={importDisabled}>
        Import
      </Button>
    ) : (
      <Button type="button" onClick={onDone}>
        Done
      </Button>
    );

  return (
    <ImportWizardShell step={step} layout={layout} description={stepDescription} footerLeft={footerLeft} footerRight={footerRight}>
      {step === 1 && (
        <div className="space-y-3.5">
          <FileDropzone
            onFileSelect={handleFileSelect}
            selectedFile={file}
                label={`Market survey · ${surveyLabel}`}
            hint={UPLOAD_FORMAT_HINT}
          />
          {fileError && <p className="text-sm text-amber-700">{fileError}</p>}
          {loading && <p className="text-sm text-slate-500">Reading file…</p>}
          <ImportModeCards name="market-mode" value={mode} onChange={setMode} />
        </div>
      )}

      {step === 2 && (
        <div className={mappingGridClass(layout)}>
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
      )}

      {step === 3 && previewResult && (
        <div className="space-y-4">
          <UploadValidationSummary
            validCount={previewResult.rows.length}
            errors={previewResult.errors}
            errorReportName="market-upload-errors"
            ackErrors={ackErrors}
            onAckChange={setAckErrors}
          />
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Preview (first 10 rows)</p>
            <UploadPreviewTable<Record<string, string | number | undefined>>
              rows={previewRows}
              columnOrder={previewColumns}
              maxRows={10}
              emptyMessage="No valid rows to preview."
              highlightRowIndices={highlightRowIndices}
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
