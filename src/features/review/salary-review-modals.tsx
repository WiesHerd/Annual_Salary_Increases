import type { ProviderRecord } from '../../types/provider';
import type { ExperienceBand } from '../../types/experience-band';
import type { ExperienceBandSurveyContext } from '../../types/market-survey-config';
import type { MarketRow } from '../../types/market';
import type { PolicyEvaluationResult } from '../../types/compensation-policy';
import type { ReviewDetailEnrichment } from '../../lib/review-detail-enrichment';
import {
  DEFAULT_PRESET_LABELS,
  DEFAULT_PRESET_ORDER,
  type ReviewViewPresetId,
} from './review-table-columns';
import { ProviderDetailPanel } from './provider-detail-panel';
import { ProviderCompareModal } from './provider-compare-modal';
import { ModalShell } from '../../components/modal-shell';

export interface SalaryReviewModalsProps {
  selectedEmployeeId: string | null;
  selectedRecord: ProviderRecord | null;
  selectedEnrichment: ReviewDetailEnrichment | null;
  selectedMarketRow: MarketRow | undefined;
  evaluationResult: PolicyEvaluationResult | null;
  experienceBands: ExperienceBand[];
  experienceBandSurveyContext: ExperienceBandSurveyContext;
  drawerClosing: boolean;
  drawerWidth: number;
  onDrawerResizeStart: (e: React.MouseEvent) => void;
  onCloseDrawer: () => void;
  onSelectPrev: () => void;
  onSelectNext: () => void;
  hasPrevInList: boolean;
  hasNextInList: boolean;
  onApplyEquitySuggestion?: (amount: number) => void;
  compareModalOpen: boolean;
  selectedForCompare: string[];
  records: ProviderRecord[];
  onCloseCompare: () => void;
  onClearCompare: () => void;
  presetLabelsModalOpen: boolean;
  onClosePresetLabels: () => void;
  draftPresetLabels: Record<ReviewViewPresetId, string>;
  onDraftPresetLabelsChange: (labels: Record<ReviewViewPresetId, string>) => void;
  draftPresetOrder: ReviewViewPresetId[];
  onDraftPresetOrderChange: (order: ReviewViewPresetId[]) => void;
  onSavePresetLabels: () => void;
  notesModalEmployeeId: string | null;
  onCloseNotes: () => void;
  onUpdateNotes: (employeeId: string, notes: string | undefined) => void;
}

