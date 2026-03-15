import { useState, useMemo } from 'react';
import { useAppState } from '../../hooks/use-app-state';
import { SURVEY_LABELS, getSurveyLabel } from '../../types/market-survey-config';
import { ImportCards } from './import-cards';
import { ProviderTable } from './provider-table';
import { MarketTable } from './market-table';
import { PaymentsTable } from './payments-table';
import { EvaluationTable } from './evaluation-table';
import { SpecialtyMap } from './specialty-map';

export type DataTab = 'provider' | 'market' | 'evaluation' | 'specialty-map' | 'payments';
export type DataPageFocus = 'import' | 'browse';

const TABS: { id: DataTab; label: string }[] = [
  { id: 'provider', label: 'Provider data' },
  { id: 'market', label: 'Market survey data' },
  { id: 'evaluation', label: 'Evaluations' },
  { id: 'specialty-map', label: 'Specialty map' },
  { id: 'payments', label: 'Payments' },
];

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
    loaded,
  } = useAppState();
  const [selectedMarketSurveyId, setSelectedMarketSurveyId] = useState<string>('physicians');

  const surveyIds = useMemo(() => {
    const fromData = Object.keys(marketSurveys);
    const fromLabels = Object.keys(SURVEY_LABELS);
    return [...new Set([...fromLabels, ...fromData])];
  }, [marketSurveys]);

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
    </div>
  );
}
