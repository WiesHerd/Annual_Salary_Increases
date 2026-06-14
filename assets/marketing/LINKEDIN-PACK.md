# Meritly LinkedIn marketing pack

All carousel images use **real Meritly UI screenshots** (sample data, local-only capture). No stock faces.

## Files

| File | Use |
|------|-----|
| `linkedin-hero-real.png` | LinkedIn post header / article cover (1200×627) |
| `carousel-01-hook.png` … `carousel-06-cta.png` | LinkedIn carousel slides (1080×1080) |
| `screenshots/` | Raw app captures (reference / crop your own) |

**Live demo URL:** https://annual-salary-increases.vercel.app/

---

## Carousel slide copy (6 slides)

### Slide 1 — Hook
**Headline:** Physician merit cycles, without spreadsheet chaos  
**Body:** Meritly connects import, policy configuration, and merit review in one comp-admin workflow.  
**Alt text:** Meritly merit review dashboard with budget and governance summary cards.

### Slide 2 — Import
**Headline:** Start with your data  
**Body:** Upload provider roster, market surveys, and evaluations. Workflow checklist shows what’s left before review.  
**Alt text:** Meritly Import data hub with onboarding panel and import tiles.

### Slide 3 — Controls
**Headline:** Configure the cycle once  
**Body:** Review cycles, merit matrix, mappings, and compensation policies — with merit setup progress so nothing is missed.  
**Alt text:** Meritly Controls with tab navigation and merit setup strip.

### Slide 4 — Governance
**Headline:** See who needs manual review  
**Body:** Policy engine flags FMV and compliance cases. Filter the grid in one click; export a committee packet.  
**Alt text:** Merit review table with Manual review filter and summary metrics.

### Slide 5 — Policy guide
**Headline:** Policies that admins can actually maintain  
**Body:** In-app Policy guide explains evaluation order, policy types, and conflict strategy — no buried PDF.  
**Alt text:** Meritly Policy guide with policy types and conflict strategy tables.

### Slide 6 — CTA
**Headline:** Try the live demo  
**Body:** https://annual-salary-increases.vercel.app/  
**Closing line:** Built for hospital and health-system compensation teams.  
**Alt text:** Meritly export menu with committee governance Excel option.

---

## Suggested LinkedIn post (paste under carousel)

> I’ve been building **Meritly** — a physician compensation merit-cycle tool for comp administrators.
>
> One workflow: **Import** roster + market data → **Controls** (cycle, matrix, policies) → **Merit review** with governance flags → **Committee export**.
>
> Swipe through for real product screens (sample data). Live demo in comments.
>
> #Healthcare #PhysicianComp #Compensation #HealthTech #ProductDesign

---

## Re-capture screenshots (Windows)

Your `.env` enables Supabase sign-in, so marketing captures use **local-only mode**:

```powershell
cd "C:\Users\wherd\OneDrive\Documents\Python Projects\Meritly"
Rename-Item .env .env.bak
npm run dev
# new terminal:
node scripts/capture-marketing-screenshots.cjs
node scripts/compose-marketing-assets.cjs
Rename-Item .env.bak .env
```

---

## OBS recording guide (Windows, ~60 seconds)

### Setup (one time)
1. Install [OBS Studio](https://obsproject.com/).
2. **Settings → Video:** Base 1920×1080, Output 1920×1080, 30 FPS.
3. **Sources:** Add **Window Capture** → select your browser with Meritly (Chrome/Edge).
4. **Audio:** Disable desktop audio unless you want narration; add **Mic/Aux** if voiceover.
5. Crop: right-click source → **Transform → Edit Transform** → crop to app window (hide OS chrome).

### Before recording
1. `npm run dev` (normal `.env` is fine if you sign in; or use sample data in local-only).
2. Browser zoom **100%**, window **~1440px wide**.
3. Load sample data on Import if needed.
4. Close unrelated tabs; use light theme if you use one consistently.

### Shot list (timecodes)
| Time | Action | Narration (optional) |
|------|--------|----------------------|
| 0:00–0:08 | Import hub + checklist | “Upload roster, market, and evaluations.” |
| 0:08–0:18 | Controls → merit setup strip | “Configure cycle, matrix, mappings, policies.” |
| 0:18–0:35 | Merit review grid + summary bar | “Review increases, budget use, manual review flags.” |
| 0:35–0:42 | Click a provider → detail panel | “See why each increase was recommended.” |
| 0:42–0:50 | Export → Committee governance Excel | “Committee-ready export in one click.” |
| 0:50–0:60 | End on live URL or title card | “Meritly — link in description.” |

### Record & export
1. **Start Recording** (or Replay Buffer for retakes).
2. Export: **File → Remux Recordings** (MKV→MP4) or record MP4 directly.
3. Optional trim in **Clipchamp** (built into Windows) or CapCut.
4. LinkedIn: upload as video post; attach carousel as a separate document post or link in comments.

### Loom alternative (faster)
1. [loom.com](https://www.loom.com) → Chrome extension.
2. Record **Tab only** (Meritly tab), 720p or 1080p.
3. Same shot list; Loom auto-generates a share link for LinkedIn.

---

## Tips for LinkedIn
- Post **carousel first** (highest engagement), link demo in first comment.
- Use **linkedin-hero-real.png** if you switch to a single-image post.
- Mention “real product screenshots” — builds trust vs. AI mockups.
