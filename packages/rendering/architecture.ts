import type { Campaign, Scenario } from '../core/schema';
import type { AnuireResearch } from '../world-data/anuire-research';
import selections from '../import-tools/landmark-selections.json';

export interface ArchitecturalSite {
  id: string;
  provinceId: string;
  owner: string;
  texture: number | string;
  x: number;
  y: number;
  width: number;
  anchorY: number;
  role: string;
  representedIds: string[];
  sourceId?: string;
  originalResource?: string;
  alpha?: number;
}
type PortLocation = { sourceId: string; x: number; y: number };
/** HD presentation stages; these do not replace the original resource selector. */
export function castleArtForLevel(level: number) {
  for (let i = selections.ordinaryCastles.tiers.length - 1; i >= 0; i--) {
    const tier = selections.ordinaryCastles.tiers[i]!;
    if (level >= tier.minimumLevel) return tier.texture;
  }
  return undefined;
}
const storedPoint = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) && value[0] !== 0;

/** Presentation only. Compose related records without merging/deleting them;
 * finished fortresses follow the current fort level, never the opening template.
 */
export function architecturalSites(scenario: Scenario, state: Campaign, locations: PortLocation[]) {
  const raw = scenario.originalData as AnuireResearch | undefined;
  const verified = raw?.sources?.some(
    (s) => s.id === 'cd-template' && s.sha256 === selections.templateSha256,
  );
  const sites: ArchitecturalSite[] = [];
  for (const province of scenario.provinces) {
    const p = state.provinces.find((p) => p.id === province.id)!;
    const ports = state.ports?.filter((p) => p.provinceId === province.id) ?? [];
    const consumedPorts = new Set<string>();
    for (const fort of state.fortifications?.filter((f) => f.provinceId === p.id && f.level > 0) ??
      []) {
      const original = raw?.campaign.forts.find((f) => `anuire-place-${f.index}` === fort.sourceId);
      const landmark = verified
        ? selections.landmarks.find((l) => l.sourceId === fort.sourceId && l.provinceId === p.id)
        : undefined;
      const override = verified
        ? selections.placementOverrides.find(
            (o) => o.sourceId === fort.sourceId && o.provinceId === p.id,
          )
        : undefined;
      const point =
        landmark?.hd.position ??
        override?.position ??
        (storedPoint(original?.center) ? original.center : province.center);
      const cityPort =
        landmark?.id === 'imperial-city'
          ? ports.find((p) => p.sourceId === 'anuire-place-480')
          : undefined;
      if (cityPort) consumedPorts.add(cityPort.id);
      const special = landmark;
      sites.push({
        id: fort.id,
        provinceId: p.id,
        owner: fort.realmId,
        texture: special
          ? landmark.hd.texture
          : fort.kind === 'wizard-tower'
            ? 6
            : castleArtForLevel(fort.level) ?? 4,
        x: point[0]!,
        y: point[1]!,
        width: special
          ? landmark.hd.width * (0.78 + (0.22 * Math.min(7, fort.level)) / 7)
          : fort.kind === 'wizard-tower'
            ? 52
            : 55 + Math.min(7, fort.level) * 3,
        anchorY: special ? landmark.hd.anchorY : 0.86,
        role: special ? 'landmark-' + landmark.id : fort.kind,
        representedIds: [fort.id, ...(cityPort ? [cityPort.id] : [])],
        sourceId: fort.sourceId,
        originalResource: landmark?.original.resourceKey,
      });
    }
    for (const port of ports) {
      if (consumedPorts.has(port.id)) continue;
      const point = locations.find((l) => l.sourceId === port.sourceId);
      const override = verified
        ? selections.placementOverrides.find(
            (o) => o.sourceId === port.sourceId && o.provinceId === p.id,
          )
        : undefined;
      // A lost imperial fort must not leave a completed citadel in its port art.
      sites.push({
        id: port.id,
        provinceId: p.id,
        owner: port.realmId,
        texture: 3,
        x: override?.position[0] ?? point?.x ?? province.center[0],
        y: override?.position[1] ?? point?.y ?? province.center[1],
        width: p.level >= 7 ? 60 : 50,
        anchorY: 0.83,
        role: port.kind,
        representedIds: [port.id],
        sourceId: port.sourceId,
      });
    }
    const guild = state.holdings
      .filter((h) => h.provinceId === p.id && h.type === 'guild' && h.level >= 3 && !h.destroyed)
      .sort((a, b) => b.level - a.level || a.id.localeCompare(b.id))[0];
    const original = raw?.campaign.holdings.find((h) => h.id === guild?.sourceId);
    // Zero coordinates mean the original assigned a runtime layout, not a
    // recovered town location. Do not invent a visible decorative settlement.
    if (guild && !ports.length && storedPoint(original?.center)) {
      const point = original.center;
      const width = guild.level >= 5 ? 44 : 34;
      const crowded = sites.some(
        (s) =>
          s.provinceId === p.id &&
          Math.hypot(s.x - point[0], s.y - point[1]) < (s.width + width) * 0.48,
      );
      if (!crowded)
        sites.push({
          id: guild.id,
          provinceId: p.id,
          owner: guild.realmId,
          texture: guild.level >= 5 ? 1 : 0,
          x: point[0],
          y: point[1],
          width,
          anchorY: 0.84,
          role: 'guild-seat',
          representedIds: [guild.id],
          sourceId: guild.sourceId,
        });
    }
  }
  return sites;
}
