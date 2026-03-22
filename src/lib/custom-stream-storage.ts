/**
 * Persist custom data stream definitions and stream data to localStorage.
 * Separate from tcc-provider-records, tcc-market-surveys, etc.
 */

import type {
  CustomStreamDefinition,
  CustomStreamColumnMapping,
  CustomStreamRow,
} from '../types/custom-stream';
import { migratedStorageGetItem, migratedStorageSetItem } from './migrated-local-storage';

const STORAGE_KEY_DEFINITIONS = 'tcc-custom-stream-definitions';
const STORAGE_KEY_DATA = 'tcc-custom-stream-data';

export interface CustomStreamData {
  mapping: CustomStreamColumnMapping;
  columnOrder: string[];
  rows: CustomStreamRow[];
}

function loadJson<T>(key: string, defaultVal: T): T {
  try {
    const raw = migratedStorageGetItem(key);
    if (!raw) return defaultVal;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? defaultVal;
  } catch {
    return defaultVal;
  }
}

function saveJson(key: string, value: unknown): void {
  migratedStorageSetItem(key, JSON.stringify(value));
}

export function loadCustomStreamDefinitions(): CustomStreamDefinition[] {
  const data = loadJson<CustomStreamDefinition[]>(STORAGE_KEY_DEFINITIONS, []);
  return Array.isArray(data) ? data : [];
}

export function saveCustomStreamDefinitions(definitions: CustomStreamDefinition[]): void {
  saveJson(STORAGE_KEY_DEFINITIONS, definitions);
}

export function loadCustomStreamData(): Record<string, CustomStreamData> {
  const data = loadJson<Record<string, CustomStreamData>>(STORAGE_KEY_DATA, {});
  return data && typeof data === 'object' ? data : {};
}

export function saveCustomStreamData(data: Record<string, CustomStreamData>): void {
  saveJson(STORAGE_KEY_DATA, data);
}

export function loadCustomStreamDataForStream(streamId: string): CustomStreamData | null {
  const all = loadCustomStreamData();
  return all[streamId] ?? null;
}

export function saveCustomStreamDataForStream(streamId: string, streamData: CustomStreamData): void {
  const all = loadCustomStreamData();
  saveCustomStreamData({ ...all, [streamId]: streamData });
}

export function removeCustomStreamDataForStream(streamId: string): void {
  const all = loadCustomStreamData();
  const next = { ...all };
  delete next[streamId];
  saveCustomStreamData(next);
}
