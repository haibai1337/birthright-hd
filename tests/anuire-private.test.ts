import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  validateAnuireResearch,
  projectVerifiedProvinceDefinitions,
} from '../packages/world-data/anuire-research';
import { OriginalDisc } from '../packages/import-tools/disc';
const enabled = process.env.BIRTHRIGHT_PRIVATE_REFERENCE_TESTS === '1';
describe.skipIf(!enabled)('private original-CD reconstruction integration', () => {
  const load = () =>
    validateAnuireResearch(
      JSON.parse(readFileSync('reference/extracted/anuire/anuire.research.json', 'utf8')),
    );
  it('recovers all references, geometric IDs, and named catalogs without dangling records', () => {
    const d = load();
    expect(d.campaign.provinces).toHaveLength(206);
    expect(d.campaign.realms).toHaveLength(51);
    expect(d.campaign.regents).toHaveLength(116);
    expect(d.campaign.holdings).toHaveLength(766);
    expect(d.campaign.forts).toHaveLength(39);
    expect(d.campaign.troops.filter((u) => u.kind === 'military')).toHaveLength(234);
    expect(d.map.geometries.every((g) => g.centerValue === g.provinceIndex)).toBe(true);
    expect(d.validation.errors).toEqual([]);
  });
  it('uses the raw province and realm resources, preserving separate original meanings', () => {
    const d = load();
    expect(d.campaign.provinces.find((p) => p.name === 'Abbatuor')).toMatchObject({
      level: 3,
      magic: 4,
      realmIndex: 27,
    });
    expect(d.campaign.provinces.find((p) => p.name === 'City of Anuire')).toMatchObject({
      level: 10,
      magic: 0,
    });
    expect(d.campaign.realms.find((r) => r.index === 27)).toMatchObject({
      treasury: 150,
      regency: 56,
    });
  });
  it('checks the original source hash against a fresh read-only CD read', () => {
    const disc = new OriginalDisc('reference/original/RPGBGA.BIN');
    try {
      const hash = createHash('sha256').update(disc.file('RLMSTART.DAT')).digest('hex');
      expect(load().sources.find((s) => s.id === 'cd-template')?.sha256).toBe(hash);
    } finally {
      disc.close();
    }
  });
  it('does not promote partial geometry or unsupported rules to a playable campaign', () => {
    const d = load(),
      projection = projectVerifiedProvinceDefinitions(d);
    expect(projection.playable).toBe(false);
    expect(projection.converted.length + projection.blocked.length).toBe(206);
    expect(projection.blocked.length).toBeGreaterThan(0);
    expect(d.validation.readinessBlockers.length).toBeGreaterThan(0);
  });
  it('rejects broken realm, border, holding, army and geometry references', () => {
    for (const mutate of [
      (d: ReturnType<typeof load>) => {
        d.campaign.provinces[0]!.realmIndex = 999;
      },
      (d: ReturnType<typeof load>) => {
        d.campaign.provinces[0]!.borders[0]!.provinceIndex = 999;
      },
      (d: ReturnType<typeof load>) => {
        d.campaign.holdings[0]!.provinceIndex = 999;
      },
      (d: ReturnType<typeof load>) => {
        d.campaign.troops[0]!.effectiveProvinceIndex = 999;
      },
      (d: ReturnType<typeof load>) => {
        d.map.geometries[0]!.centerValue = 999;
      },
      (d: ReturnType<typeof load>) => {
        d.campaign.relationships.values.pop();
      },
      (d: ReturnType<typeof load>) => {
        d.campaign.realms[0]!.treasury = -1;
      },
    ]) {
      const d = load();
      mutate(d);
      expect(() => validateAnuireResearch(d)).toThrow();
    }
  });
});
