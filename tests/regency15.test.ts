import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  createBirthright15Foundation,
  createCampaign,
  applyCommand,
  initializeRegency15,
  applyRegency15,
  regencyCollectionQuote15,
  regencyCollectionQuotes15,
  regencyResources15,
  bloodlineGrowthQuote15,
  regencyReservationQuote15,
  sacrificeQuote15,
  alchemyResourceQuote15,
  regencyPayrollQuote15,
  economicForecast15,
  references35,
  rating35,
  character35,
  casting35,
  serializeCampaign,
  deserializeCampaign,
  regencyPoints as rp,
  goldUnits as gb,
  goldFromGB,
  goldFromGBRatio,
  rulingRegent,
  type Birthright15Campaign,
  type Scenario,
  type CharacterOverlays35,
  type RegencyRequest15,
  type RegencyAuthorization15,
  type PayrollSelection15,
  type Campaign,
} from '../packages/core';
import { loadAnuireScenario, buildAnuireCharacterOverlays35 } from '../packages/world-data';

describe('exact unbounded sacrifice arithmetic', () => {
  it('reprices every sacrificed point and rejects negative/excess quantities', () => {
    expect(sacrificeQuote15(rp(70n), rp(2n))).toMatchObject({ after: 68n, gain: 139n });
    expect(sacrificeQuote15(rp(70n), rp(0n)).gain).toBe(0n);
    expect(sacrificeQuote15(rp(70n), rp(70n)).gain).toBe(2485n);
    expect(() => sacrificeQuote15(rp(70n), rp(71n))).toThrow();
    expect(() => rp(-1n)).toThrow();
    const huge = rp(10n ** 100n + 1n);
    expect(sacrificeQuote15(huge, rp(2n)).gain).toBe(2n * huge - 1n);
  });
});

