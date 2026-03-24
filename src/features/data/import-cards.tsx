/**
 * Import screen — wizard-first pattern.
 * The page IS the type selector. Clicking a tile launches the 4-step upload wizard directly.
 * Data status (row counts) lives in the Data Browser tab labels.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useAppState } from '../../hooks/use-app-state';
import type {
  ProviderUploadResult,
  MarketUploadResult,
  PaymentUploadResult,
  EvaluationUploadResult,
} from '../../types';
import {
  collectSurveyPickerIds,
  getSurveyLabel,
  sortSurveyIdsByLabel,
} from '../../types/market-survey-config';
import { loadProviderTypeToSurveyMapping } from '../../lib/parameters-storage';
import { useCustomStreams } from '../../hooks/use-custom-streams';
import { UploadAndMapping } from './upload-and-mapping';
import { MarketUpload } from './market-upload';
import { PaymentsUpload } from './payments-upload';
import { EvaluationUpload } from './evaluation-upload';
import { CustomStreamUpload } from './custom-stream-upload';
import { AddCustomStreamModal } from './add-custom-stream-modal';
import type { CustomStreamUploadResult } from '../../types/custom-stream';
import { UPLOAD_FORMAT_HINT } from '../../lib/upload-constants';
import { downloadUploadTemplate, type UploadTemplateKind } from '../../lib/upload-template-download';

type UploadCardType = 'provider' | 'market' | 'evaluation' | 'payments' | 'custom';

type DataBrowserTab = 'provider' | 'market' | 'evaluation' | 'specialty-map' | 'payments' | 'custom';

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

const ICON_BG = 'rounded-xl bg-emerald-100 p-3.5 text-emerald-700 shrink-0 transition-colors group-hover:bg-indigo-100 group-hover:text-indigo-700';
const ICON_SIZE = 'w-7 h-7';

function TemplateDownloadFooter({ kind }: { kind: UploadTemplateKind }) {
  const onCsv = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    downloadUploadTemplate(kind, 'csv');
  };
  const onXlsx = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    downloadUploadTemplate(kind, 'xlsx');
  };
  const label =
    kind === 'provider'
      ? 'Provider'
      : kind === 'market'
        ? 'Market survey'
        : kind === 'evaluation'
          ? 'Evaluations'
          : kind === 'payments'
            ? 'Payments'
            : kind === 'customProvider'
              ? 'Custom (provider-linked)'
              : 'Custom (standalone)';
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2.5 border-t border-slate-100 bg-slate-50/70 text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-slate-500 shrink-0">Upload structure</span>
      <button
        type="button"
        onClick={onCsv}
        className="font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus-visible:underline"
        aria-label={`Download ${label} template as CSV`}
      >
        CSV
      </button>
      <span className="text-slate-300" aria-hidden>
        ·
      </span>
      <button
        type="button"
        onClick={onXlsx}
        className="font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus-visible:underline"
        aria-label={`Download ${label} template as Excel`}
      >
        XLSX
      </button>
    </div>
  );
}

const TILES = [
  {
    type: 'provider' as const,
    templateKind: 'provider' as const,
    title: 'Provider',
    description: 'Roster with compensation, wRVUs, and plan details',
    icon: (
      <svg className={ICON_SIZE} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    type: 'market' as const,
    templateKind: 'market' as const,
    title: 'Market survey',
    description: 'Benchmark percentiles (TCC, wRVU, CF) by specialty',
    icon: (
      <svg className={ICON_SIZE} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    type: 'evaluation' as const,
    templateKind: 'evaluation' as const,
    title: 'Evaluations',
    description: 'Performance scores and increase percentages by provider',
    icon: (
      <svg className={ICON_SIZE} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    type: 'payments' as const,
    title: 'Payments',
    description: 'Supplemental payment records by provider',
    templateKind: 'payments' as const,
    icon: (
      <svg className={ICON_SIZE} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
] as const;

export function ImportCards({ onNavigateToBrowser }: ImportCardsProps) {
  const [cycleId, setCycleId] = useState('FY2025');
  const [selectedMarketSurveyId, setSelectedMarketSurveyId] = useState('');
  const [modalOpen, setModalOpen] = useState<UploadCardType | null>(null);
  const [addSurveyModalOpen, setAddSurveyModalOpen] = useState(false);
  const [surveyPickerOpen, setSurveyPickerOpen] = useState(false);
  const [surveySearch, setSurveySearch] = useState('');
  const surveySearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (surveyPickerOpen) {
      setSurveySearch('');
      queueMicrotask(() => surveySearchRef.current?.focus());
    }
  }, [surveyPickerOpen]);

  const {
    records,
    addFromUpload,
    replaceFromUpload,
    marketSurveys,
    surveyMetadata,
    addMarketFromUpload,
    replaceMarketFromUpload,
    addSurveySlot,
    addEvaluationFromUpload,
    replaceEvaluationFromUpload,
    addPaymentsFromUpload,
    replacePaymentsFromUpload,
    loadDemoData,
    loaded,
  } = useAppState();

  const {
    definitions: customStreamDefinitions,
    getRowCount,
    addStream,
    removeStream,
    clearStreamData,
    replaceStreamDataFromUpload,
  } = useCustomStreams();

  const [customStreamView, setCustomStreamView] = useState<'list' | { upload: string }>('list');
  const [addStreamModalOpen, setAddStreamModalOpen] = useState(false);

  const surveyIds = useMemo(() => {
    const m = loadProviderTypeToSurveyMapping();
    return sortSurveyIdsByLabel(collectSurveyPickerIds(marketSurveys, m), surveyMetadata);
  }, [marketSurveys, surveyMetadata]);

  useEffect(() => {
    if (surveyIds.length > 0 && !surveyIds.includes(selectedMarketSurveyId)) {
      setSelectedMarketSurveyId(surveyIds[0]);
    }
  }, [surveyIds, selectedMarketSurveyId]);

  const marketSurveyForUpload = selectedMarketSurveyId || surveyIds[0] || '';

  const filteredSurveyIds = useMemo(() => {
    if (!surveySearch.trim()) return surveyIds;
    const q = surveySearch.trim().toLowerCase();
    return surveyIds.filter((id) => {
      const label = getSurveyLabel(id, surveyMetadata).toLowerCase();
      return label.includes(q) || id.toLowerCase().includes(q);
    });
  }, [surveyIds, surveySearch, surveyMetadata]);

  const handleProviderUpload = (result: ProviderUploadResult, cycle: string, mode: 'replace' | 'add') => {
    if (mode === 'replace') replaceFromUpload(result, cycle);
    else addFromUpload(result, cycle);
  };

  const handleMarketUpload = (result: MarketUploadResult, surveyId: string, mode: 'replace' | 'add') => {
    if (mode === 'replace') replaceMarketFromUpload(result, surveyId);
    else addMarketFromUpload(result, surveyId, mode);
  };

  const handleEvaluationUpload = (result: EvaluationUploadResult, mode: 'replace' | 'add') => {
    if (mode === 'replace') replaceEvaluationFromUpload(result);
    else addEvaluationFromUpload(result, mode);
  };

  const handlePaymentsUpload = (result: PaymentUploadResult, mode: 'replace' | 'add') => {
    if (mode === 'replace') replacePaymentsFromUpload(result);
    else addPaymentsFromUpload(result, mode);
  };

  const handleCustomStreamUpload = (streamId: string, result: CustomStreamUploadResult, mode: 'replace' | 'add') => {
    replaceStreamDataFromUpload(streamId, result, mode);
  };

  const openCustomStreams = () => {
    setModalOpen('custom');
    setCustomStreamView('list');
    setAddStreamModalOpen(false);
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-500 font-medium">
        Loading…
      </div>
    );
  }

  const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Import data</h1>
        <p className="text-sm text-slate-500 mt-1">Select the type of data you want to import.</p>
      </div>

      {records.length === 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
          <span>New workspace — import below or</span>
          <button
            type="button"
            onClick={() => {
              loadDemoData();
              onNavigateToBrowser?.('provider');
            }}
            className="font-medium text-indigo-700 hover:text-indigo-900"
          >
            load sample data
          </button>
        </div>
      )}

      {/* 2×2 type-selector tile grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {TILES.map(({ type, title, description, icon, templateKind }) => (
          <div
            key={type}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-indigo-300 hover:shadow-md overflow-hidden"
          >
            <button
              type="button"
              onClick={() => {
                if (type === 'market') {
                  setSurveyPickerOpen(true);
                } else {
                  setModalOpen(type);
                }
              }}
              className="group flex items-start gap-5 p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
            >
              <div className={ICON_BG}>{icon}</div>
              <div className="min-w-0 pt-0.5 space-y-1.5">
                <p className="text-base font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{title}</p>
                <p className="text-sm leading-relaxed text-slate-500">{description}</p>
              </div>
            </button>
            <TemplateDownloadFooter kind={templateKind} />
          </div>
        ))}
      </div>

      {/* Custom stream — full-width tile */}
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-indigo-300 hover:shadow-md overflow-hidden">
        <button
          type="button"
          onClick={openCustomStreams}
          className="group flex w-full items-center gap-5 p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
        >
          <div className={ICON_BG}>
            <svg className={ICON_SIZE} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-base font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">Custom stream</p>
            <p className="text-sm leading-relaxed text-slate-500">Upload or manage additional data streams — risk scores, quality metrics, and more</p>
          </div>
          <svg className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-2 px-6 py-2.5 border-t border-slate-100 bg-slate-50/70 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-slate-500 shrink-0">Upload structure</span>
          <span className="text-slate-400" aria-hidden>
            ·
          </span>
          <span className="text-slate-600 shrink-0">Provider-linked</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              downloadUploadTemplate('customProvider', 'csv');
            }}
            className="font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus-visible:underline"
            aria-label="Download provider-linked custom stream template as CSV"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              downloadUploadTemplate('customProvider', 'xlsx');
            }}
            className="font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus-visible:underline"
            aria-label="Download provider-linked custom stream template as Excel"
          >
            XLSX
          </button>
          <span className="text-slate-400 hidden sm:inline" aria-hidden>
            ·
          </span>
          <span className="text-slate-600 shrink-0">Standalone</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              downloadUploadTemplate('customStandalone', 'csv');
            }}
            className="font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus-visible:underline"
            aria-label="Download standalone custom stream template as CSV"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              downloadUploadTemplate('customStandalone', 'xlsx');
            }}
            className="font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus-visible:underline"
            aria-label="Download standalone custom stream template as Excel"
          >
            XLSX
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">{UPLOAD_FORMAT_HINT}</p>

      {/* Survey picker — shown before market wizard to select target survey */}
      {surveyPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Select survey"
          onClick={() => setSurveyPickerOpen(false)}
        >
          <div
            className="app-card shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">Choose target survey</h3>
              <p className="text-sm text-slate-500 mt-0.5">Which survey slot should this file be imported into?</p>
              <input
                ref={surveySearchRef}
                type="search"
                value={surveySearch}
                onChange={(e) => setSurveySearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Search surveys…"
                aria-label="Search surveys"
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <ul
              role="listbox"
              className="flex-1 overflow-y-auto py-2 min-h-0"
              aria-label="Survey list"
            >
              {filteredSurveyIds.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500">No matches</li>
              ) : (
                filteredSurveyIds.map((id) => (
                  <li key={id} role="option" aria-selected={selectedMarketSurveyId === id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMarketSurveyId(id);
                        setSurveyPickerOpen(false);
                        setModalOpen('market');
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
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
            <div className="p-4 border-t border-slate-100 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSurveyPickerOpen(false);
                  setAddSurveyModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add survey
              </button>
              <button type="button" onClick={() => setSurveyPickerOpen(false)} className="app-btn-secondary">
                Cancel
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
              setModalOpen('market');
            }}
          />
        </div>
      )}

      {/* Upload wizard modals */}
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
                onDone={() => setModalOpen(null)}
              />
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button type="button" onClick={() => setModalOpen(null)} className="app-btn-secondary">
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
                surveyId={marketSurveyForUpload}
                surveyLabel={getSurveyLabel(marketSurveyForUpload, surveyMetadata)}
                onUpload={handleMarketUpload}
                onDone={() => setModalOpen(null)}
              />
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button type="button" onClick={() => setModalOpen(null)} className="app-btn-secondary">
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
              <EvaluationUpload onUpload={handleEvaluationUpload} onDone={() => setModalOpen(null)} />
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button type="button" onClick={() => setModalOpen(null)} className="app-btn-secondary">
                Close
              </button>
            </div>
          </div>
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
              <PaymentsUpload onUpload={handlePaymentsUpload} onDone={() => setModalOpen(null)} />
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button type="button" onClick={() => setModalOpen(null)} className="app-btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen === 'custom' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Custom data streams"
          onClick={() => { setModalOpen(null); setCustomStreamView('list'); setAddStreamModalOpen(false); }}
        >
          <div
            className="app-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              {addStreamModalOpen ? (
                <AddCustomStreamModal
                  existingIds={customStreamDefinitions.map((d) => d.id)}
                  onClose={() => setAddStreamModalOpen(false)}
                  onAdd={(label, linkType, keyColumn) => {
                    addStream(label, linkType, keyColumn);
                    setAddStreamModalOpen(false);
                  }}
                />
              ) : typeof customStreamView === 'object' && 'upload' in customStreamView ? (
                (() => {
                  const def = customStreamDefinitions.find((d) => d.id === customStreamView.upload);
                  if (!def) return null;
                  return (
                    <>
                      <CustomStreamUpload
                        streamId={def.id}
                        definition={def}
                        onUpload={(result, mode) => handleCustomStreamUpload(def.id, result, mode)}
                        onClose={() => setCustomStreamView('list')}
                      />
                      <div className="mt-4 flex justify-end">
                        <button type="button" onClick={() => setCustomStreamView('list')} className="app-btn-secondary">
                          Back to list
                        </button>
                      </div>
                    </>
                  );
                })()
              ) : customStreamView === 'list' ? (
                <>
                  <h2 className="text-lg font-semibold text-slate-800 mb-4">Custom data streams</h2>
                  <p className="text-sm text-slate-600 mb-4">
                    Add streams (e.g. risk, quality) and upload files. Provider-linked streams can be joined to providers by Employee ID in exports.
                  </p>
                  <div className="space-y-3 mb-4">
                    {customStreamDefinitions.length === 0 ? (
                      <p className="text-sm text-slate-500">No streams yet. Add one to get started.</p>
                    ) : (
                      customStreamDefinitions.map((def) => (
                        <div
                          key={def.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg border border-slate-200 bg-slate-50"
                        >
                          <div>
                            <span className="font-medium text-slate-800">{def.label}</span>
                            <span className="text-slate-500 text-sm ml-2">
                              {def.linkType === 'provider' ? 'Provider-linked' : `Standalone (${def.keyColumn ?? 'Key'})`}
                            </span>
                            <span className="text-slate-500 text-sm ml-2">— {getRowCount(def.id)} rows</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setCustomStreamView({ upload: def.id })}
                              className="app-btn-primary text-sm py-1.5 px-3"
                            >
                              Upload
                            </button>
                            <button
                              type="button"
                              onClick={() => clearStreamData(def.id)}
                              disabled={getRowCount(def.id) === 0}
                              className="app-btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStream(def.id)}
                              className="app-action-btn-danger text-sm py-1.5 px-3"
                              title="Delete stream"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setAddStreamModalOpen(true)}
                      className="app-btn-primary"
                    >
                      + Add new stream
                    </button>
                    <button type="button" onClick={() => { setModalOpen(null); setCustomStreamView('list'); }} className="app-btn-secondary">
                      Close
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
