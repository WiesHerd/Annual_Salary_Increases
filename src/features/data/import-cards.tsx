/**
 * Import screen — wizard-first pattern.
 * The page IS the type selector. Clicking a tile launches the 4-step upload wizard directly.
 * Data status (row counts) lives in the Data Browser tab labels.
 */

import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react';
import { useAppState } from '../../hooks/use-app-state';
import type {
  ProviderUploadResult,
  MarketUploadResult,
  EvaluationUploadResult,
} from '../../types';
import {
  collectSurveyPickerIds,
  getSurveyLabel,
  sortSurveyIdsByLabel,
} from '../../types/market-survey-config';
import { loadProviderTypeToSurveyMapping } from '../../lib/parameters-storage';
import { useCustomStreams } from '../../hooks/use-custom-streams';
import { useParametersState } from '../../hooks/use-parameters-state';
import { getPreferredCycleId } from '../../lib/cycle-defaults';
import { UploadAndMapping } from './upload-and-mapping';
import { MarketUpload } from './market-upload';
import { EvaluationUpload } from './evaluation-upload';
import { CustomStreamUpload } from './custom-stream-upload';
import { AddCustomStreamModal } from './add-custom-stream-modal';
import type { CustomStreamUploadResult } from '../../types/custom-stream';
import { UPLOAD_FORMAT_HINT } from '../../lib/upload-constants';
import { downloadUploadTemplate, type UploadTemplateKind } from '../../lib/upload-template-download';
import { ImportWizardModal } from '../../components/import-wizard-modal';
import { ImportWizardPage } from '../../components/import-wizard-page';
import { BarChart3, ArrowRight, ChevronRight, ClipboardCheck, Database, Download, Users } from 'lucide-react';
import { WorkflowChecklist } from '../../components/workflow-checklist';
import { ModalShell } from '../../components/modal-shell';
import { usePolicyEngineState } from '../../hooks/use-policy-engine-state';
import { useSelectedCycle } from '../../hooks/use-selected-cycle';
import { ReviewStatus } from '../../types/enums';
import { useAppNavigation } from '../../context/app-navigation-context';

type UploadWizardType = 'provider' | 'market' | 'evaluation';

type DataBrowserTab = 'provider' | 'market' | 'evaluation' | 'specialty-map' | 'custom';

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
    <div className="app-card shadow-xl max-w-md w-full">
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
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600"
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

interface ImportCardsProps {}

const ICON_SIZE = 'w-5 h-5 stroke-[2]';

function TemplateFormatLinks({
  kind,
  compact = false,
}: {
  kind: UploadTemplateKind;
  compact?: boolean;
}) {
  const onCsv = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void downloadUploadTemplate(kind, 'csv');
  };
  const onXlsx = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void downloadUploadTemplate(kind, 'xlsx');
  };
  const label =
    kind === 'provider'
      ? 'Provider'
      : kind === 'market'
        ? 'Market survey'
        : kind === 'evaluation'
          ? 'Evaluations'
          : kind === 'customProvider'
            ? 'Custom (provider-linked)'
            : 'Custom (standalone)';
  return (
    <span className={`inline-flex items-center gap-x-1.5 ${compact ? 'shrink-0' : ''}`}>
      <button
        type="button"
        onClick={onCsv}
        className="import-template-link"
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
        className="import-template-link"
        aria-label={`Download ${label} template as Excel`}
      >
        XLSX
      </button>
    </span>
  );
}

function TemplateDownloadFooter({ kind }: { kind: UploadTemplateKind }) {
  return (
    <div className="import-tile-footer" role="group" aria-label="Download template">
      <Download className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      <span className="shrink-0 text-slate-500">Template</span>
      <span className="text-slate-300" aria-hidden>
        ·
      </span>
      <TemplateFormatLinks kind={kind} />
    </div>
  );
}

/** Footer for Custom stream tile — same height and rhythm as the other three tiles. */
function CustomStreamUploadFooter() {
  return (
    <div className="import-tile-footer overflow-x-auto" role="group" aria-label="Download custom stream templates">
      <div className="flex min-w-max items-center gap-x-2 sm:gap-x-3">
        <Download className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
        <span className="shrink-0 text-slate-500">Template</span>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <span className="shrink-0 text-slate-600">Linked</span>
        <TemplateFormatLinks kind="customProvider" compact />
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <span className="shrink-0 text-slate-600">Standalone</span>
        <TemplateFormatLinks kind="customStandalone" compact />
      </div>
    </div>
  );
}

