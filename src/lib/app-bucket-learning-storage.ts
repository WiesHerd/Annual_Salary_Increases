/**
 * Persist high-confidence APP Auto Map hints: normalized labels → bucket `id`.
 * Seeded from survey specialty lists on groups (blend targets); not from free-form notes.
 */

import { migratedStorageGetItem, migratedStorageSetItem } from './migrated-local-storage';
import type { AppCombinedGroupRow } from '../types/app-combined-group';
import type { AppBucketLearnedEntry, AppBucketLearnedStoreV1 } from '../types/app-bucket-learning';

const KEY = 'tcc-app-bucket-learned-assignments';

export function normalizeMarketSpecialtyKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

const EMPTY: AppBucketLearnedStoreV1 = { version: 1, bySpecialtyKey: {} };

export function loadAppBucketLearnedStore(): AppBucketLearnedStoreV1 {
  try {
    const raw = migratedStorageGetItem(KEY);
    if (!raw) return { ...EMPTY, bySpecialtyKey: { ...EMPTY.bySpecialtyKey } };
    const data = JSON.parse(raw) as unknown;
    if (data == null || typeof data !== 'object') return { ...EMPTY, bySpecialtyKey: {} };
    const o = data as Record<string, unknown>;
    if (o.version !== 1 || typeof o.bySpecialtyKey !== 'object' || o.bySpecialtyKey === null) {
      return { ...EMPTY, bySpecialtyKey: {} };
    }
    const by = o.bySpecialtyKey as Record<string, unknown>;
    const bySpecialtyKey: Record<string, AppBucketLearnedEntry> = {};
    for (const [k, v] of Object.entries(by)) {
      if (!v || typeof v !== 'object') continue;
      const e = v as Record<string, unknown>;
      if (typeof e.bucketId === 'string' && typeof e.lastSpecialtyLabel === 'string' && typeof e.updatedAt === 'string') {
        bySpecialtyKey[k] = {
          bucketId: e.bucketId,
          lastSpecialtyLabel: e.lastSpecialtyLabel,
          updatedAt: e.updatedAt,
        };
      }
    }
    return { version: 1, bySpecialtyKey };
  } catch {
    return { ...EMPTY, bySpecialtyKey: {} };
  }
}

export function saveAppBucketLearnedStore(store: AppBucketLearnedStoreV1): void {
  migratedStorageSetItem(KEY, JSON.stringify(store));
}

/** Rebuild learned hints from each group’s survey row list (blend inputs). Ignores admin notes and legacy `providerSpecialties`. */
export function syncLearnedFromAppCombinedGroups(groups: AppCombinedGroupRow[]): void {
  const next: AppBucketLearnedStoreV1 = { version: 1, bySpecialtyKey: {} };
  const now = new Date().toISOString();
  const activeIds = new Set(groups.map((g) => g.id));

  for (const g of groups) {
    for (const spec of g.surveySpecialties ?? []) {
      const label = spec.trim();
      if (!label) continue;
      const key = normalizeMarketSpecialtyKey(label);
      next.bySpecialtyKey[key] = {
        bucketId: g.id,
        lastSpecialtyLabel: label,
        updatedAt: now,
      };
    }
  }

  for (const [key, entry] of Object.entries(next.bySpecialtyKey)) {
    if (!activeIds.has(entry.bucketId)) {
      delete next.bySpecialtyKey[key];
    }
  }

  saveAppBucketLearnedStore(next);
}

export function clearAppBucketLearnedStore(): void {
  saveAppBucketLearnedStore({ version: 1, bySpecialtyKey: {} });
}
