/**
 * Accessible modal overlay: Escape to close, focus trap, backdrop click.
 */

import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Applied to the centered panel */
  panelClassName?: string;
  /** Applied to the full-screen overlay */
  overlayClassName?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

const DEFAULT_OVERLAY =
  'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40';

export function ModalShell({
  open,
  onClose,
  children,
  panelClassName = 'bg-white rounded-2xl shadow-xl max-w-md w-full',
  overlayClassName = DEFAULT_OVERLAY,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
}: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const resolvedLabelledby = ariaLabelledby ?? (ariaLabel ? undefined : titleId);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;

    const frame = requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? panelRef.current)?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={overlayClassName}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={resolvedLabelledby}
        aria-describedby={ariaDescribedby}
        tabIndex={-1}
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
