import { useCallback, useMemo, useState, useEffect } from 'react';
import type { ExperienceBand } from '../../../types/experience-band';
import { MultiSelectDropdown } from '../../../components/multi-select-dropdown';
import { parametersEmptyRowsPanelClass, parametersPrimaryButtonClass } from '../parameters-tab-ui';

export interface ExperienceBandScopeListHints {
  providerTypes: string[];
  planTypes: string[];
  /** Specialties, market specialties, and benchmark groups for cohort targeting */
  specialtyOptions?: string[];
}

const DATALIST_PROVIDER = 'experience-band-datalist-provider-type';
const DATALIST_PLAN = 'experience-band-datalist-plan';
const DATALIST_SPECIALTY = 'experience-band-datalist-specialty';

interface ExperienceBandsTabProps {
  experienceBands: ExperienceBand[];
  setExperienceBands: (v: ExperienceBand[] | ((prev: ExperienceBand[]) => ExperienceBand[])) => void;
  scopeListHints?: ExperienceBandScopeListHints;
}

function newId() {
  return `band-${Date.now()}`;
}

function mergeOptionsWithSelected(base: string[], selected: string[] | undefined): string[] {
  return [...new Set([...base, ...(selected ?? [])])]
    .filter((s) => s.trim() !== '')
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** Full-width numeric fields in the side-by-side tenure / pay guardrail row */
const guardrailRowInputClass =
  'w-full min-w-0 px-2.5 py-2 text-sm border border-slate-300 rounded-lg text-right tabular-nums bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400';

const textInputClass =
  'w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400';

/** Rotates per band so adjacent cards are easier to tell apart at a glance. */
const BAND_VISUAL = [
  {
    left: 'border-l-indigo-600',
    badge: 'bg-indigo-100 text-indigo-950 border border-indigo-300/60',
  },
  {
    left: 'border-l-violet-600',
    badge: 'bg-violet-100 text-violet-950 border border-violet-300/60',
  },
  {
    left: 'border-l-sky-600',
    badge: 'bg-sky-100 text-sky-950 border border-sky-300/60',
  },
  {
    left: 'border-l-teal-600',
    badge: 'bg-teal-100 text-teal-950 border border-teal-300/60',
  },
] as const;

const fieldLabelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block';

const bandNameInputClass = `${textInputClass} text-lg font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:text-base`;

/** One-line scan — labels tenure vs pay guardrails explicitly (collapsed cards). */
export function summarizeExperienceBand(r: ExperienceBand): string {
  const tenure = `Tenure: ${r.minYoe}–${r.maxYoe} YOE`;
  const payPct = `Pay (%ile): ${r.targetTccPercentileLow}–${r.targetTccPercentileHigh}`;
  let payDollar = 'Pay ($): off';
  const hasSpreads =
    r.dollarRangeMinSpreadPercent != null &&
    r.dollarRangeMaxSpreadPercent != null &&
    Number.isFinite(r.dollarRangeMinSpreadPercent) &&
    Number.isFinite(r.dollarRangeMaxSpreadPercent);
  const fixedMid = r.dollarRangeFixedAnchorDollars;
  const useFixed = fixedMid != null && Number.isFinite(fixedMid) && fixedMid > 0;
  if (
    hasSpreads &&
    (useFixed || (r.dollarRangeAnchorPercentile != null && Number.isFinite(r.dollarRangeAnchorPercentile)))
  ) {
    const lo = Math.round(100 - r.dollarRangeMinSpreadPercent!);
    const hi = Math.round(100 + r.dollarRangeMaxSpreadPercent!);
    payDollar = useFixed
      ? `Pay ($): $${fixedMid!.toFixed(2)} mid ${lo}–${hi}%`
      : `Pay ($): P${r.dollarRangeAnchorPercentile} ${lo}–${hi}% of mid`;
  }
  const bits: string[] = [];
  if (r.populationScope?.length) bits.push(r.populationScope.join(', '));
  if (r.specialtyScope?.length) {
    const s = r.specialtyScope;
    bits.push(s.length > 2 ? `${s.slice(0, 2).join(', ')}…` : s.join(', '));
  }
  if (r.planScope?.length) bits.push(r.planScope.join(', '));
  const who = bits.length ? `Applies: ${bits.join(' · ')}` : 'Applies: everyone';
  return `${tenure} | ${payPct} | ${payDollar} | ${who}`;
}

export function ExperienceBandsTab({ experienceBands, setExperienceBands, scopeListHints }: ExperienceBandsTabProps) {
  const providerBase = scopeListHints?.providerTypes ?? [];
  const planBase = scopeListHints?.planTypes ?? [];
  const specialtyBase = scopeListHints?.specialtyOptions ?? [];

  const providerOptionsByRow = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of experienceBands) {
      map.set(r.id, mergeOptionsWithSelected(providerBase, r.populationScope));
    }
    return map;
  }, [experienceBands, providerBase]);

  const planOptionsByRow = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of experienceBands) {
      map.set(r.id, mergeOptionsWithSelected(planBase, r.planScope));
    }
    return map;
  }, [experienceBands, planBase]);

  const specialtyOptionsByRow = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of experienceBands) {
      map.set(r.id, mergeOptionsWithSelected(specialtyBase, r.specialtyScope));
    }
    return map;
  }, [experienceBands, specialtyBase]);

  const addRow = useCallback(() => {
    const id = newId();
    setExperienceBands((prev) => [
      ...prev,
      {
        id,
        label: 'New band',
        minYoe: 0,
        maxYoe: 5,
        targetTccPercentileLow: 25,
        targetTccPercentileHigh: 50,
        populationScope: [],
        planScope: [],
        specialtyScope: [],
        suggestBaseToHitTarget: false,
        suggestBaseToHitDollarRangeMidpoint: false,
      },
    ]);
    setExpandedIds((prev) => new Set(prev).add(id));
  }, [setExperienceBands]);

  const update = useCallback(
    (id: string, updates: Partial<ExperienceBand>) => {
      setExperienceBands(experienceBands.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    [experienceBands, setExperienceBands]
  );

  const remove = useCallback(
    (id: string) => setExperienceBands(experienceBands.filter((r) => r.id !== id)),
    [experienceBands, setExperienceBands]
  );

  const showProviderMulti = providerBase.length > 0;
  const showPlanMulti = planBase.length > 0;
  const showSpecialtyMulti = specialtyBase.length > 0;

  /** Collapsed cards show a summary line only—default collapsed so many mixed brackets stay scannable. */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [matchingHelpOpen, setMatchingHelpOpen] = useState(false);

  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (experienceBands.some((r) => r.id === id)) next.add(id);
      }
      return next.size === prev.size && [...prev].every((id) => next.has(id)) ? prev : next;
    });
  }, [experienceBands]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(experienceBands.map((r) => r.id)));
  }, [experienceBands]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const scopeDropdownClass =
    'w-full [&_button]:w-full [&_button]:min-h-[2.5rem] [&_button]:justify-between [&_button]:px-3';

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-slate-800">Merit review guardrails</h3>
            <button
              type="button"
              onClick={() => setMatchingHelpOpen((v) => !v)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
              aria-expanded={matchingHelpOpen}
              aria-controls="experience-bands-matching-help"
              aria-label="How rules match"
              title="How rules match"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
          {matchingHelpOpen && (
            <div
              id="experience-bands-matching-help"
              className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600 leading-snug"
              role="region"
              aria-label="How rules match"
            >
              <ul className="ml-3 list-disc space-y-0.5 marker:text-slate-400">
                <li>
                  <strong className="text-slate-700">YOE</strong> — Effective YOE; NP/PA use APP_YOE when present.
                </li>
                <li>
                  <strong className="text-slate-700">Percentiles vs dollars</strong> — Independent; either or both.
                </li>
                <li>
                  <strong className="text-slate-700">Pay ($)</strong> — Survey %ile or midpoint ($); −% / +% vs that midpoint.
                </li>
                <li>
                  <strong className="text-slate-700">Order</strong> — First match wins; narrow scopes above broad rows.
                </li>
                <li>
                  <strong className="text-slate-700">Scopes</strong> — Blank = all for that dimension.
                </li>
                <li>
                  <strong className="text-slate-700">Merit</strong> — From Policies and the merit matrix, not this screen.
                </li>
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0 self-start sm:mt-0.5 sm:items-end">
          {experienceBands.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end" role="group" aria-label="Expand or collapse all rules">
              <button
                type="button"
                onClick={expandAll}
                className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                aria-label="Expand all rules"
                title="Expand all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6M6 15l6 6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                aria-label="Collapse all rules"
                title="Collapse all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 15l-6-6-6 6M18 9l-6-6-6 6" />
                </svg>
              </button>
            </div>
          )}
          <button type="button" onClick={addRow} className={parametersPrimaryButtonClass}>
            Add band
          </button>
        </div>
      </div>

      {!showProviderMulti && providerBase.length > 0 && (
        <datalist id={DATALIST_PROVIDER}>
          {providerBase.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      )}
      {!showPlanMulti && planBase.length > 0 && (
        <datalist id={DATALIST_PLAN}>
          {planBase.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      )}
      {!showSpecialtyMulti && specialtyBase.length > 0 && (
        <datalist id={DATALIST_SPECIALTY}>
          {specialtyBase.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      )}

      {experienceBands.length === 0 ? (
        <div className={parametersEmptyRowsPanelClass}>
          <p className="text-slate-600 text-sm">
            No rules yet. <strong className="text-slate-800">Add band</strong> to create one.
          </p>
        </div>
      ) : (
        <ul className="space-y-3 list-none m-0 p-0" aria-label="Experience bands">
          {experienceBands.map((r, bandIndex) => {
            const vis = BAND_VISUAL[bandIndex % BAND_VISUAL.length];
            const isOpen = expandedIds.has(r.id);
            return (
            <li
              key={r.id}
              className={`rounded-2xl border border-slate-300/90 bg-white shadow-md shadow-slate-900/[0.06] overflow-hidden border-l-[5px] ${vis.left}`}
            >
              <div
                className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between px-4 sm:px-5 pt-3 sm:pt-4 pb-2.5 border-b border-slate-200/90 bg-white"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 min-w-0 flex-1">
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums shadow-sm ${vis.badge}`}
                      aria-hidden
                    >
                      {bandIndex + 1}
                    </span>
                    <div className="hidden sm:block h-10 w-px bg-slate-300/60 self-stretch" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 max-w-3xl space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                      Rule name
                    </p>
                    <label htmlFor={`band-label-${r.id}`} className="sr-only">
                      Band name
                    </label>
                    <input
                      id={`band-label-${r.id}`}
                      type="text"
                      value={r.label}
                      onChange={(e) => update(r.id, { label: e.target.value })}
                      className={bandNameInputClass}
                      placeholder="e.g. 3–5 YOE"
                    />
                    {!isOpen && (
                      <p className="text-xs text-slate-600 leading-snug font-mono bg-white/60 border border-slate-200/80 rounded-lg px-3 py-2">
                        {summarizeExperienceBand(r)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0 sm:flex-col sm:items-stretch lg:flex-row">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(r.id)}
                    className="inline-flex items-center justify-center p-2.5 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200/80 transition-colors"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "Collapse" : "Expand to edit"}
                    title={isOpen ? "Collapse" : "Expand to edit"}
                  >
                    {isOpen ? (
                      <svg
                        className="w-4 h-4 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="inline-flex items-center justify-center p-2.5 text-slate-600 hover:text-red-700 bg-white/70 hover:bg-red-50 rounded-xl border border-slate-200/90 hover:border-red-200 transition-colors"
                    aria-label={`Remove band ${r.label}`}
                    title={`Remove band ${r.label}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {isOpen && (
              <div className="px-4 sm:px-6 py-4 space-y-4 bg-slate-50/25">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
                  <div className="rounded-xl border border-slate-200 border-l-[6px] border-l-slate-500 bg-white p-3 sm:p-4 shadow-sm min-w-0 flex flex-col">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-800 mb-2">Tenure</p>
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <div className="min-w-0">
                        <label htmlFor={`band-min-${r.id}`} className={fieldLabelClass}>
                          Min YOE
                        </label>
                        <input
                          id={`band-min-${r.id}`}
                          type="number"
                          value={r.minYoe}
                          onChange={(e) => update(r.id, { minYoe: Number(e.target.value) || 0 })}
                          className={guardrailRowInputClass}
                        />
                      </div>
                      <div className="min-w-0">
                        <label htmlFor={`band-max-${r.id}`} className={fieldLabelClass}>
                          Max YOE
                        </label>
                        <input
                          id={`band-max-${r.id}`}
                          type="number"
                          value={r.maxYoe}
                          onChange={(e) => update(r.id, { maxYoe: Number(e.target.value) || 0 })}
                          className={guardrailRowInputClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200/90 border-l-[6px] border-l-amber-500 bg-amber-50/40 p-3 sm:p-4 shadow-sm min-w-0 flex flex-col">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-950 mb-2">Pay · percentiles</p>
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <div className="min-w-0">
                        <label htmlFor={`band-tlow-${r.id}`} className={fieldLabelClass}>
                          TCC %ile low
                        </label>
                        <input
                          id={`band-tlow-${r.id}`}
                          type="number"
                          min={0}
                          max={100}
                          value={r.targetTccPercentileLow}
                          onChange={(e) => update(r.id, { targetTccPercentileLow: Number(e.target.value) || 0 })}
                          className={guardrailRowInputClass}
                        />
                      </div>
                      <div className="min-w-0">
                        <label htmlFor={`band-thigh-${r.id}`} className={fieldLabelClass}>
                          TCC %ile high
                        </label>
                        <input
                          id={`band-thigh-${r.id}`}
                          type="number"
                          min={0}
                          max={100}
                          value={r.targetTccPercentileHigh}
                          onChange={(e) => update(r.id, { targetTccPercentileHigh: Number(e.target.value) || 0 })}
                          className={guardrailRowInputClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-violet-200/80 border-l-[6px] border-l-violet-500 bg-violet-50/50 p-3 sm:p-4 shadow-sm min-w-0 flex flex-col">
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-950 mb-2">Pay · dollars</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full">
                      <div className="min-w-0">
                        <label htmlFor={`band-fixed-anchor-${r.id}`} className={fieldLabelClass}>
                          Midpoint ($)
                        </label>
                        <input
                          id={`band-fixed-anchor-${r.id}`}
                          type="number"
                          min={0}
                          step={0.01}
                          value={r.dollarRangeFixedAnchorDollars ?? ''}
                          placeholder="—"
                          onChange={(e) => {
                            const v = e.target.value;
                            update(r.id, {
                              dollarRangeFixedAnchorDollars: v === '' ? undefined : Number(v),
                            });
                          }}
                          className={guardrailRowInputClass}
                        />
                      </div>
                      <div className="min-w-0">
                        <label
                          htmlFor={`band-anchor-${r.id}`}
                          className={fieldLabelClass}
                          title="Survey TCC $ at this percentile (1.0 FTE) when midpoint ($) is empty"
                        >
                          Survey %ile
                        </label>
                        <input
                          id={`band-anchor-${r.id}`}
                          type="number"
                          min={0}
                          max={100}
                          value={r.dollarRangeAnchorPercentile ?? ''}
                          placeholder="—"
                          disabled={
                            r.dollarRangeFixedAnchorDollars != null &&
                            Number.isFinite(r.dollarRangeFixedAnchorDollars) &&
                            r.dollarRangeFixedAnchorDollars > 0
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            update(r.id, {
                              dollarRangeAnchorPercentile: v === '' ? undefined : Number(v),
                            });
                          }}
                          className={`${guardrailRowInputClass} disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100`}
                        />
                      </div>
                      <div className="min-w-0">
                        <label
                          htmlFor={`band-spread-min-${r.id}`}
                          className={fieldLabelClass}
                          title="% below midpoint (e.g. 15 → min = 85% of midpoint $)"
                        >
                          −%
                        </label>
                        <input
                          id={`band-spread-min-${r.id}`}
                          type="number"
                          min={0}
                          max={100}
                          value={r.dollarRangeMinSpreadPercent ?? ''}
                          placeholder="—"
                          onChange={(e) => {
                            const v = e.target.value;
                            update(r.id, { dollarRangeMinSpreadPercent: v === '' ? undefined : Number(v) });
                          }}
                          className={guardrailRowInputClass}
                        />
                      </div>
                      <div className="min-w-0">
                        <label
                          htmlFor={`band-spread-max-${r.id}`}
                          className={fieldLabelClass}
                          title="% above midpoint (e.g. 10 → max = 110% of midpoint $)"
                        >
                          +%
                        </label>
                        <input
                          id={`band-spread-max-${r.id}`}
                          type="number"
                          min={0}
                          max={100}
                          value={r.dollarRangeMaxSpreadPercent ?? ''}
                          placeholder="—"
                          onChange={(e) => {
                            const v = e.target.value;
                            update(r.id, { dollarRangeMaxSpreadPercent: v === '' ? undefined : Number(v) });
                          }}
                          className={guardrailRowInputClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 border-l-[6px] border-l-indigo-400 bg-white p-3 sm:p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-800 mb-2">Cohort scope</p>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    When a survey uses map buckets, you can enter a bucket name from Data → Specialty map. Merit review matches
                    providers whose row specialty appears in that group&apos;s provider-specialty list, so one cohort label can
                    cover many titles. Benchmark group and raw specialty strings still work; leave all cohort fields empty to
                    apply by YOE only.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
                    <div>
                      <label className={fieldLabelClass}>Provider type</label>
                      {showProviderMulti ? (
                        <MultiSelectDropdown
                          options={providerOptionsByRow.get(r.id) ?? providerBase}
                          selected={r.populationScope ?? []}
                          onChange={(selected) => update(r.id, { populationScope: selected })}
                          placeholder="All provider types"
                          className={scopeDropdownClass}
                        />
                      ) : (
                        <input
                          type="text"
                          value={r.populationScope?.join(', ') ?? ''}
                          onChange={(e) =>
                            update(r.id, {
                              populationScope: e.target.value
                                ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                                : [],
                            })
                          }
                          className={textInputClass}
                          placeholder="e.g. NP, PA — or leave empty"
                          list={providerBase.length ? DATALIST_PROVIDER : undefined}
                          autoComplete="off"
                        />
                      )}
                    </div>
                    <div>
                      <label className={fieldLabelClass}>Specialty / cohort</label>
                      {showSpecialtyMulti ? (
                        <MultiSelectDropdown
                          options={specialtyOptionsByRow.get(r.id) ?? specialtyBase}
                          selected={r.specialtyScope ?? []}
                          onChange={(selected) => update(r.id, { specialtyScope: selected })}
                          placeholder="All specialties"
                          className={scopeDropdownClass}
                        />
                      ) : (
                        <input
                          type="text"
                          value={r.specialtyScope?.join(', ') ?? ''}
                          onChange={(e) =>
                            update(r.id, {
                              specialtyScope: e.target.value
                                ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                                : [],
                            })
                          }
                          className={textInputClass}
                          placeholder="e.g. Critical Care — or empty"
                          list={specialtyBase.length ? DATALIST_SPECIALTY : undefined}
                          autoComplete="off"
                        />
                      )}
                    </div>
                    <div>
                      <label className={fieldLabelClass}>Comp plan</label>
                      {showPlanMulti ? (
                        <MultiSelectDropdown
                          options={planOptionsByRow.get(r.id) ?? planBase}
                          selected={r.planScope ?? []}
                          onChange={(selected) => update(r.id, { planScope: selected })}
                          placeholder="All comp plans"
                          className={scopeDropdownClass}
                        />
                      ) : (
                        <input
                          type="text"
                          value={r.planScope?.join(', ') ?? ''}
                          onChange={(e) =>
                            update(r.id, {
                              planScope: e.target.value
                                ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                                : [],
                            })
                          }
                          className={textInputClass}
                          placeholder="e.g. salary, wRVU"
                          list={planBase.length ? DATALIST_PLAN : undefined}
                          autoComplete="off"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-800 mb-2">Merit review suggestions</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8">
                    <label
                      className="flex gap-2 cursor-pointer items-center"
                      title="When TCC is below the target percentile band"
                    >
                      <input
                        type="checkbox"
                        checked={r.suggestBaseToHitTarget === true}
                        onChange={(e) => update(r.id, { suggestBaseToHitTarget: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 shrink-0"
                      />
                      <span className="text-sm font-medium text-slate-800">Suggest base toward percentile low</span>
                    </label>
                    <label
                      className="flex gap-2 cursor-pointer items-center"
                      title="When TCC is below the dollar range"
                    >
                      <input
                        type="checkbox"
                        checked={r.suggestBaseToHitDollarRangeMidpoint === true}
                        onChange={(e) => update(r.id, { suggestBaseToHitDollarRangeMidpoint: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 shrink-0"
                      />
                      <span className="text-sm font-medium text-slate-800">Suggest base toward dollar band midpoint</span>
                    </label>
                  </div>
                </div>
              </div>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
