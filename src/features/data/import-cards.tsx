/**
 * Card-based Import screen. Upload cards for Provider, Market survey, Evaluations, Payments.
 * No data tables — user navigates to Data browser to view records.
 * Uses app design tokens for consistent look and feel.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useAppState } from '../../hooks/use-app-state';
import type {
  ProviderUploadResult,
  MarketUploadResult,
  PaymentUploadResult,
  EvaluationUploadResult,
} from '../../types';
import { SURVEY_LABELS, getSurveyLabel } from '../../types/market-survey-config';
import { UploadAndMapping } from './upload-and-mapping';
import { MarketUpload } from './market-upload';
import { PaymentsUpload } from './payments-upload';
import { EvaluationUpload } from './evaluation-upload';

type UploadCardType = 'provider' | 'market' | 'evaluation' | 'payments';

type DataBrowserTab = 'provider' | 'market' | 'evaluation' | 'specialty-map' | 'payments';

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function AddSurveyModal({
  existingIds,
  onClose,
  onAdd,
}: {
  existingIds: string[];
  onClose: () => void;
  onAdd: (surveyId: string, label: string) => void;
}) {
  const [label, setLabel] = useState('');
  const derivedId = label.trim() ? slugify(label) : '';
  const isDuplicate = Boolean(derivedId && existingIds.includes(derivedId));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || isDuplicate) return;
    onAdd(derivedId, label.trim());
  };
  return (
    <div
      className="app-card shadow-xl max-w-md w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-5">
        <h3 className="text-lg font-semibold text-slate-800">Add survey slot</h3>
        <p className="text-sm text-slate-500 mt-1">
          Create a new survey slot for vendor-specific data (e.g. Sullivan Cotter APP, MGMA Physicians).
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="add-survey-label" className="block text-sm font-medium text-slate-700">Survey name</label>
            <input
              id="add-survey-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Sullivan Cotter APP"
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {derivedId && (
              <p className="mt-1 text-xs text-slate-500">ID: {derivedId}</p>
            )}
            {isDuplicate && (
              <p className="mt-1 text-xs text-amber-700">A survey with this ID already exists.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="app-btn-secondary">Cancel</button>
            <button
              type="submit"
              disabled={!label.trim() || isDuplicate}
              className="app-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add survey
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ImportCardsProps {
  onNavigateToBrowser: (tab?: DataBrowserTab) => void;
}

const TEMPLATES: Record<string, string> = {
  provider: '/sample-providers.csv',
  market: '/sample-market.csv',
  payments: '/sample-payments.csv',
  evaluation: '/sample-evaluations.csv',
};

/** Shared icon container - light green to match reference */
const ICON_WRAPPER = 'rounded-lg bg-emerald-100 p-2.5 text-emerald-700 shrink-0';
const ICON_SIZE = 'w-7 h-7';

