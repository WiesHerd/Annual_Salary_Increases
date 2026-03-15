# Vercel deployment

- **SPA 404 fix:** `vercel.json` rewrites the root and all routes to `/index.html` so the app loads at `https://annual-salary-increases.vercel.app/`.
- **Favicon:** The site uses `public/GrokImage.jpg` for the browser tab. `vercel.json` also rewrites `/favicon.ico` to `/GrokImage.jpg` so Vercel's deployment preview and project card can load the icon.
- **Project card icon (Projects list):** The icon on the project card is set in the dashboard: **Vercel Dashboard → annual-salary-increases → Settings → General**. Upload `public/GrokImage.jpg` or `public/app-icon.png` as the project icon there.

## If the short URL (annual-salary-increases.vercel.app) shows 404

The short domain is the **production** domain. It only works when there is a **production** deployment. Preview deployments use the long URLs (e.g. `annual-salary-increases-git-master-...vercel.app`).

1. **Set production branch**  
   Vercel Dashboard → **annual-salary-increases** → **Settings** → **Git** → **Production Branch**. Set it to the branch you want for production (e.g. `main` or `master`).

2. **Deploy that branch**  
   Push a commit to the production branch, or in the **Deployments** tab open the latest deployment from that branch and click **⋯** → **Promote to Production**. That assigns the short domain to that deployment.

3. **Redeploy after config changes**  
   After changing `vercel.json`, push a commit to the production branch (or promote the latest deployment to production) so the short URL uses the updated config.
