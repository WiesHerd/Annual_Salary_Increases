/**
 * Upload file and map columns for a single custom data stream.
 * 4-step wizard: File → Map → Preview & validate → Result.
 */

import { useState, useCallback } from 'react';
import { getCsvHeaders, getXlsxHeaders } from '../../lib/parse-file';
import {
  buildDefaultCustomStreamMapping,
  parseCustomStreamCsv,
  parseCustomStreamXlsx,
} from '../../lib/parse-custom-stream';
import { persistLearnedCustomStreamMapping } from '../../lib/column-mapping-storage';
import type { CustomStreamDefinition, CustomStreamColumnMapping, CustomStreamUploadResult, CustomStreamRow } from '../../types/custom-stream';
import { FileDropzone } from '../../components/file-dropzone';
import { Button } from '../../components/ui/button';
import { SearchableSelect } from '../../components/searchable-select';
import { ImportWizardShell } from '../../components/import-wizard-shell';
import { UploadPreviewTable } from '../../components/upload-preview-table';
import { ImportModeCards, type UploadMode } from '../../components/import-mode-cards';
import { UploadValidationSummary } from '../../components/upload-validation-summary';
import { UploadResultStep } from '../../components/upload-result-step';
import { MAX_UPLOAD_FILE_BYTES, UPLOAD_FORMAT_HINT } from '../../lib/upload-constants';
import { mappingGridClass, type ImportWizardLayout } from '../../lib/import-wizard-layout';

type Step = 1 | 2 | 3 | 4;

interface CustomStreamUploadProps {
  streamId: string;
  definition: CustomStreamDefinition;
  onUpload: (result: CustomStreamUploadResult, mode: UploadMode) => void;
  onClose: () => void;
  layout?: ImportWizardLayout;
}

export function CustomStreamUpload({ streamId, definition, onUpload, onClose, layout = 'modal' }: CustomStreamUploadProps) {
  const linkKeyLogicalName = definition.linkType === 'provider' ? 'Employee_ID' : (definition.keyColumn ?? 'Key');
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<CustomStreamColumnMapping>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [mode, setMode] = useState<UploadMode>('replace');
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<CustomStreamUploadResult | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [ackErrors, setAckErrors] = useState(false);

  const handleFileSelect = useCallback(
    (f: File | null) => {
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
          setMapping(buildDefaultCustomStreamMapping(h, definition.linkType, definition.keyColumn, streamId));
        } else if (buf instanceof ArrayBuffer) {
          const h = await getXlsxHeaders(buf);
          setHeaders(h);
          setMapping(buildDefaultCustomStreamMapping(h, definition.linkType, definition.keyColumn, streamId));
        }
        setLoading(false);
      };
      reader.onerror = () => {
        setFileError('Failed to read file.');
        setLoading(false);
      };
      if (isCsv) reader.readAsText(f);
      else reader.readAsArrayBuffer(f);
    },
    [definition.linkType, definition.keyColumn, streamId]
  );

  const runValidation = useCallback(() => {
    if (!file || !mapping[linkKeyLogicalName]) return;
    setLoading(true);
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = async () => {
      const buf = reader.result;
      try {
        let result: CustomStreamUploadResult;
        if (typeof buf === 'string') {
          result = parseCustomStreamCsv(buf, mapping, linkKeyLogicalName);
        } else if (buf instanceof ArrayBuffer) {
          result = await parseCustomStreamXlsx(buf, mapping, linkKeyLogicalName);
        } else {
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
          columnOrder: [],
        });
        setAckErrors(false);
        setStep(3);
      }
      setLoading(false);
    };
    if (isCsv) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  }, [file, mapping, linkKeyLogicalName]);

  const doImport = useCallback(() => {
    if (!previewResult || previewResult.rows.length === 0) return;
    if (previewResult.errors.length > 0 && !ackErrors) return;
    onUpload(previewResult, mode);
    persistLearnedCustomStreamMapping(streamId, previewResult.mapping);
    setSuccessCount(previewResult.rows.length);
    setStep(4);
  }, [previewResult, mode, streamId, onUpload, ackErrors]);

  const mappingKeys = Object.keys(mapping).filter((k) => mapping[k]);
  const linkKeyFirst = [linkKeyLogicalName, ...mappingKeys.filter((k) => k !== linkKeyLogicalName)];

  const previewColumns = previewResult?.columnOrder?.length
    ? previewResult.columnOrder
    : previewResult?.rows?.[0]
      ? Object.keys(previewResult.rows[0])
      : [];

  const stepDescription =
    step === 1
      ? undefined
      : step === 2
        ? 'Column mapping — map at least the link key. Choices are saved for future uploads.'
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
      <Button type="button" onClick={runValidation} disabled={!mapping[linkKeyLogicalName] || loading}>
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
      <Button type="button" onClick={onClose}>
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
            label={`${definition.label} file`}
            hint={UPLOAD_FORMAT_HINT}
          />
          {fileError && <p className="text-sm text-amber-700">{fileError}</p>}
          {loading && <p className="text-sm text-slate-500">Reading file…</p>}
          <ImportModeCards name="custom-mode" value={mode} onChange={setMode} />
        </div>
      )}

      {step === 2 && (
        <div className={mappingGridClass(layout)}>
          {linkKeyFirst.map((key) => (
            <div key={key}>
              <SearchableSelect
                label={key}
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
            errorReportName={`custom-${streamId}-errors`}
            ackErrors={ackErrors}
            onAckChange={setAckErrors}
          />
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Preview (first 10 rows)</p>
            <UploadPreviewTable<CustomStreamRow>
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
