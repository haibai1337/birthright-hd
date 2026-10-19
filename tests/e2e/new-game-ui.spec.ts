import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('kingdom selection previews the original regent and starts with the chosen campaign settings', async ({
  page,
}) => {
  test.skip(
    !existsSync('reference/extracted/anuire/anuire.research.json'),
    'Requires private Anuire data.',
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose your birthright' });
  const choice = dialog.getByLabel('Choose Anuire regent');
  await expect(choice.locator('option')).toHaveCount(18);
  const options = await choice.locator('option').evaluateAll((nodes) =>
    nodes.map((node) => ({
      id: (node as HTMLOptionElement).value,
      text: node.textContent!,
    })),
  );
  for (const option of options) {
    await choice.selectOption(option.id);
    const [realm, regent] = option.text.split(' · ');
    await expect(dialog.getByRole('heading', { name: realm, exact: true })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: regent, exact: true })).toBeVisible();
    await expect(dialog.locator('.kingdom-list button[aria-pressed="true"]')).toContainText(
      regent!,
    );
    const candidates = dialog
      .getByRole('group', { name: 'Choose your ruling regent' })
      .getByRole('button');
    await expect(candidates).toHaveCount(2);
    const alternate = (await candidates.nth(1).getAttribute('aria-label'))!.replace('Rule as ', '');
    await candidates.nth(1).click();
    await expect(dialog.getByRole('heading', { name: alternate, exact: true })).toBeVisible();
    await candidates.nth(0).click();
  }
  await dialog.getByRole('button', { name: /Roesone.*Marlae Roesone/ }).click();
  await expect(choice).toHaveValue('anuire-realm-27');
  const portrait = dialog.getByRole('img', { name: 'Marlae Roesone', exact: true });
  await expect(portrait).toBeVisible();
  await expect
    .poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await dialog.getByRole('button', { name: 'Rule as Michael Agnelie', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Michael Agnelie', exact: true })).toBeVisible();
  await expect(
    dialog.getByText('Marlae Roesone will serve as your lieutenant.', { exact: true }),
  ).toBeVisible();
  await expect(choice.locator('option:checked')).toContainText('Michael Agnelie');
  await expect(dialog.locator('.kingdom-list button[aria-pressed="true"]')).toContainText(
    'Michael Agnelie',
  );
  await dialog.getByLabel('Ruleset', { exact: true }).selectOption('CLASSIC');
  await dialog.getByLabel('Empire difficulty').selectOption('500');
  await dialog.getByLabel('Campaign seed').fill('12345');
  await page.screenshot({ path: 'test-results/new-game-ui/kingdom-regent-1366x768.png' });
  const bounds = await dialog.boundingBox();
  expect(bounds).toBeTruthy();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(768);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const policy = await dialog
    .getByText('Experimental campaign policies', { exact: false })
    .first()
    .boundingBox();
  const footer = await dialog.locator('.new-game-footer').boundingBox();
  expect(policy!.y + policy!.height).toBeLessThanOrEqual(footer!.y);
  await dialog.getByRole('button', { name: /Begin your reign/ }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByTestId('original-council')
    .getByRole('button', { name: 'Done — return to realm management' })
    .click();
  const campaign = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) => key.startsWith('birthright-hd.auto.'))!;
    return JSON.parse(localStorage.getItem(key)!).campaign;
  });
  expect(campaign).toMatchObject({
    playerRealm: 'anuire-realm-27',
    seed: 12345,
    ruleset: 'CLASSIC',
    victoryTarget: 500,
  });
  expect(
    campaign.realms.find((realm: { id: string }) => realm.id === 'anuire-realm-27').regentId,
  ).toBe('anuire-regent-054');
  await expect(page.getByRole('heading', { name: 'Michael Agnelie', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open game menu' }).click();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await expect(choice).toHaveValue('anuire-realm-27');
  await choice.focus();
  await page.keyboard.press('ArrowUp');
  await expect(choice).not.toHaveValue('anuire-realm-27');
  await expect(
    dialog.getByRole('group', { name: 'Choose your ruling regent' }).getByRole('button').first(),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Load game', exact: true }).click();
  await page.getByRole('button', { name: 'Load manual save', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Michael Agnelie', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
