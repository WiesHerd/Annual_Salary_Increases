/**
 * Modal to compare 2–4 selected providers. Side-by-side table: same metric on the same row
 * so you can scan down and spot differences quickly (e.g. across 900 providers).
 */

import React, { useState } from 'react';
import type { ProviderRecord } from '../../types/provider';
import type { MarketResolver } from '../../types/market-survey-config';
import type { ExperienceBand } from '../../types/experience-band';
import { isLowFteForNormalization } from '../../lib/calculations/recalculate-provider-row';
import { formatCurrency, formatFte } from '../../utils/format';

interface ProviderCompareModalProps {
  providerIds: string[];
  records: ProviderRecord[];
  marketResolver: MarketResolver;
  experienceBands: ExperienceBand[];
  onClose: () => void;
  onClearSelection?: () => void;
}

function getTccAt1Fte(p: ProviderRecord): number | undefined {
  const stored = p.Proposed_TCC_at_1FTE ?? p.Current_TCC_at_1FTE;
  if (stored != null && Number.isFinite(stored)) return stored;
  const raw = p.Proposed_TCC ?? p.Current_TCC;
  const fte = p.Current_FTE ?? 1;
  if (raw != null && Number.isFinite(raw) && fte > 0) return raw / fte;
  return undefined;
}

/** Build a short "why these differ" narrative from 2+ providers. */
function buildCompareNarrative(providers: ProviderRecord[]): string {
  if (providers.length < 2) return '';
  const names = providers.map((p) => p.Provider_Name ?? p.Employee_ID);
  const tccAt1 = providers.map((p) => getTccAt1Fte(p));
  const supplementals = providers.map((p) =>
    (p.Division_Chief_Pay ?? 0) +
    (p.Medical_Director_Pay ?? 0) +
    (p.Teaching_Pay ?? 0) +
    (p.PSQ_Pay ?? 0) +
    (p.Quality_Bonus ?? 0) +
    (p.Other_Recurring_Comp ?? 0)
  );
  const ftes = providers.map((p) => p.Current_FTE ?? 1);

  const parts: string[] = [];
  let maxTccIdx = 0;
  let minTccIdx = 0;
  for (let i = 0; i < tccAt1.length; i++) {
    const v = tccAt1[i];
    if (v != null && Number.isFinite(v)) {
      if (tccAt1[maxTccIdx] == null || v > (tccAt1[maxTccIdx] as number)) maxTccIdx = i;
      if (tccAt1[minTccIdx] == null || v < (tccAt1[minTccIdx] as number)) minTccIdx = i;
    }
  }
  if (tccAt1[maxTccIdx] != null && tccAt1[minTccIdx] != null && maxTccIdx !== minTccIdx) {
    parts.push(`${names[maxTccIdx]} ${formatCurrency(tccAt1[maxTccIdx] as number)} vs ${names[minTccIdx]} ${formatCurrency(tccAt1[minTccIdx] as number)}`);
  }
  if (supplementals.some((s, i) => i > 0 && s !== supplementals[0])) parts.push('different supp');
  if (ftes.some((f, i) => i > 0 && Math.abs((f ?? 1) - (ftes[0] ?? 1)) > 0.01)) parts.push('different FTE');
  if (parts.length === 0) return 'See table below.';
  return parts.join(' · ');
}

