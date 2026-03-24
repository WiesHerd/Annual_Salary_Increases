/**
 * APP map buckets: bucket name (ties to survey row when labels match) + optional admin notes.
 */

import { useState, useCallback, useMemo } from 'react';
import type { ProviderRecord } from '../../../types/provider';
import type { MarketSurveySet } from '../../../types/market-survey-config';
import { loadAppCombinedGroups, saveAppCombinedGroups } from '../../../lib/parameters-storage';
import { SPECIALTY_MAP_APPS_TAB_SURVEY_ID } from '../../../lib/specialty-map-cohort';
import type { AppCombinedGroupRow } from '../../../types/app-combined-group';
import {
  syncLearnedFromAppCombinedGroups,
  loadAppBucketLearnedStore,
  clearAppBucketLearnedStore,
} from '../../../lib/app-bucket-learning-storage';
import { InfoIconTip } from '../../../components/info-icon-tip';
import {
  parametersFieldInputClass,
  parametersPrimaryButtonClass,
  parametersSectionHeadingClass,
  parametersTablePanelClass,
} from '../parameters-tab-ui';

export interface AppCombinedGroupsTabProps {
  records: ProviderRecord[];
  marketSurveys: MarketSurveySet;
}

/** Roster not needed here; parent still passes `records` for tab consistency. */
export function AppCombinedGroupsTab({ records: _records, marketSurveys }: AppCombinedGroupsTabProps) {
  void _records;
  const surveyId = SPECIALTY_MAP_APPS_TAB_SURVEY_ID;
  const marketRows = marketSurveys[surveyId] ?? [];

  const marketSpecialtyPreview = useMemo(() => {
    const list = [...new Set(marketRows.map((r) => r.specialty).filter((s) => s.trim() !== ''))];
    return list.sort((a, b) => a.localeCompare(b));
  }, [marketRows]);

  const [groups, setGroupsState] = useState<AppCombinedGroupRow[]>(() => loadAppCombinedGroups(surveyId));
  const [learnedStoreRev, setLearnedStoreRev] = useState(0);

  const learnedCount = useMemo(
    () => Object.keys(loadAppBucketLearnedStore().bySpecialtyKey).length,
    [learnedStoreRev]
  );

  const persist = useCallback(
    (next: AppCombinedGroupRow[]) => {
      const normalized = next.map((g) => ({
        ...g,
        providerSpecialties: [],
      }));
      setGroupsState(normalized);
      saveAppCombinedGroups(surveyId, normalized);
      syncLearnedFromAppCombinedGroups(normalized);
    },
    [surveyId]
  );

  const addRow = useCallback(() => {
    const id = `cg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    persist([
      ...groups,
      { id, combinedGroupName: '', surveySpecialties: [], providerSpecialties: [], notes: '' },
    ]);
  }, [groups, persist]);

  const removeRow = useCallback(
    (id: string) => {
      persist(groups.filter((g) => g.id !== id));
    },
    [groups, persist]
  );

  const patchRow = useCallback(
    (id: string, patch: Partial<Pick<AppCombinedGroupRow, 'combinedGroupName' | 'notes'>>) => {
      persist(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    },
    [groups, persist]
  );

  const clearSavedAssignments = useCallback(() => {
    clearAppBucketLearnedStore();
    setLearnedStoreRev((r) => r + 1);
  }, []);

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex flex-wrap items-center gap-1.5">
          <h3 className={`${parametersSectionHeadingClass} mb-0`}>APP map buckets</h3>
          <InfoIconTip aria-label="About APP map buckets" variant="minimal" align="left">
            <p>
              Name each bucket so it matches an APP market row when you want that survey line&apos;s benchmarks. Optional
              notes are only for your team (not used for math or mapping). Bucket names appear in{' '}
              <strong className="text-slate-800">Specialty map → APPs</strong>.
            </p>
            <p>
              <strong className="text-slate-800">Auto Map</strong> can reuse saved label hints from prior sessions until you
              clear them. Use the <span className="font-medium text-slate-700">clear hints</span> button (X icon) next to{' '}
              <span className="font-medium text-slate-700">Add bucket</span> when it appears; hover the icon for how many are saved.
            </p>
            {marketSpecialtyPreview.length > 0 && (
              <p className="text-slate-600">
                <span className="font-medium text-slate-800">APP file specialties ({marketSpecialtyPreview.length}):</span>{' '}
                {marketSpecialtyPreview.join(', ')}. Match a bucket name to a row when you need that benchmark.
              </p>
            )}
          </InfoIconTip>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
          <button type="button" onClick={addRow} className={parametersPrimaryButtonClass}>
            Add bucket
          </button>
          {learnedCount > 0 && (
            <button
              type="button"
              onClick={clearSavedAssignments}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1"
              title={`Clear ${learnedCount} saved Auto Map hint${learnedCount === 1 ? '' : 's'}`}
              aria-label={`Clear ${learnedCount} saved Auto Map hint${learnedCount === 1 ? '' : 's'}`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {marketSpecialtyPreview.length === 0 && (
        <p className="text-xs text-amber-700 -mt-2 mb-3">Upload the APP market file so benchmarks can resolve to survey rows.</p>
      )}

      <div className={parametersTablePanelClass}>
        <table className="app-settings-table min-w-full border-collapse">
          <thead>
            <tr>
              <th className="min-w-[12rem]">Bucket name</th>
              <th className="min-w-[16rem]">Notes (optional)</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No buckets yet. Add a row and name it to align with your APP survey when possible.
                </td>
              </tr>
            ) : (
              groups.map((g) => (
                <tr key={g.id} className="align-top hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={g.combinedGroupName}
                      onChange={(e) => patchRow(g.id, { combinedGroupName: e.target.value })}
                      className={`w-full min-w-[12rem] ${parametersFieldInputClass}`}
                      placeholder="e.g. match an APP survey row label"
                      aria-label="Bucket name"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      value={g.notes ?? ''}
                      onChange={(e) => patchRow(g.id, { notes: e.target.value })}
                      rows={3}
                      className={`w-full min-w-[16rem] ${parametersFieldInputClass} text-sm`}
                      placeholder="Short reminder for your team (optional)"
                      aria-label="Notes"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => removeRow(g.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                      aria-label="Remove bucket"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
