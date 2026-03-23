/**
 * APP benchmark buckets: column A = all survey rows + provider keys (with current bucket);
 * column B = buckets. Select rows (click), then click a bucket to assign.
 */

import { useMemo, useState, useCallback } from 'react';
import { InfoIconTip } from '../../components/info-icon-tip';
import type { AppCombinedGroupRow } from '../../types/app-combined-group';

const KEY_SEP = '\u0001';

function itemKey(kind: 'survey' | 'provider', name: string): string {
  return `${kind}${KEY_SEP}${name}`;
}

function parseItemKey(key: string): { kind: 'survey' | 'provider'; name: string } | null {
  const i = key.indexOf(KEY_SEP);
  if (i <= 0) return null;
  const kind = key.slice(0, i);
  if (kind !== 'survey' && kind !== 'provider') return null;
  const name = key.slice(i + KEY_SEP.length);
  if (!name) return null;
  return { kind, name };
}

function findSurveyGroupId(groups: AppCombinedGroupRow[], specialty: string): string | null {
  for (const g of groups) {
    if (g.surveySpecialties.some((s) => s === specialty)) return g.id;
  }
  return null;
}

function findProviderGroupId(groups: AppCombinedGroupRow[], specialty: string): string | null {
  for (const g of groups) {
    if ((g.providerSpecialties ?? []).some((s) => s === specialty)) return g.id;
  }
  return null;
}

function assignKeysToGroup(
  groups: AppCombinedGroupRow[],
  targetId: string,
  keys: string[]
): AppCombinedGroupRow[] {
  const items = keys.map(parseItemKey).filter(Boolean) as { kind: 'survey' | 'provider'; name: string }[];
  if (items.length === 0) return groups;

  const next = groups.map((g) => ({
    ...g,
    surveySpecialties: [...g.surveySpecialties],
    providerSpecialties: [...(g.providerSpecialties ?? [])],
  }));

  for (const g of next) {
    for (const it of items) {
      if (it.kind === 'survey') {
        g.surveySpecialties = g.surveySpecialties.filter((s) => s !== it.name);
      } else {
        g.providerSpecialties = g.providerSpecialties.filter((s) => s !== it.name);
      }
    }
  }

  const target = next.find((g) => g.id === targetId);
  if (!target) return next;

  for (const it of items) {
    if (it.kind === 'survey') {
      if (!target.surveySpecialties.includes(it.name)) target.surveySpecialties.push(it.name);
    } else if (!target.providerSpecialties.includes(it.name)) {
      target.providerSpecialties.push(it.name);
    }
  }

  return next;
}

function removeKeysFromGroups(groups: AppCombinedGroupRow[], keys: string[]): AppCombinedGroupRow[] {
  const items = keys.map(parseItemKey).filter(Boolean) as { kind: 'survey' | 'provider'; name: string }[];
  if (items.length === 0) return groups;

  return groups.map((g) => {
    let surveySpecialties = [...g.surveySpecialties];
    let providerSpecialties = [...(g.providerSpecialties ?? [])];
    for (const it of items) {
      if (it.kind === 'survey') {
        surveySpecialties = surveySpecialties.filter((s) => s !== it.name);
      } else {
        providerSpecialties = providerSpecialties.filter((s) => s !== it.name);
      }
    }
    return { ...g, surveySpecialties, providerSpecialties };
  });
}

export interface AppCombinedGroupsBulkPanelProps {
  marketSpecialties: string[];
  providerSpecialtyOptions: string[];
  groups: AppCombinedGroupRow[];
  setGroups: (updater: AppCombinedGroupRow[] | ((prev: AppCombinedGroupRow[]) => AppCombinedGroupRow[])) => void;
}

