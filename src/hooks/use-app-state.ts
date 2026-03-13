/**
 * App state: provider records, market surveys, payments, evaluation rows; load/save; uploads; market + evaluation join.
 * Records exposed as "records" are base providers merged with market (per Provider_Type) and then with evaluation rows.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ProviderRecord } from '../types/provider';
import type { ProviderUploadResult, MarketUploadResult, PaymentUploadResult, EvaluationUploadResult } from '../types';
import type { MarketSurveySet } from '../types/market-survey-config';
import { DEFAULT_SURVEY_ID } from '../types/market-survey-config';
import {
  loadProviderRecords,
  saveProviderRecords,
  loadMarketSurveys,
  saveMarketSurveys,
  loadSurveyMetadata,
  saveSurveyMetadata,
  loadPayments,
  savePayments,
  loadEvaluationRows,
  saveEvaluationRows,
} from '../lib/storage';
import { appendAuditEntry } from '../lib/audit';
import { getDemoData, getSeedProviderRecords, getSeedMarketData, getSeedPayments } from '../lib/seed-data';
import {
  loadSurveySpecialtyMappingSet,
  loadProviderTypeToSurveyMapping,
} from '../lib/parameters-storage';
import { mergeMarketIntoProvidersMulti, mergeEvaluationsIntoProviders, mergePaymentsIntoProviders } from '../lib/joins';
import { loadCycles } from '../lib/parameters-storage';
import { DEFAULT_CYCLE_ID } from '../lib/parse-file';
import { useParametersState } from './use-parameters-state';
import { useSelectedCycle } from './use-selected-cycle';

export function useAppState() {
  const { cycles } = useParametersState();
  const [selectedCycleId] = useSelectedCycle(cycles);
  const paymentCycleId = selectedCycleId || loadCycles()[0]?.id || DEFAULT_CYCLE_ID;

  const [records, setRecords] = useState<ProviderRecord[]>([]);
  const [evaluationRows, setEvaluationRows] = useState<import('../types/upload').EvaluationJoinRow[]>([]);
  const [marketSurveys, setMarketSurveys] = useState<MarketSurveySet>({});
  const [surveyMetadata, setSurveyMetadata] = useState<Record<string, { label: string }>>({});
  const [payments, setPayments] = useState<import('../types/upload').ParsedPaymentRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const recordsWithPayments = useMemo(
    () => mergePaymentsIntoProviders(records, payments, { cycleId: paymentCycleId }),
    [records, payments, paymentCycleId]
  );

  const recordsWithEvaluation = useMemo(
    () => mergeEvaluationsIntoProviders(recordsWithPayments, evaluationRows),
    [recordsWithPayments, evaluationRows]
  );

  const mergeAll = useCallback((providers: ProviderRecord[], surveys: MarketSurveySet) => {
    const mappings = loadSurveySpecialtyMappingSet();
    const typeToSurvey = loadProviderTypeToSurveyMapping();
    return mergeMarketIntoProvidersMulti(providers, surveys, mappings, typeToSurvey);
  }, []);

  useEffect(() => {
    let recs = loadProviderRecords();
    if (recs.length === 0) {
      recs = getSeedProviderRecords();
      saveProviderRecords(recs);
    }
    let surveys = loadMarketSurveys();
    if (Object.keys(surveys).length === 0 || (surveys[DEFAULT_SURVEY_ID]?.length === 0)) {
      surveys = { [DEFAULT_SURVEY_ID]: getSeedMarketData() };
      saveMarketSurveys(surveys);
    }
    recs = mergeAll(recs, surveys);
    setRecords(recs);

    let evals = loadEvaluationRows();
    setEvaluationRows(evals);

    setMarketSurveys(surveys);
    setSurveyMetadata(loadSurveyMetadata());

    let pay = loadPayments();
    if (pay.length === 0) {
      pay = getSeedPayments();
      savePayments(pay);
    }
    setPayments(pay);
    setLoaded(true);
  }, [mergeAll]);

  useEffect(() => {
    if (loaded) saveProviderRecords(records);
  }, [records, loaded]);
  useEffect(() => {
    if (loaded) saveEvaluationRows(evaluationRows);
  }, [evaluationRows, loaded]);
  useEffect(() => {
    if (loaded) saveMarketSurveys(marketSurveys);
  }, [marketSurveys, loaded]);
  useEffect(() => {
    if (loaded) saveSurveyMetadata(surveyMetadata);
  }, [surveyMetadata, loaded]);
  useEffect(() => {
    if (loaded) savePayments(payments);
  }, [payments, loaded]);

  const addFromUpload = useCallback((result: ProviderUploadResult, _cycleId: string = DEFAULT_CYCLE_ID) => {
    setRecords((prev) => {
      const existingIds = new Set(prev.map((r) => r.Employee_ID));
      const toAdd = result.rows.filter((r) => !existingIds.has(r.Employee_ID));
      return mergeAll([...prev, ...toAdd], marketSurveys);
    });
    return result.rows.length;
  }, [marketSurveys, mergeAll]);

  const replaceFromUpload = useCallback((result: ProviderUploadResult, _cycleId: string = DEFAULT_CYCLE_ID) => {
    const merged = mergeAll(result.rows, marketSurveys);
    setRecords(merged);
    return merged.length;
  }, [marketSurveys, mergeAll]);

  const addMarketFromUpload = useCallback((result: MarketUploadResult, surveyId: string, mode: 'replace' | 'add') => {
    const current = marketSurveys[surveyId] ?? [];
    let nextRows: import('../types/market').MarketRow[];
    if (mode === 'replace') {
      nextRows = result.rows;
    } else {
      const existingSpecs = new Set(current.map((r) => r.specialty));
      const toAdd = result.rows.filter((r) => !existingSpecs.has(r.specialty));
      nextRows = [...current, ...toAdd];
    }
    const next = { ...marketSurveys, [surveyId]: nextRows };
    setMarketSurveys(next);
    setRecords((prev) => mergeAll(prev, next));
    return mode === 'replace' ? result.rows.length : nextRows.length - current.length;
  }, [marketSurveys, mergeAll]);

  const replaceMarketFromUpload = useCallback((result: MarketUploadResult, surveyId: string) => {
    const next = { ...marketSurveys, [surveyId]: result.rows };
    setMarketSurveys(next);
    setRecords((prev) => mergeAll(prev, next));
    return result.rows.length;
  }, [marketSurveys, mergeAll]);

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

  const removeMarketRow = useCallback((surveyId: string, specialty: string) => {
    setMarketSurveys((prev) => {
      const rows = (prev[surveyId] ?? []).filter((r) => r.specialty !== specialty);
      const next = { ...prev, [surveyId]: rows };
      setRecords((recs) => mergeAll(recs, next));
      return next;
    });
  }, [mergeAll]);

  const clearAll = useCallback(() => setRecords([]), []);

  const updateProviderRecord = useCallback(
    (employeeId: string, updates: Partial<ProviderRecord>) => {
      const record = records.find((r) => r.Employee_ID === employeeId);
      if (!record) return;
      const rec = record as unknown as Record<string, unknown>;
      for (const [key, newVal] of Object.entries(updates)) {
        const oldVal = rec[key];
        if (oldVal !== newVal) {
          appendAuditEntry({
            entityType: 'provider',
            entityId: employeeId,
            field: key,
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      }
      setRecords((prev) => {
        const updated = prev.map((r) =>
          r.Employee_ID === employeeId ? { ...r, ...updates } : r
        );
        return mergeAll(updated, marketSurveys);
      });
    },
    [records, marketSurveys, mergeAll]
  );
  const clearMarket = useCallback((surveyId: string) => {
    setMarketSurveys((prev) => {
      const next = { ...prev, [surveyId]: [] };
      setRecords((recs) => mergeAll(recs, next));
      return next;
    });
  }, [mergeAll]);

  const addSurveySlot = useCallback((surveyId: string, label: string) => {
    const id = surveyId.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || surveyId.trim();
    if (!id) return false;
    setMarketSurveys((prev) => (prev[id] ? prev : { ...prev, [id]: [] }));
    setSurveyMetadata((prev) => ({ ...prev, [id]: { label: label.trim() || id } }));
    return true;
  }, []);
  const clearPayments = useCallback(() => setPayments([]), []);

  /** Flattened market rows (all surveys) for components that need "all specialties". */
  const marketData = useMemo(
    () => Object.values(marketSurveys).flat(),
    [marketSurveys]
  );

  /** Reset all data to seed/demo data (for development and testing). */
  const loadDemoData = useCallback(() => {
    const { providerRecords, marketSurveys: seedSurveys, payments, evaluationRows } = getDemoData();
    const merged = mergeAll(providerRecords, seedSurveys);
    saveProviderRecords(merged);
    saveMarketSurveys(seedSurveys);
    savePayments(payments);
    saveEvaluationRows(evaluationRows);
    setRecords(merged);
    setEvaluationRows(evaluationRows);
    setMarketSurveys(seedSurveys);
    setPayments(payments);
  }, [mergeAll]);

  return {
    records: recordsWithEvaluation,
    setRecords,
    updateProviderRecord,
    addFromUpload,
    replaceFromUpload,
    removeRecord,
    clearAll,
    marketSurveys,
    surveyMetadata,
    marketData,
    setMarketSurveys,
    addSurveySlot,
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
