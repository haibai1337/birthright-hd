import { BinaryReader, bits } from './binary.ts';
import { readPeStrings } from './pe.ts';
import type { StringCatalog } from './strings.ts';
export const BLOCKS = [
  'realms',
  'regents',
  'reactions',
  'relationships',
  'provinces',
  'places',
  'units',
  'ai',
  'realmOrder',
  'tribute',
  'adventureSites',
] as const;
const STRIDES = [20, 14, 52, 52, 32, 20, 14, 56, 1, 52, 16];
export interface DataBlock {
  name: (typeof BLOCKS)[number];
  header: number;
  offset: number;
  stride: number;
  count: number;
  end: number;
}
export function decodeCampaignBlocks(bytes: Uint8Array) {
  const r = new BinaryReader(bytes),
    version = r.u32(0);
  if (version !== 0x20050 && version !== 0x20051)
    throw new Error(`Unsupported original save version ${version}`);
  let at = 89;
  const blocks: DataBlock[] = [];
  for (let i = 0; i < BLOCKS.length; i++) {
    const name = BLOCKS[i];
    if (!name) throw new Error('Invalid block schema');
    const stride = r.u32(at),
      count = r.u32(at + 4);
    if (stride !== STRIDES[i] || count > 10000 || count < 1)
      throw new Error(`Unsupported ${name} block layout`);
    r.range(at + 8, stride * count);
    const end = at + 8 + stride * count;
    blocks.push({ name, header: at, offset: at + 8, stride, count, end });
    at = end;
  }
  return {
    version,
    homeRealm: r.i16(4),
    date: r.u32(6),
    scenarioFlags: r.u32(73),
    blocks,
    characterTail: { offset: at, length: bytes.length - at },
  };
}
export function parseAvatarText(bytes: Uint8Array) {
  const text = new TextDecoder('windows-1252').decode(bytes);
  const values = text
    .split(/\r?\n/)
    .map((s) => s.replace(/#.*$/, '').trim())
    .filter(Boolean);
  if (values[0] !== '0' || values[2] !== '0' || values.length < 27)
    throw new Error('Unsupported avatar text version/layout');
  const integer = (i: number) => {
    const value = Number(values[i]);
    if (!Number.isSafeInteger(value)) throw new Error(`Invalid avatar number at ${i}`);
    return value;
  };
  const classes = [24, 25].map((i) => {
    const v = values[i]?.split(/\s+/).map(Number);
    if (!v || v.length !== 3 || v.some((x) => !Number.isSafeInteger(x)))
      throw new Error('Invalid avatar class tuple');
    return { classCode: v[0] ?? -1, level: v[1] ?? 0, experience: v[2] ?? 0 };
  });
  return {
    name: values[10] ?? '',
    race: integer(9),
    attributes: {
      strength: integer(3),
      dexterity: integer(4),
      constitution: integer(5),
      intelligence: integer(6),
      wisdom: integer(7),
      charisma: integer(8),
    },
    hitPoints: integer(14),
    alignment: integer(13),
    classes,
  };
}
export function decodeOriginalCampaign(
  bytes: Uint8Array,
  exe: Uint8Array,
  strings: StringCatalog,
  avatar: (id: number) => Uint8Array | undefined,
) {
  const r = new BinaryReader(bytes),
    layout = decodeCampaignBlocks(bytes),
    pe = readPeStrings(exe),
    catalog = new Map(strings.entries.map((e) => [e.id, e]));
  const block = (name: DataBlock['name']) => {
    const b = layout.blocks.find((b) => b.name === name);
    if (!b) throw new Error(`Missing block ${name}`);
    return b;
  };
  const rb = block('realms'),
    gb = block('regents'),
    pb = block('provinces'),
    hb = block('places'),
    ub = block('units');
  const regents = Array.from({ length: gb.count - 1 }, (_, n) => {
    const index = n + 1,
      offset = gb.offset + index * 14,
      a = r.u32(offset),
      b = r.u32(offset + 4),
      avatarId = r.i16(offset + 10),
      source = avatar(avatarId);
    const identity = source ? parseAvatarText(source) : null;
    return {
      id: `anuire-regent-${index.toString().padStart(3, '0')}`,
      index,
      offset,
      realmIndex: bits(a, 0, 7),
      raceCode: bits(a, 7, 4),
      classCode: bits(a, 11, 4),
      level: bits(a, 15, 6),
      secondClassCode: bits(a, 21, 4),
      secondLevel: bits(a, 25, 6),
      bloodline: { grade: bits(b, 0, 3), derivation: bits(b, 3, 3), strength: bits(b, 6, 8) },
      unitIndex: r.i16(offset + 8),
      avatarId,
      identity,
    };
  });
  const realms = Array.from({ length: rb.count - 1 }, (_, n) => {
    const index = n + 1,
      offset = rb.offset + index * 20,
      nameId = r.u32(offset),
      name = catalog.get(nameId)?.text;
    if (!name) throw new Error(`Missing realm name ID ${nameId}`);
    const flags = r.u32(offset + 8);
    return {
      id: `anuire-realm-${index.toString().padStart(2, '0')}`,
      index,
      offset,
      name,
      nameId,
      labelPosition: [r.i16(offset + 4), r.i16(offset + 6)] as [number, number],
      regentIndex: bits(flags, 17, 7),
      playable: Boolean(bits(flags, 26, 1)),
      court: bits(flags, 28, 3),
      exists: Boolean(bits(flags, 31, 1)),
      regency: r.u16(offset + 14),
      treasury: r.u16(offset + 16),
      income: r.i16(offset + 18),
    };
  });
  const provinces = Array.from({ length: pb.count - 1 }, (_, n) => {
    const index = n + 1,
      offset = pb.offset + index * 32,
      a = r.u32(offset + 8),
      b = r.u32(offset + 12),
      pointer = r.u32(offset),
      name = pe.stringAt(pointer);
    const borders = Array.from({ length: 7 }, (_, i) => ({
      provinceIndex: r.u8(offset + 16 + i * 2),
      movementCode: r.u8(offset + 17 + i * 2),
    })).filter((e) => e.provinceIndex !== 0);
    return {
      id: `anuire-province-${index.toString().padStart(3, '0')}`,
      index,
      offset,
      name: name.text,
      namePointer: pointer,
      nameFileOffset: name.offset,
      center: [r.i16(offset + 4), r.i16(offset + 6)] as [number, number],
      realmIndex: bits(a, 0, 7),
      level: bits(a, 7, 4),
      currentLevel: bits(a, 11, 4),
      magic: bits(a, 15, 4),
      taxCode: bits(a, 19, 2),
      loyaltyCode: bits(a, 21, 2),
      occupyingRealmIndex: bits(a, 24, 7),
      contested: Boolean(bits(a, 23, 1)),
      terrainCode: bits(b, 28, 4),
      population: {
        human: Boolean(bits(b, 20, 1)),
        elf: Boolean(bits(b, 21, 1)),
        dwarf: Boolean(bits(b, 22, 1)),
        goblin: Boolean(bits(b, 23, 1)),
      },
      borders,
      firstPlace: r.i16(offset + 30),
    };
  });
  const places = Array.from({ length: hb.count }, (_, index) => {
    const offset = hb.offset + index * 20,
      a = r.u32(offset + 4),
      b = r.u32(offset + 8);
    return {
      index,
      offset,
      center: [r.i16(offset), r.i16(offset + 2)] as [number, number],
      realmIndex: bits(a, 0, 7),
      level: bits(a, 7, 4),
      iconCode: bits(a, 11, 7),
      route1: bits(a, 18, 10),
      route2: bits(b, 0, 10),
      route3: bits(b, 10, 10),
      nameIndex: bits(b, 24, 8),
      next: r.i16(offset + 12),
    };
  });
  const associations = new Map<number, number>();
  for (const p of provinces) {
    const visited = new Set<number>();
    let index = p.firstPlace;
    while (index !== 0) {
      if (index < 0 || index >= places.length || visited.has(index) || associations.has(index))
        throw new Error(`Invalid/cyclic/shared place chain for ${p.index}`);
      visited.add(index);
      associations.set(index, p.index);
      const relative = places[index]?.next ?? 0;
      index = relative === 0 ? 0 : p.firstPlace + relative;
    }
  }
  const holdings = places
    .filter((p) => [99, 103, 107, 111].includes(p.iconCode))
    .map((p) => ({
      ...p,
      id: `anuire-holding-${p.index.toString().padStart(3, '0')}`,
      type: (
        { 99: 'law', 103: 'temple', 107: 'guild', 111: 'source' } as Record<
          number,
          'law' | 'temple' | 'guild' | 'source'
        >
      )[p.iconCode]!,
      provinceIndex: associations.get(p.index) ?? null,
    }));
  const forts = places
    .filter((p) => [97, 115, 116, 117, 118].includes(p.iconCode))
    .map((p) => ({ ...p, provinceIndex: associations.get(p.index) ?? null }));
  const units = Array.from({ length: ub.count }, (_, index) => {
    const offset = ub.offset + index * 14,
      a = r.u32(offset),
      b = r.u32(offset + 4);
    return {
      index,
      offset,
      provinceIndex: bits(a, 0, 8),
      realmIndex: bits(a, 8, 7),
      salary: bits(a, 15, 7),
      joined: Boolean(bits(a, 31, 1)),
      typeCode: r.i16(offset + 8),
      next: r.i16(offset + 10),
      paid: Boolean(bits(b, 4, 1)),
    };
  }).filter((u) => u.index > 0 && u.typeCode > 0 && u.realmIndex > 0);
  const allUnits = new Map(units.map((u) => [u.index, u])),
    deployments = new Map<number, number>();
  for (const head of units.filter((u) => u.provinceIndex !== 0 && !u.joined)) {
    let index = head.index;
    const visited = new Set<number>();
    while (index !== -1 && index !== 0) {
      const u = allUnits.get(index);
      if (!u || visited.has(index) || deployments.has(index))
        throw new Error(`Invalid/cyclic/shared unit chain ${index}`);
      if (u.realmIndex !== head.realmIndex) throw new Error('Mixed-realm unit chain');
      visited.add(index);
      deployments.set(index, head.provinceIndex);
      index = u.next;
    }
  }
  const troops = units.map((u) => ({
    ...u,
    id: `anuire-unit-${u.index.toString().padStart(4, '0')}`,
    effectiveProvinceIndex: deployments.get(u.index) ?? null,
    kind: u.typeCode >= 1000 ? 'character' : 'military',
  }));
  const matrix = (name: 'reactions' | 'relationships' | 'tribute') => {
    const b = block(name);
    return {
      rows: b.count,
      columns: b.stride,
      values: Array.from(r.slice(b.offset, b.count * b.stride)),
    };
  };
  return {
    layout,
    realms,
    regents,
    provinces,
    holdings,
    forts,
    troops,
    reactions: matrix('reactions'),
    relationships: matrix('relationships'),
    tribute: matrix('tribute'),
    unassociatedPlaces: places
      .filter((p) => p.index > 0 && p.iconCode !== 0 && !associations.has(p.index))
      .map((p) => p.index),
  };
}
export type OriginalCampaign = ReturnType<typeof decodeOriginalCampaign>;
