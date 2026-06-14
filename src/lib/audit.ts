/**
 * Non-PII audit log for data changes and key activity. Stored in localStorage.
 * Tracks what changed, when, and by whom. Optional cloud sync when Supabase is configured.
 */

import { getAuditActor } from './audit-actor';
import { migratedStorageGetItem, migratedStorageSetItem } from './migrated-local-storage';
import { getSupabaseClient } from './supabase/client';
import { scheduleCloudAuditPush } from './supabase/cloud-audit';

export type AuditEntityType =
  | 'provider'
  | 'market'
  | 'evaluation'
  | 'session'
  | 'export'
  | 'import'
  | 'system';

/** Data-change types synced to Supabase when configured. */
export const CLOUD_AUDIT_ENTITY_TYPES: ReadonlySet<AuditEntityType> = new Set([
  'provider',
  'market',
  'evaluation',
  'session',
  'export',
  'import',
  'system',
]);

export interface AuditEntry {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: string;
  userId?: string;
  userLabel?: string;
}

const STORAGE_KEY_AUDIT = 'tcc-audit-log';
const MAX_ENTRIES = 5000;
export const AUDIT_UPDATED_EVENT = 'meritly-audit-updated';

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function notifyUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUDIT_UPDATED_EVENT));
  }
}

function withActor(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Omit<AuditEntry, 'id' | 'timestamp'> {
  const actor = getAuditActor();
  return {
    ...entry,
    userId: entry.userId ?? actor.userId,
    userLabel: entry.userLabel ?? actor.userLabel,
  };
}

function persistEntry(full: AuditEntry, cloudEntry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
  const entries = loadAuditEntries();
  entries.push(full);
  const trimmed = entries.slice(-MAX_ENTRIES);
  migratedStorageSetItem(STORAGE_KEY_AUDIT, JSON.stringify(trimmed));
  if (CLOUD_AUDIT_ENTITY_TYPES.has(cloudEntry.entityType)) {
    scheduleCloudAuditPush(getSupabaseClient(), cloudEntry);
  }
  notifyUpdated();
}

/** Append a single audit entry. Auto-generates id, timestamp, and actor. */
export function appendAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
  const withUser = withActor(entry);
  const full: AuditEntry = {
    ...withUser,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  persistEntry(full, withUser);
}

/** Log a high-level action (sign-in, export, import, etc.). */
export function recordAuditAction(params: {
  entityType: AuditEntityType;
  action: string;
  entityId?: string;
  detail?: unknown;
  oldValue?: unknown;
}): void {
  appendAuditEntry({
    entityType: params.entityType,
    entityId: params.entityId ?? '—',
    field: params.action,
    oldValue: params.oldValue ?? null,
    newValue: params.detail ?? null,
  });
}

/** Load all audit entries, optionally filtered. */
export function loadAuditEntries(options?: {
  entityType?: AuditEntityType;
  entityId?: string;
  limit?: number;
}): AuditEntry[] {
  try {
    const raw = migratedStorageGetItem(STORAGE_KEY_AUDIT);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    let entries = data as AuditEntry[];
    if (options?.entityType) {
      entries = entries.filter((e) => e.entityType === options.entityType);
    }
    if (options?.entityId != null && options.entityId !== '') {
      entries = entries.filter((e) => e.entityId === options.entityId);
    }
    if (options?.limit != null && options.limit > 0) {
      entries = entries.slice(-options.limit);
    }
    return entries;
  } catch {
    return [];
  }
}

/** Get change history for a specific entity (e.g. provider by Employee_ID), most recent first. */
export function getChangeHistoryForEntity(
  entityType: AuditEntityType,
  entityId: string,
  limit = 20
): AuditEntry[] {
  const entries = loadAuditEntries({ entityType, entityId, limit });
  return entries.reverse();
}

/** Get the set of provider Employee_IDs that have at least one audit entry (i.e. have been edited). */
export function getModifiedProviderIds(): Set<string> {
  const entries = loadAuditEntries({ entityType: 'provider' });
  return new Set(entries.map((e) => e.entityId));
}
