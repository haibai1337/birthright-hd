import { expect, test } from '@playwright/test';

test('Anuire is the default campaign and settings survive reopening the game', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Larger interface text').check();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await expect(page.getByLabel('Choose Anuire regent').locator('option')).toHaveCount(18);
  await expect(page.getByText(/Covenant Marches/)).toHaveCount(0);
  await page.getByLabel('Choose Anuire regent').selectOption('anuire-realm-27');
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await expect(page.getByTestId('strategic-map')).toHaveAttribute('data-provinces', '206');
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Larger interface text')).toBeChecked();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Load game', exact: true }).click();
  await page.getByRole('button', { name: 'Load manual save' }).click();
  await expect(page.getByTestId('treasury')).toHaveText('150GB');
  await expect(page.getByText('DOMAIN TURN 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('Anuire simulation continues for multiple seasons without internet', async ({
  page,
  context,
}) => {
  const remote: string[] = [];
  page.on('request', (r) => {
    if (!/^(http:\/\/127\.0\.0\.1:5173|data:|blob:)/.test(r.url())) remote.push(r.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Choose Anuire regent').selectOption('anuire-realm-27');
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await expect(page.getByTestId('strategic-map')).toHaveAttribute('data-original-icons', 'ready');
  await context.setOffline(true);
  for (const turn of [2, 3, 4]) {
    if (await page.getByRole('button', { name: 'Decline', exact: true }).count())
      await page.getByRole('button', { name: 'Decline', exact: true }).click();
    await page.getByRole('button', { name: /End season/ }).click();
    await expect(page.getByText(`DOMAIN TURN ${turn}`, { exact: true })).toBeVisible();
  }
  expect(remote).toEqual([]);
});
