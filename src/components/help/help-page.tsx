import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { mainDockedTocArticlePaddingClass, useMainDockedPanelStyle } from '../../hooks/use-main-docked-panel-style';
import { TableOfContents } from './table-of-contents';
import type { HelpSection } from './types';
import { useTocScrollSpy } from './use-toc-scroll-spy';

export type HelpPageProps = {
  /** Page title */
  title: string;
  /** Intro under the title */
  description?: ReactNode;
  sections: HelpSection[];
  /**
   * Height of any fixed global header in px. Used for:
   * - `scroll-margin-top` on sections (scroll targets clear the bar)
   * - docked TOC vertical offset + IntersectionObserver rootMargin (scroll-spy)
   */
  headerOffsetPx?: number;
  /** Accessible label for the in-page nav */
  tocNavLabel?: string;
  className?: string;
  /** Optional footer at the end of the article column */
  footer?: ReactNode;
};

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Help layout with article column + desktop TOC docked with `position: fixed` to the app `<main>`
 * rectangle (Meritly scrolls inside `main`, so pure CSS sticky is unreliable).
 */
export function HelpPage({
  title,
  description,
  sections,
  headerOffsetPx = 0,
  tocNavLabel = 'On this page',
  className = '',
  footer,
}: HelpPageProps) {
  const mobileTocRef = useRef<HTMLDetailsElement>(null);
  const { dockedStyle, isLg } = useMainDockedPanelStyle({ extraTopInsetPx: headerOffsetPx });

  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);
  const activeId = useTocScrollSpy(sectionIds, { headerOffsetPx });

  const scrollMarginTopPx = headerOffsetPx > 0 ? headerOffsetPx + 8 : undefined;

  const handleNavigate = useCallback((id: string) => {
    scrollToSection(id);
  }, []);

  const tocItems = sections.map(({ id, title: t }) => ({ id, title: t }));

  return (
    <div className={`relative w-full flex flex-col ${className}`}>
      <div className={`min-w-0 w-full ${mainDockedTocArticlePaddingClass}`}>
        <div className="sticky top-4 z-30 mb-6 bg-[#f8fafc]/95 pb-2 pt-1 backdrop-blur-sm lg:static lg:z-auto lg:mb-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <details
            ref={mobileTocRef}
            className="group rounded-xl border-2 border-slate-800/90 bg-white shadow-md lg:hidden open:shadow-lg"
          >
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                {tocNavLabel}
                <svg
                  className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <div className="border-t border-slate-200 px-4 py-3">
              <TableOfContents
                items={tocItems}
                activeId={activeId}
                onNavigate={handleNavigate}
                label={tocNavLabel}
                onAfterNavigate={() => mobileTocRef.current?.removeAttribute('open')}
              />
            </div>
          </details>
        </div>

        <header className="mb-10 border-l-4 border-indigo-600 pl-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {description != null && <div className="mt-2 text-sm leading-relaxed text-slate-700">{description}</div>}
        </header>

        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="mb-10 scroll-mt-8"
            style={{ scrollMarginTop: scrollMarginTopPx }}
            aria-labelledby={`${section.id}-heading`}
          >
            <h2
              id={`${section.id}-heading`}
              className="mb-4 border-b-2 border-slate-900/90 pb-2 text-lg font-bold tracking-tight text-slate-900"
            >
              {section.title}
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-800">{section.content}</div>
          </section>
        ))}

        {footer != null && <footer className="mt-12 border-t border-slate-200 pt-8 text-sm text-slate-600">{footer}</footer>}
      </div>

      {isLg && dockedStyle.position === 'fixed' ? (
        <div
          role="complementary"
          className="border-l border-slate-200 bg-[#f8fafc]/98 pl-4 pr-1 backdrop-blur-sm"
          style={dockedStyle}
          aria-label={`${tocNavLabel} sidebar`}
        >
          <TableOfContents
            items={tocItems}
            activeId={activeId}
            onNavigate={handleNavigate}
            label={tocNavLabel}
          />
        </div>
      ) : null}
    </div>
  );
}
