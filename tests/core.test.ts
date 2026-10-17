import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  campaignSchema,
  createCampaign,
  deserializeCampaign,
  domainPower,
  forecast,
  relation,
  replay,
  serializeCampaign,
  sourcePotential,
  validateScenario,
  validateStateReferences,
  type Campaign,
  type Command,
} from '../packages/core';
import { developmentScenario as scenario } from './fixtures/scenario';
function initial(seed = 1997, player = 'crownmere') {
  return createCampaign(scenario, player, seed);
}
function issue(s: Campaign, c: Command, actor = s.playerRealm): Campaign {
  const result = applyCommand(s, scenario, actor, c);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}
describe('validated deterministic commands', () => {
  it('starts a real, synthetic three-realm campaign', () => {
    const s = initial();
    expect(s.realms).toHaveLength(3);
    expect(s.provinces).toHaveLength(12);
    expect(scenario.provenance.status).toBe('TEMPORARY_PLACEHOLDER');
    expect(campaignSchema.safeParse(s).success).toBe(true);
  });
  it('rejects invalid seeds and unknown players', () => {
    expect(() => initial(-1)).toThrow();
    expect(() => initial(NaN)).toThrow();
    expect(() => initial(1997, 'missing')).toThrow();
  });
  it('develops, spends actual resources, and weakens magical potential without mutating input', () => {
    const s = initial();
    const next = issue(s, { type: 'DevelopProvince', provinceId: 'p4' });
    expect(next.provinces.find((p) => p.id === 'p4')?.level).toBe(5);
    expect(next.realms[0]?.treasury).toBe(18);
    expect(next.realms[0]?.regency).toBe(15);
    expect(next.realms[0]?.actions).toBe(2);
    expect(sourcePotential(scenario, 'p4', 5)).toBe(2);
    expect(s.provinces.find((p) => p.id === 'p4')?.level).toBe(4);
  });
  it('truncates source holdings deterministically after development', () => {
    let s = initial();
    s.holdings.find((h) => h.id === 'h-4-source')!.level = 3;
    s = issue(s, { type: 'DevelopProvince', provinceId: 'p4' });
    expect(s.holdings.find((h) => h.id === 'h-4-source')?.level).toBe(2);
    validateStateReferences(s, scenario);
  });
  it('rejects foreign, malformed, over-budget, and exhausted orders atomically', () => {
    const s = initial();
    for (const cmd of [
      { type: 'DevelopProvince', provinceId: 'p7' },
      { type: 'NoSuchCommand' },
      { type: 'RecruitUnit', provinceId: 'p4', unitType: 42 },
    ]) {
      const r = applyCommand(s, scenario, s.playerRealm, cmd);
      expect(r.ok).toBe(false);
      expect(r.state).toBe(s);
    }
    const poor = structuredClone(s);
    poor.realms[0]!.treasury = 0;
    expect(
      applyCommand(poor, scenario, s.playerRealm, { type: 'DevelopProvince', provinceId: 'p4' }),
    ).toMatchObject({ ok: false, error: { code: 'GOLD' } });
    poor.realms[0]!.actions = 0;
    expect(
      applyCommand(poor, scenario, s.playerRealm, {
        type: 'RecruitUnit',
        provinceId: 'p4',
        unitType: 'infantry',
      }),
    ).toMatchObject({ ok: false, error: { code: 'NO_ACTIONS' } });
  });
  it('recruits with verified PC costs, minimum level, and upkeep', () => {
    const s = issue(initial(), { type: 'RecruitUnit', provinceId: 'p4', unitType: 'cavalry' });
    expect(s.realms[0]?.treasury).toBe(20);
    expect(s.armies.find((a) => a.provinceId === 'p4')?.units[0]?.type).toBe('cavalry');
    expect(forecast(s, scenario, s.playerRealm).military).toBe(4);
    expect(
      applyCommand(initial(), scenario, 'crownmere', {
        type: 'RecruitUnit',
        provinceId: 'p0',
        unitType: 'cavalry',
      }),
    ).toMatchObject({ ok: false, error: { code: 'PREREQUISITE' } });
  });
  it('moves adjacent armies once each season and rejects invalid borders', () => {
    let s = initial();
    expect(
      applyCommand(s, scenario, s.playerRealm, {
        type: 'MoveArmy',
        armyId: 'initial-army-0',
        destination: 'p3',
      }),
    ).toMatchObject({ ok: false, error: { code: 'NOT_ADJACENT' } });
    s = issue(s, { type: 'MoveArmy', armyId: 'initial-army-0', destination: 'p8' });
    expect(s.armies[0]?.provinceId).toBe('p8');
    expect(
      applyCommand(s, scenario, s.playerRealm, {
        type: 'MoveArmy',
        armyId: 'initial-army-0',
        destination: 'p9',
      }),
    ).toMatchObject({ ok: false, error: { code: 'ALREADY_MOVED' } });
  });
  it('requires a treaty for foreign passage', () => {
    const s = initial();
    expect(
      applyCommand(s, scenario, s.playerRealm, {
        type: 'MoveArmy',
        armyId: 'initial-army-0',
        destination: 'p5',
      }),
    ).toMatchObject({ ok: false, error: { code: 'TREATY_REQUIRED' } });
    const ally = issue(s, { type: 'ProposeTreaty', target: 'verdant', kind: 'alliance' });
    const moved = issue(ally, { type: 'MoveArmy', armyId: 'initial-army-0', destination: 'p5' });
    expect(moved.provinces.find((p) => p.id === 'p5')?.owner).toBe('verdant');
    expect(moved.armies[0]?.provinceId).toBe('p5');
  });
  it('resolves a real battle with losses and changes province sovereignty', () => {
    let s = issue(initial(), { type: 'RecruitUnit', provinceId: 'p9', unitType: 'infantry' });
    s = issue(s, { type: 'MoveArmy', armyId: 'initial-army-0', destination: 'p10' });
    expect(s.provinces.find((p) => p.id === 'p10')?.owner).toBe('crownmere');
    expect(s.armies.find((a) => a.id === 'initial-army-2')).toBeUndefined();
    expect(s.armies[0]?.units.every((u) => u.strength < 100)).toBe(true);
    expect(s.log.some((e) => e.code === 'battle.won')).toBe(true);
    validateStateReferences(s, scenario);
  });
  it('resolves a failed assault without taking ownership', () => {
    const s = issue(initial(), { type: 'MoveArmy', armyId: 'initial-army-0', destination: 'p10' });
    expect(s.provinces.find((p) => p.id === 'p10')?.owner).toBe('ironvale');
    expect(s.armies.find((a) => a.id === 'initial-army-0')).toBeUndefined();
  });
  it('uses configured seasonal wars in Classic and persistent wars in Enhanced', () => {
    const classic = issue(createCampaign(scenario, 'crownmere', 1, 'CLASSIC'), { type: 'EndTurn' });
    expect(relation(classic, 'crownmere', 'ironvale')?.kind).toBe('peace');
    expect(relation(issue(initial(), { type: 'EndTurn' }), 'crownmere', 'ironvale')?.kind).toBe(
      'war',
    );
  });
  it('uses seeded taxes and bloodline-capped, class-specific regency', () => {
    const before = initial();
    expect(domainPower(before, scenario, 'crownmere')).toBe(19);
    const after = issue(before, { type: 'EndTurn' });
    const report = after.reports.find((r) => r.realmId === 'crownmere');
    expect(report?.taxes).toBeGreaterThanOrEqual(6);
    expect(report?.taxes).toBeLessThanOrEqual(17);
    expect(report?.regency).toBe(19);
    expect(after.realms[0]?.regency).toBe(39);
    expect(after.turn).toBe(2);
    expect(after.realms[0]?.actions).toBe(3);
    expect(after.history.filter((h) => h.source === 'ai').length).toBeGreaterThanOrEqual(2);
  });
  it('handles insolvency with disbanding and loyalty consequences', () => {
    const s = initial();
    s.realms[0]!.treasury = 0;
    for (const p of s.provinces.filter((p) => p.owner === s.playerRealm)) {
      p.tax = 'light';
      p.level = 1;
    }
    s.holdings = s.holdings.filter((h) => h.realmId !== s.playerRealm);
    s.armies[0]!.units.push(
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `debt-${i}`,
        type: 'cavalry',
        strength: 100,
      })),
    );
    const next = issue(s, { type: 'EndTurn' });
    expect(next.realms[0]?.treasury).toBeGreaterThanOrEqual(0);
    expect(
      next.log.some((e) => e.code === 'economy.shortfall' && e.realmId === s.playerRealm),
    ).toBe(true);
    expect(
      next.armies.filter((a) => a.realmId === s.playerRealm).flatMap((a) => a.units).length,
    ).toBeLessThan(12);
  });
  it('supports overlapping holdings and capacity checks', () => {
    let s = initial();
    s = issue(s, { type: 'ImproveHolding', holdingId: 'h-5-guild' });
    expect(s.holdings.find((h) => h.id === 'h-5-guild')?.level).toBe(2);
    s = issue(s, { type: 'ImproveHolding', holdingId: 'h-5-guild' });
    expect(
      applyCommand(s, scenario, s.playerRealm, { type: 'ImproveHolding', holdingId: 'h-5-guild' }),
    ).toMatchObject({ ok: false, error: { code: 'MAX_LEVEL' } });
  });
  it('gates the explicit test spell on class, source, and resources', () => {
    const s = initial(42, 'verdant');
    const cast = issue(s, { type: 'CastRealmSpell', provinceId: 'p1', spellId: 'ward' });
    expect(cast.effects).toHaveLength(1);
    expect(cast.realms.find((r) => r.id === 'verdant')?.regency).toBe(16);
    expect(
      applyCommand(initial(), scenario, 'crownmere', {
        type: 'CastRealmSpell',
        provinceId: 'p4',
        spellId: 'ward',
      }),
    ).toMatchObject({ ok: false, error: { code: 'PREREQUISITE' } });
  });
  it('gives a real choice for petitions and requires a response', () => {
    const s = initial();
    s.pendingEvents.push({ id: 'petition', realmId: 'crownmere', provinceId: 'p4', turn: 1 });
    expect(
      applyCommand(s, scenario, 'crownmere', { type: 'DevelopProvince', provinceId: 'p4' }),
    ).toMatchObject({ ok: false, error: { code: 'PENDING_EVENT' } });
    const relief = issue(s, { type: 'ResolveEvent', choice: 'relief' });
    expect(relief.pendingEvents).toHaveLength(0);
    expect(relief.realms[0]?.treasury).toBe(22);
    expect(relief.provinces.find((p) => p.id === 'p4')?.loyalty).toBe(4);
  });
  it('does not mutate an army through a replaceable battle adapter', () => {
    const s = initial();
    const snapshot = JSON.stringify(s);
    expect(() =>
      applyCommand(
        s,
        scenario,
        'crownmere',
        { type: 'MoveArmy', armyId: 'initial-army-0', destination: 'p10' },
        {
          resolve: () => ({
            attackerWins: true,
            attackerLoss: NaN,
            defenderLoss: 0,
            attackPower: 10,
            defensePower: 1,
          }),
        },
      ),
    ).toThrow('Invalid battle outcome');
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
describe('versioned persistence and external data', () => {
  it('round-trips the full campaign including RNG and history', () => {
    const s = issue(initial(), { type: 'EndTurn' });
    expect(deserializeCampaign(serializeCampaign(s), scenario)).toEqual(s);
  });
  it('replays player commands including deterministic AI turns', () => {
    const start = initial();
    let s = issue(start, { type: 'RecruitUnit', provinceId: 'p4', unitType: 'infantry' });
    s = issue(s, { type: 'EndTurn' });
    s = issue(s, { type: 'EndTurn' });
    expect(replay(scenario, start, s.history)).toEqual(s);
  });
  it('rejects incompatible, malformed, orphaned, and duplicate saves', () => {
    const save = JSON.parse(serializeCampaign(initial()));
    save.version = 2;
    expect(() => deserializeCampaign(JSON.stringify(save), scenario)).toThrow();
    save.version = 1;
    save.campaign.armies[0].provinceId = 'missing';
    expect(() => deserializeCampaign(JSON.stringify(save), scenario)).toThrow('Invalid army');
    const duplicate = initial();
    duplicate.provinces[1]!.id = 'p0';
    expect(() => deserializeCampaign(serializeCampaign(duplicate), scenario)).toThrow('Duplicate');
    expect(() => deserializeCampaign('{', scenario)).toThrow();
  });
  it('rejects non-finite and negative state resources', () => {
    const s = initial();
    s.realms[0]!.treasury = -1;
    expect(() => serializeCampaign(s)).toThrow();
    s.realms[0]!.treasury = NaN;
    expect(() => serializeCampaign(s)).toThrow();
  });
  it('rejects asymmetric external geography and overfilled holdings', () => {
    const asymmetric = structuredClone(scenario);
    asymmetric.provinces[0]!.adjacent = [];
    expect(() => validateScenario(asymmetric)).toThrow('Asymmetric');
    const s = initial();
    s.holdings[0]!.level = 9;
    expect(() => deserializeCampaign(serializeCampaign(s), scenario)).toThrow('Holding capacity');
  });
  it('needs no renderer, browser, or wall clock to simulate', () => {
    expect(typeof globalThis.document).toBe('undefined');
    expect(issue(initial(0), { type: 'EndTurn' }).turn).toBe(2);
  });
  it('detects defeat and territorial victory, then rejects further orders', () => {
    const winning = structuredClone(scenario);
    winning.victory.provinces = 5;
    let s = createCampaign(winning, 'crownmere', 1997);
    let r = applyCommand(s, winning, 'crownmere', {
      type: 'RecruitUnit',
      provinceId: 'p9',
      unitType: 'infantry',
    });
    if (!r.ok) throw new Error(r.error.code);
    s = r.state;
    r = applyCommand(s, winning, 'crownmere', {
      type: 'MoveArmy',
      armyId: 'initial-army-0',
      destination: 'p10',
    });
    expect(r.state.outcome).toBe('victory');
    expect(applyCommand(r.state, winning, 'crownmere', { type: 'EndTurn' })).toMatchObject({
      ok: false,
      error: { code: 'GAME_OVER' },
    });
    const losing = initial();
    for (const p of losing.provinces.filter((p) => p.owner === 'crownmere')) p.owner = 'ironvale';
    const defeat = issue(losing, { type: 'EndTurn' });
    expect(defeat.outcome).toBe('defeat');
    expect(defeat.realms[0]?.eliminated).toBe(true);
  });
  it('rejects unsafe IDs and duplicate treaty pairs in external state', () => {
    const invalid = structuredClone(scenario);
    invalid.realms[0]!.id = 'realm|pair';
    expect(() => validateScenario(invalid)).toThrow();
    const s = initial();
    s.treaties.push({ ...s.treaties[0]!, a: 'verdant', b: 'crownmere' });
    expect(() => deserializeCampaign(serializeCampaign(s), scenario)).toThrow('Duplicate treaty');
  });
});
