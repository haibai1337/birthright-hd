import { expect, test } from '@playwright/test';

test('missing artwork shows actionable setup and retry restores the original menu', async ({
  page,
}) => {
  await page.route('**/original/runtime.json', (route) => route.fulfill({ status: 404, body: '' }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText(
    'Original graphics and soundtrack are missing',
  );
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toHaveCount(0);
  await expect(page.getByText('npm run assets:import', { exact: true })).toBeVisible();
  await page.unroute('**/original/runtime.json');
  await page.getByRole('button', { name: 'Retry setup' }).click();
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeVisible();
});

test('missing campaign accepts a validated import and rejects malformed data', async ({ page }) => {
  await page.route('**/original/anuire.research.json', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Anuire campaign data is missing');
  await page
    .getByTestId('anuire-campaign-import')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByRole('alert')).toContainText('Anuire load failed');
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toHaveCount(0);
  await page
    .getByTestId('anuire-campaign-import')
    .setInputFiles('reference/extracted/anuire/anuire.research.json');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await expect(page.getByLabel('Choose Anuire regent').locator('option')).toHaveCount(18);
});

test('invalid asset metadata cannot open a fictional fallback campaign', async ({ page }) => {
  await page.route('**/original/runtime.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"version":1}' }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Invalid original asset manifest');
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toHaveCount(0);
});
