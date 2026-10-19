import type { TerrainMaterial } from './base-terrain';
import type { TerrainAnchor } from './terrain-placement';

export interface LandscapeMaterials {
  hills: TerrainMaterial;
  granite: TerrainMaterial;
  ground?: { lowlands: TerrainMaterial; woodland: TerrainMaterial };
}
export interface LandscapeSeeds {
  hills: Float32Array;
  mountains: Float32Array;
  harsh: Float32Array;
}
export interface ConnectedLandscape {
  fields: Float32Array;
  materials: LandscapeMaterials;
  links: number;
  crossProvinceLinks: number;
}
const clamp = (v: number) => Math.max(0, Math.min(1, v));
export function soften(input: Float32Array, columns: number, rows: number, radius = 3) {
  let field = input.slice();
  // Shared world-space overlaps, never separate province masks or random seeds.
  for (let pass = 0; pass < 2; pass++) {
    const horizontal = field.slice(),
      vertical = field.slice();
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < columns; x++) {
        let value = 0;
        for (let dx = -radius; dx <= radius; dx++)
          value +=
            field[y * columns + Math.max(0, Math.min(columns - 1, x + dx))]! *
            (radius + 1 - Math.abs(dx));
        horizontal[y * columns + x] = value / (radius + 1) ** 2;
      }
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < columns; x++) {
        let value = 0;
        for (let dy = -radius; dy <= radius; dy++)
          value +=
            horizontal[Math.max(0, Math.min(rows - 1, y + dy)) * columns + x]! *
            (radius + 1 - Math.abs(dy));
        vertical[y * columns + x] = value / (radius + 1) ** 2;
      }
    field = vertical;
  }
  return field;
}

/** Plan ridges from recovered feature anchors and native terrain support across
 * the whole world. Administrative IDs are recorded for diagnostics, never used
 * as barriers. Unsupported lowlands and original water interrupt a ridge link. */
