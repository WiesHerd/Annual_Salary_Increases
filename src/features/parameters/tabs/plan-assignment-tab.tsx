import { useCallback } from 'react';
import type { PlanAssignmentRuleRow } from '../../../types/plan-assignment-row';
import { CompensationPlanType } from '../../../types/enums';

interface PlanAssignmentTabProps {
  planAssignmentRules: PlanAssignmentRuleRow[];
  setPlanAssignmentRules: (v: PlanAssignmentRuleRow[] | ((prev: PlanAssignmentRuleRow[]) => PlanAssignmentRuleRow[])) => void;
}

function newId() {
  return `rule-${Date.now()}`;
}

const PLAN_TYPE_OPTIONS = Object.values(CompensationPlanType);

export function PlanAssignmentTab({ planAssignmentRules, setPlanAssignmentRules }: PlanAssignmentTabProps) {
  const addRow = useCallback(() => {
    setPlanAssignmentRules((prev) => [
      ...prev,
      { id: newId(), population: '', division: '', department: '', jobCode: '', benchmarkGroup: '', assignedPlanType: CompensationPlanType.WRVU, priority: prev.length },
    ]);
  }, [setPlanAssignmentRules]);

  const update = useCallback(
    (id: string, updates: Partial<PlanAssignmentRuleRow>) => {
      setPlanAssignmentRules(planAssignmentRules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    [planAssignmentRules, setPlanAssignmentRules]
  );

  const remove = useCallback(
    (id: string) => setPlanAssignmentRules(planAssignmentRules.filter((r) => r.id !== id)),
    [planAssignmentRules, setPlanAssignmentRules]
  );

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Plan assignment rules</h3>
        <p className="text-sm text-slate-600 mt-1">Match population, division, department, job code, or benchmark group to assign a compensation plan type. Lower priority number runs first.</p>
      </div>
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={addRow}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Add rule
        </button>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Provider Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Division</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Job code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Benchmark group</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Assigned plan type</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Priority</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {planAssignmentRules.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No rules. Click “Add rule” to create one.
                </td>
              </tr>
            ) : (
              planAssignmentRules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.population ?? ''}
                      onChange={(e) => update(r.id, { population: e.target.value || undefined })}
                      className="w-full min-w-[90px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                      placeholder="physician, app"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.division ?? ''}
                      onChange={(e) => update(r.id, { division: e.target.value || undefined })}
                      className="w-full min-w-[90px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.department ?? ''}
                      onChange={(e) => update(r.id, { department: e.target.value || undefined })}
                      className="w-full min-w-[90px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.jobCode ?? ''}
                      onChange={(e) => update(r.id, { jobCode: e.target.value || undefined })}
                      className="w-full min-w-[80px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={r.benchmarkGroup ?? ''}
                      onChange={(e) => update(r.id, { benchmarkGroup: e.target.value || undefined })}
                      className="w-full min-w-[90px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={r.assignedPlanType}
                      onChange={(e) => update(r.id, { assignedPlanType: e.target.value as CompensationPlanType })}
                      className="w-full min-w-[100px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      {PLAN_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={r.priority}
                      onChange={(e) => update(r.id, { priority: Number(e.target.value) ?? 0 })}
                      className="w-20 px-2 py-1.5 text-sm border border-slate-300 rounded-lg text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => remove(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" aria-label="Remove">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