function CardIcon({ type }: { type: UploadCardType }) {
  const cls = ICON_SIZE;
  switch (type) {
    case 'provider':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'market':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'evaluation':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case 'payments':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
}

export function ImportCards({ onNavigateToBrowser }: ImportCardsProps) {
  const [cycleId, setCycleId] = useState('FY2025');
  const [selectedMarketSurveyId, setSelectedMarketSurveyId] = useState('physicians');
  const [modalOpen, setModalOpen] = useState<UploadCardType | null>(null);
  const [addSurveyModalOpen, setAddSurveyModalOpen] = useState(false);
  const [surveyDropdownOpen, setSurveyDropdownOpen] = useState(false);
  const [surveySearch, setSurveySearch] = useState('');
  const surveyDropdownRef = useRef<HTMLDivElement>(null);
  const surveySearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (surveyDropdownRef.current && !surveyDropdownRef.current.contains(e.target as Node)) {
        setSurveyDropdownOpen(false);
      }
    };
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, []);

  useEffect(() => {
    if (surveyDropdownOpen) {
      setSurveySearch('');
      queueMicrotask(() => surveySearchRef.current?.focus());
    }
  }, [surveyDropdownOpen]);

  const {
    records,
    addFromUpload,
    replaceFromUpload,
    clearAll,
    marketSurveys,
    surveyMetadata,
    addMarketFromUpload,
    replaceMarketFromUpload,
    clearMarket,
    addSurveySlot,
    evaluationRows,
    addEvaluationFromUpload,
    replaceEvaluationFromUpload,
    clearEvaluations,
    payments,
    addPaymentsFromUpload,
    replacePaymentsFromUpload,
    clearPayments,
    loaded,
  } = useAppState();

  const surveyIds = useMemo(() => {
    const fromData = Object.keys(marketSurveys);
    const fromLabels = Object.keys(SURVEY_LABELS);
    return [...new Set([...fromLabels, ...fromData])];
  }, [marketSurveys]);

  const filteredSurveyIds = useMemo(() => {
    if (!surveySearch.trim()) return surveyIds;
    const q = surveySearch.trim().toLowerCase();
    return surveyIds.filter((id) => {
      const label = getSurveyLabel(id, surveyMetadata).toLowerCase();
      return label.includes(q) || id.toLowerCase().includes(q);
    });
  }, [surveyIds, surveySearch, surveyMetadata]);

  const marketRowCount = marketSurveys[selectedMarketSurveyId]?.length ?? 0;

  const handleProviderUpload = (result: ProviderUploadResult, cycle: string, mode: 'replace' | 'add') => {
    if (mode === 'replace') replaceFromUpload(result, cycle);
    else addFromUpload(result, cycle);
    setModalOpen(null);
  };

  const handleMarketUpload = (result: MarketUploadResult, surveyId: string, mode: 'replace' | 'add') => {
    if (mode === 'replace') replaceMarketFromUpload(result, surveyId);
    else addMarketFromUpload(result, surveyId, mode);
    setModalOpen(null);
  };

  const handleEvaluationUpload = (result: EvaluationUploadResult, mode: 'replace' | 'add') => {
    if (mode === 'replace') replaceEvaluationFromUpload(result);
    else addEvaluationFromUpload(result, mode);
    setModalOpen(null);
  };

  const handlePaymentsUpload = (result: PaymentUploadResult, mode: 'replace' | 'add') => {
    if (mode === 'replace') replacePaymentsFromUpload(result);
    else addPaymentsFromUpload(result, mode);
    setModalOpen(null);
  };

  const handleDownloadTemplate = (type: UploadCardType) => {
    const url = TEMPLATES[type];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = url.split('/').pop() ?? 'template.csv';
    a.click();
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-500 font-medium">
        Loading…
      </div>
    );
  }

  const cardBase = 'app-card flex flex-col p-6 min-h-0';
  const footerDivider = 'border-t border-slate-100 mt-auto pt-3';
  const footerIcon = 'w-5 h-5';
  const ViewDataIcon = () => (
    <svg className={footerIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
  const DownloadIcon = () => (
    <svg className={footerIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
  const TrashIcon = () => (
    <svg className={footerIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M16 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Import Data</h1>
      </div>

      <div className="grid grid-cols-2 grid-rows-2 gap-6">
        {/* Provider card */}
        <div className={cardBase}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={ICON_WRAPPER}>
                <CardIcon type="provider" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-800">Provider Upload</h2>
                <p className="text-sm text-slate-500 mt-0.5">{records.length} rows loaded</p>
              </div>
            </div>
            <button type="button" onClick={() => setModalOpen('provider')} className="app-btn-primary shrink-0">
              Choose File
            </button>
          </div>
          <div className={`flex items-center gap-2 ${footerDivider}`}>
            <button type="button" onClick={() => handleDownloadTemplate('provider')} className="app-action-btn" title="Download sample template" aria-label="Download template">
              <DownloadIcon />
            </button>
            <button type="button" onClick={() => onNavigateToBrowser('provider')} className="app-action-btn" title="View in Data browser" aria-label="View in Data browser">
              <ViewDataIcon />
            </button>
            <button type="button" onClick={clearAll} className="app-action-btn-danger ml-auto" title="Clear all" aria-label="Clear all" disabled={records.length === 0}>
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* Market survey card */}
        <div className={cardBase}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={ICON_WRAPPER}>
                <CardIcon type="market" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-800">Survey upload</h2>
                <div ref={surveyDropdownRef} className="relative mt-1.5">
                  <button
                    type="button"
                    onClick={() => setSurveyDropdownOpen((o) => !o)}
                    className="flex items-center gap-1.5 min-w-0 max-w-full px-2.5 py-1.5 text-left text-sm font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors"
                    aria-expanded={surveyDropdownOpen}
                    aria-haspopup="listbox"
                  >
                    <span className="truncate text-slate-800">{getSurveyLabel(selectedMarketSurveyId, surveyMetadata)}</span>
                    <svg className="w-4 h-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {surveyDropdownOpen && (
                    <div className="absolute left-0 top-full mt-0.5 z-50 min-w-[200px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-100 p-2">
                        <input
                          ref={surveySearchRef}
                          type="search"
                          value={surveySearch}
                          onChange={(e) => setSurveySearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          placeholder="Search surveys…"
                          aria-label="Search surveys"
                          className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <ul
                        role="listbox"
                        className="max-h-52 overflow-y-auto py-1"
                        aria-label="Select survey"
                      >
                        {filteredSurveyIds.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
                        ) : (
                          filteredSurveyIds.map((id) => (
                            <li key={id} role="option" aria-selected={selectedMarketSurveyId === id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMarketSurveyId(id);
                                  setSurveyDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                  selectedMarketSurveyId === id
                                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {getSurveyLabel(id, surveyMetadata)}
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">{marketRowCount} rows loaded</p>
                <button
                  type="button"
                  onClick={() => setAddSurveyModalOpen(true)}
                  className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Add new survey slot
                </button>
              </div>
            </div>
            <button type="button" onClick={() => setModalOpen('market')} className="app-btn-primary shrink-0">
              Choose File
            </button>
          </div>
          <div className={`flex items-center gap-2 ${footerDivider}`}>
            <button type="button" onClick={() => handleDownloadTemplate('market')} className="app-action-btn" title="Download template" aria-label="Download template">
              <DownloadIcon />
            </button>
            <button type="button" onClick={() => onNavigateToBrowser('market')} className="app-action-btn" title="View in Data browser" aria-label="View in Data browser">
              <ViewDataIcon />
            </button>
            <button type="button" onClick={() => clearMarket(selectedMarketSurveyId)} className="app-action-btn-danger ml-auto" title="Clear survey" aria-label="Clear survey" disabled={marketRowCount === 0}>
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* Evaluation card */}
        <div className={cardBase}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={ICON_WRAPPER}>
                <CardIcon type="evaluation" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-800">Evaluations</h2>
                <p className="text-sm text-slate-500 mt-0.5">{evaluationRows.length} rows loaded</p>
              </div>
            </div>
            <button type="button" onClick={() => setModalOpen('evaluation')} className="app-btn-primary shrink-0">
              Choose File
            </button>
          </div>
          <div className={`flex items-center gap-2 ${footerDivider}`}>
            <button type="button" onClick={() => handleDownloadTemplate('evaluation')} className="app-action-btn" title="Download sample template" aria-label="Download template">
              <DownloadIcon />
            </button>
            <button type="button" onClick={() => onNavigateToBrowser('evaluation')} className="app-action-btn" title="View in Data browser" aria-label="View in Data browser">
              <ViewDataIcon />
            </button>
            <button type="button" onClick={clearEvaluations} className="app-action-btn-danger ml-auto" title="Clear all" aria-label="Clear all" disabled={evaluationRows.length === 0}>
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* Payments card */}
        <div className={cardBase}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={ICON_WRAPPER}>
                <CardIcon type="payments" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-800">Payments</h2>
                <p className="text-sm text-slate-500 mt-0.5">{payments.length} rows loaded</p>
              </div>
            </div>
            <button type="button" onClick={() => setModalOpen('payments')} className="app-btn-primary shrink-0">
              Choose File
            </button>
          </div>
          <div className={`flex items-center gap-2 ${footerDivider}`}>
            <button type="button" onClick={() => handleDownloadTemplate('payments')} className="app-action-btn" title="Download template" aria-label="Download template">
              <DownloadIcon />
            </button>
            <button type="button" onClick={() => onNavigateToBrowser('payments')} className="app-action-btn" title="View in Data browser" aria-label="View in Data browser">
              <ViewDataIcon />
            </button>
            <button type="button" onClick={clearPayments} className="app-action-btn-danger ml-auto" title="Clear all" aria-label="Clear all" disabled={payments.length === 0}>
              <TrashIcon />
            </button>
          </div>
        </div>

      </div>

      {/* Upload modals */}
      {modalOpen === 'provider' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Upload provider data"
          onClick={() => setModalOpen(null)}
        >
          <div
            className="app-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <UploadAndMapping
                onUpload={handleProviderUpload}
                cycleId={cycleId}
                setCycleId={setCycleId}
              />
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(null)}
                className="app-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen === 'market' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Upload market survey"
          onClick={() => setModalOpen(null)}
        >
          <div
            className="app-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <MarketUpload
                surveyId={selectedMarketSurveyId}
                surveyLabel={SURVEY_LABELS[selectedMarketSurveyId] ?? selectedMarketSurveyId}
                onUpload={handleMarketUpload}
              />
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(null)}
                className="app-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen === 'evaluation' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Upload evaluations"
          onClick={() => setModalOpen(null)}
        >
          <div
            className="app-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <EvaluationUpload onUpload={handleEvaluationUpload} />
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(null)}
                className="app-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {addSurveyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Add survey slot"
          onClick={() => setAddSurveyModalOpen(false)}
        >
          <AddSurveyModal
            existingIds={surveyIds}
            onClose={() => setAddSurveyModalOpen(false)}
            onAdd={(surveyId, label) => {
              if (addSurveySlot(surveyId, label)) {
                setSelectedMarketSurveyId(surveyId);
              }
              setAddSurveyModalOpen(false);
            }}
          />
        </div>
      )}

      {modalOpen === 'payments' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Upload payments"
          onClick={() => setModalOpen(null)}
        >
          <div
            className="app-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <PaymentsUpload onUpload={handlePaymentsUpload} />
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(null)}
                className="app-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
