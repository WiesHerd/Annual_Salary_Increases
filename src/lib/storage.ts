/**
 * Persist provider records, market data, and payments to localStorage.
 * Uses meritly-* keys with backward-compatible reads from tcc-* (see migrated-local-storage).
 */

import type { ProviderRecord } from '../types/provider';
import type { MarketRow } from '../types/market';
import type { MarketSurveySet } from '../types/market-survey-config';
import type { ParsedPaymentRow, EvaluationJoinRow, CustomDataset } from '../types/upload';
import { getSeedMarketSurveys } from './seed-data';
import { DEFAULT_SURVEY_ID, type SurveyMetadata } from '../types/market-survey-config';
import { migratedStorageGetItem, migratedStorageSetItem, migratedStorageRemoveItem } from './migrated-local-storage';
import {
  parseProviderRecordsFromStorage,
  parseMarketSurveySetFromStorage,
  parseSurveyMetadataFromStorage,
  parsePaymentRowsFromStorage,
  parseEvaluationRowsFromStorage,
  parseCustomDatasetsFromStorage,
} from './schemas/persisted-data';

const STORAGE_KEY_RECORDS = 'tcc-provider-records';
const STORAGE_KEY_MARKET = 'tcc-market-data';
const STORAGE_KEY_MARKET_SURVEYS = 'tcc-market-surveys';
const STORAGE_KEY_SURVEY_METADATA = 'tcc-survey-metadata';
const STORAGE_KEY_PAYMENTS = 'tcc-payments';
const STORAGE_KEY_EVALUATIONS = 'tcc-evaluation-rows';
const STORAGE_KEY_CUSTOM_DATASETS = 'tcc-custom-datasets';

export type LoadProviderRecordsMeta = {
  records: ProviderRecord[];
  /**
   * True if the provider storage key existed (including explicit `[]`).
   * False = first visit / nothing ever persisted — safe to auto-seed sample providers.
   */
  hasStoredProviderState: boolean;
};

export function loadProviderRecordsWithMeta(): LoadProviderRecordsMeta {
  try {
    const raw = migratedStorageGetItem(STORAGE_KEY_RECORDS);
    if (raw == null || raw === '') {
      return { records: [], hasStoredProviderState: false };
    }
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      return { records: [], hasStoredProviderState: true };
    }
    return {
      records: parseProviderRecordsFromStorage(data),
      hasStoredProviderState: true,
    };
  } catch {
    return { records: [], hasStoredProviderState: true };
  }
}

export function loadProviderRecords(): ProviderRecord[] {
  return loadProviderRecordsWithMeta().records;
}

export function saveProviderRecords(records: ProviderRecord[]): void {
  const json = JSON.stringify(records);
  if (records.length === 0) {
    // Wipe primary + legacy first so a stale `tcc-provider-records` cannot survive a failed or
    // partial meritly write and repopulate the UI on refresh (meritly is read before tcc fallback).
    migratedStorageRemoveItem(STORAGE_KEY_RECORDS);
  }
  migratedStorageSetItem(STORAGE_KEY_RECORDS, json);
}

/** @deprecated Use loadProviderRecords */
export function loadReviewRecords(): ProviderRecord[] {
  return loadProviderRecords();
}

/** @deprecated Use saveProviderRecords */
export function saveReviewRecords(records: ProviderRecord[]): void {
  saveProviderRecords(records);
}

/** @deprecated Use loadMarketSurveys. Returns physicians survey or flat array from legacy. */
export function loadMarketData(): MarketRow[] {
  const surveys = loadMarketSurveys();
  return surveys[DEFAULT_SURVEY_ID] ?? [];
}

/** @deprecated Use saveMarketSurveys. */
export function saveMarketData(rows: MarketRow[]): void {
  saveMarketSurveys({ [DEFAULT_SURVEY_ID]: rows });
}

function loadJsonObject<T>(key: string): T | null {
  try {
    const raw = migratedStorageGetItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    return typeof data === 'object' && data !== null ? (data as T) : null;
  } catch {
    return null;
  }
}

/** Migrate legacy tcc-market-data to tcc-market-surveys (meritly keys via migrated set). */
function migrateLegacyMarketData(): MarketSurveySet | null {
  try {
    const raw = migratedStorageGetItem(STORAGE_KEY_MARKET);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data) || data.length === 0) return null;
    const migrated: MarketSurveySet = { [DEFAULT_SURVEY_ID]: data as MarketRow[] };
    saveMarketSurveys(migrated);
    migratedStorageRemoveItem(STORAGE_KEY_MARKET);
    return migrated;
  } catch {
    return null;
  }
}