type ImportTileConfig =
  | {
      type: 'provider' | 'market' | 'evaluation';
      templateKind: UploadTemplateKind;
      title: string;
      description: string;
      icon: ReactNode;
    }
  | {
      type: 'custom';
      title: string;
      description: string;
      icon: ReactNode;
    };

const TILES: readonly ImportTileConfig[] = [
  {
    type: 'provider' as const,
    templateKind: 'provider' as const,
    title: 'Provider',
    description: 'Roster with base pay, TCC components (wRVU incentive, VBP, shift, stipends), wRVUs, and plan details',
    icon: <Users className={ICON_SIZE} strokeWidth={1.75} aria-hidden />,
  },
  {
    type: 'market' as const,
    templateKind: 'market' as const,
    title: 'Market survey',
    description: 'Benchmark percentiles (TCC, wRVU, CF) by specialty',
    icon: <BarChart3 className={ICON_SIZE} strokeWidth={1.75} aria-hidden />,
  },
  {
    type: 'evaluation' as const,
    templateKind: 'evaluation' as const,
    title: 'Evaluations',
    description: 'Performance scores and increase percentages by provider',
    icon: <ClipboardCheck className={ICON_SIZE} strokeWidth={1.75} aria-hidden />,
  },
  {
    type: 'custom' as const,
    title: 'Custom stream',
    description: 'Upload or manage additional data streams — risk scores, quality metrics, and more',
    icon: <Database className={ICON_SIZE} strokeWidth={1.75} aria-hidden />,
  },
] as const;