export function AppCombinedGroupsBulkPanel({
  marketSpecialties,
  providerSpecialtyOptions,
  groups,
  setGroups,
}: AppCombinedGroupsBulkPanelProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [newBucketName, setNewBucketName] = useState('');
  const [customProviderInput, setCustomProviderInput] = useState('');
  const [extraProviderKeys, setExtraProviderKeys] = useState<Set<string>>(() => new Set());

  const surveySet = useMemo(() => new Set(marketSpecialties), [marketSpecialties]);

  const allProviderNames = useMemo(() => {
    const s = new Set<string>();
    for (const p of providerSpecialtyOptions) {
      const t = p.trim();
      if (t) s.add(t);
    }
    for (const g of groups) {
      for (const p of g.providerSpecialties ?? []) {
        const t = p.trim();
        if (t) s.add(t);
      }
    }
    for (const p of extraProviderKeys) {
      const t = p.trim();
      if (t) s.add(t);
    }
    return [...s].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [providerSpecialtyOptions, groups, extraProviderKeys]);

  const rows = useMemo(() => {
    const out: { key: string; kind: 'survey' | 'provider'; name: string; bucketId: string | null; bucketLabel: string }[] = [];
    for (const name of marketSpecialties) {
      const bid = findSurveyGroupId(groups, name);
      const g = bid ? groups.find((x) => x.id === bid) : undefined;
      const label = g?.combinedGroupName?.trim() ? g.combinedGroupName.trim() : bid ? '(unnamed bucket)' : '—';
      out.push({ key: itemKey('survey', name), kind: 'survey', name, bucketId: bid, bucketLabel: label });
    }
    for (const name of allProviderNames) {
      const bid = findProviderGroupId(groups, name);
      const g = bid ? groups.find((x) => x.id === bid) : undefined;
      const label = g?.combinedGroupName?.trim() ? g.combinedGroupName.trim() : bid ? '(unnamed bucket)' : '—';
      out.push({ key: itemKey('provider', name), kind: 'provider', name, bucketId: bid, bucketLabel: label });
    }
    return out.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'survey' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }, [marketSpecialties, allProviderNames, groups]);

  const toggleKey = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAllRows = useCallback(() => {
    setSelectedKeys(new Set(rows.map((r) => r.key)));
  }, [rows]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const assignToBucket = useCallback(
    (targetId: string) => {
      const keys = [...selectedKeys];
      if (keys.length === 0) return;
      setGroups((prev) => assignKeysToGroup(prev, targetId, keys));
      setSelectedKeys(new Set());
    },
    [selectedKeys, setGroups]
  );

  const stripFromBuckets = useCallback(() => {
    const keys = [...selectedKeys];
    if (keys.length === 0) return;
    setGroups((prev) => removeKeysFromGroups(prev, keys));
    setSelectedKeys(new Set());
  }, [selectedKeys, setGroups]);

  const removeBucket = useCallback(
    (id: string) => {
      const g = groups.find((x) => x.id === id);
      const keysToDrop = new Set<string>();
      if (g) {
        for (const s of g.surveySpecialties) keysToDrop.add(itemKey('survey', s));
        for (const s of g.providerSpecialties ?? []) keysToDrop.add(itemKey('provider', s));
      }
      setSelectedKeys((sel) => {
        if (sel.size === 0) return sel;
        const next = new Set(sel);
        for (const k of keysToDrop) next.delete(k);
        return next;
      });
      setGroups((prev) => prev.filter((x) => x.id !== id));
    },
    [groups, setGroups]
  );

  const renameBucket = useCallback(
    (id: string, name: string) => {
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, combinedGroupName: name } : g)));
    },
    [setGroups]
  );

  const createBucket = useCallback(() => {
    const trimmed = newBucketName.trim();
    if (!trimmed) return;
    const id = `cg-${Date.now()}`;
    const keys = [...selectedKeys];
    setGroups((prev) => {
      const withNew = [...prev, { id, combinedGroupName: trimmed, surveySpecialties: [], providerSpecialties: [] }];
      if (keys.length === 0) return withNew;
      return assignKeysToGroup(withNew, id, keys);
    });
    setNewBucketName('');
    setSelectedKeys(new Set());
  }, [newBucketName, selectedKeys, setGroups]);

  const addEmptyBucket = useCallback(() => {
    const id = `cg-${Date.now()}`;
    setGroups((prev) => [...prev, { id, combinedGroupName: '', surveySpecialties: [], providerSpecialties: [] }]);
  }, [setGroups]);

  const queueCustomProvider = useCallback(() => {
    const t = customProviderInput.trim();
    if (!t) return;
    if (surveySet.has(t)) {
      setCustomProviderInput('');
      return;
    }
    setExtraProviderKeys((prev) => {
      const next = new Set(prev);
      next.add(t);
      return next;
    });
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.add(itemKey('provider', t));
      return next;
    });
    setCustomProviderInput('');
  }, [customProviderInput, surveySet]);

  const nSel = selectedKeys.size;

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>Select rows, then a bucket.</span>
        <InfoIconTip aria-label="Bucket workflow">
          <p>Click table rows to multi-select. Click a bucket card to move them there. <strong className="text-slate-800">Unassigned</strong> strips bucket membership.</p>
          <p>Rename and delete use the fields on each card (clicks there don&apos;t assign).</p>
        </InfoIconTip>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(260px,320px)] gap-4 min-w-0 items-start">
        {/* Column 1: specialties + current bucket */}
        <div className="min-w-0 border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-700">Survey rows & provider keys</span>
            <div className="flex items-center gap-2 shrink-0">
              {rows.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllRows}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-1.5 py-0.5"
                >
                  Select all
                </button>
              )}
              {nSel > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 px-1.5 py-0.5"
                >
                  Clear ({nSel})
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[min(480px,60vh)] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 z-[1] shadow-sm">
                <tr className="text-left text-xs text-slate-600">
                  <th className="px-3 py-2 font-medium">Specialty</th>
                  <th className="px-3 py-2 font-medium w-[72px]">Type</th>
                  <th className="px-3 py-2 font-medium">Bucket</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-slate-500 text-sm">
                      No survey rows or provider keys yet. Upload market and provider data first.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const selected = selectedKeys.has(r.key);
                    return (
                      <tr
                        key={r.key}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleKey(r.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleKey(r.key);
                          }
                        }}
                        className={`border-t border-slate-100 cursor-pointer transition-colors ${
                          selected ? 'bg-indigo-100/90 ring-1 ring-inset ring-indigo-300' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-slate-900 align-middle">{r.name}</td>
                        <td className="px-3 py-2.5 align-middle">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                              r.kind === 'survey' ? 'bg-slate-200 text-slate-800' : 'bg-indigo-100 text-indigo-900'
                            }`}
                          >
                            {r.kind === 'survey' ? 'Srv' : 'Prv'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 text-xs align-middle">{r.bucketLabel}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 2: buckets (click to assign) */}
        <div className="min-w-0 space-y-2">
          <div className="text-xs font-medium text-slate-700 uppercase tracking-wide px-0.5">Buckets</div>

          <button
            type="button"
            onClick={() => {
              if (nSel === 0) return;
              stripFromBuckets();
            }}
            disabled={nSel === 0}
            className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
              nSel > 0
                ? 'border-amber-300 bg-amber-50/80 hover:bg-amber-100/90 text-amber-950'
                : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span className="text-sm font-semibold">Unassigned</span>
            <p className="text-xs mt-0.5 opacity-90">{nSel > 0 ? `Clear ${nSel} from buckets` : '—'}</p>
          </button>

          <div className="space-y-2 max-h-[min(340px,45vh)] overflow-y-auto pr-0.5">
            {groups.map((g) => {
              const sc = g.surveySpecialties.length;
              const pc = (g.providerSpecialties ?? []).length;
              const canAssign = nSel > 0;
              return (
                <div
                  key={g.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => canAssign && assignToBucket(g.id)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && canAssign) {
                      e.preventDefault();
                      assignToBucket(g.id);
                    }
                  }}
                  className={`rounded-xl border px-3 py-2.5 transition-colors ${
                    canAssign
                      ? 'border-indigo-200 bg-white hover:bg-indigo-50/80 cursor-pointer shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 text-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={g.combinedGroupName}
                      onChange={(e) => renameBucket(g.id, e.target.value)}
                      placeholder="Bucket name"
                      className="flex-1 min-w-0 px-2 py-1 text-sm border border-slate-300 rounded-md bg-white"
                      aria-label="Bucket name"
                    />
                    <button
                      type="button"
                      onClick={() => removeBucket(g.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded shrink-0"
                      aria-label="Delete bucket"
                      title="Delete bucket"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                    {sc} survey · {pc} roster
                  </p>
                  {canAssign ? (
                    <p className="text-[11px] font-medium text-indigo-700 mt-0.5">Assign {nSel}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-medium text-slate-700">New bucket</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createBucket())}
                placeholder="Name"
                className="flex-1 min-w-[120px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
              />
              <button
                type="button"
                onClick={createBucket}
                disabled={!newBucketName.trim()}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {nSel > 0 ? 'Create & assign' : 'Create'}
              </button>
            </div>
            <button type="button" onClick={addEmptyBucket} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              + Empty bucket (name later)
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 pt-1 border-t border-slate-100">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Custom provider key</label>
          <input
            type="text"
            value={customProviderInput}
            onChange={(e) => setCustomProviderInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), queueCustomProvider())}
            placeholder="Not on roster—add, select, then assign to a bucket"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          />
        </div>
        <button
          type="button"
          onClick={queueCustomProvider}
          disabled={!customProviderInput.trim()}
          className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add & select
        </button>
      </div>
    </div>
  );
}
