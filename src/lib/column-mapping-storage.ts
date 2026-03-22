/**
 * Learned column mappings – persisted user choices for upload column mapping.
 * When a user maps a source column to a target field, we remember it and auto-apply
 * on future uploads when that header appears (inspired by Provider_Survey_System_Aggregator).
 */

import { migratedStorageGetItem, migratedStorageSetItem } from './migrated-local-storage';

const KEY_PROVIDER = 'tcc-learned-provider-mapping';
const KEY_MARKET = 'tcc-learned-market-mapping';
const KEY_EVALUATION = 'tcc-learned-evaluation-mapping';
const KEY_PAYMENTS = 'tcc-learned-payments-mapping';
const KEY_CUSTOM_STREAM_PREFIX = 'tcc-learned-custom-stream-';

export type LearnedProviderMapping = Record<string, string>;
export type LearnedMarketMapping = Record<string, string>;
export type LearnedEvaluationMapping = Record<string, string>;
export type LearnedPaymentsMapping = Record<string, string>;

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
  const ok = migratedStorageSetItem(key, JSON.stringify(value));
  if (!ok) {
    console.warn('Failed to save learned mapping');
  }
}

export function loadLearnedProviderMapping(): LearnedProviderMapping {
  return loadJson(KEY_PROVIDER, {});
}

export function saveLearnedProviderMapping(m: LearnedProviderMapping): void {
  saveJson(KEY_PROVIDER, m);
}

export function loadLearnedMarketMapping(): LearnedMarketMapping {
  return loadJson(KEY_MARKET, {});
}

export function saveLearnedMarketMapping(m: LearnedMarketMapping): void {
  saveJson(KEY_MARKET, m);
}

export function loadLearnedEvaluationMapping(): LearnedEvaluationMapping {
  return loadJson(KEY_EVALUATION, {});
}

export function saveLearnedEvaluationMapping(m: LearnedEvaluationMapping): void {
  saveJson(KEY_EVALUATION, m);
}

export function loadLearnedPaymentsMapping(): LearnedPaymentsMapping {
  return loadJson(KEY_PAYMENTS, {});
}

export function saveLearnedPaymentsMapping(m: LearnedPaymentsMapping): void {
  saveJson(KEY_PAYMENTS, m);
}

/** Merge learned mappings into a mapping, preferring learned when the header exists. */
export function applyLearnedProviderMapping(
  base: Record<string, string | undefined>,
  headers: string[],
  learned: LearnedProviderMapping
): Record<string, string | undefined> {
  const headerSet = new Set(headers.map((h) => h.trim()));
  const merged = { ...base };
  for (const [target, source] of Object.entries(learned)) {
    if (source && headerSet.has(source)) merged[target] = source;
  }
  return merged;
}

export function applyLearnedMarketMapping(
  base: Record<string, string | undefined>,
  headers: string[],
  learned: LearnedMarketMapping
): Record<string, string | undefined> {
  const headerSet = new Set(headers.map((h) => h.trim()));
  const merged = { ...base };
  for (const [target, source] of Object.entries(learned)) {
    if (source && headerSet.has(source)) merged[target] = source;
  }
  return merged;
}

export function applyLearnedEvaluationMapping(
  base: Record<string, string | undefined>,
  headers: string[],
  learned: LearnedEvaluationMapping
): Record<string, string | undefined> {
  const headerSet = new Set(headers.map((h) => h.trim()));
  const merged = { ...base };
  for (const [target, source] of Object.entries(learned)) {
    if (source && headerSet.has(source)) merged[target] = source;
  }
  return merged;
}

export function applyLearnedPaymentsMapping(
  base: Record<string, string | undefined>,
  headers: string[],
  learned: LearnedPaymentsMapping
): Record<string, string | undefined> {
  const headerSet = new Set(headers.map((h) => h.trim()));
  const merged = { ...base };
  for (const [target, source] of Object.entries(learned)) {
    if (source && headerSet.has(source)) merged[target] = source;
  }
  return merged;
}

/** Persist mapping as learned for future auto-apply. Call after successful upload. */
export function persistLearnedProviderMapping(mapping: Record<string, string | undefined>): void {
  const learned: LearnedProviderMapping = {};
  for (const [target, source] of Object.entries(mapping)) {
    if (source && source.trim()) learned[target] = source;
  }
  saveLearnedProviderMapping(learned);
}

export function persistLearnedMarketMapping(mapping: Record<string, string | undefined>): void {
  const learned: LearnedMarketMapping = {};
  for (const [target, source] of Object.entries(mapping)) {
    if (source && source.trim()) learned[target] = source;
  }
  saveLearnedMarketMapping(learned);
}

export function persistLearnedEvaluationMapping(mapping: Record<string, string | undefined>): void {
  const learned: LearnedEvaluationMapping = {};
  for (const [target, source] of Object.entries(mapping)) {
    if (source && source.trim()) learned[target] = source;
  }
  saveLearnedEvaluationMapping(learned);
}

export function persistLearnedPaymentsMapping(mapping: Record<string, string | undefined>): void {
  const learned: LearnedPaymentsMapping = {};
  for (const [target, source] of Object.entries(mapping)) {
    if (source && source.trim()) learned[target] = source;
  }
  saveLearnedPaymentsMapping(learned);
}

// ---------- Custom stream (per-stream-id) ----------

export type LearnedCustomStreamMapping = Record<string, string>;

export function loadLearnedCustomStreamMapping(streamId: string): LearnedCustomStreamMapping {
  const key = streamId ? `${KEY_CUSTOM_STREAM_PREFIX}${streamId}` : KEY_CUSTOM_STREAM_PREFIX;
  return loadJson(key, {});
}

export function saveLearnedCustomStreamMapping(streamId: string, m: LearnedCustomStreamMapping): void {
  if (!streamId) return;
  saveJson(`${KEY_CUSTOM_STREAM_PREFIX}${streamId}`, m);
}

export function applyLearnedCustomStreamMapping(
  base: Record<string, string | undefined>,
  headers: string[],
  learned: LearnedCustomStreamMapping
): Record<string, string | undefined> {
  const headerSet = new Set(headers.map((h) => h.trim()));
  const merged = { ...base };
  for (const [target, source] of Object.entries(learned)) {
    if (source && headerSet.has(source)) merged[target] = source;
  }
  return merged;
}

export function persistLearnedCustomStreamMapping(
  streamId: string,
  mapping: Record<string, string | undefined>
): void {
  if (!streamId) return;
  const learned: LearnedCustomStreamMapping = {};
  for (const [target, source] of Object.entries(mapping)) {
    if (source && source.trim()) learned[target] = source;
  }
  saveLearnedCustomStreamMapping(streamId, learned);
}
