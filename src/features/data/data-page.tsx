import { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../../hooks/use-app-state';
import { SURVEY_LABELS, getSurveyLabel } from '../../types/market-survey-config';
import { ImportCards } from './import-cards';
import { ProviderTable } from './provider-table';
import { MarketTable } from './market-table';
import { PaymentsTable } from './payments-table';
import { EvaluationTable } from './evaluation-table';
import { SpecialtyMap } from './specialty-map';
import { useCustomStreams } from '../../hooks/use-custom-streams';
import { CustomStreamsTable } from './custom-streams-table';

export type DataTab = 'provider' | 'market' | 'evaluation' | 'specialty-map' | 'payments' | 'custom';
export type DataPageFocus = 'import' | 'browse';

function withCount(label: string, count: number): string {
  return count > 0 ? `${label} · ${count}` : label;
}

interface DataPageProps {
  focus?: DataPageFocus;
  onNavigateToBrowser?: (tab?: DataTab) => void;
  initialTab?: DataTab;
  /** When set, render only this tab without the tab bar (e.g. standalone Specialty Map from nav). */
  standaloneTab?: DataTab;
}

export function DataPage({ focus = 'browse', onNavigateToBrowser, initialTab, standaloneTab }: DataPageProps) {
  const [activeTab, setActiveTab] = useState<DataTab>(standaloneTab ?? initialTab ?? 'provider');
  const {
    records,
    setRecords,
    updateProviderRecord,
    removeRecord,
    clearAll,
    marketSurveys,
    marketData,
    surveyMetadata,
    removeMarketRow,
    clearMarket,
    evaluationRows,
    clearEvaluations,
    payments,
    clearPayments,
    customDatasets,
    loaded,
  } = useAppState();
  const { definitions: customStreamDefinitions, getStreamData, buildProviderLookup } = useCustomStreams();
  const customStreamLookups = useMemo(() => {
    return customStreamDefinitions
      .filter((d) => d.linkType === 'provider')
      .map((d) => {
        const data = getStreamData(d.id);
        return {
          label: d.label,
          columnOrder: data?.columnOrder ?? [],
          getRow: buildProviderLookup(d.id),
        };
      });
  }, [customStreamDefinitions, getStreamData, buildProviderLookup]);
  const [selectedMarketSurveyId, setSelectedMarketSurveyId] = useState<string>('physicians');

  const totalMarketRows = useMemo(
    () => Object.values(marketSurveys).reduce((acc, rows) => acc + rows.length, 0),
    [marketSurveys],
  );

  const TABS: { id: DataTab; label: string }[] = useMemo(() => [
    { id: 'provider', label: withCount('Provider data', records.length) },
    { id: 'market', label: withCount('Market survey', totalMarketRows) },
    { id: 'evaluation', label: withCount('Evaluations', evaluationRows.length) },
    { id: 'specialty-map', label: 'Specialty map' },
    { id: 'payments', label: withCount('Payments', payments.length) },
    { id: 'custom', label: 'Custom data' },
  ], [records.length, totalMarketRows, evaluationRows.length, payments.length]);

  const surveyIds = useMemo(() => {
    const allIds = [...new Set([...Object.keys(SURVEY_LABELS), ...Object.keys(marketSurveys)])];
    return allIds.filter((id) => (marketSurveys[id]?.length ?? 0) > 0);
  }, [marketSurveys]);

  // If the selected survey no longer has data, fall back to the first available one.
  useEffect(() => {
    if (surveyIds.length > 0 && !surveyIds.includes(selectedMarketSurveyId)) {
      setSelectedMarketSurveyId(surveyIds[0]);
    }
  }, [surveyIds, selectedMarketSurveyId]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-500 font-medium">
        Loading…
      </div>
    );
  }

  if (focus === 'import' && onNavigateToBrowser) {
    return <ImportCards onNavigateToBrowser={onNavigateToBrowser} />;
  }

  const showTabBar = !standaloneTab;

  return (
    <div className="space-y-6">
      {showTabBar && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'provider' && (
        <ProviderTable
          records={records}
          marketSpecialties={marketData.map((r) => r.specialty)}
          onUpdate={updateProviderRecord}
          onRemove={removeRecord}
          onClear={clearAll}
          customDatasets={customDatasets}
          customStreamLookups={customStreamLookups}
        />
      )}

      {activeTab === 'market' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
            {surveyIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedMarketSurveyId(id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedMarketSurveyId === id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                {getSurveyLabel(id, surveyMetadata)}
              </button>
            ))}
          </div>
          <MarketTable
            surveyId={selectedMarketSurveyId}
            surveyLabel={getSurveyLabel(selectedMarketSurveyId, surveyMetadata)}
            rows={marketSurveys[selectedMarketSurveyId] ?? []}
            onRemove={removeMarketRow}
            onClear={clearMarket}
          />
        </div>
      )}

      {activeTab === 'evaluation' && (
        <EvaluationTable rows={evaluationRows} onClear={clearEvaluations} />
      )}

      {activeTab === 'specialty-map' && (
        <SpecialtyMap records={records} marketSurveys={marketSurveys} surveyMetadata={surveyMetadata} setRecords={setRecords} />
      )}

      {activeTab === 'payments' && (
        <PaymentsTable rows={payments} onClear={clearPayments} />
      )}

      {activeTab === 'custom' && (
        <CustomStreamsTable
          definitions={customStreamDefinitions}
          getStreamData={getStreamData}
        />
      )}
    </div>
  );
}
