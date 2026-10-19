import { describe, expect, it } from 'vitest';
import type { Scenario } from '../packages/core/schema';
import { buildBaseTerrain, paintTerrainPage } from '../packages/rendering/base-terrain';
import { developmentScenario } from './fixtures/scenario';
import { prepareWoodlandLowlands } from '../packages/rendering/woodland-lowlands';

type Province = Scenario['provinces'][number];
function province(
  id: string,
  terrain: Province['terrain'],
  x: number,
  y: number,
  w: number,
  h: number,
): Province {
  return {
    ...structuredClone(developmentScenario.provinces[0]!),
    id,
    terrain,
    center: [x + w / 2, y + h / 2],
    polygon: [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    rings: undefined,
    original: { level: 6 },
  };
}
function fixture(provinces: Province[]) {
  const width = 128,
    height = 96,
    water = new Uint8Array(width * height),
    pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set([58, 110, 45, 255], i);
  for (let y = 0; y < height; y++) water[y * width + 10] = 1;
  const material = {
      width: 2,
      height: 2,
      pixels: new Uint8ClampedArray([
        137, 145, 78, 255, 163, 148, 88, 255, 103, 120, 66, 255, 150, 132, 80, 255,
      ]),
    },
    base = { hills: material, granite: material },
    ground = { lowlands: material, woodland: material };
  const run = (enabled: boolean) =>
    buildBaseTerrain(pixels, width, height, water, provinces, [material], [], undefined, {
      ...base,
      ...(enabled ? { ground } : {}),
    });
  return { before: run(false), after: run(true) };
}

describe('forest and lowland underpainting', () => {
  it('retains woodland ground in mixed outcrop regions while protecting major relief', () => {
    const columns = 33,
      rows = 25,
      count = columns * rows,
      seeds = {
        hills: new Float32Array(count),
        mountains: new Float32Array(count).fill(0.24),
        harsh: new Float32Array(count),
      },
      run = () =>
        prepareWoodlandLowlands(
          [province('mixed', 'forest', 0, 0, 128, 96)],
          128,
          96,
          new Uint8Array(128 * 96),
          columns,
          rows,
          4,
          seeds,
          new Float32Array(count).fill(1),
          new Float32Array(count),
        );
    expect(run().mask[48 * 128 + 64]).toBe(255);
    seeds.mountains.fill(0.85);
    expect(run().mask.some(Boolean)).toBe(false);
  });
  it('changes supported ground while preserving marshes, one-pixel marsh holes, water and relief at close zoom', () => {
    const plain = province('plain', 'plains', 0, 0, 64, 64),
      thinMarsh = province('thin-marsh', 'swamp', 22, 20, 1, 20);
    plain.rings = [plain.polygon, thinMarsh.polygon];
    const provinces = [
        plain,
        thinMarsh,
        province('forest', 'forest', 64, 0, 64, 64),
        province('hill', 'hills', 0, 64, 64, 32),
        province('mountain', 'mountains', 64, 64, 32, 32),
        province('marsh', 'swamp', 96, 64, 32, 32),
      ],
      snapshot = structuredClone(provinces),
      { before, after } = fixture(provinces);
    expect(after.surface).toBeDefined();
    expect(after.surface!.mask.subarray(64 * 128).some(Boolean)).toBe(false);
    expect(after.landscape!.fields).toEqual(before.landscape!.fields);
    for (const [x, y, width, height] of [
      [22, 20, 1, 20],
      [10, 0, 1, 64],
      [0, 64, 12, 8],
      [64, 64, 8, 8],
      [96, 64, 8, 8],
    ]) {
      const page = { x: x!, y: y!, width: width!, height: height!, resolution: 4 },
        a = paintTerrainPage(before, page, 0),
        b = paintTerrainPage(after, page, 0);
      expect(b.ground).toEqual(a.ground);
      expect(b.water).toEqual(a.water);
    }
    for (const x of [32, 80]) {
      const page = { x, y: 40, width: 8, height: 8, resolution: 4 };
      expect(paintTerrainPage(after, page).ground).not.toEqual(
        paintTerrainPage(before, page).ground,
      );
    }
    expect(provinces).toEqual(snapshot);
    expect(before.surface).toBeUndefined();
  });
  it('unites adjoining forests before feathering rather than making province-shaped patches', () => {
    const single = fixture([province('one', 'forest', 0, 0, 128, 96)]).after,
      divided = fixture([
        province('west', 'forest', 0, 0, 64, 96),
        province('east', 'forest', 64, 0, 64, 96),
      ]).after;
    expect(divided.surface!.mask).toEqual(single.surface!.mask);
    expect(divided.surface!.woodland).toEqual(single.surface!.woodland);
    const page = { x: 56, y: 32, width: 16, height: 16, resolution: 4 };
    expect(paintTerrainPage(divided, page).ground).toEqual(paintTerrainPage(single, page).ground);
  });
  it('samples the same world-space materials in overlapping page gutters at every detail level', () => {
    const { after } = fixture([province('forest', 'forest', 0, 0, 128, 96)]);
    for (const resolution of [1, 2, 4]) {
      const west = paintTerrainPage(after, { x: 60, y: 32, width: 4, height: 16, resolution }),
        east = paintTerrainPage(after, { x: 64, y: 32, width: 4, height: 16, resolution });
      for (let y = 0; y < west.height; y++)
        for (let x = 0; x < 4; x++) {
          const a = (y * west.width + 4 * resolution + x) * 4,
            b = (y * east.width + x) * 4;
          expect(west.ground.slice(a, a + 4)).toEqual(east.ground.slice(b, b + 4));
        }
    }
  });
});
