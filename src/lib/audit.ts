/**
 * Non-PII audit log for data changes. Stored in localStorage.
 * Tracks what changed, when, and by whom for enterprise audit compliance.
 */

export type AuditEntityType = 'provider' | 'market' | 'evaluation' | 'payment';

export interface AuditEntry {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: string;
  userId?: string;
}

const STORAGE_KEY_AUDIT = 'tcc-audit-log';
const MAX_ENTRIES = 5000;

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Append a single audit entry. Auto-generates id and timestamp. */
export function appendAuditEntry(
  entry: Omit<AuditEntry, 'id' | 'timestamp'>
): void {
  const full: AuditEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  const entries = loadAuditEntries();
  entries.push(full);
  const trimmed = entries.slice(-MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

/** Load all audit entries, optionally filtered. */
export function loadAuditEntries(options?: {
  entityType?: AuditEntityType;
  entityId?: string;
  limit?: number;
}): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT);
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
