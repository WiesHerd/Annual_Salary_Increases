/**
 * Saved policy packs: named snapshots of the full policy set (and optionally tier tables / custom models).
 * Used for "Load from previous year" — save current setup, load it next cycle without rebuilding.
 */

import type { AnnualIncreasePolicy } from '../types/compensation-policy';
import type { CustomCompensationModel } from '../types/compensation-policy';
import type { TierTable } from '../types/tier-table';
import { migratedStorageGetItem, migratedStorageSetItem } from './migrated-local-storage';

const STORAGE_KEY = 'tcc-policy-engine-saved-packs';

export interface SavedPolicyPack {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  policies: AnnualIncreasePolicy[];
  tierTables?: TierTable[];
  customModels?: CustomCompensationModel[];
}

function loadJson<T>(key: string, defaultValue: T): T {
  try {
    const raw = migratedStorageGetItem(key);
    if (!raw) return defaultValue;
    const data = JSON.parse(raw) as unknown;
    return (data ?? defaultValue) as T;
  } catch {
    return defaultValue;
  }
}

function saveJson<T>(key: string, value: T): void {
  migratedStorageSetItem(key, JSON.stringify(value));
}

export function loadSavedPacks(): SavedPolicyPack[] {
  try {
    const raw = loadJson<unknown>(STORAGE_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (s: unknown): s is SavedPolicyPack =>
        s != null &&
        typeof s === 'object' &&
        typeof (s as SavedPolicyPack).id === 'string' &&
        typeof (s as SavedPolicyPack).name === 'string' &&
        Array.isArray((s as SavedPolicyPack).policies)
    );
  } catch {
    return [];
  }
}

export function getPackById(id: string): SavedPolicyPack | undefined {
  return loadSavedPacks().find((p) => p.id === id);
}

export function createSavedPack(
  name: string,
  policies: AnnualIncreasePolicy[],
  options?: { description?: string; tierTables?: TierTable[]; customModels?: CustomCompensationModel[] }
): SavedPolicyPack {
  const pack: SavedPolicyPack = {
    id: `pack-${crypto.randomUUID()}`,
    name,
    description: options?.description,
    createdAt: new Date().toISOString(),
    policies: JSON.parse(JSON.stringify(policies)),
    tierTables: options?.tierTables ? JSON.parse(JSON.stringify(options.tierTables)) : undefined,
    customModels: options?.customModels ? JSON.parse(JSON.stringify(options.customModels)) : undefined,
  };
  const list = loadSavedPacks();
  list.unshift(pack);
  saveJson(STORAGE_KEY, list);
  return pack;
}

export function deleteSavedPack(id: string): void {
  const list = loadSavedPacks().filter((p) => p.id !== id);
  saveJson(STORAGE_KEY, list);
}
