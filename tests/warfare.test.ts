import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import {
  applyCommand,
  createCampaign,
  deserializeCampaign,
  domainPower,
  forecast,
  investitureTerms,
  mayInvade,
  serializeCampaign,
  validateCommand,
  validateStateReferences,
  type Campaign,
  type Command,
  type Scenario,
} from '../packages/core';
import { developmentScenario } from './fixtures/scenario';
import { loadAnuireScenario } from '../packages/world-data/anuire-scenario';
import { validateAnuireResearch } from '../packages/world-data/anuire-research';

function fixture() {
  const scenario = structuredClone(developmentScenario);
  scenario.policy!.conquest = 'occupation';
  scenario.policy!.survival = 'domain-assets';
  scenario.victory = { provinces: 99, turns: 80 };
  scenario.initial.fortifications = scenario.initial.provinces
    .filter((p) => p.fort > 0)
    .map((p) => ({
      id: `castle-${p.id}`,
      provinceId: p.id,
      realmId: p.owner,
      kind: 'castle',
      level: p.fort,
    }));
  scenario.initial.provinces.find((p) => p.id === 'p10')!.fort = 2;
  scenario.initial.fortifications.push({
    id: 'castle-p10',
    provinceId: 'p10',
    realmId: 'ironvale',
    kind: 'castle',
    level: 2,
  });
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
  const state = createCampaign(scenario, 'crownmere', 1997, 'CLASSIC');
  for (const r of state.realms) {
    r.treasury = 200;
    r.regency = 200;
    r.actions = r.id === 'crownmere' ? 3 : 0;
  }
  const army = state.armies.find((a) => a.id === 'initial-army-0')!;
  army.units = Array.from({ length: 14 }, (_, i) => ({
    id: `attacker-${i}`,
    type: 'infantry',
    strength: 100,
  }));
  // Existing fixture border p9 -> p10, with real defenders and an independent domain's holdings.
  return { scenario, state };
}
function issue(state: Campaign, scenario: Scenario, command: Command, actor = state.playerRealm) {
  const result = applyCommand(state, scenario, actor, command);
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.detail ?? ''}`);
  return result.state;
}
function invaded() {
  const f = fixture();
  f.state = issue(f.state, f.scenario, {
    type: 'MoveArmy',
    armyId: 'initial-army-0',
    destination: 'p10',
  });
  return f;
}
function nextSeason(state: Campaign, scenario: Scenario) {
  // Keep test focused: suppress AI actions, without marking active domains eliminated/passive.
  for (const r of state.realms) if (r.id !== state.playerRealm) r.actions = 0;
  return issue(state, scenario, { type: 'EndTurn' });
}
describe('M1B-1 warfare, occupation and investiture', () => {
  it('requires an offensive declaration, costs one action without GB/RP, and permits defensive liberation', () => {
    const { state, scenario } = fixture();
    state.treaties = [];
    state.warDeclarations = [];
    expect(
      validateCommand(state, scenario, 'crownmere', {
        type: 'MoveArmy',
        armyId: 'initial-army-0',
        destination: 'p10',
      })?.code,
    ).toBe('TREATY_REQUIRED');
    const war = issue(state, scenario, { type: 'ProposeTreaty', target: 'ironvale', kind: 'war' });
    expect(war.realms[0]).toMatchObject({ treasury: 200, regency: 200, actions: 2 });
    expect(mayInvade(war, 'crownmere', 'ironvale')).toBe(true);
    expect(mayInvade(war, 'ironvale', 'crownmere')).toBe(false);
    war.realms.find((r) => r.id === 'ironvale')!.actions = 3;
    const defender = war.armies.find((a) => a.realmId === 'ironvale')!;
    defender.provinceId = 'p9';
    expect(
      validateCommand(war, scenario, 'ironvale', {
        type: 'MoveArmy',
        armyId: defender.id,
        destination: 'p8',
      })?.code,
    ).toBe('TREATY_REQUIRED');
  });
  it('victory creates occupation, keeps sovereignty/holdings/fort owners, and retreats surviving defenders', () => {
    const before = fixture();
    const holdings = structuredClone(before.state.holdings);
    const state = issue(before.state, before.scenario, {
      type: 'MoveArmy',
      armyId: 'initial-army-0',
      destination: 'p10',
    });
    expect(state.provinces.find((p) => p.id === 'p10')).toMatchObject({
      owner: 'ironvale',
      occupiedBy: 'crownmere',
      contested: false,
    });
    expect(state.holdings).toEqual(holdings);
    expect(
      state
        .fortifications!.filter((f) => f.provinceId === 'p10')
        .every((f) => f.realmId === 'ironvale'),
    ).toBe(true);
    expect(state.log.some((e) => e.code === 'battle.won')).toBe(true);
    expect(state.log.some((e) => e.code === 'army.retreated' || e.code === 'army.trapped')).toBe(
      true,
    );
    validateStateReferences(state, before.scenario);
  });
  it('rejects premature/under-garrisoned investment atomically and transfers sovereignty on a successful seeded roll', () => {
    const f = invaded();
    const cmd: Command = { type: 'InvestProvince', provinceId: 'p10', regencyBid: 9 };
    const invalid = applyCommand(f.state, f.scenario, 'crownmere', cmd);
    expect(invalid).toMatchObject({ ok: false, error: { code: 'PREREQUISITE' } });
    expect(invalid.state).toBe(f.state);
    let state = nextSeason(f.state, f.scenario);
    const p = state.provinces.find((p) => p.id === 'p10')!;
    expect(p.investitureReadyTurn).toBe(2);
    const before = structuredClone(state);
    const terms = investitureTerms(state, f.scenario, p, 'crownmere', 9);
    state = issue(state, f.scenario, cmd);
    expect(state.provinces.find((p) => p.id === 'p10')).toMatchObject({
      owner: 'crownmere',
      occupiedBy: null,
    });
    expect(state.holdings).toEqual(before.holdings);
    expect(state.realms[0]!.treasury).toBe(before.realms[0]!.treasury - terms.gold);
    expect(state.realms[0]!.regency).toBe(before.realms[0]!.regency - terms.regency);
    expect(state.realms[0]!.actions).toBe(2);
    expect(domainPower(state, f.scenario, 'crownmere')).toBeGreaterThan(
      domainPower(before, f.scenario, 'crownmere'),
    );
    validateStateReferences(state, f.scenario);
    const short = structuredClone(before);
    short.armies.find((a) => a.id === 'initial-army-0')!.units = [
      short.armies.find((a) => a.id === 'initial-army-0')!.units[0]!,
    ];
    expect(validateCommand(short, f.scenario, 'crownmere', cmd)?.detail).toMatch(/requires/);
    const poor = structuredClone(before);
    poor.realms[0]!.regency = 0;
    expect(validateCommand(poor, f.scenario, 'crownmere', cmd)?.code).toBe('REGENCY');
  });
  it('uses 1 GB with a priest, 4 without; failure spends costs and keeps occupation', () => {
    const f = invaded();
    const state = nextSeason(f.state, f.scenario);
    const p = state.provinces.find((p) => p.id === 'p10')!;
    expect(investitureTerms(state, f.scenario, p, 'crownmere').gold).toBe(4);
    f.scenario.realms[0]!.regent.class = 'priest';
    expect(investitureTerms(state, f.scenario, p, 'crownmere').gold).toBe(1);
    // A fixed Mulberry32 state produces a low d20; no mocked random source.
    state.rng = 0;
    const after = issue(state, f.scenario, { type: 'InvestProvince', provinceId: 'p10' });
    expect(after.provinces.find((p) => p.id === 'p10')!.owner).toBe('ironvale');
    expect(after.realms[0]!.actions).toBe(2);
    expect(after.realms[0]!.treasury).toBe(state.realms[0]!.treasury - 1);
    expect(after.log.at(-1)?.code).toBe('investiture.failed');
  });
  it('persists occupations and investment across seasons/save-load, expires only Classic war permission', () => {
    const f = invaded();
    let state = nextSeason(f.state, f.scenario);
    expect(mayInvade(state, 'crownmere', 'ironvale')).toBe(false);
    expect(state.provinces.find((p) => p.id === 'p10')!.owner).toBe('ironvale');
    expect(deserializeCampaign(serializeCampaign(state), f.scenario)).toEqual(state);
    state = issue(state, f.scenario, { type: 'InvestProvince', provinceId: 'p10', regencyBid: 9 });
    state = nextSeason(state, f.scenario);
    expect(deserializeCampaign(serializeCampaign(state), f.scenario)).toEqual(state);
    expect(state.provinces.find((p) => p.id === 'p10')!.owner).toBe('crownmere');
  });
  it('gives occupation tax/maintenance to the occupier, no provincial RP to either side, and preserves independent domains', () => {
    const f = invaded();
    const p = f.state.provinces.find((p) => p.id === 'p10')!;
    const before = forecast(f.state, f.scenario, 'crownmere');
    const without = structuredClone(f.state);
    without.provinces.find((p) => p.id === 'p10')!.occupiedBy = null;
    const after = forecast(without, f.scenario, 'crownmere');
    expect(before.taxes).toBeGreaterThan(after.taxes);
    expect(before.maintenance).toBe(after.maintenance + 1);
    expect(domainPower(f.state, f.scenario, 'ironvale')).toBe(
      domainPower(without, f.scenario, 'ironvale') - p.level,
    );
    expect(
      validateCommand(f.state, f.scenario, 'ironvale', {
        type: 'RecruitUnit',
        provinceId: 'p10',
        unitType: 'infantry',
      })?.code,
    ).toBe('NOT_OWNER');
    expect(
      validateCommand(f.state, f.scenario, 'crownmere', {
        type: 'RecruitUnit',
        provinceId: 'p10',
        unitType: 'infantry',
      }),
    ).toBeNull();
    for (const q of f.state.provinces) if (q.owner === 'verdant') q.owner = 'ironvale';
    const holdings = structuredClone(f.state.holdings.filter((h) => h.realmId === 'verdant'));
    const state = nextSeason(f.state, f.scenario);
    expect(state.realms.find((r) => r.id === 'verdant')!.eliminated).toBe(false);
    expect(state.holdings.filter((h) => h.realmId === 'verdant')).toEqual(holdings);
  });
  it('ends abandoned occupation and resets preparations after an enemy attack, including a repelled attack', () => {
    const f = invaded();
    const ready = nextSeason(f.state, f.scenario);
    const abandoned = structuredClone(ready);
    const army = abandoned.armies.find((a) => a.id === 'initial-army-0')!;
    army.moved = false;
    const moved = issue(abandoned, f.scenario, {
      type: 'MoveArmy',
      armyId: army.id,
      destination: 'p9',
    });
    expect(moved.provinces.find((p) => p.id === 'p10')!.occupiedBy).toBeNull();
    const enemy = ready.armies.find((a) => a.realmId === 'ironvale');
    if (!enemy) throw new Error('Fixture must leave a surviving enemy army');
    enemy.provinceId = 'p11';
    enemy.moved = false;
    ready.realms.find((r) => r.id === 'ironvale')!.actions = 3;
    const attacked = issue(
      ready,
      f.scenario,
      { type: 'MoveArmy', armyId: enemy.id, destination: 'p10' },
      'ironvale',
    );
    expect(attacked.provinces.find((p) => p.id === 'p10')!.investitureReadyTurn).toBeUndefined();
    expect(
      validateCommand(attacked, f.scenario, 'crownmere', {
        type: 'InvestProvince',
        provinceId: 'p10',
      })?.code,
    ).toBe('PREREQUISITE');
  });
  it('requires castle neutralization, degrades besieged forts one level, and never transfers a third-party fort', () => {
    const f = invaded();
    const fort = f.state.fortifications!.find((f) => f.provinceId === 'p10');
    if (!fort) throw new Error('Fixture needs castle');
    fort.realmId = 'verdant';
    fort.level = 15;
    f.state.provinces.find((p) => p.id === 'p10')!.fort = 0;
    f.state = issue(f.state, f.scenario, {
      type: 'ChangeTaxPolicy',
      provinceId: 'p9',
      tax: 'light',
    });
    expect(f.state.provinces.find((p) => p.id === 'p10')!.contested).toBe(true);
    expect(
      validateCommand(f.state, f.scenario, 'crownmere', {
        type: 'InvestProvince',
        provinceId: 'p10',
      })?.detail,
    ).toMatch(/Neutralize/);
    f.state.fortifications!.find((f) => f.id === fort.id)!.level = 2;
    const state = nextSeason(f.state, f.scenario);
    expect(state.fortifications!.find((f) => f.id === fort.id)).toMatchObject({
      realmId: 'verdant',
      level: 1,
    });
    const invested = issue(state, f.scenario, {
      type: 'InvestProvince',
      provinceId: 'p10',
      regencyBid: 9,
    });
    expect(invested.fortifications!.find((f) => f.id === fort.id)!.realmId).toBe('verdant');
  });
  it('limits pillaging to once per season, reduces level/loyalty/holdings while retaining every holding ID and owner', () => {
    const f = invaded();
    const state = issue(f.state, f.scenario, { type: 'PillageProvince', provinceId: 'p10' });
    expect(state.provinces.find((p) => p.id === 'p10')!.level).toBe(
      f.state.provinces.find((p) => p.id === 'p10')!.level - 1,
    );
    expect(state.holdings.map((h) => [h.id, h.realmId])).toEqual(
      f.state.holdings.map((h) => [h.id, h.realmId]),
    );
    expect(
      validateCommand(state, f.scenario, 'crownmere', {
        type: 'PillageProvince',
        provinceId: 'p10',
      })?.code,
    ).toBe('PREREQUISITE');
    validateStateReferences(state, f.scenario);
  });
  it('upgrades legacy v1 saves explicitly without losing original entities or inventing readiness', () => {
    const f = invaded();
    delete f.state.warDeclarations;
    const fort = f.state.fortifications!.find((f) => f.provinceId === 'p10')!;
    fort.realmId = 'crownmere'; // old engine captured castles during occupation
    const loaded = deserializeCampaign(serializeCampaign(f.state), f.scenario);
    expect(loaded.log.at(-1)?.code).toBe('save.warfare-upgraded');
    expect(loaded.holdings).toEqual(f.state.holdings);
    expect(loaded.fortifications).toEqual(f.state.fortifications);
    expect(loaded.provinces.find((p) => p.id === 'p10')!.fort).toBe(0);
    expect(loaded.provinces.find((p) => p.id === 'p10')!.investitureReadyTurn).toBeUndefined();
  });
});
it.skipIf(!existsSync('reference/extracted/anuire/anuire.research.json'))(
  'preserves the complete private Anuire template and advances one season with valid AI',
  async () => {
    const scenario = await loadAnuireScenario(
      validateAnuireResearch(
        JSON.parse(readFileSync('reference/extracted/anuire/anuire.research.json', 'utf8')),
      ),
    );
    const initial = createCampaign(scenario, 'anuire-realm-27');
    expect(initial.provinces).toHaveLength(206);
    expect(initial.realms).toHaveLength(51);
    const state = issue(initial, scenario, { type: 'EndTurn' });
    validateStateReferences(state, scenario);
    expect(deserializeCampaign(serializeCampaign(state), scenario)).toEqual(state);
  },
  15000,
);
