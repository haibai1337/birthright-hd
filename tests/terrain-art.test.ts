import { describe, expect, it } from 'vitest';
import {
  auditTerrainPlacement,
  traceTerrain,
  traceWater,
  terrainFootprint,
  terrainFrameBounds,
  placeRegionalRelief,
} from '../packages/rendering/terrain-placement';
import { developmentScenario } from './fixtures/scenario';
import {
  forestCharacterAt,
  terrainProfileAt,
  terrainProfiles,
} from '../packages/rendering/terrain-regions';

function bitmap(width: number, height: number, color = [161, 122, 86]) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const paint = (x0: number, y0: number, w: number, h: number, rgb: number[]) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) pixels.set([...rgb, 255], (y * width + x) * 4);
  };
  paint(0, 0, width, height, color);
  return { pixels, paint };
}

describe('source-aligned terrain illustration', () => {
  it('uses native terrain before colour, with explicit visual provenance for the eastern spine', () => {
    expect(terrainProfiles.plains.forestWidth).toBe(0);
    expect(terrainProfiles.swamp.forestWidth).toBe(0);
    expect(terrainProfiles.forest.forestWidth).toBeGreaterThan(
      terrainProfiles.mountains.forestWidth,
    );
    const p = { id: 'anuire-province-172', terrain: 'plains' as const },
      before = structuredClone(p);
    expect(terrainProfileAt(p, 1742, 918).origin).toBe('eastern-granite-chain');
    expect(terrainProfileAt(p, 1742, 918).relief).toBe('heavy-mountains');
    expect(p).toEqual(before);
    expect(terrainProfileAt({ ...p, id: 'ordinary-plain' }, 1742, 918).relief).toBe('none');
  });
  it('keeps both reviewed Baruk foothill provinces hilly despite green stippling, without changing nearby plains', () => {
    const scenario = structuredClone(developmentScenario),
      p = scenario.provinces[0]!;
    scenario.provinces = [p];
    p.terrain = 'plains';
    p.polygon = [[0, 0], [256, 0], [256, 256], [0, 256]];
    const { pixels } = bitmap(256, 256, [23, 95, 39]);
    for (const id of ['anuire-province-170', 'anuire-province-171']) {
      p.id = id;
      const before = structuredClone(scenario),
        anchors = traceTerrain(pixels, 256, 256, scenario);
      expect(anchors.length).toBeGreaterThan(4);
      expect(anchors.every((a) => a.kind === 'hills' && [10, 11].includes(a.variant))).toBe(true);
      expect(anchors.every((a) => a.evidence === 'reviewed-foothills')).toBe(true);
      expect(scenario).toEqual(before);
      for (const x of [1500, 1650]) expect(terrainProfileAt(p, x, 950).hills).toBe(true);
    }
    for (const id of ['anuire-province-184', 'anuire-province-185']) {
      p.id = id;
      expect(traceTerrain(pixels, 256, 256, scenario)).toEqual([]);
      expect(terrainProfileAt(p, 1580, 1030).hills).toBe(false);
    }
    expect(terrainProfileAt({ id: 'anuire-province-174', terrain: 'heavy-mountains' }, 1706, 814).relief)
      .toBe('heavy-mountains');
  });
  it('retains dithered coastal sea behind the original two-pixel image frame without flooding gray rocks', () => {
    const { pixels, paint } = bitmap(128, 128, [7, 7, 7]);
    paint(2, 20, 124, 80, [95, 95, 95]);
    for (let y = 20; y < 100; y++)
      for (let x = 2; x < 126; x++) if ((x + y) % 2) paint(x, y, 1, 1, [103, 91, 115]);
    paint(40, 110, 32, 8, [119, 119, 119]);
    const water = traceWater(pixels, 128, 128);
    expect(water[50 * 128 + 70]).toBe(2);
    expect(water[114 * 128 + 50]).toBe(0);
    expect(water[0]).toBe(0);
  });
  it('fills sea dither while protecting a native gray island footprint in the same colour', () => {
    const { pixels, paint } = bitmap(128, 128, [103, 91, 115]),
      p = structuredClone(developmentScenario.provinces[0]!);
    paint(40, 40, 32, 32, [95, 95, 95]);
    paint(90, 40, 20, 32, [95, 95, 95]);
    p.polygon = [
      [40, 40],
      [72, 40],
      [72, 72],
      [40, 72],
    ];
    const water = traceWater(pixels, 128, 128, [p]);
    expect(water[56 * 128 + 56]).toBe(0);
    expect(water[56 * 128 + 100]).toBe(2);
  });
  it('requires an enclosed native geometry hole instead of treating uncovered campaign land as a lake', () => {
    const { pixels, paint } = bitmap(256, 256), p = structuredClone(developmentScenario.provinces[0]!);
    paint(140, 90, 64, 64, [111, 111, 111]);
    for (let y = 90; y < 154; y++) for (let x = 140; x < 204; x++) if ((x + y) % 2) paint(x, y, 1, 1, [103, 91, 115]);
    p.polygon = [[0, 0], [96, 0], [96, 256], [0, 256]];
    expect(traceWater(pixels, 256, 256, [p])[120 * 256 + 170]).toBe(0);
    p.polygon = [[0, 0], [256, 0], [256, 256], [0, 256]];
    p.rings = [p.polygon, [[132, 82], [212, 82], [212, 162], [132, 162]]];
    expect(traceWater(pixels, 256, 256, [p])[120 * 256 + 170]).toBe(2);
  });
  it('confines evil forest character to Spiderfell and the approach to the Crown', () => {
    expect(forestCharacterAt(820, 1440)).toBe(-1);
    expect(forestCharacterAt(1522, 348)).toBe(1);
    // Living canopy gives way to blasted woodland as Pelt approaches the Crown.
    const approach = [740, 660, 600, 546, 460, 380].map((y) => forestCharacterAt(1498, y));
    expect(approach[3]).toBeGreaterThan(0.7);
    expect(approach).toEqual([...approach].sort((a, b) => a - b));
    for (const [x, y] of [
      [1154, 488],
      [1371, 860],
      [900, 1250],
      [500, 500],
    ])
      expect(forestCharacterAt(x!, y!)).toBe(0);
  });
  it('feathers regional art continuously without a province-shaped colour seam', () => {
    for (const [x, y] of [
      [822, 1462],
      [1522, 380],
    ]) {
      let last = forestCharacterAt(x!, y!);
      for (let dx = 1; dx < 420; dx++) {
        const current = forestCharacterAt(x! + dx, y!);
        expect(Math.abs(current - last)).toBeLessThan(0.025);
        last = current;
      }
      expect(last).toBe(0);
    }
  });
  it('finds an offset atlas gap instead of cutting off a canopy or including its neighbor', () => {
    const pixels = new Uint8ClampedArray(40 * 12 * 4);
    for (let y = 2; y < 9; y++)
      for (const [left, right] of [
        [2, 21],
        [24, 37],
      ])
        for (let x = left!; x < right!; x++) pixels.set([1, 2, 3, 255], (y * 40 + x) * 4);
    expect(terrainFrameBounds(pixels, 40, 12, 2, 1, true)).toEqual([
      { x: 2, y: 2, width: 19, height: 7 },
      { x: 24, y: 2, width: 13, height: 7 },
    ]);
  });
  it('recognizes brown-floor woodland using native forest context without filling the same plain', () => {
    const scenario = structuredClone(developmentScenario),
      p = scenario.provinces[0]!;
    p.polygon = [
      [0, 0],
      [256, 0],
      [256, 256],
      [0, 256],
    ];
    p.terrain = 'forest';
    scenario.provinces = [p];
    const { pixels, paint } = bitmap(256, 256, [87, 68, 46]);
    for (let y = 0; y < 256; y += 12) {
      paint(0, y, 256, 1, [23, 95, 39]);
      paint(0, y + 1, 256, 1, [63, 63, 63]);
    }
    const woods = traceTerrain(pixels, 256, 256, scenario);
    expect(woods.filter((a) => a.kind === 'forest').length).toBeGreaterThan(10);
    expect(woods.every((a) => a.kind === 'forest')).toBe(true);
    p.terrain = 'plains';
    expect(traceTerrain(pixels, 256, 256, scenario)).toEqual([]);
  });
  it('separates the elevated silhouette from contact with the ground using trimmed atlas proportions', () => {
    const a = {
      x: 100,
      y: 100,
      width: 80,
      heightScale: 0.8,
      aspect: 1.2,
      variant: 0,
      kind: 'ridge' as const,
    };
    const f = terrainFootprint(a);
    expect(f.height).toBeCloseTo(76.8);
    expect(f.top).toBeLessThan(a.y);
    expect(f.y - f.ry).toBeGreaterThan(f.top + f.height * 0.5);
    expect(f.rx * 2).toBeLessThan(a.width);
    const pixels = new Uint8ClampedArray(12 * 12 * 4);
    pixels.set([1, 2, 3, 255], (3 * 12 + 4) * 4);
    pixels.set([1, 2, 3, 255], (9 * 12 + 8) * 4);
    expect(terrainFrameBounds(pixels, 12, 12, 1, 1)).toEqual([{ x: 4, y: 3, width: 5, height: 7 }]);
  });
  it('fits a mountain base beside source-supported woodland without changing either province', () => {
    const scenario = structuredClone(developmentScenario),
      left = scenario.provinces[0]!,
      right = structuredClone(scenario.provinces[0]!);
    left.polygon = [
      [0, 0],
      [128, 0],
      [128, 256],
      [0, 256],
    ];
    left.terrain = 'mountains';
    right.polygon = [
      [128, 0],
      [256, 0],
      [256, 256],
      [128, 256],
    ];
    right.terrain = 'forest';
    right.id = 'neighboring-wood';
    scenario.provinces = [left, right];
    const { pixels, paint } = bitmap(256, 256);
    paint(104, 40, 24, 168, [119, 119, 119]);
    paint(128, 0, 128, 256, [23, 95, 39]);
    for (let y = 0; y < 256; y += 8) paint(128, y, 128, 2, [63, 63, 63]);
    const original = JSON.stringify(scenario),
      anchors = traceTerrain(pixels, 256, 256, scenario),
      ridges = anchors.filter((a) => a.kind === 'ridge');
    expect(ridges.length).toBeGreaterThan(0);
    expect(ridges.some((a) => a.fit)).toBe(true);
    expect(ridges.every((a) => terrainFootprint(a).right < 165)).toBe(true);
    expect(anchors.some((a) => a.kind === 'forest' && a.provinceId === right.id)).toBe(true);
    expect(JSON.stringify(scenario)).toBe(original);
    // The identical rock band can continue over an administrative border.
    right.terrain = 'mountains';
    paint(128, 0, 128, 256, [161, 122, 86]);
    paint(128, 40, 30, 168, [119, 119, 119]);
    const continuous = traceTerrain(pixels, 256, 256, scenario).filter((a) => a.kind === 'ridge');
    expect(
      continuous.some((a) => a.provinceId === left.id && terrainFootprint(a).right > 128),
    ).toBe(true);
  });
  it('separates isolated mountain strokes from identically colored connected sea and rivers', () => {
    const { pixels, paint } = bitmap(128, 128);
    const palette = [83, 75, 95];
    paint(0, 0, 12, 128, palette);
    paint(12, 38, 56, 4, palette);
    paint(78, 20, 7, 8, palette);
    paint(70, 80, 40, 10, palette);
    const water = traceWater(pixels, 128, 128);
    expect(water[50 * 128 + 5]).toBe(2);
    expect(water[40 * 128 + 45]).toBe(2);
    expect(water[24 * 128 + 80]).toBe(0);
    expect(water[85 * 128 + 90]).toBe(2);
  });
  it('includes gray coastal dithering but keeps an isolated gray mountain cluster on land', () => {
    const { pixels, paint } = bitmap(160, 160);
    paint(0, 0, 18, 160, [83, 75, 95]);
    paint(0, 0, 5, 160, [123, 123, 123]);
    paint(70, 70, 42, 20, [119, 119, 119]);
    const water = traceWater(pixels, 160, 160);
    expect(water[50 * 160 + 2]).toBe(2);
    expect(water[80 * 160 + 90]).toBe(0);
  });
  it('never places forests on plain soil or water and leaves scenario inputs unchanged', () => {
    const scenario = structuredClone(developmentScenario),
      original = JSON.stringify(scenario);
    const { pixels, paint } = bitmap(256, 256);
    expect(traceTerrain(pixels, 256, 256, scenario).some((a) => a.kind === 'forest')).toBe(false);
    paint(0, 0, 256, 256, [83, 75, 95]);
    expect(traceTerrain(pixels, 256, 256, scenario)).toEqual([]);
    expect(JSON.stringify(scenario)).toBe(original);
  });
  it('derives repeatable independent illustration variation without advancing a campaign PRNG', () => {
    const scenario = structuredClone(developmentScenario);
    scenario.provinces[0]!.polygon = [
      [0, 0],
      [256, 0],
      [256, 256],
      [0, 256],
    ];
    scenario.provinces[0]!.terrain = 'forest';
    const { pixels } = bitmap(256, 256, [23, 95, 39]);
    const a = traceTerrain(pixels, 256, 256, scenario),
      b = traceTerrain(pixels, 256, 256, scenario);
    expect(a.length).toBeGreaterThan(3);
    expect(a).toEqual(b);
    expect(new Set(a.map((p) => p.variant)).size).toBeGreaterThan(1);
    expect(a.every((p) => p.x >= 0 && p.y >= 0 && p.x < 256 && p.y < 256)).toBe(true);
  });
  it('finds a narrow rock group missed by the old 78-pixel grid without filling the mountain province', () => {
    const scenario = structuredClone(developmentScenario);
    const p = scenario.provinces[0]!;
    scenario.provinces = [p];
    p.polygon = [
      [0, 0],
      [256, 0],
      [256, 256],
      [0, 256],
    ];
    p.terrain = 'mountains';
    const { pixels, paint } = bitmap(256, 256);
    paint(121, 121, 12, 14, [119, 119, 119]);
    const anchors = traceTerrain(pixels, 256, 256, scenario);
    expect(anchors).toHaveLength(1);
    expect(Math.hypot(anchors[0]!.x - 127, anchors[0]!.y - 128)).toBeLessThan(16);
    expect(anchors[0]!.evidence).toBe('retail-rock');
    expect(auditTerrainPlacement(scenario, anchors).suspicious).toEqual([]);
    p.polygon = [
      [200, 200],
      [256, 200],
      [256, 256],
      [200, 256],
    ];
    expect(traceTerrain(pixels, 256, 256, scenario)).toEqual([]);
  });
  it('uses gentle hill frames and makes a small lowland wood lower than dense forest', () => {
    const scenario = structuredClone(developmentScenario);
    const p = scenario.provinces[0]!;
    scenario.provinces = [p];
    p.polygon = [
      [0, 0],
      [256, 0],
      [256, 256],
      [0, 256],
    ];
    p.terrain = 'hills';
    const soil = bitmap(256, 256);
    const hills = traceTerrain(soil.pixels, 256, 256, scenario);
    expect(hills.length).toBeGreaterThan(0);
    expect(hills.every((a) => a.kind === 'hills' && a.variant >= 10 && a.heightScale! < 1)).toBe(
      true,
    );
    p.terrain = 'forest';
    const dense = bitmap(256, 256, [23, 95, 39]);
    const sparse = bitmap(256, 256);
    // Narrow bands give a small patch of canopy rather than an entire dark forest.
    for (let y = 0; y < 256; y += 8) sparse.paint(0, y, 256, 2, [23, 95, 39]);
    const large = traceTerrain(dense.pixels, 256, 256, scenario);
    const small = traceTerrain(sparse.pixels, 256, 256, scenario);
    expect(small.length).toBeGreaterThan(0);
    expect(Math.max(...small.map((a) => a.heightScale!))).toBeLessThan(
      Math.min(...large.map((a) => a.heightScale!)),
    );
    expect(Math.max(...small.map((a) => a.width))).toBeLessThan(
      Math.min(...large.map((a) => a.width)),
    );
  });
  it('preserves woodland across forest boundaries but stops it at plains despite identical source colours', () => {
    const scenario = structuredClone(developmentScenario),
      left = scenario.provinces[0]!,
      right = structuredClone(scenario.provinces[0]!);
    left.polygon = [
      [0, 0],
      [128, 0],
      [128, 256],
      [0, 256],
    ];
    right.polygon = [
      [128, 0],
      [256, 0],
      [256, 256],
      [128, 256],
    ];
    left.terrain = 'forest';
    right.terrain = 'forest';
    right.id = 'woodland-boundary';
    scenario.provinces = [left, right];
    const { pixels, paint } = bitmap(256, 256);
    for (let y = 0; y < 256; y += 8) {
      paint(0, y, 256, 3, [23, 95, 39]);
      paint(0, y + 3, 256, 1, [63, 63, 63]);
    }
    const anchors = traceTerrain(pixels, 256, 256, scenario).filter((a) => a.kind === 'forest');
    expect(anchors.filter((a) => a.provinceId === left.id).length).toBeGreaterThan(3);
    expect(anchors.filter((a) => a.provinceId === right.id).length).toBeGreaterThan(3);
    expect(anchors.some((a) => Math.abs(a.x - 128) < 25)).toBe(true);
    expect(anchors.every((a) => a.evidence === 'retail-canopy')).toBe(true);
    right.terrain = 'plains';
    const bounded = traceTerrain(pixels, 256, 256, scenario).filter((a) => a.kind === 'forest');
    expect(bounded.filter((a) => a.provinceId === left.id).length).toBeGreaterThan(3);
    expect(bounded.some((a) => a.provinceId === right.id)).toBe(false);
  });
  it("removes the false Sielwode extension from Soileite and Hope's Demise without thinning neighboring forest", () => {
    const scenario = structuredClone(developmentScenario),
      woods = scenario.provinces[0]!,
      open = structuredClone(woods);
    woods.id = 'anuire-province-205';
    woods.terrain = 'forest';
    woods.polygon = [
      [0, 0],
      [128, 0],
      [128, 256],
      [0, 256],
    ];
    open.id = 'ordinary-plain';
    open.terrain = 'forest';
    open.polygon = [
      [128, 0],
      [256, 0],
      [256, 256],
      [128, 256],
    ];
    scenario.provinces = [woods, open];
    const { pixels, paint } = bitmap(256, 256, [23, 95, 39]);
    for (let y = 0; y < 256; y += 8) paint(0, y, 256, 2, [63, 63, 63]);
    const baseline = traceTerrain(pixels, 256, 256, scenario);
    expect(baseline.some((a) => a.provinceId === open.id)).toBe(true);
    for (const [id, terrain] of [
      ['anuire-province-107', 'plains'],
      ['anuire-province-103', 'swamp'],
    ] as const) {
      open.id = id;
      open.terrain = terrain;
      const before = JSON.stringify(scenario),
        result = traceTerrain(pixels, 256, 256, scenario);
      expect(result.some((a) => a.kind === 'forest' && a.provinceId === id)).toBe(false);
      expect(result.filter((a) => a.provinceId === woods.id).length).toBeGreaterThan(3);
      expect(JSON.stringify(scenario)).toBe(before);
    }
  });
  it('moves the northern Rivenrock peaks into its western arm and retains their prior visual placement', () => {
    const a = {
      x: 1678,
      y: 838,
      width: 116,
      aspect: 0.855,
      heightScale: 0.95,
      variant: 2,
      kind: 'ridge' as const,
      provinceId: 'anuire-province-174',
      fit: { x: 1702, y: 838, width: 116, before: 0.2, after: 0 },
    };
    const before = structuredClone(a),
      moved = placeRegionalRelief(a),
      f = terrainFootprint(moved);
    expect(moved.x).toBeLessThan(a.x - 50);
    expect(f.top).toBeGreaterThan(836);
    expect(f.bottom).toBeLessThan(876);
    expect(moved.layout).toEqual({ x: a.x, y: a.y, width: a.width, heightScale: a.heightScale });
    expect(a).toEqual(before);
    expect(placeRegionalRelief({ ...a, provinceId: 'other-range' })).toEqual({
      ...a,
      provinceId: 'other-range',
    });
  });
  it('keeps wooded riverbanks without placing a canopy anchor on the river', () => {
    const scenario = structuredClone(developmentScenario),
      p = scenario.provinces[0]!;
    scenario.provinces = [p];
    p.terrain = 'forest';
    p.polygon = [
      [0, 0],
      [256, 0],
      [256, 256],
      [0, 256],
    ];
    const { pixels, paint } = bitmap(256, 256, [23, 95, 39]);
    paint(125, 0, 2, 256, [83, 75, 95]);
    const water = traceWater(pixels, 256, 256),
      anchors = traceTerrain(pixels, 256, 256, scenario, water);
    expect(anchors.some((a) => Math.abs(a.x - 126) < 42)).toBe(true);
    expect(anchors.every((a) => !water[Math.floor(a.y) * 256 + Math.floor(a.x)])).toBe(true);
  });
});
