import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { developmentScenario } from './fixtures/scenario';
import {
  createCampaign,
  applyCommand,
  validateCommand,
  serializeCampaign,
  deserializeCampaign,
  validateStateReferences,
  PC_UNITS,
  movementCost,
  diplomacyTerms,
  diplomaticReaction,
  relation,
  forecast,
  empirePoints,
  autoResolve,
  type Campaign,
  type Command,
  type Scenario,
} from '../packages/core';
import { strategicEvents, synchronizeRebellions } from '../packages/core/strategic-events';
import { buildCastles } from '../packages/core/construction';
import { loadAnuireScenario } from '../packages/world-data/anuire-scenario';
import { extractStrategyRecords } from '../packages/import-tools/strategy';

function fixture() {
  const scenario = structuredClone(developmentScenario);
  Object.assign(scenario.policy!, {
    domainActions: 'pc',
    strategicRules: 'pc-1997',
    survival: 'domain-assets',
    conquest: 'occupation',
  });
  scenario.units.push(...structuredClone(PC_UNITS));
  scenario.initial.treaties = [];
  scenario.victory = { provinces: 99, turns: 80, metric: 'empire-points', target: 400 };
  scenario.initial.fortifications = [];
  for (const [i, d] of scenario.provinces.entries()) {
    d.original = {
      index: i + 1,
      population: { human: true, elf: false, dwarf: false, goblin: false },
      borders: d.adjacent.map((id) => ({
        provinceIndex: scenario.provinces.findIndex((p) => p.id === id) + 1,
        movementCode: 2,
      })),
    };
  }
  for (const p of scenario.initial.provinces) p.fort = 0;
  for (const r of scenario.realms) {
    r.controller = 'ai';
    r.domainType = 'territorial';
    r.regent.original = { ...(r.regent.original ?? {}), identity: { alignment: 1 } };
  }
  for (const a of scenario.initial.armies) {
    for (const u of a.units) u.type = 'pc-unit-1';
  }
  scenario.initial.armies[0]!.provinceId = 'p0';
  const state = createCampaign(scenario, 'crownmere', 1997, 'CLASSIC');
  for (const r of state.realms) {
    r.treasury = 500;
    r.regency = 500;
    if (r.id !== state.playerRealm) r.controller = 'passive';
  }
  return { scenario, state };
}
function issue(state: Campaign, scenario: Scenario, cmd: Command) {
  const result = applyCommand(state, scenario, state.playerRealm, cmd);
  if (!result.ok) throw Error(`${result.error.code}: ${result.error.detail}`);
  return result.state;
}
function activate(state: Campaign, id = 'verdant') {
  const r = state.realms.find((r) => r.id === id)!;
  r.controller = 'ai';
  r.actions = 0;
  r.regency = 0;
}
function border(scenario: Scenario, from: string, to: string, code: number) {
  const d = scenario.provinces.find((p) => p.id === from)!,
    b = d.original!.borders as { provinceIndex: number; movementCode: number }[];
  b.find(
    (b) =>
      b.provinceIndex === (scenario.provinces.find((d) => d.id === to)!.original!.index as number),
  )!.movementCode = code;
}

