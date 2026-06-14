/**
 * Local error log — free alternative to Sentry for solo/small-team use.
 * Stores non-PII error metadata in localStorage only.
 */

import { migratedStorageGetItem, migratedStorageSetItem } from './migrated-local-storage';
import { getAuditActor } from './audit-actor';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  source: string;
  userId: string;
  userLabel: string;
}

const STORAGE_KEY = 'meritly-error-log';
const MAX_ENTRIES = 200;
const AUDIT_UPDATED_EVENT = 'meritly-audit-updated';

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function notifyUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUDIT_UPDATED_EVENT));
  }
}

export function appendErrorLog(message: string, source = 'app'): void {
  const actor = getAuditActor();
  const entry: ErrorLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    message: message.slice(0, 500),
    source: source.slice(0, 120),
    userId: actor.userId,
    userLabel: actor.userLabel,
  };
  const entries = loadErrorLogEntries();
  entries.push(entry);
  migratedStorageSetItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  notifyUpdated();
}

export function loadErrorLogEntries(limit?: number): ErrorLogEntry[] {
  try {
    const raw = migratedStorageGetItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const entries = data as ErrorLogEntry[];
    if (limit != null && limit > 0) return entries.slice(-limit);
    return entries;
  } catch {
    return [];
  }
}

let initialized = false;

/** Wire global handlers once. Safe to call multiple times. */
export function initErrorLogging(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event) => {
    const msg = event.message || 'Unknown error';
    appendErrorLog(msg, event.filename ? `window:${event.filename}` : 'window');
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    appendErrorLog(msg, 'unhandledrejection');
  });
}
