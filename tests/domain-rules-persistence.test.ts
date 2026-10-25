import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  createCampaign,
  createBirthright15Foundation,
  serializeCampaign,
  deserializeCampaign,
  domainRulesOf,
  LEGACY_DOMAIN_RULES,
  BIRTHRIGHT15_NOT_ACTIVE,
  applyCommand,
  commandCost,
  collectPCEconomy,
  finalizePCEconomy,
  economicForecast,
  planNextAI,
  validateStateReferences,
  goldFromGB,
  goldFromGBRatio,
  goldUnits,
  regencyPoints,
  goldFromLegacyGB,
  type Birthright15Campaign,
  type Campaign,
  type DomainOverlays,
  type Scenario,
} from '../packages/core';
import { developmentScenario } from './fixtures/scenario';
import { loadAnuireScenario } from '../packages/world-data/anuire-scenario';

const load15 = { domainRules: 'birthright-1.5' } as const;
const overlays: DomainOverlays = {
  characters: { version: 'conversion-test-1', fingerprint: 'a'.repeat(64) },
  handlers: { version: 'handlers-test-1', fingerprint: 'b'.repeat(64) },
};
function report(realmId: string) {
  return {
    realmId,
    turn: 1,
    taxes: goldFromGBRatio(1n, 3n),
    holdings: goldFromGBRatio(2n, 3n),
    trade: goldFromGB('0.5'),
    maintenance: goldFromGB('0.1'),
    military: goldFromGB('0.25'),
    regency: regencyPoints('9007199254740993'),
    net: goldFromGBRatio(-1n, 3n),
    opening: goldFromGB('9007199254740993.1'),
    regencyTributeIn: regencyPoints(10n ** 100n),
  };
}

