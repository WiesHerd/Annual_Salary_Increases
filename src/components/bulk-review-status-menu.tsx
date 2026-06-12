/**
 * Bulk status change for visible merit review providers.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ReviewStatus, getReviewStatusShortLabel } from '../types/enums';
import { cn } from '../lib/utils';

const BULK_STATUS_OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: ReviewStatus.InReview, label: getReviewStatusShortLabel(ReviewStatus.InReview) },
  { value: ReviewStatus.Approved, label: getReviewStatusShortLabel(ReviewStatus.Approved) },
  { value: ReviewStatus.Deferred, label: getReviewStatusShortLabel(ReviewStatus.Deferred) },
  { value: ReviewStatus.Draft, label: getReviewStatusShortLabel(ReviewStatus.Draft) },
];

export interface BulkReviewStatusMenuProps {
  filteredCount: number;
  disabled?: boolean;
  onApplyStatus: (status: ReviewStatus) => void;
  className?: string;
}

export function BulkReviewStatusMenu({
  filteredCount,
  disabled = false,
  onApplyStatus,
  className,
}: BulkReviewStatusMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, []);

  if (filteredCount === 0) return null;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
          disabled
            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        )}
        title={`Set review status for ${filteredCount} visible provider${filteredCount !== 1 ? 's' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Set status
        <ChevronDown className="h-4 w-4 opacity-60" aria-hidden />
      </button>
      {open && !disabled && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          {BULK_STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onApplyStatus(value);
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-900"
            >
              Mark as {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
