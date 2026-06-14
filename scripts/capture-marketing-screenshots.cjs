const { chromium } = require('playwright');
const path = require('path');

const outDir = path.join(__dirname, '..', 'assets', 'marketing', 'screenshots');
const base = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const wait = (ms) => page.waitForTimeout(ms);

  await page.goto(`${base}/#import`, { waitUntil: 'networkidle' });
  await wait(1500);

  const loadSample = page.getByRole('button', { name: /load sample data/i });
  if (await loadSample.count()) {
    await loadSample.click();
    await wait(2000);
  }

  await page.screenshot({ path: path.join(outDir, '01-import.png') });

  await page.goto(`${base}/#parameters`, { waitUntil: 'networkidle' });
  await wait(1500);
  await page.screenshot({ path: path.join(outDir, '02-controls.png') });

  await page.goto(`${base}/#salary-review`, { waitUntil: 'networkidle' });
  await wait(2500);
  await page.screenshot({ path: path.join(outDir, '03-merit-review.png') });

  const exportBtn = page.getByRole('button', { name: /^export$/i });
  if (await exportBtn.count()) {
    await exportBtn.click();
    await wait(400);
    await page.screenshot({ path: path.join(outDir, '03b-export-menu.png') });
    await page.keyboard.press('Escape');
  }

  await page.goto(`${base}/#help`, { waitUntil: 'networkidle' });
  await wait(1500);
  await page.screenshot({ path: path.join(outDir, '04-policy-guide.png') });

  await browser.close();
  console.log('Saved screenshots to', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
