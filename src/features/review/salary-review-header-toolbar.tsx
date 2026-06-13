import {
  REVIEW_TABLE_COLUMNS,
  DEFAULT_PRESET_LABELS,
  type ReviewViewPresetId,
} from './review-table-columns';
import { SalaryReviewExportDropdown, type ExportScope } from './salary-review-export-dropdown';
import type { SalaryReviewTableLayout } from './use-salary-review-table-layout';

export interface SalaryReviewHeaderToolbarProps {
  layout: SalaryReviewTableLayout;
  selectedCycleLabel: string;
  cycleScopedCount: number;
  filteredCount: number;
  totalRecordsCount: number;
  budgetAmount: number | null | undefined;
  selectedForCompare: string[];
  onOpenCompare: () => void;
  onExportCsv: (scope: ExportScope, tableViewOnly: boolean) => void;
  onExportXlsx: (scope: ExportScope, tableViewOnly: boolean) => void | Promise<void>;
  onExportCommitteeXlsx?: (scope: ExportScope) => void | Promise<void>;
  reviewViewMode: 'table' | 'trend';
  onReviewViewModeChange: (mode: 'table' | 'trend') => void;
}

export function SalaryReviewHeaderToolbar({
  layout,
  selectedCycleLabel,
  cycleScopedCount,
  filteredCount,
  totalRecordsCount,
  budgetAmount,
  selectedForCompare,
  onOpenCompare,
  onExportCsv,
  onExportXlsx,
  onExportCommitteeXlsx,
  reviewViewMode,
  onReviewViewModeChange,
}: SalaryReviewHeaderToolbarProps) {
  const {
    visibleColumnIds,
    activePreset,
    savedCustomViews,
    activeCustomViewId,
    frozenColumnIds,
    presetLabels,
    presetOrder,
    customViewDropdownOpen,
    setCustomViewDropdownOpen,
    columnDropdownOpen,
    setColumnDropdownOpen,
    saveViewName,
    setSaveViewName,
    saveViewOpen,
    setSaveViewOpen,
    showLayoutOptions,
    setShowLayoutOptions,
    setPresetLabelsModalOpen,
    saveViewNameInputRef,
    closeCustomDropdown,
    openCustomDropdown,
    applyPreset,
    applySavedCustomView,
    addSavedCustomView,
    removeSavedCustomView,
    selectCurrentSelection,
    toggleColumn,
    toggleFrozenColumn,
    resetColumnWidths,
  } = layout;

  return (
    <div className="shrink-0 border-b border-slate-200 px-5 pb-3 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-800">Merit review</h2>
            <span className="group relative inline-flex shrink-0">
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                aria-label="How merit review works"
                aria-describedby="salary-review-works-tooltip"
              >
                i
              </button>
              <div
                id="salary-review-works-tooltip"
                role="tooltip"
                className="pointer-events-auto invisible absolute left-1/2 top-[calc(100%-4px)] z-50 max-h-[70vh] w-[min(22rem,calc(100vw-2.5rem))] -translate-x-1/2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 pt-4 text-left text-[11px] leading-snug text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
              >
                <p className="font-medium text-slate-800">How merit review works</p>
                <p className="mt-2">
                  Recommended increases are calculated from your merit matrix, experience band guardrails, and active
                  Compensation Policy Engine rules, using the current cycle&apos;s effective date.
                </p>
                <p className="mt-2">
                  Use the filters below to focus on a population, and color cues to see who is below, in, or above
                  their experience band targets. Update review status and override amounts directly in the grid where
                  needed.
                </p>
                <p className="mt-2">
                  Budget usage lines up total base salary changes for whoever is in the table with the cycle budget
                  number. Change filters or search and the totals update to match what you see in the grid.
                </p>
              </div>
            </span>
          </div>
          {cycleScopedCount > 0 ? (
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-600">{selectedCycleLabel}</span>
              <span className="mx-1.5 text-slate-300" aria-hidden>
                ·
              </span>
              <span>
                {filteredCount < cycleScopedCount
                  ? `${filteredCount} of ${cycleScopedCount} shown`
                  : `${cycleScopedCount} provider${cycleScopedCount !== 1 ? 's' : ''}`}
              </span>
            </p>
          ) : totalRecordsCount > 0 ? (
            <p className="text-sm text-amber-800">
              No providers for {selectedCycleLabel} ({totalRecordsCount} in other cycles) — switch Merit cycle in the
              sidebar
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-600">{selectedCycleLabel}</span>
            </p>
          )}
          {(budgetAmount == null || !Number.isFinite(budgetAmount) || budgetAmount <= 0) && cycleScopedCount > 0 && (
            <p className="text-xs text-amber-800">No budget for this cycle — set in Parameters</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenCompare}
            disabled={selectedForCompare.length < 2}
            className={
              selectedForCompare.length >= 2
                ? 'app-btn-secondary inline-flex items-center gap-1.5'
                : 'app-btn-secondary inline-flex items-center gap-1.5 opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-sm'
            }
            title={
              selectedForCompare.length < 2
                ? 'Select 2–4 providers to compare'
                : `Compare ${selectedForCompare.length} selected provider${selectedForCompare.length !== 1 ? 's' : ''}`
            }
            aria-label={
              selectedForCompare.length < 2
                ? 'Compare — select 2 to 4 providers using row checkboxes'
                : `Compare ${selectedForCompare.length} selected provider${selectedForCompare.length !== 1 ? 's' : ''}`
            }
          >
            Compare
            {selectedForCompare.length > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-100 px-1.5 text-xs font-semibold text-indigo-800">
                {selectedForCompare.length}
              </span>
            )}
          </button>
          <SalaryReviewExportDropdown
            filteredCount={filteredCount}
            cycleCount={cycleScopedCount}
            allCount={totalRecordsCount}
            onExportCsv={onExportCsv}
            onExportXlsx={onExportXlsx}
            onExportCommitteeXlsx={onExportCommitteeXlsx}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
        <div className="app-segmented-track w-fit">
          {(['table', 'trend'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onReviewViewModeChange(mode)}
              className={`app-segmented-segment ${mode === 'table' ? 'rounded-l-full' : 'rounded-r-full'} ${
                reviewViewMode === mode ? 'app-segmented-segment-active' : ''
              }`}
            >
              {mode === 'table' ? 'Table' : 'Trend'}
            </button>
          ))}
        </div>
        {reviewViewMode === 'table' && (
          <>
            <span className="text-sm font-medium text-slate-500">View</span>
            <div className="app-segmented-track w-fit flex items-center">
              {presetOrder.map((presetId, idx) =>
                (presetId as ReviewViewPresetId | 'custom') === 'custom' ? (
                  <div key="custom" className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setColumnDropdownOpen(false);
                        if (customViewDropdownOpen) {
                          setCustomViewDropdownOpen(false);
                        } else {
                          openCustomDropdown();
                        }
                      }}
                      className={`app-segmented-segment flex items-center gap-1 ${
                        activePreset === 'custom' ? 'app-segmented-segment-active' : ''
                      }`}
                      aria-expanded={customViewDropdownOpen}
                      aria-haspopup="menu"
                    >
                      Custom
                      <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {customViewDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" aria-hidden onClick={closeCustomDropdown} />
                        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 max-h-[20rem] flex flex-col app-dropdown-panel">
                          <button
                            type="button"
                            onClick={selectCurrentSelection}
                            className={`w-full px-3 py-2 text-sm text-left ${
                              activePreset === 'custom' && !activeCustomViewId
                                ? 'bg-indigo-50 text-indigo-800 font-medium'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            Current selection
                          </button>
                          {savedCustomViews.length > 0 ? (
                            <>
                              <p className="px-3 pt-2 pb-1 text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Saved views
                              </p>
                              <div className="overflow-y-auto flex-1 min-h-0 max-h-48">
                                {savedCustomViews.map((view) => (
                                  <div
                                    key={view.id}
                                    className={`flex items-center gap-1 px-3 py-2 text-sm ${
                                      activeCustomViewId === view.id
                                        ? 'bg-indigo-50 text-indigo-800 font-medium'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => applySavedCustomView(view)}
                                      className="flex-1 min-w-0 text-left truncate"
                                    >
                                      {view.name}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeSavedCustomView(view.id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded shrink-0"
                                      title="Delete view"
                                      aria-label={`Delete ${view.name}`}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="px-3 py-2 text-sm text-slate-500">No saved views yet.</p>
                          )}
                          <div className="border-t border-slate-200 p-2 shrink-0">
                            {saveViewOpen ? (
                              <div className="flex gap-2">
                                <input
                                  ref={saveViewNameInputRef}
                                  type="text"
                                  value={saveViewName}
                                  onChange={(e) => setSaveViewName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') addSavedCustomView(saveViewName);
                                    if (e.key === 'Escape') setSaveViewOpen(false);
                                  }}
                                  placeholder="View name"
                                  className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => addSavedCustomView(saveViewName)}
                                  disabled={!saveViewName.trim()}
                                  className="px-2 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSaveViewOpen(false);
                                    setSaveViewName('');
                                  }}
                                  className="px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSaveViewOpen(true)}
                                className="w-full px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg text-left"
                              >
                                Save current columns as view…
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    key={presetId}
                    type="button"
                    onClick={() => applyPreset(presetId)}
                    className={`app-segmented-segment shrink-0 ${idx === 0 ? 'rounded-l-full' : ''} ${
                      activePreset === presetId ? 'app-segmented-segment-active' : ''
                    }`}
                  >
                    {presetLabels[presetId] ?? DEFAULT_PRESET_LABELS[presetId]}
                  </button>
                )
              )}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowLayoutOptions((o) => !o);
                    if (!showLayoutOptions) {
                      setColumnDropdownOpen(false);
                      setCustomViewDropdownOpen(false);
                    }
                  }}
                  className={`app-segmented-segment flex shrink-0 items-center gap-1.5 rounded-none pr-3 pl-3 ${
                    showLayoutOptions ? 'app-segmented-segment-active' : ''
                  }`}
                  aria-expanded={showLayoutOptions}
                  aria-haspopup="menu"
                  title="Columns, saved views, and table layout"
                >
                  <svg
                    className="h-4 w-4 opacity-80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Layout</span>
                  <svg
                    className={`h-3.5 w-3.5 opacity-50 transition-transform duration-200 ${showLayoutOptions ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showLayoutOptions && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      aria-hidden
                      onClick={() => {
                        setShowLayoutOptions(false);
                        setColumnDropdownOpen(false);
                        setCustomViewDropdownOpen(false);
                      }}
                    />
                    <div
                      className="absolute left-0 top-[calc(100%+6px)] z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg shadow-slate-200/40 ring-1 ring-black/[0.03]"
                      role="menu"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setColumnDropdownOpen((o) => !o);
                          setCustomViewDropdownOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 px-2.5 py-2 text-left text-[13px] font-medium leading-snug transition-colors ${
                          columnDropdownOpen ? 'bg-slate-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 6h16M4 10h16M4 14h16M4 18h16"
                            />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1">Show &amp; pin columns</span>
                        <svg
                          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                            columnDropdownOpen ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setColumnDropdownOpen(false);
                          if (customViewDropdownOpen) {
                            setCustomViewDropdownOpen(false);
                          } else {
                            setShowLayoutOptions(false);
                            openCustomDropdown();
                          }
                        }}
                        className="flex w-full items-center gap-3 px-2.5 py-2 text-left text-[13px] font-medium leading-snug text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1">Saved views</span>
                        <svg
                          className="h-4 w-4 shrink-0 text-slate-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div className="mx-2 my-1 h-px bg-slate-100" aria-hidden />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          resetColumnWidths();
                          setShowLayoutOptions(false);
                          setColumnDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-2.5 py-2 text-left text-[13px] font-medium leading-snug text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6a2 2 0 01-2-2v-2"
                            />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1">Reset column widths</span>
                      </button>
                      {columnDropdownOpen && (
                        <div className="max-h-52 overflow-y-auto border-t border-slate-100 bg-slate-50/80 px-1.5 py-1">
                          <div
                            className="mb-0.5 grid grid-cols-[1rem_11rem_auto] items-center gap-x-1.5 border-b border-slate-200/70 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                            aria-hidden
                          >
                            <span />
                            <span className="min-w-0 truncate">Column</span>
                            <span title="Pinned columns stay visible when scrolling horizontally">Pin</span>
                          </div>
                          {REVIEW_TABLE_COLUMNS.filter((col) => col.id !== 'compareCheckbox').map((col) => {
                            const visId = `review-col-vis-${col.id}`;
                            return (
                              <div
                                key={col.id}
                                className="grid grid-cols-[1rem_11rem_auto] items-center gap-x-1.5 rounded px-1 py-0.5 hover:bg-white/80"
                              >
                                <input
                                  id={visId}
                                  type="checkbox"
                                  checked={visibleColumnIds.includes(col.id)}
                                  onChange={() => toggleColumn(col.id)}
                                  className="h-3.5 w-3.5 place-self-center rounded border-slate-300"
                                  aria-label={col.label ? `Show ${col.label}` : 'Show column'}
                                />
                                <label
                                  htmlFor={visId}
                                  className="min-w-0 cursor-pointer truncate text-[13px] leading-tight text-slate-700"
                                >
                                  {col.label || '—'}
                                </label>
                                <label
                                  className="flex cursor-pointer justify-self-start rounded p-0.5 hover:bg-slate-200/60"
                                  title={
                                    col.label
                                      ? `Pin “${col.label}” (stays visible when scrolling)`
                                      : 'Pin column'
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    checked={frozenColumnIds.includes(col.id)}
                                    disabled={!visibleColumnIds.includes(col.id)}
                                    onChange={() => toggleFrozenColumn(col.id)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 disabled:opacity-50"
                                    aria-label={col.label ? `Pin ${col.label}` : 'Pin column'}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPresetLabelsModalOpen(true)}
                className="app-segmented-segment shrink-0 rounded-r-full px-2.5 py-2 text-slate-500 hover:text-slate-700"
                title="Customize view button labels and order"
                aria-label="Customize view buttons"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
