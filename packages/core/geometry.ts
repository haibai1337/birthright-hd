import type { Scenario } from './schema';
type Point = readonly [number, number];
export function insideRing(x: number, y: number, ring: readonly Point[]) {
  let yes = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!,
      b = ring[j]!;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
      yes = !yes;
  }
  return yes;
}
export const provinceRings = (p: Scenario['provinces'][number]) => p.rings ?? [p.polygon];
/** Even-odd rule handles islands and holes without connecting disjoint rings. */
export const insideProvince = (x: number, y: number, p: Scenario['provinces'][number]) =>
  provinceRings(p).reduce((inside, r) => inside !== insideRing(x, y, r), false);
