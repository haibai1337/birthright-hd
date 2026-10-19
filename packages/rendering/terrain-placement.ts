import type { Scenario } from '../core/schema';
import { insideProvince, insideRing, provinceRings } from '../core/geometry';
import {
  isForestClearing,
  reliefPlacements,
  terrainRegions,
  terrainProfileAt,
  easternMountainSpine,
} from './terrain-regions';

export interface TerrainAnchor {
  x: number;
  y: number;
  width: number;
  heightScale?: number;
  variant: number;
  kind: 'forest' | 'ridge' | 'hills';
  provinceId?: string;
  evidence?:
    'retail-rock' | 'retail-sandstone' | 'native-hills' | 'reviewed-foothills' | 'retail-canopy' | 'reviewed-range-link';
  region?: string;
  policy?: string;
  role?: 'foothill' | 'woodland-edge';
  /** Trimmed atlas height / width, measured before fitting; not a terrain height. */
  aspect?: number;
  fit?: { x: number; y: number; width: number; before: number; after: number };
  /** Retained pre-correction visual placement; imported province data is untouched. */
  layout?: { x: number; y: number; width: number; heightScale?: number };
}
export type TerrainAspects = { forest: number[]; ridge: number[] };

export function placeRegionalRelief(a: TerrainAnchor): TerrainAnchor {
  if (a.kind !== 'ridge') return a;
  const source = a.fit ?? a,
    layout = reliefPlacements.find(
      (p) => p.provinceId === a.provinceId && p.source[0] === source.x && p.source[1] === source.y,
    );
  if (!layout) return a;
  return {
    ...a,
    x: layout.position[0],
    y: layout.position[1],
    width: layout.width,
    heightScale: layout.heightScale,
    layout: { x: a.x, y: a.y, width: a.width, heightScale: a.heightScale },
  };
}

/** Shared by placement, the existing ground worker and diagnostics. The elevated
 * silhouette occupies the full rectangle; only the lower part contacts ground. */