export function SalaryReviewModals({
  selectedEmployeeId,
  selectedRecord,
  selectedEnrichment,
  selectedMarketRow,
  evaluationResult,
  experienceBands,
  experienceBandSurveyContext,
  drawerClosing,
  drawerWidth,
  onDrawerResizeStart,
  onCloseDrawer,
  onSelectPrev,
  onSelectNext,
  hasPrevInList,
  hasNextInList,
  onApplyEquitySuggestion,
  compareModalOpen,
  selectedForCompare,
  records,
  onCloseCompare,
  onClearCompare,
  presetLabelsModalOpen,
  onClosePresetLabels,
  draftPresetLabels,
  onDraftPresetLabelsChange,
  draftPresetOrder,
  onDraftPresetOrderChange,
  onSavePresetLabels,
  notesModalEmployeeId,
  onCloseNotes,
  onUpdateNotes,
}: SalaryReviewModalsProps) {
  const notesRecord = notesModalEmployeeId
    ? records.find((r) => r.Employee_ID === notesModalEmployeeId)
    : null;

  return (
    <>
      {selectedEmployeeId && (
        <>
          <div
            role="presentation"
            className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ease-out ${
              drawerClosing ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={onCloseDrawer}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onCloseDrawer();
            }}
            tabIndex={-1}
            aria-hidden
          />
          <div
            className={`fixed right-0 top-0 bottom-0 z-50 flex flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-out ${
              drawerClosing ? 'translate-x-full' : 'translate-x-0'
            }`}
            style={{ width: drawerWidth }}
            role="dialog"
            aria-modal="true"
            aria-label="Provider details"
          >
            <button
              type="button"
              aria-label="Resize drawer"
              className="absolute left-0 top-0 bottom-0 z-10 w-1.5 shrink-0 cursor-col-resize touch-none transition-colors hover:bg-indigo-200/50 active:bg-indigo-300/50"
              onMouseDown={onDrawerResizeStart}
            />
            <ProviderDetailPanel
              provider={selectedRecord}
              enrichment={selectedEnrichment}
              experienceBands={experienceBands}
              experienceBandSurveyContext={experienceBandSurveyContext}
              marketRow={selectedMarketRow}
              policyResult={evaluationResult}
              onClose={onCloseDrawer}
              onSelectPrev={onSelectPrev}
              onSelectNext={onSelectNext}
              hasPrev={hasPrevInList}
              hasNext={hasNextInList}
              onApplyEquitySuggestion={onApplyEquitySuggestion}
            />
          </div>
        </>
      )}

      {compareModalOpen && (
        <ProviderCompareModal
          providerIds={selectedForCompare}
          records={records}
          experienceBands={experienceBands}
          onClose={onCloseCompare}
          onClearSelection={onClearCompare}
        />
      )}

      <ModalShell
        open={presetLabelsModalOpen}
        onClose={onClosePresetLabels}
        panelClassName="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        aria-labelledby="preset-labels-modal-title"
      >
        <h3 id="preset-labels-modal-title" className="mb-4 font-semibold text-slate-800">
          Customize view buttons
        </h3>
        <p className="mb-4 text-sm text-slate-600">
          Change the labels and order of the Meeting, Full, Comp, and Policy view buttons. Column sets
          stay the same.
        </p>
        <div className="mb-6 space-y-3">
          {draftPresetOrder.map((presetId, idx) => (
            <div key={presetId} className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (idx === 0) return;
                    const next = [...draftPresetOrder];
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    onDraftPresetOrderChange(next);
                  }}
                  className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-40"
                  disabled={idx === 0}
                  aria-label={`Move ${draftPresetLabels[presetId] ?? DEFAULT_PRESET_LABELS[presetId]} up`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (idx === draftPresetOrder.length - 1) return;
                    const next = [...draftPresetOrder];
                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                    onDraftPresetOrderChange(next);
                  }}
                  className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-40"
                  disabled={idx === draftPresetOrder.length - 1}
                  aria-label={`Move ${draftPresetLabels[presetId] ?? DEFAULT_PRESET_LABELS[presetId]} down`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <label className="flex min-w-0 flex-1 items-center gap-2">
                <span className="w-16 shrink-0 text-xs capitalize text-slate-500">{presetId}</span>
                <input
                  type="text"
                  value={draftPresetLabels[presetId] ?? ''}
                  onChange={(e) =>
                    onDraftPresetLabelsChange({ ...draftPresetLabels, [presetId]: e.target.value })
                  }
                  placeholder={DEFAULT_PRESET_LABELS[presetId]}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              onDraftPresetLabelsChange({ ...DEFAULT_PRESET_LABELS });
              onDraftPresetOrderChange([...DEFAULT_PRESET_ORDER]);
            }}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={onClosePresetLabels}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSavePresetLabels}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
          >
            Save
          </button>
        </div>
      </ModalShell>

      <ModalShell
        open={Boolean(notesModalEmployeeId && notesRecord)}
        onClose={onCloseNotes}
        panelClassName="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        aria-label={notesRecord ? `Notes for ${notesRecord.Provider_Name ?? notesRecord.Employee_ID}` : 'Notes'}
      >
        {notesRecord && notesModalEmployeeId && (
          <>
            <h3 className="mb-2 font-semibold text-slate-800">
              Notes — {notesRecord.Provider_Name ?? notesRecord.Employee_ID}
            </h3>
            <textarea
              value={notesRecord.Notes ?? ''}
              onChange={(e) => onUpdateNotes(notesModalEmployeeId, e.target.value || undefined)}
              className="h-32 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Add notes…"
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onCloseNotes}
                className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-800"
              >
                Done
              </button>
            </div>
          </>
        )}
      </ModalShell>
    </>
  );
}
