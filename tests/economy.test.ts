import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  createCampaign,
  applyCommand,
  forecast,
  expectedDice,
  taxDice,
  holdingDice,
  domainMaintenance,
  settlePCEconomy,
  validateCommand,
  inspectTradeRoute,
  serializeCampaign,
  deserializeCampaign,
  validateStateReferences,
  replay,
  portIncome,
  type Campaign,
  type Scenario,
  type Command,
} from '../packages/core';
import { developmentScenario } from './fixtures/scenario';
import { decodeEconomicRecords } from '../packages/import-tools/economy';
import { loadAnuireScenario } from '../packages/world-data/anuire-scenario';
import { inspectPortIncome } from '../packages/import-tools/port-income';

function fixture() {
  const scenario = structuredClone(developmentScenario);
  scenario.policy!.domainActions = 'pc';
  scenario.policy!.survival = 'domain-assets';
  scenario.policy!.conquest = 'occupation';
  scenario.victory = { provinces: 99, turns: 80 };
  const state = createCampaign(scenario, 'crownmere', 1997, 'CLASSIC');
  for (const r of state.realms) {
    r.treasury = 500;
    r.regency = 500;
    r.court = 0;
  }
  for (const r of state.realms) if (r.id !== state.playerRealm) r.actions = 0;
  const [a, b] = state.provinces;
  a!.level = 3;
  b!.level = 5;
  a!.owner = b!.owner = 'ironvale';
  a!.loyalty = b!.loyalty = 3;
  scenario.provinces.find((p) => p.id === a!.id)!.terrain = 'plains';
  scenario.provinces.find((p) => p.id === b!.id)!.terrain = 'forest';
  scenario.provinces.find((p) => p.id === a!.id)!.movement = [{ to: b!.id, code: 9 }];
  scenario.provinces.find((p) => p.id === b!.id)!.movement = [{ to: a!.id, code: 8 }];
  state.treaties = [{ a: 'crownmere', b: 'ironvale', kind: 'alliance', opinion: 30, since: 1 }];
  state.warDeclarations = [];
  state.holdings = [
    { id: 'trade-guild', provinceId: a!.id, realmId: 'crownmere', type: 'guild', level: 2 },
    { id: 'independent-temple', provinceId: b!.id, realmId: 'verdant', type: 'temple', level: 4 },
  ];
  return { scenario, state, a: a!, b: b! };
}
function issue(state: Campaign, scenario: Scenario, cmd: Command) {
  const result = applyCommand(state, scenario, state.playerRealm, cmd);
  if (!result.ok) throw Error(`${result.error.code}: ${result.error.detail}`);
  return result.state;
}

