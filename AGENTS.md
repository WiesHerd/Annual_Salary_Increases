# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**Meritly** is a client-side-only SPA for annual provider/physician compensation review and planning. There is **no backend** — all data lives in browser `localStorage`. The tech stack is React 18 + TypeScript + Vite + Tailwind CSS.

### Running the app

- `npm run dev` — starts the Vite dev server on port 5173.
- `npm run build` — runs `tsc -b && vite build` to type-check and produce a production build in `dist/`.
- `npm run test` — runs all Vitest unit tests (currently 103 tests across 7 files).

### Key caveats

- The `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` packages are used in `src/features/parameters/tabs/policy-engine-rules-tab.tsx` but were missing from the original `package.json`. They have been added to `package.json` and `package-lock.json` via `npm install`. If this PR is not merged, running `npm install` alone will miss them and cause build/runtime errors for the policy-engine drag-and-drop feature.
- The codebase has **no ESLint config** — there is no lint command. Type-checking via `tsc -b` serves as the primary static analysis.
- Sample data files are in `public/` (e.g. `sample-providers.csv`, `sample-market.csv`). The app may auto-load data from `localStorage` if a previous session populated it.
- The `master` branch contains the actual codebase; `main` only has the initial commit with a README. Development branches should be based on `master` content.
