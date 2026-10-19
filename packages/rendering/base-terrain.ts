import type { Scenario } from '../core/schema';
import { insideProvince, provinceRings } from '../core/geometry';
import { terrainFootprint, type TerrainAnchor } from './terrain-placement';
import {
  connectLandscape,
  type ConnectedLandscape,
  type LandscapeMaterials,
  type LandscapeSeeds,
} from './connected-terrain';
import { prepareWoodlandLowlands, type WoodlandLowlands } from './woodland-lowlands';
import {
  forestCharacterAt,
  terrainProfileAt,
  distanceToMountainSpine,
  easternMountainSpine,
} from './terrain-regions';

export const TERRAIN_TILE_SIZE = 256;
export const TERRAIN_GUTTER = 2;
export const TERRAIN_CACHE_BYTES = 80 * 1024 * 1024;
const STEP = 4,
  CHANNELS = 11;
type Province = Scenario['provinces'][number];
export interface TerrainMaterial {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}
export interface TerrainPilotPatch {
  x: number;
  y: number;
  worldWidth: number;
  worldHeight: number;
  material: TerrainMaterial;
  mask: Float32Array;
  gain?: readonly [number, number, number];
}
export interface BaseTerrainModel {
  width: number;
  height: number;
  columns: number;
  rows: number;
  fields: Float32Array;
  distance: Float32Array;
  materials: TerrainMaterial[];
  pilot?: TerrainPilotPatch;
  landscape?: ConnectedLandscape;
  surface?: WoodlandLowlands;
}
export interface TerrainPage {
  x: number;
  y: number;
  width: number;
  height: number;
  resolution: number;
}
const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};
function hash(x: number, y: number) {
  let h = Math.imul(x + 71, 374761393) ^ Math.imul(y + 29, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    u = smooth(0, 1, x - ix),
    v = smooth(0, 1, y - iy);
  return (
    (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v) +
    (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v
  );
}

/** Distances are measured from the existing connected water mask, never new river paths. */
export function shorelineDistance(water: Uint8Array, width: number, height: number) {
  // Close isolated dry stipple in continuous sea for the painted underlayer.
  // Never remove an original water pixel, including one-pixel river centerlines.
  let coast = water.slice();
  for (let pass = 0; pass < 2; pass++) {
    const next = coast.slice();
    for (let y = 1; y < height - 1; y++)
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        if (coast[i]) continue;
        let wet = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) wet += Number(Boolean(coast[i + dy * width + dx]));
        if (wet >= 6) next[i] = 2;
      }
    coast = next;
  }
  const d = new Float32Array(width * height);
  d.fill(64);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        wet = Boolean(coast[i]);
      if (
        (x && Boolean(coast[i - 1]) !== wet) ||
        (x + 1 < width && Boolean(coast[i + 1]) !== wet) ||
        (y && Boolean(coast[i - width]) !== wet) ||
        (y + 1 < height && Boolean(coast[i + width]) !== wet)
      )
        d[i] = 0.5;
    }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x) d[i] = Math.min(d[i]!, d[i - 1]! + 1);
      if (y) d[i] = Math.min(d[i]!, d[i - width]! + 1);
      if (x && y) d[i] = Math.min(d[i]!, d[i - width - 1]! + Math.SQRT2);
      if (x + 1 < width && y) d[i] = Math.min(d[i]!, d[i - width + 1]! + Math.SQRT2);
    }
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x + 1 < width) d[i] = Math.min(d[i]!, d[i + 1]! + 1);
      if (y + 1 < height) d[i] = Math.min(d[i]!, d[i + width]! + 1);
      if (x && y + 1 < height) d[i] = Math.min(d[i]!, d[i + width - 1]! + Math.SQRT2);
      if (x + 1 < width && y + 1 < height) d[i] = Math.min(d[i]!, d[i + width + 1]! + Math.SQRT2);
    }
  for (let i = 0; i < d.length; i++) if (coast[i]) d[i] = -d[i]!;
  // Round the painted coastline at sub-geographic scale instead of enlarging
  // retail stair steps. Narrow river corridors keep the original distance field.
  const horizontal = new Float32Array(d.length),
    kernel = [1, 4, 6, 4, 1];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (Math.abs(d[i]!) > 6) {
        horizontal[i] = d[i]!;
        continue;
      }
      let value = 0;
      for (let k = -2; k <= 2; k++)
        value += d[y * width + clamp(x + k, 0, width - 1)]! * kernel[k + 2]!;
      horizontal[i] = value / 16;
    }
  const result = d.slice();
  for (let y = 2; y < height - 2; y++)
    for (let x = 2; x < width - 2; x++) {
      const i = y * width + x;
      if (Math.abs(d[i]!) > 5) continue;
      let wet = 0;
      for (const dy of [-5, 0, 5])
        for (const dx of [-5, 0, 5]) {
          const xx = clamp(x + dx, 0, width - 1),
            yy = clamp(y + dy, 0, height - 1);
          wet += Number(Boolean(coast[yy * width + xx]));
        }
      if (wet < 4) continue;
      let value = 0;
      for (let k = -2; k <= 2; k++) value += horizontal[(y + k) * width + x]! * kernel[k + 2]!;
      result[i] = water[i] ? Math.min(-0.25, value / 16) : value / 16;
    }
  return result;
}