describe('M1B-3 economy and trade', () => {
  it('pays full seaport and exact half river-port income, sharing forecasts and disruption rules', () => {
    const { state, scenario, a, b } = fixture();
    state.ports = [
      {
        id: 'test-seaport',
        sourceId: 'test-seaport-source',
        provinceId: a.id,
        realmId: 'crownmere',
        kind: 'seaport',
        incomeRule: 'stock-zero',
      },
      {
        id: 'test-river-port',
        sourceId: 'test-river-source',
        provinceId: b.id,
        realmId: 'crownmere',
        kind: 'river-port',
        incomeRule: 'province-level',
      },
    ];
    const snapshot = JSON.stringify(state);
    expect(portIncome(state, state.ports[0]!)).toBe(3);
    expect(portIncome(state, state.ports[1]!)).toBe(2.5);
    expect(forecast(state, scenario, 'crownmere').trade).toBe(5.5);
    expect(JSON.stringify(state)).toBe(snapshot);
    a.occupiedBy = 'verdant';
    expect(forecast(state, scenario, 'crownmere').trade).toBe(2.5);
    b.contested = true;
    expect(forecast(state, scenario, 'crownmere').trade).toBe(0);
    a.occupiedBy = null;
    b.contested = false;
    a.level = 0;
    b.level = 1;
    expect(forecast(state, scenario, 'crownmere').trade).toBe(0.5);
    // Trade RP remains whole and is rounded only after combining all receipts.
    scenario.realms.find((r) => r.id === 'crownmere')!.regent.class = 'rogue';
    for (const p of state.provinces) p.owner = 'ironvale';
    state.holdings = [];
    a.level = 3;
    state.ports[0]!.kind = 'river-port';
    expect(forecast(state, scenario, 'crownmere').trade).toBe(2);
    expect(forecast(state, scenario, 'crownmere').regency).toBe(2);
  });
  it('preserves half GB through seasonal settlement, save/load and deterministic replay', () => {
    const { state, scenario, b } = fixture();
    for (const r of state.realms) if (r.id !== state.playerRealm) r.controller = 'passive';
    state.ports = [
      {
        id: 'test-river-port',
        sourceId: 'test-river-source',
        provinceId: b.id,
        realmId: state.playerRealm,
        kind: 'river-port',
        incomeRule: 'half-province-level',
      },
    ];
    const next = issue(state, scenario, { type: 'EndTurn' });
    const report = next.reports.find((r) => r.realmId === state.playerRealm)!;
    expect(report.trade).toBe(2.5);
    expect(report.closing! % 1).toBe(0.5);
    expect(report.closing! - report.opening!).toBe(report.net);
    expect(next.realms.every((r) => Number.isInteger(r.regency))).toBe(true);
    expect(deserializeCampaign(serializeCampaign(next), scenario)).toEqual(next);
    expect(replay(scenario, state, next.history)).toEqual(next);
  });
  it('transfers fractional available tribute exactly and persists fractional costs and unpaid balances', () => {
    const { state, scenario, a } = fixture();
    for (const r of state.realms) r.treasury = 0;
    for (const p of state.provinces) {
      p.loyalty = 0;
      p.fort = 0;
    }
    state.holdings = [];
    state.armies = [];
    state.ports = [
      {
        id: 'test-river-port',
        sourceId: 'test-river-source',
        provinceId: a.id,
        realmId: 'crownmere',
        kind: 'river-port',
        incomeRule: 'half-province-level',
      },
    ];
    state.tributes = [{ id: 'tribute-1', payer: 'crownmere', recipient: 'verdant', amount: 2 }];
    state.nextId = 2;
    settlePCEconomy(state, scenario);
    expect(state.reports.find((r) => r.realmId === 'crownmere')!.tributeOut).toBe(1.5);
    const received = state.reports.find((r) => r.realmId === 'verdant')!;
    expect(received.tributeIn).toBe(1.5);
    expect(received.administration).toBe(1);
    expect(received.closing).toBe(0.5);
    expect(state.reports.reduce((sum, r) => sum + r.tributeIn! - r.tributeOut!, 0)).toBe(0);
    expect(deserializeCampaign(serializeCampaign(state), scenario)).toEqual(state);
    const partial = fixture();
    for (const r of partial.state.realms) r.treasury = 0.5;
    for (const p of partial.state.provinces) {
      p.loyalty = 0;
      p.fort = 0;
    }
    partial.state.holdings = [];
    partial.state.armies = [];
    settlePCEconomy(partial.state, partial.scenario);
    const partialReport = partial.state.reports.find((r) => r.realmId === 'ironvale')!;
    expect(partialReport.administration).toBe(0.5);
    expect(partialReport.unpaid! % 1).toBe(0.5);
    expect(deserializeCampaign(serializeCampaign(partial.state), partial.scenario)).toEqual(
      partial.state,
    );
  });
  it('uses clamped dice expectations, the provincial holding table and maintenance brackets', () => {
    expect(expectedDice(taxDice(1, 'light'))).toBeCloseTo(1 / 3);
    expect(expectedDice(taxDice(9, 'severe'))).toBe(11);
    expect(expectedDice(holdingDice(3, 2))).toBe(2);
    expect(expectedDice(holdingDice(7, 6))).toBe(7);
    expect([2, 3, 7, 31, 51, 76, 102].map(domainMaintenance)).toEqual([0, 1, 2, 7, 20, 30, 34]);
  });
  it('keeps independent holding income and redistributes claims without creating gold; forecast is pure', () => {
    const { state, scenario, a } = fixture();
    state.holdings.push({
      id: 'claim-law',
      provinceId: a.id,
      realmId: 'verdant',
      type: 'law',
      level: 3,
    });
    const before = JSON.stringify(state),
      normal = forecast(state, scenario, 'crownmere');
    expect(normal.holdings).toBe(2);
    expect(forecast(state, scenario, 'verdant').holdings).toBe(3.5);
    expect(JSON.stringify(state)).toBe(before);
    state.realms.find((r) => r.id === 'verdant')!.lawClaims = true;
    const reports = state.realms.map((r) => forecast(state, scenario, r.id));
    expect(reports.reduce((n, r) => n + (r.lawClaims ?? 0), 0)).toBeCloseTo(0);
    expect(reports.find((r) => r.realmId === 'verdant')!.lawClaims).toBeGreaterThan(0);
    expect(forecast(state, scenario, 'crownmere').holdings).toBe(normal.holdings);
  });
  it('creates a road route using the action scheduler, pays costs, replays and preserves it in saves', () => {
    const { state, scenario, b } = fixture();
    for (const r of state.realms) if (r.id !== state.playerRealm) r.controller = 'passive';
    const cmd: Command = {
      type: 'CreateTradeRoute',
      guildId: 'trade-guild',
      destination: b.id,
      regencyBid: 100,
    };
    const next = issue(state, scenario, cmd);
    expect(next.tradeRoutes).toHaveLength(1);
    expect(next.realms[0]!.treasury).toBe(499);
    expect(next.realms[0]!.regency).toBe(399);
    expect(next.domainTurn!.round).toBe(2);
    expect(forecast(next, scenario, 'crownmere').trade).toBe(4);
    expect(validateCommand(next, scenario, 'crownmere', cmd)?.detail).toMatch(/already/);
    expect(deserializeCampaign(serializeCampaign(next), scenario)).toEqual(next);
    expect(replay(scenario, state, next.history)).toEqual(next);
  });
  it('rejects missing roads, river-only connections, same terrain and exceeded endpoint limits', () => {
    const { state, scenario, a, b } = fixture();
    const cmd: Command = { type: 'CreateTradeRoute', guildId: 'trade-guild', destination: b.id };
    expect(validateCommand(state, scenario, 'crownmere', cmd)).toBeNull();
    scenario.provinces.find((p) => p.id === a.id)!.movement![0]!.code = 7;
    expect(validateCommand(state, scenario, 'crownmere', cmd)?.detail).toMatch(
      /No continuous road/,
    );
    scenario.provinces.find((p) => p.id === a.id)!.movement![0]!.code = 9;
    scenario.provinces.find((p) => p.id === b.id)!.terrain = 'plains';
    expect(validateCommand(state, scenario, 'crownmere', cmd)?.detail).toMatch(/different terrain/);
    scenario.provinces.find((p) => p.id === b.id)!.terrain = 'forest';
    state.tradeRoutes.push({
      id: 'other-route',
      realmId: 'crownmere',
      guildId: 'trade-guild',
      from: a.id,
      to: state.provinces[2]!.id,
      status: 'inactive',
    });
    expect(validateCommand(state, scenario, 'crownmere', cmd)?.detail).toMatch(/limit reached/);
  });
  it('suspends occupation/contested guild trade, follows guild ownership and destroys routes with their guild', () => {
    const { state, scenario, a, b } = fixture();
    const route = {
      id: 'route-1',
      realmId: 'crownmere',
      guildId: 'trade-guild',
      from: a.id,
      to: b.id,
    };
    state.tradeRoutes.push(route);
    expect(inspectTradeRoute(state, scenario, route).income).toBe(4);
    a.occupiedBy = 'verdant';
    expect(inspectTradeRoute(state, scenario, route).income).toBe(0);
    a.occupiedBy = null;
    a.owner = 'verdant';
    expect(inspectTradeRoute(state, scenario, route).realmId).toBe('crownmere');
    state.holdings[0]!.contested = true;
    expect(inspectTradeRoute(state, scenario, route).status).toBe('inactive');
    state.holdings[0]!.contested = false;
    state.holdings[0]!.realmId = 'ironvale';
    expect(inspectTradeRoute(state, scenario, route).realmId).toBe('ironvale');
    state.holdings[0]!.destroyed = true;
    state.holdings[0]!.level = 0;
    expect(inspectTradeRoute(state, scenario, route).status).toBe('destroyed');
  });
  it('collects occupied taxes once, charges the surcharge and reproduces exact actual ledgers', () => {
    const { state, scenario, a } = fixture();
    a.occupiedBy = 'crownmere';
    expect(forecast(state, scenario, 'crownmere').occupation).toBe(1);
    const duplicate = structuredClone(state),
      before = new Map(state.realms.map((r) => [r.id, r.treasury]));
    settlePCEconomy(state, scenario);
    settlePCEconomy(duplicate, scenario);
    expect(state).toEqual(duplicate);
    for (const report of state.reports) {
      expect(report.opening).toBe(before.get(report.realmId));
      expect(report.closing! - report.opening!).toBe(report.net);
      expect(
        report.taxes +
          report.holdings +
          report.trade +
          (report.lawClaims ?? 0) +
          (report.tributeIn ?? 0) -
          (report.tributeOut ?? 0) -
          report.maintenance -
          report.military,
      ).toBe(report.net);
    }
    expect(state.reports.find((r) => r.realmId === 'crownmere')!.occupation).toBe(1);
  });
  it('conserves gifts and tribute, accounts for diplomacy fees and never credits unpaid tribute', () => {
    const { state, scenario } = fixture();
    state.realms[0]!.court = 1;
    const gift = issue(state, scenario, { type: 'TransferGold', target: 'verdant', amount: 10 });
    expect(gift.realms.reduce((n, r) => n + r.treasury, 0)).toBe(
      state.realms.reduce((n, r) => n + r.treasury, 0) - 1,
    );
    expect(gift.log.find((e) => e.code === 'economy.action-paid')!.data.gold).toBe(1);
    for (const r of gift.realms) {
      r.controller = undefined;
      r.treasury = 0;
    }
    gift.tributes = [{ id: 'tribute-2', payer: 'crownmere', recipient: 'verdant', amount: 999 }];
    gift.nextId = 3;
    const base = structuredClone(gift);
    base.tributes = [];
    settlePCEconomy(gift, scenario);
    settlePCEconomy(base, scenario);
    const paid = gift.reports.find((r) => r.realmId === 'crownmere')!.tributeOut!;
    expect(paid).toBeGreaterThanOrEqual(0);
    expect(paid).toBeLessThan(999);
    expect(gift.reports.find((r) => r.realmId === 'verdant')!.tributeIn).toBe(paid);
    expect(gift.reports.reduce((n, r) => n + (r.tributeIn ?? 0) - (r.tributeOut ?? 0), 0)).toBe(0);
    const legacy = JSON.parse(serializeCampaign(state));
    delete legacy.campaign.tradeRoutes;
    expect(deserializeCampaign(JSON.stringify(legacy), scenario).tradeRoutes).toEqual([]);
  });
  it('records RP payroll, unpaid fort decay and compulsory-cost insolvency without negative treasury', () => {
    const { state, scenario } = fixture();
    for (const r of state.realms) {
      r.treasury = 0;
      r.regency = 500;
    }
    for (const p of state.provinces) p.loyalty = 0;
    state.holdings = [];
    state.ports = [];
    state.tradeRoutes = [];
    const forts = state.provinces.reduce((n, p) => n + p.fort, 0);
    settlePCEconomy(state, scenario);
    expect(state.realms.every((r) => r.treasury >= 0)).toBe(true);
    expect(state.reports.some((r) => r.regencyUpkeep! > 0)).toBe(true);
    expect(state.provinces.reduce((n, p) => n + p.fort, 0)).toBeLessThan(forts);
    expect(state.realms.some((r) => r.bankrupt)).toBe(true);
  });
  it.skipIf(!existsSync('reference/extracted/disc/RLMSTART.DAT'))(
    'recovers and validates 19 ports, 51 courts and empty initial routes/tribute from the original bytes',
    async () => {
      const raw = JSON.parse(
        readFileSync('reference/extracted/anuire/anuire.research.json', 'utf8'),
      );
      const sidecar = JSON.parse(
        readFileSync('reference/extracted/anuire/economy.research.json', 'utf8'),
      );
      const records = decodeEconomicRecords(readFileSync('reference/extracted/disc/RLMSTART.DAT'));
      expect(records.ports).toHaveLength(19);
      expect(records.courts).toHaveLength(51);
      expect(records.tributes).toEqual([]);
      expect(records.guildRoutes.every((r) => !r.route1 && !r.route2 && !r.route3)).toBe(true);
      const scenario = await loadAnuireScenario(raw, sidecar),
        old = await loadAnuireScenario(raw);
      expect(scenario.fingerprint).toBe(old.fingerprint);
      const state = createCampaign(scenario, 'anuire-realm-27');
      expect(state.ports).toHaveLength(19);
      expect(state.provinces).toHaveLength(206);
      expect(state.ports!.filter((p) => p.incomeRule === 'province-level')).toHaveLength(11);
      expect(state.ports!.filter((p) => p.incomeRule === 'half-province-level')).toHaveLength(8);
      const jogh = state.ports!.find((p) => p.provinceId === 'anuire-province-124')!;
      expect(jogh).toMatchObject({ provinceId: 'anuire-province-124', realmId: 'anuire-realm-17' });
      const before = forecast(state, scenario, jogh.realmId).trade;
      const withoutPort = structuredClone(state);
      withoutPort.ports = withoutPort.ports!.filter((p) => p.id !== jogh.id);
      expect(forecast(withoutPort, scenario, jogh.realmId).trade).toBe(before - 3);
      const oldSave = structuredClone(state);
      oldSave.ports!.find((p) => p.id === jogh.id)!.incomeRule = 'unresolved';
      const river = oldSave.ports!.find((p) => p.kind === 'river-port')!;
      river.incomeRule = 'province-level';
      const upgraded = deserializeCampaign(serializeCampaign(oldSave), scenario);
      expect(upgraded.ports!.find((p) => p.id === jogh.id)!.incomeRule).toBe('province-level');
      expect(upgraded.ports!.find((p) => p.id === river.id)!.incomeRule).toBe(
        'half-province-level',
      );
      oldSave.ports!.find((p) => p.id === jogh.id)!.incomeRule = 'stock-zero';
      expect(
        deserializeCampaign(serializeCampaign(oldSave), scenario).ports!.find(
          (p) => p.id === jogh.id,
        )!.incomeRule,
      ).toBe('province-level');
      expect(upgraded.realms).toEqual(oldSave.realms);
      expect(state.realms).toHaveLength(51);
      expect(state.holdings).toHaveLength(766);
      validateStateReferences(state, scenario);
    },
  );
  it.skipIf(!existsSync('reference/extracted/disc/WINBR.EXE'))(
    'finds the original executable port-income branch without running it, and rejects altered evidence',
    () => {
      const bytes = readFileSync('reference/extracted/disc/WINBR.EXE');
      const evidence = inspectPortIncome(bytes);
      expect(inspectPortIncome(bytes.subarray(0, 1_600_000))).toEqual(evidence);
      expect(evidence).toMatchObject({
        selectorFileOffset: 0xa6aeb,
        selectorAddress: 0x4b66eb,
        acceptedIconCodes: [94, 96],
        excludedPortIconCodes: [95],
        acceptedPortContribution: 'province-level',
        excludedPortContribution: 0,
        levelField: { bitOffset: 7, width: 4 },
      });
      const altered = Uint8Array.from(bytes);
      altered[evidence.selectorFileOffset + 7] = 95;
      expect(() => inspectPortIncome(altered)).toThrow(/Unsupported\/ambiguous/);
      expect(() => inspectPortIncome(new Uint8Array(8))).toThrow();
    },
  );
});
