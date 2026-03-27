# Meritly

Browser-based compensation planning: import provider and market data, configure parameters and policies, run merit review and scenario comparison. **There is no backend** — data stays in the browser (`localStorage`) unless you export files.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Local dev server (Vite) |
| `npm run build` | Typecheck + production bundle |
| `npm run preview` | Serve the production build locally |
| `npm test` | Vitest (unit tests) |
| `npm run lint` | ESLint on `src/` |

## Deploy (e.g. Vercel)

- Build command: `npm run build`
- Output directory: `dist`
- `vercel.json` includes SPA rewrites and security headers (CSP allows Google Fonts used by the app).

Bump **`package.json` `version`** when you cut a release; the sidebar shows **v{version}** (injected at build time).

## Provider roster (download template)

**Incentive lines** (Import → Incentives, template `incentives-upload-template`) are rolled up by provider and merged into **Current TCC** for the selected merit cycle. The built-in **provider upload template** matches a typical extract: **Primary_Division**, **Provider_Name**, **Department**, **Provider_Type**, **Employee_ID**, **Benchmark_Group** (benchmark specialty), **Subspecialty**, **Hire_Date**, **Years_of_Experience**, **Clinical_FTE**, **Current_FTE** (total), **Current_Base_Salary**, **Evaluation_Score**, **Compensation_Plan**, **Current_CF**, **Prior_Year_WRVUs**. Add other columns (e.g. `Cycle`, `Population`, `Current_TCC`) anytime; the mapper accepts the full provider schema.

## Data and privacy

- Treat uploads as sensitive; recommend HTTPS in production and avoid shared/public machines without understanding that **clearing site data removes local saves**.
- Use **Export** flows regularly for backup.

## Production checklist (ongoing)

- Keep dependencies updated (`npm audit`, especially parsers like `xlsx`).
- Optional: add error tracking (e.g. Sentry) with strict PII rules — not included by default.
