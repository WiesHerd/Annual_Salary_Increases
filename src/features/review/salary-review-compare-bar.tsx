/**
 * Floating action bar when providers are selected for compare on merit review.
 */

interface SalaryReviewCompareBarProps {
  selectedCount: number;
  selectedNames: string[];
  onCompare: () => void;
  onClear: () => void;
}

export function SalaryReviewCompareBar({
  selectedCount,
  selectedNames,
  onCompare,
  onClear,
}: SalaryReviewCompareBarProps) {
  if (selectedCount === 0) return null;

  const preview =
    selectedNames.length <= 2
      ? selectedNames.join(', ')
      : `${selectedNames.slice(0, 2).join(', ')} +${selectedNames.length - 2} more`;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[60] flex w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-indigo-200/80 bg-white/95 px-4 py-3 shadow-xl shadow-indigo-500/10 backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-800">
        {selectedCount}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">
          {selectedCount} provider{selectedCount !== 1 ? 's' : ''} selected
        </p>
        <p className="truncate text-xs text-slate-500" title={selectedNames.join(', ')}>
          {preview}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onClear} className="app-btn-ghost text-slate-600">
          Clear
        </button>
        <button
          type="button"
          onClick={onCompare}
          disabled={selectedCount < 2}
          className={
            selectedCount >= 2
              ? 'app-btn-primary'
              : 'app-btn-primary opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-md'
          }
          title={selectedCount < 2 ? 'Select at least 2 providers to compare' : 'Open compare view'}
        >
          Compare
        </button>
      </div>
    </div>
  );
}
