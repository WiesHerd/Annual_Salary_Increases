import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  loadProviderTypeToSurveyMapping,
  saveProviderTypeToSurveyMapping,
} from '../../../lib/parameters-storage';
import { getSurveyLabel, DEFAULT_SURVEY_ID } from '../../../types/market-survey-config';
import type { ParameterOptions } from '../../../lib/parameter-options';
import type { ProviderTypeToSurveyMapping } from '../../../types/market-survey-config';
import { SearchableSelect } from '../../../components/searchable-select';
import {
  parametersFieldInputClass,
  parametersFieldSelectClass,
  parametersPrimaryButtonClass,
  parametersSectionDescriptionClass,
  parametersSectionHeadingClass,
  parametersTablePanelClass,
} from '../parameters-tab-ui';

interface ProviderTypeSurveyTabProps {
  options: ParameterOptions;
  /** Survey slot ids from market data, routing, and Parameters (see collectSurveyPickerIds). */
  surveyIds?: string[];
  /** Custom survey labels for user-defined slots. */
  surveyMetadata?: Record<string, { label: string }>;
}

function optionsWithCurrent(options: string[], current: string | undefined): string[] {
  if (!current || current.trim() === '') return options;
  if (options.includes(current.trim())) return options;
  return [current.trim(), ...options].sort();
}

export function ProviderTypeSurveyTab({ options, surveyIds = [], surveyMetadata = {} }: ProviderTypeSurveyTabProps) {
  const [mapping, setMapping] = useState<ProviderTypeToSurveyMapping>(() => loadProviderTypeToSurveyMapping());

  useEffect(() => {
    setMapping(loadProviderTypeToSurveyMapping());
  }, []);

  const persist = useCallback((next: ProviderTypeToSurveyMapping) => {
    setMapping(next);
    saveProviderTypeToSurveyMapping(next);
  }, []);

  const surveyOptions = useMemo(() => {
    const idSet = new Set<string>();
    for (const id of surveyIds) {
      const k = id.trim();
      if (k) idSet.add(k);
    }
    for (const sid of Object.values(mapping)) {
      const s = String(sid ?? '').trim();
      if (s) idSet.add(s);
    }
    const sorted = [...idSet].sort((a, b) =>
      getSurveyLabel(a, surveyMetadata).localeCompare(getSurveyLabel(b, surveyMetadata), undefined, {
        sensitivity: 'base',
        numeric: true,
      })
    );
    return sorted.map((id) => ({ id, label: getSurveyLabel(id, surveyMetadata) }));
  }, [surveyIds, mapping, surveyMetadata]);

  const entries = Object.entries(mapping);
  const providerTypeOpts = optionsWithCurrent(options.providerTypes, undefined);

  const addRow = useCallback(() => {
    const next = { ...mapping };
    let key = options.providerTypes.find((t) => !(t in next)) ?? '';
    if (!key) {
      let i = 1;
      while (next[`New type ${i}`]) i++;
      key = `New type ${i}`;
    }
    const defaultSurveyId = surveyIds.includes(DEFAULT_SURVEY_ID)
      ? DEFAULT_SURVEY_ID
      : (surveyIds[0] ?? surveyOptions[0]?.id ?? DEFAULT_SURVEY_ID);
    next[key] = defaultSurveyId;
    persist(next);
  }, [mapping, options.providerTypes, persist, surveyIds, surveyOptions]);

  const update = useCallback(
    (oldKey: string, providerType: string, surveyId: string) => {
      if (providerType.trim() === '') return;
      const next = { ...mapping };
      delete next[oldKey];
      next[providerType.trim()] = surveyId;
      persist(next);
    },
    [mapping, persist]
  );

  const remove = useCallback(
    (key: string) => {
      const next = { ...mapping };
      delete next[key];
      persist(next);
    },
    [mapping, persist]
  );

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h3 className={parametersSectionHeadingClass}>Provider type → Market survey</h3>
          <p className={parametersSectionDescriptionClass}>
            Map each provider type to a market survey slot (from your uploaded market files). Add surveys under Data →
            Import or when you first load market rows; labels for each slot can be customized in survey metadata.
          </p>
          {options.providerTypes.length === 0 && (
            <p className="text-xs text-amber-700 mt-2">
              Upload provider data in Data to see existing provider types. You can still add mappings for expected types.
            </p>
          )}
        </div>
        <button type="button" onClick={addRow} className={`${parametersPrimaryButtonClass} sm:mt-0.5`}>
          Add mapping
        </button>
      </div>
      <div className={parametersTablePanelClass}>
        <table className="app-settings-table min-w-full border-collapse">
          <thead>
            <tr>
              <th>Provider type</th>
              <th>Market survey</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No mappings. Click &quot;Add mapping&quot; to create one. Unmapped provider types use the default survey id
                  from app settings until you map them here.
                </td>
              </tr>
            ) : (
              entries.map(([providerType, surveyId]) => {
                const opts = optionsWithCurrent(providerTypeOpts, providerType);
                return (
                  <tr key={providerType} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2">
                      {opts.length > 0 ? (
                        <SearchableSelect
                          value={providerType}
                          options={opts}
                          onChange={(v) => update(providerType, v ?? providerType, surveyId)}
                          emptyOptionLabel="—"
                          className="min-w-[180px]"
                        />
                      ) : (
                        <input
                          type="text"
                          value={providerType}
                          onChange={(e) => update(providerType, e.target.value, surveyId)}
                          className={`w-full min-w-[180px] ${parametersFieldInputClass}`}
                          placeholder="e.g. Physician, APP"
                        />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={surveyId}
                        onChange={(e) => update(providerType, providerType, e.target.value)}
                        className={`w-full min-w-[200px] ${parametersFieldSelectClass}`}
                      >
                        {surveyOptions.map(({ id, label }) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => remove(providerType)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                        aria-label="Remove"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
