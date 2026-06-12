import { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../../hooks/use-app-state';
import { getSurveyLabel, sortSurveyIdsByLabel } from '../../types/market-survey-config';
import { ImportCards } from './import-cards';
import { ProviderTable } from './provider-table';
import { MarketTable } from './market-table';
import { EvaluationTable } from './evaluation-table';
import { SpecialtyMap } from './specialty-map';
import { useCustomStreams } from '../../hooks/use-custom-streams';
import { CustomStreamsTable } from './custom-streams-table';
import { AuditLogTab } from './audit-log-tab';
import { EmptyStatePanel } from '../../components/empty-state-panel';
import { BackupControls } from '../../components/backup-controls';
import { useAppNavigation } from '../../context/app-navigation-context';

export type DataTab = 'provider' | 'market' | 'evaluation' | 'specialty-map' | 'custom' | 'audit';
export type DataPageFocus = 'import' | 'browse';

function withCount(label: string, count: number): string {
  return count > 0 ? `${label} · ${count}` : label;
}

interface DataPageProps {
  focus?: DataPageFocus;
  /** When set, render only this tab without the tab bar (e.g. standalone Specialty Map from nav). */
  standaloneTab?: DataTab;
  /** Navigate to Parameters → Provider type → Market survey (Specialty map empty states). */
  onOpenProviderTypeSurvey?: () => void;
}

export function DataPage({
  focus = 'browse',
  standaloneTab,
  onOpenProviderTypeSurvey,
}: DataPageProps) {
  const { location, navigate } = useAppNavigation();
  const [activeTab, setActiveTab] = useState<DataTab>(
    standaloneTab ?? location.dataTab ?? 'provider'
  );
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
    if (totalMarketRows > 0 || evaluationRows.length > 0 || customDatasets.length > 0) {
      return true;
    }
    if (customStreamDefinitions.length > 0) return true;
    return false;
  }, [
    totalMarketRows,
    evaluationRows.length,
    customDatasets.length,
    customStreamDefinitions.length,
  ]);

  const TABS: { id: DataTab; label: string }[] = useMemo(() => [
    { id: 'provider', label: withCount('Provider data', records.length) },
    { id: 'market', label: withCount('Market survey', totalMarketRows) },
    { id: 'evaluation', label: withCount('Evaluations', evaluationRows.length) },
    { id: 'specialty-map', label: 'Specialty map' },
    { id: 'custom', label: 'Custom data' },
    { id: 'audit', label: 'Audit log' },
  ], [records.length, totalMarketRows, evaluationRows.length]);

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

  useEffect(() => {
    if (standaloneTab || focus !== 'browse' || location.view !== 'data-browser') return;
    if (location.dataTab && location.dataTab !== activeTab) {
      setActiveTab(location.dataTab);
    }
  }, [location.dataTab, location.view, standaloneTab, focus, activeTab]);

  const selectDataTab = (tab: DataTab) => {
    setActiveTab(tab);
    if (focus === 'browse' && !standaloneTab) {
      navigate({ view: 'data-browser', dataTab: tab }, { replace: true });
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-500 font-medium">
        Loading…
      </div>
    );
  }

  if (focus === 'import') {
    return <ImportCards />;
  }

  const showTabBar = !standaloneTab;
  const hasAnyData =
    records.length > 0 ||
    totalMarketRows > 0 ||
    evaluationRows.length > 0 ||
    customDatasets.length > 0;

  return (
    <div className="space-y-6">
      {showTabBar && (
        <div className="flex flex-wrap items-center gap-3">
          {hasAnyData && (
            <div className="app-segmented-track w-fit flex flex-wrap">
              {TABS.map(({ id, label }, idx) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectDataTab(id)}
                  className={`app-segmented-segment shrink-0 ${idx === 0 ? 'rounded-l-full' : ''} ${
                    idx === TABS.length - 1 ? 'rounded-r-full' : ''
                  } ${activeTab === id ? 'app-segmented-segment-active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <BackupControls className="ml-auto" />
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

      {activeTab === 'custom' && (
        <CustomStreamsTable
          definitions={customStreamDefinitions}
          getStreamData={getStreamData}
        />
      )}

      {activeTab === 'audit' && <AuditLogTab />}
    </div>
  );
}
