import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { developmentScenario } from './fixtures/scenario';
import { loadAnuireScenario } from '../packages/world-data/anuire-scenario';
import {
  characterClasses,
  createCampaign,
  deserializeCampaign,
  domainPower,
  forecast,
  isTrueWizard,
  realmRegentCandidates,
  realmSelectable,
  rulingRegent,
  serializeCampaign,
  validateScenario,
  validateStateReferences,
  PC_REALM_SPELLS,
} from '../packages/core';

function fixture() {
  const scenario = structuredClone(developmentScenario);
  scenario.policy!.domainActions = 'pc';
  scenario.spells.push(
    ...structuredClone(PC_REALM_SPELLS).filter(
      (spell) => !scenario.spells.some((existing) => existing.id === spell.id),
    ),
  );
  const realm = scenario.realms[0]!;
  const alternate = structuredClone(realm.regent);
  alternate.id = 'alternate-regent';
  alternate.name = 'Alternate ruler';
  alternate.class = 'wizard';
  alternate.classes = [{ type: 'wizard', level: 7 }];
  alternate.bloodline.strength = 17;
  alternate.realmSpells = ['alchemy'];
  scenario.regents = [...scenario.realms.map((r) => r.regent), alternate];
  realm.regentCandidates = [realm.regent.id, alternate.id];
  scenario.initial.characters = [realm.regent, alternate].map((regent, index) => ({
    id: `original-character-${index}`,
    sourceId: `source-character-${index}`,
    realmId: realm.id,
    regentId: regent.id,
    provinceId: scenario.initial.provinces[0]!.id,
    typeCode: index,
  }));
  return { scenario: validateScenario(scenario), realm, alternate };
}

describe('original new-game regent choice', () => {
  it('uses the alternate identity for bloodline, spells, class-based RP and deployments without changing the template', () => {
    const { scenario, realm, alternate } = fixture();
    const template = structuredClone(scenario);
    const baseline = createCampaign(scenario, realm.id, 1997, 'CLASSIC');
    const state = createCampaign(scenario, realm.id, 1997, 'CLASSIC', 'CLASSIC', 400, alternate.id);
    expect(rulingRegent(scenario, realm.id, state)).toEqual(alternate);
    expect(characterClasses(scenario, realm.id, state)).toEqual(alternate.classes);
    expect(isTrueWizard(scenario, realm.id, state)).toBe(true);
    expect(isTrueWizard(scenario, realm.id, baseline)).toBe(false);
    expect(state.realms.find((r) => r.id === realm.id)).toMatchObject({
      regentId: alternate.id,
      bloodlineStrength: 17,
      knownSpells: ['alchemy'],
      treasury: baseline.realms[0]!.treasury,
      regency: baseline.realms[0]!.regency,
    });
    expect(state.characters!.find((c) => c.regentId === alternate.id)?.role).toBe('regent');
    expect(state.characters!.find((c) => c.regentId === realm.regent.id)?.role).toBe('lieutenant');
    const identities = structuredClone(state.characters!);
    for (const identity of identities) delete identity.role;
    expect(identities).toEqual(scenario.initial.characters);
    const ownedLevels = state.provinces
      .filter((p) => p.owner === realm.id)
      .reduce((n, p) => n + p.level, 0);
    const sourceLevels = state.holdings
      .filter((h) => h.realmId === realm.id && h.type === 'source')
      .reduce((n, h) => n + h.level, 0);
    expect(domainPower(state, scenario, realm.id)).toBe(ownedLevels + sourceLevels);
    expect(forecast(state, scenario, realm.id).regency).toBe(
      Math.min(17, ownedLevels + sourceLevels),
    );
    for (const key of [
      'provinces',
      'holdings',
      'armies',
      'treaties',
      'tradeRoutes',
      'rng',
    ] as const)
      expect(state[key]).toEqual(baseline[key]);
    expect(scenario).toEqual(template);
    expect(deserializeCampaign(serializeCampaign(state), scenario)).toEqual(state);
    const missingDefaults = structuredClone(state);
    delete missingDefaults.realms[0]!.bloodlineStrength;
    delete missingDefaults.realms[0]!.knownSpells;
    expect(
      deserializeCampaign(serializeCampaign(missingDefaults), scenario).realms[0],
    ).toMatchObject({
      regentId: alternate.id,
      bloodlineStrength: 17,
      knownSpells: ['alchemy'],
    });
  });

  it('rejects a foreign candidate at creation and on loading a manipulated save', () => {
    const { scenario, realm, alternate } = fixture();
    expect(() =>
      createCampaign(
        scenario,
        realm.id,
        1997,
        'CLASSIC',
        'CLASSIC',
        400,
        scenario.realms[1]!.regent.id,
      ),
    ).toThrow(/candidate/);
    const state = createCampaign(scenario, realm.id, 1997, 'CLASSIC', 'CLASSIC', 400, alternate.id);
    state.realms[0]!.regentId = scenario.realms[1]!.regent.id;
    expect(() => deserializeCampaign(serializeCampaign(state), scenario)).toThrow(/ruling regent/);
  });

  it('preserves old saves with no selected identity or starting-role metadata', () => {
    const { scenario, realm } = fixture();
    const state = createCampaign(scenario, realm.id);
    delete state.realms[0]!.regentId;
    for (const character of state.characters!) delete character.role;
    state.realms[0]!.bloodlineStrength = 51;
    state.realms[0]!.knownSpells = ['alchemy'];
    const loaded = deserializeCampaign(serializeCampaign(state), scenario);
    expect(loaded).toEqual(state);
    expect(rulingRegent(scenario, realm.id, loaded)?.id).toBe(realm.regent.id);
  });

  it.skipIf(!existsSync('reference/extracted/anuire/strategy.research.json'))(
    'recovers the 36 original candidates and starts each without changing province or character identities',
    async () => {
      const json = (id: string) =>
        JSON.parse(readFileSync(`reference/extracted/anuire/${id}.research.json`, 'utf8'));
      const scenario = await loadAnuireScenario(
        json('anuire'),
        json('economy'),
        json('magic'),
        json('strategy'),
      );
      const playable = scenario.realms.filter((realm) => realmSelectable(scenario, realm.id));
      expect(playable).toHaveLength(18);
      expect(playable.flatMap((realm) => realmRegentCandidates(scenario, realm.id))).toHaveLength(
        36,
      );
      for (const realm of playable) {
        const candidates = realmRegentCandidates(scenario, realm.id);
        for (const candidate of candidates) {
          const state = createCampaign(
            scenario,
            realm.id,
            1997,
            'CLASSIC',
            'CLASSIC',
            400,
            candidate.id,
          );
          expect(rulingRegent(scenario, realm.id, state)?.id).toBe(candidate.id);
          expect(
            state.characters!.filter((c) => c.realmId === realm.id && c.role === 'regent'),
          ).toHaveLength(1);
          expect(
            state.characters!.filter((c) => c.realmId === realm.id && c.role === 'lieutenant'),
          ).toHaveLength(1);
          expect(state.provinces).toEqual(scenario.initial.provinces);
          expect(state.characters!.map((c) => c.id)).toEqual(
            scenario.initial.characters!.map((c) => c.id),
          );
          validateStateReferences(state, scenario);
        }
      }
      const caine = createCampaign(
        scenario,
        'anuire-realm-14',
        1997,
        'CLASSIC',
        'CLASSIC',
        400,
        'anuire-regent-028',
      );
      expect(rulingRegent(scenario, caine.playerRealm, caine)?.name).toBe('Caine');
      expect(isTrueWizard(scenario, caine.playerRealm, caine)).toBe(true);
    },
    30000,
  );
});
