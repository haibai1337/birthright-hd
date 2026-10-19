import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import {
  originalMapIcons,
  originalPlaceGraphicIndex,
} from '../packages/import-tools/art-identities';
import { extractMapLocations } from '../packages/import-tools/map-visuals';
import { architecturalSites, castleArtForLevel } from '../packages/rendering/architecture';
import { loadAnuireScenario } from '../packages/world-data/anuire-scenario';
import { createCampaign } from '../packages/core/engine';
import { insideProvince } from '../packages/core/geometry';
import type { Scenario, Campaign } from '../packages/core/schema';

it('distinguishes a special castle selector from an ordinary castle level bitmap', () => {
  const name = (icon: number, level: number) =>
    originalMapIcons[originalPlaceGraphicIndex(icon, level)!];
  expect(name(115, 3)).toBe('CASTLE2');
  expect(name(115, 7)).toBe('CASTLE4');
  expect(name(116, 7)).toBe('SPIDERFL');
  expect(name(117, 1)).toBe('RHUANOCH');
  expect(name(118, 7)).toBe('FELLPORT');
  expect(name(97, 7)).toBe('WIZTOWER');
  expect(originalPlaceGraphicIndex(0, 7)).toBeUndefined();
});
it('chooses three distinct HD castle stages from active fortification level', () => {
  expect(castleArtForLevel(0)).toBeUndefined();
  expect([1, 2].map(castleArtForLevel)).toEqual(['castle-small', 'castle-small']);
  expect([3, 4, 5].map(castleArtForLevel)).toEqual([
    'castle-medium',
    'castle-medium',
    'castle-medium',
  ]);
  expect([6, 7, 10].map(castleArtForLevel)).toEqual([
    'castle-large',
    'castle-large',
    'castle-large',
  ]);
});
describe.skipIf(!existsSync('reference/extracted/anuire/anuire.research.json'))(
  'private original architecture integration',
  () => {
    let scenario: Scenario, state: Campaign, locations: ReturnType<typeof extractMapLocations>;
    beforeAll(async () => {
      const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
      const raw = json('reference/extracted/anuire/anuire.research.json');
      scenario = await loadAnuireScenario(
        raw,
        json('reference/extracted/anuire/economy.research.json'),
      );
      state = createCampaign(scenario, 'anuire-realm-08', 1997);
      locations = extractMapLocations(raw, readFileSync('reference/extracted/disc/RLMSTART.DAT'));
    });
    it('recovers the actual special graphics from CD place records and preserves port identities', () => {
      expect(locations.locations).toHaveLength(19);
      for (const [id, key] of [
        ['108', 'SPIDERFL'],
        ['194', 'RHUANOCH'],
        ['573', 'FELLPORT'],
        ['468', 'CASTLE4'],
        ['736', 'CASTLE4'],
      ])
        expect(
          locations.structures.find((p) => p.sourceId === 'anuire-place-' + id)?.resourceKey,
        ).toBe('UI/' + key + '.PCX');
      for (const key of ['SPIDERFL', 'RHUANOCH', 'FELLPORT'])
        expect(
          locations.structures.filter((s) => s.resourceKey === 'UI/' + key + '.PCX'),
        ).toHaveLength(1);
    });
    it('composes the imperial port and fort without merging gameplay records and keeps every ground anchor inside its province', () => {
      const before = JSON.stringify(state),
        sites = architecturalSites(scenario, state, locations.locations);
      const city = sites.find((s) => s.texture === 'imperial-anuire')!;
      expect(city.representedIds).toHaveLength(2);
      expect(sites.filter((s) => s.provinceId === city.provinceId)).toHaveLength(1);
      for (const site of sites.filter(
        (s) => s.role.startsWith('landmark-') || s.sourceId === 'anuire-place-265',
      )) {
        const p = scenario.provinces.find((p) => p.id === site.provinceId)!;
        expect(insideProvince(site.x, site.y, p), site.sourceId).toBe(true);
      }
      expect(sites.find((s) => s.sourceId === 'anuire-place-647')?.texture).toBe('castle-medium');
      expect(JSON.stringify(state)).toBe(before);
    });
    it('removes destroyed landmark forts, retains the separate port and follows current ownership and reduced levels', () => {
      const changed = structuredClone(state),
        fort = (id: string) =>
          changed.fortifications!.find((f) => f.sourceId === 'anuire-place-' + id)!;
      fort('468').level = 0;
      fort('573').level = 0;
      fort('573').constructionTarget = 1;
      fort('194').realmId = changed.playerRealm;
      fort('736').level = 2;
      const sites = architecturalSites(scenario, changed, locations.locations);
      expect(sites.some((s) => s.texture === 'imperial-anuire' || s.texture === 'fellport')).toBe(
        false,
      );
      expect(sites.some((s) => s.sourceId === 'anuire-place-480' && s.role === 'seaport')).toBe(
        true,
      );
      expect(sites.find((s) => s.texture === 'rhuanoch')?.owner).toBe(changed.playerRealm);
      expect(sites.find((s) => s.sourceId === 'anuire-place-736')?.width).toBeLessThan(96);
      expect(architecturalSites(scenario, changed, locations.locations)).toEqual(sites);
    });
  },
);
