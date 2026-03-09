import type { MarketRow } from '../../types/market';

/** Format as USD with no decimals (e.g. $380,000). */
function formatDollar(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

/** Format with comma and 2 decimals (e.g. 5,500.00). */
function formatWrvu(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface MarketTableProps {
  rows: MarketRow[];
  onRemove: (specialty: string) => void;
  onClear: () => void;
}

export function MarketTable({ rows, onRemove, onClear }: MarketTableProps) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-indigo-100 p-6 text-center text-slate-500 shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07),0_2px_4px_-2px_rgba(79,70,229,0.07)]">
        <p>No market data yet. Upload a market survey file (CSV or XLSX) above.</p>
      </div>
    );
  }

  const percentiles = [25, 50, 75, 90];

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07),0_2px_4px_-2px_rgba(79,70,229,0.07)]">
      <div className="px-5 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
        <h2 className="text-base font-semibold text-slate-800">Market data ({rows.length} specialties)</h2>
        <button
          type="button"
          onClick={onClear}
          className="px-3 py-1.5 text-sm font-medium border border-red-200 text-red-700 rounded-xl hover:bg-red-50"
        >
          Clear all
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Specialty</th>
              {percentiles.map((p) => (
                <th key={p} className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  TCC {p}
                </th>
              ))}
              {percentiles.map((p) => (
                <th key={`w${p}`} className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  wRVU {p}
                </th>
              ))}
              {percentiles.map((p) => (
                <th key={`cf${p}`} className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  CF {p}
                </th>
              ))}
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.specialty} className="hover:bg-indigo-50/30">
                <td className="px-4 py-2.5 text-sm text-slate-900">{r.specialty}</td>
                {percentiles.map((p) => (
                  <td key={p} className="px-4 py-2.5 text-sm text-right text-slate-700 tabular-nums">
                    {r.tccPercentiles[p] != null ? formatDollar(r.tccPercentiles[p]) : '—'}
                  </td>
                ))}
                {percentiles.map((p) => (
                  <td key={`w${p}`} className="px-4 py-2.5 text-sm text-right text-slate-700 tabular-nums">
                    {r.wrvuPercentiles[p] != null ? formatWrvu(r.wrvuPercentiles[p]) : '—'}
                  </td>
                ))}
                {percentiles.map((p) => (
                  <td key={`cf${p}`} className="px-4 py-2.5 text-sm text-right text-slate-700 tabular-nums">
                    {r.cfPercentiles?.[p] != null ? formatDollar(r.cfPercentiles[p]) : '—'}
                  </td>
                ))}
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => onRemove(r.specialty)}
                    className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
