# Agents

## Cursor Cloud specific instructions

### Overview

Meritly is a client-side-only React SPA for physician compensation review. No backend, no database — all data lives in browser `localStorage`. The only service to run is the Vite dev server.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (port 5173) |
| Type check | `npx tsc -b` |
| Tests | `npm run test` (vitest, 103 tests across 7 files) |
| Build | `npm run build` (tsc + vite build) |

### Caveats

- The `main` branch contains only a README. The actual codebase lives on `master`; any working branch must merge from `origin/master --allow-unrelated-histories` if it was created from `main`.
- There is no ESLint config; the only lint-like check is `tsc -b`.
- The `vite.config.ts` does not include path alias resolution (the `@/*` alias in `tsconfig.json` is only used by the TS compiler, not by Vite). If you add imports using `@/`, add `resolve.alias` to `vite.config.ts`.
- No git hooks (husky/lint-staged/pre-commit) are configured.
- The app uses hash-based routing (`window.location.hash`), so all navigation happens on the client side.
