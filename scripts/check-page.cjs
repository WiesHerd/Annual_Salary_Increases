const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/#import', { waitUntil: 'networkidle' });
  const text = await page.locator('body').innerText();
  console.log(text.slice(0, 500));
  await browser.close();
})();
