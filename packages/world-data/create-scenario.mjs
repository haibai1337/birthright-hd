import { writeFile } from 'node:fs/promises';
const synthetic = {
  status: 'TEMPORARY_PLACEHOLDER',
  source: 'Original development content, 2026-10-17',
  note: 'Synthetic test world. Not Anuire, a canonical regent, or an original starting position.',
};
const verified = (note) => ({
  status: 'VERIFIED_ORIGINAL',
  source: 'Supplied CD RULES.TXT, muster table, section 158',
  note,
});
const enhanced = {
  status: 'ENHANCED_DESIGN',
  source: 'M0 design',
  note: 'Provisional deterministic balance; not reconstructed PC behavior.',
};
const grid = [
  [
    [200, 140],
    [430, 100],
    [680, 155],
    [920, 105],
    [1190, 200],
  ],
  [
    [140, 340],
    [430, 360],
    [700, 330],
    [960, 375],
    [1230, 390],
  ],
  [
    [200, 560],
    [460, 550],
    [720, 585],
    [970, 545],
    [1190, 590],
  ],
  [
    [310, 770],
    [490, 810],
    [745, 770],
    [980, 825],
    [1120, 750],
  ],
];
const names = [
  'Westreach',
  'Greenhollow',
  'Elderwood',
  'Frostgate',
  'Whiteharbor',
  'Willowmere',
  'Highfen',
  'Ironspire',
  'Saltmeadow',
  'Dawnsfield',
  'Redwater',
  'Ashen March',
];
const terrains = [
  'hills',
  'forest',
  'forest',
  'mountains',
  'coast',
  'plains',
  'hills',
  'mountains',
  'coast',
  'plains',
  'plains',
  'hills',
];
const owners = [
  'crownmere',
  'verdant',
  'verdant',
  'ironvale',
  'crownmere',
  'verdant',
  'verdant',
  'ironvale',
  'crownmere',
  'crownmere',
  'ironvale',
  'ironvale',
];
const provinces = [];
for (let row = 0; row < 3; row++)
  for (let col = 0; col < 4; col++) {
    const n = row * 4 + col;
    const polygon = [
      grid[row][col],
      grid[row][col + 1],
      grid[row + 1][col + 1],
      grid[row + 1][col],
    ];
    provinces.push({
      id: `p${n}`,
      name: names[n],
      regionId: 'covenant-marches',
      terrain: terrains[n],
      polygon,
      center: [
        Math.round(polygon.reduce((n, p) => n + p[0], 0) / 4),
        Math.round(polygon.reduce((n, p) => n + p[1], 0) / 4),
      ],
      adjacent: [
        ...(row > 0 ? [`p${n - 4}`] : []),
        ...(col > 0 ? [`p${n - 1}`] : []),
        ...(col < 3 ? [`p${n + 1}`] : []),
        ...(row < 2 ? [`p${n + 4}`] : []),
      ],
      maxLevel: 6,
      magicPotential: terrains[n] === 'forest' ? 9 : terrains[n] === 'mountains' ? 8 : 7,
      provenance: synthetic,
    });
  }
