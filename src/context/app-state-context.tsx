/**
 * App-wide provider/market/evaluation state. Requires ParametersStateProvider above.
 * TCC incentive components live on each provider row (provider upload).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ProviderRecord } from '../types/provider';
import type {
  ProviderUploadResult,
  MarketUploadResult,
  EvaluationUploadResult,
  CustomDataset,
  CustomUploadResult,
} from '../types';
import type { MarketSurveySet } from '../types/market-survey-config';
import { DEFAULT_SURVEY_ID } from '../types/market-survey-config';
import {
  loadProviderRecordsWithMeta,
  saveProviderRecords,
  loadMarketSurveys,
  loadMarketSurveysPersistedOrEmpty,
  saveMarketSurveys,
  loadSurveyMetadata,
  saveSurveyMetadata,
  loadEvaluationRows,
  saveEvaluationRows,
  loadCustomDatasets,
  saveCustomDatasets,
  clearLegacyPaymentLinesStorage,
} from '../lib/storage';
import { appendAuditEntry } from '../lib/audit';
import { getDemoData, getSeedProviderRecords, getSeedMarketSurveys } from '../lib/seed-data';
import {
  loadSurveySpecialtyMappingSet,
  loadProviderTypeToSurveyMapping,
  saveSurveySpecialtyMappingSet,
  saveProviderTypeToSurveyMapping,
  saveExperienceBands,
} from '../lib/parameters-storage';
import {
  SAMPLE_SURVEY_SPECIALTY_MAPPING_SET,
  SAMPLE_PROVIDER_TYPE_TO_SURVEY,
  SAMPLE_EXPERIENCE_BANDS,
} from '../lib/parameters-sample-data';
import type { SurveySpecialtyMappingSet } from '../types/market-survey-config';
import type { ExperienceBand } from '../types/experience-band';
import { mergeMarketIntoProvidersMulti, mergeEvaluationsIntoProviders } from '../lib/joins';
import {
  ASI_CLEAR_ALL_APP_DATA_EVENT,
  clearAllCustomStreamStorage,
} from '../lib/custom-stream-storage';
import { inferMissingProviderTypes } from '../lib/infer-missing-provider-type';
import { DEFAULT_CYCLE_ID } from '../lib/parse-file';
import { mapProvidersWithDerivedTcc } from '../lib/tcc-components';
import { safeLocalStorageSetItem } from '../lib/safe-local-storage';
import { useParametersState } from '../hooks/use-parameters-state';
import { loadTccCalculationSettings } from '../lib/parameters-storage';

export type AppStateValue = {
  records: ProviderRecord[];
  setRecords: React.Dispatch<React.SetStateAction<ProviderRecord[]>>;
  updateProviderRecord: (employeeId: string, updates: Partial<ProviderRecord>) => void;
  addFromUpload: (result: ProviderUploadResult, cycleId?: string) => number;
  replaceFromUpload: (result: ProviderUploadResult, cycleId?: string) => number;
  removeRecord: (employeeId: string) => void;
  clearAll: () => void;
  marketSurveys: MarketSurveySet;
  surveyMetadata: Record<string, { label: string }>;
  marketData: import('../types/market').MarketRow[];
  setMarketSurveys: React.Dispatch<React.SetStateAction<MarketSurveySet>>;
  addSurveySlot: (surveyId: string, label: string) => boolean;
  addMarketFromUpload: (result: MarketUploadResult, surveyId: string, mode: 'replace' | 'add') => number;
  replaceMarketFromUpload: (result: MarketUploadResult, surveyId: string) => number;
  removeMarketRow: (surveyId: string, specialty: string) => void;
  clearMarket: (surveyId: string) => void;
  evaluationRows: import('../types/upload').EvaluationJoinRow[];
  addEvaluationFromUpload: (result: EvaluationUploadResult, mode: 'replace' | 'add') => number;
  replaceEvaluationFromUpload: (result: EvaluationUploadResult) => number;
  clearEvaluations: () => void;
  customDatasets: CustomDataset[];
  addCustomDataset: (name: string, result: CustomUploadResult, joinKeyColumn: string | null) => string;
  replaceCustomDataset: (
    id: string,
    name: string,
    result: CustomUploadResult,
    joinKeyColumn: string | null
  ) => void;
  removeCustomDataset: (id: string) => void;
  clearCustomDatasets: () => void;
  loaded: boolean;
  loadDemoData: () => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

/**
 * Sample providers/market/incentives are injected only after the user explicitly loads demo data
 * (`asi-demo-mode === 'true'`). That way clearing site data or wiping localStorage does not
 * immediately repopulate from the bundled seed — there is no server; the dataset ships in JS.
 */
