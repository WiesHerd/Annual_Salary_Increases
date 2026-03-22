/**
 * Wrapped localStorage/sessionStorage writes so quota and privacy-mode failures
 * can surface in the UI via subscribeStorageWriteErrors.
 */

export type StorageWriteErrorDetail = {
  message: string;
  key?: string;
  storage: 'local' | 'session';
};

type StorageWriteListener = (detail: StorageWriteErrorDetail) => void;

const listeners = new Set<StorageWriteListener>();

export function subscribeStorageWriteErrors(listener: StorageWriteListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(detail: StorageWriteErrorDetail): void {
  listeners.forEach((fn) => {
    try {
      fn(detail);
    } catch {
      // ignore listener errors
    }
  });
}

function failureMessage(err: unknown, storage: 'local' | 'session'): string {
  const isQuota =
    (typeof DOMException !== 'undefined' &&
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.code === 22)) ||
    (err instanceof Error && /quota/i.test(err.message));
  if (isQuota) {
    return storage === 'local'
      ? 'Browser storage is full. Export your data and free disk space, or clear site data for this app. Recent changes may not have been saved.'
      : 'Session storage failed (often full or blocked). Some UI preferences may not persist.';
  }
  return storage === 'local'
    ? 'Could not save to browser storage. Your changes may be lost after closing this tab.'
    : 'Could not save session data.';
}

export function safeLocalStorageSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    notify({ message: failureMessage(e, 'local'), key, storage: 'local' });
    return false;
  }
}

export function safeSessionStorageSetItem(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (e) {
    notify({ message: failureMessage(e, 'session'), key, storage: 'session' });
    return false;
  }
}
