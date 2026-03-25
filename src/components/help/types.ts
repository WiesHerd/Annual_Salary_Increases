import type { ReactNode } from 'react';

export type HelpSection = {
  /** Stable DOM id for scroll targets and scroll-spy (unique on the page). */
  id: string;
  title: string;
  /** Section body */
  content: ReactNode;
};
