import { describe, expect, it } from 'vitest';
import {
  buildBaseTerrain,
  paintTerrainPage,
  shorelineDistance,
  visibleTerrainPages,
  TERRAIN_CACHE_BYTES,
  TERRAIN_GUTTER,
  terrainPageKey,
} from '../packages/rendering/base-terrain';
import type { TerrainAnchor } from '../packages/rendering/terrain-placement';
import { developmentScenario } from './fixtures/scenario';
import { insideProvince } from '../packages/core/geometry';
import { createThoralinarPilot } from '../packages/rendering/terrain-pilot';

function fixture(anchors: TerrainAnchor[] = []) {
  const width = 64,
    height = 64,
    water = new Uint8Array(width * height);
  const pixels = new Uint8ClampedArray(width * height * 4),
    material = new Uint8ClampedArray(16 * 16 * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      water[y * width + x] = x < 18 ? 2 : 0;
      pixels.set(x < 18 ? [83, 75, 95, 255] : [161, 122, 86, 255], (y * width + x) * 4);
    }
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) material.set([125 + x, 136 + y, 65 + x, 255], (y * 16 + x) * 4);
  return {
    water,
    pixels,
    model: buildBaseTerrain(
      pixels,
      width,
      height,
      water,
      [],
      [{ width: 16, height: 16, pixels: material }],
      anchors,
    ),
  };
}

