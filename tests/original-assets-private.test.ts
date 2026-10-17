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
      expect(d.records).toHaveLength(9501 + extraRealmCue);
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
        9 + extraRealmCue,
      );
      expect(
        d.records
          .filter((r: { audio?: { format: number } }) => r.audio)
          .every((r: { audio: { format: number } }) => r.audio.format === 1),
      ).toBe(true);
      expect(d.assets['MAP/LGMAP.PCX']).toMatchObject({ width: 1920, height: 2234 });
      expect(d.portraits['1000']).toBe('UI/LGLORDF2.PCX');
      expect(d.music.campaignFallback).toBe(!extraRealmCue);
      expect(d.effects.click).toBe('WAVE/8010.WAV');
    }, 30000);
  },
);
