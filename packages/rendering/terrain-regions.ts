import type { Scenario } from '../core/schema';
import { insideRing } from '../core/geometry';

type Province = Scenario['provinces'][number];
export interface TerrainProfile {
  forestWidth: number;
  forestHeight: number;
  forestFloor: number;
  relief: 'none' | 'outcrop' | 'mountains' | 'heavy-mountains';
  hills: boolean;
  origin: string;
}
/** Native categories decide which features may exist. Pixels only locate them.
 * Plains/marsh do not become dense woods because the original uses green ink. */
export const terrainProfiles: Record<Province['terrain'], TerrainProfile> = {
  forest: {
    forestWidth: 132,
    forestHeight: 1,
    forestFloor: 1,
    relief: 'none',
    hills: false,
    origin: 'native',
  },
  plains: {
    forestWidth: 0,
    forestHeight: 0,
    forestFloor: 0,
    relief: 'none',
    hills: false,
    origin: 'native',
  },
  coast: {
    forestWidth: 0,
    forestHeight: 0,
    forestFloor: 0,
    relief: 'none',
    hills: false,
    origin: 'native',
  },
  swamp: {
    forestWidth: 0,
    forestHeight: 0,
    forestFloor: 0,
    relief: 'none',
    hills: false,
    origin: 'native',
  },
  hills: {
    forestWidth: 56,
    forestHeight: 0.48,
    forestFloor: 0.35,
    relief: 'none',
    hills: true,
    origin: 'native',
  },
  mountains: {
    forestWidth: 64,
    forestHeight: 0.55,
    forestFloor: 0.35,
    relief: 'mountains',
    hills: false,
    origin: 'native',
  },
  'heavy-mountains': {
    forestWidth: 42,
    forestHeight: 0.4,
    forestFloor: 0.18,
    relief: 'heavy-mountains',
    hills: false,
    origin: 'native',
  },
};

export const isForestClearing = (
  province?: Pick<Scenario['provinces'][number], 'id' | 'terrain'>,
) => Boolean(province && terrainProfiles[province.terrain].forestWidth === 0);

/** User's annotated retail-map review, 2026-10-19. This is a visual corridor,
 * not a change to native movement/economy categories (notably 172 and 179). */
export const easternMountainSpine = {
  id: 'eastern-granite-chain',
  provinces: [172, 173, 174, 178, 179, 180, 181].map((n) => `anuire-province-${n}`),
  path: [
    [1698, 846],
    [1662, 880],
    [1742, 918],
    [1676, 950],
    [1722, 1012],
    [1740, 1084],
    [1728, 1168],
    [1778, 1272],
    [1840, 1334],
  ] as [number, number][],
  source:
    "Native LGMAP rock strokes; user's annotated Baruk-Azhik map and Promontory–Ruorkhe–Lyssan–Salviene–Mhowe continuity instruction.",
};
export function distanceToMountainSpine(x: number, y: number) {
  let distance = Infinity;
  for (let i = 1; i < easternMountainSpine.path.length; i++) {
    const a = easternMountainSpine.path[i - 1]!,
      b = easternMountainSpine.path[i]!,
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
    distance = Math.min(distance, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy));
  }
  return distance;
}

export function terrainProfileAt(
  p: Pick<Province, 'id' | 'terrain'>,
  x: number,
  y: number,
): TerrainProfile {
  const native = terrainProfiles[p.terrain];
  if (
    ['anuire-province-175', 'anuire-province-176', 'anuire-province-177'].includes(p.id) &&
    distanceToMountainSpine(x, y) < 40
  )
    return { ...terrainProfiles.mountains, relief: 'outcrop', origin: easternMountainSpine.id };
  if (easternMountainSpine.provinces.includes(p.id) && distanceToMountainSpine(x, y) < 62)
    return {
      ...native,
      forestWidth: 0,
      forestFloor: 0,
      relief: p.id === 'anuire-province-179' ? 'mountains' : 'heavy-mountains',
      hills: false,
      origin: easternMountainSpine.id,
    };
  // Revised user review: both complete provinces are rolling foothills,
  // visibly distinct from the neighboring Deepshadow and Duornil plains.
  if (['anuire-province-170', 'anuire-province-171'].includes(p.id))
    return { ...terrainProfiles.plains, hills: true, origin: 'reviewed-baruk-foothills' };
  for (const region of terrainRegions) {
    if (!insideRing(x, y, region.polygon)) continue;
    const mixed =
      (region.id === 'gorgons-rugged-uplands' &&
        [125, 130, 132, 134, 136, 137, 156, 206].some((n) => p.id === `anuire-province-${n}`)) ||
      (region.id === 'taeghas-inland-range' &&
        [44, 52, 53].some((n) => p.id === `anuire-province-${String(n).padStart(3, '0')}`));
    if (mixed && native.relief === 'none')
      return { ...native, relief: 'outcrop', origin: region.id };
  }
  return native;
}

