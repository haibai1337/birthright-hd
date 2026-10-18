import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import {
  createCampaign,
  applyCommand,
  serializeCampaign,
  deserializeCampaign,
  replay,
  validateCommand,
  validateStateReferences,
  PC_REALM_SPELLS,
  domainActionQuote,
  commandCost,
  availableSource,
  inspectLeyLine,
  bloodlineStrength,
  domainPower,
  forecast,
  armyPower,
  type Campaign,
  type Scenario,
  type Command,
} from '../packages/core';
import { developmentScenario } from './fixtures/scenario';
import { loadAnuireScenario } from '../packages/world-data/anuire-scenario';
import { parseOriginalInventory } from '../packages/import-tools/magic';

function fixture(priest = false) {
  const scenario = structuredClone(developmentScenario);
  scenario.policy!.domainActions = 'pc';
  scenario.policy!.conquest = 'occupation';
  scenario.policy!.survival = 'domain-assets';
  scenario.victory = { provinces: 99, turns: 80 };
  scenario.spells = structuredClone(PC_REALM_SPELLS);
  scenario.initial.fortifications = [];
  for (const p of scenario.initial.provinces) p.fort = 0;
  scenario.events = [
    { ...scenario.events[0]!, id: 'quiet', weight: 1, gold: 0, loyalty: 0, decision: false },
  ];
  const regent = scenario.realms[0]!.regent;
  regent.class = priest ? 'priest' : 'wizard';
  regent.classes = [{ type: priest ? 'priest' : 'wizard', level: 9 }];
  regent.realmSpells = PC_REALM_SPELLS.map((s) => s.id);
  const state = createCampaign(scenario, 'crownmere', 1997, 'CLASSIC');
  for (const r of state.realms) {
    r.treasury = 500;
    r.regency = r.id === state.playerRealm ? 500 : 0;
    if (r.id !== state.playerRealm) r.controller = 'passive';
  }
  const [a, b, c] = state.provinces;
  state.holdings = state.holdings.filter((h) => !['source', 'temple'].includes(h.type));
  state.holdings.push(
    {
      id: 'magic-a',
      realmId: 'crownmere',
      provinceId: a!.id,
      type: priest ? 'temple' : 'source',
      level: 7,
    },
    {
      id: 'magic-b',
      realmId: 'crownmere',
      provinceId: b!.id,
      type: priest ? 'temple' : 'source',
      level: 0,
    },
    {
      id: 'magic-c',
      realmId: 'crownmere',
      provinceId: c!.id,
      type: priest ? 'temple' : 'source',
      level: 3,
    },
  );
  // Isolated fixture capacity, preserving the development world's actual geography.
  for (const d of scenario.provinces) d.magicPotential = 20;
  if (priest) for (const p of [a!, b!, c!]) p.level = 7;
  for (const p of [a!, b!, c!]) scenario.provinces.find((d) => d.id === p.id)!.maxLevel = 10;
  state.fortifications = [];
  for (const p of state.provinces) p.fort = 0;
  return { scenario, state, a: a!, b: b!, c: c! };
}
function issue(state: Campaign, scenario: Scenario, cmd: Command) {
  const r = applyCommand(state, scenario, state.playerRealm, cmd);
  if (!r.ok) throw Error(`${r.error.code}: ${r.error.detail}`);
  return r.state;
}
function cast(
  f: ReturnType<typeof fixture>,
  spellId: string,
  extra: Partial<Extract<Command, { type: 'CastRealmSpell' }>> = {},
) {
  return issue(f.state, f.scenario, {
    type: 'CastRealmSpell',
    spellId,
    provinceId: f.a.id,
    ...extra,
  });
}

