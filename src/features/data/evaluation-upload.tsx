import { useState, useCallback } from 'react';
import {
  parseEvaluationCsv,
  parseEvaluationXlsx,
  buildDefaultEvaluationMapping,
  getCsvHeaders,
  getXlsxHeaders,
} from '../../lib/parse-file';
import { persistLearnedEvaluationMapping } from '../../lib/column-mapping-storage';
import type { EvaluationColumnMapping, EvaluationUploadResult } from '../../types';
import { FileDropzone } from '../../components/file-dropzone';
import { SearchableSelect } from '../../components/searchable-select';

type UploadMode = 'replace' | 'add';

interface EvaluationUploadProps {
  onUpload: (result: EvaluationUploadResult, mode: UploadMode) => void;
}

export function EvaluationUpload({ onUpload }: EvaluationUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<EvaluationColumnMapping>({ Employee_ID: '' });
  const [headers, setHeaders] = useState<string[]>([]);
  const [mode, setMode] = useState<UploadMode>('replace');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<EvaluationUploadResult | null>(null);

  const handleFileSelect = useCallback((f: File | null) => {
    setFile(f ?? null);
    setError(null);
    setLastResult(null);
    if (!f) {
      setHeaders([]);
      setMapping({ Employee_ID: '' });
      return;
    }
    const isCsv = f.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      if (typeof buf === 'string') {
        const h = getCsvHeaders(buf);
        setHeaders(h);
        setMapping(buildDefaultEvaluationMapping(h));
      } else if (buf instanceof ArrayBuffer) {
        const h = getXlsxHeaders(buf);
        setHeaders(h);
        setMapping(buildDefaultEvaluationMapping(h));
      }
    };
    if (isCsv) reader.readAsText(f);
    else reader.readAsArrayBuffer(f);
  }, []);

  const applyUpload = useCallback(() => {
    if (!file || !mapping.Employee_ID) return;
    setError(null);
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      try {
        let result: EvaluationUploadResult;
        if (typeof buf === 'string') result = parseEvaluationCsv(buf, mapping);
        else if (buf instanceof ArrayBuffer) result = parseEvaluationXlsx(buf, mapping);
        else return;
        setLastResult(result);
        if (result.rows.length > 0) {
          onUpload(result, mode);
          persistLearnedEvaluationMapping(result.mapping);
        }
        if (result.errors.length > 0) setError(result.errors.slice(0, 5).join('; '));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Parse failed');
      }
    };
    if (isCsv) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  }, [file, mapping, mode, onUpload]);

  const mappingKeys = ['Employee_ID', 'Evaluation_Score', 'Performance_Category', 'Default_Increase_Percent'] as const;

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07),0_2px_4px_-2px_rgba(79,70,229,0.07)]">
      <h2 className="text-lg font-semibold text-slate-800 mb-2">Upload provider evaluations</h2>
      <p className="text-sm text-slate-600 mb-4">
        One row per provider; matched to provider data by <strong>Employee ID</strong>. Use the same ID values as in your
        Provider file. Evaluation score and performance category (e.g. Exceeds, Meets, Needs Improvement) are used with
        the merit matrix to set default increase %.
      </p>
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div className="min-w-[200px]">
          <FileDropzone
            onFileSelect={handleFileSelect}
            selectedFile={file}
            label="File (CSV or XLSX)"
            hint="Drag and drop or click to browse"
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="radio" name="eval-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} className="text-indigo-600 focus:ring-indigo-500" />
            Replace all
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="radio" name="eval-mode" checked={mode === 'add'} onChange={() => setMode('add')} className="text-indigo-600 focus:ring-indigo-500" />
            Add
          </label>
        </div>
        <button
          type="button"
          onClick={applyUpload}
          disabled={!file || !mapping.Employee_ID}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm"
        >
          Import evaluations
        </button>
      </div>
      {headers.length > 0 && (
        <div className="border-t border-slate-100 pt-4 mt-4">
          <p className="text-sm text-slate-600 mb-2">Column mapping — your choices are saved for future uploads</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {mappingKeys.map((key) => (
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
        </div>
      )}
      {error && <p className="text-sm text-amber-700 mt-3">{error}</p>}
      {lastResult && lastResult.rows.length > 0 && (
        <p className="text-sm text-emerald-700 mt-3">Imported {lastResult.rows.length} evaluation row(s). Matched to providers by Employee ID.</p>
      )}
    </div>
  );
}
