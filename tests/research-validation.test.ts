import { expect, it } from 'vitest';
import { validateAnuireResearch } from '../packages/world-data/anuire-research';

// Entirely synthetic: no private original campaign fixture is required by the public suite.
const fixture = () => ({
  format: 'birthright-hd-anuire-research',
  version: 1,
  status: 'research-preview',
  sources: [],
  provenance: {
    status: 'TEMPORARY_PLACEHOLDER',
    source: 'Synthetic test fixture',
    note: 'Not original Anuire data',
  },
  campaign: {
    realms: [
      {
        id: 'r1',
        index: 1,
        name: 'Fixture realm',
        regentIndex: 1,
        treasury: 10,
        regency: 10,
        playable: false,
      },
    ],
    regents: [
      {
        id: 'g1',
        index: 1,
        realmIndex: 1,
        classCode: 1,
        bloodline: { grade: 1, derivation: 1, strength: 20 },
        identity: { name: 'Fixture regent' },
      },
    ],
    provinces: [
      {
        id: 'p1',
        index: 1,
        offset: 0,
        name: 'Fixture province',
        center: [2, 2],
        realmIndex: 1,
        level: 3,
        currentLevel: 3,
        magic: 4,
        taxCode: 0,
        loyaltyCode: 0,
        terrainCode: 2,
        borders: [],
        firstPlace: 0,
      },
    ],
    holdings: [],
    forts: [],
    troops: [],
    reactions: { rows: 2, columns: 2, values: [0, 0, 0, 0] },
    relationships: { rows: 2, columns: 2, values: [0, 0, 0, 0] },
    tribute: { rows: 2, columns: 2, values: [0, 0, 0, 0] },
  },
  map: {
    width: 4,
    height: 4,
    coordinateScale: 4,
    geometries: [
      {
        provinceIndex: 1,
        pixelArea: 1,
        centerValue: 1,
        rings: [
          [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 4],
          ],
        ],
      },
    ],
  },
  validation: {
    errors: [],
    warnings: [],
    readinessBlockers: ['Synthetic inspection fixture only'],
  },
});

it('accepts a coherent research corpus and rejects cross-realm ownership and negative resource corruption', () => {
  expect(validateAnuireResearch(fixture()).campaign.provinces).toHaveLength(1);
  const wrongRegent = fixture();
  wrongRegent.campaign.regents[0]!.realmIndex = 2;
  expect(() => validateAnuireResearch(wrongRegent)).toThrow('regent');
  const negative = fixture();
  negative.campaign.realms[0]!.treasury = -1;
  expect(() => validateAnuireResearch(negative)).toThrow();
});

it('rejects relationship shape/reference corruption and empty or unmatched maps before preview', () => {
  const wrongSize = fixture();
  wrongSize.campaign.relationships.values.pop();
  expect(() => validateAnuireResearch(wrongSize)).toThrow('Matrix');
  const wrongRealmCount = fixture();
  wrongRealmCount.campaign.tribute = { rows: 1, columns: 1, values: [0] };
  expect(() => validateAnuireResearch(wrongRealmCount)).toThrow('relationship');
  const empty = fixture();
  empty.campaign.provinces = [];
  empty.map.geometries = [];
  expect(() => validateAnuireResearch(empty)).toThrow('Empty');
  const wrongMap = fixture();
  wrongMap.map.geometries[0]!.centerValue = 2;
  expect(() => validateAnuireResearch(wrongMap)).toThrow('coordinate');
});