export function ImportCards(_props: ImportCardsProps = {}) {
  const { navigateWorkflow, navigateToDataBrowser } = useAppNavigation();
  const { cycles, meritMatrix, budgetSettings } = useParametersState();
  const { policies } = usePolicyEngineState();
  const [selectedCycleId] = useSelectedCycle();
  const [cycleId, setCycleId] = useState(() => getPreferredCycleId(cycles) ?? 'FY2025');
  const [selectedMarketSurveyId, setSelectedMarketSurveyId] = useState('');
  const [activeWizard, setActiveWizard] = useState<UploadWizardType | null>(null);
  const [customModalOpen, setCustomModalOpen] = useState(false);
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

  useEffect(() => {
    const preferred = getPreferredCycleId(cycles);
    if (!preferred) return;
    setCycleId((prev) => (cycles.some((c) => c.id === prev) ? prev : preferred));
  }, [cycles]);

  const {
    records,
    addFromUpload,
    replaceFromUpload,
    marketSurveys,
    surveyMetadata,
    addMarketFromUpload,
    replaceMarketFromUpload,
    addSurveySlot,
    evaluationRows,
    addEvaluationFromUpload,
    replaceEvaluationFromUpload,
    loadDemoData,
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

  const totalMarketRows = useMemo(
    () => Object.values(marketSurveys).reduce((acc, rows) => acc + rows.length, 0),
    [marketSurveys],
  );

  const hasImportedData =
    records.length > 0 ||
    totalMarketRows > 0 ||
    evaluationRows.length > 0 ||
    customStreamDefinitions.length > 0;

  const mappingCount = useMemo(() => Object.keys(loadProviderTypeToSurveyMapping()).length, []);

  const hasReviewedProviders = useMemo(
    () =>
      records.some((r) => {
        const s = (r.Review_Status ?? '').trim();
        return s === ReviewStatus.InReview || s === ReviewStatus.Approved || s === ReviewStatus.Effective;
      }),
    [records]
  );

  const navigateToBrowserAfterImport = (tab: DataBrowserTab) => {
    navigateToDataBrowser(tab, { returnToCurrent: true });
  };

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

  const handleCustomStreamUpload = (streamId: string, result: CustomStreamUploadResult, mode: 'replace' | 'add') => {
    replaceStreamDataFromUpload(streamId, result, mode);
  };

  const openCustomStreams = () => {
    setCustomModalOpen(true);
    setCustomStreamView('list');
    setAddStreamModalOpen(false);
  };

  const closeWizard = () => setActiveWizard(null);

  const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );

  if (activeWizard === 'provider') {
    return (
      <ImportWizardPage title="Import provider data" onBack={closeWizard}>
        <UploadAndMapping
          layout="page"
          onUpload={handleProviderUpload}
          cycleId={cycleId}
          setCycleId={setCycleId}
          onDone={() => {
            closeWizard();
            navigateToBrowserAfterImport('provider');
          }}
        />
      </ImportWizardPage>
    );
  }

  if (activeWizard === 'market') {
    return (
      <ImportWizardPage
        title="Import market survey"
        subtitle={getSurveyLabel(marketSurveyForUpload, surveyMetadata)}
        onBack={closeWizard}
      >
        <MarketUpload
          layout="page"
          surveyId={marketSurveyForUpload}
          surveyLabel={getSurveyLabel(marketSurveyForUpload, surveyMetadata)}
          onUpload={handleMarketUpload}
          onDone={() => {
            closeWizard();
            navigateToBrowserAfterImport('market');
          }}
        />
      </ImportWizardPage>
    );
  }

  if (activeWizard === 'evaluation') {
    return (
      <ImportWizardPage title="Import evaluations" onBack={closeWizard}>
        <EvaluationUpload
          layout="page"
          onUpload={handleEvaluationUpload}
          onDone={() => {
            closeWizard();
            navigateToBrowserAfterImport('evaluation');
          }}
        />
      </ImportWizardPage>
    );
  }

  return (
    <div className="import-hub">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Page header — flat on gradient, no card wrapper */}
        <header className="import-hub-header">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h1 className="font-meritly text-2xl font-semibold tracking-tight text-slate-900">
                Import data
              </h1>
              <p className="mt-1 text-sm text-slate-500">Select a data type to get started.</p>
            </div>
            {hasImportedData && (
              <div className="flex flex-wrap gap-1.5">
                <span className="import-stat-pill">
                  Providers <strong>{records.length.toLocaleString()}</strong>
                </span>
                <span className="import-stat-pill">
                  Market <strong>{totalMarketRows.toLocaleString()}</strong>
                </span>
                <span className="import-stat-pill">
                  Evaluations <strong>{evaluationRows.length.toLocaleString()}</strong>
                </span>
                {customStreamDefinitions.length > 0 && (
                  <span className="import-stat-pill">
                    Custom <strong>{customStreamDefinitions.length.toLocaleString()}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
          {records.length === 0 && (
            <p className="mt-2 text-xs text-slate-400">
              Exploring the app?{' '}
              <button
                type="button"
                onClick={() => {
                  loadDemoData();
                  navigateToDataBrowser('provider');
                }}
                className="font-medium text-[var(--meritly-green)] underline-offset-2 hover:text-[var(--meritly-green-dark)] hover:underline"
                title="Loads bundled sample providers, market surveys, and evaluations."
              >
                Load sample data
              </button>
            </p>
          )}
        </header>

        <WorkflowChecklist
          className="mb-6"
          recordsCount={records.length}
          marketRowCount={totalMarketRows}
          cycles={cycles}
          meritMatrix={meritMatrix}
          policies={policies}
          mappingCount={mappingCount}
          budgetSettings={budgetSettings}
          selectedCycleId={selectedCycleId}
          hasReviewedProviders={hasReviewedProviders}
          onNavigate={navigateWorkflow}
        />

        {/* 2×2 type-selector tile grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {TILES.map((tile) => (
            <div key={tile.type} className="import-tile">
              <button
                type="button"
                onClick={() => {
                  if (tile.type === 'market') {
                    setSurveyPickerOpen(true);
                  } else if (tile.type === 'custom') {
                    openCustomStreams();
                  } else {
                    setActiveWizard(tile.type);
                  }
                }}
                className="group flex min-h-0 flex-1 gap-3.5 p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500/40"
              >
                <div className="import-tile-icon">{tile.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-base font-semibold text-slate-900 transition-colors group-hover:text-[var(--meritly-green-dark)]">
                      {tile.title}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="import-tile-cta">
                        Start import
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
                      </span>
                      <ChevronRight
                        className="h-4 w-4 text-slate-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--meritly-green)]"
                        aria-hidden
                      />
                    </div>
                  </div>
                  <p
                    className="mt-1 line-clamp-2 text-sm leading-snug text-slate-500"
                    title={tile.description}
                  >
                    {tile.description}
                  </p>
                </div>
              </button>
              {'templateKind' in tile ? (
                <TemplateDownloadFooter kind={tile.templateKind} />
              ) : (
                <CustomStreamUploadFooter />
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400">{UPLOAD_FORMAT_HINT}</p>
      </div>

      {/* Survey picker — shown before market wizard to select target survey */}
      <ModalShell
        open={surveyPickerOpen}
        onClose={() => setSurveyPickerOpen(false)}
        panelClassName="app-card shadow-2xl ring-1 ring-slate-900/5 w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
        aria-label="Select survey"
      >
        {surveyPickerOpen && (
          <>
            <div className="px-6 pt-6 pb-5 shrink-0">
              <h3 className="text-lg font-semibold text-slate-900">Choose target survey</h3>
              <p className="text-sm text-slate-500 mt-1">Which survey slot should this file be imported into?</p>
              <div className="relative mt-4">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
                </svg>
                <input
                  ref={surveySearchRef}
                  type="search"
                  value={surveySearch}
                  onChange={(e) => setSurveySearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Search surveys…"
                  aria-label="Search surveys"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-green-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20"
                />
              </div>
            </div>
            <ul
              role="listbox"
              className="flex-1 overflow-y-auto px-3 pb-2 min-h-0 space-y-0.5"
              aria-label="Survey list"
            >
              {filteredSurveyIds.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-slate-400">No matching surveys</li>
              ) : (
                filteredSurveyIds.map((id) => {
                  const isSelected = selectedMarketSurveyId === id;
                  return (
                    <li key={id} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMarketSurveyId(id);
                          setSurveyPickerOpen(false);
                          setActiveWizard('market');
                        }}
                        className={`group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                          isSelected
                            ? 'bg-green-50 text-green-800 font-medium'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{getSurveyLabel(id, surveyMetadata)}</span>
                        {isSelected ? (
                          <svg className="w-4 h-4 shrink-0 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setSurveyPickerOpen(false);
                  setAddSurveyModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
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
          </>
        )}
      </ModalShell>

      <ModalShell
        open={addSurveyModalOpen}
        onClose={() => setAddSurveyModalOpen(false)}
        panelClassName="max-w-md w-full"
        aria-label="Add survey slot"
      >
        {addSurveyModalOpen && (
          <AddSurveyModal
            existingIds={surveyIds}
            onClose={() => setAddSurveyModalOpen(false)}
            onAdd={(surveyId, label) => {
              if (addSurveySlot(surveyId, label)) {
                setSelectedMarketSurveyId(surveyId);
              }
              setAddSurveyModalOpen(false);
              setActiveWizard('market');
            }}
          />
        )}
      </ModalShell>

      {/* Custom streams — list + upload stay in modal */}
      <ImportWizardModal
        open={customModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCustomModalOpen(false);
            setCustomStreamView('list');
            setAddStreamModalOpen(false);
          }
        }}
        ariaLabel="Custom data streams"
        maxWidth={
          typeof customStreamView === 'object' && 'upload' in customStreamView ? 'xl' : '2xl'
        }
      >
        {customModalOpen ? (
          addStreamModalOpen ? (
              <div className="overflow-y-auto p-6">
                <AddCustomStreamModal
                  existingIds={customStreamDefinitions.map((d) => d.id)}
                  onClose={() => setAddStreamModalOpen(false)}
                  onAdd={(label, linkType, keyColumn) => {
                    addStream(label, linkType, keyColumn);
                    setAddStreamModalOpen(false);
                  }}
                />
              </div>
            ) : typeof customStreamView === 'object' && 'upload' in customStreamView ? (
              (() => {
                const def = customStreamDefinitions.find((d) => d.id === customStreamView.upload);
                if (!def) return null;
                return (
                  <CustomStreamUpload
                    layout="modal"
                    streamId={def.id}
                    definition={def}
                    onUpload={(result, mode) => handleCustomStreamUpload(def.id, result, mode)}
                    onClose={() => setCustomStreamView('list')}
                  />
                );
              })()
            ) : customStreamView === 'list' ? (
              <div className="overflow-y-auto p-6">
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
                    <button type="button" onClick={() => { setCustomModalOpen(false); setCustomStreamView('list'); }} className="app-btn-secondary">
                      Close
                    </button>
                  </div>
              </div>
            ) : null
        ) : null}
      </ImportWizardModal>
    </div>
  );
}