/** Only broad semantic coverage is retained from the retail bitmap, not its RGB pixels,
 * baked borders, stippling or mountain symbols. Verified visual footprints ground
 * the HD objects in this same tiled material, without a second background layer. */
export function buildBaseTerrain(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  water: Uint8Array,
  provinces: Province[],
  materials: TerrainMaterial[],
  anchors: TerrainAnchor[] = [],
  pilot?: TerrainPilotPatch,
  landscapeMaterials?: LandscapeMaterials,
): BaseTerrainModel {
  const columns = Math.ceil((width - 1) / STEP) + 1,
    rows = Math.ceil((height - 1) / STEP) + 1;
  const fields = new Float32Array(columns * rows * CHANNELS);
  // Reuse one summed-area table instead of keeping full-resolution copies per material.
  const sum = new Float32Array((width + 1) * (height + 1)),
    pitch = width + 1;
  for (let channel = 0; channel < 5; channel++) {
    sum.fill(0);
    for (let y = 0; y < height; y++) {
      let line = 0;
      for (let x = 0; x < width; x++) {
        const i = y * width + x,
          r = pixels[i * 4]!,
          g = pixels[i * 4 + 1]!,
          b = pixels[i * 4 + 2]!;
        const value =
          channel === 0
            ? g > r * 1.25 && g > b * 1.25
            : channel === 1
              ? r === g && g === b && r >= 31 && r < 103
              : channel === 2
                ? r > 125 && r > g * 1.35 && g < b * 1.28 && g > b
                : channel === 3
                  ? !water[i] &&
                    ((r === g && g === b && r >= 103) || (b > r + 5 && r > g + 3 && b - g < 52))
                  : Boolean(water[i]);
        line += Number(value);
        sum[(y + 1) * pitch + x + 1] = sum[y * pitch + x + 1]! + line;
      }
    }
    for (let gy = 0; gy < rows; gy++)
      for (let gx = 0; gx < columns; gx++) {
        const x = Math.min(width - 1, gx * STEP),
          y = Math.min(height - 1, gy * STEP),
          radius = channel === 4 ? 16 : 12;
        const x0 = Math.max(0, x - radius),
          x1 = Math.min(width, x + radius + 1),
          y0 = Math.max(0, y - radius),
          y1 = Math.min(height, y + radius + 1);
        const v =
          (sum[y1 * pitch + x1]! -
            sum[y0 * pitch + x1]! -
            sum[y1 * pitch + x0]! +
            sum[y0 * pitch + x0]!) /
          ((x1 - x0) * (y1 - y0));
        const i = (gy * columns + gx) * CHANNELS;
        if (channel === 0) fields[i] = v * 1.8;
        if (channel === 1) fields[i] = fields[i]! + v * 2;
        if (channel === 2) fields[i + 2] = smooth(0.06, 0.5, v);
        if (channel === 3) fields[i + 1] = smooth(0.025, 0.22, v);
        if (channel === 4) fields[i + 5] = v;
      }
  }
  const bounds = provinces.map((p) => {
    const points = provinceRings(p).flat();
    return {
      p,
      x0: Math.min(...points.map((p) => p[0])),
      x1: Math.max(...points.map((p) => p[0])),
      y0: Math.min(...points.map((p) => p[1])),
      y1: Math.max(...points.map((p) => p[1])),
    };
  });
  const nativeForest = new Float32Array(columns * rows),
    forestLimit = new Float32Array(columns * rows);
  const cultivation = landscapeMaterials?.ground ? new Float32Array(columns * rows) : undefined;
  const landscapeSeeds: LandscapeSeeds | undefined = landscapeMaterials
    ? {
        hills: new Float32Array(columns * rows),
        mountains: new Float32Array(columns * rows),
        harsh: new Float32Array(columns * rows),
      }
    : undefined;
  for (let gy = 0; gy < rows; gy++)
    for (let gx = 0; gx < columns; gx++) {
      const x = gx * STEP,
        y = gy * STEP,
        i = (gy * columns + gx) * CHANNELS;
      const p = bounds.find(
        (b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && insideProvince(x, y, b.p),
      )?.p;
      nativeForest[gy * columns + gx] = Number(p?.terrain === 'forest');
      const profile = p ? terrainProfileAt(p, x, y) : undefined;
      if (cultivation && p && (p.terrain === 'plains' || p.terrain === 'coast')) {
        const level = typeof p.original?.level === 'number' ? p.original.level : 0,
          radius = 65 + level * 12,
          distance = Math.hypot(x - p.center[0], y - p.center[1]);
        // Visual settlement context, not a claim to recovered individual farm locations.
        cultivation[gy * columns + gx] =
          smooth(0, 6, level) * Math.exp(-((distance / radius) ** 2));
      }
      if (landscapeSeeds && profile) {
        const k = gy * columns + gx,
          realm = p?.original?.realmIndex,
          coastal = realm === 30,
          markazor = realm === 19,
          mountain =
            profile.relief === 'heavy-mountains'
              ? 1
              : profile.relief === 'mountains'
                ? 0.85
                : profile.relief === 'outcrop'
                  ? 0.24
                  : 0;
        landscapeSeeds.hills[k] = profile.hills ? 1 : (markazor || coastal) && mountain ? 0.7 : 0;
        landscapeSeeds.mountains[k] = mountain * (markazor ? 0.42 : coastal ? 0.48 : 1);
        landscapeSeeds.harsh[k] = realm === 17 || realm === 24 ? 1 : markazor ? 0.65 : 0;
      }
      forestLimit[gy * columns + gx] = profile?.forestFloor ?? 1;
      fields[i + 1] =
        fields[i + 1]! * (profile?.relief === 'none' ? (profile.hills ? 0.25 : 0.06) : 1);
      if (profile?.origin === easternMountainSpine.id)
        fields[i + 1] = Math.max(
          fields[i + 1]!,
          0.32 * (1 - smooth(12, 40, distanceToMountainSpine(x, y))),
        );
      fields[i + 3] = Number(p?.terrain === 'swamp');
      fields[i + 4] = Number(Boolean(profile?.hills));
      fields[i + 6] = noise(x / 48, y / 48) * 0.7 + noise(x / 19, y / 19) * 0.3;
      fields[i + 7] = noise(x / 77 + 13, y / 77 + 37);
      fields[i + 10] = forestCharacterAt(x, y);
    }
  // Ease categorical underlayers over a narrow visual transition, never edit province data.
  for (const channel of [3, 4]) {
    const copy = fields.slice();
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < columns; x++) {
        let v = 0,
          n = 0;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const xx = clamp(x + dx, 0, columns - 1),
              yy = clamp(y + dy, 0, rows - 1);
            v += copy[(yy * columns + xx) * CHANNELS + channel]!;
            n++;
          }
        fields[(y * columns + x) * CHANNELS + channel] = v / n;
      }
  }
  const forestGeography = new Float32Array(columns * rows),
    rockGeography = new Float32Array(columns * rows);
  for (let gy = 0; gy < rows; gy++)
    for (let gx = 0; gx < columns; gx++) {
      let context = 0;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++)
          context +=
            nativeForest[clamp(gy + dy, 0, rows - 1) * columns + clamp(gx + dx, 0, columns - 1)]!;
      const k = gy * columns + gx,
        i = k * CHANNELS,
        raw = fields[i]!,
        wood = smooth(0.3, 0.95, raw);
      // Brown forest floor needs native context, eased across administrative edges.
      fields[i] = Math.min(
        forestLimit[k]!,
        wood + (1 - wood) * (context / 49) * smooth(0.1, 0.35, raw) * 0.82,
      );
      forestGeography[k] = fields[i]! * (1 - fields[i + 1]!);
      rockGeography[k] = fields[i + 1]!;
    }
  const elevation = new Float32Array(columns * rows);
  for (const a of anchors) {
    const forest = a.kind === 'forest',
      footprint = terrainFootprint(a),
      cx = footprint.x,
      cy = footprint.y,
      rx = footprint.rx * (forest ? 1.18 : 1.4),
      ry = footprint.ry * (forest ? 1.35 : 1.65);
    for (
      let gy = Math.max(0, Math.floor((cy - ry * 1.2) / STEP));
      gy <= Math.min(rows - 1, Math.ceil((cy + ry * 1.2) / STEP));
      gy++
    )
      for (
        let gx = Math.max(0, Math.floor((cx - rx * 1.2) / STEP));
        gx <= Math.min(columns - 1, Math.ceil((cx + rx * 1.2) / STEP));
        gx++
      ) {
        const x = gx * STEP,
          y = gy * STEP,
          i = (gy * columns + gx) * CHANNELS;
        // Two world-space variations break the outline into irregular shoulders
        // and leaf-litter edges; neighboring masses merge before page synthesis.
        const warp = (fields[i + 6]! - 0.5) * 0.42 + (fields[i + 7]! - 0.5) * 0.3;
        const q = Math.hypot((x - cx) / rx, (y - cy) / ry) + warp;
        const compatibility = forest
          ? !forestLimit[gy * columns + gx]
            ? 0
            : 1 - smooth(0.55, 0.95, rockGeography[gy * columns + gx]!)
          : 1 - smooth(0.22, 0.65, forestGeography[gy * columns + gx]!);
        const skirt = (1 - smooth(0.25, 1.06, q)) * compatibility;
        const contact =
          (1 -
            smooth(
              0.12,
              0.95,
              Math.hypot((x - cx) / (rx * 0.65), (y - cy - ry * 0.14) / (ry * 0.55)) + warp,
            )) *
          (forest ? 0.17 : 0.14) *
          compatibility;
        fields[i + 8] = Math.max(fields[i + 8]!, contact);
        if (forest) {
          fields[i] = Math.min(
            forestLimit[gy * columns + gx]!,
            Math.max(fields[i]!, skirt * (a.role === 'woodland-edge' ? 0.48 : 0.84)),
          );
        } else {
          const arid = a.evidence === 'retail-sandstone';
          fields[i + 1] = Math.max(fields[i + 1]!, skirt * (arid ? 0.62 : 0.78));
          if (arid) fields[i + 2] = Math.max(fields[i + 2]!, skirt * 0.85);
          elevation[gy * columns + gx] = Math.max(
            elevation[gy * columns + gx]!,
            skirt * (a.heightScale ?? 0.7),
          );
        }
      }
  }
  // Broad directional slopes beneath the ridge, with light from the atlas's NW.
  // Stored once at initialization, so detail pages need no per-object work.
  for (let gy = 1; gy < rows - 1; gy++)
    for (let gx = 1; gx < columns - 1; gx++) {
      const k = gy * columns + gx;
      fields[k * CHANNELS + 9] = clamp(
        (elevation[k + 1]! -
          elevation[k - 1]! +
          elevation[k + columns]! -
          elevation[k - columns]!) *
          2.5,
        -1,
        1,
      );
    }
  return {
    width,
    height,
    columns,
    rows,
    fields,
    distance: shorelineDistance(water, width, height),
    materials,
    pilot,
    surface:
      cultivation && landscapeSeeds
        ? prepareWoodlandLowlands(
            provinces,
            width,
            height,
            water,
            columns,
            rows,
            STEP,
            landscapeSeeds,
            nativeForest,
            cultivation,
          )
        : undefined,
    landscape:
      landscapeMaterials && landscapeSeeds
        ? connectLandscape(
            landscapeSeeds,
            anchors,
            columns,
            rows,
            STEP,
            water,
            width,
            landscapeMaterials,
            noise,
          )
        : undefined,
  };
}

