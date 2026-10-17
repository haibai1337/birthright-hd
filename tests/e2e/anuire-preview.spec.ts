import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('rejects campaign files as research imports without disturbing New Game', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByTestId('research-import').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"unrelated"}'),
  });
  await expect(page.getByRole('alert')).toContainText('Research import failed');
  await expect(page.getByRole('dialog', { name: 'Choose your birthright' })).toBeVisible();
});

test('inspects the private original corpus and returns to the unchanged M0 campaign', async ({
  page,
}) => {
  const input = 'reference/extracted/anuire/anuire.research.json';
  test.skip(!existsSync(input), 'Run research:anuire with your private CD first.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Open Anuire research preview', exact: true }).click();
  await (await chooser).setFiles(input);
  await expect(page.getByRole('dialog', { name: 'Anuire research preview' })).toBeVisible();
  await expect(page.getByText(/NOT PLAYABLE/)).toBeVisible();
  await expect(page.getByTestId('anuire-map').locator('path')).toHaveCount(206);
  await expect(page.getByTestId('research-level')).toHaveText('3 / 4');
  await expect(page.getByRole('heading', { name: 'Abbatuor', exact: true })).toBeVisible();
  await page.getByLabel('Inspect recovered province').selectOption('3');
  await expect(page.getByTestId('research-level')).toHaveText('4 / 1');
  await page.getByRole('button', { name: 'Focus selected province' }).click();
  await page.screenshot({ path: 'test-results/anuire-focused.png' });
  await page.getByRole('button', { name: 'Show all Anuire' }).click();
  await page.screenshot({ path: 'test-results/anuire-overview.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await expect(page.getByTestId('province-level')).toHaveText('4 / 6');
  await expect(page.getByTestId('treasury')).toHaveText('24GB');
  expect(errors).toEqual([]);
});