export function ProviderCompareModal({
  providerIds,
  records,
  marketResolver,
  experienceBands: _experienceBands,
  onClose,
  onClearSelection,
}: ProviderCompareModalProps) {
  const providers = providerIds
    .map((id) => records.find((r) => r.Employee_ID === id))
    .filter((p): p is ProviderRecord => p != null);

  if (providers.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
          <p className="text-slate-600">No providers to compare.</p>
          <button type="button" onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium">
            Close
          </button>
        </div>
      </div>
    );
  }

  const narrative = buildCompareNarrative(providers);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-800">Compare providers</h2>
          <div className="flex gap-2">
            {onClearSelection && (
              <button
                type="button"
                onClick={() => { onClearSelection(); onClose(); }}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Clear selection
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>

        {narrative && (
          <div className="shrink-0 px-6 py-2.5 bg-indigo-50 border-b border-indigo-100">
            <p className="text-sm text-slate-700"><span className="font-medium text-indigo-900">Why:</span> {narrative}</p>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col p-6 overflow-hidden">
          <CompareTable providers={providers} marketResolver={marketResolver} />
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
  marketResolver: MarketResolver;
}

/** Side-by-side table: one row per metric, one column per provider. Same data on same line. */
function CompareTable({ providers, marketResolver }: CompareTableProps) {
  const [showMore, setShowMore] = useState(false);

  type Row = { label: string; values: string[]; highlight?: boolean };
  const rows: Row[] = [];

  const tccPercentiles = providers.map((p) => (p.Proposed_TCC_Percentile ?? p.Current_TCC_Percentile) != null ? `${Number(p.Proposed_TCC_Percentile ?? p.Current_TCC_Percentile).toFixed(1)}%` : '—');
  const wrvuPercentiles = providers.map((p) => p.WRVU_Percentile != null ? `${Number(p.WRVU_Percentile).toFixed(1)}%` : '—');
  const tccAt1Values = providers.map((p) => {
    const v = getTccAt1Fte(p);
    return v != null ? formatCurrency(v) : '—';
  });
  const currentFte = providers.map((p) => p.Current_FTE != null ? formatFte(p.Current_FTE) : '—');
  const clinicalFte = providers.map((p) => p.Clinical_FTE != null ? formatFte(p.Clinical_FTE) : '—');

  // Raw amounts and total TCC (for % of TCC and "what's contributing")
  const baseNum = providers.map((p) => p.Proposed_Base_Salary ?? p.Current_Base_Salary ?? 0);
  const prodNum = providers.map((p) => {
    const cf = p.Proposed_CF ?? p.Current_CF ?? 0;
    const w = p.Prior_Year_WRVUs ?? p.Normalized_WRVUs ?? p.Adjusted_WRVUs ?? 0;
    return cf * w;
  });
  const suppNum = providers.map((p) =>
    (p.Division_Chief_Pay ?? 0) +
    (p.Medical_Director_Pay ?? 0) +
    (p.Teaching_Pay ?? 0) +
    (p.PSQ_Pay ?? 0) +
    (p.Quality_Bonus ?? 0) +
    (p.Other_Recurring_Comp ?? 0)
  );
  const rawTccNum = providers.map((_, i) => baseNum[i] + prodNum[i] + suppNum[i]);

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
  rows.push({ label: 'Base', values: baseSalary });
  rows.push({ label: 'Productivity', values: productivity });
  rows.push({ label: 'Supp', values: supplemental });
  rows.push({ label: 'Total TCC', values: rawTcc });
  rows.push({ label: 'Low FTE?', values: lowFte });
  rows.push({ label: 'Mix', values: drivenBy });

  const showContributing = contributingExplanation.length > 0;

  const extraRows: Row[] = [];
  if (showMore) {
    extraRows.push({
      label: 'Market TCC (25/50/75/90)',
      values: providers.map((p) => {
        const key = (p.Market_Specialty_Override ?? p.Specialty ?? p.Benchmark_Group ?? '').trim();
        const m = key ? marketResolver(p, key) : undefined;
        return m ? [25, 50, 75, 90].map((x) => formatCurrency(m.tccPercentiles?.[x] ?? 0)).join(' / ') : '—';
      }),
    });
    extraRows.push({
      label: 'Market wRVU (25/50/75/90)',
      values: providers.map((p) => {
        const key = (p.Market_Specialty_Override ?? p.Specialty ?? p.Benchmark_Group ?? '').trim();
        const m = key ? marketResolver(p, key) : undefined;
        return m ? [25, 50, 75, 90].map((x) => (m.wrvuPercentiles?.[x] ?? 0).toLocaleString()).join(' / ') : '—';
      }),
    });
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0 flex-1">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
            <tr className="border-b border-slate-200">
              <th className="text-left py-2.5 px-3 font-semibold text-slate-700 w-48 min-w-[10rem] bg-slate-100">Metric</th>
              {providers.map((p) => (
                <th key={p.Employee_ID} className="text-right py-2.5 px-3 font-semibold text-slate-800 max-w-[14rem] bg-slate-100">
                  <div className="truncate" title={p.Provider_Name ?? p.Employee_ID}>
                    {p.Provider_Name ?? p.Employee_ID}
                  </div>
                  <div className="text-xs font-normal text-slate-500 mt-0.5">{p.Specialty ?? '—'}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
          {rows.map((row) => (
            <React.Fragment key={row.label}>
              <tr className={`border-b border-slate-100 ${row.highlight ? 'bg-slate-50/80' : ''}`}>
                <td className="py-2 px-3 text-left text-slate-600 font-medium w-48 min-w-[10rem]">{row.label}</td>
                {row.values.map((val, i) => (
                  <td
                    key={providers[i].Employee_ID}
                    className={`py-2 px-3 text-slate-800 max-w-[14rem] ${row.label === 'Mix' ? 'text-left text-xs' : 'text-right tabular-nums'}`}
                  >
                    {val}
                  </td>
                ))}
              </tr>
              {row.label === 'Mix' && showContributing && (
                <tr key="contributing" className="border-b border-slate-100 bg-emerald-50/50">
                  <td colSpan={colCount} className="py-1.5 px-3 text-xs text-slate-700">
                    {contributingExplanation}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {extraRows.map((row) => (
            <tr key={row.label} className="border-b border-slate-100 bg-slate-50/50">
              <td className="py-2 px-3 text-left text-slate-600 font-medium text-xs w-48 min-w-[10rem]">{row.label}</td>
              {row.values.map((val, i) => (
                <td key={providers[i].Employee_ID} className="py-2 px-3 text-right tabular-nums text-slate-700 text-xs max-w-[14rem]">
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      <div className="shrink-0 px-3 py-2 bg-slate-50 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowMore((m) => !m)}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          {showMore ? 'Hide market' : 'Market'}
        </button>
      </div>
    </div>
  );
}
