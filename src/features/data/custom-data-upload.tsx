import { useState, useCallback } from 'react';
import { parseCustomCsv, parseCustomXlsx } from '../../lib/parse-file';
import type { CustomUploadResult } from '../../types';
import { FileDropzone } from '../../components/file-dropzone';

interface CustomDataUploadProps {
  onUpload: (name: string, result: CustomUploadResult, joinKeyColumn: string | null) => void;
}

export function CustomDataUpload({ onUpload }: CustomDataUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CustomUploadResult | null>(null);
  const [name, setName] = useState('');
  const [joinKeyColumn, setJoinKeyColumn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((f: File | null) => {
    setFile(f ?? null);
    setError(null);
    setResult(null);
    setJoinKeyColumn(null);
    if (!f) return;
    const isCsv = f.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      try {
        if (typeof buf === 'string') {
          const r = parseCustomCsv(buf);
          setResult(r);
          setJoinKeyColumn(r.columns.length > 0 ? null : null);
        } else if (buf instanceof ArrayBuffer) {
          const r = parseCustomXlsx(buf);
          setResult(r);
          setJoinKeyColumn(r.columns.length > 0 ? null : null);
        }
        if (typeof buf === 'string') setName('');
        else if (buf instanceof ArrayBuffer) setName('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Parse failed');
      }
    };
    if (isCsv) reader.readAsText(f);
    else reader.readAsArrayBuffer(f);
  }, []);

  const applyUpload = useCallback(() => {
    if (!result || result.rows.length === 0) return;
    const displayName = name.trim() || 'Custom data';
    onUpload(displayName, result, joinKeyColumn);
  }, [name, result, joinKeyColumn, onUpload]);

  return (
    <div className="space-y-4">
      <FileDropzone
        onFileSelect={handleFileSelect}
        selectedFile={file}
        label="File (CSV or XLSX)"
        hint="Any columns; you can optionally choose a column to join to providers (e.g. Employee_ID) for export."
      />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          {result.errors.length > 0 && (
            <p className="text-sm text-amber-700" role="alert">
              {result.errors.slice(0, 3).join('; ')}
              {result.errors.length > 3 ? ` (${result.errors.length - 3} more)` : ''}
            </p>
          )}
          <p className="text-sm text-slate-600">
            Detected <span className="font-medium text-slate-800">{result.rows.length}</span> rows and{' '}
            <span className="font-medium text-slate-800">{result.columns.length}</span> columns.
          </p>
          <div>
            <label htmlFor="custom-dataset-name" className="block text-sm font-medium text-slate-700 mb-1">
              Dataset name
            </label>
            <input
              id="custom-dataset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Custom data"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="custom-join-key" className="block text-sm font-medium text-slate-700 mb-1">
              Join to providers (for export)
            </label>
            <select
              id="custom-join-key"
              value={joinKeyColumn ?? ''}
              onChange={(e) => setJoinKeyColumn(e.target.value === '' ? null : e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">None (display only)</option>
              {result.columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              If set, export can add this dataset’s columns to provider rows when this column matches Employee ID.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyUpload}
              className="app-btn-primary"
              disabled={result.rows.length === 0}
            >
              Add dataset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
