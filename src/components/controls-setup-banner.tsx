import type { ControlsReadinessItem } from '../lib/controls-readiness';
import { controlsReadinessProgress } from '../lib/controls-readiness';

interface ControlsSetupBannerProps {
  items: ControlsReadinessItem[];
  onGoToItem: (item: ControlsReadinessItem) => void;
}

export function ControlsSetupBanner({ items, onGoToItem }: ControlsSetupBannerProps) {
  const { complete, total } = controlsReadinessProgress(items);
  if (complete >= total) return null;

  const next = items.find((item) => !item.ready);
  if (!next) return null;

  return (
    <div className="mb-4 rounded-xl border border-indigo-200/80 bg-indigo-50/40 px-4 py-3">
      <p className="text-sm font-semibold text-indigo-900">
        Merit setup {complete}/{total} — finish configuration before running merit review
      </p>
      <p className="mt-1 text-sm text-slate-700">
        Next: <span className="font-medium">{next.label}</span> — {next.detail}
      </p>
      <button
        type="button"
        onClick={() => onGoToItem(next)}
        className="mt-2 text-sm font-semibold text-indigo-800 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
      >
        Go to {next.label}
      </button>
    </div>
  );
}