const realms = [
  {
    id: 'crownmere',
    name: 'Crownmere',
    adjective: 'Crownmere',
    color: '#537b88',
    sigil: 'crown',
    motto: 'By oath, a kingdom.',
    regent: {
      id: 'elara',
      name: 'Elara Vael',
      class: 'warrior',
      bloodline: { derivation: 'Dawn', strength: 32, abilities: [] },
      attributes: { command: 4, diplomacy: 3 },
      inventory: [],
    },
    provenance: synthetic,
  },
  {
    id: 'verdant',
    name: 'The Verdant Covenant',
    adjective: 'Verdant',
    color: '#73856a',
    sigil: 'stag',
    motto: 'The old roots endure.',
    regent: {
      id: 'caelin',
      name: 'Caelin of the Bough',
      class: 'wizard',
      bloodline: { derivation: 'Grove', strength: 30, abilities: [] },
      attributes: { command: 2, diplomacy: 4 },
      inventory: [],
    },
    provenance: synthetic,
  },
  {
    id: 'ironvale',
    name: 'The Iron March',
    adjective: 'Iron March',
    color: '#aa7460',
    sigil: 'tower',
    motto: 'Stone yields to no crown.',
    regent: {
      id: 'orren',
      name: 'Orren Blackthorn',
      class: 'warrior',
      bloodline: { derivation: 'Ember', strength: 34, abilities: [] },
      attributes: { command: 5, diplomacy: 1 },
      inventory: [],
    },
    provenance: synthetic,
  },
];
const levels = [2, 3, 2, 2, 4, 3, 2, 4, 2, 3, 3, 2];
const holdings = [];
for (let i = 0; i < 12; i++) {
  for (const [type, level] of [
    ['law', Math.min(2, levels[i])],
    ['guild', 1],
    ['temple', 1],
    ['source', Math.min(2, provinces[i].magicPotential - levels[i])],
  ])
    holdings.push({ id: `h-${i}-${type}`, provinceId: `p${i}`, realmId: owners[i], type, level });
}
// A foreign holding demonstrates overlapping sovereignty without province-specific rules.
holdings.find((h) => h.id === 'h-5-guild').realmId = 'crownmere';
const s = {
  id: 'covenant-marches',
  revision: 1,
  name: 'The Crown & the Covenant',
  description:
    'A synthetic frontier campaign in twelve provinces. Three rival regents, one contested border. All names, geography, and starting positions are provisional.',
  provenance: synthetic,
  regions: [
    {
      id: 'covenant-marches',
      name: 'The Covenant Marches',
      culture: 'Synthetic development region',
      provenance: synthetic,
    },
  ],
  realms,
  provinces,
  units: [
    {
      id: 'infantry',
      name: 'Infantry',
      cost: 2,
      upkeep: 1,
      power: 6,
      minLevel: 1,
      provenance: verified(
        'Cost 2 GB, upkeep 1 GB, minimum province 1 verified; power 6 is enhanced.',
      ),
    },
    {
      id: 'archers',
      name: 'Archers',
      cost: 2,
      upkeep: 1,
      power: 5,
      minLevel: 2,
      provenance: verified(
        'Cost 2 GB, upkeep 1 GB, minimum province 2 verified; power 5 is enhanced.',
      ),
    },
    {
      id: 'cavalry',
      name: 'Cavalry',
      cost: 4,
      upkeep: 2,
      power: 10,
      minLevel: 3,
      provenance: verified(
        'Cost 4 GB, upkeep 2 GB, minimum province 3 verified; power 10 is enhanced.',
      ),
    },
  ],
  spells: [
    {
      id: 'ward',
      name: 'Warden’s Aegis',
      holding: 'source',
      minLevel: 2,
      gold: 2,
      regency: 4,
      effect: 'ward',
      duration: 2,
      provenance: enhanced,
    },
  ],
  events: [
    { id: 'harvest', weight: 3, gold: 3, loyalty: 0, decision: false, provenance: enhanced },
    { id: 'quiet', weight: 4, gold: 0, loyalty: 0, decision: false, provenance: enhanced },
    { id: 'petition', weight: 2, gold: 0, loyalty: 0, decision: true, provenance: enhanced },
    { id: 'unrest', weight: 1, gold: -1, loyalty: -1, decision: false, provenance: enhanced },
  ],
  initial: {
    treasury: 24,
    regency: 20,
    provinces: provinces.map((p, i) => ({
      id: p.id,
      owner: owners[i],
      level: levels[i],
      loyalty: 3,
      tax: 'moderate',
      fort: [4, 7].includes(i) ? 1 : 0,
    })),
    holdings,
    armies: [
      ['crownmere', 'p9'],
      ['verdant', 'p6'],
      ['ironvale', 'p10'],
    ].map(([realmId, provinceId], i) => ({
      id: `initial-army-${i}`,
      realmId,
      provinceId,
      moved: false,
      units: [0, 1].map((j) => ({ id: `initial-unit-${i}-${j}`, type: 'infantry', strength: 100 })),
    })),
    treaties: [
      { a: 'crownmere', b: 'verdant', kind: 'peace', opinion: 25, since: 1 },
      { a: 'crownmere', b: 'ironvale', kind: 'war', opinion: -25, since: 1 },
      { a: 'verdant', b: 'ironvale', kind: 'war', opinion: -20, since: 1 },
    ],
    tradeRoutes: [],
  },
  victory: { provinces: 8, turns: 20 },
};
await writeFile('packages/world-data/covenant-marches.json', JSON.stringify(s, null, 2) + '\n');
console.log('Wrote synthetic scenario: 12 provinces, 3 realms.');
