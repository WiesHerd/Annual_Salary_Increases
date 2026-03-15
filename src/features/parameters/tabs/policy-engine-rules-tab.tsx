/**
 * Policy library: list policies, create (wizard), view definition, edit, duplicate, archive.
 * Supports opening a specific rule by ID (e.g. from salary review table link).
 * "Add from library" adds pre-built templates from the policy template library.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { AnnualIncreasePolicy, PolicyTargetScope, PolicyStage } from '../../../types/compensation-policy';
import { POLICY_STAGE_ORDER, POLICY_STAGE_LABELS } from '../../../types/compensation-policy';
import type { ProviderRecord } from '../../../types/provider';
import type { usePolicyEngineState } from '../../../hooks/use-policy-engine-state';
import { PolicyRuleEditor } from '../policy-engine-rule-editor';
import { POLICY_TEMPLATES, instantiateTemplate } from '../../../lib/policy-templates';
import { sortPoliciesByStageAndPriority } from '../../../lib/policy-engine/stages';
import { loadSavedPacks, createSavedPack, getPackById } from '../../../lib/policy-pack-storage';
import {
  loadUserTemplates,
  instantiateUserTemplate,
  createUserTemplate,
  createUserTemplateFromPolicy,
  updateUserTemplate,
  deleteUserTemplate,
  type UserPolicyTemplate,
} from '../../../lib/policy-library-storage';

const PRIORITY_OPTIONS: { value: number; label: string; isFallback?: boolean }[] = [
  { value: 0, label: '1st (Highest)', isFallback: false },
  { value: 25, label: '2nd (High)', isFallback: false },
  { value: 50, label: '3rd (Medium)', isFallback: false },
  { value: 75, label: '4th (Low)', isFallback: false },
  { value: 100, label: 'Last (Fallback)', isFallback: true },
];

const TIE_BREAKER_PX = 5;

/**
 * Collision detection for sortable table rows: pick the row whose center is closest
 * to the dragged element's center (by vertical distance). Works reliably inside
 * scrollable containers where pointerWithin/rectIntersection often fail.
 * When two rows are within TIE_BREAKER_PX distance, prefer the row above (smaller centerY)
 * so dropping near the boundary between rows resolves consistently.
 */
const verticalClosestRow: CollisionDetection = ({ active, collisionRect, droppableRects, droppableContainers }) => {
  const dragCenterY = collisionRect.top + collisionRect.height / 2;
  const dragCenterX = collisionRect.left + collisionRect.width / 2;
  const candidates: { id: string; distance: number; centerY: number; container: (typeof droppableContainers)[0] }[] = [];

  for (const container of droppableContainers) {
    if (container.id === active.id || container.disabled) continue;
    const rect = droppableRects.get(container.id);
    if (!rect) continue;
    const centerY = rect.top + rect.height / 2;
    const centerX = rect.left + rect.width / 2;
    const dy = dragCenterY - centerY;
    const dx = dragCenterX - centerX;
    const distance = Math.sqrt(dy * dy + dx * dx);
    candidates.push({ id: String(container.id), distance, centerY, container });
  }

  candidates.sort((a, b) => {
    if (Math.abs(a.distance - b.distance) <= TIE_BREAKER_PX) {
      return a.centerY - b.centerY;
    }
    return a.distance - b.distance;
  });
  return candidates.map((c) => ({
    id: c.id,
    data: { droppableContainer: c.container, value: -c.distance },
  }));
};

function formatTargetScopeSummary(scope: PolicyTargetScope): string {
  const parts: string[] = [];
  if (scope.providerTypes?.length) parts.push(scope.providerTypes.join(', '));
  if (scope.divisions?.length) parts.push(scope.divisions.join(', '));
  if (scope.specialties?.length) parts.push(scope.specialties.join(', '));
  if (scope.departments?.length) parts.push(scope.departments.join(', '));
  if (scope.locations?.length) parts.push(scope.locations.join(', '));
  if (scope.providerIds?.length) parts.push(`${scope.providerIds.length} selected`);
  if (parts.length === 0) return 'All providers';
  return parts.join(' Â· ');
}