describe('versioned campaign quantity persistence', () => {
  it('identifies legacy saves without rules metadata and preserves their existing values and behavior', () => {
    const state = createCampaign(developmentScenario, 'crownmere');
    state.realms[0]!.treasury = 142.5;
    state.realms[0]!.regency = 70000;
    const reportResult = applyCommand(state, developmentScenario, state.playerRealm, {
      type: 'EndTurn',
    });
    expect(reportResult.ok).toBe(true);
    const settled = reportResult.state;
    expect(settled.reports.length).toBeGreaterThan(0);
    const raw = JSON.parse(serializeCampaign(settled));
    delete raw.campaign.domainRules;
    const oldText = JSON.stringify(raw);
    const loaded = deserializeCampaign(oldText, developmentScenario);
    expect(loaded.domainRules).toEqual(LEGACY_DOMAIN_RULES);
    expect(loaded.domainRules).not.toBe(
      deserializeCampaign(oldText, developmentScenario).domainRules,
    );
    for (const key of [
      'realms',
      'provinces',
      'holdings',
      'armies',
      'reports',
      'rng',
      'turn',
      'history',
      'nextId',
    ] as const)
      expect(loaded[key]).toEqual(settled[key]);
    expect(typeof loaded.realms[0]!.treasury).toBe('number');
    expect(loaded.seasonFlow).toBeUndefined();
    expect(serializeCampaign(loaded)).toBe(
      serializeCampaign(deserializeCampaign(serializeCampaign(settled), developmentScenario)),
    );
    const command = { type: 'HoldAction' } as const;
    expect(applyCommand(loaded, developmentScenario, loaded.playerRealm, command)).toEqual(
      applyCommand(
        deserializeCampaign(serializeCampaign(settled), developmentScenario),
        developmentScenario,
        loaded.playerRealm,
        command,
      ),
    );
    expect(() => deserializeCampaign(oldText, developmentScenario, load15)).toThrow(
      'not automatically converted',
    );
    expect(domainRulesOf({})).toEqual(LEGACY_DOMAIN_RULES);
  });

  it('initializes an explicit 1.5 foundation from already-adapted GB without changing source resources', () => {
    const scenario = structuredClone(developmentScenario);
    scenario.initial.domains = [{ id: 'crownmere', treasury: 15, regency: 56, court: 1 }];
    const original = structuredClone(scenario);
    const state = createBirthright15Foundation(scenario, 'crownmere', {
      ruleset: 'CLASSIC',
      selectionMode: 'UNRESTRICTED',
      difficulty: 'hard',
      overlays,
    });
    expect(state.domainRules).toEqual({ id: 'birthright-1.5', version: '1.1', overlays });
    expect(state.realms[0]!.treasury).toBe(1800n);
    expect(state.realms[0]!.regency).toBe(56n);
    expect(state.ruleset).toBe('CLASSIC');
    expect(state.selectionMode).toBe('UNRESTRICTED');
    expect(state.difficulty).toBe('hard');
    expect(state.settlementVersion).toBe(2);
    expect(scenario).toEqual(original);
    const raw = JSON.parse(serializeCampaign(state));
    expect(raw.version).toBe(2);
    expect(raw.campaign.realms[0].treasury).toBe('1800');
    expect(raw.campaign.realms[0].regency).toBe('56');
    expect(() =>
      deserializeCampaign(JSON.stringify(raw), scenario, { ...load15, expectedOverlays: overlays }),
    ).toThrow('overlay content');
    expect(() => deserializeCampaign(JSON.stringify(raw), scenario)).toThrow(
      'explicit 1.5 loading',
    );
    const absent = createBirthright15Foundation(scenario, 'crownmere');
    expect(absent.domainRules.overlays).toEqual({ characters: null, handlers: null });
    expect(deserializeCampaign(serializeCampaign(absent), scenario, load15)).toEqual(absent);
  });

  it('round-trips huge balances, reports and action cursors as canonical strings with unchanged RNG', () => {
    const scenario = structuredClone(developmentScenario);
    scenario.policy!.domainActions = 'pc';
    const state = createBirthright15Foundation(scenario, 'crownmere');
    state.realms[0]!.treasury = goldFromGB('9007199254740993.1');
    state.realms[0]!.regency = regencyPoints(10n ** 150n + 65536n);
    state.seasonFlow = { phase: 'actions', transitionId: 'test-2' };
    state.domainTurn = { round: 2, cursor: 1, order: state.realms.map((r) => r.id) };
    state.treaties[0]!.regencyPledge = regencyPoints(10n ** 70n);
    state.reports = [report(state.playerRealm)];
    const before = structuredClone(state);
    const text = serializeCampaign(state);
    const raw = JSON.parse(text);
    expect(raw.campaign.reports[0].net).toBe('-40');
    expect(raw.campaign.realms[0].regency).toBe((10n ** 150n + 65536n).toString());
    const restored = deserializeCampaign(text, scenario, load15);
    expect(restored).toEqual(before);
    expect(state).toEqual(before);
    expect(serializeCampaign(restored)).toBe(text);
    validateStateReferences(restored, scenario);
  });

  it('preserves a collected Maintenance ledger separately from closed reports', () => {
    const scenario = structuredClone(developmentScenario);
    scenario.policy!.domainActions = 'pc';
    const state = createBirthright15Foundation(scenario, 'crownmere');
    state.seasonFlow = {
      phase: 'maintenance',
      transitionId: 'test-collected',
      maintenance: { stage: 'collected', actualIncome: state.realms.map((r) => report(r.id)) },
    };
    const restored = deserializeCampaign(serializeCampaign(state), scenario, load15);
    expect(restored.seasonFlow).toEqual(state.seasonFlow);
    expect(restored.reports).toEqual([]);
    expect(restored.rng).toBe(state.rng);
  });

  it('rejects malformed quantities, unknown rules/save versions and mismatched fingerprints without fallback', () => {
    const state = createBirthright15Foundation(developmentScenario, 'crownmere', { overlays });
    const text = serializeCampaign(state);
    for (const value of [1, 9007199254740992, '01', '-1', '-0', '1.0', '1e20', ' 1', '+1']) {
      const raw = JSON.parse(text);
      raw.campaign.realms[0].regency = value;
      expect(() => deserializeCampaign(JSON.stringify(raw), developmentScenario, load15)).toThrow();
    }
    for (const invalidCase of [
      'save-version',
      'legacy-envelope',
      'rules-version',
      'missing-rules',
      'rules-id',
      'overlay-hash',
    ]) {
      const raw = JSON.parse(text);
      switch (invalidCase) {
        case 'save-version':
          raw.version = 3;
          break;
        case 'legacy-envelope':
          raw.version = 1;
          break;
        case 'rules-version':
          raw.campaign.domainRules.version = '1.2';
          break;
        case 'missing-rules':
          delete raw.campaign.domainRules;
          break;
        case 'rules-id':
          raw.campaign.domainRules.id = 'unknown';
          break;
        case 'overlay-hash':
          raw.campaign.domainRules.overlays.characters.fingerprint = 'not-a-hash';
          break;
      }
      expect(() => deserializeCampaign(JSON.stringify(raw), developmentScenario, load15)).toThrow();
    }
    expect(() =>
      deserializeCampaign(text, { ...developmentScenario, fingerprint: 'c'.repeat(64) }, load15),
    ).toThrow('dataset');
    expect(() =>
      deserializeCampaign(text, developmentScenario, {
        ...load15,
        expectedOverlays: {
          ...overlays,
          handlers: { version: 'wrong', fingerprint: 'b'.repeat(64) },
        },
      }),
    ).toThrow('overlay');
    expect(() =>
      deserializeCampaign(text, developmentScenario, {
        ...load15,
        expectedOverlays: {
          ...overlays,
          characters: { version: 'conversion-test-1', fingerprint: 'c'.repeat(64) },
        },
      }),
    ).toThrow('overlay');
    const negative = structuredClone(state);
    negative.realms[0]!.treasury = goldUnits(-1n);
    expect(() => serializeCampaign(negative)).toThrow();
  });

  it('blocks command, AI, forecast and settlement entry points before consuming funds, history or RNG', () => {
    const foundation = createBirthright15Foundation(developmentScenario, 'crownmere');
    // Deliberately bypass the compile-time legacy-only type to exercise the runtime boundary.
    const wrongPath = foundation as unknown as Campaign;
    const before = structuredClone(foundation);
    const result = applyCommand(wrongPath, developmentScenario, wrongPath.playerRealm, {
      type: 'HoldAction',
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toEqual({ code: 'PREREQUISITE', detail: BIRTHRIGHT15_NOT_ACTIVE });
    for (const action of [
      () => commandCost(wrongPath, developmentScenario, { type: 'HoldAction' }),
      () => planNextAI(wrongPath, developmentScenario, wrongPath.playerRealm),
      () => economicForecast(wrongPath, developmentScenario, wrongPath.playerRealm),
      () => collectPCEconomy(wrongPath, developmentScenario),
      () => finalizePCEconomy(wrongPath, developmentScenario, []),
    ])
      expect(action).toThrow(BIRTHRIGHT15_NOT_ACTIVE);
    expect(foundation).toEqual(before);
  });

  it.skipIf(!existsSync('reference/extracted/anuire/strategy.research.json'))(
    'retains the original Anuire identities and once-adapted balances without editing campaign inputs',
    async () => {
      const paths = ['anuire', 'economy', 'magic', 'strategy'].map(
        (n) => `reference/extracted/anuire/${n}.research.json`,
      );
      const bytes = paths.map((p) => readFileSync(p));
      const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
      const scenario: Scenario = await loadAnuireScenario(
        ...(bytes.map((b) => JSON.parse(b.toString('utf8'))) as [
          unknown,
          unknown,
          unknown,
          unknown,
        ]),
      );
      const legacy = createCampaign(scenario, 'anuire-realm-04', 1997, 'ENHANCED', 'UNRESTRICTED');
      const exact: Birthright15Campaign = createBirthright15Foundation(
        scenario,
        'anuire-realm-04',
        { selectionMode: 'UNRESTRICTED' },
      );
      expect(exact.realms).toHaveLength(51);
      for (const realm of exact.realms) {
        const old = legacy.realms.find((r) => r.id === realm.id)!;
        expect(realm.treasury).toBe(goldFromLegacyGB(old.treasury));
        expect(realm.regency).toBe(BigInt(old.regency));
      }
      expect(exact.realms.find((r) => r.id === exact.playerRealm)!.treasury).toBe(1800n);
      for (const key of [
        'provinces',
        'holdings',
        'armies',
        'fortifications',
        'ports',
        'leyLines',
        'rng',
        'history',
        'scenarioFingerprint',
      ] as const)
        expect(exact[key]).toEqual(legacy[key]);
      expect(deserializeCampaign(serializeCampaign(exact), scenario, load15)).toEqual(exact);
      expect(paths.map((p) => hash(readFileSync(p)))).toEqual(bytes.map(hash));
    },
  );
});