describe('M1B-4 strategic magic', () => {
  it('preserves bloodline grade/score, buys strength separately, caps collection and handles multiclass holding RP', () => {
    const f = fixture();
    const original = f.scenario.realms[0]!.regent.bloodline.strength;
    const cost = commandCost(f.state, f.scenario, { type: 'IncreaseBloodline' });
    const next = issue(f.state, f.scenario, { type: 'IncreaseBloodline' });
    expect(bloodlineStrength(next, f.scenario, 'crownmere')).toBe(original + 1);
    expect(f.scenario.realms[0]!.regent.bloodline.strength).toBe(original);
    expect(next.realms[0]!.regency).toBe(500 - cost.regency);
    expect(next.domainTurn!.round).toBe(1);
    next.realms[0]!.regency = 65534;
    expect(forecast(next, f.scenario, 'crownmere').regency).toBe(1);
    next.realms[0]!.bloodlineStrength = 99;
    expect(
      validateCommand(next, f.scenario, 'crownmere', { type: 'IncreaseBloodline' })?.detail,
    ).toMatch(/99/);
    const baseline = domainPower(f.state, f.scenario, 'crownmere');
    f.scenario.realms[0]!.regent.classes!.push({ type: 'fighter', level: 4 });
    expect(domainPower(f.state, f.scenario, 'crownmere')).toBeGreaterThan(baseline);
  });
  it('forges persistent paid ley lines through original geography and shares the highest connected source, never sums', () => {
    const f = fixture();
    f.a.owner = 'ironvale';
    const cmd: Command = {
      type: 'ForgeLeyLine',
      fromHoldingId: 'magic-a',
      toHoldingId: 'magic-b',
      regencyBid: 20,
    };
    expect(availableSource(f.state, 'crownmere', f.b.id)).toBe(0);
    const quote = domainActionQuote(f.state, f.scenario, 'crownmere', cmd)!;
    let state = issue(f.state, f.scenario, cmd);
    expect(state.leyLines).toHaveLength(1);
    expect(availableSource(state, 'crownmere', f.b.id)).toBe(7);
    expect(state.realms[0]!.treasury).toBe(500 - quote.gold);
    expect(validateCommand(state, f.scenario, 'crownmere', cmd)?.detail).toMatch(/already/);
    expect(
      validateCommand(state, f.scenario, 'crownmere', { ...cmd, toHoldingId: 'h-1-law' })?.detail,
    ).toMatch(/source/);
    state = issue(state, f.scenario, {
      type: 'ForgeLeyLine',
      fromHoldingId: 'magic-b',
      toHoldingId: 'magic-c',
      regencyBid: 20,
    });
    expect(availableSource(state, 'crownmere', f.c.id)).toBe(7);
    expect(deserializeCampaign(serializeCampaign(state), f.scenario)).toEqual(state);
    expect(replay(f.scenario, f.state, state.history)).toEqual(state);
  });
  it('suspends contested ley endpoints, ignores territorial occupation and respects source destruction and ownership', () => {
    const f = fixture();
    const s = issue(f.state, f.scenario, {
      type: 'ForgeLeyLine',
      fromHoldingId: 'magic-a',
      toHoldingId: 'magic-b',
      regencyBid: 20,
    });
    s.provinces.find((p) => p.id === f.a.id)!.occupiedBy = 'verdant';
    expect(availableSource(s, 'crownmere', f.b.id)).toBe(7);
    s.holdings.find((h) => h.id === 'magic-a')!.contested = true;
    expect(availableSource(s, 'crownmere', f.b.id)).toBe(0);
    s.holdings.find((h) => h.id === 'magic-a')!.contested = false;
    s.holdings.find((h) => h.id === 'magic-a')!.realmId = 'verdant';
    expect(inspectLeyLine(s, s.leyLines![0]!).status).toBe('inactive');
    s.holdings.find((h) => h.id === 'magic-a')!.destroyed = true;
    expect(inspectLeyLine(s, s.leyLines![0]!).status).toBe('destroyed');
  });
  it('casts at a foreign zero-level source through a ley line, debits exact costs and rejects unknown/class/level/resource violations', () => {
    const f = fixture();
    f.b.owner = 'ironvale';
    const cmd: Command = {
      type: 'CastRealmSpell',
      spellId: 'alchemy',
      provinceId: f.b.id,
      amount: 5,
    };
    expect(validateCommand(f.state, f.scenario, 'crownmere', cmd)?.detail).toMatch(/level 3/);
    const linked = issue(f.state, f.scenario, {
      type: 'ForgeLeyLine',
      fromHoldingId: 'magic-a',
      toHoldingId: 'magic-b',
      regencyBid: 20,
    });
    const r = linked.realms[0]!,
      before = { gold: r.treasury, rp: r.regency };
    const next = issue(linked, f.scenario, cmd);
    expect(next.realms[0]!.treasury).toBe(before.gold + 4);
    expect(next.realms[0]!.regency).toBe(before.rp - 5);
    expect(next.domainTurn!.round).toBe(3);
    const unknown = structuredClone(f.state);
    unknown.realms[0]!.knownSpells = [];
    expect(
      validateCommand(unknown, f.scenario, 'crownmere', { ...cmd, provinceId: f.a.id })?.detail,
    ).toMatch(/inventory/);
    f.scenario.realms[0]!.regent.classes = [{ type: 'fighter', level: 20 }];
    expect(validateCommand(linked, f.scenario, 'crownmere', cmd)?.detail).toMatch(/regent/);
    f.scenario.realms[0]!.regent.classes = [{ type: 'wizard', level: 1 }];
    expect(
      validateCommand(linked, f.scenario, 'crownmere', { ...cmd, spellId: 'warding' })?.detail,
    ).toMatch(/Caster level/);
    linked.realms[0]!.treasury = 0;
    expect(validateCommand(linked, f.scenario, 'crownmere', cmd)?.code).toBe('GOLD');
  });
  it('applies priest Bless Land to independent holding income, clears opposing Blight and expires after one collection', () => {
    const f = fixture(true);
    f.a.owner = 'ironvale';
    f.state.holdings.push({
      id: 'independent-guild',
      provinceId: f.a.id,
      realmId: 'verdant',
      type: 'guild',
      level: 2,
    });
    const base = forecast(f.state, f.scenario, 'verdant').holdings;
    let state = cast(f, 'bless-land');
    expect(forecast(state, f.scenario, 'verdant').holdings).toBeGreaterThan(base);
    expect(state.effects.find((e) => e.kind === 'bless-land')!.expiresTurn).toBe(2);
    expect(deserializeCampaign(serializeCampaign(state), f.scenario)).toEqual(state);
    const counter = issue(state, f.scenario, {
      type: 'CastRealmSpell',
      spellId: 'blight',
      provinceId: f.a.id,
    });
    expect(counter.effects.filter((e) => ['bless-land', 'blight'].includes(e.kind ?? ''))).toEqual(
      [],
    );
    state = issue(state, f.scenario, { type: 'EndTurn' });
    expect(state.effects.some((e) => e.kind === 'bless-land')).toBe(false);
    expect(state.turn).toBe(2);
  });
  it('wards entry and exit until the end of the next domain turn and dispels at the recorded RP cost', () => {
    const f = fixture();
    let state = cast(f, 'warding');
    const effect = state.effects.find((e) => e.kind === 'warding')!;
    const army = state.armies[0]!;
    army.realmId = 'verdant';
    army.provinceId = f.a.id;
    army.moved = false;
    state.domainTurn = { round: 1, order: ['verdant', 'crownmere'], cursor: 0 };
    state.realms.find((r) => r.id === 'verdant')!.controller = 'ai';
    state.realms.find((r) => r.id === 'verdant')!.actions = 3;
    expect(
      validateCommand(state, f.scenario, 'verdant', {
        type: 'MoveArmy',
        armyId: army.id,
        destination: f.scenario.provinces.find((p) => p.id === f.a.id)!.adjacent[0]!,
      })?.detail,
    ).toMatch(/Warding/);
    state.domainTurn = { round: 2, order: ['crownmere'], cursor: 0 };
    state.realms.find((r) => r.id === 'verdant')!.controller = 'passive';
    const dispel: Command = {
      type: 'CastRealmSpell',
      spellId: 'dispel-realm-magic',
      provinceId: f.a.id,
      effectId: effect.id,
    };
    expect(commandCost(state, f.scenario, dispel).regency).toBe(5);
    expect(issue(state, f.scenario, dispel).effects.some((e) => e.id === effect.id)).toBe(false);
    state = issue(state, f.scenario, { type: 'EndTurn' });
    expect(state.effects.some((e) => e.kind === 'warding')).toBe(true);
    state = issue(state, f.scenario, { type: 'EndTurn' });
    expect(state.effects.some((e) => e.kind === 'warding')).toBe(false);
  });
  it('protects against Agitate, minimizes guild collections and gives blessed military units a real permanent bonus', () => {
    const f = fixture(true);
    f.state.holdings.push({
      id: 'guild-test',
      realmId: 'verdant',
      provinceId: f.a.id,
      type: 'guild',
      level: 2,
    });
    const state = cast(f, 'honest-dealing');
    expect(
      validateCommand(state, f.scenario, 'crownmere', {
        type: 'Agitate',
        targets: [{ provinceId: f.a.id, direction: 'lower' }],
      })?.detail,
    ).toMatch(/Honest/);
    const own = f.state.armies.find((a) => a.realmId === 'crownmere')!;
    own.provinceId = f.a.id;
    const before = armyPower(own, f.scenario);
    const blessed = cast(f, 'bless-army', { unitIds: [own.units[0]!.id] });
    expect(
      armyPower(
        blessed.armies.find((a) => a.id === own.id)!,
        f.scenario,
      ),
    ).toBeGreaterThan(before);
    expect(blessed.armies.find((a) => a.id === own.id)!.units[0]!.blessed).toBe(true);
    expect(forecast(state, f.scenario, 'verdant').holdings).toBeLessThan(
      forecast(f.state, f.scenario, 'verdant').holdings,
    );
  });
  it('changes province/holding levels, independent forts and enemy military units without mutating original scenario data', () => {
    const f = fixture();
    const original = JSON.stringify(f.scenario);
    expect(cast(f, 'death-plague').provinces.find((p) => p.id === f.a.id)!.level).toBe(
      f.a.level - 1,
    );
    let state = cast(f, 'stronghold');
    expect(state.fortifications!.find((f) => f.kind === 'wizard-tower')!.level).toBe(1);
    state.fortifications!.push({
      id: 'enemy-castle',
      realmId: 'ironvale',
      provinceId: f.a.id,
      level: 3,
      kind: 'castle',
    });
    const razed = issue(state, f.scenario, {
      type: 'CastRealmSpell',
      spellId: 'raze',
      provinceId: f.a.id,
      fortificationId: 'enemy-castle',
      amount: 2,
    });
    expect(razed.fortifications!.find((f) => f.id === 'enemy-castle')).toMatchObject({
      realmId: 'ironvale',
      level: 1,
    });
    const enemy = f.state.armies.find((a) => a.realmId !== 'crownmere')!;
    enemy.provinceId = f.a.id;
    const dead = cast(f, 'mass-destruction', { unitIds: [enemy.units[0]!.id] });
    expect(dead.armies.some((a) => a.units.some((u) => u.id === enemy.units[0]!.id))).toBe(false);
    expect(JSON.stringify(f.scenario)).toBe(original);
  });
  it('decodes exact inventory IDs and DOS EOF markers, leaving unsupported spells unavailable', () => {
    expect(
      parseOriginalInventory(new TextEncoder().encode('// realm\n192 // Alchemy\n220\n\x1a')),
    ).toEqual([192, 220]);
    expect(() => parseOriginalInventory(new TextEncoder().encode('not a number'))).toThrow();
    const f = fixture();
    expect(
      validateCommand(f.state, f.scenario, 'crownmere', {
        type: 'CastRealmSpell',
        provinceId: f.a.id,
        spellId: 'summoning',
      })?.detail,
    ).toMatch(/profiles/);
  });
  it.skipIf(!existsSync('reference/extracted/anuire/magic.research.json'))(
    'imports five original ley lines and recovered spellbooks/abilities while preserving Anuire IDs and the dataset fingerprint',
    async () => {
      const raw = JSON.parse(
        readFileSync('reference/extracted/anuire/anuire.research.json', 'utf8'),
      );
      const magic = JSON.parse(
        readFileSync('reference/extracted/anuire/magic.research.json', 'utf8'),
      );
      const scenario = await loadAnuireScenario(raw, undefined, magic),
        old = await loadAnuireScenario(raw);
      expect(scenario.fingerprint).toBe(old.fingerprint);
      expect(
        magic.characters.filter((c: { inventoryVerified: boolean }) => c.inventoryVerified),
      ).toHaveLength(82);
      const state = createCampaign(scenario, 'anuire-realm-27');
      expect(state.leyLines).toHaveLength(5);
      expect(state.provinces).toHaveLength(206);
      expect(state.realms).toHaveLength(51);
      expect(state.holdings).toHaveLength(766);
      expect(scenario.spells.filter((s) => s.implemented)).toHaveLength(13);
      expect(scenario.regents!.find((r) => r.id === 'anuire-regent-004')!.realmSpells).toContain(
        'alchemy',
      );
      expect(
        scenario.regents!.some((r) => r.bloodline.abilities.includes('blood-divine-aura')),
      ).toBe(true);
      validateStateReferences(state, scenario);
      expect(deserializeCampaign(serializeCampaign(state), scenario)).toEqual(state);
      const legacy = JSON.parse(serializeCampaign(state));
      delete legacy.campaign.leyLines;
      for (const r of legacy.campaign.realms) {
        delete r.knownSpells;
        delete r.bloodlineStrength;
      }
      const upgraded = deserializeCampaign(JSON.stringify(legacy), scenario);
      expect(upgraded.leyLines).toHaveLength(5);
      expect(upgraded.realms[0]!.treasury).toBe(state.realms[0]!.treasury);
    },
  );
});
