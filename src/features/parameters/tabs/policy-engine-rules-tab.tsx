/**
 * Policy library: list policies, create (wizard), view definition, edit, duplicate, archive.
 * Supports opening a specific rule by ID (e.g. from salary review table link).
 * "Add from library" adds pre-built templates from the policy template library.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AnnualIncreasePolicy, PolicyTargetScope } from '../../../types/compensation-policy';
import type { ProviderRecord } from '../../../types/provider';
import type { usePolicyEngineState } from '../../../hooks/use-policy-engine-state';
import { PolicyRuleEditor } from '../policy-engine-rule-editor';
import { POLICY_TEMPLATES, instantiateTemplate } from '../../../lib/policy-templates';
import { getSamplePolicyPack, getMinimalPolicyPack, getTargetedScenariosPolicyPack } from '../../../lib/policy-engine-storage';
import { sortPoliciesByStageAndPriority } from '../../../lib/policy-engine/stages';

const PRIORITY_OPTIONS: { value: number; label: string; isFallback?: boolean }[] = [
  { value: 0, label: '1st (Highest)', isFallback: false },
  { value: 25, label: '2nd (High)', isFallback: false },
  { value: 50, label: '3rd (Medium)', isFallback: false },
  { value: 75, label: '4th (Low)', isFallback: false },
  { value: 100, label: 'Last (Fallback)', isFallback: true },
];

const PRIORITY_LABELS: Record<number, string> = {
  0: 'Highest',
  25: 'High',
  50: 'Medium',
  75: 'Low',
  100: 'Fallback',
};

function formatPriority(policy: AnnualIncreasePolicy): string {
  if (policy.isFallback) return 'Fallback';
  return PRIORITY_LABELS[policy.priority] ?? `Priority ${policy.priority}`;
}

function formatTargetScopeSummary(scope: PolicyTargetScope): string {
  const parts: string[] = [];
  if (scope.providerTypes?.length) parts.push(scope.providerTypes.join(', '));
  if (scope.divisions?.length) parts.push(scope.divisions.join(', '));
  if (scope.specialties?.length) parts.push(scope.specialties.join(', '));
  if (scope.departments?.length) parts.push(scope.departments.join(', '));
  if (scope.locations?.length) parts.push(scope.locations.join(', '));
  if (scope.providerIds?.length) parts.push(`${scope.providerIds.length} selected`);
  if (parts.length === 0) return 'All providers';
  return parts.join(' · ');
}

interface PolicyEngineRulesTabProps {
  policyState: ReturnType<typeof usePolicyEngineState>;
  records?: ProviderRecord[];
  parameterOptions: import('../../../lib/parameter-options').ParameterOptions;
  selectedRuleId: string | null;
  onSelectRuleId: (id: string | null) => void;
  onStartCreatePolicy?: () => void;
}

function newId() {
  return `pol-${Date.now()}`;
}

export function PolicyEngineRulesTab({
  policyState,
  records: _records = [],
  parameterOptions,
  selectedRuleId,
  onSelectRuleId,
  onStartCreatePolicy,
}: PolicyEngineRulesTabProps) {
  const { policies, setPolicies, persistNow } = policyState;

  const addPolicy = useCallback(() => {
    const id = newId();
    setPolicies((prev) => [
      ...prev,
      {
        id,
        key: `rule-${Date.now()}`,
        name: 'New policy',
        status: 'draft',
        stage: 'MODIFIER',
        policyType: 'Modifier',
        priority: 10,
        targetScope: {},
        actions: [{ type: 'ADD_INCREASE_PERCENT', value: 0 }],
        conflictStrategy: 'ADDITIVE_MODIFIER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as AnnualIncreasePolicy,
    ]);
    onSelectRuleId(id);
  }, [setPolicies, onSelectRuleId]);

  const handleCreatePolicy = useCallback(() => {
    if (onStartCreatePolicy) {
      onStartCreatePolicy();
    } else {
      addPolicy();
    }
  }, [onStartCreatePolicy, addPolicy]);

  const duplicatePolicy = useCallback(
    (policy: AnnualIncreasePolicy) => {
      const id = newId();
      setPolicies((prev) => [
        ...prev,
        { ...policy, id, key: `${policy.key}-copy-${Date.now()}`, name: `${policy.name} (copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ]);
      onSelectRuleId(id);
    },
    [setPolicies, onSelectRuleId]
  );

  const removePolicy = useCallback(
    (id: string) => {
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      if (selectedRuleId === id) onSelectRuleId(null);
    },
    [setPolicies, selectedRuleId, onSelectRuleId]
  );

  const updatePolicyPriority = useCallback(
    (id: string, priority: number, isFallback: boolean) => {
      setPolicies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, priority, isFallback, updatedAt: new Date().toISOString() } : p))
      );
    },
    [setPolicies]
  );

  const selectedPolicy = selectedRuleId ? policies.find((p) => p.id === selectedRuleId) : null;
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const addFromLibraryButtonRef = useRef<HTMLButtonElement>(null);
  const [libraryDropdownRect, setLibraryDropdownRect] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!libraryOpen || !addFromLibraryButtonRef.current) {
      setLibraryDropdownRect(null);
      return;
    }
    const el = addFromLibraryButtonRef.current;
    const rect = el.getBoundingClientRect();
    setLibraryDropdownRect({ top: rect.bottom + 4, left: Math.max(8, rect.right - 320) });
  }, [libraryOpen]);

  const handleCloseEditor = useCallback(() => {
    persistNow?.();
    onSelectRuleId(null);
    setShowSavedToast(true);
  }, [persistNow, onSelectRuleId]);

  useEffect(() => {
    if (!showSavedToast) return;
    const t = setTimeout(() => setShowSavedToast(false), 2500);
    return () => clearTimeout(t);
  }, [showSavedToast]);
  const sortedPolicies = useMemo(() => sortPoliciesByStageAndPriority(policies), [policies]);
  const orderByPolicyId = useMemo(() => {
    const map = new Map<string, number>();
    sortedPolicies.forEach((p, i) => map.set(p.id, i + 1));
    return map;
  }, [sortedPolicies]);

  const addFromTemplate = useCallback(
    (templateKey: string) => {
      const t = POLICY_TEMPLATES.find((x) => x.templateKey === templateKey);
      if (!t) return;
      const policy = instantiateTemplate(t.policy);
      setPolicies((prev) => [...prev, policy]);
      onSelectRuleId(policy.id);
      setLibraryOpen(false);
    },
    [setPolicies, onSelectRuleId]
  );

  const loadSamplePack = useCallback(() => {
    setPolicies(getSamplePolicyPack());
    setLibraryOpen(false);
    onSelectRuleId(null);
  }, [setPolicies, onSelectRuleId]);

  const loadMinimalPack = useCallback(() => {
    setPolicies(getMinimalPolicyPack());
    setLibraryOpen(false);
    onSelectRuleId(null);
  }, [setPolicies, onSelectRuleId]);

  const loadTargetedScenariosPack = useCallback(() => {
    setPolicies(getTargetedScenariosPolicyPack());
    setLibraryOpen(false);
    onSelectRuleId(null);
  }, [setPolicies, onSelectRuleId]);

  return (
    <div className={`flex flex-col min-h-0 w-full ${selectedPolicy ? 'min-h-fit' : 'h-full'}`}>
      <div className="shrink-0 px-5 pt-4 pb-2 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-semibold text-slate-800" title="Order: Guardrails → Custom models → Modifiers → Merit matrix → Caps. First match wins. Use Priority in the table to reorder within a stage.">
            Policy library
          </h3>
          <p className="text-sm text-slate-600 mt-0.5">
            {policies.length > 0
              ? `${policies.length} polic${policies.length === 1 ? 'y' : 'ies'}. Click a row to edit.`
              : 'Add from library or create new.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              ref={addFromLibraryButtonRef}
              type="button"
              onClick={() => setLibraryOpen((o) => !o)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              aria-expanded={libraryOpen}
              aria-haspopup="true"
            >
              Add from library
            </button>
            {libraryOpen &&
              libraryDropdownRect &&
              createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[100]"
                    aria-hidden
                    onClick={() => setLibraryOpen(false)}
                  />
                  <div
                    className="fixed z-[101] w-80 max-h-[min(80vh,24rem)] overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1"
                    style={{ top: libraryDropdownRect.top, left: libraryDropdownRect.left }}
                    role="menu"
                  >
                    <button
                      type="button"
                      onClick={loadSamplePack}
                      className="w-full px-3 py-2 text-left hover:bg-indigo-50 text-sm font-medium text-indigo-600 border-b border-slate-100"
                      role="menuitem"
                    >
                      Load sample policy pack
                    </button>
                    <button
                      type="button"
                      onClick={loadMinimalPack}
                      className="w-full px-3 py-2 text-left hover:bg-indigo-50 text-sm font-medium text-indigo-600 border-b border-slate-100"
                      title="No guardrails — use when testing PCP base salary by YOE tier or other custom models"
                      role="menuitem"
                    >
                      Load minimal pack (no guardrails, for tier testing)
                    </button>
                    <button
                      type="button"
                      onClick={loadTargetedScenariosPack}
                      className="w-full px-3 py-2 text-left hover:bg-indigo-50 text-sm font-medium text-indigo-600 border-b border-slate-100"
                      title="FMV 75th guardrail first, then Cardiology 4%, General Pediatrics YOE tiers, cap/floor."
                      role="menuitem"
                    >
                      Load targeted scenarios (FMV + Cardiology + Peds YOE)
                    </button>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Or add individual templates</div>
                    {POLICY_TEMPLATES.map((t) => (
                      <button
                        key={t.templateKey}
                        type="button"
                        onClick={() => addFromTemplate(t.templateKey)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 text-sm"
                        role="menuitem"
                      >
                        <span className="font-medium text-slate-800 block">{t.name}</span>
                        <span className="text-slate-500 text-xs line-clamp-2">{t.description}</span>
                        <span className="text-xs text-indigo-600 mt-0.5 inline-block">{t.stage}</span>
                      </button>
                    ))}
                  </div>
                </>,
                document.body
              )}
          </div>
          <button
            type="button"
            onClick={handleCreatePolicy}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Create new
          </button>
        </div>
      </div>

      <div className={`flex flex-1 min-w-0 w-full relative ${selectedPolicy ? 'overflow-hidden' : 'min-h-0 overflow-hidden'}`}>
        <div className={`relative min-w-0 overflow-auto border-t border-neutral-200/80 ${selectedPolicy ? 'w-72 xl:w-80 shrink-0' : 'flex-1 w-full'}`}>
          {selectedPolicy && (
            <button
              type="button"
              onClick={handleCloseEditor}
              className="absolute inset-0 z-10 bg-black/25 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500/50"
              aria-label="Close edit panel (click to save and return to list)"
              title="Click to save and close editor"
            />
          )}
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 z-20 bg-neutral-50 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
              <tr className="bg-neutral-50">
                <th className="px-2 py-3 text-center text-[11px] font-semibold text-neutral-600 uppercase tracking-wide w-14" title="Evaluation order: by stage, then by priority. Change Priority to reorder.">Order</th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Name</th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Type</th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Target population</th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide min-w-[100px]">Priority</th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Status</th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Last updated</th>
                <th className="w-24 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {policies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No policies. Click “Create Policy” to create one.
                  </td>
                </tr>
              ) : (
                sortedPolicies.map((p) => (
                  <tr
                    key={p.id}
                    className={`group transition-colors cursor-pointer ${
                      selectedRuleId === p.id ? 'bg-indigo-100/60' : 'hover:bg-indigo-50/30'
                    }`}
                    onClick={() => {
                      onSelectRuleId(p.id);
                    }}
                  >
                    <td className="px-2 py-1.5 text-center text-sm tabular-nums text-slate-600">{orderByPolicyId.get(p.id) ?? '—'}</td>
                    <td className="px-2 py-1.5 text-sm font-medium text-slate-800">{p.name}</td>
                    <td className="px-2 py-1.5 text-sm text-slate-600">{p.policyType}</td>
                    <td className="px-2 py-1.5 text-sm text-slate-600 max-w-[160px] truncate" title={formatTargetScopeSummary(p.targetScope)}>
                      {formatTargetScopeSummary(p.targetScope)}
                    </td>
                    <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={p.isFallback ? 100 : p.priority}
                        onChange={(e) => {
                          const opt = PRIORITY_OPTIONS.find((o) => String(o.value) === e.target.value);
                          if (opt) updatePolicyPriority(p.id, opt.value, opt.isFallback ?? false);
                        }}
                        className="w-full min-w-0 max-w-[100px] text-xs border border-slate-200 rounded px-1.5 py-1 bg-white text-slate-700"
                        title="Lower priority runs first within the stage"
                      >
                        {PRIORITY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-sm text-slate-600">{p.status}</td>
                    <td className="px-2 py-1.5 text-sm text-slate-500">
                      {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicatePolicy(p);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        title="Duplicate"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePolicy(p.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {selectedPolicy && (
          <div
            className="flex-1 min-w-0 flex flex-col bg-white border-l border-slate-200 overflow-y-auto"
            role="dialog"
            aria-label="Edit rule"
          >
            <PolicyRuleEditor
                policy={selectedPolicy}
                onUpdate={(updates) => {
                  policyState.setPolicies((prev) =>
                    prev.map((p) => (p.id === selectedPolicy.id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
                  );
                }}
                onClose={handleCloseEditor}
                parameterOptions={parameterOptions}
              />
          </div>
        )}
      </div>

      {showSavedToast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Changes saved
        </div>
      )}
    </div>
  );
}

