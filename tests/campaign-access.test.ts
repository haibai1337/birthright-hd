import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  createCampaign,
  deserializeCampaign,
  diplomaticTargetAvailable,
  diplomacyProblem,
  realmSelectable,
  serializeCampaign,
  validateCommand,
  validateStateReferences,
  PC_UNITS,
} from '../packages/core';
import { developmentScenario } from './fixtures/scenario';
import { loadAnuireScenario } from '../packages/world-data/anuire-scenario';

function fixture() {
  const s = structuredClone(developmentScenario);
  Object.assign(s.policy!, {
    domainActions: 'pc',
    strategicRules: 'pc-1997',
    survival: 'domain-assets',
  });
  s.units.push(...structuredClone(PC_UNITS));
  s.initial.treaties = [];
  for (const a of s.initial.armies) for (const u of a.units) u.type = 'pc-unit-1';
  for (const [i, r] of s.realms.entries()) {
    r.controller = 'ai';
    r.domainType = 'territorial';
    r.regent.original = { identity: { alignment: i === 0 ? 1 : 3 } };
  }
  const state = createCampaign(s, s.realms[0]!.id);
  state.realms.forEach((r) => {
    r.treasury = 500;
    r.regency = 0;
    if (r.id !== state.playerRealm) r.actions = 0;
  });
  state.realms[0]!.regency = 100;
  state.realms[0]!.court = 0;
  state.treaties = [
    {
      a: state.playerRealm,
      b: 'verdant',
      kind: 'war',
      opinion: -100,
      since: 1,
      reactionA: 0,
      reactionB: 0,
    },
  ];
  return { s, state };
}

