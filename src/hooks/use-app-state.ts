/**
 * App state: provider records, market data, payments, evaluation rows; load/save; uploads; market + evaluation join.
 * Records exposed as "records" are base providers merged with market and then with evaluation rows (by Employee_ID).
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ProviderRecord } from '../types/provider';
import type { ProviderUploadResult, MarketUploadResult, PaymentUploadResult, EvaluationUploadResult } from '../types';
import {
  loadProviderRecords,
  saveProviderRecords,
  loadMarketData,
  saveMarketData,
  loadPayments,
  savePayments,
  loadEvaluationRows,
  saveEvaluationRows,
} from '../lib/storage';
import { getDemoData, getSeedProviderRecords, getSeedMarketData, getSeedPayments } from '../lib/seed-data';
import { mergeMarketIntoProviders, mergeEvaluationsIntoProviders } from '../lib/joins';
import { DEFAULT_CYCLE_ID } from '../lib/parse-file';

export function useAppState() {
  const [records, setRecords] = useState<ProviderRecord[]>([]);
  const [evaluationRows, setEvaluationRows] = useState<import('../types/upload').EvaluationJoinRow[]>([]);
  const [marketData, setMarketData] = useState<import('../types/market').MarketRow[]>([]);
  const [payments, setPayments] = useState<import('../types/upload').ParsedPaymentRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const recordsWithEvaluation = useMemo(
    () => mergeEvaluationsIntoProviders(records, evaluationRows),
    [records, evaluationRows]
  );

  useEffect(() => {
    let recs = loadProviderRecords();
    if (recs.length === 0) {
      recs = getSeedProviderRecords();
      saveProviderRecords(recs);
    }
    let market = loadMarketData();
    if (market.length === 0) {
      market = getSeedMarketData();
      saveMarketData(market);
    }
    recs = mergeMarketIntoProviders(recs, market);
    setRecords(recs);

    let evals = loadEvaluationRows();
    setEvaluationRows(evals);

    setMarketData(market);

    let pay = loadPayments();
    if (pay.length === 0) {
      pay = getSeedPayments();
      savePayments(pay);
    }
    setPayments(pay);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveProviderRecords(records);
  }, [records, loaded]);
  useEffect(() => {
    if (loaded) saveEvaluationRows(evaluationRows);
  }, [evaluationRows, loaded]);
  useEffect(() => {
    if (loaded) saveMarketData(marketData);
  }, [marketData, loaded]);
  useEffect(() => {
    if (loaded) savePayments(payments);
  }, [payments, loaded]);

  const addFromUpload = useCallback((result: ProviderUploadResult, _cycleId: string = DEFAULT_CYCLE_ID) => {
    setRecords((prev) => {
      const existingIds = new Set(prev.map((r) => r.Employee_ID));
      const toAdd = result.rows.filter((r) => !existingIds.has(r.Employee_ID));
      const merged = mergeMarketIntoProviders([...prev, ...toAdd], marketData);
      return merged;
    });
    return result.rows.length;
  }, [marketData]);

  const replaceFromUpload = useCallback((result: ProviderUploadResult, _cycleId: string = DEFAULT_CYCLE_ID) => {
    const merged = mergeMarketIntoProviders(result.rows, marketData);
    setRecords(merged);
    return merged.length;
  }, [marketData]);

  const addMarketFromUpload = useCallback((result: MarketUploadResult, mode: 'replace' | 'add') => {
    if (mode === 'replace') {
      setMarketData(result.rows);
      setRecords((prev) => mergeMarketIntoProviders(prev, result.rows));
      return result.rows.length;
    }
    const existingSpecs = new Set(marketData.map((r) => r.specialty));
    const toAdd = result.rows.filter((r) => !existingSpecs.has(r.specialty));
    const newMarket = [...marketData, ...toAdd];
    setMarketData(newMarket);
    setRecords((prev) => mergeMarketIntoProviders(prev, newMarket));
    return toAdd.length;
  }, [marketData]);

  const replaceMarketFromUpload = useCallback((result: MarketUploadResult) => {
    setMarketData(result.rows);
    setRecords((prev) => mergeMarketIntoProviders(prev, result.rows));
    return result.rows.length;
  }, []);

  const addEvaluationFromUpload = useCallback((result: EvaluationUploadResult, mode: 'replace' | 'add') => {
    if (mode === 'replace') {
      setEvaluationRows(result.rows);
      return result.rows.length;
    }
    const byId = new Set(evaluationRows.map((r) => r.Employee_ID));
    const toAdd = result.rows.filter((r) => !byId.has(r.Employee_ID));
    setEvaluationRows((prev) => [...prev, ...toAdd]);
    return toAdd.length;
  }, [evaluationRows]);

  const replaceEvaluationFromUpload = useCallback((result: EvaluationUploadResult) => {
    setEvaluationRows(result.rows);
    return result.rows.length;
  }, []);

  const clearEvaluations = useCallback(() => setEvaluationRows([]), []);

  const addPaymentsFromUpload = useCallback((result: PaymentUploadResult, mode: 'replace' | 'add') => {
    if (mode === 'replace') {
      setPayments(result.rows);
      return result.rows.length;
    }
    setPayments((prev) => [...prev, ...result.rows]);
    return result.rows.length;
  }, []);

  const replacePaymentsFromUpload = useCallback((result: PaymentUploadResult) => {
    setPayments(result.rows);
    return result.rows.length;
  }, []);

  const removeRecord = useCallback((employeeId: string) => {
    setRecords((prev) => prev.filter((r) => r.Employee_ID !== employeeId));
  }, []);

  const removeMarketRow = useCallback((specialty: string) => {
    setMarketData((prev) => {
      const next = prev.filter((r) => r.specialty !== specialty);
      setRecords((recs) => mergeMarketIntoProviders(recs, next));
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setRecords([]), []);
  const clearMarket = useCallback(() => setMarketData([]), []);
  const clearPayments = useCallback(() => setPayments([]), []);

  /** Reset all data to seed/demo data (for development and testing). */
  const loadDemoData = useCallback(() => {
    const { providerRecords, marketRows, payments, evaluationRows } = getDemoData();
    const merged = mergeMarketIntoProviders(providerRecords, marketRows);
    saveProviderRecords(merged);
    saveMarketData(marketRows);
    savePayments(payments);
    saveEvaluationRows(evaluationRows);
    setRecords(merged);
    setEvaluationRows(evaluationRows);
    setMarketData(marketRows);
    setPayments(payments);
  }, []);

  return {
    records: recordsWithEvaluation,
    setRecords,
    addFromUpload,
    replaceFromUpload,
    removeRecord,
    clearAll,
    marketData,
    setMarketData,
    addMarketFromUpload,
    replaceMarketFromUpload,
    removeMarketRow,
    clearMarket,
    evaluationRows,
    addEvaluationFromUpload,
    replaceEvaluationFromUpload,
    clearEvaluations,
    payments,
    setPayments,
    addPaymentsFromUpload,
    replacePaymentsFromUpload,
    clearPayments,
    loaded,
    loadDemoData,
  };
}
