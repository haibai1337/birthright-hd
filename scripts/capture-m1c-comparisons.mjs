import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1660, height: 700 } });
  const image = (file, mime) => 'data:' + mime + ';base64,' + readFileSync(file).toString('base64');
  for (const [name, reference, mime] of [
    ['menu', 'reference-menu.png', 'image/png'],
    ['strategy', 'reference-strategy.jpg', 'image/jpeg'],
  ]) {
    const original = image('reference/research-cache/m1c/' + reference, mime),
      restored = image(`test-results/m1c-${name}-1920.png`, 'image/png');
    await page.setContent(
      `<!doctype html><style>body{margin:0;background:#252016;color:#e7d3a3;font:16px Georgia}h1{font-size:24px;margin:20px}main{display:flex;gap:20px;margin:20px;align-items:start}figure{margin:0}figcaption{margin-bottom:12px}img{display:block;object-fit:contain;image-rendering:pixelated;border:1px solid #b69b68}small{display:block;margin:20px}</style><h1>Birthright — original Windows reference / M1C reconstruction</h1><main><figure><figcaption>Original reference (640 × 480 design)</figcaption><img src="${original}" width="640"></figure><figure><figcaption>M1C at 1920 × 1080 (shown at 50%)</figcaption><img src="${restored}" width="960"></figure></main><small>Private local comparison. Source references and known differences: docs/ASSET_PIPELINE.md.</small>`,
    );
    await page.locator('img').evaluateAll((images) => Promise.all(images.map((i) => i.decode())));
    await page.screenshot({ path: `test-results/m1c-${name}-comparison.png`, fullPage: true });
  }
} finally {
  await browser.close();
}
