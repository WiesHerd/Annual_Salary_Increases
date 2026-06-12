/**
 * Debounced trigger for pushing localStorage workspace to Supabase.
 */

const DEBOUNCE_MS = 4000;
let timer: number | null = null;
let paused = false;

export function pauseCloudSync(): void {
  paused = true;
  if (timer != null) {
    window.clearTimeout(timer);
    timer = null;
  }
}

export function resumeCloudSync(): void {
  paused = false;
}

export function scheduleCloudSync(): void {
  if (paused || typeof window === 'undefined') return;
  if (timer != null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    window.dispatchEvent(new CustomEvent('meritly-cloud-sync'));
  }, DEBOUNCE_MS);
}
