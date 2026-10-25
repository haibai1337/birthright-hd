/** Explicit Increment5 commands over the existing campaign, scheduler, RNG and RP journal. */
import { z } from 'zod';
import {
  courtActions15Codec,
  type Birthright15Campaign as State,
  type Scenario,
  type CourtActionsState15,
} from './schema';
import {
  courtRequest15Codec,
  courtProjection15Codec,
  courtQuote15,
  legalCourtSeat15,
  actionOrdinal15,
  palaceUpkeep15,
  courtCostProjection15,
  type CourtRequest15,
  type CourtProjection15,
  type DevelopmentOrder15,
  type DevelopmentQuote15,
} from './court-actions-state15';
import { initializeDomainTurn, nextDomainRound } from './domain-turn';
import { domainResponseOrder, rollDomainCheck } from './domain-actions';
import { compareIds } from './order';
import { rulingRegent } from './regents';
import { sourcePotential } from './selectors';
import { holdingCapacityLimit } from './domains';
import {
  characterActor35,
  character35,
  casting35,
  skillRanks35,
  validateCharacterOverlays35,
  type CharacterOverlays35,
} from './character-sheets';
import { canonicalOverlayJSON } from './overlay-fingerprint';
import {
  applyRegency15,
  regencyProjectionAt15,
  regencyResources15,
  validateRegencyState15,
  type RegencyRequest15,
} from './regency15';
import type { RegencyAuthorization15 } from './regency-state15';
import { goldUnits, goldFromGB, regencyPoints, type GoldUnits } from './quantities';
import {
  economicForecast15,
  economicHoldingGroups15,
  administrateQuote15,
  type EconomicOptions15,
  type EligibleInfrastructureCost15,
} from './economy15';

