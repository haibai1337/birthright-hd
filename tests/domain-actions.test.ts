import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  commandCost,
  createCampaign,
  deserializeCampaign,
  domainActionQuote,
  domainPower,
  forecast,
  realmSelectable,
  replay,
  serializeCampaign,
  sourcePotential,
  validateCommand,
  validateStateReferences,
  type Campaign,
  type Command,
  type Scenario,
} from '../packages/core';
import { developmentScenario } from './fixtures/scenario';
import { existsSync, readFileSync } from 'node:fs';
import { loadAnuireScenario } from '../packages/world-data/anuire-scenario';
import { validateAnuireResearch } from '../packages/world-data/anuire-research';

function fixture(player = 'crownmere') {
  const scenario = structuredClone(developmentScenario);
  scenario.policy!.domainActions = 'pc';
  scenario.policy!.conquest = 'occupation';
  scenario.policy!.survival = 'domain-assets';
  scenario.victory = { provinces: 99, turns: 80 };
  scenario.events = [
    {
      id: 'quiet',
      weight: 1,
      gold: 0,
      loyalty: 0,
      decision: false,
      provenance: scenario.provenance,
    },
  ];
  const state = createCampaign(scenario, player, 1997, 'CLASSIC');
  for (const r of state.realms) {
    r.actions = r.id === player ? 3 : 0;
    r.treasury = 500;
    r.regency = r.id === player ? 500 : 0;
  }
  return { scenario, state };
}
function issue(state: Campaign, scenario: Scenario, command: Command) {
  const r = applyCommand(state, scenario, state.playerRealm, command);
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.detail ?? ''}`);
  return r.state;
}
function finishResponses(state: Campaign, scenario: Scenario, bid = 0) {
  for (let i = 0; state.pendingDomainAction && i < 40; i++)
    state = issue(state, scenario, {
      type: 'RespondDomainAction',
      regency: state.pendingDomainAction.stage === 'counter' ? bid : 0,
    });
  expect(state.pendingDomainAction).toBeUndefined();
  return state;
}
describe('M1B-2 original domain actions', () => {
  it('interleaves one regular action per realm per round and retains seeded seasonal order', () => {
    const f = fixture();
    f.state.domainTurn = { round: 1, order: ['crownmere', 'ironvale', 'verdant'], cursor: 0 };
    f.state.realms.find((r) => r.id === 'ironvale')!.actions = 3;
    const a = issue(f.state, f.scenario, { type: 'HoldAction' });
    const b = issue(f.state, f.scenario, { type: 'HoldAction' });
    expect(a).toEqual(b);
    expect(a.domainTurn).toMatchObject({ round: 2, cursor: 0, order: f.state.domainTurn.order });
    expect(a.realms.find((r) => r.id === 'ironvale')!.actions).toBe(2);
    expect(a.realms[0]!.actions).toBe(2);
    expect(
      a.history.filter(
        (h) =>
          h.actor === 'ironvale' &&
          commandCost(f.state, f.scenario, h.command, h.actor).actions === 1,
      ),
    ).toHaveLength(1);
  });
  it('uses verified province costs and d20 failure/success; level zero has no base RP cost', () => {
    const f = fixture();
    const c: Command = { type: 'DevelopProvince', provinceId: 'p4' };
    expect(commandCost(f.state, f.scenario, c)).toMatchObject({ gold: 5, regency: 5, actions: 1 });
    expect(domainActionQuote(f.state, f.scenario, 'crownmere', c)!.checks[0]!.threshold).toBe(14);
    f.state.rng = 0;
    const failed = issue(f.state, f.scenario, c);
    expect(failed.provinces.find((p) => p.id === 'p4')!.level).toBe(4);
    expect(failed.realms[0]).toMatchObject({ treasury: 495, regency: 495, actions: 2 });
    const won = issue(f.state, f.scenario, { ...c, regencyBid: 13 });
    expect(won.provinces.find((p) => p.id === 'p4')!.level).toBe(5);
    f.state.provinces.find((p) => p.id === 'p4')!.level = 0;
    expect(commandCost(f.state, f.scenario, c).regency).toBe(0);
  });
  it('preserves elven magical potential, shrinks ordinary sources, and never normalizes imported high levels', () => {
    const f = fixture();
    const p = f.scenario.provinces.find((p) => p.id === 'p4')!;
    const old = sourcePotential(f.scenario, p.id, 4);
    const grown = issue(f.state, f.scenario, {
      type: 'DevelopProvince',
      provinceId: p.id,
      regencyBid: 20,
    });
    expect(sourcePotential(f.scenario, p.id, 5)).toBe(old - 1);
    expect(grown.holdings.find((h) => h.id === 'h-4-source')!.level).toBeLessThanOrEqual(old - 1);
    p.original = { population: { elf: true } };
    expect(sourcePotential(f.scenario, p.id, 5)).toBe(old);
    f.scenario.policy!.holdingCapacity = 'preserve-template-excess';
    f.scenario.initial.holdings.find((h) => h.id === 'h-4-source')!.level = 4;
    f.state.holdings.find((h) => h.id === 'h-4-source')!.level = 4;
    const elven = issue(f.state, f.scenario, {
      type: 'DevelopProvince',
      provinceId: p.id,
      regencyBid: 20,
    });
    expect(elven.holdings.find((h) => h.id === 'h-4-source')!.level).toBe(4);
    validateStateReferences(elven, f.scenario);
    f.state.provinces.find((x) => x.id === p.id)!.level = 12;
    expect(
      validateCommand(f.state, f.scenario, 'crownmere', {
        type: 'DevelopProvince',
        provinceId: p.id,
      })?.detail,
    ).toMatch(/10/);
    expect(f.state.provinces.find((x) => x.id === p.id)!.level).toBe(12);
  });
  it('establishes level-zero holdings even in a full pool, rejects duplicates, and rules selected holdings for one action', () => {
    const f = fixture();
    let s = issue(f.state, f.scenario, {
      type: 'CreateHolding',
      provinceId: 'p6',
      holdingType: 'guild',
      regencyBid: 30,
    });
    const h = s.holdings.find(
      (h) => h.provinceId === 'p6' && h.realmId === 'crownmere' && h.type === 'guild',
    )!;
    expect(h.level).toBe(0);
    expect(
      validateCommand(s, f.scenario, 'crownmere', {
        type: 'CreateHolding',
        provinceId: 'p6',
        holdingType: 'guild',
      })?.detail,
    ).toMatch(/already/);
    const command: Command = {
      type: 'RuleHoldings',
      holdings: [
        { holdingId: 'h-4-guild', regencyBid: 20 },
        { holdingId: 'h-4-temple', regencyBid: 20 },
      ],
    };
    expect(commandCost(s, f.scenario, command)).toMatchObject({ gold: 2, regency: 44, actions: 1 });
    s = issue(s, f.scenario, command);
    expect(s.holdings.find((h) => h.id === 'h-4-guild')!.level).toBe(2);
    expect(s.holdings.find((h) => h.id === 'h-4-temple')!.level).toBe(2);
    expect(s.realms[0]!.actions).toBe(1);
    const full = structuredClone(s);
    full.holdings.find((h) => h.id === 'h-4-guild')!.level = 4;
    expect(
      validateCommand(full, f.scenario, 'crownmere', {
        type: 'ImproveHolding',
        holdingId: 'h-4-guild',
      })?.detail,
    ).toMatch(/no room/);
  });
  it('contests without transfer, removes income/RP, restores a full contested holding, and tombstones a second successful contest', () => {
    const f = fixture();
    const before = forecast(f.state, f.scenario, 'verdant').holdings;
    let s = issue(f.state, f.scenario, {
      type: 'ContestHolding',
      holdingId: 'h-5-temple',
      regencyBid: 30,
    });
    expect(s.holdings.find((h) => h.id === 'h-5-temple')).toMatchObject({
      realmId: 'verdant',
      level: 1,
      contested: true,
    });
    // Province 3 / holding 1 uses the original 1d2−1 income, expected 0.5 GB.
    expect(forecast(s, f.scenario, 'verdant').holdings).toBe(before - 0.5);
    const restore = structuredClone(s);
    restore.playerRealm = 'verdant';
    restore.domainTurn = { round: 2, order: ['verdant', 'crownmere', 'ironvale'], cursor: 0 };
    restore.realms.find((r) => r.id === 'verdant')!.actions = 2;
    restore.realms.find((r) => r.id === 'verdant')!.regency = 50;
    restore.provinces.find((p) => p.id === 'p5')!.level = 1;
    const recovered = issue(restore, f.scenario, {
      type: 'ImproveHolding',
      holdingId: 'h-5-temple',
      regencyBid: 20,
    });
    expect(recovered.holdings.find((h) => h.id === 'h-5-temple')).toMatchObject({
      level: 1,
      contested: false,
    });
    s = issue(s, f.scenario, { type: 'ContestHolding', holdingId: 'h-5-temple', regencyBid: 30 });
    expect(s.holdings.find((h) => h.id === 'h-5-temple')).toMatchObject({
      realmId: 'verdant',
      level: 0,
      destroyed: true,
    });
  });
  it('charges the independent defender RP and allows the attacker to counter; pending disputes round-trip and reject other orders', () => {
    const f = fixture();
    f.state.realms.find((r) => r.id === 'verdant')!.regency = 20;
    f.state.rng = 10;
    const initial = structuredClone(f.state);
    const s = issue(f.state, f.scenario, { type: 'ContestHolding', holdingId: 'h-5-temple' });
    expect(s.pendingDomainAction?.stage).toBe('counter');
    const defense = s.pendingDomainAction!.opposition.reduce((n, o) => n + o.regency, 0);
    expect(defense).toBeGreaterThan(0);
    expect(s.realms.find((r) => r.id === 'verdant')!.regency).toBe(20 - defense);
    expect(deserializeCampaign(serializeCampaign(s), f.scenario)).toEqual(s);
    expect(validateCommand(s, f.scenario, 'crownmere', { type: 'HoldAction' })?.detail).toMatch(
      /pending/,
    );
    const countered = issue(s, f.scenario, { type: 'RespondDomainAction', regency: 30 });
    expect(countered.pendingDomainAction?.stage).toBe('counter');
    expect(countered.realms.find((r) => r.id === 'verdant')!.regency).toBeLessThan(
      s.realms.find((r) => r.id === 'verdant')!.regency,
    );
    const resolved = finishResponses(countered, f.scenario);
    expect(resolved.holdings.find((h) => h.id === 'h-5-temple')!.contested).toBe(true);
    expect(resolved.realms[0]!.regency).toBe(469);
    expect(replay(f.scenario, initial, resolved.history)).toEqual(resolved);
  });
  it('pauses an AI action to let the player defend without spending a domain action', () => {
    const f = fixture();
    const s = f.state;
    s.pendingDomainAction = {
      actor: 'verdant',
      command: { type: 'ContestHolding', holdingId: 'h-4-guild' },
      checks: [
        { provinceId: 'p4', holdingId: 'h-4-guild', threshold: 10, opponents: ['crownmere'] },
      ],
      index: 0,
      opposition: [],
      extraRegency: 0,
      stage: 'defend',
      actions: 1,
    };
    s.domainTurn = { round: 1, order: ['verdant', 'crownmere', 'ironvale'], cursor: 0 };
    const after = issue(s, f.scenario, { type: 'RespondDomainAction', regency: 20 });
    expect(after.realms[0]!.actions).toBe(3);
    expect(after.realms[0]!.regency).toBe(480);
    expect(after.holdings.find((h) => h.id === 'h-4-guild')!.contested).not.toBe(true);
    expect(after.domainTurn!.cursor).toBe(1);
  });
  it('lets a holding-only priest rule and agitate with the verified once-seasonal free action', () => {
    const f = fixture('verdant');
    f.scenario.realms.find((r) => r.id === 'verdant')!.regent.class = 'priest';
    for (const p of f.state.provinces) if (p.owner === 'verdant') p.owner = 'ironvale';
    const c: Command = {
      type: 'Agitate',
      targets: [{ provinceId: 'p5', direction: 'lower', regencyBid: 30 }],
    };
    expect(commandCost(f.state, f.scenario, c, 'verdant')).toMatchObject({
      gold: 1,
      regency: 31,
      actions: 0,
    });
    const s = issue(f.state, f.scenario, c);
    expect(s.realms.find((r) => r.id === 'verdant')!).toMatchObject({
      actions: 3,
      eliminated: false,
      freeAgitateUsedTurn: 1,
    });
    expect(s.provinces.find((p) => p.id === 'p5')!.loyalty).toBe(
      f.state.provinces.find((p) => p.id === 'p5')!.loyalty - 1,
    );
    expect(commandCost(s, f.scenario, c, 'verdant').actions).toBe(1);
    const next = issue(s, f.scenario, {
      type: 'ImproveHolding',
      holdingId: 'h-5-law',
      regencyBid: 20,
    });
    expect(next.realms.find((r) => r.id === 'verdant')!.eliminated).toBe(false);
  });
  it('keeps mustering/marching free and retains M1B-1 occupation/investiture through three rounds', () => {
    const f = fixture();
    const army = f.state.armies.find((a) => a.id === 'initial-army-0')!;
    army.units = Array.from({ length: 14 }, (_, i) => ({
      id: `test-unit-${i}`,
      type: 'infantry',
      strength: 100,
    }));
    expect(
      commandCost(f.state, f.scenario, { type: 'MoveArmy', armyId: army.id, destination: 'p10' })
        .actions,
    ).toBe(0);
    let s = issue(f.state, f.scenario, { type: 'MoveArmy', armyId: army.id, destination: 'p10' });
    expect(s.provinces.find((p) => p.id === 'p10')).toMatchObject({
      owner: 'ironvale',
      occupiedBy: 'crownmere',
    });
    expect(s.domainTurn!.round).toBe(1);
    s = finishResponses(issue(s, f.scenario, { type: 'EndTurn' }), f.scenario);
    expect(s.turn).toBe(2);
    s = finishResponses(
      issue(s, f.scenario, { type: 'InvestProvince', provinceId: 'p10', regencyBid: 9 }),
      f.scenario,
    );
    expect(s.provinces.find((p) => p.id === 'p10')).toMatchObject({
      owner: 'crownmere',
      occupiedBy: null,
    });
    expect(deserializeCampaign(serializeCampaign(s), f.scenario)).toEqual(s);
  });
  it('replays seeded action rounds and upgrades legacy budgets without resetting source records', () => {
    const f = fixture();
    const initial = structuredClone(f.state);
    let s = issue(f.state, f.scenario, {
      type: 'DevelopProvince',
      provinceId: 'p4',
      regencyBid: 20,
    });
    s = issue(s, f.scenario, { type: 'HoldAction' });
    expect(replay(f.scenario, initial, s.history)).toEqual(s);
    delete s.domainTurn;
    const loaded = deserializeCampaign(serializeCampaign(s), f.scenario);
    expect(loaded.holdings).toEqual(s.holdings);
    expect(loaded.realms).toEqual(s.realms);
    expect(loaded.domainTurn!.round).toBe(3);
    expect(loaded.log.at(-1)!.code).toBe('save.domain-rounds-upgraded');
  });
});
it.skipIf(!existsSync('reference/extracted/anuire/anuire.research.json'))(
  'preserves private Anuire entities/selectability and runs legal AI round slots',
  async () => {
    const scenario = await loadAnuireScenario(
      validateAnuireResearch(
        JSON.parse(readFileSync('reference/extracted/anuire/anuire.research.json', 'utf8')),
      ),
    );
    const state = createCampaign(scenario, 'anuire-realm-27');
    expect(state.provinces).toHaveLength(206);
    expect(state.realms).toHaveLength(51);
    expect(state.holdings).toHaveLength(766);
    expect(scenario.realms.filter((r) => realmSelectable(scenario, r.id))).toHaveLength(18);
    const next = finishResponses(issue(state, scenario, { type: 'HoldAction' }), scenario);
    validateStateReferences(next, scenario);
    expect(deserializeCampaign(serializeCampaign(next), scenario)).toEqual(next);
    expect(domainPower(next, scenario, state.playerRealm)).toBeGreaterThan(0);
  },
);
