import type { Scenario } from '../core/schema';
import { insideProvince, provinceRings } from '../core/geometry';
import type { TerrainMaterial, TerrainPilotPatch } from './base-terrain';

/** One deliberately local HD experiment, never a native terrain/data override. */
export const thoralinarPilot = {
  enabled: true,
  provinceId: 'anuire-province-070',
  file: '/art/anuire/thoralinar-terrain-pilot-v1.png',
  x: 1024, y: 1184, width: 224, height: 160,
  transition: 10,
} as const;

/** Inner feather only: not one ground pixel in neighboring provinces is replaced.
 * The painted plate depicts connected slopes/valleys, not baked atlas objects. */
export function createThoralinarPilot(
  province: Scenario['provinces'][number],
  material: TerrainMaterial,
): TerrainPilotPatch {
  const { x, y, width, height, transition } = thoralinarPilot,
    mask = new Float32Array(width * height),
    rings = provinceRings(province);
  for (let py = 0; py < height; py++)
    for (let px = 0; px < width; px++) {
      const wx = x + px + 0.5, wy = y + py + 0.5;
      if (!insideProvince(wx, wy, province)) continue;
      let distance = Infinity;
      for (const ring of rings) for (let i = 0; i < ring.length; i++) {
        const a = ring[i]!, b = ring[(i + 1) % ring.length]!,
          dx = b[0] - a[0], dy = b[1] - a[1],
          t = Math.max(0, Math.min(1,
            ((wx - a[0]) * dx + (wy - a[1]) * dy) / (dx * dx + dy * dy || 1)));
        distance = Math.min(distance, Math.hypot(wx - a[0] - dx * t, wy - a[1] - dy * t));
      }
      // Leave enough zero support for bilinear sampling at every LOD: no weight
      // can interpolate across the real province edge or an interior hole.
      const t = Math.max(0, Math.min(1, (distance - 1.5) / transition));
      mask[py * width + px] = t * t * (3 - 2 * t);
    }
  // Match the existing olive meadow without discarding painted rock colours,
  // directional shadows or fine brush detail. The art master stays untouched.
  return { x, y, worldWidth: width, worldHeight: height, material, mask, gain: [0.9, 0.97, 1.08] };
}