describe('reconstructed terrain pages', () => {
  it('confines illustrated pilot ground to the province interior, including holes and high-zoom sampling', () => {
    const { model } = fixture(), p = structuredClone(developmentScenario.provinces[0]!);
    p.polygon = [[1040, 1200], [1224, 1200], [1224, 1328], [1040, 1328]];
    p.rings = [p.polygon, [[1060, 1220], [1072, 1220], [1072, 1232], [1060, 1232]]];
    const before = structuredClone(p),
      page = { x: 1032, y: 1192, width: 48, height: 48, resolution: 4 },
      baseline = paintTerrainPage(model, page),
      pilot = createThoralinarPilot(p, { width: 1, height: 1, pixels: new Uint8ClampedArray([202, 171, 83, 255]) });
    model.pilot = pilot;
    const result = paintTerrainPage(model, page);
    let changes = 0, outsideChanges = 0;
    for (let y = 0; y < result.height; y++) for (let x = 0; x < result.width; x++) {
      const offset = (y * result.width + x) * 4,
        changed = result.ground[offset] !== baseline.ground[offset] ||
          result.ground[offset + 1] !== baseline.ground[offset + 1] ||
          result.ground[offset + 2] !== baseline.ground[offset + 2],
        wx = page.x + (x - TERRAIN_GUTTER + 0.5) / page.resolution,
        wy = page.y + (y - TERRAIN_GUTTER + 0.5) / page.resolution;
      if (changed && !insideProvince(wx, wy, p)) outsideChanges++;
      if (changed) changes++;
    }
    expect(outsideChanges).toBe(0);
    expect(changes).toBeGreaterThan(400);
    expect(result.water).toEqual(baseline.water);
    expect(p).toEqual(before);
    model.pilot = undefined;
    expect(paintTerrainPage(model, page).ground).toEqual(baseline.ground);
  });
  it('samples the same painted relief across a real tile boundary at close zoom', () => {
    const { model } = fixture(), p = structuredClone(developmentScenario.provinces[0]!);
    p.polygon = [[1040, 1200], [1224, 1200], [1224, 1328], [1040, 1328]];
    const pixels = new Uint8ClampedArray([180, 160, 70, 255, 140, 130, 90, 255,
      210, 180, 90, 255, 130, 120, 80, 255]);
    model.pilot = createThoralinarPilot(p, { width: 2, height: 2, pixels });
    const top = paintTerrainPage(model, { x: 1100, y: 1276, width: 16, height: 4, resolution: 4 }),
      bottom = paintTerrainPage(model, { x: 1100, y: 1280, width: 16, height: 4, resolution: 4 });
    for (let y = 0; y < TERRAIN_GUTTER * 2; y++) {
      const row = top.width * 4;
      expect(top.ground.slice((16 + y) * row, (17 + y) * row))
        .toEqual(bottom.ground.slice(y * row, (y + 1) * row));
    }
  });
  it("keeps Soileite open and Hope's Demise marshy despite green source pixels and neighboring canopy skirts", () => {
    const { pixels, water, model } = fixture(),
      p = structuredClone(developmentScenario.provinces[0]!);
    p.polygon = [
      [20, 0],
      [64, 0],
      [64, 64],
      [20, 64],
    ];
    for (let y = 0; y < 64; y++)
      for (let x = 20; x < 64; x++) pixels.set([23, 95, 39, 255], (y * 64 + x) * 4);
    const anchor: TerrainAnchor = { x: 40, y: 24, width: 48, kind: 'forest', variant: 0 };
    for (const [id, terrain] of [
      ['anuire-province-107', 'plains'],
      ['anuire-province-103', 'swamp'],
    ] as const) {
      p.id = id;
      p.terrain = terrain;
      const base = buildBaseTerrain(pixels, 64, 64, water, [p], model.materials, [anchor]),
        i = (8 * base.columns + 10) * 11;
      expect(base.fields[i]).toBe(0);
      expect(base.fields[i + 8]).toBe(0);
      expect(base.fields[i + 3]).toBe(terrain === 'swamp' ? 1 : 0);
    }
  });
  it('keeps source-supported forest floor under a neighboring rocky transition', () => {
    const { pixels, water, model } = fixture(),
      p = structuredClone(developmentScenario.provinces[0]!);
    p.terrain = 'forest';
    p.polygon = [
      [32, 0],
      [64, 0],
      [64, 64],
      [32, 64],
    ];
    for (let y = 0; y < 64; y++)
      for (let x = 32; x < 64; x++)
        pixels.set(
          y % 8 === 0 ? [23, 95, 39, 255] : y % 8 === 1 ? [63, 63, 63, 255] : [87, 68, 46, 255],
          (y * 64 + x) * 4,
        );
    const a = buildBaseTerrain(pixels, 64, 64, water, [p], model.materials),
      b = buildBaseTerrain(pixels, 64, 64, water, [p], model.materials, [
        {
          x: 29,
          y: 24,
          width: 48,
          heightScale: 0.8,
          aspect: 0.85,
          kind: 'ridge',
          variant: 0,
          evidence: 'retail-rock',
        },
      ]);
    const page = { x: 0, y: 0, width: 64, height: 64, resolution: 2 },
      plain = paintTerrainPage(a, page),
      rocky = paintTerrainPage(b, page);
    const pixel = (v: typeof plain, x: number, y: number) =>
      v.ground.slice(
        ((y * 2 + 2) * v.width + x * 2 + 2) * 4,
        ((y * 2 + 2) * v.width + x * 2 + 2) * 4 + 3,
      );
    expect(pixel(rocky, 48, 35)).toEqual(pixel(plain, 48, 35));
    expect(pixel(rocky, 25, 35)).not.toEqual(pixel(plain, 25, 35));
    expect(rocky.water).toEqual(plain.water);
  });
  it('keeps source water and narrow rivers, closes sea stippling, and leaves the source unchanged', () => {
    const water = new Uint8Array(32 * 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 12; x++) water[y * 32 + x] = 2;
    for (let x = 12; x < 29; x++) water[18 * 32 + x] = 2;
    water[8 * 32 + 5] = 0;
    const original = water.slice(),
      distance = shorelineDistance(water, 32, 32);
    expect(water).toEqual(original);
    expect(distance[8 * 32 + 5]).toBeLessThan(0);
    expect(distance[18 * 32 + 26]).toBeLessThan(0);
    expect(distance[26 * 32 + 26]).toBeGreaterThan(0);
    for (let i = 0; i < water.length; i++) if (water[i]) expect(distance[i]).toBeLessThan(0);
  });
  it('produces identical overlapping gutter pixels across horizontal and vertical chunk boundaries', () => {
    const { model } = fixture([
      {
        x: 32,
        y: 32,
        width: 38,
        heightScale: 0.8,
        kind: 'ridge',
        variant: 0,
        evidence: 'retail-rock',
      },
    ]);
    const a = paintTerrainPage(model, { x: 0, y: 0, width: 32, height: 32, resolution: 4 });
    const right = paintTerrainPage(model, { x: 32, y: 0, width: 32, height: 32, resolution: 4 });
    const bottom = paintTerrainPage(model, { x: 0, y: 32, width: 32, height: 32, resolution: 4 });
    for (const field of ['ground', 'water'] as const) {
      for (let n = 0; n < 128; n++)
        for (let k = 0; k < 4; k++) {
          const y = n + TERRAIN_GUTTER;
          const p = (image: typeof a, x: number, y: number) => {
            const pixel = image[field]?.slice(
              (y * image.width + x) * 4,
              (y * image.width + x) * 4 + 4,
            );
            return pixel?.[3] ? pixel : new Uint8ClampedArray(4);
          };
          expect(p(a, 128 + k, y)).toEqual(p(right, k, y));
          expect(p(a, y, 128 + k)).toEqual(p(bottom, y, k));
        }
    }
  });
  it('paints opaque deterministic ground at four texels per world unit without changing inputs', () => {
    const { model, pixels, water } = fixture(),
      before = pixels.slice(),
      sourceWater = water.slice();
    const page = { x: 0, y: 0, width: 32, height: 32, resolution: 4 };
    const a = paintTerrainPage(model, page),
      b = paintTerrainPage(model, page);
    expect(a.width).toBe(132);
    expect(a.ground).toEqual(b.ground);
    expect(a.ground.filter((_, i) => i % 4 === 3).every((alpha) => alpha === 255)).toBe(true);
    expect(pixels).toEqual(before);
    expect(water).toEqual(sourceWater);
  });
  it('bounds visible tile detail, covers native edge dimensions, and uses the overview at broad zoom', () => {
    const pages = visibleTerrainPages(1920, 2234, -5000, -6000, 3.35, 1034, 580);
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.every((p) => p.x + p.width <= 1920 && p.y + p.height <= 2234)).toBe(true);
    expect(new Set(pages.map(terrainPageKey)).size).toBe(pages.length);
    expect(
      pages.reduce(
        (n, p) => n + (p.width * p.resolution + 4) * (p.height * p.resolution + 4) * 8,
        0,
      ),
    ).toBeLessThanOrEqual(TERRAIN_CACHE_BYTES);
    expect(visibleTerrainPages(1920, 2234, 100, 0, 0.26, 1034, 580)).toEqual([]);
  });
  it('grounds verified footprints locally while keeping water, distant land and page alignment intact', () => {
    const plain = fixture(),
      rocky = fixture([
        {
          x: 47,
          y: 30,
          width: 25,
          heightScale: 0.8,
          kind: 'ridge',
          variant: 0,
          evidence: 'retail-rock',
        },
      ]);
    const woodland = fixture([
      { x: 47, y: 30, width: 25, kind: 'forest', variant: 0, evidence: 'retail-canopy' },
    ]);
    const page = { x: 0, y: 0, width: 64, height: 64, resolution: 2 };
    const a = paintTerrainPage(plain.model, page),
      b = paintTerrainPage(rocky.model, page),
      c = paintTerrainPage(woodland.model, page);
    const pixel = (p: typeof a, x: number, y: number) =>
      p.ground.slice(
        ((y * 2 + TERRAIN_GUTTER) * p.width + x * 2 + TERRAIN_GUTTER) * 4,
        ((y * 2 + TERRAIN_GUTTER) * p.width + x * 2 + TERRAIN_GUTTER) * 4 + 3,
      );
    expect(pixel(b, 47, 36)).not.toEqual(pixel(a, 47, 36));
    expect(pixel(c, 47, 30).reduce((n, v) => n + v, 0)).toBeLessThan(
      pixel(a, 47, 30).reduce((n, v) => n + v, 0),
    );
    expect(pixel(b, 22, 56)).toEqual(pixel(a, 22, 56));
    expect(pixel(c, 22, 56)).toEqual(pixel(a, 22, 56));
    expect(b.water).toEqual(a.water);
    expect(c.water).toEqual(a.water);
    expect(rocky.water).toEqual(plain.water);
    expect(rocky.pixels).toEqual(plain.pixels);
  });
});