export function loadMarketSurveys(): MarketSurveySet {
  const migrated = migrateLegacyMarketData();
  if (migrated) return migrated;
  const raw = migratedStorageGetItem(STORAGE_KEY_MARKET_SURVEYS);
  if (!raw) return getSeedMarketSurveys();
  try {
    const parsed = JSON.parse(raw) as unknown;
    const validated = parseMarketSurveySetFromStorage(parsed);
    if (validated && typeof validated === 'object') return validated;
  } catch {
    // fall through
  }
  const data = loadJsonObject<MarketSurveySet>(STORAGE_KEY_MARKET_SURVEYS);
  if (data && typeof data === 'object') return data;
  return getSeedMarketSurveys();
}

/** Like loadMarketSurveys but never falls back to bundled seed — used when demo auto-seed is off. */
export function loadMarketSurveysPersistedOrEmpty(): MarketSurveySet {
  const migrated = migrateLegacyMarketData();
  if (migrated) return migrated;
  const raw = migratedStorageGetItem(STORAGE_KEY_MARKET_SURVEYS);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    const validated = parseMarketSurveySetFromStorage(parsed);
    if (validated && typeof validated === 'object') return validated;
  } catch {
    // fall through
  }
  const data = loadJsonObject<MarketSurveySet>(STORAGE_KEY_MARKET_SURVEYS);
  if (data && typeof data === 'object') return data;
  return {};
}

export function saveMarketSurveys(surveys: MarketSurveySet): void {
  migratedStorageSetItem(STORAGE_KEY_MARKET_SURVEYS, JSON.stringify(surveys));
}

export function loadSurveyMetadata(): SurveyMetadata {
  const raw = migratedStorageGetItem(STORAGE_KEY_SURVEY_METADATA);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseSurveyMetadataFromStorage(parsed);
  } catch {
    return {};
  }
}

export function saveSurveyMetadata(metadata: SurveyMetadata): void {
  migratedStorageSetItem(STORAGE_KEY_SURVEY_METADATA, JSON.stringify(metadata));
}

export function loadPayments(): ParsedPaymentRow[] {
  try {
    const raw = migratedStorageGetItem(STORAGE_KEY_PAYMENTS);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return parsePaymentRowsFromStorage(data);
  } catch {
    return [];
  }
}

export function savePayments(rows: ParsedPaymentRow[]): void {
  migratedStorageSetItem(STORAGE_KEY_PAYMENTS, JSON.stringify(rows));
}

export function loadEvaluationRows(): EvaluationJoinRow[] {
  try {
    const raw = migratedStorageGetItem(STORAGE_KEY_EVALUATIONS);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return parseEvaluationRowsFromStorage(data);
  } catch {
    return [];
  }
}

export function saveEvaluationRows(rows: EvaluationJoinRow[]): void {
  migratedStorageSetItem(STORAGE_KEY_EVALUATIONS, JSON.stringify(rows));
}

export function loadCustomDatasets(): CustomDataset[] {
  try {
    const raw = migratedStorageGetItem(STORAGE_KEY_CUSTOM_DATASETS);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return parseCustomDatasetsFromStorage(data);
  } catch {
    return [];
  }
}

export function saveCustomDatasets(datasets: CustomDataset[]): void {
  migratedStorageSetItem(STORAGE_KEY_CUSTOM_DATASETS, JSON.stringify(datasets));
}

function shouldClearStorageKey(key: string): boolean {
  return (
    key.startsWith('tcc-') ||
    key.startsWith('meritly-') ||
    key.startsWith('salary-review-') ||
    key.startsWith('compare-scenarios-') ||
    key === 'asi-demo-mode'
  );
}

/**
 * Clear all app-related data from localStorage for a full reset (simulation testing, fresh start).
 * Removes: meritly-*, tcc-*, salary-review-*, compare-scenarios-*, asi-demo-mode, parameters, policy engine, column mappings, audit.
 * Call window.location.reload() after to reset React state.
 */
export function clearAllTccData(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && shouldClearStorageKey(key)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    migratedStorageRemoveItem(key);
  }
}