describe.skipIf(!existsSync('reference/extracted/anuire/strategy.research.json'))(
  'Increment 4 opt-in Regency operations',
  () => {
    let scenario: Scenario,
      bundle: CharacterOverlays35,
      seed: Birthright15Campaign,
      paths: string[],
      hashes: string[];
    let transaction = 0;
    const realm = 'anuire-realm-14'; // Kalien: original S30, province/Guild ratings 60%.
    beforeAll(async () => {
      paths = ['anuire', 'economy', 'magic', 'strategy'].map(
        (n) => `reference/extracted/anuire/${n}.research.json`,
      );
      paths.push('packages/world-data/anuire-characters15.json');
      hashes = paths.map((p) => createHash('sha256').update(readFileSync(p)).digest('hex'));
      const input = paths.slice(0, 4).map((p) => JSON.parse(readFileSync(p, 'utf8'))) as [
        unknown,
        unknown,
        unknown,
        unknown,
      ];
      scenario = await loadAnuireScenario(...input);
      bundle = buildAnuireCharacterOverlays35(scenario, input[0], input[2]);
      seed = createBirthright15Foundation(scenario, 'anuire-realm-04', {
        selectionMode: 'UNRESTRICTED',
        overlays: references35(bundle),
      });
    }, 120000);
    const auth = (s: Birthright15Campaign, id = realm): RegencyAuthorization15 => ({
      realmId: id,
      characterId: rulingRegent(scenario, id, s)!.id,
      mode: 'expert',
      kind: 'order',
      reference: 'focused-test-explicit-order',
    });
    const step = (
      s: Birthright15Campaign,
      request: RegencyRequest15,
      id = `test-rp-${++transaction}`,
    ) => applyRegency15(s, scenario, bundle, id, request);
    function fixture(ids = [realm], stock = 1000n, gold = 1000n) {
      const s = structuredClone(seed);
      for (const r of s.realms) {
        r.eliminated = !ids.includes(r.id);
        if (ids.includes(r.id)) {
          r.regency = rp(stock);
          r.treasury = goldFromGB(gold);
        }
      }
      return initializeRegency15(s, scenario);
    }
    function collect(s: Birthright15Campaign) {
      s = step(s, { kind: 'open' });
      for (const q of s.regency15!.state.boundary!.quotes)
        s = step(
          s,
          q.collectibleRP === null
            ? { kind: 'withhold', realmId: q.realmId, reason: 'unknown skills explicitly withheld' }
            : { kind: 'collect', realmId: q.realmId },
        );
      return s;
    }
    function season(s: Birthright15Campaign, grow = false) {
      s = collect(s);
      return step(s, { kind: 'close', growth: grow ? [auth(s)] : [] });
    }
    const nextSeason = (s: Birthright15Campaign) => ({ ...s, turn: s.turn + 1 });
    function reserve(
      s: Birthright15Campaign,
      amount: bigint,
      options: {
        purpose?: 'bid' | 'obligation' | 'pledge' | 'future-alchemy';
        id?: string;
        obligation?: string;
        target?: string;
        gold?: bigint;
        realmId?: string;
      } = {},
    ) {
      const id = options.id ?? `reserve-${++transaction}`;
      return {
        id,
        state: step(s, {
          kind: 'reserve',
          authorization: auth(s, options.realmId),
          reservation: {
            id,
            obligationId: options.obligation ?? `obligation-${id}`,
            purpose: options.purpose ?? 'obligation',
            rp: rp(amount),
            gold: gb(options.gold ?? 0n),
            targetRealmId: options.target ?? null,
          },
        }),
      };
    }
    it('uses the accepted overlays, all five skill formulas and every percentage bracket', () => {
      expect(references35(bundle).characters!.version).toBe('1.2.0');
      for (const [rating, percent] of [
        [5, 0],
        [6, 20],
        [7, 40],
        [8, 60],
        [9, 80],
        [10, 100],
        [13, 100],
      ]) {
        const s = structuredClone(character35(bundle.characters!, 'anuire-regent-027'));
        s.reconstruction!.levels = [
          {
            ...s.reconstruction!.levels[0]!,
            purchases: [{ skill: 'diplomacy', halfRanks: rating! * 2 }],
          },
        ];
        expect(rating35(s, 'province')!.percent).toBe(percent);
        s.reconstruction!.abilities.charisma = 99;
        s.reconstruction!.feats.push({
          id: 'skillFocus',
          target: 'diplomacy',
          level: 1,
          grant: 'general',
        });
        expect(rating35(s, 'province')!.percent).toBe(percent);
      }
      const s = structuredClone(character35(bundle.characters!, 'anuire-regent-027')),
        r = s.reconstruction!;
      const skills = [
        'appraise',
        'bluff',
        r.guildCraft,
        'diplomacy',
        'gatherInformation',
        'intimidate',
        r.guildProfession,
        'senseMotive',
      ];
      r.levels = [
        {
          ...r.levels[0]!,
          purchases: skills.map((skill, i) => ({ skill, halfRanks: i === 7 ? 7 : 8 })),
        },
      ];
      expect(rating35(s, 'guild')).toMatchObject({ raw: 7.875, bracket: 7, percent: 40 });
      r.levels[0]!.purchases = [
        { skill: 'diplomacy', halfRanks: 11 },
        { skill: 'warcraft', halfRanks: 2 },
        { skill: 'lead', halfRanks: 12 },
        { skill: 'knowledge:religion', halfRanks: 4 },
        { skill: 'knowledge:arcana', halfRanks: 11 },
        { skill: 'knowledge:nature', halfRanks: 2 },
      ];
      expect(rating35(s, 'province')!.raw).toBe(6.5);
      expect(rating35(s, 'law')!.raw).toBe(7);
      expect(rating35(s, 'temple')!.raw).toBe(8);
      expect(rating35(s, 'source')!.raw).toBe(6.5);
    });
    it('floors once across categories, preserves fragmentation and respects suppression/sovereignty', () => {
      let s = fixture();
      s = { ...s, regency15: undefined }; // Deliberate synthetic asset setup before explicit initialization.
      for (const p of s.provinces) p.level = 0;
      const p = s.provinces.find((p) => p.owner === realm)!;
      p.level = 1;
      s.holdings = [
        { id: 'rp-guild-a', realmId: realm, provinceId: p.id, type: 'guild', level: 1 },
      ];
      s = initializeRegency15(s, scenario);
      const q = regencyCollectionQuote15(s, scenario, realm, bundle);
      expect(q.knownWeightedHundredths).toBe(120n);
      expect(q.qualifiedRP).toBe(1n);
      const split = structuredClone(s);
      split.holdings = [...s.holdings, { ...s.holdings[0]!, id: 'rp-guild-b', level: 4 }];
      const combined = structuredClone(s);
      combined.holdings[0]!.level = 5;
      expect(regencyCollectionQuote15(split, scenario, realm, bundle).collectibleRP).toBe(
        regencyCollectionQuote15(combined, scenario, realm, bundle).collectibleRP,
      );
      const occupied = structuredClone(s);
      occupied.provinces.find((x) => x.id === p.id)!.occupiedBy = 'anuire-realm-04';
      expect(
        regencyCollectionQuote15(occupied, scenario, realm, bundle).categories[0]!.levels,
      ).toBe(0n);
      expect(
        regencyCollectionQuote15(occupied, scenario, 'anuire-realm-04', bundle).categories[0]!
          .sourceIds,
      ).not.toContain(p.id);
      occupied.holdings[0]!.contested = true;
      expect(regencyCollectionQuote15(occupied, scenario, realm, bundle).collectibleRP).toBe(0n);
    });
    it('caps only new collections by current S, preserves enormous starting stock and records once', () => {
      let s = fixture([realm], 10n ** 120n + 65536n);
      const cap = structuredClone(s);
      cap.holdings = Array.from({ length: 10 }, (_, i) => ({
        id: `cap-guild-${i}`,
        realmId: realm,
        provinceId: s.provinces[0]!.id,
        type: 'guild' as const,
        level: 10,
      }));
      const q = regencyCollectionQuote15(cap, scenario, realm, bundle);
      expect(q.qualifiedRP! > 30n).toBe(true);
      expect(q.collectibleRP).toBe(30n);
      expect(collect(cap).realms.find((r) => r.id === realm)!.regency).toBe(
        s.realms.find((r) => r.id === realm)!.regency + 30n,
      );
      const legalQuote = regencyCollectionQuote15(s, scenario, realm, bundle);
      const before = s.realms.find((r) => r.id === realm)!.regency;
      s = collect(s);
      expect(s.realms.find((r) => r.id === realm)!.regency).toBe(
        before + legalQuote.collectibleRP!,
      );
      expect(() => step(s, { kind: 'collect', realmId: realm })).toThrow('already recorded');
      const restored = deserializeCampaign(serializeCampaign(s), scenario, {
        domainRules: 'birthright-1.5',
        overlayContent: bundle,
      });
      expect(restored).toEqual(s);
      expect(() => step(restored, { kind: 'collect', realmId: realm })).toThrow('already recorded');
    });
    it('separates actual rulers, Source cash handlers and divine/arcane RP; Spider uses reviewed ranks', () => {
      const s = fixture([
        'anuire-realm-01',
        'anuire-realm-29',
        'anuire-realm-17',
        'anuire-realm-26',
        'anuire-realm-09',
        'anuire-realm-44',
      ]);
      const mage = s.characters!.find((c) => c.regentId === 'anuire-regent-002')!;
      mage.role = 'lieutenant';
      s.holdings.push({
        id: 'rp-source-handler-test',
        realmId: 'anuire-realm-01',
        provinceId: s.provinces[0]!.id,
        type: 'source',
        level: 6,
      });
      const economic = economicForecast15(s, scenario, 'anuire-realm-01', { overlays: bundle });
      expect(economic.income.virtualGuild > 0n).toBe(true);
      expect(economic.regency!.quote.categories.find((c) => c.kind === 'source')!.eligible).toBe(
        false,
      );
      expect(economic.regency!.quote.characterId).not.toBe(mage.regentId);
      const roleQuotes = regencyCollectionQuotes15(s, scenario, bundle);
      const spider = roleQuotes.find((q) => q.realmId === 'anuire-realm-29')!;
      expect(spider).toMatchObject({
        status: 'eligible',
        currentScore: 95n,
        qualifiedRP: 5n,
        collectibleRP: 5n,
      });
      expect(spider.categories.find((c) => c.kind === 'source')!.eligible).toBe(false);
      for (const [id, level] of [
        ['033', 16],
        ['051', 15],
        ['017', 13],
      ] as const)
        expect(
          casting35(character35(bundle.characters!, `anuire-regent-${id}`)).classes.find(
            (c) => c.classId === 'wizard',
          )!.level,
        ).toBe(level);
      for (const id of ['082', '084', '091', '110'])
        expect(
          casting35(character35(bundle.characters!, `anuire-regent-${id}`)).templeRealmMagic,
        ).toBe(true);
      const priests = fixture(['anuire-realm-49', 'anuire-realm-43', 'anuire-realm-42']);
      const priestQuotes = regencyCollectionQuotes15(priests, scenario, bundle);
      for (const domain of ['anuire-realm-49', 'anuire-realm-43', 'anuire-realm-42']) {
        const quote = priestQuotes.find((q) => q.realmId === domain)!;
        expect(quote.categories.find((c) => c.kind === 'temple')!.eligible).toBe(true);
        expect(quote.categories.find((c) => c.kind === 'source')!.eligible).toBe(false);
      }
      for (const domain of ['anuire-realm-17', 'anuire-realm-26', 'anuire-realm-09'])
        expect(
          roleQuotes.find((q) => q.realmId === domain)!.categories.find((c) => c.kind === 'source')!
            .eligible,
        ).toBe(true);
      for (const id of ['030', '043', '044', '045', '046', '093'])
        expect(casting35(character35(bundle.characters!, `anuire-regent-${id}`)).approved).toBe(
          false,
        );
      let open = step(s, { kind: 'open' });
      expect(() =>
        step(open, {
          kind: 'withhold',
          realmId: 'anuire-realm-29',
          reason: 'old missing-skills gate no longer applies',
        }),
      ).toThrow('requires unknown qualification');
      open = step(open, { kind: 'collect', realmId: 'anuire-realm-29' });
      expect(
        open.regency15!.state.receipts.find((r) => r.realmId === 'anuire-realm-29')!.kind,
      ).toBe('collection');
      const duplicate = structuredClone(s);
      duplicate.realms.find((r) => r.id === 'anuire-realm-01')!.regentId = 'anuire-regent-057';
      const synced = step(duplicate, { kind: 'sync-rulers' });
      expect(() => step(synced, { kind: 'open' })).toThrow('several independent people');
    });
    it('requires two distinct qualifying boundaries; growth is elective and prices current S+1', () => {
      let s = fixture(),
        original = s.realms.find((r) => r.id === realm)!.bloodlineStrength;
      expect(bloodlineGrowthQuote15(s, scenario, realm)).toMatchObject({
        price: 31n,
        observedStreak: 0,
        eligible: false,
      });
      const first = collect(s);
      expect(() => step(first, { kind: 'close', growth: [auth(first)] })).toThrow('funded choice');
      s = step(first, { kind: 'close', growth: [] });
      expect(
        s.regency15!.state.bloodlines.find((b) => b.characterId === auth(s).characterId)!.streak,
      ).toBe(1);
      s = nextSeason(s);
      s = collect(s);
      expect(bloodlineGrowthQuote15(s, scenario, realm).eligible).toBe(true);
      const stock = s.realms.find((r) => r.id === realm)!.regency;
      s = step(s, { kind: 'close', growth: [auth(s)] });
      expect(s.realms.find((r) => r.id === realm)!.regency).toBe(stock - 31n);
      expect(bloodlineGrowthQuote15(s, scenario, realm)).toMatchObject({
        currentScore: 31n,
        price: 32n,
        observedStreak: 0,
        growthCount: 1,
      });
      expect(s.realms.find((r) => r.id === realm)!.bloodlineStrength).toBe(original);
      s = season(nextSeason(s));
      s = season(nextSeason(s), true);
      expect(bloodlineGrowthQuote15(s, scenario, realm)).toMatchObject({
        currentScore: 32n,
        growthCount: 2,
      });
      s = season(nextSeason(s));
      expect(bloodlineGrowthQuote15(s, scenario, realm).growthCount).toBe(0);
      let held = season(fixture());
      held = season(nextSeason(held));
      expect(bloodlineGrowthQuote15(held, scenario, realm)).toMatchObject({
        currentScore: 30n,
        observedStreak: 2,
      });
    }, 15000);
    it('excludes reserved/committed obligations and resets interrupted or replaced-ruler qualification', () => {
      let s = season(fixture());
      s = nextSeason(s);
      s = collect(s);
      const free = regencyResources15(s, realm).available,
        held = reserve(s, free - 31n);
      s = held.state;
      s = step(s, { kind: 'commit', authorization: auth(s), reservationId: held.id });
      expect(regencyResources15(s, realm)).toMatchObject({ available: 31n, committed: free - 31n });
      s = step(s, { kind: 'close', growth: [] });
      expect(bloodlineGrowthQuote15(s, scenario, realm).observedStreak).toBe(0);
      s = step(s, { kind: 'release', authorization: auth(s), reservationId: held.id });
      s = season(nextSeason(s));
      const old = auth(s).characterId;
      expect(bloodlineGrowthQuote15(s, scenario, realm).observedStreak).toBe(1);
      const replaced = structuredClone(s);
      replaced.realms.find((r) => r.id === realm)!.regentId = 'anuire-regent-028';
      expect(() => bloodlineGrowthQuote15(replaced, scenario, realm)).toThrow('synchronization');
      s = step(replaced, { kind: 'sync-rulers' });
      expect(s.regency15!.state.bloodlines.find((b) => b.characterId === old)!.streak).toBe(0);
      expect(bloodlineGrowthQuote15(s, scenario, realm)).toMatchObject({
        currentScore: 27n,
        observedStreak: 0,
      });
    });
    it('uses identical growth prices under explicit Basic, Advanced and Expert authorization', () => {
      let pending = season(fixture());
      pending = collect(nextSeason(pending));
      const before = pending.realms.find((r) => r.id === realm)!.regency;
      for (const [mode, kind] of [
        ['basic', 'selected-policy'],
        ['advanced', 'confirmation'],
        ['expert', 'order'],
      ] as const) {
        const grown = step(pending, {
          kind: 'close',
          growth: [{ ...auth(pending), mode, kind, reference: 'explicitly-approved-mode-choice' }],
        });
        expect(grown.realms.find((r) => r.id === realm)!.regency).toBe(before - 31n);
        expect(bloodlineGrowthQuote15(grown, scenario, realm).currentScore).toBe(31n);
      }
      expect(() =>
        step(pending, {
          kind: 'close',
          growth: [{ ...auth(pending), mode: 'basic', kind: 'order' }],
        }),
      ).toThrow('authorization');
    });
    it('sacrifices only with explicit authority, preserves conservation, and removes collection at zero S', () => {
      let s = fixture(),
        before = s.realms.find((r) => r.id === realm)!.regency;
      const unapproved = { ...auth(s), mode: 'advanced' as const, kind: 'order' as const };
      expect(() =>
        step(s, { kind: 'sacrifice', authorization: unapproved, points: rp(1n) }),
      ).toThrow('authorization');
      s = step(s, { kind: 'sacrifice', authorization: auth(s), points: rp(2n) }, 'sacrifice-once');
      expect(s.realms.find((r) => r.id === realm)!.regency).toBe(before + 59n);
      expect(() =>
        step(s, { kind: 'sacrifice', authorization: auth(s), points: rp(2n) }, 'sacrifice-once'),
      ).toThrow('already applied');
      expect(() => step(s, { kind: 'sacrifice', authorization: auth(s), points: rp(29n) })).toThrow(
        'exceeds',
      );
      s = step(s, { kind: 'sacrifice', authorization: auth(s), points: rp(28n) });
      expect(regencyCollectionQuote15(s, scenario, realm, bundle)).toMatchObject({
        currentScore: 0n,
        collectibleRP: 0n,
        status: 'ineligible',
      });
      expect(bloodlineGrowthQuote15(s, scenario, realm).qualifies).toBe(false);
      let roundtrip = season(fixture());
      roundtrip = collect(nextSeason(roundtrip));
      const reload = (value: Birthright15Campaign) =>
        deserializeCampaign(serializeCampaign(value), scenario, {
          domainRules: 'birthright-1.5',
          overlayContent: bundle,
        });
      roundtrip = reload(roundtrip);
      const beforeGrowth = roundtrip.realms.find((r) => r.id === realm)!.regency;
      roundtrip = step(roundtrip, { kind: 'close', growth: [auth(roundtrip)] });
      roundtrip = reload(roundtrip);
      roundtrip = step(roundtrip, {
        kind: 'sacrifice',
        authorization: auth(roundtrip),
        points: rp(1n),
      });
      roundtrip = reload(roundtrip);
      expect(roundtrip.realms.find((r) => r.id === realm)!.regency).toBe(beforeGrowth);
      expect(bloodlineGrowthQuote15(roundtrip, scenario, realm).growthCount).toBe(1);
    });
    it('reserves, commits, spends and releases one actual obligation without double use', () => {
      let s = fixture([realm], 100n),
        held = reserve(s, 60n, { gold: 120n });
      s = held.state;
      const quotedBefore = serializeCampaign(s);
      expect(
        regencyReservationQuote15(s, realm, {
          id: 'quote-only',
          obligationId: 'quote-only-obligation',
          purpose: 'bid',
          rp: rp(41n),
          gold: gb(0n),
          targetRealmId: null,
        }).funded,
      ).toBe(false);
      expect(
        regencyReservationQuote15(s, realm, {
          id: 'quote-only',
          obligationId: 'quote-only-obligation',
          purpose: 'bid',
          rp: rp(40n),
          gold: gb(0n),
          targetRealmId: null,
        }).funded,
      ).toBe(true);
      expect(serializeCampaign(s)).toBe(quotedBefore);
      expect(regencyResources15(s, realm)).toMatchObject({
        stored: 100n,
        reserved: 60n,
        available: 40n,
      });
      const before = serializeCampaign(s);
      expect(() => reserve(s, 41n)).toThrow('Insufficient');
      expect(serializeCampaign(s)).toBe(before);
      expect(() => reserve(s, 1n, { obligation: `obligation-${held.id}` })).toThrow(
        'already reserved',
      );
      s = step(s, { kind: 'commit', authorization: auth(s), reservationId: held.id });
      s = step(s, { kind: 'pay', authorization: auth(s), reservationId: held.id });
      expect(regencyResources15(s, realm)).toMatchObject({
        stored: 40n,
        committed: 0n,
        available: 40n,
      });
      const loaded = deserializeCampaign(serializeCampaign(s), scenario, {
        domainRules: 'birthright-1.5',
        overlayContent: bundle,
      });
      expect(() =>
        step(loaded, { kind: 'pay', authorization: auth(loaded), reservationId: held.id }),
      ).toThrow('already paid');
      expect(() => reserve(loaded, 1n, { obligation: `obligation-${held.id}` })).toThrow(
        'already reserved or paid',
      );
    });
    it('conserves RP transfers and blocks same-boundary relay funding', () => {
      const second = 'anuire-realm-04',
        third = 'anuire-realm-02';
      let s = fixture([realm, second, third], 0n);
      s = { ...s, regency15: undefined };
      s.realms.find((r) => r.id === realm)!.regency = rp(10n ** 120n);
      for (const p of s.provinces) p.level = 0;
      s.holdings = [];
      s.leyLines = [];
      s.tradeRoutes = [];
      s = initializeRegency15(s, scenario);
      s = collect(s);
      const total = () => s.realms.reduce((n, r) => n + r.regency, 0n);
      const opening = total();
      const amount = 10n ** 110n;
      let held = reserve(s, amount, { purpose: 'pledge', target: second });
      s = held.state;
      expect(() =>
        step(s, {
          kind: 'transfer',
          authorization: auth(s),
          reservationId: held.id,
          targetRealmId: third,
        }),
      ).toThrow('Invalid paid RP pledge');
      s = step(s, {
        kind: 'transfer',
        authorization: auth(s),
        reservationId: held.id,
        targetRealmId: second,
      });
      expect(total()).toBe(opening);
      s = deserializeCampaign(serializeCampaign(s), scenario, {
        domainRules: 'birthright-1.5',
        overlayContent: bundle,
      });
      expect(s.realms.find((r) => r.id === second)!.regency).toBe(amount);
      held = reserve(s, amount, { purpose: 'pledge', target: third, realmId: second });
      s = held.state;
      const before = serializeCampaign(s);
      expect(() =>
        step(s, {
          kind: 'transfer',
          authorization: auth(s, second),
          reservationId: held.id,
          targetRealmId: third,
        }),
      ).toThrow('relay');
      expect(serializeCampaign(s)).toBe(before);
    });
    it('can pay local bills from incoming RP while preserving a separately funded own pledge', () => {
      const second = 'anuire-realm-04',
        third = 'anuire-realm-02';
      let s = fixture([realm, second, third], 50n);
      for (const p of s.provinces) p.level = 0;
      s.holdings = [];
      s = collect(s);
      let held = reserve(s, 50n, { purpose: 'pledge', target: second });
      s = step(held.state, {
        kind: 'transfer',
        authorization: auth(s),
        reservationId: held.id,
        targetRealmId: second,
      });
      held = reserve(s, 50n, { realmId: second });
      s = step(held.state, { kind: 'pay', authorization: auth(s, second), reservationId: held.id });
      held = reserve(s, 50n, { purpose: 'pledge', realmId: second, target: third });
      s = step(held.state, {
        kind: 'transfer',
        authorization: auth(s, second),
        reservationId: held.id,
        targetRealmId: third,
      });
      expect(s.realms.find((r) => r.id === second)!.regency).toBe(0n);
      expect(s.realms.find((r) => r.id === third)!.regency).toBe(100n);
    });
    it('retains known fealty promises in forecasts and excludes unreserved obligations from growth surplus', () => {
      let s = fixture([realm, 'anuire-realm-04'], 100n);
      s = { ...s, regency15: undefined };
      s.treaties = [
        {
          a: realm,
          b: 'anuire-realm-04',
          kind: 'vassal',
          vassal: realm,
          opinion: 0,
          since: 1,
          regencyPledge: rp(10000n),
        },
      ];
      s = initializeRegency15(s, scenario);
      s = collect(s);
      expect(bloodlineGrowthQuote15(s, scenario, realm)).toMatchObject({
        qualifies: false,
        unreservedKnownPledges: 10000n,
      });
      expect(
        economicForecast15(s, scenario, realm, { overlays: bundle }).regency!.knownPledges,
      ).toHaveLength(1);
    });
    it('quotes and applies once-rounded mixed regular payroll without minting GB', () => {
      let s = fixture([realm], 1000n),
        regular = scenario.units.find((p) => p.pc?.mercenary === false && p.upkeep >= 1)!;
      s.armies = [
        {
          id: 'payroll-test-army',
          realmId: realm,
          provinceId: s.provinces[0]!.id,
          moved: false,
          units: [
            { id: 'payroll-unit-a', type: regular.id, strength: 100 },
            { id: 'payroll-unit-b', type: regular.id, strength: 100 },
          ],
        },
      ];
      s = collect(s);
      const each = goldFromGB(BigInt(regular.upkeep));
      const allocations: PayrollSelection15[] = ['payroll-unit-a', 'payroll-unit-b'].map(
        (unitId) => ({ unitId, rpGold: gb(1n), gold: gb(each - 1n) }),
      );
      const f = economicForecast15(s, scenario, realm, { overlays: bundle }),
        q = regencyPayrollQuote15(s, scenario, f, allocations);
      expect(q.selected).toMatchObject({ rpGold: 2n, rpCost: 1n, goldCost: 2n * (each - 1n) });
      const before = s.realms.find((r) => r.id === realm)!;
      s = step(s, { kind: 'payroll', authorization: auth(s), allocations });
      expect(s.realms.find((r) => r.id === realm)!.regency).toBe(before.regency - 1n);
      expect(s.realms.find((r) => r.id === realm)!.treasury).toBe(
        before.treasury - 2n * (each - 1n),
      );
      expect(() => step(s, { kind: 'payroll', authorization: auth(s), allocations })).toThrow(
        'once per domain',
      );
      const after = economicForecast15(s, scenario, realm, { overlays: bundle });
      expect(after.regency!.payroll).toMatchObject({
        paidByRP: 2n,
        alreadyAllocated: true,
        createsSpendableGB: false,
      });
      expect(after.regency!.projectedClosingAfterRecordedPayroll).toBe(
        after.result!.projectedClosing + 2n * each,
      );
    });
    it('makes fresh collections available for regular upkeep and excludes mercenaries and NPC waivers', () => {
      const regular = scenario.units.find((p) => p.pc?.mercenary === false && p.upkeep >= 1)!,
        merc = scenario.units.find((p) => p.pc?.mercenary === true && p.upkeep >= 1)!;
      let s = fixture([realm], 0n);
      s.armies = [
        {
          id: 'fresh-payroll-army',
          realmId: realm,
          provinceId: s.provinces[0]!.id,
          moved: false,
          units: [
            { id: 'regular-fresh', type: regular.id, strength: 100 },
            { id: 'mercenary-fresh', type: merc.id, strength: 100 },
          ],
        },
      ];
      s = collect(s);
      expect(regencyResources15(s, realm).available > 0n).toBe(true);
      const f = economicForecast15(s, scenario, realm, { overlays: bundle });
      expect(() =>
        regencyPayrollQuote15(s, scenario, f, [
          { unitId: 'mercenary-fresh', rpGold: gb(1n), gold: gb(0n) },
        ]),
      ).toThrow('mercenary');
      s = step(s, {
        kind: 'payroll',
        authorization: auth(s),
        allocations: [{ unitId: 'regular-fresh', rpGold: goldFromGBRatio(1n, 5n), gold: gb(0n) }],
      });
      expect(s.regency15!.state.receipts.find((r) => r.kind === 'payroll')!.rpDebit).toBe(1n);
      const waived = fixture(['anuire-realm-17']);
      const wf = economicForecast15(waived, scenario, 'anuire-realm-17', { overlays: bundle });
      const unit = wf.lines.find((l) => l.stream === 'military' && l.waiver > 0n)!;
      expect(() =>
        regencyPayrollQuote15(waived, scenario, wf, [
          { unitId: unit.assetIds[0]!, rpGold: gb(1n), gold: gb(0n) },
        ]),
      ).toThrow();
    });
    it('reserves enormous future Alchemy resources and its separate fee without executing a spell', () => {
      let s = fixture([realm], 10n ** 120n),
        amount = rp(10n ** 110n);
      expect(alchemyResourceQuote15(s, realm, amount)).toMatchObject({
        rpCost: amount,
        grossOutput: amount * 120n,
        fee: 120n,
        executionActive: false,
        reservable: true,
      });
      const held = reserve(s, amount, { purpose: 'future-alchemy', gold: 120n });
      s = held.state;
      expect(() =>
        step(s, { kind: 'pay', authorization: auth(s), reservationId: held.id }),
      ).toThrow('Alchemy remains guarded');
      const restored = deserializeCampaign(serializeCampaign(s), scenario, {
        domainRules: 'birthright-1.5',
        overlayContent: bundle,
      });
      expect(regencyResources15(restored, realm).reserved).toBe(amount);
      const poor = fixture([realm], 10n ** 120n, 0n);
      expect(alchemyResourceQuote15(poor, realm, amount).reservable).toBe(false);
      expect(() => reserve(poor, amount, { purpose: 'future-alchemy', gold: 120n })).toThrow(
        'Insufficient',
      );
      expect(() => reserve(poor, amount, { purpose: 'future-alchemy', gold: 0n })).toThrow(
        'separate funded',
      );
    });
    it('rejects inconsistent derived state and malformed journals; old saves remain opt-in and guarded', () => {
      let s = collect(fixture());
      const initial = serializeCampaign(s);
      for (const mutate of [
        (r: any) => (r.campaign.regency15.state.bloodlines[0].streak = 2),
        (r: any) =>
          (r.campaign.regency15.state.accounts.find((x: any) => x.realmId === realm).rp = '1'),
        (r: any) =>
          r.campaign.regency15.events.push(structuredClone(r.campaign.regency15.events[0])),
        (r: any) => (r.campaign.regency15.version = 2),
        (r: any) => (r.campaign.regency15.events[0].operation.quotes[0].collectibleRP = '-1'),
      ]) {
        const raw = JSON.parse(initial);
        mutate(raw);
        expect(() =>
          deserializeCampaign(JSON.stringify(raw), scenario, {
            domainRules: 'birthright-1.5',
            overlayContent: bundle,
          }),
        ).toThrow();
      }
      const old = deserializeCampaign(serializeCampaign(seed), scenario, {
        domainRules: 'birthright-1.5',
        overlayContent: bundle,
      });
      expect(old.regency15).toBeUndefined();
      expect(() => step(old, { kind: 'open' })).toThrow('initialization');
      expect(
        applyCommand(s as unknown as Campaign, scenario, realm, { type: 'HoldAction' }).ok,
      ).toBe(false);
      const before = serializeCampaign(s);
      regencyCollectionQuotes15(s, scenario, bundle);
      bloodlineGrowthQuote15(s, scenario, realm);
      economicForecast15(s, scenario, realm, { overlays: bundle });
      expect(serializeCampaign(s)).toBe(before);
      expect(() =>
        initializeRegency15(
          createCampaign(
            scenario,
            'anuire-realm-04',
            undefined,
            undefined,
            'UNRESTRICTED',
          ) as unknown as Birthright15Campaign,
          scenario,
        ),
      ).toThrow('explicit Birthright');
      expect(paths.map((p) => createHash('sha256').update(readFileSync(p)).digest('hex'))).toEqual(
        hashes,
      );
    });
  },
);
