import type { HelpSection } from './types';

/** Example data for demos or Storybook-style usage of `HelpPage`. */
export const SAMPLE_HELP_SECTIONS: HelpSection[] = [
  {
    id: 'sample-intro',
    title: 'Introduction',
    content: (
      <p>
        This is sample content for a reusable help layout. Each section uses a stable <code className="rounded bg-slate-100 px-1">id</code>{' '}
        for scrolling and scroll-spy highlighting.
      </p>
    ),
  },
  {
    id: 'sample-getting-started',
    title: 'Getting started',
    content: (
      <>
        <p>Steps you might document here:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Import your data</li>
          <li>Configure parameters</li>
          <li>Run a review or comparison</li>
        </ol>
      </>
    ),
  },
  {
    id: 'sample-faq',
    title: 'FAQ',
    content: (
      <p>
        Long pages benefit from a sticky table of contents: <strong>position: sticky</strong> pins the nav while its
        column is on screen, then it scrolls away with the help container so it never floats over unrelated UI.
      </p>
    ),
  },
];
