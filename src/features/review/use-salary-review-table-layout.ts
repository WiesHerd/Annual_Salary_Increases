/**
 * Column layout, presets, drag-reorder, and resize for the merit review grid.
 * Persists to localStorage via review-table-storage.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  REVIEW_TABLE_COLUMNS,
  REVIEW_VIEW_PRESETS,
  DEFAULT_PRESET_LABELS,
  DEFAULT_PRESET_ORDER,
  getDefaultColumnWidths,
  type ReviewTableColumnId,
  type ReviewViewPresetId,
  type SavedCustomView,
} from './review-table-columns';
import { loadReviewTableFromStorage, saveReviewTableToStorage } from '../../lib/review-table-storage';

export function useSalaryReviewTableLayout() {
  const [reviewTableState, setReviewTableState] = useState(loadReviewTableFromStorage);
  const visibleColumnIds = reviewTableState.visibleColumnIds;
  const activePreset = reviewTableState.preset;
  const savedCustomViews = reviewTableState.savedCustomViews ?? [];
  const activeCustomViewId = reviewTableState.activeCustomViewId ?? null;
  const columnWidths = reviewTableState.columnWidths ?? getDefaultColumnWidths();
  const frozenColumnIds = reviewTableState.frozenColumnIds ?? ['compareCheckbox', 'providerName'];
  const presetLabels = reviewTableState.presetLabels ?? {};
  const presetOrder = reviewTableState.presetOrder ?? [...DEFAULT_PRESET_ORDER];

  const [customViewDropdownOpen, setCustomViewDropdownOpen] = useState(false);
  const [columnDropdownOpen, setColumnDropdownOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [showLayoutOptions, setShowLayoutOptions] = useState(false);
  const [presetLabelsModalOpen, setPresetLabelsModalOpen] = useState(false);
  const [draftPresetLabels, setDraftPresetLabels] = useState<Record<ReviewViewPresetId, string>>({
    ...DEFAULT_PRESET_LABELS,
  });
  const [draftPresetOrder, setDraftPresetOrder] = useState<ReviewViewPresetId[]>([...DEFAULT_PRESET_ORDER]);

  const [draggingColumnIndex, setDraggingColumnIndex] = useState<number | null>(null);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState<number | null>(null);
  const [resizingColumnIndex, setResizingColumnIndex] = useState<number | null>(null);
  const resizeRef = useRef<{ columnId: ReviewTableColumnId; startX: number; startWidth: number } | null>(null);
  const saveViewNameInputRef = useRef<HTMLInputElement>(null);

  const orderedColumnIds = useMemo((): ReviewTableColumnId[] => {
    const frozenOrdered = frozenColumnIds.filter((id) => visibleColumnIds.includes(id));
    const rest = visibleColumnIds.filter((id) => !frozenColumnIds.includes(id));
    const order: ReviewTableColumnId[] = [...frozenOrdered, ...rest];
    if (visibleColumnIds.includes('compareCheckbox') && order[0] !== 'compareCheckbox') {
      return ['compareCheckbox', ...order.filter((id) => id !== 'compareCheckbox')];
    }
    return order;
  }, [visibleColumnIds, frozenColumnIds]);

  const visibleColumns = useMemo(
    () =>
      orderedColumnIds
        .map((id) => REVIEW_TABLE_COLUMNS.find((c) => c.id === id))
        .filter((c): c is (typeof REVIEW_TABLE_COLUMNS)[number] => c != null),
    [orderedColumnIds]
  );

  const totalTableWidthPx = useMemo(
    () => visibleColumns.reduce((sum, col) => sum + (columnWidths[col.id] ?? 128), 0),
    [visibleColumns, columnWidths]
  );

  const frozenLeftOffsets = useMemo(() => {
    const offsets: number[] = [];
    let sum = 0;
    for (let i = 0; i < orderedColumnIds.length; i++) {
      const colId = orderedColumnIds[i];
      offsets[i] = sum;
      if (frozenColumnIds.includes(colId)) {
        sum += columnWidths[colId] ?? 128;
      }
    }
    return offsets;
  }, [orderedColumnIds, frozenColumnIds, columnWidths]);

  const isFrozenColumn = useCallback(
    (colIndex: number) => {
      const id = orderedColumnIds[colIndex];
      return id != null && frozenColumnIds.includes(id);
    },
    [orderedColumnIds, frozenColumnIds]
  );

  useEffect(() => {
    saveReviewTableToStorage(reviewTableState);
  }, [reviewTableState]);

  useEffect(() => {
    if (saveViewOpen) {
      queueMicrotask(() => saveViewNameInputRef.current?.focus());
    }
  }, [saveViewOpen]);

  useEffect(() => {
    if (!customViewDropdownOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCustomDropdown();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [customViewDropdownOpen]);

  useEffect(() => {
    if (presetLabelsModalOpen) {
      setDraftPresetLabels({ ...DEFAULT_PRESET_LABELS, ...(reviewTableState.presetLabels ?? {}) });
      setDraftPresetOrder([...(reviewTableState.presetOrder ?? DEFAULT_PRESET_ORDER)]);
    }
  }, [presetLabelsModalOpen, reviewTableState.presetLabels, reviewTableState.presetOrder]);

  const closeCustomDropdown = useCallback(() => {
    setCustomViewDropdownOpen(false);
    setSaveViewOpen(false);
    setSaveViewName('');
  }, []);

  const openCustomDropdown = useCallback(() => {
    setReviewTableState((prev) => {
      if (prev.preset === 'custom') return prev;
      const presetIds = REVIEW_VIEW_PRESETS[prev.preset as ReviewViewPresetId];
      return {
        ...prev,
        preset: 'custom',
        activeCustomViewId: null,
        visibleColumnIds: presetIds ? [...presetIds] : prev.visibleColumnIds,
      };
    });
    setCustomViewDropdownOpen(true);
  }, []);

  const applyPreset = useCallback((presetId: ReviewViewPresetId) => {
    setReviewTableState((prev) => ({
      ...prev,
      visibleColumnIds: [...REVIEW_VIEW_PRESETS[presetId]],
      preset: presetId,
      activeCustomViewId: null,
    }));
  }, []);

  const applySavedCustomView = useCallback((view: SavedCustomView) => {
    setReviewTableState((prev) => ({
      ...prev,
      visibleColumnIds: [...view.columnIds],
      preset: 'custom',
      activeCustomViewId: view.id,
    }));
    setCustomViewDropdownOpen(false);
  }, []);

  const addSavedCustomView = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || visibleColumnIds.length === 0) return;
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `view-${Date.now()}`;
      const newView: SavedCustomView = { id, name: trimmed, columnIds: [...visibleColumnIds] };
      setReviewTableState((prev) => {
        const nextViews = [...(prev.savedCustomViews ?? []), newView].slice(-10);
        return {
          ...prev,
          savedCustomViews: nextViews,
          visibleColumnIds: newView.columnIds,
          preset: 'custom',
          activeCustomViewId: id,
        };
      });
      setSaveViewName('');
      setSaveViewOpen(false);
      setCustomViewDropdownOpen(false);
    },
    [visibleColumnIds]
  );

  const removeSavedCustomView = useCallback((id: string) => {
    setReviewTableState((prev) => {
      const nextViews = (prev.savedCustomViews ?? []).filter((v) => v.id !== id);
      return {
        ...prev,
        savedCustomViews: nextViews,
        activeCustomViewId: prev.activeCustomViewId === id ? null : prev.activeCustomViewId,
      };
    });
  }, []);

  const selectCurrentSelection = useCallback(() => {
    setReviewTableState((prev) => ({ ...prev, preset: 'custom', activeCustomViewId: null }));
    setCustomViewDropdownOpen(false);
  }, []);

  const toggleColumn = useCallback((id: ReviewTableColumnId) => {
    setReviewTableState((prev) => {
      const nextVisible = prev.visibleColumnIds.includes(id)
        ? prev.visibleColumnIds.filter((x) => x !== id)
        : [...prev.visibleColumnIds, id];
      const nextFrozen = (prev.frozenColumnIds ?? []).filter((fid) => nextVisible.includes(fid));
      return { ...prev, visibleColumnIds: nextVisible, frozenColumnIds: nextFrozen, preset: 'custom' };
    });
  }, []);

  const setColumnWidth = useCallback((columnId: ReviewTableColumnId, widthPx: number) => {
    const clamped = Math.max(80, Math.min(400, widthPx));
    setReviewTableState((prev) => ({
      ...prev,
      columnWidths: { ...(prev.columnWidths ?? getDefaultColumnWidths()), [columnId]: clamped },
    }));
  }, []);

  const resetColumnWidths = useCallback(() => {
    setReviewTableState((prev) => ({
      ...prev,
      columnWidths: getDefaultColumnWidths(),
    }));
  }, []);

  const toggleFrozenColumn = useCallback((id: ReviewTableColumnId) => {
    setReviewTableState((prev) => ({
      ...prev,
      frozenColumnIds: (prev.frozenColumnIds ?? ['providerName']).includes(id)
        ? (prev.frozenColumnIds ?? []).filter((x) => x !== id)
        : [...(prev.frozenColumnIds ?? []), id],
      preset: 'custom',
    }));
  }, []);

  const savePresetLabels = useCallback(() => {
    const labelsToSave: Partial<Record<ReviewViewPresetId, string>> = {};
    for (const id of DEFAULT_PRESET_ORDER) {
      const v = draftPresetLabels[id]?.trim();
      if (v && v !== DEFAULT_PRESET_LABELS[id]) labelsToSave[id] = v;
    }
    setReviewTableState((prev) => ({
      ...prev,
      presetLabels: labelsToSave,
      presetOrder: [...draftPresetOrder],
    }));
    setPresetLabelsModalOpen(false);
  }, [draftPresetLabels, draftPresetOrder]);

  const handleResizeStart = useCallback(
    (colIndex: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const col = visibleColumns[colIndex];
      if (!col) return;
      setResizingColumnIndex(colIndex);
      resizeRef.current = {
        columnId: col.id,
        startX: e.clientX,
        startWidth: columnWidths[col.id] ?? 128,
      };
    },
    [visibleColumns, columnWidths]
  );

  useEffect(() => {
    if (resizingColumnIndex == null) return;
    const onMove = (e: MouseEvent) => {
      const ref = resizeRef.current;
      if (!ref) return;
      const delta = e.clientX - ref.startX;
      setColumnWidth(ref.columnId, ref.startWidth + delta);
    };
    const onUp = () => {
      resizeRef.current = null;
      setResizingColumnIndex(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizingColumnIndex, setColumnWidth]);

  const moveColumn = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setReviewTableState((prev) => {
      const ordered = [
        ...(prev.frozenColumnIds ?? []).filter((id) => prev.visibleColumnIds.includes(id)),
        ...prev.visibleColumnIds.filter((id) => !(prev.frozenColumnIds ?? []).includes(id)),
      ];
      const next = [...ordered];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return { ...prev, visibleColumnIds: next };
    });
    setDraggingColumnIndex(null);
    setDragOverColumnIndex(null);
  }, []);

  const handleHeaderDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggingColumnIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
  };

  const handleHeaderDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumnIndex(index);
  };

  const handleHeaderDragLeave = () => {
    setDragOverColumnIndex(null);
  };

  const handleHeaderDrop = (toIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = draggingColumnIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (Number.isNaN(fromIndex)) return;
    moveColumn(fromIndex, toIndex);
    setDragOverColumnIndex(null);
  };

  const handleHeaderDragEnd = () => {
    setDraggingColumnIndex(null);
    setDragOverColumnIndex(null);
  };

  return {
    visibleColumnIds,
    activePreset,
    savedCustomViews,
    activeCustomViewId,
    columnWidths,
    frozenColumnIds,
    presetLabels,
    presetOrder,
    customViewDropdownOpen,
    setCustomViewDropdownOpen,
    columnDropdownOpen,
    setColumnDropdownOpen,
    saveViewName,
    setSaveViewName,
    saveViewOpen,
    setSaveViewOpen,
    showLayoutOptions,
    setShowLayoutOptions,
    presetLabelsModalOpen,
    setPresetLabelsModalOpen,
    draftPresetLabels,
    setDraftPresetLabels,
    draftPresetOrder,
    setDraftPresetOrder,
    saveViewNameInputRef,
    draggingColumnIndex,
    dragOverColumnIndex,
    resizingColumnIndex,
    visibleColumns,
    totalTableWidthPx,
    frozenLeftOffsets,
    isFrozenColumn,
    closeCustomDropdown,
    openCustomDropdown,
    applyPreset,
    applySavedCustomView,
    addSavedCustomView,
    removeSavedCustomView,
    selectCurrentSelection,
    toggleColumn,
    toggleFrozenColumn,
    resetColumnWidths,
    savePresetLabels,
    handleResizeStart,
    handleHeaderDragStart,
    handleHeaderDragOver,
    handleHeaderDragLeave,
    handleHeaderDrop,
    handleHeaderDragEnd,
  };
}

export type SalaryReviewTableLayout = ReturnType<typeof useSalaryReviewTableLayout>;
