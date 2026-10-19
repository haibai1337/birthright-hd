import type { Scenario } from '../core/schema';
import { provinceRings } from '../core/geometry';
import { soften, type LandscapeSeeds } from './connected-terrain';

export interface WoodlandLowlands {
  /** Full native resolution: even a narrow marsh, island hole or river stays excluded. */
  mask: Uint8Array;
  woodland: Float32Array;
  cultivation: Float32Array;
}

/** One shared underpainting, not individual province paintings. Administrative
 * boundaries only delimit supported terrain; adjacent eligible areas are united
 * BEFORE the inner feather. No new agriculture/road records are created. */
export function prepareWoodlandLowlands(
  provinces: Scenario['provinces'],
  width: number,
  height: number,
  water: Uint8Array,
  columns: number,
  rows: number,
  step: number,
  relief: LandscapeSeeds,
  forest: Float32Array,
  cultivation: Float32Array,
): WoodlandLowlands {
  const mask = new Uint8Array(width * height);
  for (const p of provinces) {
    if (!['forest', 'plains', 'coast'].includes(p.terrain)) continue;
    const rings = provinceRings(p),
      points = rings.flat();
    const top = Math.max(0, Math.ceil(Math.min(...points.map((p) => p[1])) - 0.5)),
      bottom = Math.min(height, Math.ceil(Math.max(...points.map((p) => p[1])) - 0.5));
    // Same even-odd geometry as hit testing; scanlines avoid millions of polygon searches.
    for (let y = top; y < bottom; y++) {
      const crossings: number[] = [],
        sy = y + 0.5;
      for (const ring of rings)
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const a = ring[i]!,
            b = ring[j]!;
          if (a[1] > sy !== b[1] > sy)
            crossings.push(a[0] + ((sy - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
        }
      crossings.sort((a, b) => a - b);
      for (let k = 0; k + 1 < crossings.length; k += 2) {
        const left = Math.max(0, Math.ceil(crossings[k]! - 0.5)),
          right = Math.min(width, Math.ceil(crossings[k + 1]! - 0.5));
        mask.fill(8, y * width + left, y * width + right);
      }
    }
  }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      const gx = Math.floor(x / step),
        gy = Math.floor(y / step),
        a = gy * columns + gx,
        b = gy * columns + Math.min(columns - 1, gx + 1),
        c = Math.min(rows - 1, gy + 1) * columns + gx,
        d = c + (b - a);
      // Protect visual hills/mountains in native plains too (e.g. Baruk-Azhik).
      // A 0.24 mixed outcrop is still woodland (notably Pelt), not a mountain province.
      if (
        water[i] ||
        relief.hills[a] ||
        relief.hills[b] ||
        relief.hills[c] ||
        relief.hills[d] ||
        relief.mountains[a]! >= 0.4 ||
        relief.mountains[b]! >= 0.4 ||
        relief.mountains[c]! >= 0.4 ||
        relief.mountains[d]! >= 0.4
      )
        mask[i] = 0;
    }
  // Inner-only eight-unit feather. Never grows into protected terrain or water.
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x) mask[i] = Math.min(mask[i]!, mask[i - 1]! + 1);
      if (y) mask[i] = Math.min(mask[i]!, mask[i - width]! + 1);
    }
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x + 1 < width) mask[i] = Math.min(mask[i]!, mask[i + 1]! + 1);
      if (y + 1 < height) mask[i] = Math.min(mask[i]!, mask[i + width]! + 1);
    }
  for (let i = 0; i < mask.length; i++) {
    const t = mask[i]! / 8;
    mask[i] = Math.round(t * t * (3 - 2 * t) * 255);
  }
  return {
    mask,
    woodland: soften(forest, columns, rows, 4),
    cultivation: soften(cultivation, columns, rows, 6),
  };
}