/** Sortable table row: drag handle uses dnd-kit; row click still selects. */
function SortablePolicyRow({
  policy,
  orderNum,
  isSelected,
  onSelect,
  onUpdatePriority,
  onDuplicate,
  onRemove,
}: {
  policy: AnnualIncreasePolicy;
  orderNum: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdatePriority: (id: string, priority: number, isFallback: boolean) => void;
  onDuplicate: (p: AnnualIncreasePolicy) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: policy.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group transition-colors cursor-pointer ${
        isSelected ? 'bg-indigo-100/60' : 'hover:bg-indigo-50/30'
      } ${isDragging ? 'opacity-50 shadow-md z-10 bg-white' : ''}`}
      onClick={onSelect}
    >
      <td
        className="px-2 py-1.5 text-center text-sm tabular-nums text-slate-600"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          {...attributes}
          {...listeners}
          className="inline-flex cursor-grab active:cursor-grabbing touch-none rounded p-0.5 hover:bg-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M8 6h2v2H8V6zm0 5h2v2H8v-2zm0 5h2v2H8v-2zm5-10h2v2h-2V6zm0 5h2v2h-2v-2zm0 5h2v2h-2v-2z" />
          </svg>
        </span>
        <span className="ml-0.5">{orderNum}</span>
      </td>
      <td className="px-2 py-1.5 text-sm font-medium text-slate-800">{policy.name}</td>
      <td className="px-2 py-1.5 text-sm text-slate-600">{policy.policyType}</td>
      <td className="px-2 py-1.5 text-sm text-slate-600 max-w-[160px] truncate" title={formatTargetScopeSummary(policy.targetScope)}>
        {formatTargetScopeSummary(policy.targetScope)}
      </td>
      <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
        <select
          value={policy.isFallback ? 100 : policy.priority}
          onChange={(e) => {
            const opt = PRIORITY_OPTIONS.find((o) => String(o.value) === e.target.value);
            if (opt) onUpdatePriority(policy.id, opt.value, opt.isFallback ?? false);
          }}
          className="w-full min-w-0 max-w-[100px] text-xs border border-slate-200 rounded px-1.5 py-1 bg-white text-slate-700"
          title="Lower priority runs first within the stage"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5 text-sm text-slate-600">{policy.status}</td>
      <td className="px-2 py-1.5 text-sm text-slate-500">
        {policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString() : 'â€”'}
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(policy); }}
            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
            title="Duplicate"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(policy.id); }}
            className="p-1 text-slate-400 hover:text-red-600 rounded"
            title="Remove"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

interface PolicyEngineRulesTabProps {
  policyState: ReturnType<typeof usePolicyEngineState>;
  records?: ProviderRecord[];
  parameterOptions: import('../../../lib/parameter-options').ParameterOptions;
  selectedRuleId: string | null;
  onSelectRuleId: (id: string | null) => void;
  onStartCreatePolicy?: () => void;
  onNavigateToHelp?: () => void;
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
  onNavigateToHelp,
}: PolicyEngineRulesTabProps) {
  const { policies, setPolicies, tierTables, setTierTables, customModels, setCustomModels, persistNow } = policyState;
  const [savePackOpen, setSavePackOpen] = useState(false);
  const [savePackName, setSavePackName] = useState('');
  const [savePackDescription, setSavePackDescription] = useState('');
  const [loadPackConfirmId, setLoadPackConfirmId] = useState<string | null>(null);
  const [savedPacksRefresh, setSavedPacksRefresh] = useState(0);
  const [userTemplatesRefresh, setUserTemplatesRefresh] = useState(0);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editTemplateDescription, setEditTemplateDescription] = useState('');
  const [editTemplateStage, setEditTemplateStage] = useState<AnnualIncreasePolicy['stage']>('MODIFIER');
  const savedPacksList = useMemo(() => loadSavedPacks(), [savedPacksRefresh]);
  const userTemplatesList = useMemo(() => loadUserTemplates(), [userTemplatesRefresh]);
  const editingTemplate = useMemo(
    () => (editingTemplateId ? userTemplatesList.find((t) => t.id === editingTemplateId) : null),
    [editingTemplateId, userTemplatesList]
  );

  useEffect(() => {
    if (editingTemplate) {
      setEditTemplateName(editingTemplate.name);
      setEditTemplateDescription(editingTemplate.description);
      setEditTemplateStage(editingTemplate.stage);
    }
  }, [editingTemplate]);

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

  /** Reassign priorities from a new display order so stage+priority sort preserves that order.
   * When moving across stages, pass draggedId and targetStage so the moved policy's stage is updated. */
  const reorderPoliciesByNewOrder = useCallback(
    (
      newOrderedPolicies: AnnualIncreasePolicy[],
      options?: { draggedId: string; targetStage: PolicyStage }
    ) => {
      const PRIORITY_VALUES = PRIORITY_OPTIONS.map((o) => o.value);
      const now = new Date().toISOString();
      const updates = new Map<
        string,
        { priority: number; isFallback: boolean; stage?: PolicyStage }
      >();
      let stagePrev: string | undefined;
      let indexInStage = 0;
      for (const p of newOrderedPolicies) {
        const effectiveStage = options?.draggedId === p.id ? options.targetStage : p.stage;
        if (effectiveStage !== stagePrev) {
          stagePrev = effectiveStage;
          indexInStage = 0;
        }
        const priority = PRIORITY_VALUES[indexInStage % PRIORITY_VALUES.length] ?? 50;
        const entry: { priority: number; isFallback: boolean; stage?: PolicyStage } = {
          priority,
          isFallback: priority === 100,
        };
        if (options?.draggedId === p.id) {
          entry.stage = options.targetStage;
        }
        updates.set(p.id, entry);
        indexInStage++;
      }
      setPolicies((prev) =>
        prev.map((p) => {
          const u = updates.get(p.id);
          if (!u) return p;
          return {
            ...p,
            priority: u.priority,
            isFallback: u.isFallback,
            ...(u.stage != null && { stage: u.stage }),
            updatedAt: now,
          };
        })
      );
    },
    [setPolicies]
  );

  const selectedPolicy = selectedRuleId ? policies.find((p) => p.id === selectedRuleId) : null;
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const lastOverIdRef = useRef<string | null>(null);
  const handleDragOver = useCallback((event: DragOverEvent) => {
    lastOverIdRef.current = event.over ? String(event.over.id) : null;
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      const overId = over?.id ?? lastOverIdRef.current;
      lastOverIdRef.current = null;
      if (!overId || active.id === overId) return;
      const fromIndex = sortedPolicies.findIndex((p) => p.id === active.id);
      const toIndex = sortedPolicies.findIndex((p) => p.id === overId);
      if (fromIndex === -1 || toIndex === -1) return;
      const newOrdered = arrayMove(sortedPolicies, fromIndex, toIndex);
      const targetStage = sortedPolicies[toIndex].stage;
      reorderPoliciesByNewOrder(newOrdered, {
        draggedId: String(active.id),
        targetStage,
      });
    },
    [sortedPolicies, reorderPoliciesByNewOrder]
  );

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

  const addFromUserTemplate = useCallback(
    (template: UserPolicyTemplate) => {
      const policy = instantiateUserTemplate(template);
      setPolicies((prev) => [...prev, policy]);
      onSelectRuleId(policy.id);
      setLibraryOpen(false);
    },
    [setPolicies, onSelectRuleId]
  );

  const handleSavePack = useCallback(() => {
    const name = savePackName.trim();
    if (!name) return;
    createSavedPack(name, policies, {
      description: savePackDescription.trim() || undefined,
      tierTables,
      customModels,
    });
    setSavePackOpen(false);
    setSavePackName('');
    setSavePackDescription('');
    setSavedPacksRefresh((n) => n + 1);
    setShowSavedToast(true);
  }, [policies, tierTables, customModels, savePackName, savePackDescription]);

  const handleLoadPackConfirm = useCallback(
    (packId: string) => {
      const pack = getPackById(packId);
      if (!pack) return;
      setPolicies(pack.policies);
      if (pack.tierTables != null) setTierTables(pack.tierTables);
      if (pack.customModels != null) setCustomModels(pack.customModels);
      setLoadPackConfirmId(null);
      onSelectRuleId(null);
    },
    [setPolicies, setTierTables, setCustomModels, onSelectRuleId]
  );

  const packToLoad = loadPackConfirmId ? getPackById(loadPackConfirmId) : null;

  return (
    <div className={`flex flex-col min-h-0 w-full ${selectedPolicy ? 'min-h-fit' : 'h-full'}`}>
      <div className="shrink-0 px-5 pt-4 pb-2 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-semibold text-slate-800" title="Order: Guardrails â†’ Custom models â†’ Modifiers â†’ Merit matrix â†’ Caps. First match wins. Use Priority in the table to reorder within a stage.">
            Policy library
          </h3>
          <p className="text-sm text-slate-600 mt-0.5">
            {policies.length > 0
              ? `${policies.length} polic${policies.length === 1 ? 'y' : 'ies'}. Click a row to edit or duplicate.`
              : 'Start with a recipe from â€œAdd from libraryâ€ or create a new policy.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Common recipes include FMV caps, YOE tier models, and targeted modifiers. Drag the Order handle or use
            Priority to control which rules run first within each stage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSavePackOpen(true)}
            className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            title="Save current as pack (use next year or share)"
            aria-label="Save current as pack"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
          {onNavigateToHelp && (
            <button
              type="button"
              onClick={onNavigateToHelp}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              title="How to build policies"
              aria-label="How to build policies"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={() => setManageTemplatesOpen(true)}
            className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            title="Manage templates"
            aria-label="Manage templates"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </button>
          <div className="relative">
            <button
              ref={addFromLibraryButtonRef}
              type="button"
              onClick={() => setLibraryOpen((o) => !o)}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              title="Add from library"
              aria-label="Add from library"
              aria-expanded={libraryOpen}
              aria-haspopup="true"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.256A8.967 8.967 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.256A8.967 8.967 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
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
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Start from a previous setup</div>
                    {savedPacksList.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">No saved packs yet. Save current as pack to reuse next year.</div>
                    ) : (
                      savedPacksList.map((pack) => (
                        <button
                          key={pack.id}
                          type="button"
                          onClick={() => {
                            setLibraryOpen(false);
                            setLoadPackConfirmId(pack.id);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-indigo-50 text-sm font-medium text-indigo-600 border-b border-slate-100"
                          role="menuitem"
                        >
                          <span className="block">{pack.name}</span>
                          {pack.description && (
                            <span className="text-xs text-slate-500 font-normal line-clamp-2">{pack.description}</span>
                          )}
                        </button>
                      ))
                    )}
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase border-t border-slate-100 mt-1">Add from template</div>
                    {userTemplatesList.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => addFromUserTemplate(t)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 text-sm"
                        role="menuitem"
                      >
                        <span className="font-medium text-slate-800 block">{t.name}</span>
                        <span className="text-slate-500 text-xs line-clamp-2">{t.description}</span>
                        <span className="text-xs text-indigo-600 mt-0.5 inline-block">{t.stage}</span>
                      </button>
                    ))}
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
                <th className="px-2 py-3 text-center text-[11px] font-semibold text-neutral-600 uppercase tracking-wide w-14" title="Drag to reorder. Evaluation order: by stage, then by priority.">Order</th>
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
                    No policies. Click â€œCreate Policyâ€ to create one.
                  </td>
                </tr>
              ) : (
                <>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={verticalClosestRow}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sortedPolicies.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                    {sortedPolicies.map((p) => (
                      <SortablePolicyRow
                        key={p.id}
                        policy={p}
                        orderNum={orderByPolicyId.get(p.id) ?? 0}
                        isSelected={selectedRuleId === p.id}
                        onSelect={() => onSelectRuleId(p.id)}
                        onUpdatePriority={updatePolicyPriority}
                        onDuplicate={duplicatePolicy}
                        onRemove={removePolicy}
                      />
                    ))}
                    </SortableContext>
                    <DragOverlay dropAnimation={null}>
                      {activeDragId ? (() => {
                        const policy = sortedPolicies.find((p) => p.id === activeDragId);
                        const orderNum = policy ? (orderByPolicyId.get(policy.id) ?? 0) : 0;
                        if (!policy) return null;
                        return (
                          <table className="min-w-full border-collapse">
                            <tbody>
                              <tr className="bg-white shadow-lg border border-slate-200 rounded-md opacity-95 cursor-grabbing divide-x divide-slate-100">
                                <td className="px-2 py-1.5 text-center text-sm tabular-nums text-slate-600 rounded-l-md">
                                  <span className="inline-flex rounded p-0.5">
                                    <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                      <path d="M8 6h2v2H8V6zm0 5h2v2H8v-2zm0 5h2v2H8v-2zm5-10h2v2h-2V6zm0 5h2v2h-2v-2zm0 5h2v2h-2v-2z" />
                                    </svg>
                                  </span>
                                  <span className="ml-0.5">{orderNum}</span>
                                </td>
                                <td className="px-2 py-1.5 text-sm font-medium text-slate-800">{policy.name}</td>
                                <td className="px-2 py-1.5 text-sm text-slate-600">{policy.policyType}</td>
                                <td className="px-2 py-1.5 text-sm text-slate-600 max-w-[160px] truncate" title={formatTargetScopeSummary(policy.targetScope)}>
                                  {formatTargetScopeSummary(policy.targetScope)}
                                </td>
                                <td className="px-2 py-1.5 text-sm text-slate-600">
                                  {PRIORITY_OPTIONS.find((o) => (policy.isFallback ? 100 : policy.priority) === o.value)?.label ?? '—'}
                                </td>
                                <td className="px-2 py-1.5 text-sm text-slate-600">{policy.status}</td>
                                <td className="px-2 py-1.5 text-sm text-slate-500">
                                  {policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-2 py-1.5 rounded-r-md" />
                              </tr>
                            </tbody>
                          </table>
                        );
                      })() : null}
                    </DragOverlay>
                  </DndContext>
                </>
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
                onSaveAsTemplate={(policy) => {
                  createUserTemplateFromPolicy(policy);
                  setUserTemplatesRefresh((n) => n + 1);
                  setShowSavedToast(true);
                }}
              />
          </div>
        )}
      </div>

      {savePackOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30"
            aria-modal="true"
            role="dialog"
            onClick={() => {
              setSavePackOpen(false);
              setSavePackName('');
              setSavePackDescription('');
            }}
          >
            <div
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-semibold text-slate-800">Save current as pack</h4>
              <p className="text-sm text-slate-500 mt-0.5">Use next year or share. Saves policies, tier tables, and custom models.</p>
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="pack-name" className="block text-sm font-medium text-slate-700">Pack name</label>
                  <input
                    id="pack-name"
                    type="text"
                    value={savePackName}
                    onChange={(e) => setSavePackName(e.target.value)}
                    placeholder="e.g. FY2025 Final"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="pack-desc" className="block text-sm font-medium text-slate-700">Description (optional)</label>
                  <input
                    id="pack-desc"
                    type="text"
                    value={savePackDescription}
                    onChange={(e) => setSavePackDescription(e.target.value)}
                    placeholder="Brief note for next year"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSavePackOpen(false);
                    setSavePackName('');
                    setSavePackDescription('');
                  }}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePack}
                  disabled={!savePackName.trim()}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Save pack
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {packToLoad &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30" aria-modal="true" role="dialog">
            <div
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-semibold text-slate-800">Load policy pack</h4>
              <p className="text-sm text-slate-600 mt-2">
                Replace current policies with <strong>{packToLoad.name}</strong>? This cannot be undone.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLoadPackConfirmId(null)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPackConfirm(packToLoad.id)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Replace
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {manageTemplatesOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4"
            aria-modal="true"
            role="dialog"
            onClick={() => {
              setManageTemplatesOpen(false);
              setEditingTemplateId(null);
            }}
          >
            <div
              className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h4 className="text-lg font-semibold text-slate-800">Manage templates</h4>
                <button
                  type="button"
                  onClick={() => {
                    setManageTemplatesOpen(false);
                    setEditingTemplateId(null);
                  }}
                  className="p-1 text-slate-500 hover:text-slate-700 rounded"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-auto px-5 py-4 space-y-6">
                <section>
                  <h5 className="text-sm font-semibold text-slate-600 uppercase mb-2">Built-in templates</h5>
                  <p className="text-sm text-slate-500 mb-3">Add a copy to your templates to edit and reuse.</p>
                  <ul className="space-y-2">
                    {POLICY_TEMPLATES.map((t) => (
                      <li
                        key={t.templateKey}
                        className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-slate-800 block">{t.name}</span>
                          <span className="text-xs text-slate-500 line-clamp-1">{t.description}</span>
                          <span className="text-xs text-indigo-600 mt-0.5 inline-block">{t.stage}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const { templateKey: _k, ...policyPayload } = t.policy as typeof t.policy & { templateKey: string };
                            createUserTemplate(t.name, t.description, t.stage, t.policyType, policyPayload);
                            setUserTemplatesRefresh((n) => n + 1);
                          }}
                          className="shrink-0 px-2 py-1 text-xs font-medium rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          Add to my templates
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h5 className="text-sm font-semibold text-slate-600 uppercase mb-2">Your templates</h5>
                  {editingTemplate && (
                    <div className="mb-4 p-4 rounded-lg border border-indigo-200 bg-indigo-50/50 space-y-3">
                      <p className="text-sm font-medium text-slate-700">Edit template</p>
                      <input
                        type="text"
                        value={editTemplateName}
                        onChange={(e) => setEditTemplateName(e.target.value)}
                        placeholder="Name"
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        value={editTemplateDescription}
                        onChange={(e) => setEditTemplateDescription(e.target.value)}
                        placeholder="Description"
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      />
                      <select
                        value={editTemplateStage}
                        onChange={(e) => setEditTemplateStage(e.target.value as AnnualIncreasePolicy['stage'])}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        {POLICY_STAGE_ORDER.map((stage) => (
                          <option key={stage} value={stage}>
                            {POLICY_STAGE_LABELS[stage]}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            updateUserTemplate(editingTemplate.id, {
                              name: editTemplateName.trim(),
                              description: editTemplateDescription.trim(),
                              stage: editTemplateStage,
                            });
                            setEditingTemplateId(null);
                            setUserTemplatesRefresh((n) => n + 1);
                          }}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTemplateId(null)}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {userTemplatesList.length === 0 ? (
                    <p className="text-sm text-slate-500 py-2">No custom templates yet. Add a built-in above or save a policy as template from the editor.</p>
                  ) : (
                    <ul className="space-y-2">
                      {userTemplatesList.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-slate-800 block">{t.name}</span>
                            <span className="text-xs text-slate-500 line-clamp-1">{t.description}</span>
                            <span className="text-xs text-indigo-600 mt-0.5 inline-block">{t.stage}</span>
                          </div>
                          <div className="shrink-0 flex gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingTemplateId(t.id)}
                              className="px-2 py-1 text-xs font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete template "${t.name}"?`)) {
                                  deleteUserTemplate(t.id);
                                  setUserTemplatesRefresh((n) => n + 1);
                                  if (editingTemplateId === t.id) setEditingTemplateId(null);
                                }
                              }}
                              className="px-2 py-1 text-xs font-medium rounded border border-red-200 text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          </div>,
          document.body
        )}

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

