/**
 * Back up / restore all app data (providers, market, evaluations, parameters,
 * policies, scenarios) as a single JSON file. Everything lives in localStorage,
 * so this is the user's only safety net against a cleared browser profile.
 */

import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { downloadAppBackup, parseAppBackup, restoreAppBackup } from '../lib/backup';
import { useToast } from './ui/toast';
import { cn } from '../lib/utils';

export function BackupControls({ className }: { className?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleBackup = () => {
    const keyCount = downloadAppBackup();
    toast({
      variant: 'success',
      title: 'Backup downloaded',
      description: `Saved ${keyCount} data section${keyCount !== 1 ? 's' : ''} — keep the file somewhere safe.`,
    });
  };

  const handleRestoreFile = async (file: File) => {
    const raw = await file.text();
    const result = parseAppBackup(raw);
    if (!result.ok) {
      toast({ variant: 'error', title: 'Restore failed', description: result.error });
      return;
    }
    const exported = new Date(result.backup.exportedAt);
    const exportedLabel = Number.isNaN(exported.getTime())
      ? 'an unknown date'
      : exported.toLocaleString();
    const confirmed = window.confirm(
      `Restore backup from ${exportedLabel}?\n\nThis replaces ALL current data on this device — providers, market surveys, evaluations, parameters, policies, and scenarios. This cannot be undone.`
    );
    if (!confirmed) return;
    restoreAppBackup(result.backup);
    window.location.reload();
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={handleBackup}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
        title="Download all app data (providers, market, parameters, policies) as a JSON backup file"
      >
        <Download className="h-4 w-4" aria-hidden />
        Back up
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
        title="Restore all app data from a Meritly backup file (replaces current data)"
      >
        <Upload className="h-4 w-4" aria-hidden />
        Restore
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleRestoreFile(file);
        }}
      />
    </div>
  );
}
