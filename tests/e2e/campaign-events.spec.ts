import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test('campaign event choices persist, stay independent, and fit 1366x768', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Choose Anuire regent').selectOption('anuire-realm-27');
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await page.getByTestId('original-council')
    .getByRole('button', { name: 'Done — return to realm management' })
    .click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Campaign Events', exact: true }).click();
  const groups = [
    page.getByRole('region', { name: 'Random Events', exact: true }),
    page.getByRole('region', { name: 'Special Campaign Events', exact: true }),
  ];
  const switches = page.locator('.options-events [role="switch"]');
  await expect(switches).toHaveCount(8);
  await expect(
    page.getByRole('switch', { name: 'Treasury Incidents', exact: true }),
  ).not.toBeChecked();
  await expect(page.locator('.options-events [aria-checked="true"]')).toHaveCount(7);
  await expect(groups[0]!).toBeVisible();
  await expect(groups[1]!).toBeVisible();
  const prefs = await page.evaluate(() => localStorage.getItem('birthright-hd.settings'));
  await page.getByRole('button', { name: 'All Off', exact: true }).click();
  await expect(page.locator('.options-events [aria-checked="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'All On', exact: true }).click();
  await expect(page.locator('.options-events [aria-checked="true"]')).toHaveCount(8);
  for (let i = 0; i < 8; i++) {
    await switches.nth(i).click();
    await expect(switches.nth(i)).not.toBeChecked();
    await expect(page.locator('.options-events [aria-checked="true"]')).toHaveCount(7);
    await switches.nth(i).click();
  }
  await page.getByRole('switch', { name: 'Magical Events', exact: true }).click();
  await page.getByRole('switch', { name: 'Treasury Incidents', exact: true }).click();
  await page.getByLabel('Campaign difficulty', { exact: true }).selectOption('hard');
  expect(await page.evaluate(() => localStorage.getItem('birthright-hd.settings'))).toBe(prefs);
  const box = await page.getByRole('dialog').boundingBox();
  mkdirSync('test-results/campaign-events', { recursive: true });
  await page.mouse.move(10, 10);
  await page.screenshot({ path: 'test-results/campaign-events/options-1366x768.png' });
  const fit = await page
    .locator('.options-events')
    .evaluate((element) => ({ height: element.clientHeight, content: element.scrollHeight }));
  expect(fit.content, JSON.stringify(fit)).toBeLessThanOrEqual(fit.height);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(768);
  for (let i = 0; i < 8; i++) {
    const b = await switches.nth(i).boundingBox();
    expect(b!.width).toBeGreaterThanOrEqual(80);
    expect(b!.height).toBeGreaterThanOrEqual(40);
    expect(b!.x + b!.width).toBeLessThanOrEqual(1366);
  }
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Load game', exact: true }).click();
  await page.getByRole('button', { name: 'Load manual save', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Campaign Events', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Magical Events', exact: true })).not.toBeChecked();
  await expect(page.getByRole('switch', { name: 'Economic Events', exact: true })).toBeChecked();
  await expect(page.getByLabel('Campaign difficulty', { exact: true })).toHaveValue('hard');
  expect(errors).toEqual([]);
});

test('original Gorgon scene and missing-asset fallback acknowledge without replaying effects', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Choose Anuire regent').selectOption('anuire-realm-27');
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await page.getByTestId('original-council')
    .getByRole('button', { name: 'Done — return to realm management' })
    .click();
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('birthright-hd.save.'))!;
    const raw = JSON.parse(localStorage.getItem(key)!);
    raw.campaign.gorgonPlotStage = 1;
    raw.campaign.pendingGorgonScenes = [1];
    localStorage.setItem(key, JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Load game', exact: true }).click();
  await page.getByRole('button', { name: 'Load manual save', exact: true }).click();
  await expect(page.getByAltText('Original Gorgon campaign scene')).toBeVisible();
  const music = page.getByTestId('original-music');
  await expect.poll(() => music.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  await expect(page.getByRole('dialog')).toContainText('agents have infiltrated');
  mkdirSync('test-results/campaign-events', { recursive: true });
  await page.screenshot({ path: 'test-results/campaign-events/gorgon-1366x768.png' });
  await page.getByRole('button', { name: 'Continue campaign', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => music.evaluate((a: HTMLAudioElement) => !a.paused)).toBe(true);
  const saved = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((k) => k.startsWith('birthright-hd.auto.'))!;
    return JSON.parse(localStorage.getItem(k)!).campaign;
  });
  expect(saved.gorgonPlotStage).toBe(1);
  expect(saved.pendingGorgonScenes).toEqual([]);
  await page.route('**/original/runtime.json', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    delete json.assets['INTRO/GORGON2.FLC'];
    delete json.assets['TEXT/GORGON1.TXT'];
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Load game', exact: true }).click();
  await page.getByRole('button', { name: 'Load manual save', exact: true }).click();
  await expect(page.getByText('A dispatch from the northern frontier')).toBeVisible();
  await page.getByRole('button', { name: 'Continue campaign', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
