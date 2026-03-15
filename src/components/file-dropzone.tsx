import { useState, useCallback, useRef } from 'react';

interface FileDropzoneProps {
  accept?: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  label?: string;
  hint?: string;
}

export function FileDropzone({
  accept = '.csv,.xlsx,.xls',
  onFileSelect,
  selectedFile,
  label = 'File (CSV or XLSX)',
  hint = 'Drag and drop here or click to browse',
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      onFileSelect(f ?? null);
      e.target.value = '';
    },
    [onFileSelect]
  );

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className={`
          min-h-[88px] rounded-xl border-2 border-dashed px-4 py-4 flex flex-col items-center justify-center gap-1
          transition-colors cursor-pointer select-none
          ${isDragOver
            ? 'border-indigo-500 bg-indigo-50/80'
            : selectedFile
              ? 'border-indigo-300 bg-indigo-50/50'
              : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50/80'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          aria-label={label}
        />
        {selectedFile ? (
          <>
            <span className="text-sm font-medium text-indigo-700 truncate max-w-full">
              {selectedFile.name}
            </span>
            <span className="text-xs text-slate-500">
              Click or drop a different file
            </span>
          </>
        ) : (
          <span className="text-sm text-slate-600 text-center">{hint}</span>
        )}
      </div>
    </div>
  );
}
