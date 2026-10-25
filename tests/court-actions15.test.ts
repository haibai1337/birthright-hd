import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  createBirthright15Foundation,
  initializeRegency15,
  initializeCourtActions15,
  applyCourtAction15,
  developmentOrderQuote15,
  courtQuote15,
  courtExtraActions15,
  palaceUpkeep15,
  administrateNominationQuote15,
  regencyResources15,
  references35,
  rulingRegent,
  serializeCampaign,
  deserializeCampaign,
  regencyPoints as rp,
  goldFromGB,
  goldUnits,
  applyCommand,
  createCampaign,
  applyRegency15,
  sourcePotential,
  regencyCollectionQuotes15,
  rollDomainCheck,
  casting35,
  character35,
  economicForecast15,
  type Birthright15Campaign as State,
  type Scenario,
  type CharacterOverlays35,
  type CourtRequest15,
  type DevelopmentOrder15,
  type RegencyAuthorization15,
  type Campaign,
} from '../packages/core';
import { loadAnuireScenario, buildAnuireCharacterOverlays35 } from '../packages/world-data';

describe('approved Court brackets and exact upkeep', () => {
  it('covers every bracket without palace action bonuses', () => {
    expect(Array.from({ length: 13 }, (_, i) => courtExtraActions15(i))).toEqual([
      0, 0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 5,
    ]);
    expect(palaceUpkeep15(1)).toBe(60n);
    expect(palaceUpkeep15(3)).toBe(180n);
    expect(() => courtExtraActions15(-1)).toThrow();
    expect(() => courtExtraActions15(1.5)).toThrow();
  });
});
describe.skipIf(!existsSync('reference/extracted/anuire/strategy.research.json'))(
  'Increment5 scoped court/development commands',
  () => {
    let scenario: Scenario, bundle: CharacterOverlays35, seed: State;
    let tx = 0;
    const kalien = 'anuire-realm-14',
      spider = 'anuire-realm-29';
    beforeAll(async () => {
      const input = ['anuire', 'economy', 'magic', 'strategy'].map((n) =>
        JSON.parse(readFileSync(`reference/extracted/anuire/${n}.research.json`, 'utf8')),
      ) as [unknown, unknown, unknown, unknown];
      scenario = await loadAnuireScenario(...input);
      bundle = buildAnuireCharacterOverlays35(scenario, input[0], input[2]);
      seed = createBirthright15Foundation(scenario, kalien, {
        selectionMode: 'UNRESTRICTED',
        overlays: references35(bundle),
      });
    }, 120000);
    const auth = (
      s: State,
      id = kalien,
      cid = rulingRegent(scenario, id, s)!.id,
    ): RegencyAuthorization15 => ({
      realmId: id,
      characterId: cid,
      mode: 'expert',
      kind: 'order',
      reference: 'explicit-focused-test',
    });
    const step = (s: State, request: CourtRequest15, id = `court-test-${++tx}`) =>
      applyCourtAction15(s, scenario, bundle, id, request);
    function raw(ids = [kalien], court = 1, stock = 1000n, cash = 1000n) {
      const s = structuredClone(seed);
      s.playerRealm = ids[0]!;
      s.seasonFlow = { phase: 'actions', transitionId: 'explicit-test-action-checkpoint' };
      for (const r of s.realms) {
        r.eliminated = !ids.includes(r.id);
        if (ids.includes(r.id)) {
          r.regency = rp(stock);
          r.treasury = goldFromGB(cash);
          r.court = court;
          r.actions = 3;
        }
      }
      return s;
    }
    const init = (s = raw()) =>
      initializeCourtActions15(initializeRegency15(s, scenario), scenario, bundle);
    const owned = (s: State, id = kalien) => s.provinces.find((p) => p.owner === id)!;
    const seat = (s: State, id = kalien, pid = owned(s, id).id) =>
      step(s, { kind: 'seat', authorization: auth(s, id), provinceId: pid });
    function finishResponses(s: State, id: string, side: 'support' | 'oppose' = 'oppose') {
      for (let guard = 0; guard < 100; guard++) {
        const o = s.courtActions15!.state.orders.find((o) => o.id === id)!;
        const target = o.quote.targets[o.index],
          r = target?.responders[o.responseIndex];
        if (!r) return s;
        s = step(s, {
          kind: 'respond',
          orderId: id,
          authorization: auth(s, r),
          side: r === o.quote.realmId ? 'support' : side,
          holdingIds: [],
          bid: rp(0n),
        });
      }
      throw new Error('Unbounded response queue');
    }
    function submit(
      s: State,
      order: DevelopmentOrder15,
      id = `development-${++tx}`,
      actor = auth(s),
    ) {
      s = step(s, { kind: 'reserve', orderId: id, authorization: actor, order });
      return { state: s, id, actor };
    }
    function execute(
      s: State,
      order: DevelopmentOrder15,
      id = `development-${++tx}`,
      actor = auth(s),
    ) {
      ({ state: s } = submit(s, order, id, actor));
      s = step(s, { kind: 'commit', orderId: id, authorization: actor });
      while (s.courtActions15!.state.orders.find((o) => o.id === id)!.status === 'committed') {
        s = finishResponses(s, id);
        s = step(s, { kind: 'resolve', orderId: id, authorization: actor });
      }
      return s;
    }
    function advanceRound(s: State) {
      const round = s.domainTurn!.round;
      do {
        const id = s.domainTurn!.order[s.domainTurn!.cursor]!;
        s = step(s, { kind: 'end-slot', authorization: auth(s, id) });
      } while (!s.courtActions15!.state.awaitingMaintenance && s.domainTurn!.round === round);
      return s;
    }
    const reload = (s: State) =>
      deserializeCampaign(serializeCampaign(s), scenario, {
        domainRules: 'birthright-1.5',
        overlayContent: bundle,
      });
    it('keeps actual Anuire court1 unspecified, no fabricated seats/palaces, and pure quotes', () => {
      const s = init(),
        before = serializeCampaign(s),
        p = owned(s);
      expect(courtQuote15(s, kalien)).toMatchObject({
        paidLevel: 1,
        effectiveLevel: 1,
        capacity: 1,
        extraActions: 0,
        grandfather: true,
        legalSeat: false,
      });
      expect(s.courtActions15!.state.palaces).toEqual([]);
      expect(() =>
        developmentOrderQuote15(s, scenario, bundle, auth(s), {
          kind: 'increase-court',
          opportunity: 'standard',
        }),
      ).toThrow('legal seat');
      const q = developmentOrderQuote15(s, scenario, bundle, auth(s), {
        kind: 'rule-province',
        provinceId: p.id,
      });
      expect(q.gold).toBe(goldFromGB(BigInt(p.level)));
      expect(q.targets[0]!.dc).toBe(10 + p.level);
      expect(serializeCampaign(s)).toBe(before);
      const used = raw();
      used.realms.find((r) => r.id === kalien)!.actions = 2;
      expect(() => init(used)).toThrow('unused seasonal action checkpoint');
    });
    it('retains Court0 standard actions and skips the original special controller without inventing its budget', () => {
      let s = init(raw([kalien, 'anuire-realm-23'], 0));
      expect(courtQuote15(s, kalien)).toMatchObject({
        paidLevel: 0,
        effectiveLevel: 0,
        extraActions: 0,
      });
      expect(
        developmentOrderQuote15(s, scenario, bundle, auth(s), {
          kind: 'rule-province',
          provinceId: owned(s).id,
        }).standard,
      ).toBe(true);
      expect(() =>
        developmentOrderQuote15(s, scenario, bundle, auth(s), {
          kind: 'build-palace',
          provinceId: owned(s).id,
          opportunity: 'court',
        }),
      ).toThrow('opportunity');
      s = advanceRound(s);
      expect(s.domainTurn!.round).toBe(2);
      expect(s.domainTurn!.order[s.domainTurn!.cursor]).toBe(kalien);
      expect(s.courtActions15!.state.endedSlots.every((e) => e.realmId === kalien)).toBe(true);
      expect(reload(s)).toEqual(s);
    }, 30000);
    it('requires actual host consent for a positive holding seat and handles revocation', () => {
      const g = seed.holdings.find(
        (h) =>
          h.level > 0 &&
          !h.contested &&
          seed.provinces.find((p) => p.id === h.provinceId)?.owner !== h.realmId,
      )!;
      const host = seed.provinces.find((p) => p.id === g.provinceId)!.owner;
      let s = init(raw([g.realmId, host]));
      expect(() => seat(s, g.realmId, g.provinceId)).toThrow('host consent');
      s = step(s, {
        kind: 'host-consent',
        authorization: auth(s, host),
        provinceId: g.provinceId,
        guestRealmId: g.realmId,
        allowed: true,
      });
      s = seat(s, g.realmId, g.provinceId);
      expect(courtQuote15(s, g.realmId).legalSeat).toBe(true);
      s = step(s, {
        kind: 'host-consent',
        authorization: auth(s, host),
        provinceId: g.provinceId,
        guestRealmId: g.realmId,
        allowed: false,
      });
      expect(courtQuote15(s, g.realmId).effectiveLevel).toBe(0);
      expect(reload(s)).toEqual(s);
    }, 30000);
    it('pays Court increase once, delays slots to next round and upkeep to next season', () => {
      let s = seat(init(raw([kalien], 2)));
      const treasury = realmGold(s),
        before = courtQuote15(s, kalien);
      expect(before.extraActions).toBe(0);
      s = execute(s, { kind: 'increase-court', opportunity: 'standard' });
      expect(realmGold(s)).toBe(treasury - 120n);
      expect(courtQuote15(s, kalien)).toMatchObject({
        paidLevel: 3,
        extraActions: 0,
        upkeep: 240n,
        nextSeasonUpkeep: 360n,
      });
      s = advanceRound(reload(s));
      expect(courtQuote15(s, kalien).extraActions).toBe(1);
      expect(() =>
        developmentOrderQuote15(s, scenario, bundle, auth(s), {
          kind: 'increase-court',
          opportunity: 'court',
        }),
      ).toThrow('+1');
    }, 30000);
    function realmGold(s: State, id = kalien) {
      return s.realms.find((r) => r.id === id)!.treasury;
    }
    it('builds a 6GB palace with an available Build slot; completion adds capacity, never free actions', () => {
      let s = seat(init(raw([kalien], 3)));
      const before = realmGold(s),
        p = owned(s);
      const capacity = courtQuote15(s, kalien).capacity;
      s = execute(s, { kind: 'build-palace', provinceId: p.id, opportunity: 'court' });
      expect(realmGold(s)).toBe(before - 720n);
      expect(s.courtActions15!.state.palaces[0]!.level).toBe(0);
      expect(courtQuote15(s, kalien).capacity).toBe(capacity);
      s = advanceRound(reload(s));
      expect(courtQuote15(s, kalien)).toMatchObject({
        capacity,
        extraActions: 1,
        fundedPalaceLevel: 0,
      });
      expect(
        economicForecast15(s, scenario, kalien, { overlays: bundle }).expenses.infrastructure,
      ).toBe(60n);
      const unsupported = administrateNominationQuote15(s, scenario, bundle, kalien);
      expect(unsupported.quote.eligibleBase % 120n).toBe(0n);
      const completed = s.courtActions15!.state.palaces[0]!;
      s = step(s, { kind: 'fund-palace', authorization: auth(s), palaceId: completed.id });
      expect(realmGold(s)).toBe(before - 720n - 60n);
      expect(courtQuote15(s, kalien)).toMatchObject({ capacity: capacity + 1, extraActions: 1 });
      expect(s.courtActions15!.state.palaces[0]).toMatchObject({ level: 1, fundedLevel: 1 });
      expect(palaceUpkeep15(1)).toBe(60n);
      s = execute(s, { kind: 'build-palace', provinceId: p.id, opportunity: 'court' });
      s = advanceRound(s);
      expect(s.courtActions15!.state.palaces[0]).toMatchObject({ level: 2, fundedLevel: 1 });
      expect(courtQuote15(s, kalien).capacity).toBe(capacity + 1);
      expect(
        economicForecast15(s, scenario, kalien, { overlays: bundle }).expenses.infrastructure,
      ).toBe(120n);
      expect(
        administrateNominationQuote15(s, scenario, bundle, kalien).quote.eligibleBase % 120n,
      ).toBe(60n);
      s = step(s, { kind: 'fund-palace', authorization: auth(s), palaceId: completed.id });
      expect(courtQuote15(s, kalien)).toMatchObject({ capacity: capacity + 2, extraActions: 1 });
      expect(realmGold(s)).toBe(before - 1560n);
      expect(reload(s)).toEqual(s);
    }, 30000);
    it('reserves/release opportunities and funds without spending or RNG until commitment', () => {
      let s = init(),
        p = owned(s),
        before = realmGold(s),
        rng = s.rng;
      const order = { kind: 'rule-province' as const, provinceId: p.id };
      ({ state: s } = submit(s, order, 'cancel-one'));
      expect(realmGold(s)).toBe(before);
      expect(s.rng).toBe(rng);
      expect(regencyResources15(s, kalien).goldAvailable).toBe(
        before - goldFromGB(BigInt(p.level)),
      );
      expect(() => submit(s, order, 'duplicate-opportunity')).toThrow('opportunity');
      s = step(reload(s), { kind: 'release', orderId: 'cancel-one', authorization: auth(s) });
      expect(regencyResources15(s, kalien).goldAvailable).toBe(before);
      expect(developmentOrderQuote15(s, scenario, bundle, auth(s), order).funded).toBe(true);
    }, 30000);
    it('charges a level-zero Create attempt at DC10 and rejects active equivalent contacts', () => {
      const original = raw(),
        p = owned(original);
      original.holdings = original.holdings.filter(
        (h) => !(h.realmId === kalien && h.provinceId === p.id && h.type === 'temple'),
      );
      let s = init(original),
        before = realmGold(s);
      const order = {
        kind: 'create-holding' as const,
        provinceId: p.id,
        holdingType: 'temple' as const,
        bid: rp(100n),
      };
      const q = developmentOrderQuote15(s, scenario, bundle, auth(s), order);
      expect(q).toMatchObject({ gold: 120n, rp: 100n });
      expect(q.targets[0]).toMatchObject({ dc: 10, level: 0 });
      s = execute(s, order);
      expect(realmGold(s)).toBe(before - 120n);
      expect(
        s.holdings.some(
          (h) =>
            h.realmId === kalien && h.provinceId === p.id && h.type === 'temple' && h.level === 0,
        ),
      ).toBe(true);
      s = advanceRound(s);
      expect(() => developmentOrderQuote15(s, scenario, bundle, auth(s), order)).toThrow('contact');
    }, 30000);
    it('Rules aggregated holding H with no own-H or full check bonus and preserves constituents', () => {
      const initial = raw();
      const p = owned(initial);
      initial.holdings = initial.holdings.filter((h) => h.provinceId !== p.id || h.type !== 'law');
      initial.holdings.push(
        {
          id: 'split-law-a',
          sourceId: 'original-a',
          realmId: kalien,
          provinceId: p.id,
          type: 'law',
          level: 1,
        },
        {
          id: 'split-law-b',
          sourceId: 'original-b',
          realmId: kalien,
          provinceId: p.id,
          type: 'law',
          level: 1,
        },
      );
      let s = init(initial);
      const q = developmentOrderQuote15(s, scenario, bundle, auth(s), {
        kind: 'rule-holding',
        holdingId: 'split-law-b',
        bid: rp(100n),
      });
      expect(q.targets[0]).toMatchObject({ level: 2, dc: 12 });
      expect(q.gold).toBe(120n);
      expect(q.rp).toBe(100n);
      s = execute(s, { kind: 'rule-holding', holdingId: 'split-law-b', bid: rp(100n) });
      expect(
        s.holdings
          .filter((h) => h.id.startsWith('split-law'))
          .map((h) => [h.id, h.sourceId, h.level]),
      ).toEqual([
        ['split-law-a', 'original-a', 2],
        ['split-law-b', 'original-b', 1],
      ]);
    }, 30000);
    it('resolves finite Realm Rule targets separately and rejects raw-record duplicate target/partial funding', () => {
      const initial = raw([kalien], 3);
      const extra = initial.provinces.find((p) => p.owner !== kalien && p.level >= 2)!;
      extra.owner = kalien;
      for (let seed = 0; seed < 1000; seed++) {
        const preview = { rng: seed };
        rollDomainCheck(preview, 10);
        if (rollDomainCheck(preview, 10).roll <= 2) {
          initial.rng = seed;
          break;
        }
      }
      const ps = initial.provinces.filter((p) => p.owner === kalien).slice(0, 2);
      expect(ps).toHaveLength(2);
      for (const [i, p] of ps.entries()) {
        initial.holdings = initial.holdings.filter(
          (h) => h.provinceId !== p.id || h.type !== 'law',
        );
        initial.holdings.push({
          id: `batch-law-${i}`,
          realmId: kalien,
          provinceId: p.id,
          type: 'law',
          level: 0,
        });
      }
      let s = seat(init(initial));
      const order = {
        kind: 'realm-rule' as const,
        targets: ps.map((_, i) => ({ holdingId: `batch-law-${i}`, bid: rp(i === 0 ? 100n : 0n) })),
      };
      const q = developmentOrderQuote15(s, scenario, bundle, auth(s), order);
      expect(q.gold).toBe(240n);
      expect(q.courtSlots).toEqual([0]);
      expect(() =>
        submit(s, { kind: 'realm-rule', targets: [order.targets[0]!, order.targets[0]!] }),
      ).toThrow('Repeat');
      s = execute(s, order, 'finite-batch');
      const o = s.courtActions15!.state.orders.find((o) => o.id === 'finite-batch')!;
      expect(o.results).toHaveLength(2);
      expect(o.results.map((r) => r.success)).toEqual([true, false]);
      expect(reload(s)).toEqual(s);
      expect(() => step(s, { kind: 'resolve', orderId: o.id, authorization: auth(s) })).toThrow(
        'not pending',
      );
      const poor = raw([kalien], 3, 1000n, 1n);
      poor.provinces.find((p) => p.id === extra.id)!.owner = kalien;
      for (const p of ps) {
        poor.holdings = poor.holdings.filter((h) => h.provinceId !== p.id || h.type !== 'law');
        poor.holdings.push(initial.holdings.find((h) => h.id === `batch-law-${ps.indexOf(p)}`)!);
      }
      expect(() => submit(seat(init(poor)), order, 'unfunded-batch')).toThrow('resources');
    }, 30000);
    it('consumes one domain-wide Province attempt on failure and forbids court-only Province actions or RP bids', () => {
      const initial = raw();
      initial.provinces.find((p) => p.owner !== kalien && p.level > 0)!.owner = kalien;
      for (let seed = 0; seed < 1000; seed++)
        if (rollDomainCheck({ rng: seed }, 10).roll === 1) {
          initial.rng = seed;
          break;
        }
      let s = init(initial);
      const p = owned(s);
      const order = { kind: 'rule-province' as const, provinceId: p.id };
      ({ state: s } = submit(s, order, 'province-once'));
      s = step(s, { kind: 'commit', orderId: 'province-once', authorization: auth(s) });
      s = step(s, { kind: 'resolve', orderId: 'province-once', authorization: auth(s) });
      const first = s.courtActions15!.state.orders.find((o) => o.id === 'province-once')!;
      expect(first.results).toHaveLength(1);
      expect(first.results[0]!.success).toBe(false);
      s = advanceRound(reload(s));
      expect(() =>
        submit(s, {
          kind: 'rule-province',
          provinceId: s.provinces.find(
            (p) => p.owner === kalien && p.id !== first.quote.targets[0]!.provinceId,
          )!.id,
        }),
      ).toThrow('One Rule Province');
      expect(() =>
        step(s, {
          kind: 'reserve',
          orderId: 'illegal-bid',
          authorization: auth(s),
          order: { ...order, bid: rp(1n) } as DevelopmentOrder15,
        }),
      ).toThrow();
    }, 30000);
    it('retains global actor uniqueness, requires real appointments and keeps landed vassals independent', () => {
      const initial = raw();
      const lt = bundle.handlers!.records.find(
        (h) =>
          h.authority === 'lieutenant' &&
          h.characterId !== rulingRegent(scenario, h.realmId, initial)?.id &&
          initial.characters?.some((c) => c.regentId === h.characterId && c.realmId === h.realmId),
      )!;
      expect(lt).toBeDefined();
      initial.playerRealm = lt.realmId;
      for (const r of initial.realms) r.eliminated = r.id !== lt.realmId;
      let s = init(initial),
        candidate = auth(s, lt.realmId, lt.characterId);
      expect(() =>
        developmentOrderQuote15(s, scenario, bundle, candidate, {
          kind: 'rule-province',
          provinceId: owned(s, lt.realmId).id,
        }),
      ).toThrow('Unauthorized');
      s = step(s, {
        kind: 'appoint',
        authorization: auth(s, lt.realmId),
        characterId: lt.characterId,
        provinceId: owned(s, lt.realmId).id,
      });
      const q = developmentOrderQuote15(s, scenario, bundle, candidate, {
        kind: 'rule-province',
        provinceId: owned(s, lt.realmId).id,
      });
      expect(q.characterId).toBe(lt.characterId);
      ({ state: s } = submit(
        s,
        { kind: 'rule-province', provinceId: owned(s, lt.realmId).id },
        'lt-order',
        candidate,
      ));
      expect(() => step(s, { kind: 'nominate-administrate', authorization: candidate })).toThrow(
        'unavailable',
      );
      const active = raw([kalien, spider]);
      active.realms.find((r) => r.id === spider)!.lieutenantOf = kalien;
      const assimilated = init(active);
      expect(() =>
        developmentOrderQuote15(assimilated, scenario, bundle, auth(assimilated, spider), {
          kind: 'rule-province',
          provinceId: owned(assimilated, spider).id,
        }),
      ).toThrow('independent');
    }, 30000);
    it('nominates one reviewed Admin actor before the snapshot and leaves the check gated/pure', () => {
      let s = init();
      s = step(s, { kind: 'nominate-administrate', authorization: auth(s) });
      const before = serializeCampaign(s);
      const q = administrateNominationQuote15(s, scenario, bundle, kalien);
      expect(q).toMatchObject({
        status: 'pending-maintenance',
        executionActive: false,
        requiresAvailabilityAtSnapshot: true,
      });
      expect(q.quote.die).toBeNull();
      expect(q.quote.discount).toBe(0n);
      expect(serializeCampaign(s)).toBe(before);
      expect(() => step(s, { kind: 'nominate-administrate', authorization: auth(s) })).toThrow(
        'One named',
      );
      s = applyRegency15(s, scenario, bundle, 'freeze-after-nomination', { kind: 'open' });
      expect(reload(s)).toEqual(s);
    }, 30000);
    it('keeps palace funding seasonal, charges exact halves and includes funded infrastructure in pending Administrate', () => {
      let s = seat(init(raw([kalien], 3)));
      s = execute(s, { kind: 'build-palace', provinceId: owned(s).id, opportunity: 'court' });
      s = advanceRound(s);
      s = step(s, {
        kind: 'fund-palace',
        authorization: auth(s),
        palaceId: s.courtActions15!.state.palaces[0]!.id,
      });
      s = step(s, { kind: 'nominate-administrate', authorization: auth(s) });
      const extra = [
        {
          id: 'reviewed-road',
          realmId: kalien,
          kind: 'road' as const,
          sourceIds: ['reviewed-road'],
          reference: 'explicit synthetic funded road contract',
          seasonalUpkeep: goldFromGB(4n),
          paid: true,
          supported: true,
          evidence: 'recorded-contract' as const,
        },
      ];
      const admin = administrateNominationQuote15(s, scenario, bundle, kalien, extra);
      expect(admin.quote.eligibleBase % 120n).toBe(60n);
      expect(admin.quote.potentialSaving).toBeGreaterThanOrEqual(120n);
      expect(admin.quote.discount).toBe(0n);
      expect(
        economicForecast15(s, scenario, kalien, { overlays: bundle }).expenses.infrastructure,
      ).toBe(60n);
      s = advanceRound(s);
      s = advanceRound(s);
      expect(s.courtActions15!.state.awaitingMaintenance).toBe(true);
      expect(reload(s)).toEqual(s);
      s = applyRegency15(s, scenario, bundle, 'palace-season-open', { kind: 'open' });
      for (const q of s.regency15!.state.boundary!.quotes)
        s = applyRegency15(s, scenario, bundle, `palace-collect-${q.realmId}`, {
          kind: 'collect',
          realmId: q.realmId,
        });
      s = applyRegency15(s, scenario, bundle, 'palace-season-close', { kind: 'close', growth: [] });
      s = { ...s, turn: s.turn + 1 };
      s = step(s, { kind: 'resume-season' });
      expect(courtQuote15(s, kalien)).toMatchObject({ effectiveLevel: 0, fundedPalaceLevel: 0 });
      const before = realmGold(s);
      s = step(s, { kind: 'fund-court', authorization: auth(s) });
      const palace = s.courtActions15!.state.palaces[0]!;
      s = step(s, { kind: 'fund-palace', authorization: auth(s), palaceId: palace.id });
      expect(realmGold(s)).toBe(before - 360n - 60n);
      expect(courtQuote15(s, kalien).fundedPalaceLevel).toBe(1);
      expect(() =>
        step(s, { kind: 'fund-palace', authorization: auth(s), palaceId: palace.id }),
      ).toThrow('already funded');
      expect(reload(s)).toEqual(s);
    }, 30000);
    it('uses one paid typed support/opposition contribution per group and real counterparty RP', () => {
      const initial = raw([kalien, spider]);
      const p = owned(initial);
      initial.holdings = initial.holdings.filter(
        (h) => h.provinceId !== p.id || !['law', 'guild'].includes(h.type),
      );
      initial.holdings.push(
        { id: 'target-guild', realmId: kalien, provinceId: p.id, type: 'guild', level: 0 },
        { id: 'hostile-law', realmId: spider, provinceId: p.id, type: 'law', level: 1 },
        { id: 'hostile-guild-a', realmId: spider, provinceId: p.id, type: 'guild', level: 1 },
        { id: 'hostile-guild-b', realmId: spider, provinceId: p.id, type: 'guild', level: 0 },
      );
      let s = init(initial);
      ({ state: s } = submit(
        s,
        { kind: 'rule-holding', holdingId: 'target-guild', bid: rp(0n) },
        'typed-opposition',
      ));
      s = step(s, { kind: 'commit', orderId: 'typed-opposition', authorization: auth(s) });
      const first = s.courtActions15!.state.orders[0]!.quote.targets[0]!.responders[0]!;
      if (first === kalien)
        s = step(s, {
          kind: 'respond',
          orderId: 'typed-opposition',
          authorization: auth(s),
          side: 'support',
          holdingIds: [],
          bid: rp(0n),
        });
      const op = {
        kind: 'respond' as const,
        orderId: 'typed-opposition',
        authorization: auth(s, spider),
        side: 'oppose' as const,
        holdingIds: ['hostile-law', 'hostile-guild-a'],
        bid: rp(100n),
      };
      expect(() => step(s, { ...op, holdingIds: ['hostile-guild-a', 'hostile-guild-b'] })).toThrow(
        'duplicated',
      );
      const before = s.realms.find((r) => r.id === spider)!.regency;
      s = step(s, op);
      expect(s.realms.find((r) => r.id === spider)!.regency).toBe(before - 100n);
      s = step(s, { kind: 'resolve', orderId: 'typed-opposition', authorization: auth(s) });
      expect(s.courtActions15!.state.orders[0]!.results[0]!.success).toBe(false);
      expect(reload(s)).toEqual(s);
    }, 30000);
    it('separates qualified Source competition from ordinary Law and virtual-Guild permission', () => {
      const mage = seed.realms.find(
        (r) =>
          casting35(character35(bundle.characters!, rulingRegent(scenario, r.id, seed)!.id))
            .sourceRealmMagic && r.controller !== 'passive',
      )!.id;
      const initial = raw([mage, spider]),
        p = initial.provinces.find((p) => sourcePotential(scenario, p.id, p.level) >= 2)!;
      initial.holdings = initial.holdings.filter(
        (h) => h.provinceId !== p.id || h.type !== 'source',
      );
      initial.holdings.push(
        { id: 'mage-source', realmId: mage, provinceId: p.id, type: 'source', level: 0 },
        { id: 'spider-source', realmId: spider, provinceId: p.id, type: 'source', level: 1 },
      );
      const s = init(initial),
        q = developmentOrderQuote15(s, scenario, bundle, auth(s, mage), {
          kind: 'rule-holding',
          holdingId: 'mage-source',
          bid: rp(0n),
        });
      expect(q.targets[0]!.responders).not.toContain(spider);
      expect(q.targets[0]!.responders).toContain(mage); // A real Source0 contact permits RP, not its own-H modifier.
      expect(() =>
        developmentOrderQuote15(s, scenario, bundle, auth(s, spider), {
          kind: 'rule-holding',
          holdingId: 'spider-source',
          bid: rp(0n),
        }),
      ).toThrow('scheduler');
      const only = init(raw([spider]));
      expect(() =>
        developmentOrderQuote15(only, scenario, bundle, auth(only, spider), {
          kind: 'create-holding',
          provinceId: owned(only, spider).id,
          holdingType: 'source',
          bid: rp(0n),
        }),
      ).toThrow();
    }, 30000);
    it('uses original elven/source-potential exceptions and preserves Source identities on Province growth', () => {
      const elf = (id: string) =>
        !!(
          scenario.provinces.find((p) => p.id === id)?.original?.population as
            { elf?: boolean } | undefined
        )?.elf;
      for (const isElf of [true, false]) {
        const target = seed.provinces.find(
          (p) =>
            elf(p.id) === isElf &&
            p.level < Math.min(10, scenario.provinces.find((d) => d.id === p.id)!.maxLevel) &&
            sourcePotential(scenario, p.id, p.level) > 0 &&
            ['territorial', 'holding'].includes(
              scenario.realms.find((r) => r.id === p.owner)!.domainType!,
            ),
        )!;
        expect(target).toBeDefined();
        const initial = raw([target.owner]);
        for (let seed = 0; seed < 1000; seed++)
          if (rollDomainCheck({ rng: seed }, 10).roll === 20) {
            initial.rng = seed;
            break;
          }
        const beforePotential = sourcePotential(scenario, target.id, target.level),
          original = initial.holdings.filter(
            (h) => h.provinceId === target.id && h.type === 'source',
          );
        const s = execute(
          init(initial),
          { kind: 'rule-province', provinceId: target.id },
          `source-potential-${isElf ? 'elf' : 'mundane'}`,
          auth(initial, target.owner),
        );
        expect(s.provinces.find((p) => p.id === target.id)!.level).toBe(target.level + 1);
        expect(sourcePotential(scenario, target.id, target.level + 1)).toBe(
          isElf ? beforePotential : beforePotential - 1,
        );
        expect(s.holdings.filter((h) => h.provinceId === target.id && h.type === 'source')).toEqual(
          original,
        );
        expect(reload(s)).toEqual(s);
      }
    }, 30000);
    it('preserves a frozen RP entitlement while development changes the next eligible snapshot', () => {
      let s = init();
      s = applyRegency15(s, scenario, bundle, 'opening-frozen', { kind: 'open' });
      const frozen = structuredClone(s.regency15!.state.boundary);
      const p = owned(s);
      s = execute(s, {
        kind: 'create-holding',
        provinceId: p.id,
        holdingType: 'temple',
        bid: rp(100n),
      });
      expect(s.regency15!.state.boundary).toEqual(frozen);
      expect(reload(s)).toEqual(s);
    }, 30000);
    it('uses huge real RP bids once with seeded rolls, strict reload and no unsafe Number conversion', () => {
      let s = init(raw([kalien], 1, 10n ** 120n));
      const h = s.holdings.find(
        (h) =>
          h.realmId === kalien &&
          h.type === 'guild' &&
          s.provinces.find((p) => p.id === h.provinceId)!.level >
            s.holdings
              .filter((x) => x.provinceId === h.provinceId && x.type === 'guild')
              .reduce((n, x) => n + x.level, 0),
      )!;
      const huge = rp(10n ** 110n),
        before = s.realms.find((r) => r.id === kalien)!.regency;
      ({ state: s } = submit(s, { kind: 'rule-holding', holdingId: h.id, bid: huge }, 'huge-bid'));
      s = step(s, { kind: 'commit', orderId: 'huge-bid', authorization: auth(s) });
      s = finishResponses(s, 'huge-bid');
      const saved = reload(s),
        a = step(
          s,
          { kind: 'resolve', orderId: 'huge-bid', authorization: auth(s) },
          'same-seeded-resolution',
        ),
        b = step(
          saved,
          { kind: 'resolve', orderId: 'huge-bid', authorization: auth(s) },
          'same-seeded-resolution',
        );
      expect(serializeCampaign(a)).toBe(serializeCampaign(b));
      expect(a.realms.find((r) => r.id === kalien)!.regency).toBe(before - huge);
      expect(a.courtActions15!.state.orders[0]!.results[0]!.success).toBe(true);
    }, 30000);
    it('rejects forged action credits, prices, results and duplicate transactions on load', () => {
      let s = init();
      s = execute(s, { kind: 'rule-province', provinceId: owned(s).id }, 'validation');
      const wire = JSON.parse(serializeCampaign(s));
      wire.campaign.courtActions15.state.orders[0].quote.gold = '0';
      expect(() =>
        deserializeCampaign(JSON.stringify(wire), scenario, {
          domainRules: 'birthright-1.5',
          overlayContent: bundle,
        }),
      ).toThrow('projection');
      const bad = JSON.parse(serializeCampaign(s));
      bad.campaign.realms.find((r: { id: string }) => r.id === kalien).actions = 3;
      expect(() =>
        deserializeCampaign(JSON.stringify(bad), scenario, {
          domainRules: 'birthright-1.5',
          overlayContent: bundle,
        }),
      ).toThrow('credits');
      expect(() =>
        step(s, { kind: 'end-slot', authorization: auth(s) }, s.courtActions15!.events[0]!.id),
      ).toThrow('Duplicate');
    }, 30000);
    it('retains all49 installed RP quotes, Spider5, all116 records and exact overlay identities', () => {
      const paths = [
        'packages/world-data/anuire-characters15.json',
        'reference/extracted/anuire/birthright15.characters.json',
      ];
      const hashes = paths.map((p) => createHash('sha256').update(readFileSync(p)).digest('hex'));
      const quotes = regencyCollectionQuotes15(seed, scenario, bundle).filter(
        (q) =>
          q.collectibleRP !== null &&
          ['territorial', 'holding'].includes(
            scenario.realms.find((r) => r.id === q.realmId)!.domainType!,
          ) &&
          seed.realms.find((r) => r.id === q.realmId)!.controller !== 'passive',
      );
      expect(quotes).toHaveLength(49);
      expect(quotes.reduce((n, q) => n + q.collectibleRP!, 0n)).toBe(912n);
      expect(quotes.find((q) => q.realmId === spider)!.collectibleRP).toBe(5n);
      const current = init(raw([spider]));
      expect(courtQuote15(current, spider).effectiveLevel).toBe(1);
      expect(
        developmentOrderQuote15(current, scenario, bundle, auth(current, spider), {
          kind: 'rule-province',
          provinceId: owned(current, spider).id,
        }).targets[0]!.personalBonus,
      ).toBe(0);
      expect(bundle.characters!.records).toHaveLength(116);
      expect(references35(bundle)).toEqual(seed.domainRules.overlays);
      expect(paths.map((p) => createHash('sha256').update(readFileSync(p)).digest('hex'))).toEqual(
        hashes,
      );
      expect(
        applyCommand(current as unknown as Campaign, scenario, spider, { type: 'HoldAction' }).ok,
      ).toBe(false);
      const legacy = createCampaign(scenario, kalien);
      expect(legacy.domainRules.id).toBe('birthright-hd-legacy');
      expect(sourcePotential(scenario, owned(current, spider).id, 5)).toBeGreaterThanOrEqual(0);
      expect(goldUnits(1n)).toBe(1n);
    }, 30000);
  },
);
