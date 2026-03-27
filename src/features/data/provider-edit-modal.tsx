/**
 * Edit modal for provider records. Groups fields by section and shows change history.
 */

import { useState, useMemo, useCallback } from 'react';
import type { ProviderRecord } from '../../types/provider';
import { SearchableSelect } from '../../components/searchable-select';
import { getChangeHistoryForEntity } from '../../lib/audit';
import { formatCurrency } from '../../utils/format';

function extractOptions(records: ProviderRecord[], key: keyof ProviderRecord): string[] {
  const set = new Set<string>();
  for (const r of records) {
    const v = r[key];
    if (v != null && String(v).trim() !== '') set.add(String(v).trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function formatAuditValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'number') {
    if (value > 10000) return formatCurrency(value);
    if (value < 1 && value > 0) return value.toFixed(2);
    return value.toLocaleString();
  }
  return String(value);
}

interface ProviderEditModalProps {
  record: ProviderRecord;
  records: ProviderRecord[];
  marketSpecialties: string[];
  onSave: (updates: Partial<ProviderRecord>) => void;
  onClose: () => void;
}

type FieldDef =
  | { key: keyof ProviderRecord; label: string; type: 'text' | 'number' | 'currency' | 'select' | 'textarea' }
  | { key: keyof ProviderRecord; label: string; type: 'select'; optionsKey: 'market' };

const SECTIONS: { label: string; fields: FieldDef[] }[] = [
  {
    label: 'Identity',
    fields: [
      { key: 'Provider_Name', label: 'Name', type: 'text' },
      { key: 'Department', label: 'Department', type: 'select' },
      { key: 'Specialty', label: 'Specialty', type: 'select' },
      { key: 'Primary_Division', label: 'Primary Division', type: 'select' },
      { key: 'Provider_Type', label: 'Provider Type', type: 'select' },
      { key: 'Population', label: 'Population', type: 'select' },
      { key: 'Compensation_Plan', label: 'Compensation Plan', type: 'select' },
      { key: 'Location', label: 'Location', type: 'text' },
      { key: 'Job_Code', label: 'Job Code', type: 'text' },
      { key: 'Benchmark_Group', label: 'Benchmark Group', type: 'select' },
      { key: 'Market_Specialty_Override', label: 'Market Specialty Override', type: 'select', optionsKey: 'market' },
    ],
  },
  {
    label: 'FTE & Employment',
    fields: [
      { key: 'Current_FTE', label: 'Current FTE', type: 'number' },
      { key: 'Clinical_FTE', label: 'Clinical FTE', type: 'number' },
      { key: 'Hire_Date', label: 'Hire Date', type: 'text' },
      { key: 'Years_of_Experience', label: 'Years of Experience', type: 'number' },
    ],
  },
  {
    label: 'Current Compensation',
    fields: [
      { key: 'Current_Base_Salary', label: 'Base Salary', type: 'currency' },
      { key: 'Current_TCC', label: 'Current TCC', type: 'currency' },
      { key: 'Prior_Year_WRVU_Incentive', label: 'wRVU / productivity incentive', type: 'currency' },
      { key: 'Value_Based_Payment', label: 'Value-based payment', type: 'currency' },
      { key: 'Shift_Incentive', label: 'Shift incentive', type: 'currency' },
      { key: 'Quality_Bonus', label: 'Quality bonus', type: 'currency' },
      { key: 'Division_Chief_Pay', label: 'Division chief pay', type: 'currency' },
      { key: 'Medical_Director_Pay', label: 'Medical director pay', type: 'currency' },
      { key: 'Teaching_Pay', label: 'Teaching pay', type: 'currency' },
      { key: 'PSQ_Pay', label: 'PSQ pay', type: 'currency' },
      { key: 'Other_Recurring_Comp', label: 'Other recurring comp', type: 'currency' },
      { key: 'TCC_Other_Clinical_1', label: 'TCC other (1)', type: 'currency' },
      { key: 'TCC_Other_Clinical_2', label: 'TCC other (2)', type: 'currency' },
      { key: 'TCC_Other_Clinical_3', label: 'TCC other (3)', type: 'currency' },
      { key: 'Current_Target_WRVUs', label: 'Target wRVUs', type: 'number' },
      { key: 'Current_CF', label: 'Conversion Factor', type: 'currency' },
    ],
  },
  {
    label: 'Review',
    fields: [
      { key: 'Review_Status', label: 'Review Status', type: 'select' },
      { key: 'Notes', label: 'Notes', type: 'textarea' },
    ],
  },
];

export function ProviderEditModal({
  record,
  records,
  marketSpecialties,
  onSave,
  onClose,
}: ProviderEditModalProps) {
  const [form, setForm] = useState<Partial<ProviderRecord>>(() => ({ ...record }));

  const options = useMemo(
    () => ({
      departments: extractOptions(records, 'Department'),
      specialties: extractOptions(records, 'Specialty'),
      primaryDivisions: extractOptions(records, 'Primary_Division'),
      providerTypes: extractOptions(records, 'Provider_Type'),
      populations: extractOptions(records, 'Population'),
      plans: extractOptions(records, 'Compensation_Plan'),
      benchmarkGroups: extractOptions(records, 'Benchmark_Group'),
      statuses: extractOptions(records, 'Review_Status'),
      market: marketSpecialties,
    }),
    [records, marketSpecialties]
  );

  const changeHistory = useMemo(
    () => getChangeHistoryForEntity('provider', record.Employee_ID, 10),
    [record.Employee_ID]
  );

  const handleChange = useCallback(
    (key: keyof ProviderRecord, value: string | number | undefined) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = useCallback(() => {
    const updates: Partial<ProviderRecord> = {};
    const rec = record as unknown as Record<string, unknown>;
    for (const [key, val] of Object.entries(form)) {
      const orig = rec[key];
      if (val !== orig) {
        (updates as Record<string, unknown>)[key] = val;
      }
    }
    if (Object.keys(updates).length > 0) {
      onSave(updates);
    }
    onClose();
  }, [form, record, onSave, onClose]);

  const getOptionsForField = useCallback(
    (fieldKey: string, optionsKey?: string, currentVal?: string) => {
      let opts: string[];
      if (optionsKey === 'market') opts = options.market;
      else {
        switch (fieldKey) {
          case 'Department':
            opts = options.departments;
            break;
          case 'Specialty':
            opts = options.specialties;
            break;
          case 'Primary_Division':
            opts = options.primaryDivisions;
            break;
          case 'Provider_Type':
            opts = options.providerTypes;
            break;
          case 'Population':
            opts = options.populations;
            break;
          case 'Compensation_Plan':
            opts = options.plans;
            break;
          case 'Benchmark_Group':
            opts = options.benchmarkGroups;
            break;
          case 'Market_Specialty_Override':
            opts = options.market;
            break;
          case 'Review_Status':
            opts = options.statuses;
            break;
          default:
            opts = [];
        }
      }
      if (currentVal && currentVal.trim() && !opts.includes(currentVal.trim())) {
        return [currentVal.trim(), ...opts];
      }
      return opts;
    },
    [options]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Edit provider"
      onClick={onClose}
    >
      <div
        className="app-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Edit provider: {record.Provider_Name ?? record.Employee_ID}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">ID: {record.Employee_ID}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <h3 className="text-sm font-medium text-slate-700 mb-2">{section.label}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.fields.map((field) => {
                  const { key, label, type } = field;
                  const optionsKey = field.type === 'select' && 'optionsKey' in field ? field.optionsKey : undefined;
                  const val = form[key];
                  const displayVal = val ?? (record as unknown as Record<string, unknown>)[key];
                  if (type === 'select') {
                    const opts = getOptionsForField(key, optionsKey, String(displayVal ?? ''));
                    return (
                      <label key={key} className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500">{label}</span>
                        <SearchableSelect
                          value={String(displayVal ?? '')}
                          options={opts}
                          onChange={(v) => handleChange(key, v || undefined)}
                          emptyOptionLabel="—"
                          className="min-w-0"
                        />
                      </label>
                    );
                  }
                  if (type === 'textarea') {
                    return (
                      <label key={key} className="sm:col-span-2 flex flex-col gap-1">
                        <span className="text-xs text-slate-500">{label}</span>
                        <textarea
                          value={String(displayVal ?? '')}
                          onChange={(e) => handleChange(key, e.target.value || undefined)}
                          rows={3}
                          className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </label>
                    );
                  }
                  if (type === 'number' || type === 'currency') {
                    const num = typeof displayVal === 'number' ? displayVal : displayVal ? parseFloat(String(displayVal)) : undefined;
                    const step = type === 'currency' ? '0.01' : key.includes('FTE') ? '0.01' : '1';
                    return (
                      <label key={key} className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500">{label}</span>
                        <input
                          type="number"
                          step={step}
                          min={type === 'currency' ? 0 : key.includes('FTE') ? 0 : undefined}
                          max={key.includes('FTE') ? 1 : undefined}
                          value={num !== undefined && !Number.isNaN(num) ? num : ''}
                          onChange={(e) => {
                            const v = e.target.value.trim();
                            const parsed = v === '' ? undefined : parseFloat(v);
                            handleChange(key, parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined);
                          }}
                          placeholder="—"
                          className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </label>
                    );
                  }
                  return (
                    <label key={key} className="flex flex-col gap-1">
                      <span className="text-xs text-slate-500">{label}</span>
                      <input
                        type="text"
                        value={String(displayVal ?? '')}
                        onChange={(e) => handleChange(key, e.target.value || undefined)}
                        placeholder="—"
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {changeHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Change history</h3>
              <ul className="space-y-1.5 text-xs text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">
                {changeHistory.map((entry) => (
                  <li key={entry.id}>
                    <span className="font-medium text-slate-700">{entry.field}</span>:{' '}
                    {formatAuditValue(entry.oldValue)} → {formatAuditValue(entry.newValue)}
                    <span className="text-slate-400 ml-1">
                      ({new Date(entry.timestamp).toLocaleDateString()} by {entry.userId ?? 'Unknown'})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="app-btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
