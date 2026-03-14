# Vercel deployment

- **SPA 404 fix:** `vercel.json` rewrites all routes to `/index.html` so the app loads correctly.
- **Favicon:** The site uses `public/GrokImage.jpg` for the browser tab (see `index.html`). It is included in the build.
- **Project card icon (Vercel dashboard):** The icon on your project card in the Vercel dashboard is not read from the repo. To set it: **Vercel Dashboard → your project → Settings → General** and upload your icon (e.g. use `public/GrokImage.jpg` or `public/app-icon.png` from this repo).
