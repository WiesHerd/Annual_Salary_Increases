import type { RefObject } from 'react';
import type { ProviderRecord } from '../../types/provider';
import type { ExperienceBand } from '../../types/experience-band';
import type { ExperienceBandSurveyContext } from '../../types/market-survey-config';
import type { PolicyEvaluationResult } from '../../types/compensation-policy';
import type { CfBySpecialtyRow } from '../../types/cf-by-specialty';
import type { MarketRow } from '../../types/market';
import { ReviewStatus } from '../../types/enums';
import { getExperienceBandAlignmentForProvider } from '../../lib/calculations/recalculate-provider-row';
import {
  getReviewCellValue,
  formatReviewCellValue,
  formatCurrencyTwoDecimals,
  parseCurrencyInput,
  formatPercentTwoDecimals,
  parsePercentInput,
  type ReviewTableColumnDef,
  type ReviewTableColumnId,
} from './review-table-columns';
import { useAppNavigation } from '../../context/app-navigation-context';

type SortDir = 'asc' | 'desc';

export type SalaryReviewEditingCell = {
  employeeId: string;
  columnId: ReviewTableColumnId;
} | null;

export interface SalaryReviewDataTableProps {
  visibleColumns: ReviewTableColumnDef[];
  columnWidths: Partial<Record<ReviewTableColumnId, number>>;
  frozenLeftOffsets: number[];
  isFrozenColumn: (colIndex: number) => boolean;
  totalTableWidthPx: number;
  paginatedRecords: ProviderRecord[];
  sortKey: ReviewTableColumnId;
  sortDir: SortDir;
  fullScreen: boolean;
  tableScrollRef: RefObject<HTMLDivElement>;
  selectedEmployeeId: string | null;
  selectedForCompare: string[];
  experienceBands: ExperienceBand[];
  experienceBandSurveyContext: ExperienceBandSurveyContext;
  cfBySpecialty: CfBySpecialtyRow[];
  evaluationResults: Map<string, PolicyEvaluationResult>;
  marketResolver: (provider: ProviderRecord, key: string) => MarketRow | undefined;
  editingCell: SalaryReviewEditingCell;
  editBuffer: string;
  draggingColumnIndex: number | null;
  dragOverColumnIndex: number | null;
  resizingColumnIndex: number | null;
  onSort: (id: ReviewTableColumnId) => void;
  onResizeStart: (colIndex: number) => (e: React.MouseEvent) => void;
  onHeaderDragStart: (index: number) => (e: React.DragEvent) => void;
  onHeaderDragOver: (index: number) => (e: React.DragEvent) => void;
  onHeaderDragLeave: () => void;
  onHeaderDrop: (toIndex: number) => (e: React.DragEvent) => void;
  onHeaderDragEnd: () => void;
  onToggleProviderForCompare: (employeeId: string) => void;
  onSelectAllOnPageForCompare: () => void;
  onUpdateRecord: (employeeId: string, updates: Partial<ProviderRecord>) => void;
  onSetSelectedEmployeeId: (id: string) => void;
  onSetDrawerClosing: (closing: boolean) => void;
  onSetNotesModalEmployeeId: (id: string) => void;
  onSetEditingCell: (cell: SalaryReviewEditingCell) => void;
  onSetEditBuffer: (value: string) => void;
  /** When true, disable inline edits (finalized cycle). */
  readOnly?: boolean;
}

export interface SalaryReviewTablePaginationProps {
  startRow: number;
  endRow: number;
  sortedRecordsLength: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  safePage: number;
  totalPages: number;
  goToPageInput: string;
  setGoToPageInput: (value: string) => void;
  handleGoToPage: () => void;
}

