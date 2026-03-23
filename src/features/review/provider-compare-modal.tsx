/**
 * Modal to compare 2–4 selected providers. Side-by-side table: same metric on the same row
 * so you can scan down and spot differences quickly (e.g. across 900 providers).
 */

import React from 'react';
import type { ProviderRecord } from '../../types/provider';
import type { ExperienceBand } from '../../types/experience-band';
import { isLowFteForNormalization } from '../../lib/calculations/recalculate-provider-row';
import { buildProviderCompareInsights, getProviderCompBreakdown } from '../../lib/provider-compare-insights';
import { formatCurrency, formatFte } from '../../utils/format';

interface ProviderCompareModalProps {
  providerIds: string[];
  records: ProviderRecord[];
  experienceBands: ExperienceBand[];
  onClose: () => void;
  onClearSelection?: () => void;
}

export function ProviderCompareModal({
  providerIds,
  records,
  experienceBands: _experienceBands,
  onClose,
  onClearSelection,
}: ProviderCompareModalProps) {
  const providers = providerIds
    .map((id) => records.find((r) => r.Employee_ID === id))
    .filter((p): p is ProviderRecord => p != null);

  if (providers.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[2px]"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-900/10 ring-1 ring-black/[0.03]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-empty-title"
        >
          <p id="compare-empty-title" className="text-sm text-slate-600">
            No providers to compare.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const insightBullets = buildProviderCompareInsights(providers);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(90vh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/12 ring-1 ring-black/[0.03]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-modal-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-4">
          <div className="min-w-0 pt-0.5">
            <h2 id="compare-modal-title" className="text-base font-semibold tracking-tight text-slate-900">
              Compare providers
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {providers.length} selected · side-by-side metrics
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onClearSelection && (
              <button
                type="button"
                onClick={() => {
                  onClearSelection();
                  onClose();
                }}
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {insightBullets.length > 0 && (
          <div className="shrink-0 border-b border-slate-100 px-5 py-3 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">At a glance</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-slate-600">
              {insightBullets.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4 sm:px-6 sm:pb-5">
          <CompareTable providers={providers} />
        </div>
      </div>
    </div>
  );
}

/** One-line "what drives TCC" for the table (base + productivity + supplemental). */
function getTccDriverLine(provider: ProviderRecord): string {
  const base = provider.Proposed_Base_Salary ?? provider.Current_Base_Salary ?? 0;
  const cf = provider.Proposed_CF ?? provider.Current_CF ?? 0;
  const wrvu = provider.Prior_Year_WRVUs ?? provider.Normalized_WRVUs ?? provider.Adjusted_WRVUs ?? 0;
  const prod = cf * wrvu;
  const supp =
    (provider.Division_Chief_Pay ?? 0) +
    (provider.Medical_Director_Pay ?? 0) +
    (provider.Teaching_Pay ?? 0) +
    (provider.PSQ_Pay ?? 0) +
    (provider.Quality_Bonus ?? 0) +
    (provider.Other_Recurring_Comp ?? 0);
  const parts: string[] = [];
  if (base > 0) parts.push(formatCurrency(base));
  if (prod > 0) parts.push(formatCurrency(prod));
  if (supp > 0) parts.push(formatCurrency(supp));
  return parts.length ? parts.join(' + ') : '—';
}

interface CompareTableProps {
  providers: ProviderRecord[];
}

/** Side-by-side table: one row per metric, one column per provider. Same data on same line. */
function CompareTable({ providers }: CompareTableProps) {
  const breakdown = providers.map(getProviderCompBreakdown);

  type Row = { label: string; values: string[]; highlight?: boolean };
  const rows: Row[] = [];

  const tccPercentiles = providers.map((p) => (p.Proposed_TCC_Percentile ?? p.Current_TCC_Percentile) != null ? `${Number(p.Proposed_TCC_Percentile ?? p.Current_TCC_Percentile).toFixed(1)}%` : '—');
  const wrvuPercentiles = providers.map((p) => p.WRVU_Percentile != null ? `${Number(p.WRVU_Percentile).toFixed(1)}%` : '—');
  const tccAt1Values = breakdown.map((b) => (b.tccAt1 != null ? formatCurrency(b.tccAt1) : '—'));
  const baseAt1Values = breakdown.map((b) => (b.salaryAt1 != null ? formatCurrency(b.salaryAt1) : '—'));
  const currentFte = providers.map((p) => p.Current_FTE != null ? formatFte(p.Current_FTE) : '—');
  const clinicalFte = providers.map((p) => p.Clinical_FTE != null ? formatFte(p.Clinical_FTE) : '—');

  const baseNum = breakdown.map((b) => b.base);
  const prodNum = breakdown.map((b) => b.prod);
  const suppNum = breakdown.map((b) => b.supp);
  const rawTccNum = breakdown.map((b) => b.tcc);

  const baseSalary = providers.map((_, i) => formatCurrency(baseNum[i]));
  const productivity = providers.map((_, i) => formatCurrency(prodNum[i]));
  const supplemental = providers.map((_, i) => formatCurrency(suppNum[i]));
  const rawTcc = providers.map((_, i) => formatCurrency(rawTccNum[i]));
  const lowFte = providers.map((p) => (isLowFteForNormalization(p) ? 'Caution (<0.7)' : '—'));
  const drivenBy = providers.map((p) => getTccDriverLine(p));

  /** Plain-language "what's contributing" to TCC differences (vs lowest-TCC provider). */
  const contributingExplanation = (() => {
    if (providers.length < 2) return '';
    let minIdx = 0;
    let minTcc = rawTccNum[0];
    for (let i = 1; i < rawTccNum.length; i++) {
      if (rawTccNum[i] < minTcc) {
        minTcc = rawTccNum[i];
        minIdx = i;
      }
    }
    const refName = providers[minIdx].Provider_Name ?? providers[minIdx].Employee_ID;
    const parts: string[] = [];
    for (let i = 0; i < providers.length; i++) {
      if (i === minIdx) continue;
      const name = providers[i].Provider_Name ?? providers[i].Employee_ID;
      const diff = rawTccNum[i] - minTcc;
      if (diff <= 0) continue;
      const dBase = baseNum[i] - baseNum[minIdx];
      const dSupp = suppNum[i] - suppNum[minIdx];
      const dProd = prodNum[i] - prodNum[minIdx];
      const bits: string[] = [];
      if (dBase !== 0) bits.push(`base ${dBase > 0 ? '+' : ''}${formatCurrency(dBase)}`);
      if (dSupp !== 0) bits.push(`supp ${dSupp > 0 ? '+' : ''}${formatCurrency(dSupp)}`);
      if (dProd !== 0) bits.push(`prod ${dProd > 0 ? '+' : ''}${formatCurrency(dProd)}`);
      if (bits.length === 0) bits.push('same');
      parts.push(`${name} vs ${refName}: ${bits.join(', ')}`);
    }
    return parts.join(' · ');
  })();

  const colCount = 1 + providers.length;

  rows.push({ label: 'TCC %', values: tccPercentiles, highlight: true });
  rows.push({ label: 'wRVU %', values: wrvuPercentiles, highlight: true });
  rows.push({ label: 'TCC at 1 FTE', values: tccAt1Values, highlight: true });
  rows.push({ label: 'FTE', values: currentFte });
  rows.push({ label: 'Clinical FTE', values: clinicalFte });
  rows.push({ label: 'Base at 1 FTE', values: baseAt1Values, highlight: true });
  rows.push({ label: 'Base', values: baseSalary });
  rows.push({ label: 'Productivity', values: productivity });
  rows.push({ label: 'Supp', values: supplemental });
  rows.push({ label: 'Total TCC', values: rawTcc });
  rows.push({ label: 'Low FTE?', values: lowFte });
  rows.push({ label: 'Mix', values: drivenBy });

  const showContributing = contributingExplanation.length > 0;

  /** Keep label column only as wide as needed in % so value columns sit closer to names. */
  const metricColPct = providers.length <= 2 ? 14 : 12;
  const providerColPct = (100 - metricColPct) / providers.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white">
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <colgroup>
            <col style={{ width: `${metricColPct}%` }} />
            {providers.map((p) => (
              <col key={p.Employee_ID} style={{ width: `${providerColPct}%` }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-neutral-50 shadow-[0_1px_0_0_rgba(0,0,0,0.06)] border-b border-slate-200">
            <tr className="bg-neutral-50">
              <th className="px-3 py-3 text-left align-top text-[11px] font-semibold uppercase tracking-wide text-neutral-600 whitespace-normal break-words leading-tight transition-colors hover:bg-neutral-100">
                Metric
              </th>
              {providers.map((p) => (
                <th
                  key={p.Employee_ID}
                  className="px-3 py-3 text-right align-top text-[11px] font-semibold uppercase tracking-wide text-neutral-600 whitespace-normal break-words leading-tight transition-colors hover:bg-neutral-100"
                >
                  <div className="break-words leading-tight text-slate-900 normal-case font-semibold" title={p.Provider_Name ?? p.Employee_ID}>
                    {p.Provider_Name ?? p.Employee_ID}
                  </div>
                  <div className="mt-1 break-words text-[11px] font-normal text-slate-500 normal-case">
                    {p.Specialty ?? '—'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-800">
            {rows.map((row) => (
              <React.Fragment key={row.label}>
                <tr
                  className={`border-b border-slate-100/90 transition-colors ${
                    row.highlight ? 'bg-slate-50/60' : 'hover:bg-slate-50/[0.35]'
                  }`}
                >
                  <td className="px-3 py-2.5 text-left font-medium text-slate-500">{row.label}</td>
                  {row.values.map((val, i) => (
                    <td
                      key={providers[i].Employee_ID}
                      className={`px-3 py-2.5 text-right tabular-nums ${
                        row.label === 'Mix'
                          ? 'text-[12px] leading-snug text-slate-600'
                          : 'text-slate-900'
                      }`}
                    >
                      <span className="block truncate" title={val}>
                        {val}
                      </span>
                    </td>
                  ))}
                </tr>
                {row.label === 'Mix' && showContributing && (
                  <tr key="contributing" className="border-b border-slate-100/90 bg-slate-50/40">
                    <td colSpan={colCount} className="border-l-2 border-l-emerald-500/35 px-3 py-2 pl-[10px] text-[12px] leading-snug text-slate-600">
                      <span className="font-medium text-slate-500">Vs. lowest total in this group: </span>
                      {contributingExplanation}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
