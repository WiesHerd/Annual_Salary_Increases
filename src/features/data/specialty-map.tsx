/**
 * Specialty map: show how each provider maps to market survey rows and allow override.
 * Join key is Market_Specialty_Override ?? Specialty ?? Benchmark_Group.
 */

import { useMemo, useCallback, useState } from 'react';
import type { ProviderRecord } from '../../types/provider';
import type { MarketRow } from '../../types/market';
import { mergeMarketIntoProviders, buildMarketLookup } from '../../lib/joins';
import { SearchableSelect } from '../../components/searchable-select';

interface SpecialtyMapProps {
  records: ProviderRecord[];
  marketData: MarketRow[];
  setRecords: (records: ProviderRecord[] | ((prev: ProviderRecord[]) => ProviderRecord[])) => void;
}

function getMatchKey(p: ProviderRecord): string {
  return (p.Market_Specialty_Override ?? p.Specialty ?? p.Benchmark_Group ?? '').trim();
}

/** Collapsible help: how provider specialty maps to market specialty (per plan). */
function HowProviderMarketMappingWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 pt-3 border-t border-slate-200/80">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none"
      >
        {open ? 'Hide' : 'Show'} how provider–market mapping works
      </button>
      {open && (
        <div className="mt-2 text-xs text-slate-600 space-y-2">
          <p><strong>1. Map the provider file.</strong> On provider upload, map the column that holds each provider’s specialty (or benchmark group) to <strong>Specialty</strong> or <strong>Benchmark_Group</strong> in the column mapping.</p>
          <p><strong>2. Align values with the market file.</strong> The value in the provider’s Specialty (or Benchmark_Group) column must <strong>exactly match</strong> the specialty value in the market file (same spelling and casing). If labels differ (e.g. “Cardio” vs “Cardiology”), either change the provider file or set an override here.</p>
          <p><strong>3. Use overrides when labels don’t match.</strong> For any provider, set <strong>Override</strong> to a market specialty name (exactly as in the market file) to use that market row instead of Specialty/Benchmark_Group.</p>
        </div>
      )}
    </div>
  );
}

export function SpecialtyMap({ records, marketData, setRecords }: SpecialtyMapProps) {
  const getMarket = useMemo(() => buildMarketLookup(marketData), [marketData]);

  const { matchedCount, unmatchedCount, orphanSpecialties } = useMemo(() => {
    let matched = 0;
    let unmatched = 0;
    for (const p of records) {
      const key = getMatchKey(p);
      const market = key ? getMarket(key) : undefined;
      if (market) matched++;
      else unmatched++;
    }
    const orphan = marketData.filter(
      (r) => !records.some((p) => getMarket(getMatchKey(p)) === r)
    ).map((r) => r.specialty);
    return {
      matchedCount: matched,
      unmatchedCount: unmatched,
      orphanSpecialties: orphan,
    };
  }, [records, marketData, getMarket]);

  const handleOverrideChange = useCallback(
    (employeeId: string, specialty: string | null) => {
      setRecords((prev) => {
        const updated = prev.map((p) =>
          p.Employee_ID === employeeId
            ? { ...p, Market_Specialty_Override: specialty ?? undefined }
            : p
        );
        return mergeMarketIntoProviders(updated, marketData);
      });
    },
    [setRecords, marketData]
  );

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-indigo-100 p-8 text-center text-slate-500 shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07),0_2px_4px_-2px_rgba(79,70,229,0.07)]">
        <p>No provider records yet. Upload provider data in the Provider data tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07),0_2px_4px_-2px_rgba(79,70,229,0.07)]">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-base font-semibold text-slate-800">Provider → market match</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Providers are auto-mapped to market by match key: <strong>Override (if set) → Specialty → Benchmark group</strong>. Matching is exact first, then case-insensitive (e.g. “cardiology” matches “Cardiology”). If the auto-match is wrong, use <strong>Override</strong> to pick the correct market specialty; overrides are saved automatically.
          </p>
          <HowProviderMarketMappingWorks />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Employee ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Specialty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Benchmark group</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Matched market</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Override <span className="font-normal normal-case text-slate-400">(saved automatically)</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {records.map((p) => {
                const key = getMatchKey(p);
                const matched = key ? getMarket(key) : undefined;
                const isUnmatched = !matched;
                return (
                  <tr
                    key={p.Employee_ID}
                    className={isUnmatched ? 'bg-amber-50/60' : 'hover:bg-indigo-50/30'}
                  >
                    <td className="px-4 py-2.5 text-sm text-slate-900">{p.Employee_ID}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-800">{p.Provider_Name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-700">{p.Specialty ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-700">{p.Benchmark_Group ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm">
                      {matched ? (
                        <span className="text-slate-800">{matched.specialty}</span>
                      ) : (
                        <span className="text-amber-700 font-medium">No match</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <SearchableSelect
                        value={p.Market_Specialty_Override ?? ''}
                        options={marketData.map((r) => r.specialty)}
                        onChange={(v) => handleOverrideChange(p.Employee_ID, v === '' ? null : v)}
                        emptyOptionLabel="Use Specialty / Benchmark group"
                        className="min-w-[140px]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Summary</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li><span className="font-medium text-slate-800">{matchedCount}</span> providers with a market match</li>
            <li><span className="font-medium text-amber-700">{unmatchedCount}</span> providers without a match</li>
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Market specialties with no providers</h3>
          {orphanSpecialties.length === 0 ? (
            <p className="text-sm text-slate-500">None</p>
          ) : (
            <p className="text-sm text-slate-600">{orphanSpecialties.join(', ')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
