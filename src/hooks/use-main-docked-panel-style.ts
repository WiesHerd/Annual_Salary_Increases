import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';

/** Fixed panel width — keep article `padding-right` ≥ this plus a gap so text does not sit under the TOC. */
export const MAIN_DOCKED_TOC_WIDTH_PX = 216;

/** `padding-right` on wide screens: TOC width + gap to the panel. */
export const mainDockedTocArticlePaddingClass = 'lg:pr-[248px]';

type Options = {
  /** Extra offset below the top of `main` (e.g. global fixed header height). */
  extraTopInsetPx?: number;
};

/**
 * Positions a panel `fixed` to the right inside the app `<main>` scroll area.
 * Use when `main` is `overflow-auto` (sticky is unreliable vs. the viewport).
 */
export function useMainDockedPanelStyle(options: Options = {}) {
  const { extraTopInsetPx = 0 } = options;
  const [isLg, setIsLg] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsLg(mq.matches);
    const onChange = () => setIsLg(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useLayoutEffect(() => {
    if (!isLg) {
      setStyle({});
      return;
    }

    const main = document.querySelector('main');
    if (!(main instanceof HTMLElement)) {
      setStyle({});
      return;
    }

    const pad = 16;
    const update = () => {
      const r = main.getBoundingClientRect();
      const panelHeight = Math.max(160, r.height - pad * 2 - extraTopInsetPx);
      setStyle({
        position: 'fixed',
        top: Math.max(pad, r.top + pad + extraTopInsetPx),
        right: Math.max(pad, window.innerWidth - r.right + pad),
        width: MAIN_DOCKED_TOC_WIDTH_PX,
        height: panelHeight,
        maxHeight: panelHeight,
        zIndex: 25,
        overflowY: 'auto',
        boxSizing: 'border-box',
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(main);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [isLg, extraTopInsetPx]);

  return { dockedStyle: style, isLg };
}
