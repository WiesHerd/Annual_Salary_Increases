import type { EvaluationJoinRow } from '../../types';

interface EvaluationTableProps {
  rows: EvaluationJoinRow[];
  onClear: () => void;
}

export function EvaluationTable({ rows, onClear }: EvaluationTableProps) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-500 text-sm">
        No evaluation data. Upload a file in the form above to match providers by Employee ID (e.g. evaluation score,
        performance category such as Exceeds / Meets / Needs Improvement).
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-800">Evaluation data ({rows.length} row(s))</h3>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-amber-700 hover:text-amber-800 font-medium"
        >
          Clear all
        </button>
      </div>
      <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Employee ID</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Evaluation score</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Performance category</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Default increase %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={`${r.Employee_ID}-${i}`} className="hover:bg-slate-50/50">
                <td className="px-4 py-2 text-sm text-slate-800">{r.Employee_ID}</td>
                <td className="px-4 py-2 text-sm text-right tabular-nums text-slate-700">
                  {r.Evaluation_Score != null ? r.Evaluation_Score : '—'}
                </td>
                <td className="px-4 py-2 text-sm text-slate-700">{r.Performance_Category ?? '—'}</td>
                <td className="px-4 py-2 text-sm text-right tabular-nums text-slate-700">
                  {r.Default_Increase_Percent != null ? `${r.Default_Increase_Percent}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