const normalized = (a: unknown) =>
  JSON.parse(JSON.stringify(a, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
const equal = (a: unknown, b: unknown) =>
  a === undefined || b === undefined
    ? a === b
    : canonicalOverlayJSON(normalized(a)) === canonicalOverlayJSON(normalized(b));
const phase = (s: State) => {
  if (!s.domainTurn) throw new Error('Missing existing domain scheduler');
  return s.domainTurn;
};
const data = (s: State) => {
  if (!s.courtActions15) throw new Error('Explicit court/action initialization required');
  return s.courtActions15;
};
const projection = (s: State) => data(s).state;
const realm = (s: State, id: string) => {
  const r = s.realms.find((r) => r.id === id);
  if (!r) throw new Error('Unknown domain');
  return r;
};
function hasActionBudget(scenario: Scenario, r: State['realms'][number]) {
  const d = scenario.realms.find((d) => d.id === r.id);
  return (
    !r.eliminated &&
    r.controller !== 'passive' &&
    !r.lieutenantOf &&
    d?.domainType !== 'special' &&
    d?.domainType !== 'inactive'
  );
}
function ordinary(s: State, scenario: Scenario, id: string) {
  const r = realm(s, id),
    d = scenario.realms.find((d) => d.id === id);
  if (
    r.eliminated ||
    r.controller === 'passive' ||
    r.lieutenantOf ||
    d?.domainType === 'special' ||
    d?.domainType === 'inactive'
  )
    throw new Error('Domain has no independent action budget');
}
function actor(
  s: State,
  scenario: Scenario,
  b: CharacterOverlays35,
  a: RegencyAuthorization15,
  ruler = false,
) {
  ordinary(s, scenario, a.realmId);
  const kinds = { basic: 'selected-policy', advanced: 'confirmation', expert: 'order' };
  if (kinds[a.mode] !== a.kind || !a.reference.trim())
    throw new Error('Explicit mode-appropriate authorization required');
  const c = characterActor35(b, scenario, s, a.realmId, a.characterId);
  if (!c.eligible) throw new Error(`Unauthorized actor: ${c.reason}`);
  if (ruler && rulingRegent(scenario, a.realmId, s)?.id !== a.characterId)
    throw new Error('Current ruler authorization required');
  // Independent sovereigns are not lieutenants merely because a deployment or candidate exists.
  if (
    s.realms.some(
      (r) =>
        r.id !== a.realmId &&
        !r.eliminated &&
        r.controller !== 'passive' &&
        !r.lieutenantOf &&
        rulingRegent(scenario, r.id, s)?.id === a.characterId,
    )
  )
    throw new Error('An independent ruler retains their own action budget');
}
function context(s: State, scenario: Scenario, b: CharacterOverlays35) {
  if (
    s.domainRules.id !== 'birthright-1.5' ||
    s.scenarioId !== scenario.id ||
    s.scenarioFingerprint !== scenario.fingerprint
  )
    throw new Error('Birthright1.5 scenario mismatch');
  if (!s.regency15) throw new Error('Explicit Increment4 resource initialization required');
  validateCharacterOverlays35(b, scenario, s.domainRules.overlays);
  if (b.characters?.version !== '1.2.0' || b.handlers?.version !== '1.2.0')
    throw new Error('Increment5 requires the installed reviewed1.2.0 overlays');
}
function activeOrders(s: State) {
  return projection(s).orders.filter((o) => o.status !== 'released');
}
function personalAvailable(s: State, id: string) {
  return !activeOrders(s).some(
    (o) =>
      o.quote.seasonIndex === s.turn &&
      o.quote.round === phase(s).round &&
      o.quote.personal &&
      o.quote.characterId === id,
  );
}
function currentSlot(s: State, id: string) {
  const p = phase(s);
  if (projection(s).awaitingMaintenance || p.order[p.cursor] !== id)
    throw new Error('Not this domain scheduler slot');
}
function opportunities(s: State, id: string) {
  const p = phase(s),
    orders = activeOrders(s).filter(
      (o) => o.quote.realmId === id && o.quote.seasonIndex === s.turn && o.quote.round === p.round,
    );
  return {
    standard: realm(s, id).actions > 0 && !orders.some((o) => o.quote.standard),
    court: Array.from({ length: courtQuote15(s, id).extraActions }, (_, i) => i).filter(
      (i) => !orders.some((o) => o.quote.courtSlots.includes(i)),
    ),
  };
}
function group(s: State, holdingId: string) {
  const h = s.holdings.find((h) => h.id === holdingId);
  if (!h || h.destroyed) throw new Error('Holding no longer exists');
  const g = economicHoldingGroups15(s.holdings).find(
    (g) => g.realmId === h.realmId && g.provinceId === h.provinceId && g.type === h.type,
  )!;
  const records = s.holdings.filter(
    (x) =>
      x.realmId === h.realmId && x.provinceId === h.provinceId && x.type === h.type && !x.destroyed,
  );
  if (records.some((x) => x.contested))
    throw new Error('Restoration belongs to Increment7, not Rule growth');
  return { h, g, records };
}
function sourceActor(
  s: State,
  scenario: Scenario,
  b: CharacterOverlays35,
  realmId: string,
  characterId: string,
) {
  return (
    characterActor35(b, scenario, s, realmId, characterId).eligible &&
    casting35(character35(b.characters!, characterId)).sourceRealmMagic
  );
}
function modifierGroups(
  s: State,
  scenario: Scenario,
  b: CharacterOverlays35,
  target: DevelopmentQuote15['targets'][number],
  realmId: string,
  characterId: string,
) {
  if (target.holdingType === null) return [];
  if (target.holdingType === 'source' && !sourceActor(s, scenario, b, realmId, characterId))
    return [];
  return economicHoldingGroups15(s.holdings).filter(
    (g) =>
      g.realmId === realmId &&
      g.provinceId === target.provinceId &&
      g.activeLevel > 0n &&
      g.key !== target.groupKey &&
      (g.type === target.holdingType ||
        (['guild', 'temple'].includes(target.holdingType!) && g.type === 'law')),
  );
}
function canRespond(
  s: State,
  scenario: Scenario,
  b: CharacterOverlays35,
  t: DevelopmentQuote15['targets'][number],
  id: string,
) {
  const r = s.realms.find((r) => r.id === id);
  if (!r || !hasActionBudget(scenario, r)) return false;
  const cid = rulingRegent(scenario, id, s)?.id;
  if (!cid) return false;
  if (!characterActor35(b, scenario, s, id, cid).eligible) return false;
  if (t.holdingType === 'source') {
    const actors = [
      cid,
      ...(s.characters ?? [])
        .filter((c) => c.realmId === id && c.role === 'lieutenant' && c.regentId)
        .map((c) => c.regentId!),
    ];
    // A reviewed mage's existing level0 Source contact permits an RP response,
    // while contributing zero typed levels. Those are independent qualifications.
    return (
      actors.some((characterId) => sourceActor(s, scenario, b, id, characterId)) &&
      s.holdings.some(
        (h) =>
          h.realmId === id &&
          h.provinceId === t.provinceId &&
          h.type === 'source' &&
          !h.destroyed &&
          !h.contested,
      )
    );
  }
  return (
    s.provinces.some((p) => p.id === t.provinceId && p.owner === id) ||
    s.holdings.some(
      (h) => h.realmId === id && h.provinceId === t.provinceId && !h.destroyed && !h.contested,
    )
  );
}
function internalQuote(
  s: State,
  scenario: Scenario,
  b: CharacterOverlays35,
  a: RegencyAuthorization15,
  order: DevelopmentOrder15,
  skipOpportunity = false,
): DevelopmentQuote15 {
  actor(s, scenario, b, a);
  currentSlot(s, a.realmId);
  const court = projection(s).courts.find((c) => c.realmId === a.realmId)!;
  const standard = !('opportunity' in order) || order.opportunity === 'standard';
  const extra = order.kind === 'realm-rule' ? order.targets.length - 1 : standard ? 0 : 1;
  const available = opportunities(s, a.realmId);
  if (
    !skipOpportunity &&
    ((standard && !available.standard) ||
      extra > available.court.length ||
      (standard && !personalAvailable(s, a.characterId)))
  )
    throw new Error('Actual standard, Court or global character opportunity unavailable');
  const bonus = Math.floor(
    (skillRanks35(character35(b.characters!, a.characterId)).administrate ?? 0) / 5,
  );
  if (
    !character35(b.characters!, a.characterId).reconstruction &&
    !character35(b.characters!, a.characterId).exceptionalProfile?.monsterSheet
  )
    throw new Error('Unknown reviewed skill ranks');
  const targets: DevelopmentQuote15['targets'] = [];
  const target = (
    pid: string,
    hid: string | null,
    ht: DevelopmentQuote15['targets'][number]['holdingType'],
    gkey: string | null,
    l: number,
    cost: GoldUnits,
    bid: bigint,
  ) => {
    const p = s.provinces.find((p) => p.id === pid);
    if (!p) throw new Error('Unknown province');
    const t = {
      provinceId: pid,
      holdingId: hid,
      holdingType: ht,
      groupKey: gkey,
      level: l,
      dc: 10 + l,
      personalBonus: standard ? bonus : 0,
      gold: cost,
      bid: regencyPoints(bid),
      responders: [] as string[],
    };
    if (ht)
      t.responders = domainResponseOrder(
        s.realms.filter((r) => canRespond(s, scenario, b, t, r.id)).map((r) => r.id),
      );
    targets.push(t);
  };
  if (order.kind === 'create-holding') {
    if (
      s.holdings.some(
        (h) =>
          h.realmId === a.realmId &&
          h.provinceId === order.provinceId &&
          h.type === order.holdingType &&
          !h.destroyed,
      )
    )
      throw new Error('Equivalent active contact already exists');
    if (order.holdingType === 'source' && !sourceActor(s, scenario, b, a.realmId, a.characterId))
      throw new Error('Source development requires a reviewed true-arcane actor');
    target(order.provinceId, null, order.holdingType, null, 0, goldFromGB(1n), order.bid);
  } else if (order.kind === 'rule-holding' || order.kind === 'realm-rule') {
    const requested = order.kind === 'rule-holding' ? [order] : order.targets;
    const provinces = new Set<string>(),
      hosts = new Set<string>(),
      types = new Set<string>();
    for (const t of requested) {
      const { h, g, records } = group(s, t.holdingId),
        p = s.provinces.find((p) => p.id === h.provinceId)!;
      if (h.realmId !== a.realmId) throw new Error('Only the legal holding owner can Rule');
      if (h.type === 'source' && !sourceActor(s, scenario, b, a.realmId, a.characterId))
        throw new Error('Source development requires a reviewed true-arcane actor');
      const used = s.holdings
        .filter((x) => x.provinceId === p.id && x.type === h.type && !x.destroyed)
        .reduce((n, x) => n + x.level, 0);
      const cap = h.type === 'source' ? sourcePotential(scenario, p.id, p.level) : p.level;
      if (used >= cap || g.activeLevel >= 10n || !records.some((r) => r.level < 15))
        throw new Error('No lawful capacity; imported excess is preserved, not expanded');
      if (provinces.has(p.id)) throw new Error('Repeat logical target/province in Realm Rule');
      provinces.add(p.id);
      hosts.add(p.owner);
      types.add(h.type);
      target(p.id, h.id, h.type, g.key, Number(g.activeLevel), goldFromGB(1n), t.bid);
    }
    if (hosts.size !== 1 || types.size !== 1)
      throw new Error('Realm Rule requires one host sovereignty and one holding type');
  } else if (order.kind === 'rule-province') {
    const p = s.provinces.find((p) => p.id === order.provinceId),
      def = scenario.provinces.find((p) => p.id === order.provinceId);
    if (
      !p ||
      p.owner !== a.realmId ||
      (p.occupiedBy && p.occupiedBy !== a.realmId) ||
      p.militaryContested ||
      p.contested
    )
      throw new Error('Rule Province requires uncontested sovereignty without hostile occupation');
    if (p.level >= Math.min(10, def?.maxLevel ?? 10))
      throw new Error('Province development capacity reached');
    if (
      activeOrders(s).some(
        (o) =>
          o.quote.realmId === a.realmId &&
          o.quote.seasonIndex === s.turn &&
          o.order.kind === 'rule-province',
      )
    )
      throw new Error('One Rule Province attempt per domain/season');
    target(p.id, null, null, null, p.level, goldFromGB(BigInt(p.level)), 0n);
  } else if (order.kind === 'increase-court') {
    if (
      activeOrders(s).some(
        (o) =>
          o.quote.realmId === a.realmId &&
          o.quote.seasonIndex === s.turn &&
          o.order.kind === 'increase-court',
      )
    )
      throw new Error('Court increase limited to +1 per domain/season');
    const q = courtQuote15(s, a.realmId);
    if (!q.legalSeat || q.capacity < court.level + 1 || q.effectiveLevel < court.level)
      throw new Error('Court increase needs a reviewed legal seat and funded capacity');
  } else {
    if (!legalCourtSeat15(s, a.realmId, order.provinceId))
      throw new Error('Palace needs a lawful owned/permitted location');
    if (
      projection(s).palaces.some(
        (p) =>
          p.realmId === a.realmId &&
          p.provinceId === order.provinceId &&
          p.builds.some((b) => !b.completed),
      )
    )
      throw new Error('Palace level already under construction');
  }
  return {
    seasonIndex: s.turn,
    round: phase(s).round,
    realmId: a.realmId,
    characterId: a.characterId,
    standard,
    courtSlots: available.court.slice(0, extra),
    personal: standard,
    targets,
    gold: goldUnits(
      targets.reduce(
        (n, t) => n + t.gold,
        order.kind === 'increase-court' ? 120n : order.kind === 'build-palace' ? 720n : 0n,
      ),
    ),
    rp: regencyPoints(targets.reduce((n, t) => n + t.bid, 0n)),
    skill: 'administrate',
  };
}
export function developmentOrderQuote15(
  s: State,
  scenario: Scenario,
  b: CharacterOverlays35,
  a: RegencyAuthorization15,
  order: DevelopmentOrder15,
) {
  context(s, scenario, b);
  validateCourtActions15(s, scenario, b);
  const parsed = z.encode(courtRequest15Codec, {
    kind: 'reserve',
    orderId: 'quote',
    authorization: a,
    order,
  });
  void parsed;
  const quote = internalQuote(s, scenario, b, a, order),
    funds = regencyResources15(s, a.realmId);
  return {
    ...quote,
    funded: quote.gold <= funds.goldAvailable && quote.rp <= funds.availableForNewObligations,
  };
}
/** Read-only shared handoff for later magic/political orders. It grants no action type. */
export function actionOpportunities15(
  s: State,
  scenario: Scenario,
  b: CharacterOverlays35,
  realmId: string,
  characterId: string,
) {
  context(s, scenario, b);
  validateCourtActions15(s, scenario, b);
  let permission = characterActor35(b, scenario, s, realmId, characterId);
  try {
    actor(s, scenario, b, {
      realmId,
      characterId,
      mode: 'expert',
      kind: 'order',
      reference: 'read-only-availability',
    });
  } catch (error) {
    permission = {
      eligible: false,
      reason: error instanceof Error ? error.message : 'unavailable-actor',
    };
  }
  const pending = projection(s).orders.find((o) => o.status === 'committed');
  const inSlot =
    !pending && !projection(s).awaitingMaintenance && phase(s).order[phase(s).cursor] === realmId;
  const available = opportunities(s, realmId);
  return {
    realmId,
    characterId,
    seasonIndex: s.turn,
    round: phase(s).round,
    actor: permission,
    standardAvailable: permission.eligible && inSlot && available.standard,
    personalAvailable: permission.eligible && personalAvailable(s, characterId),
    courtSlots: permission.eligible && inSlot ? available.court : [],
    awaitingMaintenance: projection(s).awaitingMaintenance,
    pendingOrderId: pending?.id ?? null,
  };
}
type Financial = (id: string, request: RegencyRequest15) => void;
function financialReservation(
  f: Financial,
  id: string,
  a: RegencyAuthorization15,
  gold: GoldUnits,
  bid: bigint,
  stage: 'reserve' | 'commit' | 'release' | 'pay',
) {
  if (stage === 'reserve')
    f(`${id}-reserve`, {
      kind: 'reserve',
      authorization: a,
      reservation: {
        id,
        obligationId: id,
        purpose: bid > 0n ? 'bid' : 'obligation',
        gold,
        rp: regencyPoints(bid),
        targetRealmId: null,
      },
    });
  else f(`${id}-${stage}`, { kind: stage, authorization: a, reservationId: id });
}
const paymentId = (id: string, i: number) => `inc5-${id}-${i}`;
function orderPayments(
  o: CourtProjection15['orders'][number],
  f: Financial,
  stage: 'reserve' | 'commit' | 'release' | 'pay',
) {
  const entries = o.quote.targets.length
    ? o.quote.targets
    : [{ gold: o.quote.gold, bid: regencyPoints(0n) }];
  entries.forEach((t, i) =>
    financialReservation(f, paymentId(o.id, i), o.authorization, t.gold, t.bid, stage),
  );
}
function completeBuildings(s: State) {
  for (const p of projection(s).palaces)
    for (const b of p.builds)
      if (!b.completed && b.dueOrdinal <= actionOrdinal15(s.turn, phase(s).round)) {
        b.completed = true;
        p.level++;
        // Capital does not include upkeep. Newly completed levels require real support payment.
      }
}
function reduce(
  s: State,
  scenario: Scenario,
  b: CharacterOverlays35,
  eventId: string,
  r: CourtRequest15,
  f: Financial,
) {
  const p = projection(s),
    ph = phase(s);
  if (p.orders.some((o) => o.status === 'committed') && !['respond', 'resolve'].includes(r.kind))
    throw new Error('Finish the existing deterministic response window first');
  if (r.kind === 'resume-season') {
    if (
      !p.awaitingMaintenance ||
      s.turn !== p.seasonIndex + 1 ||
      s.regency15?.state.boundary ||
      s.regency15?.state.lastClosedSeason !== s.turn - 1
    )
      throw new Error('Real orchestrator must finish the previous season and RP boundary first');
    if (p.orders.some((o) => o.status === 'reserved' || o.status === 'committed'))
      throw new Error('Pending orders block a new season');
    initializeDomainTurn(s, false);
    p.seasonIndex = s.turn;
    p.awaitingMaintenance = false;
    for (const realm of s.realms) realm.actions = hasActionBudget(scenario, realm) ? 3 : 0;
    while (!hasActionBudget(scenario, realm(s, phase(s).order[phase(s).cursor]!))) {
      phase(s).cursor++;
      if (phase(s).cursor >= phase(s).order.length)
        throw new Error('No ordinary domain has an action budget');
    }
    completeBuildings(s);
    return;
  }
  if (s.turn !== p.seasonIndex) throw new Error('Explicit seasonal action handoff required');
  actor(s, scenario, b, r.authorization, ['host-consent', 'seat', 'appoint'].includes(r.kind));
  if (r.kind === 'host-consent') {
    if (!s.provinces.some((p) => p.id === r.provinceId && p.owner === r.authorization.realmId))
      throw new Error('Only actual sovereign may grant host consent');
    realm(s, r.guestRealmId);
    const prior = p.consents.find(
      (c) => c.provinceId === r.provinceId && c.guestRealmId === r.guestRealmId,
    );
    const consent = {
      provinceId: r.provinceId,
      hostRealmId: r.authorization.realmId,
      guestRealmId: r.guestRealmId,
      allowed: r.allowed,
    };
    if (prior) Object.assign(prior, consent);
    else p.consents.push(consent);
    return;
  }
  if (r.kind === 'seat') {
    if (!legalCourtSeat15(s, r.authorization.realmId, r.provinceId))
      throw new Error('No owned seat or real positive holding with host consent');
    p.courts.find((c) => c.realmId === r.authorization.realmId)!.seat = r.provinceId;
    return;
  }
  if (r.kind === 'appoint') {
    const e = b.handlers!.records.find(
      (h) =>
        h.realmId === r.authorization.realmId &&
        h.characterId === r.characterId &&
        h.authority === 'lieutenant' &&
        h.review === 'evidence-checked' &&
        h.validFromTurn <= s.turn &&
        (h.validThroughTurn === null || h.validThroughTurn >= s.turn),
    );
    if (!e || !casting35(character35(b.characters!, r.characterId)).approved)
      throw new Error('Appointment requires a reviewed character-side authority context');
    if (
      s.realms.some(
        (x) =>
          !x.eliminated &&
          x.controller !== 'passive' &&
          !x.lieutenantOf &&
          rulingRegent(scenario, x.id, s)?.id === r.characterId,
      )
    )
      throw new Error('Independent ruler cannot be appointed as an assimilated lieutenant');
    if (!personalAvailable(s, r.characterId)) throw new Error('Actor already reserved this round');
    const d = s.characters?.find(
      (c) => c.regentId === r.characterId && c.realmId === r.authorization.realmId,
    );
    if (
      !d ||
      !s.provinces.some((p) => p.id === r.provinceId) ||
      s.characters!.filter((c) => c.regentId === r.characterId).length !== 1
    )
      throw new Error(
        'A genuine unique character deployment is required; candidate lists do not appoint',
      );
    d.role = 'lieutenant';
    d.provinceId = r.provinceId;
    if (p.appointments.some((a) => a.characterId === r.characterId))
      throw new Error('Character already explicitly appointed');
    p.appointments.push({
      realmId: d.realmId,
      characterId: r.characterId,
      deploymentId: d.id,
      reference: eventId,
      seasonIndex: s.turn,
    });
    return;
  }
  if (r.kind === 'nominate-administrate') {
    if (
      p.nominations.some(
        (n) =>
          n.seasonIndex === s.turn &&
          (n.realmId === r.authorization.realmId || n.characterId === r.authorization.characterId),
      )
    )
      throw new Error('One named Administrate nominee per domain and global actor/season');
    if (s.regency15?.state.boundary)
      throw new Error('Nominate before the forthcoming obligation snapshot');
    if (!personalAvailable(s, r.authorization.characterId))
      throw new Error('Named actor is unavailable');
    p.nominations.push({
      realmId: r.authorization.realmId,
      characterId: r.authorization.characterId,
      seasonIndex: s.turn,
      reference: eventId,
      status: 'pending-maintenance',
    });
    return;
  }
  if (r.kind === 'fund-palace' || r.kind === 'fund-court') {
    let cost: GoldUnits;
    if (r.kind === 'fund-palace') {
      const a = p.palaces.find((a) => a.id === r.palaceId && a.realmId === r.authorization.realmId);
      if (!a || !legalCourtSeat15(s, a.realmId, a.provinceId))
        throw new Error('Unavailable or foreign palace');
      const funded = a.fundedSeason === s.turn ? a.fundedLevel : 0;
      if (a.level <= funded) throw new Error('Palace upkeep already funded or no completed levels');
      cost = palaceUpkeep15(a.level - funded);
      a.fundedSeason = s.turn;
      a.fundedLevel = a.level;
    } else {
      const c = p.courts.find((c) => c.realmId === r.authorization.realmId)!;
      if (c.fundedThroughSeason >= s.turn) throw new Error('Court support already recorded');
      cost = courtQuote15(s, c.realmId).upkeep;
      c.fundedThroughSeason = s.turn;
    }
    const id = paymentId(eventId, 0);
    for (const stage of ['reserve', 'commit', 'pay'] as const)
      financialReservation(f, id, r.authorization, cost, 0n, stage);
    return;
  }
  if (r.kind === 'end-slot') {
    currentSlot(s, r.authorization.realmId);
    if (p.orders.some((o) => o.status === 'reserved' || o.status === 'committed'))
      throw new Error('Resolve or release all pending orders before advancing');
    const spent = activeOrders(s).some(
      (o) =>
        o.quote.realmId === r.authorization.realmId &&
        o.quote.seasonIndex === s.turn &&
        o.quote.round === ph.round &&
        o.quote.standard,
    );
    if (!spent)
      realm(s, r.authorization.realmId).actions = Math.max(
        0,
        realm(s, r.authorization.realmId).actions - 1,
      );
    p.endedSlots.push({ seasonIndex: s.turn, round: ph.round, realmId: r.authorization.realmId });
    ph.cursor++;
    while (true) {
      if (ph.cursor >= ph.order.length) {
        if (!nextDomainRound(ph)) {
          ph.cursor = ph.order.length - 1;
          p.awaitingMaintenance = true;
          break;
        }
        completeBuildings(s);
      }
      const next = realm(s, ph.order[ph.cursor]!);
      if (!hasActionBudget(scenario, next)) {
        ph.cursor++;
        continue;
      }
      break;
    }
    return;
  }
  if (r.kind === 'reserve') {
    if (p.orders.some((o) => o.id === r.orderId)) throw new Error('Duplicate development order ID');
    if (p.orders.some((o) => o.status === 'committed'))
      throw new Error('Existing deterministic response window must finish first');
    const quote = internalQuote(s, scenario, b, r.authorization, r.order);
    const o = {
      id: r.orderId,
      authorization: r.authorization,
      order: r.order,
      quote,
      status: 'reserved' as const,
      index: 0,
      responseIndex: 0,
      contributions: [],
      results: [],
    };
    orderPayments(o, f, 'reserve');
    p.orders.push(o);
    return;
  }
  const o = p.orders.find((o) => o.id === r.orderId);
  if (!o) throw new Error('Unknown development order');
  if (r.kind !== 'respond' && !equal(r.authorization, o.authorization))
    throw new Error('Only the exact authorizing actor may advance this order');
  if (r.kind === 'release') {
    if (o.status !== 'reserved')
      throw new Error('Committed or resolved order cannot be canceled or rerolled');
    orderPayments(o, f, 'release');
    o.status = 'released';
    return;
  }
  if (r.kind === 'commit') {
    if (o.status !== 'reserved' || p.orders.some((x) => x.status === 'committed'))
      throw new Error('Order is not exclusively reserved');
    // Requote against live assets after removing only this order's opportunity holds.
    o.status = 'released';
    const q = internalQuote(s, scenario, b, o.authorization, o.order);
    o.status = 'reserved';
    if (!equal(q, o.quote))
      throw new Error('Order quote is stale; release and submit a fresh order');
    orderPayments(o, f, 'commit');
    orderPayments(o, f, 'pay');
    o.status = 'committed';
    if (o.quote.standard) realm(s, o.quote.realmId).actions--;
    return;
  }
  if (o.status !== 'committed') throw new Error('Order is not pending resolution');
  const t = o.quote.targets[o.index];
  if (r.kind === 'respond') {
    if (!t || t.responders[o.responseIndex] !== r.authorization.realmId)
      throw new Error('Not the current deterministic response window');
    if (
      t.holdingType === 'source' &&
      !sourceActor(s, scenario, b, r.authorization.realmId, r.authorization.characterId)
    )
      throw new Error('Source response requires the actual qualified mage');
    if (o.contributions.some((c) => c.realmId === r.authorization.realmId))
      throw new Error('One contribution per responder/target');
    const legal = modifierGroups(
        s,
        scenario,
        b,
        t,
        r.authorization.realmId,
        r.authorization.characterId,
      ),
      keys = new Set<string>();
    let levels = 0;
    for (const id of r.holdingIds) {
      const { g } = group(s, id);
      if (!legal.some((x) => x.key === g.key) || keys.has(g.key))
        throw new Error('Illegal or duplicated typed holding modifier');
      keys.add(g.key);
      levels += Number(g.activeLevel);
    }
    if (r.authorization.realmId === o.quote.realmId && r.side === 'oppose')
      throw new Error('Acting domain cannot create opposition to its own order');
    if (r.bid > 0n)
      for (const stage of ['reserve', 'commit', 'pay'] as const)
        financialReservation(
          f,
          paymentId(eventId, 0),
          r.authorization,
          goldUnits(0n),
          r.bid,
          stage,
        );
    o.contributions.push({
      realmId: r.authorization.realmId,
      characterId: r.authorization.characterId,
      side: r.side,
      groupKeys: [...keys].sort(compareIds),
      levels,
      bid: r.bid,
    });
    o.responseIndex++;
    return;
  }
  if (t && o.responseIndex < t.responders.length)
    throw new Error('Required response windows remain open');
  if (t) {
    const signed = o.contributions.reduce(
      (n, c) => n + (c.side === 'support' ? 1n : -1n) * (BigInt(c.levels) + c.bid),
      0n,
    );
    const threshold = BigInt(t.dc - t.personalBonus) - t.bid - signed;
    const result = rollDomainCheck(s, threshold);
    o.results.push({ provinceId: t.provinceId, ...result, threshold: threshold.toString() });
    if (result.success) {
      const province = s.provinces.find((p) => p.id === t.provinceId)!;
      if (o.order.kind === 'rule-province') {
        const oldPotential = sourcePotential(scenario, province.id, province.level);
        province.level++;
        const potential = sourcePotential(scenario, province.id, province.level);
        // Reuse the recovered capacity and grandfather policy. Never delete Source identities.
        // Elven/geographic exceptions and initial excess survive; only later developed excess can fall.
        if (potential < oldPotential) {
          const sources = s.holdings.filter(
            (h) => h.provinceId === province.id && h.type === 'source' && !h.destroyed,
          );
          let excess =
            sources.reduce((n, h) => n + h.level, 0) -
            holdingCapacityLimit(scenario, province.id, 'source', potential);
          while (excess-- > 0) {
            const largest = sources
              .filter((h) => h.level > 0)
              .sort((a, b) => b.level - a.level || compareIds(a.id, b.id))[0];
            if (largest) largest.level--;
          }
        }
      } else if (o.order.kind === 'create-holding') {
        const id = `holding-${s.nextId++}`;
        if (s.holdings.some((h) => h.id === id))
          throw new Error('Cannot safely allocate a new holding identity');
        s.holdings.push({
          id,
          realmId: o.quote.realmId,
          provinceId: province.id,
          type: t.holdingType!,
          level: 0,
          contested: false,
        });
      } else {
        const { records } = group(s, t.holdingId!);
        const writable = [...records]
          .filter((h) => h.level < 15)
          .sort((a, b) => compareIds(a.id, b.id))[0];
        if (!writable) throw new Error('No safe constituent record for development');
        writable.level++;
      }
    }
    o.index++;
    o.responseIndex = 0;
    o.contributions = [];
  }
  if (!t || o.index === o.quote.targets.length) {
    if (o.order.kind === 'increase-court') {
      const c = p.courts.find((c) => c.realmId === o.quote.realmId)!;
      c.level++;
      c.actionLevels.push({ ordinal: actionOrdinal15(s.turn, ph.round) + 1, level: c.level });
      c.upkeepLevels.push({ seasonIndex: s.turn + 1, level: c.level });
    }
    if (o.order.kind === 'build-palace') {
      let palace = p.palaces.find(
        (a) =>
          a.realmId === o.quote.realmId &&
          a.provinceId === (o.order as { provinceId: string }).provinceId,
      );
      if (!palace) {
        palace = {
          id: `palace-${s.nextId++}`,
          realmId: o.quote.realmId,
          provinceId: o.order.provinceId,
          level: 0,
          fundedSeason: s.turn,
          fundedLevel: 0,
          builds: [],
        };
        p.palaces.push(palace);
      }
      palace.builds.push({
        orderId: o.id,
        builtSeason: s.turn,
        dueOrdinal: actionOrdinal15(s.turn, ph.round) + 1,
        completed: false,
      });
    }
    o.status = 'completed';
  }
}
function openingProjection(open: CourtActionsState15['opening']): CourtProjection15 {
  return {
    seasonIndex: open.seasonIndex,
    awaitingMaintenance: false,
    courts: open.realms.map((r) => ({
      realmId: r.id,
      level: r.court ?? 1,
      seat: null,
      grandfather: (r.court ?? 1) === 1,
      fundedThroughSeason: open.seasonIndex,
      actionLevels: [
        { ordinal: actionOrdinal15(open.seasonIndex, open.domainTurn.round), level: r.court ?? 1 },
      ],
      upkeepLevels: [{ seasonIndex: open.seasonIndex, level: r.court ?? 1 }],
    })),
    consents: [],
    palaces: [],
    appointments: [],
    orders: [],
    endedSlots: [],
    nominations: [],
  };
}
export function initializeCourtActions15(
  s: State,
  scenario: Scenario,
  b: CharacterOverlays35,
): State {
  context(s, scenario, b);
  validateRegencyState15(s, scenario, false, b);
  if (s.seasonFlow && s.seasonFlow.phase !== 'actions')
    throw new Error(
      'Court actions require an explicit action-phase checkpoint; Council/Maintenance are not bypassed',
    );
  if (s.courtActions15 || s.pendingDomainAction)
    throw new Error('Court/action state already initialized or legacy dispute pending');
  if (
    (s.domainTurn && (s.domainTurn.round !== 1 || s.domainTurn.cursor !== 0)) ||
    s.realms.some((r) => hasActionBudget(scenario, r) && r.actions !== 3)
  )
    throw new Error(
      'An unused seasonal action checkpoint is required; prior actor/slot usage is never invented',
    );
  const n = structuredClone(s);
  if (!n.domainTurn) initializeDomainTurn(n, true);
  const opening = {
    seasonIndex: n.turn,
    rng: n.rng,
    nextId: n.nextId,
    domainTurn: structuredClone(n.domainTurn!),
    realms: n.realms.map((r) => ({
      id: r.id,
      regentId: r.regentId,
      actions: r.actions,
      eliminated: r.eliminated,
      controller: r.controller,
      lieutenantOf: r.lieutenantOf,
      court: r.court,
    })),
    provinces: structuredClone(n.provinces),
    holdings: structuredClone(n.holdings),
    ...(n.characters ? { characters: structuredClone(n.characters) } : {}),
  };
  n.courtActions15 = { version: 1, opening, events: [], state: openingProjection(opening) };
  validateCourtActions15(n, scenario, b);
  return n;
}
/** Validates deterministic effects and financial links; never credits or executes anything on load. */
export function validateCourtActions15(
  s: State,
  scenario?: Scenario,
  b?: CharacterOverlays35,
  allowSeasonHandoff = false,
) {
  const d = s.courtActions15;
  if (!d) return;
  const wire = z.encode(courtActions15Codec, d);
  if (!s.regency15) throw new Error('Court actions require the shared RP journal');
  if (new Set(d.events.map((e) => e.id)).size !== d.events.length)
    throw new Error('Duplicate court/action transaction ID');
  // Structure alone is sufficient for serialization; full semantic replay is mandatory on load/execution.
  if (!scenario || !b) return;
  const shadow = structuredClone(s),
    open = d.opening;
  if (
    open.domainTurn.round !== 1 ||
    open.domainTurn.cursor !== 0 ||
    open.realms.some(
      (r) => hasActionBudget(scenario, { ...realm(s, r.id), ...r }) && r.actions !== 3,
    )
  )
    throw new Error('Invalid unused seasonal action checkpoint');
  shadow.turn = open.seasonIndex;
  shadow.rng = open.rng;
  shadow.nextId = open.nextId;
  shadow.domainTurn = structuredClone(open.domainTurn);
  shadow.provinces = structuredClone(open.provinces);
  shadow.holdings = structuredClone(open.holdings);
  shadow.characters = structuredClone(open.characters);
  for (const r of open.realms) {
    const dest = realm(shadow, r.id);
    for (const k of [
      'regentId',
      'actions',
      'eliminated',
      'controller',
      'lieutenantOf',
      'court',
    ] as const) {
      if (r[k] === undefined) delete dest[k];
      else Object.assign(dest, { [k]: r[k] });
    }
  }
  shadow.courtActions15 = { version: 1, opening: open, events: [], state: openingProjection(open) };
  const expectedFinancial = new Set<string>();
  let resourceCount = 0;
  for (const e of d.events) {
    if (e.request.kind === 'resume-season') shadow.turn = e.seasonIndex;
    if (e.seasonIndex !== shadow.turn || e.round !== phase(shadow).round)
      throw new Error('Court event season/round replay mismatch');
    if (e.resourceEventCount < resourceCount)
      throw new Error('Order resources cannot precede earlier commitments');
    shadow.regency15 = {
      ...s.regency15,
      events: s.regency15.events.slice(0, e.resourceEventCount),
      state: regencyProjectionAt15(s, e.resourceEventCount),
    };
    let financeIndex = e.resourceEventCount;
    reduce(shadow, scenario, b, e.id, e.request, (id, request) => {
      if (expectedFinancial.has(id)) throw new Error('Duplicate financial link');
      expectedFinancial.add(id);
      const entry = s.regency15!.events[financeIndex++];
      if (!entry || entry.id !== id || entry.seasonIndex !== e.seasonIndex)
        throw new Error('Missing or reordered order resource commitment');
      const actual = entry.operation;
      if (request.kind === 'reserve' && actual.kind === 'reserve') {
        if (
          !equal(actual.authorization, request.authorization) ||
          !equal(
            {
              ...actual.reservation,
              status: undefined,
              seasonIndex: undefined,
              realmId: undefined,
              characterId: undefined,
            },
            request.reservation,
          )
        )
          throw new Error('Order resource price or payer mismatch');
      } else if (!equal(actual, request)) throw new Error('Order resource lifecycle mismatch');
    });
    resourceCount = financeIndex;
    shadow.courtActions15!.events.push(e);
  }
  for (const e of s.regency15.events) {
    const op = e.operation;
    const reservationId =
      'reservationId' in op ? op.reservationId : op.kind === 'reserve' ? op.reservation.id : null;
    if (
      (e.id.startsWith('inc5-') || reservationId?.startsWith('inc5-')) &&
      !expectedFinancial.has(e.id)
    )
      throw new Error('Court-owned resource commitment was changed outside its order');
  }
  const projectionWire = z.encode(courtProjection15Codec, shadow.courtActions15.state);
  if (!equal(projectionWire, wire.state))
    throw new Error('Court/action journal projection mismatch');
  const handoff =
    allowSeasonHandoff &&
    shadow.courtActions15.state.awaitingMaintenance &&
    shadow.turn + 1 === s.turn;
  if (
    (shadow.turn !== s.turn && !handoff) ||
    shadow.rng !== s.rng ||
    shadow.nextId !== s.nextId ||
    !equal(shadow.domainTurn, s.domainTurn) ||
    !equal(shadow.provinces, s.provinces) ||
    !equal(shadow.holdings, s.holdings) ||
    !equal(shadow.characters, s.characters)
  )
    throw new Error('Court/action world, scheduler or RNG replay mismatch');
  for (const r of shadow.realms) {
    const actual = realm(s, r.id);
    if (r.actions !== actual.actions) throw new Error('Fabricated domain action credits');
    for (const k of ['regentId', 'eliminated', 'controller', 'lieutenantOf', 'court'] as const)
      if (r[k] !== actual[k])
        throw new Error('Action authority changed outside its recorded handoff');
  }
}
export function applyCourtAction15(
  s: State,
  scenario: Scenario,
  b: CharacterOverlays35,
  id: string,
  request: CourtRequest15,
): State {
  context(s, scenario, b);
  validateRegencyState15(s, scenario, false, b);
  validateCourtActions15(s, scenario, b, request.kind === 'resume-season');
  const n = structuredClone(s),
    d = data(n);
  if (d.events.some((e) => e.id === id) || s.regency15!.events.some((e) => e.id === id))
    throw new Error('Duplicate transaction ID');
  const event = {
    id,
    seasonIndex: s.turn,
    round: phase(s).round,
    resourceEventCount: s.regency15!.events.length,
    request,
  };
  z.encode(courtActions15Codec, { ...d, events: [...d.events, event] });
  const finances: { id: string; request: RegencyRequest15 }[] = [];
  reduce(n, scenario, b, id, structuredClone(request), (id, request) =>
    finances.push({ id, request }),
  );
  d.events.push(structuredClone(event));
  let result = n;
  for (const f of finances) result = applyRegency15(result, scenario, b, f.id, f.request);
  validateCourtActions15(result, scenario, b);
  return result;
}
export function courtEconomicOptions15(
  s: State,
): Pick<EconomicOptions15, 'courtLevels' | 'infrastructure'> {
  return courtCostProjection15(s);
}
export function administrateNominationQuote15(
  s: State,
  scenario: Scenario,
  b: CharacterOverlays35,
  realmId: string,
  infrastructure: NonNullable<EconomicOptions15['infrastructure']> = [],
) {
  context(s, scenario, b);
  validateCourtActions15(s, scenario, b);
  const nomination = projection(s).nominations.find(
    (n) => n.realmId === realmId && n.seasonIndex === s.turn,
  );
  const all = [...courtCostProjection15(s).infrastructure, ...infrastructure];
  const forecast = economicForecast15(s, scenario, realmId, { overlays: b, infrastructure });
  const eligible = new Map(
    all
      .filter(
        (a) =>
          ['palace', 'road', 'bridge'].includes(a.kind) &&
          a.paid &&
          a.supported &&
          ['recorded-contract', 'verified-existing'].includes(a.evidence),
      )
      .map((a) => [
        a.id,
        { kind: a.kind as EligibleInfrastructureCost15['kind'], base: a.administrateBase },
      ]),
  );
  const costs: EligibleInfrastructureCost15[] = forecast.lines
    .filter(
      (l) =>
        l.direction === 'expense' &&
        (l.stream === 'fort' ||
          (l.stream === 'infrastructure' && l.assetIds.some((id) => eligible.has(id)))) &&
        l.status === 'priced' &&
        l.amount !== null,
    )
    .map((l) => ({
      key: l.key,
      kind: l.stream === 'fort' ? 'fort' : eligible.get(l.assetIds[0]!)!.kind,
      amount: l.stream === 'fort' ? l.amount! : (eligible.get(l.assetIds[0]!)!.base ?? l.amount!),
    }));
  const quote = administrateQuote15(
    s,
    scenario,
    b,
    realmId,
    costs,
    nomination ? { characterId: nomination.characterId } : undefined,
  );
  return {
    nomination: nomination ?? null,
    quote,
    status: 'pending-maintenance' as const,
    executionActive: false as const,
    handoffKey: nomination ? `administrate-${nomination.seasonIndex}-${realmId}` : null,
    requiresAvailabilityAtSnapshot: true,
  };
}
