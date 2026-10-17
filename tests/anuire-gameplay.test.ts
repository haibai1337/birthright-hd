import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { loadAnuireScenario } from '../packages/world-data/anuire-scenario';
import {
  validateAnuireResearch,
  type AnuireResearch,
} from '../packages/world-data/anuire-research';
import {
  applyCommand,
  campaignSchema,
  createCampaign,
  deserializeCampaign,
  planNextAI,
  realmSelectable,
  serializeCampaign,
  sourcePotential,
  validateStateReferences,
  type Scenario,
  type RulesetId,
} from '../packages/core';
const enabled = process.env.BIRTHRIGHT_PRIVATE_REFERENCE_TESTS === '1';
describe.skipIf(!enabled)('playable private original-template campaign', () => {
  let scenario: Scenario;
  let raw: AnuireResearch;
  const measurements: {
    realm: string;
    seed: number;
    seasonMs: number[];
    createMs: number;
    saveLoadMs: number;
    aiCommands: number;
    finalTurn: number;
    ruleset: RulesetId;
    saveBytes: number;
  }[] = [];
  beforeAll(async () => {
    raw = validateAnuireResearch(
      JSON.parse(readFileSync('reference/extracted/anuire/anuire.research.json', 'utf8')),
    );
    scenario = await loadAnuireScenario(raw);
  });
  afterAll(() => {
    if (scenario)
      writeFileSync(
        'reference/extracted/anuire/m1b-performance.json',
        JSON.stringify(
          {
            node: process.version,
            provinces: scenario.provinces.length,
            realms: scenario.realms.length,
            regents: scenario.regents?.length,
            holdings: scenario.initial.holdings.length,
            fortifications: scenario.initial.fortifications?.length,
            militaryUnits: scenario.initial.armies.flatMap((a) => a.units).length,
            characters: scenario.initial.characters?.length,
            eligibleRealms: scenario.realms.filter((r) => realmSelectable(scenario, r.id)).length,
            aiTerritorial:
              scenario.realms.filter((r) => r.controller === 'ai' && r.domainType === 'territorial')
                .length - 1,
            aiHolding: scenario.realms.filter(
              (r) => r.controller === 'ai' && r.domainType === 'holding',
            ).length,
            passive: scenario.realms.filter((r) => r.controller === 'passive').length,
            measurements,
          },
          null,
          2,
        ),
      );
  });
  const pid = (n: number) => `anuire-province-${String(n).padStart(3, '0')}`;
  it('imports every source record without losing identity, levels, geometry or deployment', () => {
    const before = JSON.stringify(raw),
      s = createCampaign(scenario, 'anuire-realm-27', 1997);
    expect(scenario.provinces).toHaveLength(206);
    expect(scenario.regents).toHaveLength(116);
    expect(s.realms).toHaveLength(51);
    expect(s.holdings).toHaveLength(766);
    expect(s.fortifications).toHaveLength(39);
    expect(s.armies.flatMap((a) => a.units)).toHaveLength(234);
    expect(s.characters).toHaveLength(63);
    for (const p of raw.campaign.provinces) {
      const def = scenario.provinces.find((d) => d.id === p.id)!,
        state = s.provinces.find((d) => d.id === p.id)!;
      expect(state.owner).toBe(`anuire-realm-${String(p.realmIndex).padStart(2, '0')}`);
      expect(state.level).toBe(p.level);
      expect(sourcePotential(scenario, p.id, p.level)).toBe(p.magic);
      expect(def.movement?.map((e) => e.code)).toEqual(p.borders.map((e) => e.movementCode));
      expect(def.rings).toEqual(raw.map.geometries.find((g) => g.provinceIndex === p.index)!.rings);
    }
    for (const f of raw.campaign.forts)
      expect(s.fortifications!.find((x) => x.sourceId === `anuire-place-${f.index}`)).toMatchObject(
        { level: f.level, provinceId: pid(f.provinceIndex!) },
      );
    for (const u of raw.campaign.troops) {
      const army = s.armies.find((a) => a.units.some((x) => x.sourceId === u.id)),
        character = s.characters!.find((c) => c.sourceId === u.id);
      expect(army?.provinceId ?? character?.provinceId).toBe(pid(u.effectiveProvinceIndex!));
    }
    for (const h of raw.campaign.holdings)
      expect(s.holdings.find((x) => x.sourceId === h.id)).toMatchObject({
        level: h.level,
        provinceId: pid(h.provinceIndex!),
        realmId: `anuire-realm-${String(h.realmIndex).padStart(2, '0')}`,
      });
    expect(s.realms.find((r) => r.id === 'anuire-realm-27')).toMatchObject({
      treasury: 150,
      regency: 56,
    });
    expect(scenario.realms.filter((r) => realmSelectable(scenario, r.id))).toHaveLength(18);
    expect(JSON.stringify(raw)).toBe(before);
    validateStateReferences(s, scenario);
  });
  function simulate(realm: string, seed: number, measure = false, ruleset: RulesetId = 'ENHANCED') {
    const started = performance.now();
    let state = createCampaign(scenario, realm, seed, ruleset);
    const createMs = performance.now() - started,
      seasonMs: number[] = [];
    for (let turn = 0; turn < 10; turn++) {
      expect(state.outcome).toBe('ongoing');
      for (let n = 0; n < 4; n++) {
        const plan = planNextAI(state, scenario, realm);
        if (!plan) break;
        const result = applyCommand(state, scenario, realm, plan.command);
        if (!result.ok) throw new Error(result.error.code);
        state = result.state;
      }
      const start = performance.now(),
        next = applyCommand(state, scenario, realm, { type: 'EndTurn' });
      seasonMs.push(performance.now() - start);
      if (!next.ok) throw new Error(next.error.code);
      state = next.state;
      campaignSchema.parse(state);
      validateStateReferences(state, scenario);
      expect(
        state.realms
          .filter((r) => scenario.realms.find((d) => d.id === r.id)?.domainType === 'holding')
          .every((r) => !r.eliminated),
      ).toBe(true);
    }
    const start = performance.now(),
      save = serializeCampaign(state),
      loaded = deserializeCampaign(save, scenario),
      saveLoadMs = performance.now() - start;
    expect(loaded).toEqual(state);
    expect(() => deserializeCampaign(save, { ...scenario, fingerprint: '0'.repeat(64) })).toThrow(
      'same private',
    );
    if (measure)
      measurements.push({
        realm,
        seed,
        seasonMs,
        createMs,
        saveLoadMs,
        aiCommands: state.history.filter((h) => h.source === 'ai').length,
        finalTurn: state.turn,
        ruleset,
        saveBytes: Buffer.byteLength(save),
      });
    return state;
  }
  it.each([
    { realm: 'anuire-realm-27', seed: 1997 },
    { realm: 'anuire-realm-27', seed: 2026 },
    { realm: 'anuire-realm-14', seed: 1997 },
    { realm: 'anuire-realm-14', seed: 2026 },
    { realm: 'anuire-realm-27', seed: 1997, ruleset: 'CLASSIC' as const },
  ])(
    'runs ten deterministic seasons for $realm seed $seed',
    ({ realm, seed, ruleset }) => {
      expect(simulate(realm, seed, true, ruleset)).toEqual(simulate(realm, seed, false, ruleset));
    },
    120000,
  );
  it('resolves a declared war as occupation without changing sovereignty', () => {
    let state = createCampaign(scenario, 'anuire-realm-27', 42);
    const pair = scenario.provinces
      .flatMap((p) => p.adjacent.map((to) => ({ from: p.id, to })))
      .find(
        (e) =>
          state.provinces.find((p) => p.id === e.from)?.owner === state.playerRealm &&
          state.provinces.find((p) => p.id === e.to)?.owner !== state.playerRealm &&
          !state.armies.some(
            (a) =>
              a.provinceId === e.to &&
              a.realmId !== state.provinces.find((p) => p.id === e.to)!.owner,
          ),
      )!;
    const owner = state.provinces.find((p) => p.id === pair.to)!.owner;
    state.armies.push({
      id: 'test-army',
      provinceId: pair.from,
      realmId: state.playerRealm,
      moved: false,
      units: [{ id: 'test-unit', type: 'infantry', strength: 100 }],
    });
    const war = applyCommand(state, scenario, state.playerRealm, {
      type: 'ProposeTreaty',
      target: owner,
      kind: 'war',
    });
    expect(war.ok).toBe(true);
    if (!war.ok) return;
    state = war.state;
    const moved = applyCommand(
      state,
      scenario,
      state.playerRealm,
      { type: 'MoveArmy', armyId: 'test-army', destination: pair.to },
      {
        resolve: () => ({
          attackerWins: true,
          attackerLoss: 0,
          defenderLoss: 100,
          attackPower: 100,
          defensePower: 1,
        }),
      },
    );
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.state.provinces.find((p) => p.id === pair.to)).toMatchObject({
      owner,
      occupiedBy: state.playerRealm,
      contested: true,
    });
    validateStateReferences(moved.state, scenario);
  });
});
