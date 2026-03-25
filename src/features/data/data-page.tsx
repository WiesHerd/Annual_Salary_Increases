import { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../../hooks/use-app-state';
import { getSurveyLabel, sortSurveyIdsByLabel } from '../../types/market-survey-config';
import { ImportCards } from './import-cards';
import { ProviderTable } from './provider-table';
import { MarketTable } from './market-table';
import { PaymentsTable } from './payments-table';
import { EvaluationTable } from './evaluation-table';
import { SpecialtyMap } from './specialty-map';
import { useCustomStreams } from '../../hooks/use-custom-streams';
import { CustomStreamsTable } from './custom-streams-table';
import { EmptyStatePanel } from '../../components/empty-state-panel';

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
  /** Navigate to Parameters → Provider type → Market survey (Specialty map empty states). */
  onOpenProviderTypeSurvey?: () => void;
}

export function DataPage({
  focus = 'browse',
  onNavigateToBrowser,
  initialTab,
  standaloneTab,
  onOpenProviderTypeSurvey,
}: DataPageProps) {
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
    loadDemoData,
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
  const [selectedMarketSurveyId, setSelectedMarketSurveyId] = useState<string>('');

  const totalMarketRows = useMemo(
    () => Object.values(marketSurveys).reduce((acc, rows) => acc + rows.length, 0),
    [marketSurveys],
  );

  const hasOtherImportedData = useMemo(() => {
    if (totalMarketRows > 0 || evaluationRows.length > 0 || payments.length > 0 || customDatasets.length > 0) {
      return true;
    }
    if (customStreamDefinitions.length > 0) return true;
    return false;
  }, [
    totalMarketRows,
    evaluationRows.length,
    payments.length,
    customDatasets.length,
    customStreamDefinitions.length,
  ]);

  const TABS: { id: DataTab; label: string }[] = useMemo(() => [
    { id: 'provider', label: withCount('Provider data', records.length) },
    { id: 'market', label: withCount('Market survey', totalMarketRows) },
    { id: 'evaluation', label: withCount('Evaluations', evaluationRows.length) },
    { id: 'specialty-map', label: 'Specialty map' },
    { id: 'payments', label: withCount('Payments', payments.length) },
    { id: 'custom', label: 'Custom data' },
  ], [records.length, totalMarketRows, evaluationRows.length, payments.length]);

  const surveyIds = useMemo(() => {
    const withRows = Object.keys(marketSurveys).filter((id) => (marketSurveys[id]?.length ?? 0) > 0);
    return sortSurveyIdsByLabel(withRows, surveyMetadata);
  }, [marketSurveys, surveyMetadata]);

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
  const hasAnyData =
    records.length > 0 ||
    totalMarketRows > 0 ||
    evaluationRows.length > 0 ||
    payments.length > 0 ||
    customDatasets.length > 0;

  return (
    <div className="space-y-6">
      {showTabBar && hasAnyData && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="app-segmented-track w-fit flex flex-wrap">
            {TABS.map(({ id, label }, idx) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`app-segmented-segment shrink-0 ${idx === 0 ? 'rounded-l-full' : ''} ${
                  idx === TABS.length - 1 ? 'rounded-r-full' : ''
                } ${activeTab === id ? 'app-segmented-segment-active' : ''}`}
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
          onLoadSampleData={loadDemoData}
          hasOtherImportedData={hasOtherImportedData}
          customDatasets={customDatasets}
          customStreamLookups={customStreamLookups}
        />
      )}

      {activeTab === 'market' && (
        <div className="space-y-4">
          {surveyIds.length === 0 ? (
            <EmptyStatePanel
              title="Market surveys"
              message="No market data yet."
              compact
            />
          ) : (
            <>
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
                surveyId={selectedMarketSurveyId || surveyIds[0]}
                surveyLabel={getSurveyLabel(selectedMarketSurveyId || surveyIds[0], surveyMetadata)}
                rows={marketSurveys[selectedMarketSurveyId || surveyIds[0]] ?? []}
                onRemove={removeMarketRow}
                onClear={clearMarket}
              />
            </>
          )}
        </div>
      )}

      {activeTab === 'evaluation' && (
        <EvaluationTable rows={evaluationRows} onClear={clearEvaluations} />
      )}

      {activeTab === 'specialty-map' && (
        <SpecialtyMap
          records={records}
          marketSurveys={marketSurveys}
          surveyMetadata={surveyMetadata}
          setRecords={setRecords}
          onOpenProviderTypeSurvey={onOpenProviderTypeSurvey}
        />
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