describe('independent campaign access options', () => {
  it('defaults to restricted diplomacy and preserves old saves without the new field', () => {
    const { s, state } = fixture();
    expect(state.selectionMode).toBe('CLASSIC');
    expect(state.unrestrictedDiplomacy).toBe(false);
    const old = JSON.parse(serializeCampaign(state));
    delete old.campaign.unrestrictedDiplomacy;
    expect(deserializeCampaign(JSON.stringify(old), s)).toEqual(state);
  });
  it('saves the two choices independently without consuming RNG, actions or event settings', () => {
    const { s, state } = fixture();
    const a = applyCommand(state, s, state.playerRealm, {
      type: 'SetCampaignOptions',
      selectionMode: 'UNRESTRICTED',
    });
    expect(a.ok).toBe(true);
    expect(a.state.unrestrictedDiplomacy).toBe(false);
    const b = applyCommand(a.state, s, state.playerRealm, {
      type: 'SetCampaignOptions',
      unrestrictedDiplomacy: true,
    });
    expect(b.ok).toBe(true);
    expect(b.state.selectionMode).toBe('UNRESTRICTED');
    expect(b.state.realms).toEqual(state.realms);
    expect(b.state.domainTurn).toEqual(state.domainTurn);
    expect(b.state.eventOptions).toEqual(state.eventOptions);
    expect(b.state.rng).toBe(state.rng);
    expect(deserializeCampaign(serializeCampaign(b.state), s)).toEqual(b.state);
    expect(
      applyCommand(state, s, 'verdant', { type: 'SetCampaignOptions', unrestrictedDiplomacy: true })
        .ok,
    ).toBe(false);
  });
  it('keeps technical and landed boundaries while unlocking original availability flags', () => {
    const { s } = fixture();
    const r = s.realms[0]!;
    r.originalPlayable = false;
    r.technicalPlayable = true;
    expect(realmSelectable(s, r.id, 'CLASSIC')).toBe(false);
    expect(realmSelectable(s, r.id, 'UNRESTRICTED')).toBe(true);
    r.domainType = 'holding';
    expect(realmSelectable(s, r.id, 'UNRESTRICTED')).toBe(false);
    r.domainType = 'territorial';
    r.technicalPlayable = false;
    expect(realmSelectable(s, r.id, 'UNRESTRICTED')).toBe(false);
  });
  it('removes audience/reaction/court gates for valid proposals but retains fees and success rolls', () => {
    const { s, state } = fixture();
    const cmd = {
      type: 'ProposeTreaty' as const,
      target: 'verdant',
      kind: 'pact' as const,
      regencyBid: 25,
      demandGold: 1,
    };
    expect(validateCommand(state, s, state.playerRealm, cmd)).not.toBeNull();
    state.unrestrictedDiplomacy = true;
    expect(validateCommand(state, s, state.playerRealm, cmd)).toBeNull();
    const result = applyCommand(state, s, state.playerRealm, cmd);
    expect(result.ok).toBe(true);
    expect(result.state.rng).not.toBe(state.rng);
    expect(result.state.realms[0]!.regency).toBe(74);
    expect(result.state.treaties[0]!.kind).toBe('pact');
    // Negative modified reactions can now win through RP, and must still fit the save schema.
    expect(result.state.treaties[0]!.reactionA).toBe(0);
    validateStateReferences(result.state, s);
    expect(deserializeCampaign(serializeCampaign(result.state), s)).toEqual(result.state);
    const off = applyCommand(result.state, s, state.playerRealm, {
      type: 'SetCampaignOptions',
      unrestrictedDiplomacy: false,
    });
    expect(off.state.treaties).toEqual(result.state.treaties);
    state.realms[0]!.treasury = 0;
    expect(validateCommand(state, s, state.playerRealm, cmd)).not.toBeNull();
  });
  it('allows both sides of special-controller talks only when opted in, without activating placeholders', () => {
    const { s, state } = fixture();
    state.realms[1]!.behavior = 'monsters';
    expect(diplomaticTargetAvailable(state, state.playerRealm, 'verdant')).toBe(false);
    state.unrestrictedDiplomacy = true;
    expect(diplomaticTargetAvailable(state, state.playerRealm, 'verdant')).toBe(true);
    expect(
      diplomacyProblem(state, s, state.playerRealm, {
        type: 'ProposeTreaty',
        target: 'verdant',
        kind: 'pact',
      }),
    ).toBeNull();
    state.realms[1]!.court = 0;
    expect(
      diplomacyProblem(state, s, 'verdant', {
        type: 'ProposeTreaty',
        target: state.playerRealm,
        kind: 'pact',
      }),
    ).toBeNull();
    state.realms[1]!.controller = 'passive';
    expect(diplomaticTargetAvailable(state, state.playerRealm, 'verdant')).toBe(false);
    state.realms[1]!.controller = 'ai';
    state.realms[1]!.eliminated = true;
    expect(diplomaticTargetAvailable(state, state.playerRealm, 'verdant')).toBe(false);
    expect(diplomaticTargetAvailable(state, state.playerRealm, state.playerRealm)).toBe(false);
  });
  it('retains proposal cooldowns, resource checks and circular-vassal safeguards', () => {
    const { s, state } = fixture();
    state.unrestrictedDiplomacy = true;
    state.treaties[0]!.lastProposalTurn = state.turn;
    expect(
      diplomacyProblem(state, s, state.playerRealm, {
        type: 'ProposeTreaty',
        target: 'verdant',
        kind: 'pact',
      }),
    ).toMatch(/already considered/);
    delete state.treaties[0]!.lastProposalTurn;
    state.treaties[0]!.kind = 'vassal';
    state.treaties[0]!.vassal = state.playerRealm;
    expect(
      diplomacyProblem(state, s, state.playerRealm, {
        type: 'ProposeTreaty',
        target: 'verdant',
        kind: 'vassal',
      }),
    ).toMatch(/cycle/);
  });
  it.skipIf(!existsSync('reference/extracted/anuire/strategy.research.json'))(
    'starts and saves every real landed Anuire realm, including the four requested factions',
    async () => {
      const json = (name: string) =>
        JSON.parse(readFileSync(`reference/extracted/anuire/${name}.research.json`, 'utf8'));
      const s = await loadAnuireScenario(
        json('anuire'),
        json('economy'),
        json('magic'),
        json('strategy'),
      );
      const flags = s.realms.map((r) => r.originalPlayable);
      expect(s.realms.filter((r) => realmSelectable(s, r.id, 'CLASSIC'))).toHaveLength(18);
      const unlocked = s.realms.filter((r) => realmSelectable(s, r.id, 'UNRESTRICTED'));
      expect(unlocked).toHaveLength(32);
      expect(unlocked.map((r) => r.id)).toEqual(
        expect.arrayContaining([
          'anuire-realm-03',
          'anuire-realm-17',
          'anuire-realm-24',
          'anuire-realm-32',
        ]),
      );
      for (const r of unlocked) {
        const state = createCampaign(s, r.id, 1997, 'CLASSIC', 'UNRESTRICTED');
        expect(state.unrestrictedDiplomacy).toBe(false);
        expect(state.realms.find((d) => d.id === r.id)!.controller).toBe('player');
        expect(state.provinces).toEqual(s.initial.provinces);
        validateStateReferences(state, s);
        expect(deserializeCampaign(serializeCampaign(state), s)).toEqual(state);
      }
      expect(s.realms.map((r) => r.originalPlayable)).toEqual(flags);
      expect(realmSelectable(s, 'anuire-realm-23', 'UNRESTRICTED')).toBe(false);
      expect(realmSelectable(s, 'anuire-realm-49', 'UNRESTRICTED')).toBe(false);
    },
    30000,
  );
});
