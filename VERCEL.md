# Vercel deployment

- **SPA 404 fix:** `vercel.json` rewrites all routes to `/index.html` so the app loads correctly. Use the root URL (e.g. `https://annual-salary-increases.vercel.app/`) or hash routes (e.g. `...#salary-review`).
- **Favicon:** The site uses `public/GrokImage.jpg` for the browser tab. `vercel.json` also rewrites `/favicon.ico` to `/GrokImage.jpg` so Vercel’s deployment preview and project card can load the icon.
- **Project card icon (Projects list):** The icon on the project card (like your other apps) is set in the dashboard: **Vercel Dashboard → annual-salary-increases → Settings → General**. Upload `public/GrokImage.jpg` or `public/app-icon.png` as the project icon there.
