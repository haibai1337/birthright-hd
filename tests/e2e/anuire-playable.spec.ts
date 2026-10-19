import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { insideRing } from '../../packages/core/geometry';

const input = 'reference/extracted/anuire/anuire.research.json';
test('loads the full local Anuire campaign, manages a domain, marches, negotiates and restores a save', async ({
  page,
}) => {
  test.skip(!existsSync(input), 'Requires the private reconstructed CD corpus.');
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  const choice = page.getByLabel('Choose Anuire regent');
  await expect(choice.locator('option')).toHaveCount(18);
  await choice.selectOption('anuire-realm-27');
  await expect(
    page.getByText('ANUIRE · EXPERIMENTAL ORIGINAL TEMPLATE', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await page.getByTestId('original-council')
    .getByRole('button', { name: 'Done — return to realm management' })
    .click();
  const map = page.getByTestId('strategic-map');
  await expect(map.locator('canvas')).toBeVisible();
  await expect(map).toHaveAttribute('data-provinces', '206', { timeout: 20000 });
  await expect(page.getByTestId('treasury')).toHaveText('150GB');
  await page.getByLabel('Inspect province').selectOption('anuire-province-003');
  await expect(page.getByTestId('province-level')).toHaveText('4 / 10');
  await page.getByRole('button', { name: 'Focus selected province', exact: true }).click();
  await page.getByRole('button', { name: /Rule province/ }).click();
  await expect(page.getByTestId('province-level')).toHaveText('5 / 10');
  await page.getByRole('button', { name: 'Military', exact: true }).first().click();
  await page.getByRole('button', { name: /Infantry · 1 GB upkeep/ }).click();
  await page.getByRole('button', { name: /Caercas.*units/ }).click();
  await page.getByLabel('March to an adjacent province').selectOption('anuire-province-005');
  await page.getByRole('button', { name: /Issue march order/ }).click();
  await expect(page.getByTestId('actions-left')).toHaveText('0 of 3 remaining');
  await page.screenshot({ path: 'test-results/anuire-playable-focused.png' });
  for (let turn = 2; turn <= 4; turn++) {
    await page.getByRole('button', { name: /End season/ }).click();
    await expect(page.getByText(`DOMAIN TURN ${turn}`, { exact: true })).toBeVisible();
    await page.getByTestId('original-council')
      .getByRole('button', { name: 'Done — return to realm management' })
      .click();
  }
  if (await page.getByRole('button', { name: 'Decline', exact: true }).count())
    await page.getByRole('button', { name: 'Decline', exact: true }).click();
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  await page
    .getByRole('button', { name: /Declare war/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Provinces', exact: true }).click();
  const raw = JSON.parse(readFileSync(input, 'utf8')) as {
    campaign: { provinces: { id: string }[] };
  };
  for (const province of raw.campaign.provinces) {
    await page.getByLabel('Inspect province').selectOption(province.id);
    await expect(page.getByLabel('Inspect province')).toHaveValue(province.id);
  }
  await expect(map).toHaveAttribute('data-scene-builds', '1');
  await page.getByLabel('Inspect province').selectOption('anuire-province-007');
  await page.getByRole('button', { name: 'Focus selected province', exact: true }).click();
  for (const overlay of ['military', 'economic', 'magical', 'political'])
    await page.getByRole('button', { name: overlay, exact: true }).first().click();
  await page.getByRole('button', { name: 'Fit map', exact: true }).click();
  await page.screenshot({ path: 'test-results/anuire-playable-overview.png' });
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await page.getByRole('button', { name: /End season/ }).click();
  await expect(page.getByText('DOMAIN TURN 5', { exact: true })).toBeVisible();
  await page.getByTestId('original-council')
    .getByRole('button', { name: 'Done — return to realm management' })
    .click();
  await page.getByRole('button', { name: 'Open game menu' }).click();
  await page.getByRole('button', { name: 'Load game', exact: true }).click();
  await page.getByRole('button', { name: 'Load manual save' }).click();
  await expect(page.getByText('DOMAIN TURN 4', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('selects and hovers an original detached island through the canvas in a second realm', async ({
  page,
}) => {
  test.setTimeout(60000);
  test.skip(!existsSync(input), 'Requires private Anuire data.');
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Choose Anuire regent').selectOption('anuire-realm-14');
  await page.getByLabel('Ruleset', { exact: true }).selectOption('CLASSIC');
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await page.getByTestId('original-council')
    .getByRole('button', { name: 'Done — return to realm management' })
    .click();
  const raw = JSON.parse(readFileSync(input, 'utf8')) as {
    map: {
      width: number;
      height: number;
      geometries: { provinceIndex: number; rings: [number, number][][] }[];
    };
    campaign: { provinces: { index: number; name: string; center: [number, number] }[] };
  };
  const province = raw.campaign.provinces.find((p) => p.name === 'Ilien')!;
  const provinceId = `anuire-province-${String(province.index).padStart(3, '0')}`;
  const geometry = raw.map.geometries.find((g) => g.provinceIndex === province.index)!,
    ring = geometry.rings[1]!,
    center = province.center;
  let point: [number, number] | undefined;
  for (
    let y = Math.min(...ring.map((p) => p[1])) + 2;
    y < Math.max(...ring.map((p) => p[1]));
    y += 4
  ) {
    for (
      let x = Math.min(...ring.map((p) => p[0])) + 2;
      x < Math.max(...ring.map((p) => p[0]));
      x += 4
    )
      if (insideRing(x, y, ring)) {
        point = [x, y];
        break;
      }
    if (point) break;
  }
  if (!point) throw new Error('Original island has no interior cell');
  await page.getByLabel('Inspect province').selectOption(provinceId);
  await page.getByRole('button', { name: 'Focus selected province', exact: true }).click();
  const map = page.getByTestId('strategic-map'),
    bounds = await map.boundingBox();
  if (!bounds) throw new Error('Missing map');
  const scale = Math.min(bounds.width / raw.map.width, bounds.height / raw.map.height) * 0.94 * 7;
  const x = bounds.x + bounds.width / 2 + (point[0] - center[0]) * scale,
    y = bounds.y + bounds.height / 2 + (point[1] - center[1]) * scale;
  await page.getByLabel('Inspect province').selectOption('anuire-province-003');
  await page.mouse.move(x, y);
  await expect(page.locator('.map-tooltip strong')).toHaveText('Ilien');
  await page.mouse.click(x, y);
  await expect(page.getByLabel('Inspect province')).toHaveValue(provinceId);
});