export function terrainFootprint(a: TerrainAnchor) {
  const forest = a.kind === 'forest',
    height = a.width * (a.aspect ?? 0.85) * (a.heightScale ?? 1),
    anchorY = forest ? 0.64 : 0.52;
  return {
    height,
    anchorY,
    left: a.x - a.width / 2,
    right: a.x + a.width / 2,
    top: a.y - height * anchorY,
    bottom: a.y + height * (1 - anchorY),
    x: a.x,
    y: a.y + height * (forest ? 0.14 : 0.27),
    rx: a.width * 0.46,
    ry: height * (forest ? 0.27 : 0.24),
  };
}
/** Alpha-trim measurement is also used by the read-only placement audit. */
export function terrainFrameBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  columns = 4,
  rows = 3,
  findGaps = rows === 3,
) {
  // The painted terrain groups are not perfectly centered in equal-width cells.
  // Cut at the nearby alpha gap so an adjacent canopy cannot enter a frame as a
  // rectangular sliver. No source pixels/assets are changed or regenerated.
  const cuts = Array.from({ length: rows }, (_, row) => {
    const result = [0];
    for (let n = 1; n < columns; n++) {
      const ideal = Math.floor((n * width) / columns),
        radius = findGaps ? Math.max(1, Math.floor((width / columns) * 0.12)) : 0;
      let best = ideal,
        score = Infinity;
      for (let x = ideal - radius; x <= ideal + radius; x++) {
        let alpha = 0;
        for (
          let y = Math.floor((row * height) / rows);
          y < Math.floor(((row + 1) * height) / rows);
          y++
        )
          alpha += Number(pixels[(y * width + x) * 4 + 3]! >= 24);
        const cost = alpha * width + Math.abs(x - ideal);
        if (cost < score) {
          score = cost;
          best = x;
        }
      }
      result.push(best);
    }
    result.push(width);
    return result;
  });
  return Array.from({ length: columns * rows }, (_, n) => {
    const x0 = cuts[Math.floor(n / columns)]![n % columns]!,
      x1 = cuts[Math.floor(n / columns)]![(n % columns) + 1]!,
      y0 = Math.floor((Math.floor(n / columns) * height) / rows),
      y1 = Math.floor(((Math.floor(n / columns) + 1) * height) / rows);
    let left = x1,
      top = y1,
      right = x0,
      bottom = y0;
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++)
        if (pixels[(y * width + x) * 4 + 3]! >= 24) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
    return {
      x: left,
      y: top,
      width: Math.max(1, right - left + 1),
      height: Math.max(1, bottom - top + 1),
    };
  });
}
// Independent visual variation: never consumes the campaign PRNG.
const variation = (x: number, y: number, salt = 0) => {
  let h = Math.imul(x + 117 + salt, 374761393) ^ Math.imul(y + 93, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const waterPixel = (r: number, g: number, b: number) => b > r + 5 && r > g + 3 && b - g < 52;

/** Candidate water colors also occur in rock strokes; connectivity is only the water mask, not a mountain classifier. */
export interface WaterBody {
  area: number;
  purplePixels: number;
  bounds: [number, number, number, number];
  water: boolean;
  reason: 'coastal-connection' | 'water-colour-body' | 'geometry-hole' | 'unconfirmed';
}
export function traceWater(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  provinces: Scenario['provinces'] = [],
  bodies?: WaterBody[],
) {
  const mask = new Uint8Array(width * height),
    queue = new Uint32Array(mask.length);
  const bounds = provinces.map((p) => {
      const points = provinceRings(p).flat();
      return {
        p,
        left: Math.min(...points.map((p) => p[0])),
        right: Math.max(...points.map((p) => p[0])),
        top: Math.min(...points.map((p) => p[1])),
        bottom: Math.max(...points.map((p) => p[1])),
      };
    }),
    land = new Map<number, boolean>(),
    pitch = Math.ceil(width / 4);
  const nativeLand = (x: number, y: number) => {
    const gx = Math.floor(x / 4),
      gy = Math.floor(y / 4),
      key = gy * pitch + gx;
    if (!land.has(key)) {
      const xx = gx * 4 + 2,
        yy = gy * 4 + 2;
      land.set(
        key,
        bounds.some(
          (b) =>
            xx >= b.left &&
            xx <= b.right &&
            yy >= b.top &&
            yy <= b.bottom &&
            insideProvince(xx, yy, b.p),
        ),
      );
    }
    return land.get(key)!;
  };
  for (let i = 0; i < mask.length; i++)
    mask[i] = Number(
      waterPixel(pixels[i * 4]!, pixels[i * 4 + 1]!, pixels[i * 4 + 2]!) ||
        (pixels[i * 4] === pixels[i * 4 + 1] &&
          pixels[i * 4] === pixels[i * 4 + 2] &&
          pixels[i * 4]! >= 95 &&
          pixels[i * 4]! <= 151),
    );
  for (let seed = 0; seed < mask.length; seed++) {
    if (mask[seed] !== 1) continue;
    let head = 0,
      tail = 1,
      left = seed % width,
      right = left,
      top = Math.floor(seed / width),
      bottom = top,
      edge = false,
      purple = 0;
    queue[0] = seed;
    mask[seed] = 3;
    while (head < tail) {
      const i = queue[head++]!,
        x = i % width,
        y = Math.floor(i / width);
      if (waterPixel(pixels[i * 4]!, pixels[i * 4 + 1]!, pixels[i * 4 + 2]!)) purple++;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      // Retail LGMAP has a one/two-pixel dark frame. Coastal water can reach
      // its inner edge without ever touching the literal bitmap boundary.
      if (x <= 2 || y <= 2 || x >= width - 3 || y >= height - 3) edge = true;
      for (const n of [
        x ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        y ? i - width : -1,
        y < height - 1 ? i + width : -1,
      ])
        if (n >= 0 && mask[n] === 1) {
          mask[n] = 3;
          queue[tail++] = n;
        }
    }
    // Gray coastal dithering belongs to the connected sea. An isolated gray rock
    // cluster is not an inland lake merely because its bounding box is large.
    let water =
      (edge && purple > 0) ||
      (tail > 180 && Math.max(right - left, bottom - top) > 35 && purple / tail > 0.7);
    let reason: WaterBody['reason'] = water
      ? edge
        ? 'coastal-connection'
        : 'water-colour-body'
      : 'unconfirmed';
    // Ambiguous purple/gray bodies are also used for mountain symbols. Native
    // geometry holes can corroborate a lake, never plain pixel colour alone.
    const enclosed = bounds.some((b) => left >= b.left && right <= b.right && top >= b.top && bottom <= b.bottom);
    if (!water && enclosed && tail > 180 && purple > 150 && purple / tail > 0.15) {
      let outside = 0,
        samples = 0;
      for (let n = 0; n < tail; n += Math.max(1, Math.floor(tail / 49))) {
        const i = queue[n]!,
          x = i % width,
          y = Math.floor(i / width);
        outside += Number(!nativeLand(x, y));
        samples++;
      }
      water = outside / samples > 0.9;
      if (water) reason = 'geometry-hole';
    }
    if (bodies && tail > 100)
      bodies.push({
        area: tail,
        purplePixels: purple,
        bounds: [left, top, right, bottom],
        water,
        reason,
      });
    for (let n = 0; n < tail; n++) {
      const i = queue[n]!;
      // Gray 95/111 dither inside the sea is not a dry island. Conversely a
      // connected gray mountain on native land must not be flooded with it.
      const wet =
        water &&
        (!provinces.length ||
          waterPixel(pixels[i * 4]!, pixels[i * 4 + 1]!, pixels[i * 4 + 2]!) ||
          !nativeLand(i % width, Math.floor(i / width)));
      mask[i] = wet ? 2 : 0;
    }
  }
  return mask;
}

/** Source-local illustration. Province records constrain relief; they do not fill provinces. */
export function traceTerrain(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  scenario: Scenario,
  water = traceWater(pixels, width, height, scenario.provinces),
  aspects?: TerrainAspects,
) {
  const stride = 2,
    w = Math.ceil(width / stride),
    h = Math.ceil(height / stride);
  const fields = Array.from({ length: 8 }, () => new Float32Array((w + 1) * (h + 1)));
  for (let y = 1; y <= h; y++)
    for (let x = 1; x <= w; x++) {
      const values = new Array<number>(8).fill(0);
      // Integrate the entire source cell: taking only its NW pixel can erase
      // alternating dark/green retail dithering and change classification by parity.
      for (let dy = 0; dy < stride; dy++)
        for (let dx = 0; dx < stride; dx++) {
          const offset =
            (Math.min(height - 1, (y - 1) * stride + dy) * width +
              Math.min(width - 1, (x - 1) * stride + dx)) *
            4;
          const r = pixels[offset]!,
            g = pixels[offset + 1]!,
            b = pixels[offset + 2]!;
          const isWater = water[offset / 4]! > 0,
            pink = r > 125 && r > g * 1.35 && g < b * 1.28 && g > b;
          values[0]! += Number(g > r * 1.25 && g > b * 1.25) / 4;
          values[1]! +=
            Number(!isWater && ((r === g && g === b && r >= 103) || waterPixel(r, g, b))) / 4;
          values[2]! += Number(pink) / 4;
          values[3]! += Number(isWater) / 4;
          values[4]! += Number(r === g && g === b && r >= 31 && r < 103) / 4;
          values[5]! += Number(r >= 185 && g >= 145 && r > g && g > b * 1.15) / 4;
          values[6]! += Number(pink && r < 175) / 4;
          values[7]! += Number(r > 45 && r < 130 && r > g && g > b * 1.35 && g > r * 0.72) / 4;
        }
      const i = y * (w + 1) + x;
      for (let n = 0; n < fields.length; n++)
        fields[n]![i] =
          values[n]! + fields[n]![i - 1]! + fields[n]![i - w - 1]! - fields[n]![i - w - 2]!;
    }
  const density = (field: number, x: number, y: number, radius: number) => {
    const left = Math.max(0, Math.floor((x - radius) / stride)),
      top = Math.max(0, Math.floor((y - radius) / stride));
    const right = Math.min(w, Math.ceil((x + radius) / stride)),
      bottom = Math.min(h, Math.ceil((y + radius) / stride));
    const f = fields[field]!;
    return (
      (f[bottom * (w + 1) + right]! -
        f[top * (w + 1) + right]! -
        f[bottom * (w + 1) + left]! +
        f[top * (w + 1) + left]!) /
      Math.max(1, (right - left) * (bottom - top))
    );
  };
  const bounds = scenario.provinces.map((p) => {
    const points = provinceRings(p).flat();
    return {
      p,
      x0: Math.min(...points.map((p) => p[0])),
      x1: Math.max(...points.map((p) => p[0])),
      y0: Math.min(...points.map((p) => p[1])),
      y1: Math.max(...points.map((p) => p[1])),
    };
  });
  const provinceAt = (x: number, y: number) =>
    bounds.find(
      (b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && insideProvince(x, y, b.p),
    )?.p;
  // These are source-local ground-contact tests, not clipping at every border.
  // Brown-floor woods (notably the Crown's groves) need both native and image context.
  const ownership = new Map<number, Scenario['provinces'][number] | undefined>();
  const groundProvince = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return undefined;
    const xx = Math.round(x / 4) * 4,
      yy = Math.round(y / 4) * 4,
      key = yy * width + xx;
    if (!ownership.has(key)) ownership.set(key, provinceAt(xx, yy));
    return ownership.get(key);
  };
  const contactPoints = (a: TerrainAnchor) => {
    const f = terrainFootprint(a),
      points: [number, number][] = [[f.x, f.y]];
    for (let n = 0; n < 12; n++) {
      const t = (n * Math.PI) / 6;
      points.push([f.x + Math.cos(t) * f.rx * 0.88, f.y + Math.sin(t) * f.ry * 0.88]);
    }
    for (let n = 0; n < 8; n++) {
      const t = (n * Math.PI) / 4;
      points.push([f.x + Math.cos(t) * f.rx * 0.45, f.y + Math.sin(t) * f.ry * 0.45]);
    }
    return points;
  };
  const conflict = (a: TerrainAnchor) => {
    let bad = 0;
    const points = contactPoints(a);
    for (const [x, y] of points) {
      const p = groundProvince(x, y);
      if (!p || density(3, x, y, 4) > 0.15) {
        bad++;
        continue;
      }
      const green = density(0, x, y, 12),
        dark = density(4, x, y, 12),
        rock = density(1, x, y, 12);
      const localRock =
        rock > 0.045 ||
        (density(2, x, y, 14) > 0.24 &&
          density(6, x, y, 14) > 0.08 &&
          density(5, x, y, 14) > 0.025);
      if (a.kind === 'forest') {
        // Open terrain is clipped from the baked texture, preserving coverage
        // on the wooded side instead of shrinking a valid edge forest anchor.
        if (
          isForestClearing(p) &&
          scenario.provinces.find((p) => p.id === a.provinceId)?.terrain === 'forest'
        )
          continue;
        if (
          !terrainProfileAt(p, x, y).forestWidth ||
          (green < 0.055 &&
            !(
              p.terrain === 'forest' &&
              density(0, x, y, 24) > 0.045 &&
              density(7, x, y, 18) > 0.22
            ))
        )
          bad++;
      } else {
        // Forested slopes within a native highland are part of the mountain,
        // whereas source-backed forest records can represent lower neighboring land.
        const woods = p.terrain === 'forest' && green > 0.035 && dark > 0.012;
        const foreignLowland =
          p.id !== a.provinceId && !['mountains', 'heavy-mountains'].includes(p.terrain);
        if (
          (terrainProfileAt(p, x, y).relief === 'none' && a.kind !== 'hills') ||
          (!localRock &&
            (woods || foreignLowland) &&
            !(
              a.evidence === 'reviewed-range-link' &&
              terrainProfileAt(p, x, y).origin === easternMountainSpine.id
            ))
        )
          bad++;
      }
    }
    return bad / points.length;
  };
  const fit = (a: TerrainAnchor): TerrainAnchor | undefined => {
    a.aspect = aspects?.[a.kind === 'forest' ? 'forest' : 'ridge'][a.variant] ?? 0.85;
    const before = conflict(a);
    if (before <= 0.08) return a;
    const positions = [
      [0, 0],
      [-12, 0],
      [12, 0],
      [0, -12],
      [0, 12],
      [-24, 0],
      [24, 0],
      [0, -24],
      [0, 24],
    ];
    // A narrow source crag at a river/forest junction may need a half-grid fit;
    // try this only after normal fitting fails, keeping successful ranges intact.
    for (const fine of [false, true]) {
      if (fine && a.kind !== 'ridge') break;
      for (const scale of fine ? [0.6, 0.5, 0.4] : [1, 0.9, 0.8, 0.7, 0.6, 0.5]) {
        if (a.width * scale < (a.kind === 'forest' ? 32 : fine ? 28 : 36)) break;
        for (const [dx, dy] of fine
          ? [
              [-6, 0],
              [6, 0],
              [0, -6],
              [0, 6],
              [-6, -6],
              [6, -6],
              [-12, -12],
              [12, -12],
              [-12, 12],
              [12, 12],
            ]
          : positions) {
          const x = a.x + dx!,
            y = a.y + dy!;
          if (provinceAt(x, y)?.id !== a.provinceId) continue;
          const source =
            a.kind === 'forest'
              ? density(0, x, y, 18) > 0.065
              : a.evidence === 'retail-sandstone'
                ? density(6, x, y, 14) > 0.06 && density(5, x, y, 18) > 0.012
                : a.evidence === 'native-hills' || a.evidence === 'reviewed-foothills' ||
                  a.evidence === 'reviewed-range-link' ||
                  density(1, x, y, 10) > 0.04;
          if (!source) continue;
          const b = { ...a, x, y, width: a.width * scale },
            after = conflict(b);
          if (after <= 0.08)
            return { ...b, fit: { x: a.x, y: a.y, width: a.width, before, after } };
        }
      }
    }
    return undefined;
  };
  // Retail-only regional exceptions must never leak into development/custom scenarios.
  const regions =
    width === 1920 &&
    height === 2234 &&
    scenario.provinces.some((p) => p.id === 'anuire-province-148')
      ? terrainRegions
      : [];
  const candidates: (TerrainAnchor & { score: number })[] = [];
  for (let y = 10; y < height - 10; y += 12)
    for (let x = 10; x < width - 10; x += 12) {
      const rock = density(1, x, y, 10),
        pink = density(2, x, y, 18);
      const sandstone = pink > 0.24 && density(6, x, y, 14) > 0.08 && density(5, x, y, 18) > 0.018;
      if ((rock < 0.06 && !sandstone) || density(3, x, y, 14) > 0.025) continue;
      const p = provinceAt(x, y);
      if (!p) continue; // Coastal dithering and off-campaign sea cannot create mountains.
      const profile = terrainProfileAt(p, x, y);
      if (profile.relief === 'none' && !profile.hills) continue;
      const region = regions.find((r) => insideRing(x, y, r.polygon));
      const mountain = profile.relief === 'mountains' || profile.relief === 'heavy-mountains';
      // Small outcrops may cross a province edge, but need strong local rock AND
      // nearby highland context; they cannot become a full alpine mass on a plain.
      const nearHighland =
        !mountain &&
        (rock > 0.14 || (region?.style === 'arid-range' && sandstone)) &&
        density(5, x, y, 14) > 0.008 &&
        [
          [-40, 0],
          [40, 0],
          [0, -40],
          [0, 40],
        ].some(([dx, dy]) => {
          const terrain = provinceAt(x + dx!, y + dy!)?.terrain;
          return terrain === 'mountains' || terrain === 'heavy-mountains';
        });
      const structuredArid =
        region?.style === 'arid-range' && sandstone && density(5, x, y, 18) > 0.035;
      if (!mountain && !nearHighland && !structuredArid && !(p.terrain === 'hills' && rock > 0.09))
        continue;
      if (!mountain && rock < 0.09 && !structuredArid && !(nearHighland && sandstone)) continue;
      const prominent =
        mountain && (profile.relief === 'heavy-mountains' || region?.style === 'forested-peaks');
      const arid = sandstone && pink > 0.24;
      let size = prominent ? 104 : mountain ? 76 : 50;
      let heightScale = prominent ? 0.95 : mountain ? 0.8 : 0.64;
      if (region?.style === 'granite-range' && mountain) size += 8;
      if (region?.style === 'arid-range') {
        size = mountain ? 99 : 64;
        heightScale = mountain ? 0.86 : 0.6;
      }
      if (region?.style === 'coastal-range') {
        size = p.terrain === 'heavy-mountains' ? 88 : mountain ? 62 : 42;
        heightScale = p.terrain === 'heavy-mountains' ? 0.8 : 0.68;
      }
      size += variation(x, y, 13) * (prominent ? 14 : 10);
      if (profile.relief === 'outcrop') {
        size = Math.min(size, 60);
        heightScale = Math.min(heightScale, 0.55);
      }
      // Check the full ground footprint, rather than just a grid point near a coast.
      while (size > 38 && density(3, x, y, size * 0.34) > 0.025) size -= 8;
      if (size <= 38) continue;
      candidates.push({
        x,
        y,
        width: size,
        heightScale,
        variant:
          (arid ? 8 : prominent ? 0 : p.terrain === 'hills' ? 10 : 4) +
          Math.floor(variation(x, y, 51) * (arid || p.terrain === 'hills' ? 2 : 4)),
        kind: profile.hills && !mountain ? 'hills' : 'ridge',
        provinceId: p.id,
        evidence: arid ? 'retail-sandstone' : 'retail-rock',
        region: region?.id,
        policy: profile.origin,
        score: rock + (sandstone ? density(6, x, y, 14) * 0.5 : 0),
      });
    }
  const anchors: TerrainAnchor[] = [];
  // Strongest source-local feature wins; a coarse jittered grid no longer misses
  // narrow forested ridges or anchors an oversized massif between rock strokes.
  candidates.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
  for (const { score: _score, ...a } of candidates) {
    const connected = [
      'eastern-granite-chain',
      'gorgons-rugged-uplands',
      'five-peaks-northern-ridge',
    ].includes(a.region ?? '');
    if (
      anchors.every(
        (b) => Math.hypot(a.x - b.x, a.y - b.y) > (a.width + b.width) * (connected ? 0.23 : 0.32),
      )
    )
      anchors.push(a);
  }
  // Lower source-supported shoulders bridge the space around major peaks. They
  // use the remaining rock candidates, never arbitrary offsets into meadow/sea.
  const peaks = [...anchors];
  for (const { score: _score, ...a } of candidates) {
    if (a.kind !== 'ridge' || a.evidence !== 'retail-rock') continue;
    const peak = peaks.find(
      (b) =>
        b.kind === 'ridge' && b.width >= 90 && Math.hypot(a.x - b.x, a.y - b.y) < b.width * 0.72,
    );
    if (!peak || anchors.some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 35)) continue;
    anchors.push({
      ...a,
      width: Math.min(72, a.width * 0.68),
      heightScale: 0.55,
      variant: 4 + Math.floor(variation(a.x, a.y, 89) * 4),
      role: 'foothill',
    });
  }
  // The two narrow reviewed foothill provinces need a finer sampling lattice;
  // all other provinces retain the original 54-unit hill samples.
  for (let gy = 30; gy < height - 25; gy += 27)
    for (let gx = 30; gx < width - 25; gx += 27) {
      const x = gx + (variation(gx, gy) - 0.5) * 20,
        y = gy + (variation(gx, gy, 19) - 0.5) * 20;
      const p = provinceAt(x, y);
      const profile = p && terrainProfileAt(p, x, y);
      // Explicitly reviewed open foothills use their province interpretation;
      // green retail stippling must not erase every rolling-hill group.
      const reviewedFoothills = profile?.origin === 'reviewed-baruk-foothills';
      if (
        !p ||
        !profile?.hills ||
        (!reviewedFoothills && ((gx - 30) % 54 !== 0 || (gy - 30) % 54 !== 0)) ||
        density(3, x, y, 28) > 0.015 ||
        (!reviewedFoothills &&
          (density(0, x, y, 24) > 0.22 || density(4, x, y, 24) > 0.09))
      )
        continue;
      if (anchors.some((a) => Math.hypot(a.x - x, a.y - y) < (reviewedFoothills ? 36 : 60))) continue;
      anchors.push({
        x,
        y,
        width: reviewedFoothills
          ? 60 + variation(gx, gy, 13) * 12
          : 66 + variation(gx, gy, 13) * 20,
        heightScale: 0.7,
        variant: 10 + Math.floor(variation(gx, gy, 51) * 2),
        kind: 'hills',
        provinceId: p.id,
        evidence: profile.origin === 'native' ? 'native-hills' : 'reviewed-foothills',
        policy: profile.origin,
      });
    }
  const fittedRelief = anchors.map(fit).filter((a): a is TerrainAnchor => Boolean(a));
  anchors.splice(
    0,
    anchors.length,
    ...fittedRelief.map((a) => (regions.length ? placeRegionalRelief(a) : a)),
  );
  // Connect only the explicitly reviewed eastern spine, between existing
  // source-supported peak groups. Lower shoulders follow land around the lake;
  // they never extrapolate a mountain route from pixel colour or fill water.
  if (regions.length) {
    for (let i = 4; i < easternMountainSpine.path.length; i++) {
      const start = easternMountainSpine.path[i - 1]!,
        end = easternMountainSpine.path[i]!,
        steps = Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / 28);
      for (let step = 1; step < steps; step++) {
        const x = start[0] + ((end[0] - start[0]) * step) / steps,
          y = start[1] + ((end[1] - start[1]) * step) / steps,
          p = provinceAt(x, y);
        if (
          !p ||
          terrainProfileAt(p, x, y).origin !== easternMountainSpine.id ||
          density(3, x, y, 14) > 0.025 ||
          anchors.some((a) => a.kind === 'ridge' && Math.hypot(a.x - x, a.y - y) < 34)
        )
          continue;
        const a = fit({
          x,
          y,
          width: 64,
          heightScale: 0.52,
          variant: 4 + Math.floor(variation(x, y, 143) * 4),
          kind: 'ridge',
          provinceId: p.id,
          evidence: 'reviewed-range-link',
          region: easternMountainSpine.id,
          policy: easternMountainSpine.id,
          role: 'foothill',
        });
        if (a && anchors.every((b) => b.kind !== 'ridge' || Math.hypot(a.x - b.x, a.y - b.y) > 24)) anchors.push(a);
      }
    }
  }
  const relief = [...anchors];
  const woodland: (TerrainAnchor & { score: number; spacing: number })[] = [];
  for (let gy = 21; gy < height - 15; gy += 32)
    for (let gx = 21; gx < width - 15; gx += 32) {
      const x = gx + (variation(gx, gy) - 0.5) * 22,
        y = gy + (variation(gx, gy, 19) - 0.5) * 22;
      const green = density(0, x, y, 27),
        dark = density(4, x, y, 27),
        p = provinceAt(x, y);
      const region = regions.find((r) => insideRing(x, y, r.polygon));
      const ancient = region?.style === 'ancient-forest',
        great = ancient || region?.style === 'great-forest';
      const broadGreen = density(0, x, y, 42),
        broadDark = density(4, x, y, 36);
      const dryWoodland =
        p?.terrain === 'forest' &&
        broadGreen > 0.055 &&
        broadGreen < 0.18 &&
        broadDark > 0.012 &&
        density(7, x, y, 27) > 0.24;
      // Brown forest floor breaks the narrow green threshold in the retail art.
      // Wider canopy context bridges those gaps, including across province edges.
      const continuity = broadGreen > (great ? 0.16 : 0.24) && broadDark > 0.035;
      const profile = p ? terrainProfileAt(p, x, y) : undefined;
      if (
        !p ||
        !profile?.forestWidth ||
        green <
          (great && continuity
            ? 0.105
            : dryWoodland
              ? 0.04
              : p.terrain === 'forest' && broadGreen > 0.065 && broadDark > 0.018
                ? 0.055
                : 0.17) ||
        density(3, x, y, 6) > 0.06 ||
        (density(2, x, y, 18) > 0.17 &&
          !dryWoodland &&
          !(p.terrain === 'forest' && green > 0.055 && dark > 0.012)) ||
        (!continuity && dark <= 0.1 && p.terrain !== 'forest')
      )
        continue;
      const canopy = Math.max(
        dryWoodland ? Math.min(0.65, density(7, x, y, 27) * 0.9 + green) : 0,
        0,
        Math.min(1, (Math.max(green, broadGreen * (great ? 1.15 : 0.85)) - 0.17) * 2.5 + dark * 2),
      );
      const edge = !dryWoodland && (broadGreen < 0.22 || green < 0.14);
      let size = (edge ? 40 : 59) + canopy * (great ? 58 : 45) + variation(gx, gy, 51) * 10;
      let heightScale = (edge ? 0.48 : 0.56) + canopy * (great ? 0.34 : 0.32);
      size = Math.min(size, profile.forestWidth);
      heightScale = Math.min(heightScale, profile.forestHeight);
      // Reduce only the bank-side group, rather than erase a broad river corridor.
      while (size > 36 && density(3, x, y, size * 0.23) > 0.045) size -= 7;
      if (size <= 36) continue;
      const proximity = Math.min(
        ...relief.map((a) =>
          Math.hypot(
            (a.x - x) / (a.width * 0.42 + size * 0.18),
            (a.y - y) / (a.width * 0.28 + size * 0.22),
          ),
        ),
      );
      if (proximity < 0.65) continue;
      if (proximity < 1.1) {
        size *= 0.8;
        heightScale *= 0.85;
      }
      woodland.push({
        x,
        y,
        width: size,
        heightScale,
        variant: Math.floor(variation(gx, gy, 71) * 12),
        kind: 'forest',
        provinceId: p.id,
        evidence: 'retail-canopy',
        region: region?.id,
        policy: profile.origin,
        role: edge ? 'woodland-edge' : undefined,
        score: canopy + variation(gx, gy, 113) * 0.18,
        spacing: great ? (ancient ? 30 : 32) : dryWoodland ? 38 : 45,
      });
    }
  const trees: TerrainAnchor[] = [];
  woodland.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
  for (const { score: _score, spacing, ...a } of woodland) {
    if (trees.every((b) => Math.hypot(a.x - b.x, a.y - b.y) > spacing)) {
      const fitted = fit(a);
      if (fitted) trees.push(fitted);
    }
  }
  anchors.push(...trees);
  return anchors
    .filter(
      (a) =>
        a.kind !== 'forest' ||
        !isForestClearing(scenario.provinces.find((p) => p.id === a.provinceId)),
    )
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Compact reproducible audit: every province is checked, only anomalies need review. */
export function auditTerrainPlacement(scenario: Scenario, anchors: TerrainAnchor[]) {
  const provinces = scenario.provinces.map((p) => {
    const objects = anchors.filter((a) => a.provinceId === p.id);
    const ridges = objects.filter((a) => a.kind === 'ridge');
    const nativeMountain = p.terrain === 'mountains' || p.terrain === 'heavy-mountains';
    const incompatible = objects.filter((a) => {
      const profile = terrainProfileAt(p, a.x, a.y);
      return a.kind === 'forest'
        ? !profile.forestWidth || a.width > profile.forestWidth + 0.001
        : a.kind === 'hills'
          ? !profile.hills
          : profile.relief === 'none';
    });
    return {
      id: p.id,
      name: p.name,
      terrain: p.terrain,
      forest: objects.filter((a) => a.kind === 'forest').length,
      ridges: ridges.length,
      hills: objects.filter((a) => a.kind === 'hills').length,
      reviewed: objects.filter((a) => terrainProfileAt(p, a.x, a.y).origin !== 'native').length,
      incompatible: incompatible.map((a) => ({ kind: a.kind, x: a.x, y: a.y, policy: a.policy })),
      warnings: [
        ...(nativeMountain && !ridges.length ? ['native-mountain-without-visible-ridge'] : []),
        ...(p.terrain === 'forest' && !objects.some((a) => a.kind === 'forest')
          ? ['native-forest-without-canopy']
          : []),
        ...(incompatible.length ? ['native-terrain-policy-conflict'] : []),
        ...(!nativeMountain &&
        ridges.some(
          (a) =>
            terrainProfileAt(p, a.x, a.y).origin === 'native' && (a.width > 75 || a.variant < 4),
        )
          ? ['oversized-lowland-ridge']
          : []),
      ],
    };
  });
  return {
    total: anchors.length,
    provinces,
    suspicious: provinces.filter((p) => p.warnings.length),
    outsideProvinces: anchors.filter((a) => !a.provinceId).length,
    footprintFits: anchors
      .filter((a) => a.fit)
      .map((a) => ({
        provinceId: a.provinceId,
        kind: a.kind,
        original: a.fit,
        current: { x: a.x, y: a.y, width: a.width },
        ground: terrainFootprint(a),
      })),
    evidence: anchors.reduce<Record<string, number>>((out, a) => {
      const key = a.evidence ?? 'unknown';
      out[key] = (out[key] ?? 0) + 1;
      return out;
    }, {}),
  };
}