export function SalaryReviewDataTable({
  visibleColumns,
  columnWidths,
  frozenLeftOffsets,
  isFrozenColumn,
  totalTableWidthPx,
  paginatedRecords,
  sortKey,
  sortDir,
  fullScreen,
  tableScrollRef,
  selectedEmployeeId,
  selectedForCompare,
  experienceBands,
  experienceBandSurveyContext,
  cfBySpecialty,
  evaluationResults,
  marketResolver,
  editingCell,
  editBuffer,
  draggingColumnIndex,
  dragOverColumnIndex,
  resizingColumnIndex,
  onSort,
  onResizeStart,
  onHeaderDragStart,
  onHeaderDragOver,
  onHeaderDragLeave,
  onHeaderDrop,
  onHeaderDragEnd,
  onToggleProviderForCompare,
  onSelectAllOnPageForCompare,
  onUpdateRecord,
  onSetSelectedEmployeeId,
  onSetDrawerClosing,
  onSetNotesModalEmployeeId,
  onSetEditingCell,
  onSetEditBuffer,
  readOnly = false,
}: SalaryReviewDataTableProps) {
  const { navigate } = useAppNavigation();

  return (
    <div
      ref={tableScrollRef}
      className={`min-w-0 overflow-auto border-t border-neutral-200/80 ${fullScreen ? 'max-h-[calc(100vh-10rem)]' : 'max-h-[calc(100vh-12rem)]'}`}
    >
      <table
        className="border-collapse table-fixed"
        style={{
          width: totalTableWidthPx,
          minWidth: `max(100%, ${totalTableWidthPx}px)`,
        }}
      >
        <colgroup>
          {visibleColumns.map((col) => (
            <col key={col.id} style={{ width: columnWidths[col.id] ?? 128, minWidth: columnWidths[col.id] ?? 128 }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-20 bg-neutral-50 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
          <tr className="bg-neutral-50">
            {visibleColumns.map((col, index) => {
              const frozen = isFrozenColumn(index);
              const left = frozen ? frozenLeftOffsets[index] : undefined;
              const widthPx = columnWidths[col.id] ?? 128;
              return (
                <th
                  key={col.id}
                  draggable={col.id !== 'compareCheckbox'}
                  onDragStart={col.id === 'compareCheckbox' ? undefined : onHeaderDragStart(index)}
                  onDragOver={onHeaderDragOver(index)}
                  onDragLeave={onHeaderDragLeave}
                  onDrop={onHeaderDrop(index)}
                  onDragEnd={onHeaderDragEnd}
                  title={col.id === 'compareCheckbox' ? 'Select for compare' : col.label}
                  style={{
                    width: widthPx,
                    minWidth: widthPx,
                    maxWidth: widthPx,
                    ...(frozen && left !== undefined ? { position: 'sticky', left, zIndex: 21 } : {}),
                  }}
                  className={`relative px-2 py-3 text-[11px] font-semibold text-neutral-600 uppercase tracking-wide select-none bg-neutral-50 hover:bg-neutral-100 transition-colors whitespace-normal overflow-hidden ${
                    col.id === 'compareCheckbox' ? 'cursor-default' : 'cursor-pointer'
                  } ${frozen ? 'shadow-[2px_0_4px_rgba(0,0,0,0.06)]' : ''} ${col.align === 'right' ? 'text-right' : 'text-left'} ${draggingColumnIndex === index ? 'opacity-50' : ''} ${
                    dragOverColumnIndex === index ? 'bg-indigo-100 ring-1 ring-indigo-300' : ''
                  } ${resizingColumnIndex === index ? 'select-none' : ''}`}
                  onClick={col.id === 'compareCheckbox' ? undefined : () => onSort(col.id)}
                >
                  {col.id === 'compareCheckbox' ? (
                    <label className="flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedForCompare.includes(r.Employee_ID))}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate =
                              paginatedRecords.length > 0 &&
                              paginatedRecords.some((r) => selectedForCompare.includes(r.Employee_ID)) &&
                              !paginatedRecords.every((r) => selectedForCompare.includes(r.Employee_ID));
                          }
                        }}
                        onChange={onSelectAllOnPageForCompare}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-300"
                        aria-label="Select all on page for compare"
                      />
                    </label>
                  ) : (
                    <span className={`flex items-start gap-1 min-w-0 ${col.align === 'right' ? 'justify-end' : ''}`}>
                      <span
                        className="shrink-0 w-3 cursor-grab active:cursor-grabbing text-neutral-400"
                        aria-hidden
                        title="Drag to reorder column"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⋮⋮
                      </span>
                      <span
                        className={`min-w-0 break-words leading-tight ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                        title={col.label}
                      >
                        {col.label}
                      </span>
                      {sortKey === col.id && (
                        <span className="text-blue-600 shrink-0" aria-hidden>
                          {sortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </span>
                  )}
                  <span
                    role="separator"
                    aria-label={`Resize column ${col.label}`}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize shrink-0 touch-none z-30 hover:bg-blue-300/50 active:bg-blue-400/50"
                    style={{ marginRight: '-4px' }}
                    onMouseDown={onResizeStart(index)}
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {paginatedRecords.map((r) => {
            const matchKeyRow = (r.Market_Specialty_Override ?? r.Specialty ?? r.Benchmark_Group ?? '').trim();
            const marketRowForBand = matchKeyRow ? marketResolver(r, matchKeyRow) : undefined;
            const bandAlignment = getExperienceBandAlignmentForProvider(
              r,
              r.Proposed_TCC_Percentile ?? r.Current_TCC_Percentile,
              experienceBands,
              marketRowForBand,
              experienceBandSurveyContext
            );
            const rowAlignmentClass =
              bandAlignment === 'below'
                ? 'bg-amber-50/50'
                : bandAlignment === 'above'
                  ? 'bg-sky-50/50'
                  : '';
            return (
              <tr
                key={r.Employee_ID}
                className={`group transition-colors ${
                  selectedEmployeeId === r.Employee_ID ? 'bg-indigo-100/60' : 'hover:bg-indigo-50/30'
                } ${rowAlignmentClass}`}
              >
                {visibleColumns.map((col, colIndex) => {
                  const value = getReviewCellValue(
                    r,
                    col.id,
                    experienceBands,
                    evaluationResults.get(r.Employee_ID),
                    cfBySpecialty,
                    {
                      marketRow: marketRowForBand,
                      experienceBandSurveyContext,
                    }
                  );
                  const display = formatReviewCellValue(value, col.format);
                  const isEditable = !readOnly && col.editable && col.id !== 'notesIndicator';
                  const isNotes = col.id === 'notesIndicator';
                  const frozen = isFrozenColumn(colIndex);
                  const left = frozen ? frozenLeftOffsets[colIndex] : undefined;
                  const widthPx = columnWidths[col.id] ?? 128;
                  const stickyCellClass = frozen
                    ? `z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)] ${
                        selectedEmployeeId === r.Employee_ID
                          ? 'bg-indigo-100'
                          : bandAlignment === 'below'
                            ? 'bg-amber-50/50 group-hover:bg-amber-50/70'
                            : bandAlignment === 'above'
                              ? 'bg-sky-50/50 group-hover:bg-sky-50/70'
                              : 'bg-white group-hover:bg-indigo-50/30'
                      }`
                    : '';
                  const alignmentCellClass =
                    col.id === 'bandAlignment' && bandAlignment
                      ? bandAlignment === 'below'
                        ? 'bg-amber-100'
                        : bandAlignment === 'in'
                          ? 'bg-emerald-50'
                          : 'bg-sky-100'
                      : col.id === 'currentTccPercentile' && bandAlignment && bandAlignment !== 'in'
                        ? bandAlignment === 'below'
                          ? 'bg-amber-100'
                          : 'bg-sky-100'
                        : '';

                  return (
                    <td
                      key={col.id}
                      style={{
                        width: widthPx,
                        minWidth: widthPx,
                        maxWidth: widthPx,
                        ...(frozen && left !== undefined ? { position: 'sticky', left } : {}),
                      }}
                      className={`px-2 py-1.5 text-sm text-slate-800 whitespace-nowrap overflow-hidden ${stickyCellClass} ${alignmentCellClass} ${col.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                      onClick={(e) => isNotes && e.stopPropagation()}
                    >
                      {col.id === 'compareCheckbox' ? (
                        <label className="flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedForCompare.includes(r.Employee_ID)}
                            onChange={() => onToggleProviderForCompare(r.Employee_ID)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-slate-300"
                            aria-label={`Select ${r.Provider_Name ?? r.Employee_ID} for compare`}
                          />
                        </label>
                      ) : col.id === 'reviewStatus' && col.editable && !readOnly ? (
                        <div
                          className="flex items-center gap-0.5"
                          role="group"
                          aria-label="Set status"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {[
                            { status: ReviewStatus.InReview, icon: 'progress', label: 'In progress' },
                            { status: ReviewStatus.Approved, icon: 'done', label: 'Complete' },
                          ].map(({ status, icon, label }) => {
                            const current = (r.Review_Status ?? '').trim();
                            const isEffectiveAsComplete = current === ReviewStatus.Effective;
                            const isInProgress =
                              current === ReviewStatus.InReview ||
                              current === '' ||
                              current === ReviewStatus.Draft ||
                              current === ReviewStatus.Deferred;
                            const isActive =
                              current === status ||
                              (status === ReviewStatus.Approved && isEffectiveAsComplete) ||
                              (status === ReviewStatus.InReview && isInProgress);
                            const activeClass =
                              isActive && status === ReviewStatus.Approved
                                ? 'bg-emerald-100 text-emerald-700'
                                : isActive
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600';
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => onUpdateRecord(r.Employee_ID, { Review_Status: status })}
                                className={`p-1 rounded transition-colors ${activeClass}`}
                                title={label}
                                aria-label={label}
                                aria-pressed={isActive}
                              >
                                {icon === 'progress' && (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                                {icon === 'done' && (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : isNotes && col.editable && !readOnly ? (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetNotesModalEmployeeId(r.Employee_ID);
                          }}
                          className="p-1 rounded hover:bg-slate-200 text-slate-600"
                          title={r.Notes ?? 'Add note'}
                          aria-label={r.Notes ? 'Edit note' : 'Add note'}
                        >
                          {r.Notes ? '📝' : '+'}
                        </button>
                      ) : col.id === 'providerName' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetSelectedEmployeeId(r.Employee_ID);
                            onSetDrawerClosing(false);
                          }}
                          className="text-left w-full min-w-0 truncate block text-indigo-600 hover:text-indigo-800 hover:underline focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded px-0.5 -mx-0.5"
                          title="View provider details"
                        >
                          {display}
                        </button>
                      ) : isEditable && (col.id === 'proposedBaseSalary' || col.id === 'approvedIncreaseAmount') ? (
                        (() => {
                          const isEditing =
                            editingCell?.employeeId === r.Employee_ID && editingCell?.columnId === col.id;
                          const displayValue = typeof value === 'number' ? formatCurrencyTwoDecimals(value) : '';
                          return (
                            <input
                              type="text"
                              value={isEditing ? editBuffer : displayValue}
                              onFocus={() => {
                                onSetEditingCell({ employeeId: r.Employee_ID, columnId: col.id });
                                onSetEditBuffer(typeof value === 'number' ? String(value) : '');
                              }}
                              onChange={(e) => onSetEditBuffer(e.target.value)}
                              onBlur={() => {
                                const num = parseCurrencyInput(editBuffer);
                                if (col.id === 'proposedBaseSalary') {
                                  onUpdateRecord(r.Employee_ID, { Proposed_Base_Salary: num });
                                }
                                if (col.id === 'approvedIncreaseAmount') {
                                  onUpdateRecord(r.Employee_ID, { Approved_Increase_Amount: num });
                                }
                                onSetEditingCell(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full max-w-full min-w-0 px-2 py-1 text-sm border border-slate-300 rounded-lg tabular-nums text-right focus:ring-2 focus:ring-indigo-500"
                            />
                          );
                        })()
                      ) : isEditable && col.id === 'approvedIncreasePercent' ? (
                        (() => {
                          const isEditing =
                            editingCell?.employeeId === r.Employee_ID && editingCell?.columnId === col.id;
                          const displayValue = typeof value === 'number' ? formatPercentTwoDecimals(value) : '';
                          return (
                            <input
                              type="text"
                              value={isEditing ? editBuffer : displayValue}
                              onFocus={() => {
                                onSetEditingCell({ employeeId: r.Employee_ID, columnId: col.id });
                                onSetEditBuffer(typeof value === 'number' ? String(value) : '');
                              }}
                              onChange={(e) => onSetEditBuffer(e.target.value)}
                              onBlur={() => {
                                const num = parsePercentInput(editBuffer);
                                onUpdateRecord(r.Employee_ID, { Approved_Increase_Percent: num });
                                onSetEditingCell(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full max-w-full min-w-0 px-2 py-1 text-sm border border-slate-300 rounded-lg tabular-nums text-right focus:ring-2 focus:ring-indigo-500"
                            />
                          );
                        })()
                      ) : isEditable && col.id === 'proposedCf' ? (
                        <input
                          type="number"
                          value={typeof value === 'number' ? value : ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = raw === '' ? undefined : Number(raw);
                            onUpdateRecord(r.Employee_ID, { Proposed_CF: num });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full max-w-full min-w-0 px-2 py-1 text-sm border border-slate-300 rounded-lg tabular-nums text-right focus:ring-2 focus:ring-indigo-500"
                          step={1}
                        />
                      ) : isEditable && col.id === 'proposedTier' ? (
                        <input
                          type="text"
                          value={r.Proposed_Tier ?? ''}
                          onChange={(e) => onUpdateRecord(r.Employee_ID, { Proposed_Tier: e.target.value || undefined })}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full max-w-full min-w-0 px-2 py-1 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : col.id === 'policySource' &&
                        (r.Policy_Rule_Id || evaluationResults.get(r.Employee_ID)?.appliedPolicies?.[0]?.id) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const ruleId =
                              r.Policy_Rule_Id ?? evaluationResults.get(r.Employee_ID)?.appliedPolicies?.[0]?.id ?? '';
                            if (ruleId) {
                              navigate(
                                {
                                  view: 'parameters',
                                  controlsTab: 'policy-engine-rules',
                                  ruleId,
                                },
                                { returnToCurrent: true }
                              );
                            }
                          }}
                          className="text-left w-full min-w-0 truncate block text-indigo-600 hover:text-indigo-800 hover:underline focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded px-0.5 -mx-0.5"
                          title="Open rule in Policy Engine"
                        >
                          {display}
                        </button>
                      ) : (
                        <span className="block truncate min-w-0" title={String(display)}>
                          {display}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SalaryReviewTablePagination({
  startRow,
  endRow,
  sortedRecordsLength,
  pageSize,
  setPageSize,
  setPage,
  safePage,
  totalPages,
  goToPageInput,
  setGoToPageInput,
  handleGoToPage,
}: SalaryReviewTablePaginationProps) {
  return (
    <div className="shrink-0 border-t border-slate-200">
      <div className="px-4 py-2.5 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm text-slate-600">
            Showing <span className="font-medium text-slate-800">{startRow}</span>–<span className="font-medium text-slate-800">{endRow}</span> of{' '}
            <span className="font-medium text-slate-800">{sortedRecordsLength}</span> provider{sortedRecordsLength !== 1 ? 's' : ''}
          </span>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {[10, 25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              setGoToPageInput('');
            }}
            disabled={safePage <= 1}
            className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600 flex items-center gap-1.5">
            Page
            <input
              type="number"
              min={1}
              max={totalPages}
              value={goToPageInput !== '' ? goToPageInput : safePage}
              onChange={(e) => setGoToPageInput(e.target.value)}
              onBlur={handleGoToPage}
              onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
              className="w-12 px-1.5 py-1 text-sm text-center border border-slate-300 rounded-lg tabular-nums focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Go to page"
            />
            of <span className="font-medium text-slate-800">{totalPages}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1));
              setGoToPageInput('');
            }}
            disabled={safePage >= totalPages}
            className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
