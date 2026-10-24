import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  economicForecast,
  createCampaign,
  deserializeCampaign,
  serializeCampaign,
  type Campaign,
  type Command,
  type Scenario,
} from '../packages/core';
import { developmentScenario } from './fixtures/scenario';

function issue(state: Campaign, scenario: Scenario, command: Command) {
  const result = applyCommand(state, scenario, state.playerRealm, command);
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.detail}`);
  return result.state;
}

function campaign() {
  const scenario = structuredClone(developmentScenario);
  scenario.policy!.domainActions = 'pc';
  scenario.policy!.survival = 'domain-assets';
  scenario.policy!.conquest = 'occupation';
  scenario.victory = { provinces: 99, turns: 80 };
  const state = createCampaign(scenario, 'crownmere', 1997, 'CLASSIC');
  for (const realm of state.realms) {
    realm.treasury = 500;
    realm.regency = 500;
    realm.court = 0;
    if (realm.id !== state.playerRealm) realm.controller = 'passive';
  }
  return { state, scenario };
}

describe('Maintenance phase settlement', () => {
  it('collects actual income once, persists it, and finalizes once into action rounds', () => {
    const { state, scenario } = campaign();
    expect(state.seasonFlow?.phase).toBe('council');
    expect(state.domainTurn).toBeUndefined();

    const council = issue(state, scenario, { type: 'CompleteCouncil' });
    expect(council.seasonFlow).toMatchObject({
      phase: 'maintenance',
      maintenance: { stage: 'choices' },
    });
    const beforeForecast = JSON.stringify(council);
    economicForecast(council, scenario, council.playerRealm);
    expect(JSON.stringify(council)).toBe(beforeForecast);

    const province = council.provinces.find((item) => item.owner === council.playerRealm)!;
    const changedTax = issue(council, scenario, {
      type: 'ChangeTaxPolicy',
      provinceId: province.id,
      tax: 'moderate',
    });
    const collected = issue(changedTax, scenario, { type: 'CollectTaxes' });
    expect(collected.seasonFlow?.maintenance?.stage).toBe('collected');
    const savedCollected = deserializeCampaign(serializeCampaign(collected), scenario);
    expect(savedCollected).toEqual(collected);

    const rngAfterCollection = collected.rng;
    expect(
      applyCommand(collected, scenario, collected.playerRealm, { type: 'CollectTaxes' }).ok,
    ).toBe(false);
    expect(collected.rng).toBe(rngAfterCollection);
    expect(
      applyCommand(collected, scenario, collected.playerRealm, {
        type: 'ChangeTaxPolicy',
        provinceId: province.id,
        tax: 'severe',
      }).ok,
    ).toBe(false);

    const actions = issue(savedCollected, scenario, { type: 'SelectActions' });
    expect(actions.seasonFlow?.phase).toBe('actions');
    expect(actions.domainTurn?.round).toBe(1);
    expect(actions.domainTurn?.order[0]).toBe(actions.playerRealm);
    expect(actions.reports.filter((report) => report.realmId === actions.playerRealm)).toHaveLength(
      1,
    );
    expect(applyCommand(actions, scenario, actions.playerRealm, { type: 'SelectActions' }).ok).toBe(
      false,
    );
    const nextCouncil = issue(actions, scenario, { type: 'EndTurn' });
    expect(nextCouncil.turn).toBe(actions.turn + 1);
    expect(nextCouncil.seasonFlow?.phase).toBe('council');
    expect(nextCouncil.domainTurn).toBeUndefined();
    expect(
      nextCouncil.reports.filter((report) => report.realmId === actions.playerRealm),
    ).toHaveLength(1);
  });

  it('loads legacy saves into Actions without changing resources or advancing the turn', () => {
    const { state, scenario } = campaign();
    const atActions = issue(state, scenario, { type: 'CompleteCouncil' });
    const atMaintenance = issue(atActions, scenario, { type: 'CollectTaxes' });
    const started = issue(atMaintenance, scenario, { type: 'SelectActions' });
    const legacy = JSON.parse(serializeCampaign(started)) as {
      campaign: Record<string, unknown>;
    };
    delete legacy.campaign.seasonFlow;
    const restored = deserializeCampaign(JSON.stringify(legacy), scenario);
    expect(restored.seasonFlow?.phase).toBe('actions');
    expect(restored.turn).toBe(started.turn);
    expect(restored.rng).toBe(started.rng);
    expect(restored.realms.map((realm) => [realm.id, realm.treasury, realm.regency])).toEqual(
      started.realms.map((realm) => [realm.id, realm.treasury, realm.regency]),
    );
  });

  it('allows per-unit regency payroll to be revised after tax collection', () => {
    const { state, scenario } = campaign();
    const province = state.provinces.find((item) => item.owner === state.playerRealm)!;
    const unitDefinition = scenario.units.find((unit) => unit.upkeep > 0)!;
    state.armies.push({
      id: 'maintenance-test-army',
      realmId: state.playerRealm,
      provinceId: province.id,
      units: [{ id: 'maintenance-test-unit', type: unitDefinition.id, strength: 100 }],
      moved: false,
    });

    const council = issue(state, scenario, { type: 'CompleteCouncil' });
    const collected = issue(council, scenario, { type: 'CollectTaxes' });
    const paidWithRegency = issue(collected, scenario, {
      type: 'SetUnitPayroll',
      unitId: 'maintenance-test-unit',
      payroll: 'regency',
    });
    const settled = issue(paidWithRegency, scenario, { type: 'SelectActions' });
    const report = settled.reports.find((item) => item.realmId === settled.playerRealm)!;

    expect(report.regencyUpkeep).toBe(unitDefinition.upkeep * 5);
    expect(
      settled.armies.some((army) => army.units.some((unit) => unit.id === 'maintenance-test-unit')),
    ).toBe(true);
  });
});
