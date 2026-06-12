/**
 * Full app backup/restore. Serializes every Meritly localStorage key (provider/market
 * data, parameters, policies, scenarios, audit log, UI prefs) into a single JSON file
 * and restores it. Safety net for the browser-only deployment: a cleared browser
 * profile no longer means losing an entire merit cycle's work.
 */

import { isAppStorageKey } from './storage';
import { APP_VERSION } from './app-version';

export const BACKUP_FORMAT = 'meritly-backup' as const;
export const BACKUP_FORMAT_VERSION = 1;

export interface AppBackup {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  appVersion: string;
  exportedAt: string;
  /** Raw localStorage key → value pairs for all app-owned keys. */
  data: Record<string, string>;
}

/** Snapshot all app-owned localStorage keys. */
export function buildAppBackup(): AppBackup {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !isAppStorageKey(key)) continue;
    const value = localStorage.getItem(key);
    if (value != null) data[key] = value;
  }
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/** Suggested filename, e.g. meritly-backup-2026-06-11.json */
export function backupFilename(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `meritly-backup-${y}-${m}-${d}.json`;
}

/** Trigger a JSON file download of the current backup. Returns key count. */
export function downloadAppBackup(): number {
  const backup = buildAppBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFilename();
  a.click();
  URL.revokeObjectURL(url);
  return Object.keys(backup.data).length;
}

export type ParseBackupResult =
  | { ok: true; backup: AppBackup }
  | { ok: false; error: string };

/** Parse and validate a backup file's text content. */
export function parseAppBackup(raw: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  if (typeof parsed !== 'object' || parsed == null) {
    return { ok: false, error: 'File does not contain a backup object.' };
  }
  const b = parsed as Partial<AppBackup>;
  if (b.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'File is not a Meritly backup (missing format marker).' };
  }
  if (typeof b.formatVersion !== 'number' || b.formatVersion > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      error: 'Backup was created by a newer version of Meritly. Update the app and try again.',
    };
  }
  if (typeof b.data !== 'object' || b.data == null || Array.isArray(b.data)) {
    return { ok: false, error: 'Backup contains no data section.' };
  }
  for (const [k, v] of Object.entries(b.data)) {
    if (!isAppStorageKey(k) || typeof v !== 'string') {
      return { ok: false, error: `Backup contains an unexpected entry ("${k}").` };
    }
  }
  return { ok: true, backup: b as AppBackup };
}

/**
 * Replace all current app data with the backup contents.
 * Removes existing app keys first so stale keys do not survive the restore.
 * Caller should reload the page afterwards to reset React state.
 */
export function restoreAppBackup(backup: AppBackup): void {
  const stale: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isAppStorageKey(key)) stale.push(key);
  }
  for (const key of stale) localStorage.removeItem(key);
  for (const [key, value] of Object.entries(backup.data)) {
    localStorage.setItem(key, value);
  }
}
