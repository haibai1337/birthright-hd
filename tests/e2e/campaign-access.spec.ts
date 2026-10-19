import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test('independent faction and diplomacy unlocks persist without changing the current ruler', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Campaign Access', exact: true }).click();
  const realms = page.getByRole('switch', { name: 'Unlock all landed domains', exact: true });
  const diplomacy = page.getByRole('switch', { name: 'Unrestricted diplomacy', exact: true });
  await expect(realms).not.toBeChecked();
  await expect(diplomacy).not.toBeChecked();
  await realms.click();
  await expect(realms).toBeChecked();
  await expect(diplomacy).not.toBeChecked();
  await diplomacy.click();
  await expect(realms).toBeChecked();
  await expect(diplomacy).toBeChecked();
  const fit = await page
    .locator('.options-access')
    .evaluate((e) => e.scrollHeight <= e.clientHeight);
  expect(fit).toBe(true);
  mkdirSync('test-results/campaign-access', { recursive: true });
  await page.screenshot({ path: 'test-results/campaign-access/options-1366x768.png' });
  await diplomacy.click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  const choice = page.getByLabel('Choose Anuire regent');
  await expect(choice.locator('option')).toHaveCount(32);
  for (const id of ['03', '17', '24', '32'])
    await expect(choice.locator(`option[value="anuire-realm-${id}"]`)).toHaveCount(1);
  await choice.selectOption('anuire-realm-17');
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await page.getByTestId('original-council')
    .getByRole('button', { name: 'Done — return to realm management' })
    .click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Campaign Access', exact: true }).click();
  await expect(realms).toBeChecked();
  await expect(diplomacy).not.toBeChecked();
  await diplomacy.click();
  await realms.click();
  await expect(diplomacy).toBeChecked();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  const saved = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('birthright-hd.save.'))!;
    return JSON.parse(localStorage.getItem(key)!).campaign;
  });
  expect(saved.playerRealm).toBe('anuire-realm-17');
  expect(saved.selectionMode).toBe('CLASSIC');
  expect(saved.unrestrictedDiplomacy).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Load game', exact: true }).click();
  await page.getByRole('button', { name: 'Load manual save', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Campaign Access', exact: true }).click();
  await expect(realms).not.toBeChecked();
  await expect(diplomacy).toBeChecked();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  const target = page.getByLabel('Foreign domain');
  await expect(target.locator('option[value="anuire-realm-23"]')).toHaveCount(1);
  await target.selectOption('anuire-realm-03');
  await expect(page.getByRole('button', { name: /Submit diplomatic proposal/ })).toBeEnabled();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Campaign Access', exact: true }).click();
  await diplomacy.click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(target.locator('option[value="anuire-realm-23"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Submit diplomatic proposal/ })).toBeDisabled();
  expect(errors).toEqual([]);
});
