import { useEffect, useState } from 'react';

export type UseTocScrollSpyOptions = {
  /**
   * Scroll container for IntersectionObserver.
   * - `undefined` — use `document.querySelector('main')` if present (common app-shell pattern), else viewport.
   * - `null` — viewport.
   * - `Element` — that element (e.g. ref to a scrollable panel).
   */
  root?: Element | null;
  /** Fixed header height in px — shifts the observer’s “active” band below the navbar. */
  headerOffsetPx?: number;
};

function resolveScrollRoot(explicit: Element | null | undefined): Element | null {
  if (explicit === null) return null;
  if (explicit instanceof Element) return explicit;
  const main = document.querySelector('main');
  return main instanceof HTMLElement ? main : null;
}

/**
 * Tracks which section id is currently “in view” using IntersectionObserver (no scroll listeners).
 * rootMargin is derived from `headerOffsetPx` so the active item updates when a heading enters
 * the readable region below a fixed header.
 */
export function useTocScrollSpy(sectionIds: string[], options: UseTocScrollSpyOptions = {}) {
  const { root: rootOption, headerOffsetPx = 0 } = options;
  const [activeId, setActiveId] = useState<string>(sectionIds[0] ?? '');

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const root = resolveScrollRoot(rootOption);
    const topInset = `-${headerOffsetPx}px`;
    const bottomInset = '-50%';

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0].target.id;
        if (id) setActiveId(id);
      },
      {
        root,
        rootMargin: `${topInset} 0px ${bottomInset} 0px`,
        threshold: [0, 0.08, 0.2],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds.join(','), rootOption, headerOffsetPx]);

  return activeId;
}