function bilinear(data: Float32Array, width: number, height: number, x: number, y: number) {
  x = clamp(x, 0, width - 1);
  y = clamp(y, 0, height - 1);
  const ix = Math.floor(x),
    iy = Math.floor(y),
    xx = Math.min(ix + 1, width - 1),
    yy = Math.min(iy + 1, height - 1),
    u = x - ix,
    v = y - iy;
  return (
    (data[iy * width + ix]! * (1 - u) + data[iy * width + xx]! * u) * (1 - v) +
    (data[yy * width + ix]! * (1 - u) + data[yy * width + xx]! * u) * v
  );
}
// Mirrored sampling is continuous at material edges; two warped frequencies hide repetition.
const mirror = (x: number, size: number) => {
  const n = ((Math.floor(x) % (size * 2)) + size * 2) % (size * 2);
  return n < size ? n : size * 2 - n - 1;
};
function landscapeSample(mat: TerrainMaterial, x: number, y: number, out: Float32Array) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    u = x - ix,
    v = y - iy,
    x0 = mirror(ix, mat.width),
    x1 = mirror(ix + 1, mat.width),
    y0 = mirror(iy, mat.height),
    y1 = mirror(iy + 1, mat.height);
  for (let c = 0; c < 3; c++)
    out[c] =
      (mat.pixels[(y0 * mat.width + x0) * 4 + c]! * (1 - u) +
        mat.pixels[(y0 * mat.width + x1) * 4 + c]! * u) *
        (1 - v) +
      (mat.pixels[(y1 * mat.width + x0) * 4 + c]! * (1 - u) +
        mat.pixels[(y1 * mat.width + x1) * 4 + c]! * u) *
        v;
}