/** User-reviewed geographic layout, not recovered elevation. `source` is the
 * pre-fit retail feature anchor; move the northern peaks into the western arm
 * rather than tilting their painted silhouettes over the same elven ground. */
export const reliefPlacements = [
  {
    provinceId: 'anuire-province-174',
    source: [1702, 838],
    position: [1612, 855],
    width: 80,
    heightScale: 0.52,
  },
  {
    provinceId: 'anuire-province-174',
    source: [1654, 862],
    position: [1660, 878],
    width: 82,
    heightScale: 0.6,
  },
  {
    provinceId: 'anuire-province-174',
    source: [1690, 874],
    // Restore relief in the narrow northeastern lobe, leaving the western
    // peninsula corrections intact. This is a user-directed HD layout.
    position: [1706, 832],
    width: 56,
    heightScale: 0.95,
  },
] as const;

/** Small visual-only exceptions, reviewed against native LGMAP.PCX at 1920×2234.
 * These outlines constrain source evidence; they never generate a mountain by themselves.
 * They do not change imported province categories, boundaries or movement costs.
 */
export const terrainRegions: {
  id: string;
  polygon: [number, number][];
  style:
    | 'coastal-range'
    | 'forested-peaks'
    | 'great-forest'
    | 'ancient-forest'
    | 'granite-range'
    | 'arid-range';
  source: string;
}[] = [
  {
    id: 'tuarhievel-woodland',
    polygon: [
      [990, 265],
      [1265, 275],
      [1320, 465],
      [1260, 615],
      [1030, 625],
      [960, 460],
    ],
    style: 'great-forest',
    source:
      'LGMAP: continuous green/brown shaded woodland east of the river, native forest records 138–144. The outline controls spacing, not forest extent.',
  },
  {
    id: 'sielwode-ancient-woodland',
    polygon: [
      [1240, 715],
      [1490, 665],
      [1690, 740],
      [1630, 945],
      [1490, 1030],
      [1300, 1015],
    ],
    style: 'ancient-forest',
    source:
      'LGMAP: broad shaded canopy with southern clearings and eastern rocky edge, native forest records 197–205. Local image evidence still controls coverage.',
  },
  {
    id: 'eastern-granite-chain',
    polygon: [
      [1610, 815],
      [1795, 800],
      [1830, 1080],
      [1810, 1170],
      [1900, 1300],
      [1900, 1400],
      [1830, 1400],
      [1720, 1280],
      [1650, 1080],
      [1585, 945],
    ],
    style: 'granite-range',
    source:
      'LGMAP pale/gray ridge chain; annotated user review connects Rivenrock/Land’s Victory/Promontory through Ruorkhe, Lyssan, Salviene and Mhowe. The lake and coastal plains remain open; original gameplay categories are unchanged.',
  },
  {
    id: 'gorgons-rugged-uplands',
    polygon: [
      [1330, 190],
      [1720, 170],
      [1760, 520],
      [1580, 700],
      [1240, 675],
      [1300, 475],
    ],
    style: 'arid-range',
    source:
      'LGMAP: pink shadow/highlight ridges across the Crown and southern Mur-Kilad/Markazor spurs. Includes mixed forest/plains records; pink soil alone is insufficient.',
  },
  {
    id: 'taeghas-inland-range',
    polygon: [
      [110, 1090],
      [430, 1090],
      [455, 1455],
      [130, 1455],
    ],
    style: 'coastal-range',
    source:
      'LGMAP: small inland rock strokes; forest/plains at Portage, Bayside and Seasdeep. Native 47/48/51 are mountains, 60/62 heavy mountains.',
  },
  {
    id: 'five-peaks-northern-ridge',
    polygon: [
      [470, 662],
      [640, 646],
      [805, 666],
      [840, 730],
      [680, 744],
      [480, 732],
    ],
    style: 'forested-peaks',
    source:
      'LGMAP: linked pale/gray peak groups along the north of The Gorge, Floodspaeth and Puinol (native 148/149/151), surrounded by forest.',
  },
];

/** Art direction only: negative = Spiderfell's living, hostile canopy; positive
 * = dying woodland toward Kal-Saitharak. World-space feathering changes colour
 * and tree character, never source coverage, placement or province records.
 * Centers follow native Spiderfell (25) and Kal-Saitharak (125); the northern
 * field includes Pelt (130) but fades before the great southern elven forests.
 */
export function forestCharacterAt(x: number, y: number) {
  const falloff = (distance: number, inner: number, outer: number) => {
    const t = Math.max(0, Math.min(1, (distance - inner) / (outer - inner)));
    return 1 - t * t * (3 - 2 * t);
  };
  if (x > 640 && x < 1005 && y > 1335 && y < 1590)
    return -falloff(Math.hypot((x - 822) / 154, (y - 1462) / 108), 0.62, 1.15);
  if (x > 1205 && x < 1840 && y >= 0 && y < 780)
    return falloff(Math.hypot((x - 1522) / 300, (y - 380) / 380), 0.18, 1.05);
  return 0;
}
