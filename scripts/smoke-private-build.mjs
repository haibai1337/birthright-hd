import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const root = path.resolve('apps/game/dist-private');
await stat(path.join(root, 'PRIVATE_BUILD.txt'));
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname),
      file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) throw Error('Path outside build');
    const bytes = await readFile(file),
      mime =
        {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.wav': 'audio/wav',
        }[path.extname(file)] ?? 'application/octet-stream';
    let start = 0,
      end = bytes.length - 1;
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
    if (range) {
      start = Number(range[1]);
      if (range[2]) end = Math.min(end, Number(range[2]));
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${bytes.length}`);
    }
    res.setHeader('Content-Type', mime);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', end - start + 1);
    res.end(bytes.subarray(start, end + 1));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }),
    origin = 'http://127.0.0.1:' + server.address().port,
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(origin);
  await page.locator('[data-original-assets=ready]').waitFor();
  await page.locator('.classic-menu-shield > img').evaluate((img) => img.decode());
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page
    .getByTestId('anuire-campaign-import')
    .setInputFiles('reference/extracted/anuire/anuire.research.json');
  await page.getByLabel('Choose Anuire regent').selectOption('anuire-realm-27');
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await page
    .locator('[data-provinces="206"][data-original-icons="ready"]')
    .waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: /End season/ }).click();
  await page.getByText('DOMAIN TURN 2', { exact: true }).waitFor();
  await page.getByTestId('original-music').evaluate((a) =>
    a.currentTime > 0
      ? true
      : new Promise((resolve, reject) => {
          a.addEventListener('timeupdate', () => resolve(true), { once: true });
          a.addEventListener('error', () => reject(a.error), { once: true });
        }),
  );
  assert.equal(await page.getByTestId('original-music').evaluate((a) => a.paused), false);
  await page.goto(origin + '/_private/catalog.html');
  await page.getByLabel('Filter assets').fill('MAINPANL');
  await page.getByText('UI/MAINPANL.PCX', { exact: true }).waitFor();
  await page.getByLabel('Filter assets').fill('');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.match(await page.locator('#count').textContent(), /page 2\//);
  await page.getByLabel('Filter assets').fill('ELFTORCH');
  await page.getByRole('button', { name: 'Play animation' }).click();
  await page.locator('article img[src*=".1.png"]').waitFor({ timeout: 10000 });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: private static build — original menu, 206-province Anuire, seasonal command, original music, catalog pagination and animated preview.',
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