describe('M1B-5 PC strategic integration', () => {
  it('recovers distinct unit attributes rather than using the avatar ID as a table index', () => {
    expect(PC_UNITS).toHaveLength(29);
    expect(PC_UNITS.find((u) => u.id === 'pc-unit-3')).toMatchObject({
      name: 'Archers',
      cost: 2,
      upkeep: 1,
      pc: { missile: 4, morale: 2 },
    });
    expect(PC_UNITS.find((u) => u.id === 'pc-unit-17')).toMatchObject({
      name: 'Elf Cavalry',
      cost: 8,
      pc: { move: 4, missile: 4 },
    });
    expect(PC_UNITS.find((u) => u.id === 'pc-unit-26')?.recruitable).toBe(false);
  });
  it('charges exact tenths for repeated marches and free road moves without consuming actions', () => {
    const f = fixture(),
      a = f.state.armies[0]!;
    a.provinceId = 'p0';
    expect(movementCost(f.state, f.scenario, a, 'p4')).toBe(0.2);
    let s = issue(f.state, f.scenario, { type: 'MoveArmy', armyId: a.id, destination: 'p4' });
    s = issue(s, f.scenario, { type: 'MoveArmy', armyId: a.id, destination: 'p0' });
    expect(s.realms[0]!.treasury).toBe(499.6);
    expect(s.realms[0]!.actions).toBe(3);
    s.roads = [{ from: 'p0', to: 'p4' }];
    s = issue(s, f.scenario, { type: 'MoveArmy', armyId: a.id, destination: 'p4' });
    expect(s.realms[0]!.treasury).toBe(499.6);
    expect(deserializeCampaign(serializeCampaign(s), f.scenario)).toEqual(s);
  });
  it('honors original impassable borders and racial movement reductions without a cavalry mountain ban', () => {
    const { state, scenario } = fixture(),
      a = state.armies[0]!;
    border(scenario, 'p0', 'p4', 4);
    expect(
      validateCommand(state, scenario, state.playerRealm, {
        type: 'MoveArmy',
        armyId: a.id,
        destination: 'p4',
      })?.detail,
    ).toContain('mountain');
    border(scenario, 'p0', 'p4', 3);
    a.units.forEach((u) => (u.type = 'pc-unit-18'));
    expect(movementCost(state, scenario, a, 'p4')).toBe(0.2);
    a.units.forEach((u) => (u.type = 'pc-unit-9'));
    expect(movementCost(state, scenario, a, 'p4')).toBe(0.8);
    expect(
      validateCommand(state, scenario, state.playerRealm, {
        type: 'MoveArmy',
        armyId: a.id,
        destination: 'p4',
      }),
    ).toBeNull();
  });
  it('enforces seasonal muster limits, original prices, populations and upkeep', () => {
    const f = fixture();
    f.state.provinces.find((p) => p.id === 'p0')!.level = 2;
    let s = issue(f.state, f.scenario, {
      type: 'RecruitUnit',
      provinceId: 'p0',
      unitType: 'pc-unit-3',
    });
    s = issue(s, f.scenario, { type: 'RecruitUnit', provinceId: 'p0', unitType: 'pc-unit-1' });
    expect(s.realms[0]!.treasury).toBe(496);
    expect(s.realms[0]!.actions).toBe(3);
    expect(
      validateCommand(s, f.scenario, s.playerRealm, {
        type: 'RecruitUnit',
        provinceId: 'p0',
        unitType: 'pc-unit-6',
      })?.detail,
    ).toContain('muster limit');
    expect(
      validateCommand(f.state, f.scenario, s.playerRealm, {
        type: 'RecruitUnit',
        provinceId: 'p0',
        unitType: 'pc-unit-16',
      })?.detail,
    ).toMatch(/level|elf/i);
    expect(forecast(s, f.scenario, s.playerRealm).military).toBe(
      forecast(f.state, f.scenario, s.playerRealm).military + 2,
    );
  });
  it('allows holding-only muster exceptions and low-level mercenaries without transferring the province', () => {
    const f = fixture();
    f.state.holdings.push({
      id: 'recruit-guild',
      realmId: f.state.playerRealm,
      provinceId: 'p1',
      type: 'guild',
      level: 4,
    });
    const owner = f.state.provinces.find((p) => p.id === 'p1')!.owner;
    const s = issue(f.state, f.scenario, {
      type: 'RecruitUnit',
      provinceId: 'p1',
      unitType: 'pc-unit-1',
    });
    expect(s.provinces.find((p) => p.id === 'p1')!.owner).toBe(owner);
    f.state.provinces.find((p) => p.id === 'p0')!.level = 1;
    expect(
      validateCommand(f.state, f.scenario, f.state.playerRealm, {
        type: 'RecruitUnit',
        provinceId: 'p0',
        unitType: 'pc-unit-14',
      }),
    ).toBeNull();
  });
  it('splits and rejoins units while preserving identity, disbands freely, and rejects stacks over 15', () => {
    const f = fixture(),
      a = f.state.armies[0]!,
      id = a.units[0]!.id;
    let s = issue(f.state, f.scenario, { type: 'SplitArmy', armyId: a.id, unitIds: [id] });
    const other = s.armies.find((a) => a.id.startsWith('army-'))!;
    s = issue(s, f.scenario, { type: 'JoinArmies', armyId: a.id, otherArmyId: other.id });
    expect(s.armies.find((b) => b.id === a.id)!.units).toHaveLength(2);
    s = issue(s, f.scenario, { type: 'DisbandUnit', armyId: a.id, unitId: id });
    expect(s.armies.find((b) => b.id === a.id)!.units).toHaveLength(1);
    expect(s.realms[0]!.actions).toBe(3);
    const b = structuredClone(s.armies[0]!);
    b.id = 'too-many';
    b.units = Array.from({ length: 15 }, (_, i) => ({ ...b.units[0]!, id: `extra-${i}` }));
    s.armies.push(b);
    expect(
      validateCommand(s, f.scenario, s.playerRealm, {
        type: 'JoinArmies',
        armyId: a.id,
        otherArmyId: b.id,
      })?.detail,
    ).toContain('15');
  });
  it('uses consideration thresholds before RP, transfers accepted offers and does not reward rejection', () => {
    const f = fixture();
    activate(f.state);
    const cmd: Command = {
      type: 'ProposeTreaty',
      target: 'verdant',
      kind: 'pact',
      regencyBid: 20,
      offerGold: 5,
    };
    expect(diplomacyTerms(f.state, f.scenario, f.state.playerRealm, cmd).reaction).toBe(75);
    const accepted = issue(f.state, f.scenario, cmd);
    expect(relation(accepted, 'crownmere', 'verdant')?.kind).toBe('pact');
    expect(accepted.realms[0]!.treasury).toBe(494);
    expect(accepted.realms[1]!.treasury).toBe(505);
    expect(accepted.realms[0]!.regency).toBe(479);
    expect(
      validateCommand(f.state, f.scenario, f.state.playerRealm, {
        ...cmd,
        offerGold: 0,
        regencyBid: 100,
      })?.detail,
    ).toContain('threshold');
    const failure = structuredClone(f.state);
    failure.rng = 7;
    const result = issue(failure, f.scenario, { ...cmd, regencyBid: 0 });
    expect(result.log.some((e) => e.code === 'treaty.rejected')).toBe(true);
    expect(diplomaticReaction(result, 'verdant', 'crownmere')).toBe(50);
    expect(validateCommand(result, f.scenario, result.playerRealm, cmd)?.detail).toMatch(
      /already|INVALID/i,
    );
  });
  it('makes permissive passage and negotiated tribute real, and renunciation ends both', () => {
    const f = fixture();
    activate(f.state);
    const cmd: Command = {
      type: 'ProposeTreaty',
      target: 'verdant',
      kind: 'pact',
      offerGold: 10,
      offerTribute: 2,
      regencyBid: 20,
    };
    let s = issue(f.state, f.scenario, cmd);
    expect(
      s.tributes?.some(
        (t) => t.payer === 'crownmere' && t.recipient === 'verdant' && t.amount === 2,
      ),
    ).toBe(true);
    expect(
      validateCommand(s, f.scenario, s.playerRealm, {
        type: 'MoveArmy',
        armyId: s.armies[0]!.id,
        destination: 'p1',
      }),
    ).toBeNull();
    s = issue(s, f.scenario, { type: 'BreakTreaty', target: 'verdant' });
    expect(s.tributes).toHaveLength(0);
    expect(relation(s, 'crownmere', 'verdant')?.kind).toBe('peace');
    expect(
      validateCommand(s, f.scenario, s.playerRealm, {
        type: 'MoveArmy',
        armyId: s.armies[0]!.id,
        destination: 'p1',
      }),
    ).not.toBeNull();
  });
  it('declares directional wars with NPC allied support and expires Classic permissions', () => {
    const f = fixture();
    activate(f.state, 'verdant');
    activate(f.state, 'ironvale');
    f.state.treaties.push({
      a: 'crownmere',
      b: 'ironvale',
      kind: 'alliance',
      opinion: 50,
      since: 1,
    });
    let s = issue(f.state, f.scenario, { type: 'ProposeTreaty', target: 'verdant', kind: 'war' });
    expect(s.warDeclarations).toEqual(
      expect.arrayContaining([
        { actor: 'crownmere', target: 'verdant', turn: 1 },
        { actor: 'ironvale', target: 'verdant', turn: 1 },
      ]),
    );
    for (const r of s.realms) if (r.id !== s.playerRealm) r.controller = 'passive';
    s = issue(s, f.scenario, { type: 'EndTurn' });
    expect(s.warDeclarations).toHaveLength(0);
    expect(s.turn).toBe(2);
  });
  it('bases battle power on original card attributes and preserves retreat and occupation separation', () => {
    const f = fixture(),
      attacker = structuredClone(f.state.armies[0]!),
      defender = structuredClone(f.state.armies[1]!);
    attacker.units.forEach((u) => (u.type = 'pc-unit-8'));
    defender.units.forEach((u) => (u.type = 'pc-unit-6'));
    const a = autoResolve.resolve({
      attacker,
      defenders: [defender],
      provinceId: 'p1',
      state: f.state,
      scenario: f.scenario,
    });
    defender.units.forEach((u) => (u.type = 'pc-unit-2'));
    const b = autoResolve.resolve({
      attacker,
      defenders: [defender],
      provinceId: 'p1',
      state: f.state,
      scenario: f.scenario,
    });
    expect(b.defensePower).toBeGreaterThan(a.defensePower);
    expect(a.attackerWins).toBe(true);
    f.state.armies[0]!.units = Array.from({ length: 8 }, (_, i) => ({
      id: `knight-${i}`,
      type: 'pc-unit-8',
      strength: 100,
    }));
    f.state.armies[1]!.provinceId = 'p1';
    f.state.armies[1]!.units = [{ id: 'enemy-levy', type: 'pc-unit-6', strength: 100 }];
    f.state.treaties.push({ a: 'crownmere', b: 'verdant', kind: 'war', opinion: -20, since: 1 });
    f.state.warDeclarations = [{ actor: 'crownmere', target: 'verdant', turn: 1 }];
    const s = issue(f.state, f.scenario, {
      type: 'MoveArmy',
      armyId: f.state.armies[0]!.id,
      destination: 'p1',
    });
    expect(s.provinces.find((p) => p.id === 'p1')).toMatchObject({
      owner: 'verdant',
      occupiedBy: 'crownmere',
    });
    expect(
      s.log.some((e) => e.code === 'battle.won' && typeof e.data.attackerLoss === 'number'),
    ).toBe(true);
  });
  it('builds castles with 8 GB per level over seeded 1d6 seasonal progress', () => {
    const f = fixture();
    let s = issue(f.state, f.scenario, { type: 'Fortify', provinceId: 'p0' });
    const fort = s.fortifications!.find((f) => f.provinceId === 'p0')!;
    expect(fort.level).toBe(0);
    expect(fort.constructionSpent).toBeGreaterThanOrEqual(1);
    expect(fort.constructionSpent).toBeLessThanOrEqual(6);
    for (let i = 0; i < 8 && fort.level === 0; i++) {
      s.turn++;
      buildCastles(s, f.scenario);
    }
    expect(fort.level).toBe(1);
    expect(s.realms[0]!.treasury).toBe(492);
    expect(deserializeCampaign(serializeCampaign(s), f.scenario).fortifications).toEqual(
      s.fortifications,
    );
  });
  it('uses empire points, preserves holding-only domains, supports continued play and removes the 80-season ending', () => {
    const f = fixture();
    f.state.treaties.push({
      a: 'crownmere',
      b: 'verdant',
      kind: 'vassal',
      vassal: 'verdant',
      opinion: 50,
      since: 1,
    });
    expect(empirePoints(f.state, f.scenario, 'crownmere')).toBe(
      f.state.provinces.filter((p) => ['crownmere', 'verdant'].includes(p.owner)).length * 3,
    );
    f.state.turn = 81;
    let s = issue(f.state, f.scenario, { type: 'HoldAction' });
    expect(s.outcome).toBe('ongoing');
    s.outcome = 'victory';
    s = issue(s, f.scenario, { type: 'ContinueCampaign' });
    expect(s.crowned).toBe(true);
    expect(s.outcome).toBe('ongoing');
  });
  it('marks zero-loyalty rebellion and produces deterministic original event selections', () => {
    const f = fixture();
    f.state.provinces[0]!.loyalty = 0;
    synchronizeRebellions(f.state);
    expect(f.state.provinces[0]!.contested).toBe(true);
    f.state.turn = 4;
    const other = structuredClone(f.state);
    strategicEvents(f.state, f.scenario);
    strategicEvents(other, f.scenario);
    expect(other).toEqual(f.state);
    expect(f.state.pendingEvents).toHaveLength(0);
  });
  it.skipIf(!existsSync('reference/extracted/anuire/strategy.research.json'))(
    'validates the 234 military records, real matrix axes, old-save identity migration and all Anuire references',
    async () => {
      const json = (name: string) =>
        JSON.parse(readFileSync(`reference/extracted/anuire/${name}.research.json`, 'utf8'));
      const raw = json('anuire'),
        strategy = json('strategy');
      expect(
        extractStrategyRecords(raw, readFileSync('reference/extracted/disc/RLMSTART.DAT')),
      ).toEqual(strategy);
      const s = await loadAnuireScenario(raw, json('economy'), json('magic'), strategy),
        old = await loadAnuireScenario(raw, json('economy'), json('magic'));
      expect(s.fingerprint).toBe(old.fingerprint);
      expect(strategy.troops).toHaveLength(234);
      expect(new Set(strategy.troops.map((t: { icon: number }) => t.icon)).size).toBe(21);
      const state = createCampaign(s, 'anuire-realm-27');
      expect(state.provinces).toHaveLength(206);
      expect(state.realms).toHaveLength(51);
      expect(state.holdings).toHaveLength(766);
      expect(relation(state, 'anuire-realm-01', 'anuire-realm-27')?.kind).toBe('pact');
      expect(relation(state, 'anuire-realm-07', 'anuire-realm-04')).toMatchObject({
        kind: 'vassal',
        vassal: 'anuire-realm-07',
      });
      const partial = state.treaties.find(
        (t) => t.originalStatusA === undefined && t.originalStatusB !== undefined,
      )!;
      expect(diplomaticReaction(state, partial.a, partial.b)).toBe(50);
      expect(
        state.armies
          .flatMap((a) => a.units)
          .map((u) => u.id)
          .sort(),
      ).toEqual(
        old.initial.armies
          .flatMap((a) => a.units)
          .map((u) => u.id)
          .sort(),
      );
      validateStateReferences(state, s);
      expect(deserializeCampaign(serializeCampaign(state), s)).toEqual(state);
      const legacy = createCampaign(old, 'anuire-realm-27');
      legacy.realms[0]!.treasury = 142.5;
      const upgraded = deserializeCampaign(serializeCampaign(legacy), s);
      expect(upgraded.realms[0]!.treasury).toBe(142.5);
      expect(upgraded.armies.flatMap((a) => a.units).every((u) => u.nativeIcon !== undefined)).toBe(
        true,
      );
      expect(() => extractStrategyRecords(raw, new Uint8Array(100))).toThrow();
    },
  );
});
