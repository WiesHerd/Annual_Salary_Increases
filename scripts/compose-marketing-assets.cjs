const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'assets', 'marketing');
const shots = path.join(root, 'screenshots');

const slides = [
  {
    file: 'carousel-01-hook.png',
    width: 1080,
    height: 1080,
    eyebrow: 'Meritly',
    title: 'Physician merit cycles,\nwithout spreadsheet chaos',
    subtitle: 'Import → configure → review → committee export',
    image: '03-merit-review.png',
  },
  {
    file: 'carousel-02-import.png',
    width: 1080,
    height: 1080,
    eyebrow: 'Step 1 · Import',
    title: 'Roster, market, and\nevaluations in one hub',
    subtitle: 'Guided upload with workflow checklist',
    image: '01-import.png',
  },
  {
    file: 'carousel-03-controls.png',
    width: 1080,
    height: 1080,
    eyebrow: 'Step 2 · Controls',
    title: 'Cycle, matrix, mappings,\nand policy rules',
    subtitle: 'Merit setup progress keeps admins on track',
    image: '02-controls.png',
  },
  {
    file: 'carousel-04-governance.png',
    width: 1080,
    height: 1080,
    eyebrow: 'Step 3 · Merit review',
    title: 'Governance flags and\nbudget impact in one view',
    subtitle: 'Manual review · FMV · committee-ready export',
    image: '03-merit-review.png',
  },
  {
    file: 'carousel-05-policy.png',
    width: 1080,
    height: 1080,
    eyebrow: 'Policy engine',
    title: 'Built-in policy guide\nfor comp administrators',
    subtitle: 'Conflict strategy tables and evaluation order',
    image: '04-policy-guide.png',
  },
  {
    file: 'carousel-06-cta.png',
    width: 1080,
    height: 1080,
    eyebrow: 'Live demo',
    title: 'See Meritly in action',
    subtitle: 'annual-salary-increases.vercel.app',
    image: '03b-export-menu.png',
    fallback: '03-merit-review.png',
  },
];

function slideHtml(slide) {
  const img = fs.existsSync(path.join(shots, slide.image))
    ? slide.image
    : slide.fallback ?? slide.image;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${slide.width}px; height: ${slide.height}px; overflow: hidden;
    font-family: Inter, system-ui, sans-serif;
    background: linear-gradient(165deg, #eef2ff 0%, #f8fafc 38%, #ffffff 100%);
    color: #0f172a;
  }
  .wrap { display: flex; flex-direction: column; height: 100%; padding: 56px 56px 48px; }
  .brand { font-size: 14px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #4338ca; }
  h1 {
    margin-top: 18px; font-size: 52px; line-height: 1.05; font-weight: 800; letter-spacing: -0.03em;
    white-space: pre-line; max-width: 900px;
  }
  .sub { margin-top: 16px; font-size: 22px; line-height: 1.35; color: #475569; max-width: 820px; }
  .shot {
    margin-top: 36px; flex: 1; min-height: 0; border-radius: 20px; overflow: hidden;
    border: 1px solid #e2e8f0; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
    background: #fff;
  }
  .shot img { width: 100%; height: 100%; object-fit: cover; object-position: top left; display: block; }
  .bar {
    margin-top: 28px; display: flex; align-items: center; justify-content: space-between;
    font-size: 15px; color: #64748b;
  }
  .pill {
    display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 999px;
    background: #312e81; color: #fff; font-weight: 600; font-size: 14px;
  }
  .dot { width: 8px; height: 8px; border-radius: 999px; background: #a5b4fc; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">${slide.eyebrow}</div>
    <h1>${slide.title}</h1>
    <p class="sub">${slide.subtitle}</p>
    <div class="shot"><img src="../screenshots/${img}" alt="" /></div>
    <div class="bar">
      <span>Meritly · Compensation planning</span>
      <span class="pill"><span class="dot"></span> Built for comp admins</span>
    </div>
  </div>
</body>
</html>`;
}

const heroHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px; height: 627px; overflow: hidden; font-family: Inter, system-ui, sans-serif;
    background: radial-gradient(1200px 500px at 0% 0%, #e0e7ff 0%, transparent 55%), #f8fafc;
    color: #0f172a;
  }
  .grid { display: grid; grid-template-columns: 1.05fr 1fr; height: 100%; gap: 28px; padding: 44px 48px; }
  .brand { font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #4338ca; }
  h1 { margin-top: 14px; font-size: 42px; line-height: 1.08; font-weight: 800; letter-spacing: -0.03em; }
  .sub { margin-top: 14px; font-size: 18px; line-height: 1.45; color: #475569; max-width: 520px; }
  .bullets { margin-top: 22px; display: grid; gap: 10px; }
  .bullet { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; color: #334155; }
  .bullet span { width: 22px; height: 22px; border-radius: 999px; background: #4f46e5; color: #fff; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .cta { margin-top: 26px; display: inline-flex; padding: 12px 18px; border-radius: 12px; background: #312e81; color: #fff; font-weight: 600; font-size: 14px; }
  .shots { display: grid; grid-template-rows: 1fr 1fr; gap: 12px; min-height: 0; }
  .shot { border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 18px 40px rgba(15,23,42,.12); background: #fff; }
  .shot img { width: 100%; height: 100%; object-fit: cover; object-position: top left; display: block; }
</style>
</head>
<body>
  <div class="grid">
    <div>
      <div class="brand">Meritly</div>
      <h1>Enterprise physician merit review</h1>
      <p class="sub">Real app UI — import data, configure policies, run merit review with governance flags and committee exports.</p>
      <div class="bullets">
        <div class="bullet"><span>1</span> Import roster + market surveys</div>
        <div class="bullet"><span>2</span> Controls: cycle, matrix, policies</div>
        <div class="bullet"><span>3</span> Merit review with FMV governance</div>
      </div>
      <div class="cta">annual-salary-increases.vercel.app</div>
    </div>
    <div class="shots">
      <div class="shot"><img src="../screenshots/03-merit-review.png" alt="" /></div>
      <div class="shot"><img src="../screenshots/01-import.png" alt="" /></div>
    </div>
  </div>
</body>
</html>`;

async function main() {
  const tmpDir = path.join(root, '_compose');
  fs.mkdirSync(tmpDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  fs.writeFileSync(path.join(tmpDir, 'hero.html'), heroHtml);
  await page.setViewportSize({ width: 1200, height: 627 });
  await page.goto(`file:///${path.join(tmpDir, 'hero.html').replace(/\\/g, '/')}`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(root, 'linkedin-hero-real.png') });

  for (const slide of slides) {
    const htmlPath = path.join(tmpDir, slide.file.replace('.png', '.html'));
    fs.writeFileSync(htmlPath, slideHtml(slide));
    await page.setViewportSize({ width: slide.width, height: slide.height });
    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(root, slide.file) });
  }

  await browser.close();
  console.log('Marketing assets written to', root);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
