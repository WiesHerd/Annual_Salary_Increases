/**
 * Persist provider records, market data, and payments to localStorage.
 */

import type { ProviderRecord } from '../types/provider';
import type { MarketRow } from '../types/market';
import type { MarketSurveySet } from '../types/market-survey-config';
import type { ParsedPaymentRow, EvaluationJoinRow } from '../types/upload';
import { getSeedMarketData } from './seed-data';
import { DEFAULT_SURVEY_ID, type SurveyMetadata } from '../types/market-survey-config';

const STORAGE_KEY_RECORDS = 'tcc-provider-records';
const STORAGE_KEY_MARKET = 'tcc-market-data';
const STORAGE_KEY_MARKET_SURVEYS = 'tcc-market-surveys';
const STORAGE_KEY_SURVEY_METADATA = 'tcc-survey-metadata';
const STORAGE_KEY_PAYMENTS = 'tcc-payments';
const STORAGE_KEY_EVALUATIONS = 'tcc-evaluation-rows';

export function loadProviderRecords(): ProviderRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data as ProviderRecord[];
  } catch {
    return [];
  }
}

export function saveProviderRecords(records: ProviderRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  } catch {
    // ignore
  }
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
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    return typeof data === 'object' && data !== null ? (data as T) : null;
  } catch {
    return null;
  }
}

/** Migrate legacy tcc-market-data to tcc-market-surveys. */
function migrateLegacyMarketData(): MarketSurveySet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MARKET);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data) || data.length === 0) return null;
    const migrated: MarketSurveySet = { [DEFAULT_SURVEY_ID]: data as MarketRow[] };
    saveMarketSurveys(migrated);
    try {
      localStorage.removeItem(STORAGE_KEY_MARKET);
    } catch {
      // ignore
    }
    return migrated;
  } catch {
    return null;
  }
}

export function loadMarketSurveys(): MarketSurveySet {
  const migrated = migrateLegacyMarketData();
  if (migrated) return migrated;
  const data = loadJsonObject<MarketSurveySet>(STORAGE_KEY_MARKET_SURVEYS);
  if (data && typeof data === 'object') return data;
  return { [DEFAULT_SURVEY_ID]: getSeedMarketData() };
}

export function saveMarketSurveys(surveys: MarketSurveySet): void {
  try {
    localStorage.setItem(STORAGE_KEY_MARKET_SURVEYS, JSON.stringify(surveys));
  } catch {
    // ignore
  }
}

export function loadSurveyMetadata(): SurveyMetadata {
  const data = loadJsonObject<SurveyMetadata>(STORAGE_KEY_SURVEY_METADATA);
  return data ?? {};
}

export function saveSurveyMetadata(metadata: SurveyMetadata): void {
  try {
    localStorage.setItem(STORAGE_KEY_SURVEY_METADATA, JSON.stringify(metadata));
  } catch {
    // ignore
  }
}

export function loadPayments(): ParsedPaymentRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYMENTS);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data as ParsedPaymentRow[];
  } catch {
    return [];
  }
}

export function savePayments(rows: ParsedPaymentRow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

export function loadEvaluationRows(): EvaluationJoinRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVALUATIONS);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data as EvaluationJoinRow[];
  } catch {
    return [];
  }
}

export function saveEvaluationRows(rows: EvaluationJoinRow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_EVALUATIONS, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

/**
 * Clear all TCC-related data from localStorage for a full reset (simulation testing, fresh start).
 * Removes: providers, market, evaluations, payments, parameters, policy engine, column mappings, audit.
 * Call window.location.reload() after to reset React state.
 */
export function clearAllTccData(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('tcc-') || key.startsWith('salary-review-'))) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

