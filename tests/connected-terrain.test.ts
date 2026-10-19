import { describe, expect, it } from 'vitest';
import { connectLandscape, keepsReliefOverlay } from '../packages/rendering/connected-terrain';
import type { TerrainAnchor } from '../packages/rendering/terrain-placement';
import { buildBaseTerrain, paintTerrainPage } from '../packages/rendering/base-terrain';

function landscapeFixture() {
  const columns = 33,
    rows = 25,
    step = 4,
    width = 128,
    seeds = {
      hills: new Float32Array(columns * rows).fill(1),
      mountains: new Float32Array(columns * rows),
      harsh: new Float32Array(columns * rows),
    },
    water = new Uint8Array(width * 96),
    art = {
      width: 2,
      height: 2,
      pixels: new Uint8ClampedArray([
        140, 130, 70, 255, 180, 160, 100, 255, 110, 100, 70, 255, 160, 150, 90, 255,
      ]),
    },
    materials = { hills: art, granite: art },
    anchors: TerrainAnchor[] = [
      { x: 40, y: 48, width: 54, variant: 10, kind: 'hills', provinceId: 'west' },
      { x: 88, y: 48, width: 54, variant: 11, kind: 'hills', provinceId: 'east' },
    ];
  const run = (objects = anchors) =>
    connectLandscape(seeds, objects, columns, rows, step, water, width, materials, () => 0.5);
  return { columns, rows, step, width, seeds, water, materials, anchors, run };
}

describe('shared Anuire landscape', () => {
  it('connects supported terrain across administrative borders with identical fields after repartitioning', () => {
    const f = landscapeFixture(),
      before = structuredClone(f.seeds),
      result = f.run();
    expect(result.links).toBe(1);
    expect(result.crossProvinceLinks).toBe(1);
    const sameProvince = f.run(f.anchors.map((a) => ({ ...a, provinceId: 'one-province' })));
    expect(sameProvince.fields).toEqual(result.fields);
    expect(sameProvince.crossProvinceLinks).toBe(0);
    expect(f.seeds).toEqual(before);
    expect(result.fields[(12 * f.columns + 16) * 4]).toBeGreaterThan(0.7);
  });
  it('does not connect mountain/hill crests over a river or unsupported lowland', () => {
    const f = landscapeFixture();
    for (let y = 0; y < 96; y++) f.water[y * 128 + 63] = 1;
    expect(f.run().links).toBe(0);
    f.water.fill(0);
    for (let y = 0; y < f.rows; y++) f.seeds.hills[y * f.columns + 16] = 0;
    expect(f.run().links).toBe(0);
    f.seeds.hills.fill(0);
    expect([...f.run([]).fields].every((v) => v === 0)).toBe(true);
  });
  it('keeps painted pages continuous at a cross-province tile edge without reducing source overlay records', () => {
    const f = landscapeFixture(),
      pixels = new Uint8ClampedArray(128 * 96 * 4);
    for (let i = 0; i < pixels.length; i += 4) pixels.set([130, 140, 70, 255], i);
    const model = buildBaseTerrain(pixels, 128, 96, f.water, [], [f.materials.hills]);
    model.landscape = f.run();
    const west = paintTerrainPage(model, { x: 60, y: 32, width: 4, height: 16, resolution: 4 }),
      east = paintTerrainPage(model, { x: 64, y: 32, width: 4, height: 16, resolution: 4 });
    for (let y = 0; y < west.height; y++)
      for (let x = 0; x < 4; x++) {
        const a = (y * west.width + 16 + x) * 4,
          b = (y * east.width + x) * 4;
        expect(west.ground.slice(a, a + 4)).toEqual(east.ground.slice(b, b + 4));
      }
    expect(f.anchors.every((a) => !keepsReliefOverlay(a))).toBe(true);
    expect(keepsReliefOverlay({ ...f.anchors[0]!, kind: 'forest' })).toBe(true);
    expect(keepsReliefOverlay({ ...f.anchors[0]!, kind: 'ridge', width: 105 })).toBe(true);
    expect(f.anchors.length).toBe(2);
  });
});
