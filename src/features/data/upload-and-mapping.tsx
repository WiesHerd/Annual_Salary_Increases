import { useState, useCallback } from 'react';
import {
  parseCsv,
  parseXlsx,
  buildDefaultProviderMapping,
  getCsvHeaders,
  getXlsxHeaders,
  DEFAULT_CYCLE_ID,
} from '../../lib/parse-file';
import type { ProviderColumnMapping, ProviderUploadResult } from '../../types';
import { FileDropzone } from '../../components/file-dropzone';
import { SearchableSelect } from '../../components/searchable-select';

type UploadMode = 'replace' | 'add';

interface UploadAndMappingProps {
  onUpload: (result: ProviderUploadResult, cycleId: string, mode: UploadMode) => void;
  cycleId: string;
  setCycleId: (v: string) => void;
}

export function UploadAndMapping({ onUpload, cycleId, setCycleId }: UploadAndMappingProps) {
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<ProviderColumnMapping>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [mode, setMode] = useState<UploadMode>('replace');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ProviderUploadResult | null>(null);

  const handleFileSelect = useCallback((f: File | null) => {
    setFile(f ?? null);
    setError(null);
    setLastResult(null);
    if (!f) {
      setHeaders([]);
      setMapping({});
      return;
    }
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
    };
    if (isCsv) reader.readAsText(f);
    else reader.readAsArrayBuffer(f);
  }, []);

  const applyUpload = useCallback(() => {
    if (!file) return;
    setError(null);
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      try {
        let result: ProviderUploadResult;
        if (typeof buf === 'string') result = parseCsv(buf, mapping);
        else if (buf instanceof ArrayBuffer) result = parseXlsx(buf, mapping);
        else return;
        setLastResult(result);
        if (result.rows.length > 0) {
          onUpload(result, cycleId, mode);
        }
        if (result.errors.length > 0) {
          setError(result.errors.slice(0, 5).join('; '));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Parse failed');
      }
    };
    if (isCsv) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  }, [file, mapping, cycleId, mode, onUpload]);

  const mappingKeys = [
    'Employee_ID',
    'Provider_Name',
    'Specialty',
    'Benchmark_Group',
    'Department',
    'Population',
    'Compensation_Plan',
    'Cycle',
    'Current_FTE',
    'Current_TCC',
    'Current_Target_WRVUs',
    'Prior_Year_WRVUs',
    'Evaluation_Score',
    'Performance_Category',
    'Review_Status',
  ] as const;

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07),0_2px_4px_-2px_rgba(79,70,229,0.07)]">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Upload provider data</h2>
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div className="min-w-[200px]">
          <FileDropzone
            onFileSelect={handleFileSelect}
            selectedFile={file}
            label="File (CSV or XLSX)"
            hint="Drag and drop or click to browse"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cycle</label>
          <input
            type="text"
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
            placeholder={DEFAULT_CYCLE_ID}
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-4">
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
        <button
          type="button"
          onClick={applyUpload}
          disabled={!file}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm"
        >
          Import
        </button>
      </div>
      {headers.length > 0 && (
        <div className="border-t border-slate-100 pt-4 mt-4">
          <p className="text-sm text-slate-600 mb-2">Column mapping (optional)</p>
          <p className="text-xs text-slate-500 mb-3">
            Map <strong>Specialty</strong> or <strong>Benchmark_Group</strong> to the column that holds each provider’s specialty. Values must exactly match the specialty names in your market file (same spelling and casing). Use the <strong>Specialty map</strong> tab to set overrides when labels differ.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
        </div>
      )}
      {error && <p className="text-sm text-amber-700 mt-3">{error}</p>}
      {lastResult && lastResult.rows.length > 0 && (
        <p className="text-sm text-emerald-700 mt-3">Imported {lastResult.rows.length} row(s).</p>
      )}
    </div>
  );
}
