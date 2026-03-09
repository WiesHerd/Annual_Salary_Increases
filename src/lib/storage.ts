/**
 * Persist provider records, market data, and payments to localStorage.
 */

import type { ProviderRecord } from '../types/provider';
import type { MarketRow } from '../types/market';
import type { ParsedPaymentRow, EvaluationJoinRow } from '../types/upload';

const STORAGE_KEY_RECORDS = 'tcc-provider-records';
const STORAGE_KEY_MARKET = 'tcc-market-data';
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

export function loadMarketData(): MarketRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MARKET);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data as MarketRow[];
  } catch {
    return [];
  }
}

export function saveMarketData(rows: MarketRow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MARKET, JSON.stringify(rows));
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