export function connectLandscape(
  seeds: LandscapeSeeds,
  anchors: TerrainAnchor[],
  columns: number,
  rows: number,
  step: number,
  water: Uint8Array,
  width: number,
  materials: LandscapeMaterials,
  noise: (x: number, y: number) => number,
): ConnectedLandscape {
  const shoulders = seeds.hills.map((v, k) => Math.max(v, seeds.mountains[k]! * 0.72));
  const hills = soften(shoulders, columns, rows, 6),
    mountains = soften(seeds.mountains, columns, rows),
    harsh = soften(seeds.harsh, columns, rows),
    ridge = new Float32Array(columns * rows),
    relief = anchors.filter((a) => a.kind !== 'forest');
  const index = (x: number, y: number) =>
    Math.max(0, Math.min(rows - 1, Math.round(y / step))) * columns +
    Math.max(0, Math.min(columns - 1, Math.round(x / step)));
  const supported = (x: number, y: number) => {
    const k = index(x, y);
    return (
      !water[Math.floor(y) * width + Math.floor(x)] &&
      (seeds.hills[k]! > 0.1 || seeds.mountains[k]! > 0.1)
    );
  };
  const deposit = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    breadth: number,
    strength: number,
  ) => {
    const dx = bx - ax,
      dy = by - ay,
      length = dx * dx + dy * dy || 1;
    for (
      let gy = Math.max(0, Math.floor((Math.min(ay, by) - breadth) / step));
      gy <= Math.min(rows - 1, Math.ceil((Math.max(ay, by) + breadth) / step));
      gy++
    )
      for (
        let gx = Math.max(0, Math.floor((Math.min(ax, bx) - breadth) / step));
        gx <= Math.min(columns - 1, Math.ceil((Math.max(ax, bx) + breadth) / step));
        gx++
      ) {
        const x = gx * step,
          y = gy * step,
          t = clamp(((x - ax) * dx + (y - ay) * dy) / length),
          distance = Math.hypot(x - ax - dx * t, y - ay - dy * t),
          q = clamp(1 - distance / breadth),
          k = gy * columns + gx;
        ridge[k] = Math.max(ridge[k]!, q * q * (3 - 2 * q) * strength);
      }
  };
  let links = 0,
    crossProvinceLinks = 0;
  for (let i = 0; i < relief.length; i++) {
    const a = relief[i]!;
    deposit(a.x, a.y, a.x, a.y, Math.max(22, a.width * 0.62), 0.7);
    const neighbors = relief
      .map((b, j) => ({ b, j, distance: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter(({ j, distance }) => j > i && distance < (a.kind === 'hills' ? 115 : 145))
      .sort((a, b) => a.distance - b.distance || a.j - b.j);
    let accepted = 0;
    for (const { b, distance } of neighbors) {
      if (accepted >= 2) break;
      // Half-pixel steps also catch the original one-pixel river centre lines.
      const samples = Math.max(4, Math.ceil(distance * 2));
      let valid = true;
      for (let s = 0; s <= samples; s++)
        if (!supported(a.x + ((b.x - a.x) * s) / samples, a.y + ((b.y - a.y) * s) / samples)) {
          valid = false;
          break;
        }
      if (!valid) continue;
      deposit(a.x, a.y, b.x, b.y, Math.min(42, (a.width + b.width) * 0.28), 0.9);
      links++;
      accepted++;
      if (a.provinceId !== b.provinceId) crossProvinceLinks++;
    }
  }
  const elevation = new Float32Array(columns * rows),
    fields = new Float32Array(columns * rows * 4);
  const hillAt = (x: number, y: number) => {
    const fx = Math.max(0, Math.min(columns - 1, x)),
      fy = Math.max(0, Math.min(rows - 1, y)),
      ix = Math.floor(fx),
      iy = Math.floor(fy),
      xx = Math.min(columns - 1, ix + 1),
      yy = Math.min(rows - 1, iy + 1),
      u = fx - ix,
      v = fy - iy;
    return (
      (hills[iy * columns + ix]! * (1 - u) + hills[iy * columns + xx]! * u) * (1 - v) +
      (hills[yy * columns + ix]! * (1 - u) + hills[yy * columns + xx]! * u) * v
    );
  };
  for (let gy = 0; gy < rows; gy++)
    for (let gx = 0; gx < columns; gx++) {
      const k = gy * columns + gx,
        x = gx * step,
        y = gy * step,
        folds = noise(x / 27 + 17, y / 31 + 43),
        valley = 0.72 + folds * 0.28,
        // Gentle irregular shoulders continue into adjacent lowlands, instead of
        // tracing the administrative staircase with a narrow province-shaped edge.
        shoulder = hillAt(
          gx + (noise(x / 63, y / 69) - 0.5) * 4,
          gy + (noise(x / 71 + 13, y / 61 + 7) - 0.5) * 4,
        );
      // The landform persists between crests. Native material support, broad
      // shoulders and narrow valleys are combined before any page is painted.
      fields[k * 4] = shoulder * valley;
      fields[k * 4 + 1] = mountains[k]! * (0.78 + ridge[k]! * 0.22);
      fields[k * 4 + 2] = harsh[k]!;
      elevation[k] =
        mountains[k]! * (0.65 + ridge[k]! * 0.5 + folds * 0.15) +
        shoulder * (0.18 + ridge[k]! * 0.2 + folds * 0.12);
    }
  for (let y = 1; y < rows - 1; y++)
    for (let x = 1; x < columns - 1; x++) {
      const k = y * columns + x;
      fields[k * 4 + 3] = Math.max(
        -1,
        Math.min(
          1,
          (elevation[k + 1]! -
            elevation[k - 1]! +
            elevation[k + columns]! -
            elevation[k - columns]!) *
            2.8,
        ),
      );
    }
  return { fields, materials, links, crossProvinceLinks };
}

/** No full hill pedestals. Keep high crests and deliberate corrected peaks;
 * lower source shoulders become part of the continuous ground. */
export function keepsReliefOverlay(a: TerrainAnchor) {
  return (
    a.kind === 'forest' ||
    (a.kind === 'ridge' && (Boolean(a.layout) || (a.role !== 'foothill' && a.width >= 62)))
  );
}
