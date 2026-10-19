import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test('recovered realm audio and the complete Options recovery cycle at 1366x768', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1366, height: 768 });
  const errors: string[] = [],
    recordings: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (/\/audio\/WAVE00\/(102|105)\.WAV/.test(response.url()) && response.ok())
      recordings.push(response.url());
  });
  // Preferences from before musicEnabled existed must migrate without losing channel levels.
  await page.addInitScript(() => {
    if (!localStorage.getItem('birthright-hd.settings'))
      localStorage.setItem(
        'birthright-hd.settings',
        JSON.stringify({
          labels: true,
          autosave: true,
          largeText: false,
          muted: false,
          musicVolume: 0.45,
          effectsVolume: 0.6,
          campaignTrack: 'MUSIC/101.WAV',
        }),
      );
  });
  await page.goto('/');
  await expect(page.locator('[data-original-assets]')).toHaveAttribute(
    'data-original-assets',
    'ready',
  );
  await expect(page.getByTestId('original-music')).toHaveCount(0);
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Choose Anuire regent').selectOption('anuire-realm-27');
  await page.getByRole('button', { name: /Begin your reign/ }).click();
  await page.getByTestId('original-council')
    .getByRole('button', { name: 'Done — return to realm management' })
    .click();
  const music = page.getByTestId('original-music');
  await expect(music).toHaveAttribute('src', /\/audio\/WAVE00\/105\.WAV$/);
  await expect
    .poll(() => music.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const soundtrack = page.getByRole('switch', { name: 'Original soundtrack', exact: true });
  const master = page.getByRole('switch', { name: 'Mute all audio', exact: true });
  const musicVolume = page.getByLabel('Music volume', { exact: true });
  const effectsVolume = page.getByLabel('Effects volume', { exact: true });
  const playing = async () => {
    await expect
      .poll(() => music.evaluate((a: HTMLAudioElement) => !a.paused && a.volume > 0))
      .toBe(true);
    await expect(music).toHaveCount(1);
    await expect(page.locator('audio[loop]')).toHaveCount(1);
  };
  const paused = () =>
    expect.poll(() => music.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  await playing();
  await soundtrack.click();
  await expect(soundtrack).not.toBeChecked();
  await paused();
  await soundtrack.click();
  await expect(soundtrack).toBeChecked();
  await playing();
  await musicVolume.focus();
  await musicVolume.press('Home');
  await paused();
  await musicVolume.press('ArrowRight');
  await playing();
  await musicVolume.fill('0.38');
  await expect.poll(() => music.evaluate((a: HTMLAudioElement) => a.volume)).toBeCloseTo(0.38, 2);
  await master.click();
  await expect(master).toBeChecked();
  await paused();
  await expect(master).toBeEnabled();
  await expect(soundtrack).toBeEnabled();
  await expect(page.getByTestId('audio-status')).toContainText('All audio is muted');
  await master.click();
  await playing();
  // Rapid Off/On uses the same media element rather than accumulating loops.
  for (let i = 0; i < 3; i++) {
    await soundtrack.click();
    await soundtrack.click();
  }
  await playing();
  // A paused element with the same recording must resume on the next real gesture.
  await music.evaluate((a: HTMLAudioElement) => a.pause());
  await page.getByRole('heading', { name: 'Audio', exact: true }).click();
  await playing();
  await effectsVolume.fill('0.27');
  await page.getByRole('button', { name: 'Test sound effects' }).click();
  const effect = page.locator('audio[data-effect="council"]').last();
  await expect(effect).toHaveCount(1);
  await expect
    .poll(() => effect.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  // Hold the short sample while checking live channel/mute updates, without a timing race at its end.
  await effect.evaluate((a: HTMLAudioElement) => a.pause());
  await expect.poll(() => effect.evaluate((a: HTMLAudioElement) => a.volume)).toBeCloseTo(0.27, 2);
  await effectsVolume.fill('0');
  await expect.poll(() => effect.evaluate((a: HTMLAudioElement) => a.volume)).toBe(0);
  await effectsVolume.fill('0.27');
  await master.click();
  await expect.poll(() => effect.evaluate((a: HTMLAudioElement) => a.volume)).toBe(0);
  await page.getByRole('button', { name: 'Test sound effects' }).click();
  await expect(page.locator('audio[data-effect="council"]')).toHaveCount(1);
  await master.click();
  await playing();
  await expect.poll(() => effect.evaluate((a: HTMLAudioElement) => a.volume)).toBeCloseTo(0.27, 2);
  await expect(page.getByRole('dialog')).not.toContainText(
    /105 is missing|realm 105 unavailable|explicitly selected alternate/i,
  );
  const bounds = await page.getByRole('dialog').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(768);
  expect(await musicVolume.evaluate((e) => getComputedStyle(e).height)).toBe('34px');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(musicVolume).toHaveValue('0.38');
  await expect(effectsVolume).toHaveValue('0.27');
  await expect(soundtrack).toBeChecked();
  await expect(master).not.toBeChecked();
  await expect(page.getByTestId('audio-status')).toContainText('Original soundtrack playing');
  await expect(page.getByRole('button', { name: 'Dismiss notification' })).toHaveCount(0, {
    timeout: 10000,
  });
  mkdirSync('test-results/audio-options', { recursive: true });
  await page.mouse.move(10, 10);
  await page.screenshot({ path: 'test-results/audio-options/options-1366x768.png' });
  const decoded = await page.evaluate(async () => {
    const context = new AudioContext();
    try {
      const results = [];
      for (const id of ['102', '105']) {
        const response = await fetch(`/original/audio/WAVE00/${id}.WAV`);
        const audio = await context.decodeAudioData(await response.arrayBuffer());
        results.push({ id, duration: audio.duration, channels: audio.numberOfChannels });
      }
      return results;
    } finally {
      await context.close();
    }
  });
  expect(decoded[0]!.duration).toBeCloseTo(89.18467, 2);
  expect(decoded[1]!.duration).toBeCloseTo(86.36136, 2);
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(musicVolume).toHaveValue('0.38');
  await expect(effectsVolume).toHaveValue('0.27');
  await expect(soundtrack).toBeChecked();
  await expect(master).not.toBeChecked();
  await playing();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Load game', exact: true }).click();
  await page.getByRole('button', { name: 'Load manual save' }).click();
  await expect(music).toHaveAttribute('src', /WAVE00\/105\.WAV$/);
  await playing();
  // Reopening with saved Off + master mute must leave both reversing controls accessible.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await soundtrack.click();
  await master.click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(soundtrack).not.toBeChecked();
  await expect(master).toBeChecked();
  await paused();
  await expect(soundtrack).toBeEnabled();
  await expect(master).toBeEnabled();
  await soundtrack.click();
  await paused();
  await master.click();
  await playing();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Load game', exact: true }).click();
  await page.getByRole('button', { name: 'Load manual save' }).click();
  await expect(music).toHaveAttribute('src', /WAVE00\/105\.WAV$/);
  await playing();
  expect(recordings.some((url) => url.endsWith('105.WAV'))).toBe(true);
  expect(errors).toEqual([]);
  writeFileSync(
    'test-results/audio-options/verification.json',
    JSON.stringify(
      {
        viewport: { width: 1366, height: 768 },
        realmSrc: await music.getAttribute('src'),
        decoded,
        playback: await music.evaluate((a: HTMLAudioElement) => ({
          time: a.currentTime,
          volume: a.volume,
          paused: a.paused,
          loop: a.loop,
        })),
        saved: await page.evaluate(() =>
          JSON.parse(localStorage.getItem('birthright-hd.settings')!),
        ),
        errors,
      },
      null,
      2,
    ),
  );
});
