import { createHash } from 'node:crypto';
import { validateAnuireResearch } from '../world-data/anuire-research.ts';
import { originalMapIcons, originalPlaceGraphicIndex } from './art-identities.ts';
import { decodeResourceDirectory, unpackResource } from './resources.ts';
import selections from './landmark-selections.json' with { type: 'json' };
interface NativeMapLocation {
  sourceId: string;
  provinceId: string;
  x: number;
  y: number;
  icon: number;
}
interface NativeMapStructure extends NativeMapLocation {
  offset: number;
  level: number;
  realmIndex: number;
  positionMode: 'runtime-assigned' | 'stored';
  resourceIndex: number | undefined;
  resourceKey: string | null;
}

/** Read source place coordinates without changing any original record or bitmap. */
export function extractMapLocations(input: unknown, bytes: Uint8Array, uiArchive?: Uint8Array) {
  const raw = validateAnuireResearch(input),
    hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== raw.sources.find((s) => s.id === 'cd-template')?.sha256)
    throw Error('Map locations require the matching original template');
  const block = (
    raw.campaign.layout as {
      blocks: { name: string; offset: number; stride: number; count: number }[];
    }
  ).blocks.find((b) => b.name === 'places');
  if (!block || block.stride !== 20 || block.offset + block.count * 20 > bytes.length)
    throw Error('Invalid places block');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    provinceOf = new Map<number, number>();
  for (const p of raw.campaign.provinces) {
    const first = view.getInt16(Number(p.offset) + 30, true),
      visited = new Set<number>();
    let index = first;
    while (index) {
      if (index < 0 || index >= block.count || visited.has(index) || provinceOf.has(index))
        throw Error('Invalid original place chain');
      visited.add(index);
      provinceOf.set(index, p.index);
      const next = view.getInt16(block.offset + index * 20 + 12, true);
      index = next ? first + next : 0;
    }
  }
  const locations: NativeMapLocation[] = [],
    structures: NativeMapStructure[] = [];
  for (let index = 1; index < block.count; index++) {
    const offset = block.offset + index * 20,
      word = view.getUint32(offset + 4, true),
      icon = (word >>> 11) & 127;
    if (icon < 93 || icon > 118 || !provinceOf.has(index)) continue;
    const x = view.getInt16(offset, true),
      y = view.getInt16(offset + 2, true);
    if (x < 0 || y < 0 || x >= raw.map.width || y >= raw.map.height)
      throw Error('Map location outside native artwork');
    const place = {
      sourceId: `anuire-place-${index}`,
      provinceId: `anuire-province-${String(provinceOf.get(index)).padStart(3, '0')}`,
      x,
      y,
      icon,
    };
    const level = (word >>> 7) & 15,
      resourceIndex = originalPlaceGraphicIndex(icon, level);
    structures.push({
      ...place,
      offset,
      level,
      realmIndex: word & 127,
      positionMode: x === 0 ? 'runtime-assigned' : 'stored',
      resourceIndex,
      resourceKey: resourceIndex === undefined ? null : `UI/${originalMapIcons[resourceIndex]}.PCX`,
    });
    if ([93, 94, 95, 96].includes(icon)) locations.push(place);
  }
  const graphics = uiArchive
    ? (() => {
        const entries = decodeResourceDirectory(uiArchive);
        return Object.entries(selections.resources).map(([resourceKey, expected]) => {
          const entry = entries.find((e) => 'UI/' + e.name === resourceKey);
          if (!entry) throw Error(`Missing original map graphic ${resourceKey}`);
          const decodedSha256 = createHash('sha256').update(unpackResource(entry)).digest('hex');
          if (
            entry.hash !== expected.archiveHash ||
            entry.offset !== expected.offset ||
            decodedSha256 !== expected.decodedSha256
          )
            throw Error(`Original map graphic differs from verified source: ${resourceKey}`);
          return {
            resourceKey,
            archive: 'RESFILES/UI.RES',
            archiveHash: entry.hash,
            offset: entry.offset,
            decodedSha256,
            usageCount: structures.filter((s) => s.resourceKey === resourceKey).length,
          };
        });
      })()
    : undefined;
  return {
    sourceSha256: hash,
    width: raw.map.width,
    height: raw.map.height,
    locations,
    structures,
    graphics,
  };
}
