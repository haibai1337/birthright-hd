import { validateAnuireResearch } from './anuire-research';
import { validateScenario } from '../core/validation';
import type { Scenario } from '../core/schema';
import defaults from './simulation-defaults.json';

const provinceId = (n: number) => `anuire-province-${String(n).padStart(3, '0')}`;
const realmId = (n: number) => `anuire-realm-${String(n).padStart(2, '0')}`;
const regentId = (n: number) => `anuire-regent-${String(n).padStart(3, '0')}`;
const compatibility = {
  status: 'ENHANCED_DESIGN' as const,
  source: 'M1B experimental template adapter v1',
  note: 'Explicit HD compatibility behavior, not verified stock initialization or original combat rules.',
};
const terrain: Record<number, Scenario['provinces'][number]['terrain']> = {
  1: 'forest',
  2: 'plains',
  3: 'mountains',
  4: 'heavy-mountains',
  5: 'swamp',
  6: 'hills',
};
function domainColor(index: number) {
  // Generated presentation colors only. No original heraldry is implied.
  const h = (index * 137.508) % 360,
    s = 0.38,
    l = 0.48;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Local data only; the application never imports a private JSON file at build time. */
export async function loadAnuireScenario(input: unknown): Promise<Scenario> {
  const data = validateAnuireResearch(input),
    c = data.campaign;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('anuire-m1b-adapter-v1\n' + JSON.stringify(data)),
  );
  const fingerprint = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const classes: Record<number, Scenario['realms'][number]['regent']['class']> = {
    1: 'warrior',
    2: 'warrior',
    3: 'warrior',
    4: 'priest',
    5: 'wizard',
    6: 'wizard',
    7: 'rogue',
    8: 'rogue',
  };
  const derivations = ['Anduiras', 'Reynir', 'Brenna', 'Basaia', 'Masela', 'Vorynn', 'Azrai'];
  const regents = c.regents.map((r) => ({
    id: r.id,
    name: r.identity?.name ?? 'Unresolved identity',
    class: classes[r.classCode] ?? 'warrior',
    bloodline: {
      derivation:
        derivations[r.bloodline.derivation] ?? `Original derivation ${r.bloodline.derivation}`,
      strength: r.bloodline.strength,
      abilities: [],
    },
    attributes: { command: 0, diplomacy: 0 },
    inventory: [],
    original: r,
  }));
  const realms = c.realms.map((r) => {
    const regent = regents.find((g) => g.id === regentId(r.regentIndex))!;
    const rawRegent = c.regents.find((g) => g.index === r.regentIndex)!;
    const special = !classes[rawRegent.classCode];
    const landed = c.provinces.some((p) => p.realmIndex === r.index),
      assets =
        landed ||
        c.holdings.some((h) => h.realmIndex === r.index && h.level > 0) ||
        c.troops.some((u) => u.realmIndex === r.index);
    const identified = !!regent && !/^(unknown|unnamed|unresolved identity)$/i.test(regent.name);
    const active = r.exists === true && assets && identified;
    return {
      id: r.id,
      name: r.name,
      adjective: r.name,
      color: domainColor(r.index),
      sigil: 'crown' as const,
      motto: 'Experimental original template campaign',
      regent,
      originalPlayable: r.playable,
      technicalPlayable: active && !special,
      specialBehavior: special ? ('unresolved-original' as const) : ('standard' as const),
      domainType: !active
        ? ('inactive' as const)
        : landed
          ? ('territorial' as const)
          : ('holding' as const),
      controller: active ? ('ai' as const) : ('passive' as const),
      survival: active ? ('domain-assets' as const) : ('persistent' as const),
      original: r,
      provenance: {
        status: 'INFERRED' as const,
        source: `Original realm ${r.id}; M1B compatibility projection`,
        note: 'Name, original flag and default regent are source-derived. Color/heraldry, technical availability and mapped character roles are HD presentation/compatibility policies. See original records and scenario compatibilityNotes.',
      },
    };
  });
  const fortifications = c.forts.map((f) => ({
    id: `anuire-fort-${f.index}`,
    sourceId: `anuire-place-${f.index}`,
    provinceId: provinceId(f.provinceIndex!),
    realmId: realmId(f.realmIndex),
    level: f.level,
    kind: f.iconCode === 97 ? ('wizard-tower' as const) : ('castle' as const),
  }));
  const unitTemplates = defaults.units as Scenario['units'];
  const nativeTypes: Record<number, string> = { 20: 'archers', 21: 'cavalry', 23: 'infantry' };
  const units: Scenario['units'] = [
    ...unitTemplates.map((u) => ({
      ...u,
      mobility: u.id === 'cavalry' ? ('mounted' as const) : ('foot' as const),
    })),
  ];
  for (const type of [
    ...new Set(c.troops.filter((u) => u.kind === 'military').map((u) => u.typeCode)),
  ].sort((a, b) => a - b)) {
    const base = unitTemplates.find((u) => u.id === nativeTypes[type]);
    units.push({
      id: `original-troop-${type}`,
      name: base ? `${base.name} · original type ${type}` : `Original troop type ${type}`,
      cost: base?.cost ?? 2,
      upkeep: base?.upkeep ?? 1,
      power: base?.power ?? 5,
      minLevel: base?.minLevel ?? 1,
      recruitable: false,
      mobility: type === 21 ? 'mounted' : 'foot',
      original: { typeCode: type, observedSalary: 0 },
      provenance: {
        ...compatibility,
        note: 'Original type identity retained. M0 balance for identified base human types; unknown types use power 5/upkeep 1. Imported template salary zero is not used as verified upkeep. Native variants cannot be recruited until their rules are decoded.',
      },
    });
  }
  const groups = new Map<string, Scenario['initial']['armies'][number]>();
  for (const u of c.troops.filter((u) => u.kind === 'military')) {
    const location = provinceId(u.effectiveProvinceIndex!),
      owner = realmId(u.realmIndex),
      key = `${owner}:${location}`;
    let army = groups.get(key);
    if (!army) {
      army = {
        id: `anuire-army-${owner}-${location}`,
        realmId: owner,
        provinceId: location,
        units: [],
        moved: false,
      };
      groups.set(key, army);
    }
    army.units.push({
      id: u.id,
      sourceId: u.id,
      type: `original-troop-${u.typeCode}`,
      strength: 100,
    });
  }
  const notes = [
    'Experimental CD template campaign; not a certified initialized 1997 game.',
    'Original faction flags preserved separately from technical support. CLASSIC selection uses eligible flags; future UNRESTRICTED scenarios may override availability without changing source records.',
    'No imported runtime treaties: unresolved original matrices remain raw. Unnegotiated contacts use neutral HD behavior; treaties created during play use the existing simplified system.',
    'Unit strength starts at 100%. Character deployments are retained separately and do not contribute invented combat power. Original variants use documented compatibility combat/upkeep; recruitment offers three M0 basic types.',
    'Development ceiling 10 (or the observed level if higher), fort ceiling 15, generic AI, basic taxes/holding income and terrain defense are compatibility rules. Original excess holdings are grandfathered, not increased by validation.',
    'Conquest creates occupation; sovereignty remains until future investiture. Defeat requires loss of all domain assets; placeholders are passive. Victory is domain power 600 or highest domain power after 80 seasons.',
    'Command/diplomacy attributes are unused zero sentinels. Unknown inventories, abilities, spells and original trade routes are not fabricated.',
    'Special classless/monster rulers retain raw data and generic AI but remain technically unselectable pending dedicated gameplay support. Military source stacks are grouped by realm and province; individual source unit IDs remain intact.',
  ];
  return validateScenario({
    id: 'anuire-template',
    revision: 1,
    name: 'Anuire — Experimental Original Template Campaign',
    description:
      'The complete recovered 206-province world with explicit HD compatibility rules. Not a verified stock 1997 campaign.',
    provenance: {
      status: 'INFERRED',
      source: data.provenance.source,
      note: 'Original template data combined with explicit experimental HD gameplay policies; not certified stock initialization.',
    },
    fingerprint,
    map: { width: data.map.width, height: data.map.height },
    regents,
    originalData: data,
    compatibilityNotes: notes,
    selection: { mode: 'CLASSIC' },
    policy: {
      directedBorders: true,
      survival: 'domain-assets',
      maxFort: 15,
      holdingCapacity: 'preserve-template-excess',
      conquest: 'occupation',
    },
    regions: [
      {
        id: 'anuire',
        name: 'Anuire',
        culture: 'Original PC template',
        provenance: data.provenance,
      },
    ],
    realms,
    provinces: c.provinces.map((p) => {
      const geometry = data.map.geometries.find((g) => g.provinceIndex === p.index)!;
      if (!terrain[p.terrainCode]) throw new Error(`Unsupported original terrain ${p.terrainCode}`);
      return {
        id: p.id,
        name: p.name,
        regionId: 'anuire',
        terrain: terrain[p.terrainCode],
        polygon: geometry.rings[0],
        rings: geometry.rings,
        center: p.center,
        adjacent: p.borders.map((b) => provinceId(b.provinceIndex)),
        movement: p.borders.map((b) => ({ to: provinceId(b.provinceIndex), code: b.movementCode })),
        maxLevel: Math.max(10, p.level),
        magicPotential: p.level + p.magic,
        original: p,
        provenance: {
          status: 'INFERRED',
          source: `Original province ${p.id} and MAP.RES hit map`,
          note: 'Original name, terrain, movement links/codes, center and all geometry rings. Development ceiling and source-baseline projection are explicit HD compatibility fields; raw source values are retained in original.',
        },
      };
    }),
    units,
    spells: [],
    events: defaults.events,
    initial: {
      provinces: c.provinces.map((p) => ({
        id: p.id,
        sourceId: p.id,
        owner: realmId(p.realmIndex),
        level: p.level,
        loyalty: p.loyaltyCode,
        tax: (['light', 'moderate', 'severe'] as const)[p.taxCode] ?? 'moderate',
        occupiedBy:
          typeof p.occupyingRealmIndex === 'number' && p.occupyingRealmIndex > 0
            ? realmId(p.occupyingRealmIndex)
            : null,
        contested: p.contested === true,
        fort: Math.max(
          0,
          ...fortifications
            .filter(
              (f) =>
                f.provinceId === p.id && f.realmId === realmId(p.realmIndex) && f.kind === 'castle',
            )
            .map((f) => f.level),
        ),
      })),
      holdings: c.holdings.map((h) => ({
        id: h.id,
        sourceId: h.id,
        provinceId: provinceId(h.provinceIndex!),
        realmId: realmId(h.realmIndex),
        type: h.type,
        level: h.level,
      })),
      armies: [...groups.values()],
      treaties: [],
      tradeRoutes: [],
      treasury: 0,
      regency: 0,
      domains: c.realms.map((r) => ({ id: r.id, treasury: r.treasury, regency: r.regency })),
      fortifications,
      characters: c.troops
        .filter((u) => u.kind === 'character')
        .map((u) => ({
          id: u.id,
          sourceId: u.id,
          provinceId: provinceId(u.effectiveProvinceIndex!),
          realmId: realmId(u.realmIndex),
          regentId: c.regents.find((r) => r.unitIndex === u.index)?.id ?? null,
          typeCode: u.typeCode,
        })),
    },
    victory: { provinces: 124, turns: 80, metric: 'domain-power', target: 600 },
  });
}
