import { useState } from 'react';
import { useAppState } from '../../hooks/use-app-state';
import type { ProviderUploadResult, MarketUploadResult, PaymentUploadResult, EvaluationUploadResult } from '../../types';
import { UploadAndMapping } from './upload-and-mapping';
import { ProviderTable } from './provider-table';
import { MarketUpload } from './market-upload';
import { MarketTable } from './market-table';
import { PaymentsUpload } from './payments-upload';
import { PaymentsTable } from './payments-table';
import { EvaluationUpload } from './evaluation-upload';
import { EvaluationTable } from './evaluation-table';
import { SpecialtyMap } from './specialty-map';

type DataTab = 'provider' | 'market' | 'evaluation' | 'specialty-map' | 'payments';

const TABS: { id: DataTab; label: string }[] = [
  { id: 'provider', label: 'Provider data' },
  { id: 'market', label: 'Market survey data' },
  { id: 'evaluation', label: 'Evaluations' },
  { id: 'specialty-map', label: 'Specialty map' },
  { id: 'payments', label: 'Payments' },
];

export function DataPage() {
  const [activeTab, setActiveTab] = useState<DataTab>('provider');
  const {
    records,
    setRecords,
    addFromUpload,
    replaceFromUpload,
    removeRecord,
    clearAll,
    marketData,
    addMarketFromUpload,
    replaceMarketFromUpload,
    removeMarketRow,
    clearMarket,
    evaluationRows,
    addEvaluationFromUpload,
    replaceEvaluationFromUpload,
    clearEvaluations,
    payments,
    addPaymentsFromUpload,
    replacePaymentsFromUpload,
    clearPayments,
    loaded,
    loadDemoData,
  } = useAppState();
  const [cycleId, setCycleId] = useState('FY2025');

  const handleProviderUpload = (result: ProviderUploadResult, cycle: string, mode: 'replace' | 'add') => {
    if (mode === 'replace') replaceFromUpload(result, cycle);
    else addFromUpload(result, cycle);
  };

  const handleMarketUpload = (result: MarketUploadResult, mode: 'replace' | 'add') => {
    if (mode === 'replace') replaceMarketFromUpload(result);
    else addMarketFromUpload(result, mode);
  };

  const handleEvaluationUpload = (result: EvaluationUploadResult, mode: 'replace' | 'add') => {
    if (mode === 'replace') replaceEvaluationFromUpload(result);
    else addEvaluationFromUpload(result, mode);
  };

  const handlePaymentsUpload = (result: PaymentUploadResult, mode: 'replace' | 'add') => {
    if (mode === 'replace') replacePaymentsFromUpload(result);
    else addPaymentsFromUpload(result, mode);
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-500 font-medium">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        <button
          type="button"
          onClick={loadDemoData}
          className="px-3 py-2 text-sm font-medium text-amber-800 bg-amber-100 border border-amber-200 rounded-xl hover:bg-amber-200 transition-colors"
          title="Replace all data with seed data for development and testing"
        >
          Load demo data
        </button>
      </div>

      {activeTab === 'provider' && (
        <div className="space-y-4">
          <UploadAndMapping
            onUpload={handleProviderUpload}
            cycleId={cycleId}
            setCycleId={setCycleId}
          />
          <ProviderTable records={records} onRemove={removeRecord} onClear={clearAll} />
        </div>
      )}

      {activeTab === 'market' && (
        <div className="space-y-4">
          <MarketUpload onUpload={handleMarketUpload} />
          <MarketTable rows={marketData} onRemove={removeMarketRow} onClear={clearMarket} />
        </div>
      )}

      {activeTab === 'evaluation' && (
        <div className="space-y-4">
          <EvaluationUpload onUpload={handleEvaluationUpload} />
          <EvaluationTable rows={evaluationRows} onClear={clearEvaluations} />
        </div>
      )}

      {activeTab === 'specialty-map' && (
        <SpecialtyMap records={records} marketData={marketData} setRecords={setRecords} />
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          <PaymentsUpload onUpload={handlePaymentsUpload} />
          <PaymentsTable rows={payments} onClear={clearPayments} />
        </div>
      )}
    </div>
  );
}
