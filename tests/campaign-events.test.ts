import { describe, it, expect, vi, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { developmentScenario } from './fixtures/scenario';
import {
  applyCommand,
  createCampaign,
  DEFAULT_CAMPAIGN_EVENTS,
  deserializeCampaign,
  serializeCampaign,
  PC_UNITS,
  PC_REALM_SPELLS,
  validateStateReferences,
  npcTreasuryFallback,
  type Campaign,
  type Scenario,
} from '../packages/core';
import {
  applyOriginalEvent,
  strategicEvents,
  originalEventPool,
  processGorgonPlot,
  chooseGorgonAlly,
  specialReinforcements,
  treasuryIncidents,
  npcCampaignAdministration,
  synchronizeRebellions,
} from '../packages/core/strategic-events';
import { seasonalDiplomacy } from '../packages/core/diplomacy';
import { playerJournal } from '../packages/ui/strings';
import * as rng from '../packages/core/random';
import { loadAnuireScenario } from '../packages/world-data/anuire-scenario';

function fixture() {
  const s = structuredClone(developmentScenario);
  Object.assign(s.policy!, {
    domainActions: 'pc',
    strategicRules: 'pc-1997',
    survival: 'domain-assets',
    conquest: 'occupation',
  });
  s.units.push(...structuredClone(PC_UNITS));
  s.initial.treaties = [];
  s.initial.fortifications = [];
  s.spells = structuredClone(PC_REALM_SPELLS);
  s.initial.characters = [];
  for (const p of s.initial.provinces) p.fort = 0;
  s.victory = { metric: 'empire-points', target: 400, turns: 80, provinces: 99 };
  s.realms.forEach((r, i) => {
    r.controller = 'ai';
    r.domainType = 'territorial';
    r.original = { index: i + 1 };
  });
  const names = [
    ["Gorgon's Crown", 17],
    ['Markazor', 19],
    ['Mur-Kilad', 24],
    ['Rhuobhe', 26],
    ['Spiderfell', 29],
    ['Five Peaks', 15],
    ['Monsters', 23],
  ] as const;
  for (const [name, index] of names) {
    const d = structuredClone(s.realms[0]!);
    d.id = `special-${index}`;
    d.name = name;
    d.regent.id = `regent-${index}`;
    d.original = { index };
    if (index === 23) {
      d.specialBehavior = 'monsters';
      d.survival = 'persistent';
    }
    s.realms.push(d);
  }
  for (const a of s.initial.armies) for (const u of a.units) u.type = 'pc-unit-1';
  for (const name of [
    'Abattoir',
    ...Array.from({ length: 15 }, (_, i) => `Crown ${i}`),
    'Zaptig',
    'Gorge',
    ...Array.from({ length: 5 }, (_, i) => `Peaks ${i}`),
    'Torain',
    'Spiderfell',
    'Rhuobhe',
    'Sideath',
  ]) {
    const p = structuredClone(s.provinces[0]!),
      q = structuredClone(s.initial.provinces[0]!);
    p.id = `event-province-${s.provinces.length}`;
    p.name = name;
    p.adjacent = [];
    q.id = p.id;
    q.owner =
      name === 'Spiderfell' ? 'special-29' : name === 'Rhuobhe' ? 'special-26' : 'special-17';
    q.fort = 0;
    s.provinces.push(p);
    s.initial.provinces.push(q);
  }
  s.provinces.forEach((p, i) => (p.original = { index: i + 1 }));
  s.regents = s.realms.map((r) => r.regent);
  const state = createCampaign(s, 'crownmere', 1997);
  state.turn = 2;
  return { s, state };
}
const all = (enabled: boolean) =>
  Object.fromEntries(
    Object.keys(DEFAULT_CAMPAIGN_EVENTS).map((key) => [key, enabled]),
  ) as Campaign['eventOptions'];
const realm = (state: Campaign, index: number) =>
  state.realms.find((r) => r.id === `special-${index}`)!;
afterEach(() => vi.restoreAllMocks());

describe('original standard events', () => {
  it.each(Array.from({ length: 18 }, (_, i) => i))(
    'dispatches native ID %i and persists its identity',
    (id) => {
      const { s, state } = fixture();
      applyOriginalEvent(state, s, id, 'p0');
      expect(state.eventHistory.at(-1)).toMatchObject({
        eventId: id,
        key: `original.event-${id}`,
        outcome: 'applied',
      });
      if (id <= 3) expect(state.log.filter((e) => e.code.startsWith('event.'))).toHaveLength(0);
      else if (id <= 8) expect(state.effects.at(-1)!.expiresTurn).toBe(5);
      else if (id <= 16)
        expect(state.armies.find((a) => a.realmId === 'special-23')!.units.at(-1)!.type).toBe(
          `pc-unit-${[20, 22, 24, 26, 27, 12, 10, 14][id - 9]}`,
        );
      else expect(state.provinces.some((p) => p.loyalty === 0)).toBe(true);
      expect(deserializeCampaign(serializeCampaign(state), s).eventHistory).toEqual(
        state.eventHistory,
      );
    },
  );
  it('scales all economic grants once and uses the Gorgon gate for all three recipients', () => {
    const { s, state } = fixture();
    state.turn = 4;
    for (const r of state.realms) r.treasury = 0;
    realm(state, 19).controller = 'player';
    applyOriginalEvent(state, s, 0, 'p0');
    expect([17, 19, 24].map((i) => realm(state, i).treasury)).toEqual([180, 110, 58]);
    expect([17, 19, 24].map((i) => realm(state, i).surplusIncome)).toEqual([100, 50, 30]);
    applyOriginalEvent(state, s, 1, 'p0');
    expect([17, 19, 24].map((i) => realm(state, i).treasury)).toEqual([280, 160, 88]);
    realm(state, 17).controller = 'player';
    applyOriginalEvent(state, s, 0, 'p0');
    expect(realm(state, 19).treasury).toBe(160);
    for (const [id, index] of [
      [2, 26],
      [3, 29],
    ]) {
      applyOriginalEvent(state, s, id!, 'p0');
      expect(realm(state, index!).treasury).toBe(200);
      realm(state, index!).controller = 'player';
      applyOriginalEvent(state, s, id!, 'p0');
      expect(realm(state, index!).treasury).toBe(200);
    }
  });
  it('preserves Bless and Blight together, refreshes counters and swaps ward/dispel', () => {
    const { s, state } = fixture();
    for (const id of [4, 5, 4, 6]) applyOriginalEvent(state, s, id, 'p0');
    expect(state.effects.map((e) => e.kind)).toEqual(['blight', 'bless-land', 'warding']);
    expect(state.effects.at(-1)!.realmId).toBe('special-23');
    applyOriginalEvent(state, s, 8, 'p0');
    expect(state.effects.some((e) => e.kind === 'warding')).toBe(false);
    expect(state.effects.at(-1)!.resistance).toBeGreaterThanOrEqual(0);
    expect(state.effects.at(-1)!.resistance).toBeLessThan(20);
    applyOriginalEvent(state, s, 6, 'p0');
    expect(state.effects.some((e) => e.kind === 'antimagic')).toBe(false);
  });
  it('routes units by geography even after conquest and falls back after regional realm elimination', () => {
    const { s, state } = fixture();
    const p = s.provinces.find((p) => p.name === 'Abattoir')!;
    state.provinces.find((q) => q.id === p.id)!.owner = state.playerRealm;
    applyOriginalEvent(state, s, 9, p.id);
    expect(state.armies.at(-1)!.realmId).toBe('special-17');
    realm(state, 17).eliminated = true;
    applyOriginalEvent(state, s, 10, p.id);
    expect(state.armies.at(-1)!.realmId).toBe('special-23');
    for (const [name, index] of [
      ['Gorge', 15],
      ['Spiderfell', 29],
      ['Rhuobhe', 26],
    ] as const) {
      applyOriginalEvent(state, s, 12, s.provinces.find((p) => p.name === name)!.id);
      expect(state.armies.at(-1)!.realmId).toBe(`special-${index}`);
    }
  });
  it('stops at the record limit without reroll or RNG and ignores missing unit templates', () => {
    const { s, state } = fixture();
    state.characters = [];
    state.armies = [
      {
        id: 'full',
        realmId: state.playerRealm,
        provinceId: 'p0',
        moved: false,
        units: Array.from({ length: 999 }, (_, i) => ({
          id: `u-${i}`,
          type: 'pc-unit-1',
          strength: 100,
        })),
      },
    ];
    const before = state.rng;
    applyOriginalEvent(state, s, 12, 'p0');
    expect(state.armies.flatMap((a) => a.units)).toHaveLength(999);
    expect(state.eventHistory.at(-1)!.outcome).toBe('failed');
    expect(state.rng).toBe(before);
    state.armies = [];
    s.units = s.units.filter((u) => u.id !== 'pc-unit-26');
    applyOriginalEvent(state, s, 12, 'p0');
    expect(state.armies).toHaveLength(0);
  });
  it('rebellion uses the initial loyalty bound, strictly lower positive targets and stable native ties', () => {
    const { s, state } = fixture();
    const own = state.provinces.filter((p) => p.owner === state.playerRealm);
    own.forEach((p) => {
      p.loyalty = 3;
      p.contested = false;
    });
    own[0]!.loyalty = 0;
    applyOriginalEvent(state, s, 17, own[0]!.id);
    expect(own[1]!.loyalty).toBe(3);
    own[0]!.loyalty = 3;
    own[1]!.loyalty = 1;
    own[2]!.loyalty = 1;
    applyOriginalEvent(state, s, 17, own[0]!.id);
    expect(own[1]!.loyalty).toBe(0);
    expect(own[2]!.loyalty).toBe(1);
    expect(own[1]!.contested).toBe(false);
    state.eventOptions.randomRebellions = false;
    synchronizeRebellions(state);
    expect(own[1]!.contested).toBe(true);
  });
  it('keeps AI reports out of the player journal and economic aid only in diagnostics', () => {
    const { s, state } = fixture();
    const ai = state.provinces.find((p) => p.owner !== state.playerRealm)!;
    for (const id of [0, 4, 8, 12, 17]) applyOriginalEvent(state, s, id, ai.id);
    expect(playerJournal(state).filter((e) => e.code.startsWith('event.'))).toHaveLength(0);
    applyOriginalEvent(state, s, 12, 'p0');
    expect(playerJournal(state).at(-1)!.data.eventId).toBe(12);
  });
});

describe('scheduler and configuration', () => {
  it.each(['easy', 'medium', 'hard'] as const)(
    'uses %s difficulty independently of victory points',
    (difficulty) => {
      const { state } = fixture();
      state.difficulty = difficulty;
      for (const target of [300, 400, 500] as const) {
        state.victoryTarget = target;
        for (let date = 2; date <= 4; date++) {
          state.turn = date;
          expect(originalEventPool(state)).toBe(
            date < { easy: 4, medium: 3, hard: 2 }[difficulty] ? 9 : 18,
          );
        }
      }
    },
  );
  it('first completed season is eligible, is idempotent, and old saves never backfill', () => {
    const { s, state } = fixture();
    state.turn = 1;
    strategicEvents(state, s);
    expect(state.eventHistory).toHaveLength(0);
    state.turn = 2;
    strategicEvents(state, s);
    expect(state.eventHistory.length).toBeGreaterThan(0);
    const once = structuredClone(state);
    strategicEvents(state, s);
    expect(state).toEqual(once);
    const raw = JSON.parse(serializeCampaign(state));
    delete raw.campaign.eventHistory;
    delete raw.campaign.lastCampaignEventTurn;
    const old = deserializeCampaign(JSON.stringify(raw), s);
    const copy = structuredClone(old);
    strategicEvents(old, s);
    expect(old).toEqual(copy);
  });
  it.each([3, 4, 5, 6, 7])('keeps %i attempts and duplicate outcomes without retry', (count) => {
    const { s, state } = fixture();
    const spy = vi
      .spyOn(rng, 'randomInt')
      .mockImplementation((_s, min, max) => (min === 3 && max === 7 ? count : 0));
    strategicEvents(state, s);
    expect(state.eventHistory.filter((e) => e.eventId === 0)).toHaveLength(count);
    expect(spy).toHaveBeenCalledTimes(1 + count * 2);
  });
  it.each([0, 1, 2, 3])('handles a %i-province player realm in the final attempt', (owned) => {
    const { s, state } = fixture();
    state.provinces.forEach((p, i) => (p.owner = i < owned ? state.playerRealm : 'verdant'));
    vi.spyOn(rng, 'randomInt').mockImplementation((_s, min, max) =>
      min === 3 ? 3 : max === 8 ? 0 : max === 2 ? 2 : 0,
    );
    strategicEvents(state, s);
    expect(state.eventHistory.filter((e) => e.eventId === 0)).toHaveLength(owned < 3 ? 2 : 3);
  });
  it('preserves the native per-province decrement bias in the final player scan', () => {
    const { s, state } = fixture();
    state.provinces.forEach((p, i) => (p.owner = i >= 5 && i <= 7 ? state.playerRealm : 'verdant'));
    vi.spyOn(rng, 'randomInt').mockImplementation((_s, min, max) =>
      min === 3 ? 3 : max === 8 ? 4 : max === 2 ? 2 : 0,
    );
    strategicEvents(state, s);
    expect(state.eventHistory.filter((e) => e.eventId === 4).at(-1)!.provinceId).toBe(
      state.provinces[5]!.id,
    );
  });
  it.each([
    ['economicEvents', 0],
    ['magicalEvents', 8],
    ['militaryEvents', 12],
    ['randomRebellions', 17],
  ] as const)('skips disabled %s with original draws and no event-specific RNG', (key, id) => {
    const { s, state } = fixture();
    state.difficulty = 'hard';
    state.eventOptions = {
      ...DEFAULT_CAMPAIGN_EVENTS,
      gorgonPlot: false,
      specialReinforcements: false,
      [key]: false,
    };
    const spy = vi
      .spyOn(rng, 'randomInt')
      .mockImplementation((_s, min, max) => (min === 3 ? 3 : max === 17 ? id : 0));
    strategicEvents(state, s);
    expect(state.eventHistory.filter((e) => e.eventId === id)).toHaveLength(3);
    expect(
      state.eventHistory.filter((e) => e.eventId === id).every((e) => e.outcome === 'disabled'),
    ).toBe(true);
    expect(spy).toHaveBeenCalledTimes(7);
    expect(state.effects.every((e) => e.provinceId !== 'p0')).toBe(true);
  });
  it('defaults seven categories on and treasury incidents off, migrates without rescaling and saves mixed choices', () => {
    const { s, state } = fixture();
    const raw = JSON.parse(serializeCampaign(state));
    delete raw.campaign.eventOptions;
    delete raw.campaign.difficulty;
    delete raw.campaign.gorgonPlotStage;
    state.realms[0]!.treasury = 123.4;
    raw.campaign.realms[0].treasury = 123.4;
    const old = deserializeCampaign(JSON.stringify(raw), s);
    expect(old.eventOptions).toEqual(DEFAULT_CAMPAIGN_EVENTS);
    expect(old.eventOptions.treasuryIncidents).toBe(false);
    expect(old.difficulty).toBe('medium');
    expect(old.realms[0]!.treasury).toBe(123.4);
    old.eventOptions.magicalEvents = false;
    expect(deserializeCampaign(serializeCampaign(old), s)).toEqual(old);
  });
  it('changes saved campaign choices through a free validated command without advancing or clearing effects', () => {
    const { s, state } = fixture();
    applyOriginalEvent(state, s, 4, 'p0');
    state.gorgonPlotStage = 2;
    state.gorgonAllyRealmId = 'verdant';
    const result = applyCommand(state, s, state.playerRealm, {
      type: 'SetCampaignOptions',
      eventOptions: all(false),
      difficulty: 'hard',
    });
    expect(result.ok).toBe(true);
    expect(result.state.effects).toEqual(state.effects);
    expect(result.state.domainTurn).toEqual(state.domainTurn);
    expect(result.state.rng).toBe(state.rng);
    expect(result.state.gorgonPlotStage).toBe(2);
    expect(result.state.gorgonAllyRealmId).toBe('verdant');
    expect(
      applyCommand(state, s, 'verdant', { type: 'SetCampaignOptions', eventOptions: all(false) })
        .ok,
    ).toBe(false);
    expect(deserializeCampaign(serializeCampaign(result.state), s).eventOptions).toEqual(
      all(false),
    );
  });
  it('continues deterministically across save/load with mixed switches', () => {
    const { s, state } = fixture();
    state.eventOptions.magicalEvents = false;
    strategicEvents(state, s);
    const restored = deserializeCampaign(serializeCampaign(state), s);
    state.turn++;
    restored.turn++;
    strategicEvents(state, s);
    strategicEvents(restored, s);
    expect(restored).toEqual(state);
  });
});

describe('independent campaign systems', () => {
  it('pauses all plot RNG, support and progression, then resumes', () => {
    const { s, state } = fixture();
    state.turn = 16;
    state.gorgonPlotStage = 2;
    state.gorgonAllyRealmId = 'verdant';
    state.eventOptions.gorgonPlot = false;
    const copy = structuredClone(state);
    processGorgonPlot(state, s);
    expect(state).toEqual(copy);
    state.eventOptions.gorgonPlot = true;
    vi.spyOn(rng, 'randomInt').mockReturnValue(0);
    processGorgonPlot(state, s);
    expect(state.gorgonPlotStage).toBe(3);
  });
  it('honors plot dates, probability failures, stage separation, support and completed-stage guards', () => {
    const { s, state } = fixture();
    state.turn = 2;
    processGorgonPlot(state, s);
    expect(state.gorgonPlotStage).toBe(0);
    state.turn = 3;
    processGorgonPlot(state, s);
    expect(state.gorgonPlotStage).toBe(1);
    state.turn = 7;
    const before = state.rng;
    processGorgonPlot(state, s);
    expect(state.rng).toBe(before);
    state.turn = 8;
    const spy = vi.spyOn(rng, 'randomInt').mockReturnValue(1);
    processGorgonPlot(state, s);
    expect(state.gorgonPlotStage).toBe(1);
    spy.mockReturnValue(0);
    processGorgonPlot(state, s);
    expect(state.gorgonPlotStage).toBe(2);
    expect(state.gorgonAllyRealmId).toBe('verdant');
    const ally = state.realms.find((r) => r.id === 'verdant')!;
    const gold = ally.treasury,
      rp = ally.regency;
    state.turn = 15;
    processGorgonPlot(state, s);
    expect(ally.treasury).toBe(gold + 10);
    expect(ally.regency).toBe(rp + 50);
    state.turn = 16;
    processGorgonPlot(state, s);
    expect(state.gorgonPlotStage).toBe(3);
    expect(ally.treasury).toBe(gold + 10);
    const done = structuredClone(state);
    processGorgonPlot(state, s);
    expect(state).toEqual(done);
  });
  it('excludes Anuire, Chimaeron and all six special retail IDs from candidate selection', () => {
    const { s, state } = fixture();
    for (const d of s.realms) if (d.id !== 'crownmere') d.original = { index: 3 };
    expect(chooseGorgonAlly(state, s)).toBeUndefined();
    s.realms.find((r) => r.id === 'verdant')!.original = { index: 9 };
    expect(chooseGorgonAlly(state, s)).toBeUndefined();
  });
  it('transfers all supported assets, regent and existing lieutenants, freezes former realm and survives saves', () => {
    const { s, state } = fixture();
    state.turn = 16;
    state.gorgonPlotStage = 2;
    state.gorgonAllyRealmId = 'verdant';
    state.characters = [
      {
        id: 'former-regent',
        sourceId: 'former-regent',
        regentId: s.realms.find((r) => r.id === 'verdant')!.regent.id,
        realmId: 'verdant',
        provinceId: 'p1',
        typeCode: 0,
        role: 'regent',
      },
    ];
    state.fortifications = [
      { id: 'ally-fort', provinceId: 'p1', realmId: 'verdant', kind: 'castle', level: 1 },
    ];
    state.provinces.find((p) => p.id === 'p1')!.owner = 'verdant';
    state.provinces.find((p) => p.id === 'p1')!.fort = 1;
    const restored = deserializeCampaign(serializeCampaign(state), s);
    vi.spyOn(rng, 'randomInt').mockReturnValue(0);
    processGorgonPlot(restored, s);
    expect(restored.provinces.some((p) => p.owner === 'verdant')).toBe(false);
    expect(restored.armies.some((a) => a.realmId === 'verdant')).toBe(false);
    expect(restored.holdings.some((h) => h.realmId === 'verdant')).toBe(false);
    expect(restored.fortifications![0]!.realmId).toBe('special-17');
    expect(restored.characters![0]).toMatchObject({
      role: 'lieutenant',
      originRealm: 'verdant',
      realmId: 'special-17',
    });
    expect(restored.realms.find((r) => r.id === 'verdant')).toMatchObject({
      eliminated: true,
      controller: 'passive',
      lieutenantOf: 'special-17',
    });
    expect(realm(restored, 17).treasury).toBe(realm(state, 17).treasury + 40);
    validateStateReferences(restored, s);
    expect(deserializeCampaign(serializeCampaign(restored), s)).toEqual(restored);
  });
  it.each([undefined, 'special-17', 'verdant'])(
    'handles invalid/missing/eliminated allies safely (%s)',
    (ally) => {
      const { s, state } = fixture();
      state.turn = 16;
      state.gorgonPlotStage = 2;
      state.gorgonAllyRealmId = ally;
      if (ally === 'verdant') state.realms.find((r) => r.id === ally)!.eliminated = true;
      const ownership = state.provinces.map((p) => p.owner);
      vi.spyOn(rng, 'randomInt').mockReturnValue(0);
      processGorgonPlot(state, s);
      expect(state.gorgonPlotStage).toBe(3);
      expect(state.provinces.map((p) => p.owner)).toEqual(ownership);
    },
  );
  it.each(['easy', 'medium', 'hard'] as const)(
    'reconstructs inclusive %s reinforcement bounds independently of standard military events',
    (difficulty) => {
      const { s, state } = fixture();
      state.turn = 5;
      state.difficulty = difficulty;
      state.armies = [];
      state.characters = [];
      state.eventOptions.militaryEvents = false;
      const upper = vi.spyOn(rng, 'randomInt').mockImplementation((_s, _min, max) => max);
      specialReinforcements(state, s);
      const events = state.eventHistory.filter((e) => e.eventId !== undefined);
      const crown = events.filter((e) => regionName(e.provinceId!, s) === 'crown');
      expect(crown).toHaveLength({ easy: 10, medium: 15, hard: 20 }[difficulty]);
      expect(events.filter((e) => regionName(e.provinceId!, s) === 'peaks')).toHaveLength(
        { easy: 3, medium: 4, hard: 5 }[difficulty] * 7,
      );
      expect(
        events.filter((e) => s.provinces.find((p) => p.id === e.provinceId)?.name === 'Spiderfell'),
      ).toHaveLength(7);
      expect(
        events.filter((e) => s.provinces.find((p) => p.id === e.provinceId)?.name === 'Rhuobhe'),
      ).toHaveLength(7);
      upper.mockImplementation((_s, min) => min);
      state.eventHistory = [];
      specialReinforcements(state, s);
      expect(
        state.eventHistory.filter((e) => regionName(e.provinceId!, s) === 'peaks'),
      ).toHaveLength(5);
    },
  );
  it('respects reinforcement date/control gates, Gorgon deployment routing, and disabled RNG', () => {
    const { s, state } = fixture();
    state.turn = 3;
    specialReinforcements(state, s);
    expect(state.eventHistory).toHaveLength(0);
    state.turn = 4;
    state.characters = [
      {
        id: 'gorgon',
        sourceId: 'gorgon',
        realmId: 'special-17',
        regentId: s.realms.find((r) => r.id === 'special-17')!.regent.id,
        provinceId: 'p0',
        typeCode: 0,
      },
    ];
    vi.spyOn(rng, 'randomInt').mockImplementation((_s, min) => min);
    specialReinforcements(state, s);
    expect(state.eventHistory.filter((e) => e.provinceId === 'p0')).toHaveLength(6);
    expect(state.armies.some((a) => a.provinceId === 'p0' && a.realmId === 'special-23')).toBe(
      true,
    );
    state.eventOptions.specialReinforcements = false;
    const before = structuredClone(state);
    specialReinforcements(state, s);
    expect(state).toEqual(before);
  });
  it('random diplomacy respects grievances/exclusions while ordinary thresholds remain active when off', () => {
    const { s, state } = fixture();
    state.treaties = [
      {
        a: 'crownmere',
        b: 'verdant',
        kind: 'alliance',
        reactionA: 46,
        reactionB: 60,
        opinion: 0,
        since: 1,
        originalStatusA: 128,
      },
    ];
    vi.spyOn(rng, 'randomInt').mockImplementation((_s, min) => (min === 1 ? 5 : 1));
    seasonalDiplomacy(state, s);
    expect(state.treaties[0]!.reactionA).toBe(41);
    expect(state.treaties[0]!.kind).toBe('pact');
    state.eventOptions.diplomaticEvents = false;
    state.treaties[0]!.reactionA = 34;
    const before = state.rng;
    seasonalDiplomacy(state, s);
    expect(state.rng).toBe(before);
    expect(state.treaties[0]!.kind).toBe('peace');
  });
  it('treasury incidents are opt-in, correctly scaled, date-dependent and repeat until below 5,000 GB', () => {
    const { s, state } = fixture();
    state.realms[0]!.treasury = 6000;
    const before = state.rng;
    treasuryIncidents(state, s);
    expect(state.realms[0]!.treasury).toBe(6000);
    expect(state.rng).toBe(before);
    state.eventOptions.treasuryIncidents = true;
    vi.spyOn(rng, 'randomInt').mockImplementation((_s, min) => min);
    treasuryIncidents(state, s);
    expect(state.realms[0]!.treasury).toBe(4000);
    expect(state.eventHistory.filter((e) => e.key === 'treasury.theft')).toHaveLength(2);
    state.turn = 3;
    state.realms[0]!.treasury = 5000;
    treasuryIncidents(state, s);
    expect(state.eventHistory.at(-1)!.key).toBe('treasury.party');
    expect(state.realms[0]!.treasury).toBe(4000);
  });
  it('NPC administration remains enabled with all categories off', () => {
    const { s, state } = fixture();
    state.eventOptions = all(false);
    realm(state, 17).treasury = 0;
    npcCampaignAdministration(state, s);
    expect(realm(state, 17).treasury).toBeGreaterThanOrEqual(2);
    expect(realm(state, 17).surplusIncome).toBe(realm(state, 17).treasury);
  });
  it('keeps the adjusted-score comparison against a raw-score maximum in native order', () => {
    const { s, state } = fixture();
    s.realms.find((r) => r.id === 'ironvale')!.original = { index: 4 };
    const d = structuredClone(s.realms[1]!);
    d.id = 'third-ally';
    d.original = { index: 10 };
    s.realms.push(d);
    state.realms.push({ ...structuredClone(state.realms[1]!), id: d.id });
    state.provinces.forEach(
      (p, i) =>
        (p.owner =
          i === 0
            ? state.playerRealm
            : i <= 3
              ? 'verdant'
              : i <= 5
                ? 'ironvale'
                : i <= 8
                  ? d.id
                  : 'special-17'),
    );
    s.provinces.forEach((p) => (p.adjacent = []));
    s.provinces[0]!.adjacent = ['p4'];
    // 9 raw -> 6 raw/15 adjusted -> 9 raw: the last candidate wins, despite 15 being larger.
    expect(chooseGorgonAlly(state, s)).toBe('third-ally');
  });
  it('creates no reinforcement draws when all four special realms are player-controlled', () => {
    const { s, state } = fixture();
    state.turn = 10;
    for (const index of [15, 17, 26, 29]) realm(state, index).controller = 'player';
    const before = structuredClone(state);
    specialReinforcements(state, s);
    expect(state).toEqual(before);
  });
  it('applies ordinary-pair diplomatic increases and excludes special realm pairs', () => {
    const { s, state } = fixture();
    state.treaties = [
      {
        a: 'crownmere',
        b: 'verdant',
        kind: 'peace',
        opinion: 0,
        since: 1,
        reactionA: 50,
        reactionB: 50,
      },
    ];
    vi.spyOn(rng, 'randomInt').mockImplementation((_s, min) => min);
    seasonalDiplomacy(state, s);
    expect(state.treaties[0]!.reactionA).toBe(51);
    expect(state.treaties[0]!.reactionB).toBe(51);
    const special = state.treaties.find(
      (t) => [t.a, t.b].includes('special-17') && [t.a, t.b].includes(state.playerRealm),
    )!;
    expect(special.reactionA).toBe(50);
    expect(special.reactionB).toBe(50);
  });
  it('preserves vassal tribute protection and ends both tributes below the departure threshold', () => {
    const { s, state } = fixture();
    state.eventOptions.diplomaticEvents = false;
    state.treaties = [
      {
        a: 'crownmere',
        b: 'verdant',
        kind: 'vassal',
        vassal: 'verdant',
        opinion: 0,
        since: 1,
        reactionA: 80,
        reactionB: 45,
        regencyPledge: 5,
      },
    ];
    state.tributes = [{ id: 'pension', payer: 'crownmere', recipient: 'verdant', amount: 2 }];
    seasonalDiplomacy(state, s);
    expect(state.treaties[0]!.reactionB).toBe(71);
    expect(state.treaties[0]!.kind).toBe('vassal');
    state.treaties[0]!.reactionB = 39;
    seasonalDiplomacy(state, s);
    expect(state.treaties[0]!.kind).toBe('peace');
    expect(state.tributes).toHaveLength(0);
    expect(state.treaties[0]!.regencyPledge).toBeUndefined();
  });
  it('supports embezzlement and party help without running the diplomatic random generator', () => {
    const { s, state } = fixture();
    state.eventOptions.diplomaticEvents = false;
    state.eventOptions.treasuryIncidents = true;
    state.realms[0]!.treasury = 5000;
    const spy = vi.spyOn(rng, 'randomInt').mockImplementation((_s, _min, max) => max);
    treasuryIncidents(state, s);
    expect(state.realms[0]!.treasury).toBe(3000);
    expect(state.eventHistory.at(-1)!.key).toBe('treasury.embezzle');
    state.turn = 3;
    state.realms[0]!.treasury = 5000;
    spy.mockImplementation((_s, min, max) => (min === 0 && max === 99 ? 0 : max));
    treasuryIncidents(state, s);
    expect(state.realms[0]!.treasury).toBe(1000);
    expect(state.treaties.some((t) => (t.reactionA ?? 50) > 50)).toBe(true);
  });
  it('retains essential NPC reserve conversion and cash floor with all switches off', () => {
    const { s, state } = fixture();
    state.eventOptions = all(false);
    const npc = state.realms.find((r) => r.id === 'verdant')!;
    npc.treasury = 0;
    npc.regency = 75;
    npcTreasuryFallback(state, s, npc.id);
    expect(npc.treasury).toBe(1);
    expect(npc.regency).toBe(25);
    npc.treasury = 0;
    npc.regency = 0;
    npcTreasuryFallback(state, s, npc.id);
    expect(npc.treasury).toBeGreaterThanOrEqual(0.5);
    expect(npc.treasury).toBeLessThanOrEqual(0.9);
    const player = state.realms[0]!;
    player.treasury = 0;
    player.regency = 75;
    npcTreasuryFallback(state, s, player.id);
    expect(player.treasury).toBe(0);
    expect(player.regency).toBe(75);
  });
  it('acknowledges saved scenes once through a free command without reapplying stage effects', () => {
    const { s, state } = fixture();
    state.turn = 3;
    processGorgonPlot(state, s);
    const saved = deserializeCampaign(serializeCampaign(state), s);
    const result = applyCommand(saved, s, saved.playerRealm, {
      type: 'AcknowledgeCampaignScene',
      stage: 1,
    });
    expect(result.ok).toBe(true);
    expect(result.state.pendingGorgonScenes).toEqual([]);
    expect(result.state.gorgonPlotStage).toBe(1);
    expect(result.state.realms).toEqual(saved.realms);
    expect(result.state.rng).toBe(saved.rng);
    expect(
      applyCommand(result.state, s, state.playerRealm, {
        type: 'AcknowledgeCampaignScene',
        stage: 1,
      }).ok,
    ).toBe(false);
  });
  it.skipIf(!existsSync('reference/extracted/anuire/strategy.research.json'))(
    'runs the full private Anuire event phase and takeover with valid references and save continuation',
    async () => {
      const json = (name: string) =>
        JSON.parse(readFileSync(`reference/extracted/anuire/${name}.research.json`, 'utf8'));
      const s = await loadAnuireScenario(
        json('anuire'),
        json('economy'),
        json('magic'),
        json('strategy'),
      );
      const state = createCampaign(s, 'anuire-realm-27');
      state.turn = 16;
      state.gorgonPlotStage = 2;
      state.gorgonAllyRealmId = 'anuire-realm-06';
      vi.spyOn(rng, 'randomInt').mockImplementation((_s, min) => min);
      strategicEvents(state, s);
      npcCampaignAdministration(state, s);
      expect(state.gorgonPlotStage).toBe(3);
      expect(state.eventHistory.filter((e) => e.provinceId === 'anuire-province-148')).toHaveLength(
        5,
      );
      expect(
        state.armies.some(
          (a) => a.provinceId === 'anuire-province-148' && a.realmId === 'anuire-realm-15',
        ),
      ).toBe(true);
      validateStateReferences(state, s);
      expect(deserializeCampaign(serializeCampaign(state), s)).toEqual(state);
    },
  );
});
function regionName(id: string, s: Scenario) {
  const name = s.provinces.find((p) => p.id === id)!.name;
  return name === 'Abattoir' || name === 'Zaptig' || name.startsWith('Crown ')
    ? 'crown'
    : name === 'Gorge' || name === 'Torain' || name.startsWith('Peaks ')
      ? 'peaks'
      : name;
}
