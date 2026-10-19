import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
describe.skipIf(process.env.BIRTHRIGHT_PRIVATE_REFERENCE_TESTS !== '1')(
  'private original asset import',
  () => {
    it('retains all source identities, decoded dimensions and browser-ready audio', () => {
      const d = JSON.parse(readFileSync('reference/assets/manifest.json', 'utf8'));
      const root = path.resolve('reference/assets');
      const files = new Set(
        readdirSync(root, { recursive: true, withFileTypes: true })
          .filter((e) => e.isFile())
          .map((e) =>
            path.relative(root, path.join(e.parentPath, e.name)).split(path.sep).join('/'),
          ),
      );
      const extraRealmCue = d.assets['MUSIC/105.WAV'] ? 1 : 0;
      expect(d.records).toHaveLength(9702 + extraRealmCue);
      expect(d.containers).toHaveLength(13);
      expect(
        d.records.every(
          (r: { status: string; file: string; sha256: string }) =>
            r.status === 'decoded' && r.sha256.length === 64 && files.has(r.file),
        ),
      ).toBe(true);
      expect(
        d.records.filter((r: { source: string }) => r.source === 'RESFILES/UI.RES'),
      ).toHaveLength(1396);
      expect(d.records.filter((r: { category: string }) => r.category === 'music')).toHaveLength(
        12 + extraRealmCue,
      );
      expect(
        d.records
          .filter((r: { audio?: { format: number } }) => r.audio)
          .every((r: { audio: { format: number } }) => r.audio.format === 1),
      ).toBe(true);
      expect(d.assets['MAP/LGMAP.PCX']).toMatchObject({ width: 1920, height: 2234 });
      expect(d.portraits['1000']).toBe('UI/LGLORDF2.PCX');
      expect(d.music.campaignFallback).toBe(false);
      expect(d.music.campaign).toBe('WAVE00/105.WAV');
      expect(d.music.battle).toBe('WAVE00/102.WAV');
      expect(d.records.filter((r: { audio?: unknown }) => r.audio)).toHaveLength(
        1304 + extraRealmCue,
      );
      expect(d.assets['MUSIC/103.WAV'].file).not.toBe(d.assets['WAVE00/103.WAV'].file);
      expect(d.effects.click).toBe('WAVE/8010.WAV');
      for (const [number, count] of [[2, 101], [3, 124], [4, 128]]) {
        const movie = d.assets[`INTRO/GORGON${number}.FLC`];
        expect(movie.frames).toHaveLength(count!);
        expect(movie.frames.every((file: string) => files.has(file))).toBe(true);
        expect(movie.frameMs).toBe(71);
      }
      expect(Object.keys(d.eventReports)).toHaveLength(14);
      expect(d.records.filter((r: { category: string }) => r.category === 'campaign-cinematic')).toHaveLength(6);
    }, 30000);
  },
);
