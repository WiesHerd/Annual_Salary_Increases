import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export interface StepContextHelpContent {
  title: string;
  summary: string;
  bullets?: string[];
  example?: string;
}

interface StepContextHelpProps {
  content: StepContextHelpContent;
  className?: string;
  /** Horizontal alignment of the popover relative to the (i) button. */
  popoverAlign?: 'start' | 'center' | 'end';
}

const PANEL_WIDTH = 288; // 18rem

function computePanelPosition(
  buttonRect: DOMRect,
  align: 'start' | 'center' | 'end'
): { top: number; left: number } {
  const margin = 12;
  const gap = 6;
  let left = buttonRect.left;
  if (align === 'center') left = buttonRect.left + buttonRect.width / 2 - PANEL_WIDTH / 2;
  if (align === 'end') left = buttonRect.right - PANEL_WIDTH;

  left = Math.max(margin, Math.min(left, window.innerWidth - PANEL_WIDTH - margin));
  return { top: buttonRect.bottom + gap, left };
}

/** Compact (i) popover — step guidance without cluttering the form. */
export function StepContextHelp({ content, className = '', popoverAlign = 'end' }: StepContextHelpProps) {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);

  const updatePanelPosition = useCallback(() => {
    if (!buttonRef.current) return;
    setPanelPos(computePanelPosition(buttonRef.current.getBoundingClientRect(), popoverAlign));
  }, [popoverAlign]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      close();
    };
    const onReposition = () => updatePanelPosition();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, close, updatePanelPosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${className}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Help for ${content.title}`}
        title="What to do on this step"
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>
      {open &&
        panelPos &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={content.title}
            style={{ top: panelPos.top, left: panelPos.left, width: PANEL_WIDTH }}
            className="fixed z-[200] rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg shadow-slate-900/10"
          >
            <p className="text-sm font-semibold text-slate-900">{content.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{content.summary}</p>
            {content.bullets && content.bullets.length > 0 && (
              <ul className="mt-2.5 space-y-1.5 text-xs leading-snug text-slate-600">
                {content.bullets.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
            {content.example && (
              <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] leading-snug text-slate-500">
                <span className="font-medium text-slate-600">Example: </span>
                {content.example}
              </p>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
