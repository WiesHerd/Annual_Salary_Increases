import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  action?: ToastAction;
}

interface ToastItem extends ToastOptions {
  id: string;
  createdAt: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; iconClass: string; accentClass: string }
> = {
  default: {
    icon: Info,
    iconClass: 'text-indigo-600',
    accentClass: 'bg-indigo-500',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    accentClass: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-rose-600',
    accentClass: 'bg-rose-500',
  },
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [isLeaving, setIsLeaving] = useState(false);
  const dismissTimerRef = useRef<number | null>(null);
  const variant = item.variant ?? 'default';
  const styles = VARIANT_STYLES[variant];
  const Icon = styles.icon;
  const durationMs = item.durationMs ?? (item.action ? 12_000 : 4200);

  const dismiss = useCallback(() => {
    if (isLeaving) return;
    setIsLeaving(true);
    window.setTimeout(() => onDismiss(item.id), 220);
  }, [isLeaving, item.id, onDismiss]);

  useEffect(() => {
    dismissTimerRef.current = window.setTimeout(dismiss, durationMs);
    return () => {
      if (dismissTimerRef.current != null) window.clearTimeout(dismissTimerRef.current);
    };
  }, [dismiss, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.28)] backdrop-blur-md',
        'transition-all duration-200 ease-out',
        isLeaving
          ? 'translate-x-3 opacity-0'
          : 'animate-in slide-in-from-right-4 fade-in zoom-in-95 duration-300'
      )}
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        <div className={cn('mt-0.5 shrink-0', styles.iconClass)}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
          {item.description ? (
            <p className="mt-1 text-sm leading-snug text-slate-600">{item.description}</p>
          ) : null}
          {item.action ? (
            <button
              type="button"
              onClick={() => {
                item.action?.onClick();
                dismiss();
              }}
              className="mt-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {item.action.label}
            </button>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="h-0.5 w-full bg-slate-100">
        <div
          className={cn('h-full origin-left', styles.accentClass)}
          style={{
            animation: `toast-progress ${durationMs}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (typeof document === 'undefined' || toasts.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[min(100vw-2rem,24rem)] flex-col gap-2.5"
      aria-label="Notifications"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev.slice(-4), { ...options, id, createdAt: Date.now() }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
