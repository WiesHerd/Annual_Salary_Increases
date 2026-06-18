# AGENTS.md

## Cursor Cloud specific instructions

Meritly is a **browser-only SPA** (React 18 + Vite + TypeScript). There is no backend, database, or required env vars — all state lives in `localStorage`.

### Services

| Service | Command | URL |
|---------|---------|-----|
| Vite dev server | `npm run dev` | http://localhost:5173 |

Only the Vite dev server is required for local development and manual E2E testing.

### Standard commands

See `package.json` and `README.md`:

- **Install:** `npm ci` (CI uses Node 20; Node 22 also works)
- **Lint:** `npm run lint` (ESLint warnings are pre-existing; 0 errors expected)
- **Test:** `npm test` (Vitest, 203 tests)
- **Build:** `npm run build` (`tsc -b && vite build` → `dist/`)
- **Preview prod build:** `npm run build && npm run preview` → http://localhost:4173

### Dev server notes

- Start with `npm run dev` in a tmux session for long-running use.
- Vite binds to port **5173** by default (no custom port in `vite.config.ts`).
- Google Fonts load from CDN at runtime (preconnect in `index.html`).

### Hello-world smoke test

1. Open http://localhost:5173/
2. Sidebar → **Import data** → upload `public/sample-providers.csv`
3. Accept default column mapping → confirm preview shows 5 providers
4. Sidebar → **Data browser** → verify Jane Smith, John Doe, etc. appear

Additional sample files in `public/`: `sample-market.csv`, `sample-evaluations.csv`, `synthetic-providers.csv`.

### Gotchas

- Clearing browser site data removes all saved local state.
- `npm run generate:synthetic` writes CSVs to `public/` (optional CLI, not a service).
- Deploy target is Vercel static SPA; see `vercel.json` and `VERCEL.md`.