/** Every sample uses absolute world coordinates, including gutters, so neighboring
 * pages and all LODs depict the same landscape without per-tile random seeds. */
export function paintTerrainPage(
  model: BaseTerrainModel,
  page: TerrainPage,
  gutter = TERRAIN_GUTTER,
) {
  const { resolution: r } = page,
    width = page.width * r + gutter * 2,
    height = page.height * r + gutter * 2;
  const ground = new Uint8ClampedArray(width * height * 4),
    water = new Uint8ClampedArray(ground.length);
  const f = new Float32Array(CHANNELS),
    materialLevel = r >= 4 ? 0 : r >= 2 ? 1 : 2;
  const land = new Float32Array(4),
    hillColor = new Float32Array(3),
    rockColor = new Float32Array(3),
    surfaceColor = new Float32Array(3);
  const mat = model.materials[Math.min(materialLevel, model.materials.length - 1)]!,
    mip = 2 ** materialLevel;
  let waterPixels = 0;
  for (let py = 0; py < height; py++)
    for (let px = 0; px < width; px++) {
      const x = page.x + (px - gutter + 0.5) / r,
        y = page.y + (py - gutter + 0.5) / r;
      const fx = clamp(x / STEP, 0, model.columns - 1),
        fy = clamp(y / STEP, 0, model.rows - 1),
        ix = Math.floor(fx),
        iy = Math.floor(fy),
        u = fx - ix,
        v = fy - iy;
      const a = (iy * model.columns + ix) * CHANNELS,
        b = (iy * model.columns + Math.min(ix + 1, model.columns - 1)) * CHANNELS;
      const c = (Math.min(iy + 1, model.rows - 1) * model.columns + ix) * CHANNELS,
        d =
          (Math.min(iy + 1, model.rows - 1) * model.columns + Math.min(ix + 1, model.columns - 1)) *
          CHANNELS;
      for (let k = 0; k < CHANNELS; k++)
        f[k] =
          (model.fields[a + k]! * (1 - u) + model.fields[b + k]! * u) * (1 - v) +
          (model.fields[c + k]! * (1 - u) + model.fields[d + k]! * u) * v;
      const dist = bilinear(model.distance, model.width, model.height, x - 0.5, y - 0.5);
      const waterAlpha = 1 - smooth(-0.45, 0.45, dist);
      const m1 =
        (mirror((y * 3.6 + f[7]! * 90) / mip, mat.height) * mat.width +
          mirror((x * 3.6 + f[6]! * 90) / mip, mat.width)) *
        4;
      const m2 =
        (mirror((y * 1.3 + x * 0.73 + 853) / mip, mat.height) * mat.width +
          mirror((x * 1.3 - y * 0.73 + 1731) / mip, mat.width)) *
        4;
      const mr = mat.pixels[m1]! * 0.7 + mat.pixels[m2]! * 0.3,
        mg = mat.pixels[m1 + 1]! * 0.7 + mat.pixels[m2 + 1]! * 0.3,
        mb = mat.pixels[m1 + 2]! * 0.7 + mat.pixels[m2 + 2]! * 0.3;
      const detail = (mr + mg + mb - 300) * 0.14,
        broad = (f[6]! - 0.5) * 12,
        wood = f[0]!,
        arid = f[2]! * (1 - wood * 0.65);
      let red = mr * 0.82 + 21 + broad,
        green = mg * 0.86 + 25 + broad,
        blue = mb * 0.85 + 17 + broad;
      const dread = Math.max(0, -f[10]!),
        blight = Math.max(0, f[10]!);
      red += (58 - dread * 19 + blight + detail - red) * wood * 0.85;
      green += (80 - dread * 28 - blight * 26 + detail - green) * wood * 0.85;
      blue += (43 - dread * 3 + blight * 2 + detail - blue) * wood * 0.85;
      red += (157 + detail + broad - red) * arid;
      green += (119 + detail + broad - green) * arid;
      blue += (92 + detail + broad - blue) * arid;
      const gravel = f[1]! * (1 - wood * 0.5) * 0.7;
      red += ((arid ? 155 : 123) + detail * 1.7 - red) * gravel;
      green += ((arid ? 121 : 119) + detail * 1.5 - green) * gravel;
      blue += ((arid ? 100 : 91) + detail * 1.3 - blue) * gravel;
      red += (70 + detail - red) * f[3]! * 0.55;
      green += (103 + detail - green) * f[3]! * 0.55;
      blue += (65 + detail - blue) * f[3]! * 0.55;
      const surface = model.surface,
        groundMaterials = model.landscape?.materials.ground;
      let woodlandWeight = 0,
        woodlandRed = 0,
        woodlandGreen = 0,
        woodlandBlue = 0;
      const coverage =
        surface?.mask[
          clamp(Math.floor(y), 0, model.height - 1) * model.width +
            clamp(Math.floor(x), 0, model.width - 1)
        ] ?? 0;
      if (surface && groundMaterials && coverage && waterAlpha < 1) {
        const woodland = Math.max(
            wood,
            bilinear(surface.woodland, model.columns, model.rows, fx, fy) * 0.94,
          ),
          farms = bilinear(surface.cultivation, model.columns, model.rows, fx, fy),
          wx = x + (f[6]! - 0.5) * 14,
          wy = y + (f[7]! - 0.5) * 12,
          open = (coverage / 255) * (1 - woodland) * (0.35 + farms * 0.6),
          dry = clamp(arid * 0.75 + (f[7]! - 0.45) * 0.3);
        if (open > 0.005) {
          const m = groundMaterials.lowlands;
          landscapeSample(m, (wx / 240) * m.width, (wy / 160) * m.height, surfaceColor);
          red += (surfaceColor[0]! * 0.9 + dry * 27 - red) * open;
          green += (surfaceColor[1]! * 0.99 - dry * 9 - green) * open;
          blue += (surfaceColor[2]! * 1.08 + dry * 12 - blue) * open;
        }
        if (woodland > 0.005) {
          const m = groundMaterials.woodland;
          landscapeSample(m, (wx / 132) * m.width, (wy / 92) * m.height, surfaceColor);
          woodlandWeight = (coverage / 255) * woodland * 0.9;
          woodlandRed = surfaceColor[0]! * 0.7 - dread * 11 + blight * 14;
          woodlandGreen = surfaceColor[1]! * 0.85 - dread * 14 - blight * 16;
          woodlandBlue = surfaceColor[2]! * 1.04 + dread * 2 + blight * 7;
        }
      }
      const hillShade = (f[7]! - 0.5) * f[4]! * 18 + f[9]! * 24;
      red = (red + hillShade) * (1 - f[8]!);
      green = (green + hillShade) * (1 - f[8]!);
      blue = (blue + hillShade) * (1 - f[8]!);
      if (model.landscape) {
        const landscape = model.landscape,
          source = landscape.fields,
          la = (a / CHANNELS) * 4,
          lb = (b / CHANNELS) * 4,
          lc = (c / CHANNELS) * 4,
          ld = (d / CHANNELS) * 4;
        if (
          source[la] ||
          source[la + 1] ||
          source[lb] ||
          source[lb + 1] ||
          source[lc] ||
          source[lc + 1] ||
          source[ld] ||
          source[ld + 1]
        ) {
          for (let k = 0; k < 4; k++)
            land[k] =
              (source[la + k]! * (1 - u) + source[lb + k]! * u) * (1 - v) +
              (source[lc + k]! * (1 - u) + source[ld + k]! * u) * v;
          const hill = smooth(0.03, 0.84, land[0]!) * (1 - wood * 0.55),
            mountain = smooth(0.025, 0.83, land[1]!) * (1 - wood * 0.38),
            harsh = land[2]!,
            shade = land[3]! * 24,
            wx = x + (f[6]! - 0.5) * 12,
            wy = y + (f[7]! - 0.5) * 10;
          if (hill > 0) {
            const mat = landscape.materials.hills;
            landscapeSample(mat, (wx / 224) * mat.width, (wy / 160) * mat.height, hillColor);
            red += (hillColor[0]! * 0.9 + harsh * 13 + shade - red) * hill;
            green += (hillColor[1]! * 0.97 - harsh * 11 + shade - green) * hill;
            blue += (hillColor[2]! * 1.08 + harsh * 3 + shade - blue) * hill;
          }
          if (mountain > 0) {
            const mat = landscape.materials.granite;
            landscapeSample(
              mat,
              ((wx + wy * 0.08) / 238) * mat.width,
              (wy / 168) * mat.height,
              rockColor,
            );
            red += (rockColor[0]! * 0.97 + harsh * 18 + shade - red) * mountain;
            green += (rockColor[1]! * (0.97 - harsh * 0.14) + shade - green) * mountain;
            blue += (rockColor[2]! * (1.05 - harsh * 0.16) + shade - blue) * mountain;
          }
        }
      }
      // Woodland ground dresses the connected slopes, rather than being erased
      // by their broad shoulders. The scope mask still protects all relief ground.
      if (woodlandWeight) {
        red += ((woodlandRed + hillShade) * (1 - f[8]!) - red) * woodlandWeight;
        green += ((woodlandGreen + hillShade) * (1 - f[8]!) - green) * woodlandWeight;
        blue += ((woodlandBlue + hillShade) * (1 - f[8]!) - blue) * woodlandWeight;
      }
      const pilot = model.pilot;
      if (
        pilot &&
        x >= pilot.x &&
        y >= pilot.y &&
        x < pilot.x + pilot.worldWidth &&
        y < pilot.y + pilot.worldHeight
      ) {
        // World-aligned illustrated relief, sampled afresh at every LOD. Existing
        // geometry supplies the inner feather; water and strategic overlays stay later.
        const lx = x - pilot.x,
          ly = y - pilot.y,
          weight = bilinear(pilot.mask, pilot.worldWidth, pilot.worldHeight, lx - 0.5, ly - 0.5),
          art = pilot.material,
          sx = clamp((lx / pilot.worldWidth) * art.width - 0.5, 0, art.width - 1),
          sy = clamp((ly / pilot.worldHeight) * art.height - 0.5, 0, art.height - 1),
          ax = Math.floor(sx),
          ay = Math.floor(sy),
          bx = Math.min(ax + 1, art.width - 1),
          by = Math.min(ay + 1, art.height - 1),
          u = sx - ax,
          v = sy - ay;
        const channel = (c: number) =>
          (art.pixels[(ay * art.width + ax) * 4 + c]! * (1 - u) +
            art.pixels[(ay * art.width + bx) * 4 + c]! * u) *
            (1 - v) +
          (art.pixels[(by * art.width + ax) * 4 + c]! * (1 - u) +
            art.pixels[(by * art.width + bx) * 4 + c]! * u) *
            v;
        red += (channel(0) * (pilot.gain?.[0] ?? 1) - red) * weight;
        green += (channel(1) * (pilot.gain?.[1] ?? 1) - green) * weight;
        blue += (channel(2) * (pilot.gain?.[2] ?? 1) - blue) * weight;
      }
      const sea = smooth(0.22, 0.6, f[5]!),
        bank = (1 - smooth(0.4, 2 + sea * 2.2, dist)) * (1 - waterAlpha);
      red += (115 + sea * 59 + detail - red) * bank;
      green += (124 + sea * 28 + detail - green) * bank;
      blue += (86 + sea * 23 + detail - blue) * bank;
      const shallow = 1 - smooth(0, 24, -dist),
        ripple = (f[6]! - 0.5) * 6;
      const foam = (1 - smooth(0.3, 1.1, Math.abs(dist + 1.2))) * 6;
      const wr = 37 + shallow * 18 + ripple + foam,
        wg = 72 + shallow * 25 + ripple + foam,
        wb = 79 + shallow * 15 + ripple + foam;
      const i = (py * width + px) * 4;
      ground[i] = red * (1 - waterAlpha) + wr * waterAlpha;
      ground[i + 1] = green * (1 - waterAlpha) + wg * waterAlpha;
      ground[i + 2] = blue * (1 - waterAlpha) + wb * waterAlpha;
      ground[i + 3] = 255;
      water[i] = wr;
      water[i + 1] = wg;
      water[i + 2] = wb;
      water[i + 3] = Math.round(waterAlpha * 255);
      if (waterAlpha > 0) waterPixels++;
    }
  return { width, height, ground, water: waterPixels ? water : null };
}

