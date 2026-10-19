import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { developmentScenario } from './fixtures/scenario';
import { loadAnuireScenario } from '../packages/world-data/anuire-scenario';
import { auditInitialization } from '../packages/import-tools/initialization';
import {
  createCampaign,
  applyCommand,
  applyDiplomacy,
  breakAgreement,
  commandRealm,
  playerControls,
  fealtyTo,
  settleFealtyRegency,
  mayEnter,
  mayInvade,
  domainSurvives,
  validateCommand,
  validateStateReferences,
  serializeCampaign,
  deserializeCampaign,
  forecast,
  magicQuote,
  applyOriginalEvent,
  settlePCEconomy,
  planNextAI,
  PC_UNITS,
  PC_REALM_SPELLS,
  realmSelectable,
  type Campaign,
  type Command,
  type Scenario,
} from '../packages/core';

function fixture() {
  const scenario = structuredClone(developmentScenario);
  Object.assign(scenario.policy!, {
    domainActions: 'pc',
    strategicRules: 'pc-1997',
    conquest: 'occupation',
    survival: 'domain-assets',
  });
  scenario.victory = { provinces: 99, turns: 80, metric: 'empire-points', target: 400 };
  scenario.units.push(...structuredClone(PC_UNITS));
  scenario.spells.push(...structuredClone(PC_REALM_SPELLS));
  scenario.initial.treaties = [];
  scenario.initial.fortifications = [];
  for (const [i, p] of scenario.provinces.entries())
    p.original = {
      index: i + 1,
      borders: p.adjacent.map((id) => ({
        provinceIndex: scenario.provinces.findIndex((p) => p.id === id) + 1,
        movementCode: 2,
      })),
    };
  for (const p of scenario.initial.provinces) p.fort = 0;
  for (const r of scenario.realms) {
    r.controller = 'ai';
    r.domainType = 'territorial';
  }
  scenario.realms.push({
    ...structuredClone(scenario.realms[0]!),
    id: 'monsters',
    name: 'Chaos',
    specialBehavior: 'monsters',
    domainType: 'special',
    survival: 'persistent',
    technicalPlayable: false,
    originalPlayable: false,
  });
  const state = createCampaign(scenario, 'crownmere', 1997, 'CLASSIC');
  for (const r of state.realms) {
    r.treasury = 500;
    r.regency = 500;
    if (r.id !== state.playerRealm) r.actions = 0;
  }
  state.domainTurn = {
    order: ['crownmere', 'verdant', 'ironvale', 'monsters'],
    round: 1,
    cursor: 0,
  };
  return { scenario, state };
}
function oath(s: Campaign, vassal = 'verdant', liege = 'crownmere', pledge = 0) {
  s.treaties.push({
    a: liege,
    b: vassal,
    kind: 'vassal',
    vassal,
    opinion: 50,
    since: 1,
    regencyPledge: pledge,
  });
}
function issue(s: Campaign, scenario: Scenario, c: Command) {
  const r = applyCommand(s, scenario, commandRealm(s, scenario), c);
  if (!r.ok) throw Error(`${r.error.code}: ${r.error.detail}`);
  return r.state;
}
const json = (name: string) =>
  JSON.parse(readFileSync(`reference/extracted/anuire/${name}.research.json`, 'utf8'));

