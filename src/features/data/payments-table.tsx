import type { ParsedPaymentRow } from '../../types';

interface PaymentsTableProps {
  rows: ParsedPaymentRow[];
  onClear: () => void;
}

export function PaymentsTable({ rows, onClear }: PaymentsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-indigo-100 p-6 text-center text-slate-500 shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07),0_2px_4px_-2px_rgba(79,70,229,0.07)]">
        <p>No payments yet. Upload a payments file (CSV or XLSX) above.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07),0_2px_4px_-2px_rgba(79,70,229,0.07)]">
      <div className="px-5 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
        <h2 className="text-base font-semibold text-slate-800">Payments ({rows.length} rows)</h2>
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Provider</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Cycle</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={`${row.providerKey}-${row.date}-${i}`} className="hover:bg-indigo-50/30">
                <td className="px-4 py-2.5 text-sm text-slate-900">{row.providerKey}</td>
                <td className="px-4 py-2.5 text-sm text-right text-slate-700">
                  {row.amount.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-sm text-slate-700">{row.date}</td>
                <td className="px-4 py-2.5 text-sm text-slate-700">{row.category ?? '—'}</td>
                <td className="px-4 py-2.5 text-sm text-slate-700">{row.cycleId ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