export function visibleTerrainPages(
  width: number,
  height: number,
  x: number,
  y: number,
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  const x0 = Math.max(0, Math.floor(-x / scale / TERRAIN_TILE_SIZE)),
    y0 = Math.max(0, Math.floor(-y / scale / TERRAIN_TILE_SIZE));
  const x1 = Math.min(
      Math.ceil(width / TERRAIN_TILE_SIZE),
      Math.ceil((viewportWidth - x) / scale / TERRAIN_TILE_SIZE),
    ),
    y1 = Math.min(
      Math.ceil(height / TERRAIN_TILE_SIZE),
      Math.ceil((viewportHeight - y) / scale / TERRAIN_TILE_SIZE),
    );
  let resolution = scale > 1.6 ? 4 : 2;
  if (
    (x1 - x0) * (y1 - y0) * (TERRAIN_TILE_SIZE * resolution + TERRAIN_GUTTER * 2) ** 2 * 8 >
    TERRAIN_CACHE_BYTES
  )
    resolution = 2;
  const pages: TerrainPage[] = [];
  if (scale < 0.8) return pages;
  for (let row = y0; row < y1; row++)
    for (let column = x0; column < x1; column++) {
      const xx = column * TERRAIN_TILE_SIZE,
        yy = row * TERRAIN_TILE_SIZE;
      pages.push({
        x: xx,
        y: yy,
        width: Math.min(TERRAIN_TILE_SIZE, width - xx),
        height: Math.min(TERRAIN_TILE_SIZE, height - yy),
        resolution,
      });
    }
  return pages;
}
export const terrainPageKey = (p: TerrainPage) => `${p.x}:${p.y}:${p.resolution}`;
