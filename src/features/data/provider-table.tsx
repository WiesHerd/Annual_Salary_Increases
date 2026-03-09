import type { ProviderRecord } from '../../types/provider';
import { exportToCsv, exportToXlsx } from '../../lib/batch-export';

interface ProviderTableProps {
  records: ProviderRecord[];
  onRemove: (employeeId: string) => void;
  onClear: () => void;
}

export function ProviderTable({ records, onRemove, onClear }: ProviderTableProps) {
  const handleExportCsv = () => {
    const csv = exportToCsv(records);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'provider-records.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXlsx = async () => {
    const buffer = exportToXlsx(records);
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'provider-records.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-indigo-100 p-8 text-center text-slate-500 shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07),0_2px_4px_-2px_rgba(79,70,229,0.07)]">
        <p>No provider records yet. Upload a CSV or XLSX file above.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07),0_2px_4px_-2px_rgba(79,70,229,0.07)]">
      <div className="px-5 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
        <h2 className="text-base font-semibold text-slate-800">Provider records ({records.length})</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-700"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportXlsx}
            className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-700"
          >
            Export XLSX
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-1.5 text-sm font-medium border border-red-200 text-red-700 rounded-xl hover:bg-red-50"
          >
            Clear all
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Specialty</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Dept</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Provider Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Plan</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">FTE</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Current TCC</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Target wRVU</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">TCC %ile</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">wRVU %ile</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {records.map((r) => (
              <tr key={r.Employee_ID} className="hover:bg-indigo-50/30">
                <td className="px-4 py-2.5 text-sm text-slate-900">{r.Employee_ID}</td>
                <td className="px-4 py-2.5 text-sm text-slate-900">{r.Provider_Name ?? '—'}</td>
                <td className="px-4 py-2.5 text-sm text-slate-700">{r.Specialty ?? '—'}</td>
                <td className="px-4 py-2.5 text-sm text-slate-700">{r.Department ?? '—'}</td>
                <td className="px-4 py-2.5 text-sm text-slate-700">{r.Population ?? '—'}</td>
                <td className="px-4 py-2.5 text-sm text-slate-700">{r.Compensation_Plan ?? '—'}</td>
                <td className="px-4 py-2.5 text-sm text-right text-slate-700">{r.Current_FTE ?? '—'}</td>
                <td className="px-4 py-2.5 text-sm text-right text-slate-700">
                  {r.Current_TCC != null ? r.Current_TCC.toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-right text-slate-700">
                  {r.Current_Target_WRVUs != null ? r.Current_Target_WRVUs.toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-right text-slate-700">
                  {r.Current_TCC_Percentile != null ? r.Current_TCC_Percentile : '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-right text-slate-700">
                  {r.WRVU_Percentile != null ? r.WRVU_Percentile : '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-slate-700">{r.Review_Status ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => onRemove(r.Employee_ID)}
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