describe('M1B-6 fealty, monsters and initialization', () => {
  it('controls landed vassals in their own slots without annexing land or sharing budgets', () => {
    const { scenario, state } = fixture();
    oath(state);
    state.realms.find((r) => r.id === 'verdant')!.actions = 3;
    const owners = state.provinces.map((p) => p.owner),
      holdings = structuredClone(state.holdings);
    let next = issue(state, scenario, { type: 'HoldAction' });
    expect(commandRealm(next, scenario)).toBe('verdant');
    expect(next.playerRealm).toBe('crownmere');
    next = issue(next, scenario, { type: 'SetCourt', level: 3 });
    expect(next.realms.find((r) => r.id === 'verdant')!.court).toBe(3);
    expect(next.realms[0]!.court).toBe(1);
    next = issue(next, scenario, { type: 'HoldAction' });
    expect(commandRealm(next, scenario)).toBe('crownmere');
    expect(next.realms.slice(0, 2).map((r) => r.actions)).toEqual([2, 2]);
    expect(next.provinces.map((p) => p.owner)).toEqual(owners);
    expect(next.holdings).toEqual(holdings);
    expect(deserializeCampaign(serializeCampaign(next), scenario)).toEqual(next);
  });
  it('ending fealty immediately removes control, passage and the RP pledge', () => {
    const { scenario, state } = fixture();
    oath(state, 'verdant', 'crownmere', 7);
    const land = state.provinces.find((p) => p.owner === 'verdant')!;
    expect(playerControls(state, scenario, 'verdant')).toBe(true);
    expect(mayEnter(state, 'crownmere', land)).toBe(true);
    breakAgreement(state, 'verdant', 'crownmere');
    expect(playerControls(state, scenario, 'verdant')).toBe(false);
    expect(mayEnter(state, 'crownmere', land)).toBe(false);
    expect(fealtyTo(state, 'verdant')).toBeNull();
    expect(state.treaties[0]!.regencyPledge).toBeUndefined();
  });
  it('only the vassal donates or pledges its own RP and the donation is conserved', () => {
    const { scenario, state } = fixture();
    oath(state);
    expect(
      validateCommand(state, scenario, 'crownmere', { type: 'DonateFealtyRegency', amount: 8 }),
    ).not.toBeNull();
    state.domainTurn!.cursor = 1;
    state.realms[1]!.actions = 3;
    let next = issue(state, scenario, { type: 'SetFealtyRegency', amount: 9 });
    next = issue(next, scenario, { type: 'DonateFealtyRegency', amount: 8 });
    expect(next.realms.slice(0, 2).map((r) => r.regency)).toEqual([508, 492]);
    expect(next.realms[1]!.actions).toBe(3);
    expect(next.treaties[0]!.regencyPledge).toBe(9);
    expect(
      validateCommand(next, scenario, 'verdant', { type: 'DonateFealtyRegency', amount: 493 }),
    ).not.toBeNull();
  });
  it('settles multiple vassals independently, conserves RP and caps receipts', () => {
    const { scenario, state } = fixture();
    oath(state, 'verdant', 'crownmere', 8);
    oath(state, 'ironvale', 'crownmere', 6);
    state.realms[0]!.regency = 65530;
    state.realms[1]!.regency = 3;
    state.realms[2]!.regency = 4;
    const total = state.realms.reduce((n, r) => n + r.regency, 0);
    const reports = new Map(state.realms.map((r) => [r.id, forecast(state, scenario, r.id)]));
    settleFealtyRegency(state, reports);
    expect(state.realms[0]!.regency).toBe(65535);
    expect(state.realms.reduce((n, r) => n + r.regency, 0)).toBe(total);
    expect(reports.get('crownmere')!.regencyTributeIn).toBe(5);
    expect(state.log.filter((e) => e.code === 'fealty.settled')).toHaveLength(2);
  });
  it('does not forward newly received RP through a fealty chain in the same settlement', () => {
    const { scenario, state } = fixture();
    oath(state, 'verdant', 'crownmere', 10);
    oath(state, 'ironvale', 'verdant', 10);
    state.realms[1]!.regency = 0;
    state.realms[2]!.regency = 10;
    settleFealtyRegency(
      state,
      new Map(state.realms.map((r) => [r.id, forecast(state, scenario, r.id)])),
    );
    expect(state.realms.slice(0, 3).map((r) => r.regency)).toEqual([500, 10, 0]);
  });
  it('charges controlled defenders from their own RP reserves and saves the response identity', () => {
    const { scenario, state } = fixture();
    oath(state);
    const holding = state.holdings.find((h) => h.realmId === 'verdant')!;
    state.pendingDomainAction = {
      actor: 'crownmere',
      command: { type: 'ContestHolding', holdingId: holding.id },
      checks: [
        {
          provinceId: holding.provinceId,
          holdingId: holding.id,
          threshold: 15,
          opponents: ['verdant'],
        },
      ],
      index: 0,
      opposition: [],
      extraRegency: 0,
      stage: 'defend',
      actions: 1,
      responseRealm: 'verdant',
      responseQueue: [],
    };
    expect(commandRealm(state, scenario)).toBe('verdant');
    const next = issue(state, scenario, { type: 'RespondDomainAction', regency: 4 });
    expect(next.realms[1]!.regency).toBe(496);
    expect(next.realms[0]!.regency).toBe(500);
    expect(next.pendingDomainAction?.responseRealm).toBe('crownmere');
    expect(deserializeCampaign(serializeCampaign(next), scenario)).toEqual(next);
  });
  it('restores native generic raider ownership and resolves a same-province encounter without a war declaration', () => {
    const { scenario, state } = fixture();
    applyOriginalEvent(state, scenario, 12, 'p0');
    const army = state.armies.find((a) => a.realmId === 'monsters')!;
    expect(army.units[0]!.type).toBe('pc-unit-26');
    expect(mayInvade(state, 'monsters', 'crownmere')).toBe(true);
    state.domainTurn!.cursor = 3;
    state.realms.at(-1)!.actions = 3;
    expect(planNextAI(state, scenario, 'monsters')?.command).toEqual({
      type: 'MoveArmy',
      armyId: army.id,
      destination: 'p0',
    });
    const result = applyCommand(
      state,
      scenario,
      'monsters',
      { type: 'MoveArmy', armyId: army.id, destination: 'p0' },
      {
        resolve: () => ({
          attackerWins: true,
          attackerLoss: 0,
          defenderLoss: 100,
          attackPower: 10,
          defensePower: 1,
        }),
      },
    );
    expect(result.ok).toBe(true);
    expect(result.state.provinces.find((p) => p.id === 'p0')!.owner).toBe('crownmere');
    expect(result.state.provinces.find((p) => p.id === 'p0')!.occupiedBy).toBe('monsters');
    expect(result.state.log.some((e) => e.code === 'province.occupied')).toBe(true);
  });
  it('routes all eight native raider events and deterministic antimagic protection', () => {
    const { scenario, state } = fixture();
    const copy = structuredClone(state);
    for (const [event, icon] of [
      [9, 20],
      [10, 22],
      [11, 24],
      [12, 26],
      [13, 27],
      [14, 12],
      [15, 10],
      [16, 14],
    ]) {
      applyOriginalEvent(state, scenario, event!, 'p0');
      expect(
        state.armies
          .filter((a) => a.realmId === 'monsters')
          .flatMap((a) => a.units)
          .at(-1)!.type,
      ).toBe(`pc-unit-${icon}`);
    }
    applyOriginalEvent(state, scenario, 8, 'p4');
    applyOriginalEvent(copy, scenario, 8, 'p4');
    const ward = state.effects.find((e) => e.kind === 'antimagic')!;
    expect(ward.resistance).toBe(copy.effects[0]!.resistance);
    const cmd = {
      type: 'CastRealmSpell' as const,
      spellId: 'alchemy',
      provinceId: 'p4',
      amount: 3,
    };
    expect(magicQuote(state, scenario, 'crownmere', cmd).regency).toBe(3 + ward.resistance! + 1);
    expect(deserializeCampaign(serializeCampaign(state), scenario).effects).toEqual(state.effects);
  });
  it('expires event protection after three boundaries and keeps monster controllers alive without upkeep', () => {
    const { scenario, state } = fixture();
    applyOriginalEvent(state, scenario, 8, 'p0');
    const effectId = state.effects[0]!.id;
    let next = state;
    for (let i = 0; i < 3; i++) {
      for (const r of next.realms) if (r.id !== next.playerRealm) r.actions = 0;
      next = issue(next, scenario, { type: 'EndTurn' });
    }
    expect(next.effects.some((e) => e.id === effectId)).toBe(false);
    expect(domainSurvives(next, scenario, 'monsters')).toBe(true);
    expect(next.realms.at(-1)!.treasury).toBe(500);
    expect(next.realms.at(-1)!.eliminated).toBe(false);
  });
  it('preserves unpaid mercenary identity under MONSTERS instead of deleting it', () => {
    const { scenario, state } = fixture();
    state.realms[0]!.treasury = 0;
    state.realms[0]!.regency = 0;
    state.holdings = [];
    state.tradeRoutes = [];
    state.ports = [];
    for (const p of state.provinces) {
      p.loyalty = 0;
      p.contested = true;
    }
    state.armies = [
      {
        id: 'merc-band',
        realmId: 'crownmere',
        provinceId: 'p0',
        moved: false,
        units: [{ id: 'merc-identity', type: 'pc-unit-10', strength: 75 }],
      },
    ];
    settlePCEconomy(state, scenario);
    expect(state.armies.find((a) => a.realmId === 'monsters')!.units[0]).toMatchObject({
      id: 'merc-identity',
      type: 'pc-unit-10',
      strength: 75,
    });
    expect(state.log.some((e) => e.code === 'unit.mutinied')).toBe(true);
  });
  it.skipIf(!existsSync('reference/extracted/anuire/strategy.research.json'))(
    'audits 51 native balances, preserves IDs/flags/ports and never rescales old saves',
    async () => {
      const raw = json('anuire'),
        bytes = readFileSync('reference/extracted/disc/RLMSTART.DAT');
      const audit = auditInitialization(raw, bytes);
      expect(audit.realms).toHaveLength(51);
      expect(audit.realms.find((r) => r.index === 27)!.treasuryGB).toBe(15);
      const scenario = await loadAnuireScenario(
        raw,
        json('economy'),
        json('magic'),
        json('strategy'),
      );
      const state = createCampaign(scenario, 'anuire-realm-04', 1997, 'CLASSIC', 'UNRESTRICTED');
      expect(state.realms).toHaveLength(51);
      expect(state.provinces).toHaveLength(206);
      expect(state.holdings).toHaveLength(766);
      expect(state.armies.flatMap((a) => a.units)).toHaveLength(234);
      expect(scenario.realms.filter((r) => realmSelectable(scenario, r.id))).toHaveLength(18);
      expect(state.realms.find((r) => r.id === state.playerRealm)!.treasury).toBe(15);
      expect(state.realms.find((r) => r.id === 'anuire-realm-23')).toMatchObject({
        behavior: 'monsters',
        controller: 'ai',
        eliminated: false,
      });
      expect(playerControls(state, scenario, 'anuire-realm-07')).toBe(true);
      expect(
        state.ports!.filter((p) => p.kind === 'seaport' && p.incomeRule === 'province-level'),
      ).toHaveLength(11);
      expect(
        state.ports!.filter(
          (p) => p.kind === 'river-port' && p.incomeRule === 'half-province-level',
        ),
      ).toHaveLength(8);
      state.realms[0]!.treasury = 142.5;
      expect(deserializeCampaign(serializeCampaign(state), scenario).realms[0]!.treasury).toBe(
        142.5,
      );
      const tampered = Buffer.from(bytes);
      tampered[30] = tampered[30]! ^ 1;
      expect(() => auditInitialization(raw, tampered)).toThrow();
    },
  );
  it.skipIf(!existsSync('reference/extracted/anuire/strategy.research.json'))(
    'incorporates N. Reformed Church as its verified lieutenant without deleting source identities',
    async () => {
      const scenario = await loadAnuireScenario(
        json('anuire'),
        json('economy'),
        json('magic'),
        json('strategy'),
      );
      const state = createCampaign(scenario, 'anuire-realm-04', 1997, 'CLASSIC', 'UNRESTRICTED');
      const subject = 'anuire-realm-49';
      const holdingIds = state.holdings.filter((h) => h.realmId === subject).map((h) => h.id);
      const originalRP = state.realms.find((r) => r.id === subject)!.regency;
      applyDiplomacy(
        state,
        scenario,
        state.playerRealm,
        { type: 'ProposeTreaty', target: subject, kind: 'vassal', offerTribute: 2 },
        true,
      );
      expect(
        state.characters!.filter((c) => c.role === 'lieutenant' && c.originRealm === subject),
      ).toHaveLength(1);
      expect(state.characters!.find((c) => c.originRealm === subject)).toMatchObject({
        regentId: 'anuire-regent-082',
        realmId: state.playerRealm,
        salary: 2,
      });
      expect(
        state.holdings
          .filter((h) => holdingIds.includes(h.id))
          .every((h) => h.realmId === state.playerRealm),
      ).toBe(true);
      expect(state.realms.find((r) => r.id === subject)).toMatchObject({
        lieutenantOf: state.playerRealm,
        controller: 'passive',
        regency: originalRP,
        eliminated: false,
      });
      expect(playerControls(state, scenario, subject)).toBe(false);
      expect(domainSurvives(state, scenario, subject)).toBe(true);
      expect(forecast(state, scenario, state.playerRealm).lieutenantSalaries).toBe(2);
      expect(state.realms).toHaveLength(51);
      expect(state.holdings).toHaveLength(766);
      validateStateReferences(state, scenario);
      expect(deserializeCampaign(serializeCampaign(state), scenario)).toEqual(state);
    },
  );
});
