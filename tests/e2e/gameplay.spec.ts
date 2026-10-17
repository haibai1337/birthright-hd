import { expect, test } from '@playwright/test';
test('a regent develops, recruits, marches, negotiates, ends seasons, and restores a save', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await expect(page.getByTestId('strategic-map').locator('canvas')).toBeVisible();
  await expect(page.getByTestId('province-level')).toHaveText('4 / 6');
  await page.getByRole('button', { name: /Rule province/ }).click();
  await expect(page.getByTestId('province-level')).toHaveText('5 / 6');
  await expect(page.getByTestId('treasury')).toHaveText('18GB');
  await page.getByRole('button', { name: 'Military', exact: true }).first().click();
  await page.getByRole('button', { name: /Infantry · 1 GB upkeep/ }).click();
  await expect(page.getByTestId('actions-left')).toHaveText('1 of 3 remaining');
  await page.getByRole('button', { name: /Dawnsfield.*2 units/ }).click();
  await page.getByLabel('March to an adjacent province').selectOption('p8');
  await page.getByRole('button', { name: /Issue march order/ }).click();
  await expect(page.getByTestId('actions-left')).toHaveText('0 of 3 remaining');
  await page.getByRole('button', { name: /End season/ }).click();
  await expect(page.getByText('DOMAIN TURN 2', { exact: true })).toBeVisible();
  if (await page.getByRole('button', { name: 'Decline', exact: true }).count())
    await page.getByRole('button', { name: 'Decline', exact: true }).click();
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  await page
    .getByRole('button', { name: /Propose alliance/ })
    .first()
    .click();
  await expect(page.getByText(/alliance · Relations/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await page.getByRole('button', { name: /End season/ }).click();
  await expect(page.getByText('DOMAIN TURN 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open game menu' }).click();
  await page.getByRole('button', { name: 'Load game', exact: true }).click();
  await page.getByRole('button', { name: 'Load manual save' }).click();
  await expect(page.getByText('DOMAIN TURN 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Provinces', exact: true }).click();
  await page.getByLabel('Inspect province').selectOption('p4');
  await expect(page.getByTestId('province-level')).toHaveText('5 / 6');
  await page.getByRole('button', { name: 'Realm', exact: true }).click();
  await expect(page.getByText('LAST SEASON’S ACCOUNTS')).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Fit map', exact: true }).click();
  // Select through the Pixi canvas, then verify the province panel receives the hit.
  const canvas = await page.getByTestId('strategic-map').locator('canvas').boundingBox();
  if (!canvas) throw new Error('Map canvas is missing');
  const scale = Math.min(canvas.width / 1400, canvas.height / 940) * 0.96;
  const point = {
    x: canvas.x + (canvas.width - 1400 * scale) / 2 + 300 * scale,
    y: canvas.y + (canvas.height - 940 * scale) / 2 + 235 * scale,
  };
  await page.mouse.click(point.x, point.y);
  await expect(page.getByLabel('Inspect province')).toHaveValue('p0');
  await page.screenshot({ path: 'test-results/campaign-1366.png' });
  expect(errors).toEqual([]);
});
test('settings, all regents, and the larger desktop viewport are usable', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/main-menu-1920.png' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Larger interface text').check();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('button', { name: /The Verdant Covenant Caelin/ }).click();
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await page.getByRole('button', { name: /Warden’s Aegis/ }).click();
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/campaign-1920.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('campaign simulation runs with internet disabled after initial load', async ({
  page,
  context,
}) => {
  const remote: string[] = [];
  page.on('request', (r) => {
    if (
      !r.url().startsWith('http://127.0.0.1:5173') &&
      !r.url().startsWith('data:') &&
      !r.url().startsWith('blob:')
    )
      remote.push(r.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('button', { name: /The Iron March Orren/ }).click();
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await expect(page.getByTestId('strategic-map').locator('canvas')).toBeVisible();
  await context.setOffline(true);
  for (const turn of [2, 3, 4]) {
    if (await page.getByRole('button', { name: 'Decline', exact: true }).count())
      await page.getByRole('button', { name: 'Decline', exact: true }).click();
    await page.getByRole('button', { name: /End season/ }).click();
    await expect(page.getByText(`DOMAIN TURN ${turn}`, { exact: true })).toBeVisible();
  }
  expect(remote).toEqual([]);
});
