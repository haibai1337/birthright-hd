import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
const available = existsSync('reference/assets/manifest.json');
test('selection remains safe while original map artwork is still loading', async ({ page }) => {
  test.skip(!available, 'Requires private assets.');
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/LGMAP.PCX.png', async (route) => {
    await pending;
    await route.continue();
  });
  try {
    await page.goto('/');
    await expect(page.locator('[data-original-assets]')).toHaveAttribute(
      'data-original-assets',
      'ready',
    );
    await page.getByRole('button', { name: 'New game', exact: true }).click();
    await page.getByRole('button', { name: /Begin your reign/ }).click();
    await expect(page.getByTestId('strategic-map').locator('canvas')).toBeVisible();
    await page.getByLabel('Inspect province', { exact: true }).selectOption('anuire-province-003');
    await expect(
      page.getByRole('button', { name: 'Focus selected province', exact: true }),
    ).toBeDisabled();
    release();
    await expect(page.getByTestId('strategic-map')).toHaveAttribute('data-provinces', '206', {
      timeout: 20000,
    });
    await expect(
      page.getByRole('button', { name: 'Focus selected province', exact: true }),
    ).toBeEnabled();
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});
test('every recovered music recording and representative effects decode in Chromium', async ({
  page,
}) => {
  test.skip(!available, 'Requires private audio pack.');
  test.setTimeout(90000);
  await page.goto('/');
  const decoded = await page.evaluate(async () => {
    const d = await (await fetch('/original/manifest.json')).json(),
      context = new AudioContext(),
      results: { id: string; duration: number; expected: number | null }[] = [];
    try {
      for (const r of d.records.filter(
        (r: { category: string; id: string }) =>
          r.category === 'music' ||
          ['WAVE/8010.WAV', 'WAVE/8015.WAV', 'WAVE/20322.WAV'].includes(r.id),
      )) {
        const response = await fetch('/original/' + r.file);
        if (!response.ok) throw new Error(r.id);
        const audio = await context.decodeAudioData(await response.arrayBuffer());
        results.push({ id: r.id, duration: audio.duration, expected: r.audio.duration });
      }
    } finally {
      await context.close();
    }
    return results;
  });
  expect(decoded).toHaveLength(12);
  for (const track of decoded) {
    expect(track.duration).toBeGreaterThan(0);
    expect(Math.abs(track.duration - track.expected!)).toBeLessThan(0.1);
  }
});
test('original audio obeys interaction, scene transitions, volume, mute and persistent preferences', async ({
  page,
}) => {
  test.skip(!available, 'Requires privately imported original assets.');
  test.setTimeout(60000);
  const effects: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/audio/effects/')) effects.push(r.url());
  });
  await page.goto('/');
  await expect(page.locator('[data-original-assets]')).toHaveAttribute(
    'data-original-assets',
    'ready',
  );
  await expect(page.getByTestId('original-music')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const music = page.getByTestId('original-music');
  await expect(music).toHaveAttribute('src', /106\.WAV$/);
  await expect
    .poll(() => music.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  await page.getByLabel('Music volume', { exact: true }).focus();
  await page.getByLabel('Music volume', { exact: true }).press('Home');
  await page.getByLabel('Music volume', { exact: true }).press('ArrowRight');
  await expect.poll(() => music.evaluate((a: HTMLAudioElement) => a.volume)).toBeCloseTo(0.01, 2);
  await page.getByLabel('Mute all audio').check();
  await expect.poll(() => music.evaluate((a: HTMLAudioElement) => a.volume)).toBe(0);
  await page.getByLabel('Mute all audio').uncheck();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await expect(music).toHaveAttribute('src', /101\.WAV$/);
  await expect
    .poll(() => music.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  await expect.poll(() => effects.some((url) => url.endsWith('8010.WAV'))).toBe(true);
  await page.reload();
  await expect(page.locator('[data-original-assets]')).toHaveAttribute(
    'data-original-assets',
    'ready',
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Music volume', { exact: true })).toHaveValue('0.01');
  await expect(page.getByLabel('Mute all audio')).not.toBeChecked();
});
for (const [width, height] of [
  [640, 480],
  [1366, 768],
  [1920, 1080],
])
  test(`classic Anuire layout and original map at ${width}x${height}`, async ({ page }) => {
    test.skip(
      !available || !existsSync('reference/extracted/anuire/anuire.research.json'),
      'Requires private original corpus.',
    );
    test.setTimeout(60000);
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto('/');
    await expect(page.locator('[data-original-assets]')).toHaveAttribute(
      'data-original-assets',
      'ready',
    );
    await page.screenshot({ path: `test-results/m1c-menu-${width}.png` });
    await page.getByRole('button', { name: 'New game', exact: true }).click();
    await page.getByLabel('Choose Anuire regent').selectOption('anuire-realm-27');
    await page.getByRole('button', { name: /Begin your reign/ }).click();
    const map = page.getByTestId('strategic-map');
    await expect(map).toHaveAttribute('data-original-map', 'aligned-1-to-1');
    await expect(map).toHaveAttribute('data-scene-builds', '1', { timeout: 20000 });
    await expect(map).toHaveAttribute('data-original-icons', 'ready', { timeout: 20000 });
    await expect(page.getByRole('img', { name: 'Marlae Roesone', exact: true })).toBeVisible();
    await expect(page.getByTestId('treasury')).toHaveText('150GB');
    const council = await page.locator('.classic-council').boundingBox(),
      bounds = await map.boundingBox();
    expect(council?.x).toBe(0);
    expect(bounds!.x).toBeGreaterThanOrEqual(142);
    expect(bounds!.width).toBeGreaterThan(width! * 0.65);
    await expect(page.getByRole('button', { name: 'Dismiss notification' })).toHaveCount(0, {
      timeout: 10000,
    });
    await page.screenshot({ path: `test-results/m1c-strategy-${width}.png` });
    await page.getByLabel('Inspect province', { exact: true }).selectOption('anuire-province-003');
    await expect(page.getByTestId('province-level')).toHaveText('4 / 10');
    if (width === 1920) {
      await page.getByRole('button', { name: 'Focus selected province', exact: true }).click();
      await page.screenshot({ path: 'test-results/m1c-province-1920.png' });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
