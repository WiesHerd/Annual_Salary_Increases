import { useEffect, useState } from 'react';
import { subscribeStorageWriteErrors, type StorageWriteErrorDetail } from '../lib/safe-local-storage';

/**
 * Dismissible banner when localStorage/sessionStorage writes fail (quota, private mode, etc.).
 */
export function StorageFailureBanner() {
  const [alerts, setAlerts] = useState<StorageWriteErrorDetail[]>([]);

  useEffect(() => {
    return subscribeStorageWriteErrors((detail) => {
      setAlerts((prev) => {
        if (prev.some((p) => p.message === detail.message && p.storage === detail.storage)) return prev;
        return [...prev, detail];
      });
    });
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] flex flex-col gap-2 p-3 pointer-events-none">
      {alerts.map((a, i) => (
        <div
          key={`${a.storage}-${i}-${a.message.slice(0, 24)}`}
          className="pointer-events-auto mx-auto flex max-w-3xl items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg"
          role="alert"
        >
          <span className="mt-0.5 shrink-0 font-semibold">{a.storage === 'local' ? 'Save failed' : 'Session save failed'}</span>
          <p className="flex-1 text-amber-900">{a.message}</p>
          <button
            type="button"
            className="shrink-0 rounded border border-amber-400 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
            onClick={() => setAlerts((prev) => prev.filter((_, idx) => idx !== i))}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