function allowAutoSeedData(): boolean {
  try {
    return localStorage.getItem('asi-demo-mode') === 'true';
  } catch {
    return false;
  }
}

function AppStateProviderInner({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<ProviderRecord[]>([]);
  const [evaluationRows, setEvaluationRows] = useState<import('../types/upload').EvaluationJoinRow[]>([]);
  const [marketSurveys, setMarketSurveys] = useState<MarketSurveySet>({});
  const [surveyMetadata, setSurveyMetadata] = useState<Record<string, { label: string }>>({});
  const [customDatasets, setCustomDatasets] = useState<CustomDataset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { tccCalculationSettings, loaded: paramsLoaded } = useParametersState();

  const recordsWithEvaluation = useMemo(
    () => mergeEvaluationsIntoProviders(records, evaluationRows),
    [records, evaluationRows]
  );

  const mergeAll = useCallback((providers: ProviderRecord[], surveys: MarketSurveySet) => {
    const mappings = loadSurveySpecialtyMappingSet();
    const typeToSurvey = loadProviderTypeToSurveyMapping();
    return mergeMarketIntoProvidersMulti(providers, surveys, mappings, typeToSurvey);
  }, []);

  const applyMarketAndTcc = useCallback(
    (providerRows: ProviderRecord[], surveys: MarketSurveySet) =>
      mapProvidersWithDerivedTcc(mergeAll(providerRows, surveys), tccCalculationSettings),
    [mergeAll, tccCalculationSettings]
  );

  const marketSurveysRef = useRef(marketSurveys);
  marketSurveysRef.current = marketSurveys;

  useEffect(() => {
    const allowSeed = allowAutoSeedData();

    const { records: recsFromStorage, hasStoredProviderState } = loadProviderRecordsWithMeta();
    let recs = recsFromStorage;
    // Only inject sample providers when nothing was ever saved. Persisted `[]` means user cleared — never re-seed.
    if (recs.length === 0 && allowSeed && !hasStoredProviderState) {
      recs = getSeedProviderRecords();
      saveProviderRecords(recs);
      safeLocalStorageSetItem('asi-demo-mode', 'true');
    }
    recs = inferMissingProviderTypes(recs);
    let surveys = allowSeed ? loadMarketSurveys() : loadMarketSurveysPersistedOrEmpty();
    const seedMarketSurveys = getSeedMarketSurveys();
    if (allowSeed) {
      if (Object.keys(surveys).length === 0 || (surveys[DEFAULT_SURVEY_ID]?.length === 0)) {
        surveys = { ...seedMarketSurveys };
        saveMarketSurveys(surveys);
      } else {
        const merged = { ...surveys };
        let backfill = false;
        for (const [id, rows] of Object.entries(seedMarketSurveys)) {
          if (!merged[id]?.length) {
            merged[id] = rows;
            backfill = true;
          }
        }
        if (backfill) {
          saveMarketSurveys(merged);
          surveys = merged;
        }
      }
    }
    recs = mapProvidersWithDerivedTcc(mergeAll(recs, surveys), loadTccCalculationSettings());
    setRecords(recs);

    const evals = loadEvaluationRows();
    setEvaluationRows(evals);

    setMarketSurveys(surveys);
    setSurveyMetadata(loadSurveyMetadata());

    setCustomDatasets(loadCustomDatasets());
    setLoaded(true);
  }, [mergeAll]);

  useEffect(() => {
    if (!loaded || !paramsLoaded) return;
    setRecords((prev) => applyMarketAndTcc(prev, marketSurveysRef.current));
  }, [tccCalculationSettings, loaded, paramsLoaded, applyMarketAndTcc]);

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
    if (loaded) saveCustomDatasets(customDatasets);
  }, [customDatasets, loaded]);

  const addFromUpload = useCallback(
    (result: ProviderUploadResult, _cycleId: string = DEFAULT_CYCLE_ID) => {
      safeLocalStorageSetItem('asi-demo-mode', 'false');
      setRecords((prev) => {
        const existingIds = new Set(prev.map((r) => r.Employee_ID));
        const toAdd = result.rows.filter((r) => !existingIds.has(r.Employee_ID));
        return applyMarketAndTcc([...prev, ...toAdd], marketSurveys);
      });
      return result.rows.length;
    },
    [marketSurveys, applyMarketAndTcc]
  );

  const replaceFromUpload = useCallback(
    (result: ProviderUploadResult, _cycleId: string = DEFAULT_CYCLE_ID) => {
      safeLocalStorageSetItem('asi-demo-mode', 'false');
      const merged = applyMarketAndTcc(result.rows, marketSurveys);
      setRecords(merged);
      return merged.length;
    },
    [marketSurveys, applyMarketAndTcc]
  );

  const addMarketFromUpload = useCallback(
    (result: MarketUploadResult, surveyId: string, mode: 'replace' | 'add') => {
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
      setRecords((prev) => applyMarketAndTcc(prev, next));
      return mode === 'replace' ? result.rows.length : nextRows.length - current.length;
    },
    [marketSurveys, applyMarketAndTcc]
  );

  const replaceMarketFromUpload = useCallback(
    (result: MarketUploadResult, surveyId: string) => {
      const next = { ...marketSurveys, [surveyId]: result.rows };
      setMarketSurveys(next);
      setRecords((prev) => applyMarketAndTcc(prev, next));
      return result.rows.length;
    },
    [marketSurveys, applyMarketAndTcc]
  );

  const addEvaluationFromUpload = useCallback(
    (result: EvaluationUploadResult, mode: 'replace' | 'add') => {
      if (mode === 'replace') {
        setEvaluationRows(result.rows);
        return result.rows.length;
      }
      const byId = new Set(evaluationRows.map((r) => r.Employee_ID));
      const toAdd = result.rows.filter((r) => !byId.has(r.Employee_ID));
      setEvaluationRows((prev) => [...prev, ...toAdd]);
      return toAdd.length;
    },
    [evaluationRows]
  );

  const replaceEvaluationFromUpload = useCallback((result: EvaluationUploadResult) => {
    setEvaluationRows(result.rows);
    return result.rows.length;
  }, []);

  const clearEvaluations = useCallback(() => setEvaluationRows([]), []);

  const removeRecord = useCallback((employeeId: string) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.Employee_ID !== employeeId);
      if (next.length === 0) {
        safeLocalStorageSetItem('asi-demo-mode', 'false');
        // Persist immediately so a fast refresh cannot reload the previous list before effects run.
        saveProviderRecords([]);
      }
      return next;
    });
  }, []);

  const removeMarketRow = useCallback(
    (surveyId: string, specialty: string) => {
      setMarketSurveys((prev) => {
        const rows = (prev[surveyId] ?? []).filter((r) => r.specialty !== specialty);
        const next = { ...prev, [surveyId]: rows };
        setRecords((recs) => applyMarketAndTcc(recs, next));
        return next;
      });
    },
    [applyMarketAndTcc]
  );

  const clearAll = useCallback(() => {
    safeLocalStorageSetItem('asi-demo-mode', 'false');
    saveProviderRecords([]);
    saveMarketSurveys({});
    saveSurveyMetadata({});
    saveEvaluationRows([]);
    clearLegacyPaymentLinesStorage();
    saveCustomDatasets([]);
    clearAllCustomStreamStorage();
    setRecords([]);
    setMarketSurveys({});
    setSurveyMetadata({});
    setEvaluationRows([]);
    setCustomDatasets([]);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(ASI_CLEAR_ALL_APP_DATA_EVENT));
    }
  }, []);

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
        const updated = prev.map((r) => (r.Employee_ID === employeeId ? { ...r, ...updates } : r));
        return applyMarketAndTcc(updated, marketSurveys);
      });
    },
    [records, marketSurveys, applyMarketAndTcc]
  );

  const clearMarket = useCallback(
    (surveyId: string) => {
      safeLocalStorageSetItem('asi-demo-mode', 'false');
      setMarketSurveys((prev) => {
        const next = { ...prev, [surveyId]: [] };
        setRecords((recs) => applyMarketAndTcc(recs, next));
        return next;
      });
    },
    [applyMarketAndTcc]
  );

  const addSurveySlot = useCallback((surveyId: string, label: string) => {
    const id =
      surveyId.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || surveyId.trim();
    if (!id) return false;
    setMarketSurveys((prev) => (prev[id] ? prev : { ...prev, [id]: [] }));
    setSurveyMetadata((prev) => ({ ...prev, [id]: { label: label.trim() || id } }));
    return true;
  }, []);

  const addCustomDataset = useCallback(
    (name: string, result: CustomUploadResult, joinKeyColumn: string | null) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const dataset: CustomDataset = {
        id,
        name: name.trim() || 'Custom data',
        joinKeyColumn,
        columns: result.columns,
        rows: result.rows,
      };
      setCustomDatasets((prev) => [...prev, dataset]);
      return id;
    },
    []
  );

  const replaceCustomDataset = useCallback(
    (id: string, name: string, result: CustomUploadResult, joinKeyColumn: string | null) => {
      setCustomDatasets((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                name: name.trim() || d.name,
                joinKeyColumn,
                columns: result.columns,
                rows: result.rows,
              }
            : d
        )
      );
    },
    []
  );

  const removeCustomDataset = useCallback((id: string) => {
    setCustomDatasets((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearCustomDatasets = useCallback(() => setCustomDatasets([]), []);

  const marketData = useMemo(() => Object.values(marketSurveys).flat(), [marketSurveys]);

  const loadDemoData = useCallback(() => {
    const { providerRecords, marketSurveys: seedSurveys, evaluationRows: demoEval } = getDemoData();
    const merged = applyMarketAndTcc(providerRecords, seedSurveys);
    saveProviderRecords(merged);
    saveMarketSurveys(seedSurveys);
    saveSurveySpecialtyMappingSet(
      JSON.parse(JSON.stringify(SAMPLE_SURVEY_SPECIALTY_MAPPING_SET)) as SurveySpecialtyMappingSet
    );
    saveProviderTypeToSurveyMapping({ ...SAMPLE_PROVIDER_TYPE_TO_SURVEY });
    saveExperienceBands(JSON.parse(JSON.stringify(SAMPLE_EXPERIENCE_BANDS)) as ExperienceBand[]);
    clearLegacyPaymentLinesStorage();
    saveEvaluationRows(demoEval);
    saveCustomDatasets([]);
    setRecords(merged);
    setEvaluationRows(demoEval);
    setMarketSurveys(seedSurveys);
    setCustomDatasets([]);
    safeLocalStorageSetItem('asi-demo-mode', 'true');
  }, [applyMarketAndTcc]);

  const value = useMemo(
    (): AppStateValue => ({
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
      customDatasets,
      addCustomDataset,
      replaceCustomDataset,
      removeCustomDataset,
      clearCustomDatasets,
      loaded,
      loadDemoData,
    }),
    [
      recordsWithEvaluation,
      updateProviderRecord,
      addFromUpload,
      replaceFromUpload,
      removeRecord,
      clearAll,
      marketSurveys,
      surveyMetadata,
      marketData,
      addSurveySlot,
      addMarketFromUpload,
      replaceMarketFromUpload,
      removeMarketRow,
      clearMarket,
      evaluationRows,
      addEvaluationFromUpload,
      replaceEvaluationFromUpload,
      clearEvaluations,
      customDatasets,
      addCustomDataset,
      replaceCustomDataset,
      removeCustomDataset,
      clearCustomDatasets,
      loaded,
      loadDemoData,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  return <AppStateProviderInner>{children}</AppStateProviderInner>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return ctx;
}
