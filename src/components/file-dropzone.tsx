import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CheckCircle2, CloudUpload, FileSpreadsheet, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  accept?: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  label?: string;
  hint?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const ACCEPT_MAP = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
};

export function FileDropzone({
  accept = '.csv,.xlsx,.xls',
  onFileSelect,
  selectedFile,
  label = 'File (CSV or XLSX)',
  hint = 'CSV or XLSX · max 10 MB',
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      onFileSelect(accepted[0] ?? null);
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive, isDragAccept, open } = useDropzone({
    accept: ACCEPT_MAP,
    maxFiles: 1,
    noClick: true,
    onDrop,
  });

  const clearFile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFileSelect(null);
    },
    [onFileSelect],
  );

  const openFilePicker = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      open();
    },
    [open],
  );

  const dragState = isDragAccept || isDragActive;

  const rootProps = getRootProps({
    onClick: selectedFile ? undefined : open,
    onKeyDown: selectedFile
      ? undefined
      : (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        },
    tabIndex: selectedFile ? -1 : 0,
    role: 'button',
  });

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      )}
      <div
        {...rootProps}
        className={cn(
          'group relative flex min-h-[108px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-5 py-5 text-center transition-all duration-200',
          'select-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          !selectedFile && 'cursor-pointer',
          dragState && 'scale-[1.01] border-primary bg-primary/5',
          !dragState && selectedFile && 'border-primary/50 bg-primary/[0.03]',
          !dragState && !selectedFile && 'border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/[0.04]',
        )}
      >
        <input {...getInputProps({ accept })} aria-label={label} />

        {selectedFile ? (
          <>
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <CheckCircle2 className="size-5" strokeWidth={2} />
            </span>
            <span className="max-w-full truncate text-sm font-medium text-foreground">{selectedFile.name}</span>
            <button
              type="button"
              onClick={openFilePicker}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            >
              {formatBytes(selectedFile.size)} · replace file
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={clearFile}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              aria-label="Remove file"
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <span
              className={cn(
                'flex size-10 items-center justify-center rounded-lg transition-all duration-200',
                dragState
                  ? 'scale-110 bg-primary text-primary-foreground shadow-md'
                  : 'bg-background text-muted-foreground shadow-sm ring-1 ring-border group-hover:text-primary',
              )}
            >
              {dragState ? (
                <FileSpreadsheet className="size-5" strokeWidth={2} />
              ) : (
                <CloudUpload className="size-5" strokeWidth={2} />
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-primary">Choose file</span> or drag here
            </span>
            <span className="text-[11px] text-muted-foreground/80">{hint}</span>
          </>
        )}
      </div>
    </div>
  );
}
