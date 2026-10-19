import { expect, test } from '@playwright/test';

test('Anuire is the default campaign and settings survive reopening the game', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Larger interface text' }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await expect(page.getByLabel('Choose Anuire regent').locator('option')).toHaveCount(18);
  await expect(page.getByText(/Covenant Marches/)).toHaveCount(0);
  await page.getByLabel('Choose Anuire regent').selectOption('anuire-realm-27');
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  const council = page.getByTestId('original-council');
  await expect(council).toBeVisible();
  const councilBounds = await council.boundingBox();
  expect(councilBounds?.x).toBe(171);
  expect(councilBounds?.y).toBe(0);
  expect(councilBounds?.width).toBeCloseTo(1024, 0);
  expect(councilBounds?.height).toBe(768);
  await expect(council.locator('[data-advisor-role]')).toHaveCount(4);
  await expect(council.getByRole('button', { name: 'Chamberlain', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(council.getByRole('button', { name: 'Done — return to realm management' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(council.getByRole('button', { name: 'Chamberlain', exact: true })).toBeFocused();
  await expect(
    council.getByRole('button', { name: 'Adventure News report, not yet restored' }),
  ).toBeDisabled();
  await council.getByRole('button', { name: 'General', exact: true }).click();
  await expect(council).toHaveCount(0);
  await page.getByRole('button', { name: 'Return to Council', exact: true }).click();
  await expect(council).toBeVisible();
  await council
    .getByRole('button', { name: 'Done — return to realm management' })
    .click();
  await expect(council).toHaveCount(0);
  await page.getByRole('button', { name: 'Council of advisors', exact: true }).click();
  await expect(council).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(council).toHaveCount(0);
  await expect(page.getByLabel('Inspect province').locator('option')).toHaveCount(206);
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Larger interface text')).toBeChecked();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Load game', exact: true }).click();
  await page.getByRole('button', { name: 'Load manual save' }).click();
  await expect(page.getByTestId('treasury')).toHaveText('15GB');
  await expect(page.locator('.classic-turn')).toContainText('TURN 1');
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
  await page.getByTestId('original-council')
    .getByRole('button', { name: 'Done — return to realm management' })
    .click();
  await expect(page.getByRole('button', { name: 'Focus selected province' })).toBeEnabled({
    timeout: 20000,
  });
  for (let remaining = 0; remaining < 20; remaining++) {
    const response = page.getByRole('button', { name: /Resolve domain action/ });
    if (!(await response.count())) break;
    await response.click();
    if (remaining === 19) throw new Error('Domain opposition did not resolve');
  }
  await context.setOffline(true);
  for (const turn of [2, 3, 4]) {
    for (let step = 0; step < 60 && !(await page.getByTestId('original-council').count()); step++) {
      const scene = page.getByRole('dialog', { name: /The Gorgon/ });
      if (await scene.count()) {
        await scene.getByRole('button', { name: 'Continue campaign', exact: true }).click();
      } else if (await page.getByRole('button', { name: 'Decline', exact: true }).count()) {
        await page.getByRole('button', { name: 'Decline', exact: true }).click();
      } else {
        const response = page.getByRole('button', { name: /Resolve domain action/ });
        if (await response.count()) await response.click();
        else await page.getByRole('button', { name: /End season/ }).click();
      }
    }
    await expect(page.locator('.classic-turn')).toContainText(`TURN ${turn}`);
    await expect(page.getByTestId('original-council')).toBeVisible();
    await page.getByTestId('original-council')
      .getByRole('button', { name: 'Done — return to realm management' })
      .click();
  }
  expect(remote).toEqual([]);
});
