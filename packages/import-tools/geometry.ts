export type Point = [number, number];
export interface ProvinceGeometry {
  provinceIndex: number;
  pixelArea: number;
  rings: Point[][];
  centerValue: number | null;
}
export interface IndexedMap {
  width: number;
  height: number;
  pixels: Uint8Array;
}
export function signedArea(points: Point[]) {
  return (
    points.reduce((sum, a, i) => {
      const b = points[(i + 1) % points.length];
      return b ? sum + a[0] * b[1] - a[1] * b[0] : sum;
    }, 0) / 2
  );
}
/** Trace exact cell edges at the original hit-map resolution. No guessed smoothing. */
export function traceProvinceGeometry(
  map: IndexedMap,
  provinceIndex: number,
  center: Point,
  scale = 4,
): ProvinceGeometry {
  const { width, height, pixels } = map;
  const value = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? -1 : pixels[y * width + x];
  type Edge = { a: Point; b: Point; dir: number; used: boolean };
  const edges: Edge[] = [];
  let pixelArea = 0;
  const add = (a: Point, b: Point, dir: number) => edges.push({ a, b, dir, used: false });
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (value(x, y) === provinceIndex) {
        pixelArea++;
        if (value(x, y - 1) !== provinceIndex) add([x, y], [x + 1, y], 0);
        if (value(x + 1, y) !== provinceIndex) add([x + 1, y], [x + 1, y + 1], 1);
        if (value(x, y + 1) !== provinceIndex) add([x + 1, y + 1], [x, y + 1], 2);
        if (value(x - 1, y) !== provinceIndex) add([x, y + 1], [x, y], 3);
      }
  const key = (p: Point) => `${p[0]},${p[1]}`,
    outgoing = new Map<string, Edge[]>();
  for (const edge of edges) {
    const k = key(edge.a);
    outgoing.set(k, [...(outgoing.get(k) ?? []), edge]);
  }
  const rings: Point[][] = [];
  for (const first of edges) {
    if (first.used) continue;
    const ring: Point[] = [];
    let current = first;
    for (let steps = 0; steps <= edges.length; steps++) {
      if (current.used) throw new Error('Contour reuses an edge');
      current.used = true;
      ring.push(current.a);
      if (key(current.b) === key(first.a)) break;
      const candidates = (outgoing.get(key(current.b)) ?? []).filter((e) => !e.used);
      const rank = [1, 0, 3, 2];
      candidates.sort(
        (a, b) =>
          rank.indexOf((a.dir - current.dir + 4) % 4) - rank.indexOf((b.dir - current.dir + 4) % 4),
      );
      const next = candidates[0];
      if (!next) throw new Error('Open province contour');
      current = next;
      if (steps === edges.length) throw new Error('Contour traversal did not close');
    }
    const reduced = ring.filter((p, i) => {
      const before = ring[(i + ring.length - 1) % ring.length],
        after = ring[(i + 1) % ring.length];
      return (
        before &&
        after &&
        (p[0] - before[0]) * (after[1] - p[1]) !== (p[1] - before[1]) * (after[0] - p[0])
      );
    });
    rings.push(reduced.map(([x, y]) => [x * scale, y * scale]));
  }
  rings.sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)));
  const area = rings.reduce((n, r) => n + signedArea(r), 0) / (scale * scale);
  if (area !== pixelArea) throw new Error('Province contour does not preserve pixel area');
  return {
    provinceIndex,
    pixelArea,
    rings,
    centerValue: value(Math.floor(center[0] / scale), Math.floor(center[1] / scale)) ?? null,
  };
}
export function rasterAdjacency(map: IndexedMap, valid: Set<number>) {
  const counts = new Map<string, number>();
  const count = (a: number, b: number) => {
    if (a === b || !valid.has(a) || !valid.has(b)) return;
    const key = [Math.min(a, b), Math.max(a, b)].join(':');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const v = map.pixels[y * map.width + x];
      if (v === undefined) continue;
      if (x + 1 < map.width) count(v, map.pixels[y * map.width + x + 1] ?? -1);
      if (y + 1 < map.height) count(v, map.pixels[(y + 1) * map.width + x] ?? -1);
    }
  return [...counts]
    .map(([key, sharedPixels]) => ({
      provinces: key.split(':').map(Number) as [number, number],
      sharedPixels,
    }))
    .sort((a, b) => a.provinces[0] - b.provinces[0] || a.provinces[1] - b.provinces[1]);
}
