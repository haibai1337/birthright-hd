/** Explicit Increment 4 transitions only. Never called by legacy commands or season scheduling. */
import { z } from 'zod';
import type { Birthright15Campaign, Scenario } from './schema';
import { domainRulesOf } from './domain-rules';
import { rulingRegent } from './regents';
import { canonicalOverlayJSON } from './overlay-fingerprint';
import {
  character35,
  characterActor35,
  casting35,
  rating35,
  ratingPercent35,
  eligibleRating35,
  wholeRatedRP35,
  validateCharacterOverlays35,
  isRegencyOverlayVersion35,
  type CharacterOverlays35,
} from './character-sheets';
import {
  regencyPoints as rp,
  goldUnits as gb,
  goldFromGB,
  GOLD_UNITS_PER_GB,
  type RegencyPoints,
  type GoldUnits,
} from './quantities';
import {
  regencyState15Codec,
  regencyProjection15Codec,
  type RegencyState15,
  type RegencyProjection15,
  type RegencyOperation15,
  type RegencyAuthorization15,
  type CollectionQuote15,
  type RegencyReservation15,
  type PayrollSelection15,
} from './regency-state15';
import { economicForecast15, type EconomicForecast15 } from './economy15';

const categories = ['province', 'law', 'guild', 'temple', 'source'] as const;
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sum = (xs: readonly bigint[]) => xs.reduce((a, b) => a + b, 0n);
function integer(n: number) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Expected a nonnegative safe index/level');
  return BigInt(n);
}
function require15(state: Birthright15Campaign, scenario: Scenario) {
  if (domainRulesOf(state).id !== 'birthright-1.5')
    throw new Error('Requires explicit Birthright 1.5 rules');
  if (state.scenarioId !== scenario.id || state.scenarioFingerprint !== scenario.fingerprint)
    throw new Error('Regency scenario identity mismatch');
  integer(state.turn);
  if (
    new Set(state.provinces.map((p) => p.id)).size !== state.provinces.length ||
    new Set(state.holdings.map((h) => h.id)).size !== state.holdings.length
  )
    throw new Error('Duplicate RP source identity');
}
function originals(scenario: Scenario) {
  return [
    ...new Map(
      [...(scenario.regents ?? []), ...scenario.realms.map((r) => r.regent)].map((r) => [r.id, r]),
    ).values(),
  ].sort((a, b) => compare(a.id, b.id));
}
function rulers(state: Birthright15Campaign, scenario: Scenario) {
  return [...state.realms]
    .sort((a, b) => compare(a.id, b.id))
    .map((r) => {
      const c = rulingRegent(scenario, r.id, state);
      if (!c) throw new Error('Missing ruler identity');
      return { realmId: r.id, characterId: c.id };
    });
}
function initialProjection(data: Omit<RegencyState15, 'state'>): RegencyProjection15 {
  return {
    accounts: structuredClone(data.opening.accounts),
    rulers: structuredClone(data.opening.rulers),
    bloodlines: data.opening.bloodlines.map((b) => ({
      ...b,
      currentScore: b.originalScore,
      streak: 0,
      lastQualifiedBoundary: null,
      growthYear: Math.floor((data.startedSeason - 1) / 4),
      growthCount: 0,
    })),
    reservations: [],
    receipts: [],
    lastClosedSeason: null,
    boundary: null,
  };
}
const account = (p: RegencyProjection15, id: string) => {
  const a = p.accounts.find((a) => a.realmId === id);
  if (!a) throw new Error('Unknown resource account');
  return a;
};
const bloodline = (p: RegencyProjection15, id: string) => {
  const b = p.bloodlines.find((b) => b.characterId === id);
  if (!b) throw new Error('Unknown bloodline identity');
  return b;
};
function balances(p: RegencyProjection15, id: string) {
  const a = account(p, id),
    active = p.reservations.filter(
      (r) => r.realmId === id && ['reserved', 'committed'].includes(r.status),
    );
  const reserved = rp(sum(active.filter((r) => r.status === 'reserved').map((r) => r.rp))),
    committed = rp(sum(active.filter((r) => r.status === 'committed').map((r) => r.rp)));
  return {
    stored: a.rp,
    reserved,
    committed,
    available: rp(a.rp - reserved - committed),
    goldAvailable: gb(a.gold - sum(active.map((r) => r.gold))),
  };
}
function checkAuthorization(p: RegencyProjection15, a: RegencyAuthorization15, rulerOnly = false) {
  const kinds = { basic: 'selected-policy', advanced: 'confirmation', expert: 'order' };
  if (kinds[a.mode] !== a.kind || !a.reference.trim())
    throw new Error('Explicit mode-appropriate authorization required');
  account(p, a.realmId);
  bloodline(p, a.characterId);
  if (rulerOnly && p.rulers.find((r) => r.realmId === a.realmId)?.characterId !== a.characterId)
    throw new Error('Only the current ruler may develop or sacrifice this bloodline');
}
function reservation(p: RegencyProjection15, id: string) {
  const r = p.reservations.find((r) => r.id === id);
  if (!r) throw new Error('Missing reservation');
  return r;
}
function reserve(p: RegencyProjection15, r: RegencyReservation15) {
  if (p.reservations.some((x) => x.id === r.id) || r.status !== 'reserved')
    throw new Error('Duplicate or malformed reservation');
  if (
    p.reservations.some(
      (x) =>
        x.realmId === r.realmId &&
        x.seasonIndex === r.seasonIndex &&
        x.obligationId === r.obligationId &&
        x.status !== 'released',
    )
  )
    throw new Error('Obligation is already reserved or paid');
  const free = balances(p, r.realmId);
  if (r.purpose === 'future-alchemy' && (r.rp === 0n || r.gold !== goldFromGB(1n)))
    throw new Error('Alchemy reservation requires positive RP and a separate funded 1 GB fee');
  if (r.purpose === 'pledge' && r.gold !== 0n)
    throw new Error('RP pledge must not bundle an unexplained GB transfer');
  if (r.purpose === 'pledge') {
    if (!r.targetRealmId || r.targetRealmId === r.realmId)
      throw new Error('RP pledge requires an immutable counterparty');
    account(p, r.targetRealmId);
    const known = p.boundary?.pledges.find(
      (x) => x.obligationId === r.obligationId && x.realmId === r.realmId,
    );
    if (known && (known.targetRealmId !== r.targetRealmId || r.rp > known.amount))
      throw new Error('Pledge differs from its recorded obligation');
  } else if (r.targetRealmId !== null) throw new Error('Unexpected resource counterparty');
  const promised = sum(
    knownPledgeStatus(p)
      .filter(
        (x) =>
          x.realmId === r.realmId && !(r.purpose === 'pledge' && x.obligationId === r.obligationId),
      )
      .map((x) => x.unreserved),
  );
  if (
    r.rp > (free.available > promised ? free.available - promised : 0n) ||
    r.gold > free.goldAvailable
  )
    throw new Error('Insufficient uncommitted resources after known obligations');
  p.reservations.push(structuredClone(r));
}
function payReservation(p: RegencyProjection15, r: RegencyReservation15) {
  if (!['reserved', 'committed'].includes(r.status))
    throw new Error('Reservation already paid or released');
  const a = account(p, r.realmId);
  a.rp = rp(a.rp - r.rp);
  a.gold = gb(a.gold - r.gold);
  r.status = 'paid';
}
function assertBoundary(p: RegencyProjection15, s: number) {
  if (p.boundary?.seasonIndex !== s) throw new Error('Requires the current open RP boundary');
  return p.boundary;
}
function collectionRecorded(p: RegencyProjection15, realmId: string, s: number) {
  return p.receipts.some(
    (r) =>
      r.seasonIndex === s && r.realmId === realmId && ['collection', 'withheld'].includes(r.kind),
  );
}
function scoreFor(state: Birthright15Campaign, scenario: Scenario, characterId: string) {
  const original = rp(
    integer(originals(scenario).find((c) => c.id === characterId)?.bloodline.strength ?? 0),
  );
  const derived = state.regency15?.state.bloodlines.find((c) => c.characterId === characterId);
  return {
    original: derived?.originalScore ?? original,
    current: derived?.currentScore ?? original,
  };
}
function ordinary(state: Birthright15Campaign, scenario: Scenario, realmId: string) {
  const r = state.realms.find((r) => r.id === realmId),
    d = scenario.realms.find((r) => r.id === realmId);
  return (
    !!r &&
    !!d &&
    !r.eliminated &&
    !r.lieutenantOf &&
    d.domainType !== 'inactive' &&
    d.domainType !== 'special' &&
    r.behavior !== 'monsters'
  );
}

/** Existing native sovereignty/occupation RP rights; no occupier gains sovereignty RP. */
function collectionQuote(
  state: Birthright15Campaign,
  scenario: Scenario,
  realmId: string,
  bundle?: CharacterOverlays35,
): CollectionQuote15 {
  const realm = state.realms.find((r) => r.id === realmId);
  if (!realm) throw new Error('Unknown RP domain');
  const ruler = rulingRegent(scenario, realmId, state),
    id = ruler?.id ?? null;
  const score = id ? scoreFor(state, scenario, id) : { original: rp(0n), current: rp(0n) };
  const amounts: Record<(typeof categories)[number], bigint> = {
    province: 0n,
    law: 0n,
    guild: 0n,
    temple: 0n,
    source: 0n,
  };
  const ids: Record<(typeof categories)[number], string[]> = {
    province: [],
    law: [],
    guild: [],
    temple: [],
    source: [],
  };
  for (const p of state.provinces)
    if (p.owner === realmId && !p.occupiedBy && !p.contested) {
      amounts.province += integer(p.level);
      ids.province.push(p.id);
    }
  for (const h of state.holdings)
    if (h.realmId === realmId && !h.contested && !h.destroyed) {
      amounts[h.type] += integer(h.level);
      ids[h.type].push(h.id);
    }
  const sheet = id && bundle?.characters ? character35(bundle.characters, id) : null;
  const duplicate =
    id &&
    state.realms.filter(
      (r) => ordinary(state, scenario, r.id) && rulingRegent(scenario, r.id, state)?.id === id,
    ).length > 1;
  const actor = id && bundle ? characterActor35(bundle, scenario, state, realmId, id) : null;
  const active = ordinary(state, scenario, realmId),
    reviewed = !!sheet && casting35(sheet).approved && !!actor?.eligible && !duplicate;
  let reason = !active
    ? 'domain-not-ordinary'
    : duplicate
      ? 'duplicate-ruler-identity'
      : !sheet
        ? 'missing-character-overlay'
        : !reviewed
          ? (actor?.reason ?? 'unreviewed-ruler')
          : score.current === 0n
            ? 'unblooded'
            : 'qualified';
  const rows = categories.map((kind) => {
    const rated = sheet ? rating35(sheet, kind) : null;
    const gate = sheet ? eligibleRating35(sheet, kind) : null;
    const knownCasterFailure =
      sheet &&
      ((kind === 'source' && !casting35(sheet).sourceRealmMagic) ||
        (kind === 'temple' && !casting35(sheet).templeRealmMagic));
    const excluded = !active || !!duplicate || score.current === 0n || !!knownCasterFailure;
    const unknown = !excluded && (!reviewed || !rated);
    return {
      kind,
      levels: rp(amounts[kind]),
      rating: rated?.raw ?? null,
      percent: unknown ? null : excluded ? 0 : (gate?.percent ?? 0),
      eligible: !excluded && !unknown && !!gate?.eligible,
      reason: excluded
        ? knownCasterFailure
          ? 'spellcasting-gate'
          : reason
        : unknown
          ? !rated
            ? 'missing-skill-ledger'
            : reason
          : (gate?.reason ?? reason),
      sourceIds: ids[kind].sort(compare),
    };
  });
  const unknown = rows.some((r) => r.levels > 0n && r.percent === null);
  const weighted = sum(rows.map((r) => r.levels * BigInt(r.percent ?? 0)));
  const qualified = wholeRatedRP35(
    rows.map((r) => ({ levels: r.levels, percent: r.percent ?? 0 })),
  );
  if (unknown && reason === 'qualified') reason = 'missing-skill-ledger';
  return {
    realmId,
    characterId: id,
    seasonIndex: state.turn,
    originalScore: score.original,
    currentScore: score.current,
    reviewedRuler: reviewed,
    status: unknown
      ? 'unknown'
      : active && reviewed && score.current > 0n
        ? 'eligible'
        : 'ineligible',
    reason,
    categories: rows,
    qualifiedRP: unknown ? null : rp(qualified),
    collectibleRP: unknown ? null : rp(qualified < score.current ? qualified : score.current),
    knownWeightedHundredths: rp(weighted),
    conditionalUpperRP: rp(
      unknown
        ? [sum(rows.map((r) => r.levels * BigInt(r.percent ?? 100))) / 100n, score.current].reduce(
            (a, b) => (a < b ? a : b),
          )
        : 0n,
    ),
    openingRP: realm.regency,
  };
}

export function regencyCollectionQuotes15(
  state: Birthright15Campaign,
  scenario: Scenario,
  bundle?: CharacterOverlays35,
): CollectionQuote15[] {
  require15(state, scenario);
  if (bundle || state.domainRules.overlays.characters || state.domainRules.overlays.handlers)
    validateCharacterOverlays35(
      bundle ?? { characters: null, handlers: null },
      scenario,
      state.domainRules.overlays,
    );
  if (
    bundle &&
    (!isRegencyOverlayVersion35(bundle.characters?.version) ||
      !isRegencyOverlayVersion35(bundle.handlers?.version))
  )
    throw new Error('RP qualification requires an accepted reviewed overlay release');
  if (state.regency15) validateRegencyState15(state, scenario, false, bundle);
  return [...state.realms]
    .sort((a, b) => compare(a.id, b.id))
    .map((r) => collectionQuote(state, scenario, r.id, bundle));
}
export function regencyCollectionQuote15(
  state: Birthright15Campaign,
  scenario: Scenario,
  realmId: string,
  bundle?: CharacterOverlays35,
) {
  const q = regencyCollectionQuotes15(state, scenario, bundle).find((q) => q.realmId === realmId);
  if (!q) throw new Error('Unknown RP domain');
  return q;
}

export const sacrificeQuote15 = (score: RegencyPoints, points: RegencyPoints) => {
  rp(score);
  rp(points);
  if (points > score) throw new Error('Sacrifice exceeds current bloodline');
  return {
    before: score,
    after: rp(score - points),
    points,
    gain: rp((points * (2n * score - points + 1n)) / 2n),
  };
};
export function regencyResources15(state: Birthright15Campaign, realmId: string) {
  if (domainRulesOf(state).id !== 'birthright-1.5')
    throw new Error('Requires explicit Birthright 1.5 resources');
  const p = state.regency15?.state;
  if (p) {
    const funds = balances(p, realmId),
      promised = rp(
        sum(
          knownPledgeStatus(p)
            .filter((x) => x.realmId === realmId)
            .map((x) => x.unreserved),
        ),
      );
    return {
      ...funds,
      unreservedKnownPledges: promised,
      availableForNewObligations: rp(funds.available > promised ? funds.available - promised : 0n),
    };
  }
  const a = state.realms.find((r) => r.id === realmId);
  if (!a) throw new Error('Unknown resource account');
  return {
    stored: a.regency,
    reserved: rp(0n),
    committed: rp(0n),
    available: a.regency,
    goldAvailable: a.treasury,
    unreservedKnownPledges: rp(0n),
    availableForNewObligations: a.regency,
  };
}
/** Financial preview only; reviewed actor authorization remains an independent gate. */
export function regencyReservationQuote15(
  state: Birthright15Campaign,
  realmId: string,
  entry: Omit<RegencyReservation15, 'status' | 'seasonIndex' | 'realmId' | 'characterId'>,
) {
  validateRegencyState15(state);
  const funds = regencyResources15(state, realmId);
  const r = state.regency15?.state.rulers.find((r) => r.realmId === realmId);
  if (!state.regency15 || !r)
    return {
      funded: false,
      reason: 'explicit-regency-initialization-required',
      before: funds,
      after: null,
      authorizationRequired: true as const,
    };
  const p = structuredClone(state.regency15.state);
  try {
    // Use the same strict wire/output validation and reservation primitive as execution.
    const proposed: RegencyReservation15 = {
      ...entry,
      realmId,
      characterId: r.characterId,
      seasonIndex: state.turn,
      status: 'reserved',
    };
    if (proposed.purpose === 'payroll')
      throw new Error('Payroll requires its validated allocation operation');
    z.encode(regencyState15Codec, {
      ...state.regency15,
      state: { ...p, reservations: [...p.reservations, proposed] },
    });
    reserve(p, proposed);
    return {
      funded: true,
      reason: 'funded-reservation-quote',
      before: funds,
      after: balances(p, realmId),
      authorizationRequired: true as const,
    };
  } catch (error) {
    return {
      funded: false,
      reason: error instanceof Error ? error.message : 'invalid-reservation',
      before: funds,
      after: null,
      authorizationRequired: true as const,
    };
  }
}
function growth(p: RegencyProjection15, realmId: string, seasonIndex: number) {
  const c = p.rulers.find((r) => r.realmId === realmId);
  if (!c) throw new Error('Missing ruler binding');
  const b = bloodline(p, c.characterId),
    funds = balances(p, realmId).available,
    unbooked = sum(
      knownPledgeStatus(p)
        .filter((x) => x.realmId === realmId)
        .map((x) => x.unreserved),
    ),
    free = rp(funds > unbooked ? funds - unbooked : 0n),
    price = rp(b.currentScore + 1n),
    year = Math.floor((seasonIndex - 1) / 4);
  const qualifies = b.currentScore > 0n && free > price;
  const streak = qualifies
    ? b.lastQualifiedBoundary === seasonIndex - 1
      ? Math.min(2, b.streak + 1)
      : 1
    : 0;
  const count = b.growthYear === year ? b.growthCount : 0;
  const reviewedBoundaryRuler =
    p.boundary?.quotes.some((q) => q.realmId === realmId && q.reviewedRuler) ?? false;
  return {
    characterId: c.characterId,
    currentScore: b.currentScore,
    price,
    requiredFreeReserve: rp(price + 1n),
    freeReserve: free,
    observedStreak: b.streak,
    lastQualifiedBoundary: b.lastQualifiedBoundary,
    streakAtBoundary: streak,
    year,
    growthCount: count,
    unreservedKnownPledges: rp(unbooked),
    qualifies,
    eligible:
      reviewedBoundaryRuler && p.boundary?.seasonIndex === seasonIndex && streak >= 2 && count < 2,
    reason: !p.boundary
      ? 'no-open-boundary'
      : !qualifies
        ? 'insufficient-qualifying-reserve'
        : count >= 2
          ? 'annual-growth-limit'
          : streak < 2
            ? 'requires-two-successive-boundaries'
            : 'funded-choice',
  };
}
function recordedPledges(state: Birthright15Campaign) {
  return state.treaties
    .filter((t) => t.kind === 'vassal' && t.vassal && (t.regencyPledge ?? 0n) > 0n)
    .map((t) => {
      const realmId = t.vassal!,
        targetRealmId = t.a === realmId ? t.b : t.a;
      return {
        realmId,
        targetRealmId,
        amount: t.regencyPledge!,
        obligationId: `fealty-rp:${state.turn}:${realmId}:${targetRealmId}`,
      };
    })
    .sort((a, b) => compare(a.obligationId, b.obligationId));
}
function knownPledgeStatus(p: RegencyProjection15) {
  return (p.boundary?.pledges ?? []).map((x) => {
    const paid = sum(
      p.receipts
        .filter(
          (r) =>
            r.kind === 'transfer' && r.realmId === x.realmId && r.obligationId === x.obligationId,
        )
        .map((r) => r.rpDebit),
    );
    const reserved = sum(
      p.reservations
        .filter(
          (r) =>
            r.realmId === x.realmId &&
            r.obligationId === x.obligationId &&
            ['reserved', 'committed'].includes(r.status),
        )
        .map((r) => r.rp),
    );
    const left = x.amount - paid - reserved;
    return { ...x, paid: rp(paid), reserved: rp(reserved), unreserved: rp(left > 0n ? left : 0n) };
  });
}
export function bloodlineGrowthQuote15(
  state: Birthright15Campaign,
  scenario: Scenario,
  realmId: string,
) {
  require15(state, scenario);
  if (state.regency15) {
    validateRegencyState15(state, scenario);
    return growth(state.regency15.state, realmId, state.turn);
  }
  const data = initialRegencyData(state, scenario);
  return growth(initialProjection(data), realmId, state.turn);
}

function initialRegencyData(
  state: Birthright15Campaign,
  scenario: Scenario,
): Omit<RegencyState15, 'state'> {
  return {
    version: 1,
    startedSeason: state.turn,
    opening: {
      accounts: [...state.realms]
        .sort((a, b) => compare(a.id, b.id))
        .map((r) => ({ realmId: r.id, rp: r.regency, gold: r.treasury })),
      bloodlines: originals(scenario).map((c) => ({
        characterId: c.id,
        originalScore: rp(integer(c.bloodline.strength)),
      })),
      rulers: rulers(state, scenario),
    },
    events: [],
  };
}
/** Explicit opt-in for old/new foundations, never an implicit load migration. */
export function initializeRegency15(
  state: Birthright15Campaign,
  scenario: Scenario,
): Birthright15Campaign {
  require15(state, scenario);
  if (state.regency15) throw new Error('Regency state already initialized');
  const data = initialRegencyData(state, scenario),
    next = structuredClone(state);
  next.regency15 = { ...data, state: initialProjection(data) };
  validateRegencyState15(next, scenario);
  return next;
}

function validateSnapshot(p: RegencyProjection15, q: CollectionQuote15, s: number) {
  if (
    q.seasonIndex !== s ||
    !q.characterId ||
    p.rulers.find((r) => r.realmId === q.realmId)?.characterId !== q.characterId
  )
    throw new Error('Collection snapshot ruler/boundary mismatch');
  const b = bloodline(p, q.characterId);
  if (
    q.currentScore !== b.currentScore ||
    q.originalScore !== b.originalScore ||
    q.openingRP !== account(p, q.realmId).rp
  )
    throw new Error('Collection snapshot resource/bloodline mismatch');
  if (q.categories.length !== 5 || new Set(q.categories.map((c) => c.kind)).size !== 5)
    throw new Error('Collection category coverage mismatch');
  for (const c of q.categories) {
    if (c.percent !== null && ![0, 20, 40, 60, 80, 100].includes(c.percent))
      throw new Error('Invalid RP percentage');
    if (c.eligible && (c.rating === null || c.percent === null))
      throw new Error('Unreviewed RP category');
    if (c.eligible && c.percent !== ratingPercent35(c.rating!))
      throw new Error('Persisted RP bracket mismatch');
    if (!c.eligible && c.percent !== null && c.percent !== 0)
      throw new Error('Ineligible RP percentage');
  }
  const weighted = sum(q.categories.map((c) => c.levels * BigInt(c.percent ?? 0))),
    unknown = q.categories.some((c) => c.levels > 0n && c.percent === null),
    full = weighted / 100n;
  const upper = unknown
    ? sum(q.categories.map((c) => c.levels * BigInt(c.percent ?? 100))) / 100n
    : 0n;
  if (
    q.knownWeightedHundredths !== weighted ||
    q.qualifiedRP !== (unknown ? null : full) ||
    q.collectibleRP !== (unknown ? null : full < b.currentScore ? full : b.currentScore) ||
    q.conditionalUpperRP !== (upper < b.currentScore ? upper : b.currentScore)
  )
    throw new Error('Collection snapshot formula mismatch');
  if ((q.status === 'unknown') !== unknown)
    throw new Error('Unknown RP must remain explicitly unknown');
}

/** Replay also verifies the persisted projection; completed receipts never run through gameplay. */
function replay(data: Omit<RegencyState15, 'state'>): RegencyProjection15 {
  const p = initialProjection(data),
    eventIds = new Set<string>();
  let previousSeason = data.startedSeason;
  for (const e of data.events) {
    if (eventIds.has(e.id)) throw new Error('RP transaction identity already applied');
    eventIds.add(e.id);
    if (
      !Number.isSafeInteger(e.seasonIndex) ||
      e.seasonIndex < previousSeason ||
      e.seasonIndex >
        Math.max(data.startedSeason, (p.lastClosedSeason ?? data.startedSeason - 1) + 1)
    )
      throw new Error('Invalid RP transaction chronology');
    previousSeason = e.seasonIndex;
    const s = e.seasonIndex,
      op = e.operation;
    const record = (
      kind: RegencyProjection15['receipts'][number]['kind'],
      realmId: string,
      characterId: string | null,
      fields: Partial<RegencyProjection15['receipts'][number]> = {},
    ) => {
      p.receipts.push({
        id: `${e.id}:${p.receipts.length}`,
        seasonIndex: s,
        realmId,
        characterId,
        kind,
        obligationId: null,
        reservationId: null,
        targetRealmId: null,
        rpDebit: rp(0n),
        rpCredit: rp(0n),
        goldDebit: gb(0n),
        scoreBefore: null,
        scoreAfter: null,
        payroll: [],
        ...fields,
      });
    };
    if ('authorization' in op) checkAuthorization(p, op.authorization, op.kind === 'sacrifice');
    switch (op.kind) {
      case 'sync-rulers': {
        if (p.boundary) throw new Error('Cannot replace RP rulers during a frozen boundary');
        if (
          op.rulers.length !== p.accounts.length ||
          new Set(op.rulers.map((r) => r.realmId)).size !== p.accounts.length
        )
          throw new Error('Ruler synchronization coverage mismatch');
        for (const r of op.rulers) {
          account(p, r.realmId);
          bloodline(p, r.characterId);
          const old = p.rulers.find((x) => x.realmId === r.realmId);
          if (old?.characterId !== r.characterId)
            for (const id of [old?.characterId, r.characterId])
              if (id) {
                const b = bloodline(p, id);
                b.streak = 0;
                b.lastQualifiedBoundary = null;
              }
        }
        p.rulers = structuredClone(op.rulers);
        break;
      }
      case 'open': {
        if (
          p.boundary ||
          s !== (p.lastClosedSeason === null ? data.startedSeason : p.lastClosedSeason + 1)
        )
          throw new Error('RP boundary already opened/closed or skipped');
        const domains = new Set<string>(),
          people = new Set<string>(),
          assets = new Set<string>();
        for (const q of op.quotes) {
          validateSnapshot(p, q, s);
          if (domains.has(q.realmId) || people.has(q.characterId!))
            throw new Error('One regent cannot collect for multiple domains');
          domains.add(q.realmId);
          people.add(q.characterId!);
          for (const c of q.categories)
            for (const id of c.sourceIds) {
              if (assets.has(id)) throw new Error('Duplicate collection asset');
              assets.add(id);
            }
        }
        if (new Set(op.pledges.map((x) => x.obligationId)).size !== op.pledges.length)
          throw new Error('Duplicate recorded RP obligation');
        for (const x of op.pledges) {
          account(p, x.realmId);
          account(p, x.targetRealmId);
          if (x.realmId === x.targetRealmId) throw new Error('Self pledge');
        }
        p.boundary = {
          seasonIndex: s,
          receiptStart: p.receipts.length,
          quotes: structuredClone(op.quotes),
          pledges: structuredClone(op.pledges),
        };
        break;
      }
      case 'collect':
      case 'withhold': {
        const boundary = assertBoundary(p, s),
          q = boundary.quotes.find((q) => q.realmId === op.realmId);
        if (!q) throw new Error('Domain has no frozen RP entitlement');
        if (
          collectionRecorded(p, op.realmId, s) ||
          p.receipts.some(
            (r) =>
              r.seasonIndex === s &&
              r.characterId === q.characterId &&
              ['collection', 'withheld'].includes(r.kind),
          )
        )
          throw new Error('Regent RP collection already recorded');
        if (op.kind === 'collect' && q.collectibleRP === null)
          throw new Error('Unknown RP qualification is withheld, never credited');
        if (op.kind === 'withhold' && q.collectibleRP !== null)
          throw new Error('Withholding acknowledgement requires unknown qualification');
        const amount = op.kind === 'collect' ? q.collectibleRP! : rp(0n),
          a = account(p, op.realmId);
        a.rp = rp(a.rp + amount);
        record(op.kind === 'collect' ? 'collection' : 'withheld', op.realmId, q.characterId, {
          rpCredit: amount,
        });
        break;
      }
      case 'reserve': {
        const r = op.reservation;
        if (
          r.realmId !== op.authorization.realmId ||
          r.characterId !== op.authorization.characterId ||
          r.seasonIndex !== s
        )
          throw new Error('Reservation source/authorization mismatch');
        if (['payroll'].includes(r.purpose))
          throw new Error('Payroll requires its validated allocation operation');
        reserve(p, r);
        break;
      }
      case 'commit':
      case 'release':
      case 'pay':
      case 'transfer': {
        const r = reservation(p, op.reservationId);
        if (r.realmId !== op.authorization.realmId)
          throw new Error('Reservation belongs to another actual source');
        if (!['reserved', 'committed'].includes(r.status))
          throw new Error('Reservation already paid or released');
        if (op.kind === 'commit') {
          if (r.status !== 'reserved') throw new Error('Reservation already committed');
          r.status = 'committed';
          break;
        }
        if (op.kind === 'release') {
          r.status = 'released';
          break;
        }
        if (op.kind === 'pay') {
          if (!['bid', 'obligation'].includes(r.purpose))
            throw new Error(
              'This purpose requires dedicated validated execution; Alchemy remains guarded',
            );
          payReservation(p, r);
          record('spend', r.realmId, op.authorization.characterId, {
            rpDebit: r.rp,
            goldDebit: r.gold,
            reservationId: r.id,
            obligationId: r.obligationId,
          });
          break;
        }
        const boundary = assertBoundary(p, s);
        if (
          r.purpose !== 'pledge' ||
          r.targetRealmId !== op.targetRealmId ||
          r.realmId === op.targetRealmId ||
          r.rp === 0n
        )
          throw new Error('Invalid paid RP pledge');
        const receipts = p.receipts.slice(boundary.receiptStart),
          start = boundary.quotes.find((q) => q.realmId === r.realmId)?.openingRP;
        if (start === undefined) throw new Error('RP pledges require an active ordinary source');
        const incoming = sum(
            receipts
              .filter((x) => x.kind === 'transfer' && x.targetRealmId === r.realmId)
              .map((x) => x.rpDebit),
          ),
          outgoing = sum(
            receipts
              .filter((x) => x.kind === 'transfer' && x.realmId === r.realmId)
              .map((x) => x.rpDebit),
          ),
          ownCredits = sum(
            receipts
              .filter(
                (x) => x.realmId === r.realmId && ['collection', 'sacrifice'].includes(x.kind),
              )
              .map((x) => x.rpCredit),
          ),
          localSpent = sum(
            receipts
              .filter((x) => x.realmId === r.realmId && x.kind !== 'transfer')
              .map((x) => x.rpDebit),
          ),
          positive = (n: bigint) => (n > 0n ? n : 0n),
          active = p.reservations.filter(
            (x) => x.realmId === r.realmId && ['reserved', 'committed'].includes(x.status),
          ),
          nonPledge = sum(active.filter((x) => x.purpose !== 'pledge').map((x) => x.rp)),
          otherPledges = sum(
            active.filter((x) => x.purpose === 'pledge' && x.id !== r.id).map((x) => x.rp),
          ),
          ownPool = start + ownCredits - outgoing - positive(localSpent - incoming),
          capacity = positive(
            ownPool - positive(nonPledge - positive(incoming - localSpent)) - otherPledges,
          );
        if (r.rp > capacity)
          throw new Error('Same-boundary incoming RP cannot finance a relay or circular pledge');
        const target = account(p, op.targetRealmId);
        payReservation(p, r);
        target.rp = rp(target.rp + r.rp);
        record('transfer', r.realmId, op.authorization.characterId, {
          rpDebit: r.rp,
          reservationId: r.id,
          obligationId: r.obligationId,
          targetRealmId: op.targetRealmId,
        });
        break;
      }
      case 'sacrifice': {
        if (p.boundary && !collectionRecorded(p, op.authorization.realmId, s))
          throw new Error('Record collection/withholding before changing a frozen bloodline');
        const b = bloodline(p, op.authorization.characterId),
          q = sacrificeQuote15(b.currentScore, op.points),
          a = account(p, op.authorization.realmId);
        b.currentScore = q.after;
        if (op.points > 0n) {
          b.streak = 0;
          b.lastQualifiedBoundary = null;
        }
        a.rp = rp(a.rp + q.gain);
        record('sacrifice', a.realmId, b.characterId, {
          rpCredit: q.gain,
          scoreBefore: q.before,
          scoreAfter: q.after,
        });
        break;
      }
      case 'payroll': {
        assertBoundary(p, s);
        if (!collectionRecorded(p, op.authorization.realmId, s))
          throw new Error('Record actual collection/withholding before payroll');
        const priced = pricePayroll(op.bills, op.allocations);
        if (
          p.receipts.some(
            (r) =>
              r.realmId === op.authorization.realmId && r.seasonIndex === s && r.kind === 'payroll',
          )
        )
          throw new Error('Payroll RP rounding/allocation is once per domain per season');
        const r: RegencyReservation15 = {
          id: `payroll:${e.id}`,
          realmId: op.authorization.realmId,
          characterId: op.authorization.characterId,
          seasonIndex: s,
          obligationId: `military-payroll:${s}:${op.authorization.realmId}`,
          purpose: 'payroll',
          rp: priced.rpCost,
          gold: priced.goldCost,
          status: 'reserved',
          targetRealmId: null,
        };
        reserve(p, r);
        payReservation(p, r);
        record('payroll', r.realmId, r.characterId, {
          rpDebit: r.rp,
          goldDebit: r.gold,
          obligationId: r.obligationId,
          reservationId: r.id,
          payroll: structuredClone(op.allocations),
        });
        break;
      }
      case 'close': {
        const boundary = assertBoundary(p, s),
          choices = new Map(op.growth.map((a) => [a.realmId, a]));
        if (choices.size !== op.growth.length) throw new Error('Duplicate growth choice');
        for (const a of op.growth) {
          checkAuthorization(p, a, true);
          if (!boundary.quotes.some((q) => q.realmId === a.realmId))
            throw new Error('Growth requires an ordinary active domain');
        }
        for (const q of boundary.quotes) {
          if (!collectionRecorded(p, q.realmId, s))
            throw new Error(
              'Every frozen domain needs one actual collection or explicit unknown withholding',
            );
          const b = bloodline(p, q.characterId!),
            g = growth(p, q.realmId, s),
            choice = choices.get(q.realmId);
          b.growthYear = g.year;
          b.growthCount = g.growthCount;
          b.streak = q.reviewedRuler ? g.streakAtBoundary : 0;
          b.lastQualifiedBoundary = b.streak ? s : null;
          if (choice) {
            if (!q.reviewedRuler || !g.eligible)
              throw new Error('Bloodline growth is not an eligible funded choice');
            const a = account(p, q.realmId),
              before = b.currentScore;
            a.rp = rp(a.rp - g.price);
            b.currentScore = rp(before + 1n);
            b.growthCount++;
            b.streak = 0;
            b.lastQualifiedBoundary = null;
            record('growth', q.realmId, b.characterId, {
              rpDebit: g.price,
              scoreBefore: before,
              scoreAfter: b.currentScore,
              obligationId: `bloodline-growth:${s}:${b.characterId}`,
            });
          }
        }
        p.lastClosedSeason = s;
        p.boundary = null;
        break;
      }
    }
    for (const a of p.accounts) {
      rp(a.rp);
      if (a.gold < 0n) throw new Error('Negative exact gold balance');
      balances(p, a.realmId);
    }
  }
  return p;
}

/** Reject inconsistent journals/projections/accounts instead of silently resetting them. */
/** Read-only prefix view for another scoped command journal's exact before/after handoff. */
export function regencyProjectionAt15(
  state: Birthright15Campaign,
  eventCount: number,
): RegencyProjection15 {
  const d = state.regency15;
  if (!d || !Number.isSafeInteger(eventCount) || eventCount < 0 || eventCount > d.events.length)
    throw new Error('Invalid Regency journal checkpoint');
  return replay({ ...d, events: d.events.slice(0, eventCount) });
}
export function validateRegencyState15(
  state: Birthright15Campaign,
  scenario?: Scenario,
  allowRulerSync = false,
  bundle?: CharacterOverlays35,
): void {
  const data = state.regency15;
  if (!data) return;
  const wire = z.encode(regencyState15Codec, data); // validates canonical quantities without coercion
  if (
    data.events.length &&
    (!isRegencyOverlayVersion35(state.domainRules.overlays.characters?.version) ||
      !isRegencyOverlayVersion35(state.domainRules.overlays.handlers?.version))
  )
    throw new Error('RP journal requires accepted character/handler overlay references');
  const allRealms = state.realms.map((r) => r.id).sort(compare),
    allAccounts = data.opening.accounts.map((r) => r.realmId).sort(compare);
  if (
    canonicalOverlayJSON(allRealms) !== canonicalOverlayJSON(allAccounts) ||
    new Set(allAccounts).size !== allAccounts.length
  )
    throw new Error('RP account coverage mismatch');
  if (
    new Set(data.opening.bloodlines.map((b) => b.characterId)).size !==
    data.opening.bloodlines.length
  )
    throw new Error('Duplicate bloodline identity');
  if (
    data.opening.rulers.length !== allRealms.length ||
    new Set(data.opening.rulers.map((r) => r.realmId)).size !== allRealms.length
  )
    throw new Error('Opening ruler coverage mismatch');
  for (const r of data.opening.rulers)
    if (
      !allRealms.includes(r.realmId) ||
      !data.opening.bloodlines.some((b) => b.characterId === r.characterId)
    )
      throw new Error('Invalid original ruler binding');
  const actual = replay(data);
  if (
    canonicalOverlayJSON(z.encode(regencyProjection15Codec, actual)) !==
    canonicalOverlayJSON(wire.state)
  )
    throw new Error('Regency journal/projection inconsistency');
  if (data.startedSeason > state.turn || data.events.some((e) => e.seasonIndex > state.turn))
    throw new Error('RP state belongs to a future season');
  if (actual.boundary && actual.boundary.seasonIndex !== state.turn)
    throw new Error('Open RP boundary does not match the current season');
  if (
    !allowRulerSync &&
    state.realms.some(
      (r) =>
        r.regentId && actual.rulers.find((x) => x.realmId === r.id)?.characterId !== r.regentId,
    )
  )
    throw new Error('Ruler replacement requires explicit RP synchronization');
  for (const a of actual.accounts) {
    const r = state.realms.find((r) => r.id === a.realmId)!;
    if (r.regency !== a.rp || r.treasury !== a.gold)
      throw new Error('Regency journal/resource balance inconsistency');
  }
  if (scenario) {
    const expected = originals(scenario).map((c) => ({
      characterId: c.id,
      originalScore: rp(integer(c.bloodline.strength)),
    }));
    if (
      canonicalOverlayJSON(
        expected.map((b) => ({ ...b, originalScore: b.originalScore.toString() })),
      ) !== canonicalOverlayJSON(wire.opening.bloodlines)
    )
      throw new Error('Preserved original bloodline reference mismatch');
    if (
      !allowRulerSync &&
      canonicalOverlayJSON(actual.rulers) !== canonicalOverlayJSON(rulers(state, scenario))
    )
      throw new Error('Ruler replacement requires explicit RP synchronization');
  }
  if (bundle?.characters && bundle.handlers) {
    const reviewedAuthorization = (a: RegencyAuthorization15, season: number) => {
      if (
        !casting35(character35(bundle.characters!, a.characterId)).approved ||
        !bundle.handlers!.records.some(
          (h) =>
            h.realmId === a.realmId &&
            h.characterId === a.characterId &&
            h.review === 'evidence-checked' &&
            h.validFromTurn <= season &&
            (h.validThroughTurn === null || h.validThroughTurn >= season),
        )
      )
        throw new Error('Persisted RP resource actor lacks reviewed authorization');
    };
    for (const e of data.events) {
      if ('authorization' in e.operation)
        reviewedAuthorization(e.operation.authorization, e.seasonIndex);
      if (e.operation.kind === 'close')
        e.operation.growth.forEach((a) => reviewedAuthorization(a, e.seasonIndex));
      if (e.operation.kind === 'open')
        for (const q of e.operation.quotes) {
          const sheet = character35(bundle.characters, q.characterId!);
          if (
            q.reviewedRuler &&
            (!casting35(sheet).approved ||
              !bundle.handlers.records.some(
                (h) =>
                  h.realmId === q.realmId &&
                  h.characterId === q.characterId &&
                  h.authority === 'ruler' &&
                  h.review === 'evidence-checked' &&
                  h.validFromTurn <= e.seasonIndex &&
                  (h.validThroughTurn === null || h.validThroughTurn >= e.seasonIndex),
              ))
          )
            throw new Error('Persisted RP actor lacks reviewed authority');
          for (const c of q.categories) {
            const rating = rating35(sheet, c.kind),
              magic = casting35(sheet),
              gate = eligibleRating35(sheet, c.kind);
            if (c.rating !== (rating?.raw ?? null))
              throw new Error('Persisted RP ranks differ from the pinned character overlay');
            const excluded =
              q.currentScore === 0n ||
              (c.kind === 'source' && !magic.sourceRealmMagic) ||
              (c.kind === 'temple' && !magic.templeRealmMagic);
            const unknown = !excluded && (!q.reviewedRuler || !rating);
            if (
              c.eligible !== (!excluded && !unknown && gate.eligible) ||
              c.percent !== (unknown ? null : excluded ? 0 : gate.percent)
            )
              throw new Error('Persisted RP category lacks character qualification');
          }
        }
    }
  }
}

export type RegencyRequest15 =
  | { kind: 'open' }
  | { kind: 'sync-rulers' }
  | { kind: 'collect'; realmId: string }
  | { kind: 'withhold'; realmId: string; reason: string }
  | {
      kind: 'reserve';
      authorization: RegencyAuthorization15;
      reservation: Omit<RegencyReservation15, 'status' | 'seasonIndex' | 'realmId' | 'characterId'>;
    }
  | {
      kind: 'commit' | 'release' | 'pay';
      authorization: RegencyAuthorization15;
      reservationId: string;
    }
  | {
      kind: 'transfer';
      authorization: RegencyAuthorization15;
      reservationId: string;
      targetRealmId: string;
    }
  | { kind: 'sacrifice'; authorization: RegencyAuthorization15; points: RegencyPoints }
  | { kind: 'payroll'; authorization: RegencyAuthorization15; allocations: PayrollSelection15[] }
  | { kind: 'close'; growth: RegencyAuthorization15[] };

/** Atomic, deterministic and opt-in; no generic command dispatch or season advance. */
export function applyRegency15(
  state: Birthright15Campaign,
  scenario: Scenario,
  bundle: CharacterOverlays35,
  id: string,
  request: RegencyRequest15,
): Birthright15Campaign {
  require15(state, scenario);
  if (!state.regency15) throw new Error('Explicit Regency initialization required');
  validateCharacterOverlays35(bundle, scenario, state.domainRules.overlays);
  if (
    !isRegencyOverlayVersion35(bundle.characters?.version) ||
    !isRegencyOverlayVersion35(bundle.handlers?.version)
  )
    throw new Error('Regency requires an accepted reviewed character/handler release');
  validateRegencyState15(state, scenario, request.kind === 'sync-rulers', bundle);
  const authorize = (a: RegencyAuthorization15) => {
    if (
      !ordinary(state, scenario, a.realmId) ||
      !characterActor35(bundle, scenario, state, a.realmId, a.characterId).eligible
    )
      throw new Error('Unreviewed or unauthorized RP actor');
  };
  if ('authorization' in request) authorize(request.authorization);
  if (request.kind === 'close') request.growth.forEach(authorize);
  let operation: RegencyOperation15;
  if (request.kind === 'open') {
    const quotes = regencyCollectionQuotes15(state, scenario, bundle).filter((q) =>
      ordinary(state, scenario, q.realmId),
    );
    if (quotes.some((q) => q.reason === 'duplicate-ruler-identity'))
      throw new Error('One ruler cannot collect as several independent people');
    operation = { kind: 'open', quotes, pledges: recordedPledges(state) };
  } else if (request.kind === 'sync-rulers')
    operation = { kind: 'sync-rulers', rulers: rulers(state, scenario) };
  else if (request.kind === 'reserve')
    operation = {
      ...request,
      reservation: {
        ...request.reservation,
        realmId: request.authorization.realmId,
        characterId: request.authorization.characterId,
        seasonIndex: state.turn,
        status: 'reserved',
      },
    };
  else if (request.kind === 'payroll') {
    const forecast = economicForecast15(state, scenario, request.authorization.realmId, {
      overlays: bundle,
    });
    operation = { ...request, bills: payrollBills(state, scenario, forecast) };
  } else operation = request;
  const next = structuredClone(state),
    data = next.regency15!;
  data.events.push({ id, seasonIndex: state.turn, operation: structuredClone(operation) });
  // Runtime codec validation before replay (no invalid BigInt/negative reservation can be applied).
  z.encode(regencyState15Codec, data);
  data.state = replay(data);
  for (const a of data.state.accounts) {
    const r = next.realms.find((r) => r.id === a.realmId)!;
    r.regency = a.rp;
    r.treasury = a.gold;
  }
  validateRegencyState15(next, scenario);
  return next;
}

type PayrollBill15 = { unitId: string; amount: GoldUnits; regular: boolean; waived: GoldUnits };
function payrollBills(
  state: Birthright15Campaign,
  scenario: Scenario,
  forecast: EconomicForecast15,
): PayrollBill15[] {
  return forecast.lines
    .filter((l) => l.stream === 'military' && l.direction === 'expense' && l.amount !== null)
    .map((l) => {
      if (l.assetIds.length !== 1)
        throw new Error('Payroll requires one identified unit per obligation');
      const unitId = l.assetIds[0]!,
        army = state.armies.find(
          (a) => a.realmId === forecast.realmId && a.units.some((u) => u.id === unitId),
        );
      const unit = army?.units.find((u) => u.id === unitId),
        profile = scenario.units.find((p) => p.id === unit?.type);
      if (!unit || !profile) throw new Error('Payroll unit/profile ownership mismatch');
      return {
        unitId,
        amount: l.amount!,
        regular: profile.pc?.mercenary === false,
        waived: l.waiver,
      };
    });
}
function pricePayroll(bills: readonly PayrollBill15[], allocations: readonly PayrollSelection15[]) {
  if (
    new Set(bills.map((b) => b.unitId)).size !== bills.length ||
    new Set(allocations.map((a) => a.unitId)).size !== allocations.length
  )
    throw new Error('Duplicate payroll obligation');
  let rpGold = 0n,
    gold = 0n;
  if (bills.some((b) => b.waived > b.amount)) throw new Error('Malformed payroll waiver');
  for (const a of allocations) {
    const b = bills.find((b) => b.unitId === a.unitId);
    if (
      typeof a.rpGold !== 'bigint' ||
      typeof a.gold !== 'bigint' ||
      a.rpGold < 0n ||
      a.gold < 0n ||
      !b ||
      b.waived > b.amount ||
      a.rpGold + a.gold > b.amount - b.waived
    )
      throw new Error('Payroll allocation exceeds the actual payable obligation');
    if (a.rpGold > 0n && (!b.regular || b.waived > 0n))
      throw new Error('RP payroll excludes mercenary, unknown and waived obligations');
    rpGold += a.rpGold;
    gold += a.gold;
  }
  return {
    rpGold: gb(rpGold),
    goldCost: gb(gold),
    rpCost: rp((5n * rpGold + GOLD_UNITS_PER_GB - 1n) / GOLD_UNITS_PER_GB),
  };
}
export function regencyPayrollQuote15(
  state: Birthright15Campaign,
  scenario: Scenario,
  forecast: EconomicForecast15,
  allocations: readonly PayrollSelection15[] = [],
) {
  require15(state, scenario);
  if (forecast.realmId === undefined || forecast.turn !== state.turn)
    throw new Error('Payroll quote boundary mismatch');
  const bills = payrollBills(state, scenario, forecast),
    priced = pricePayroll(bills, allocations),
    resources = regencyResources15(state, forecast.realmId);
  const paid = state.regency15?.state.receipts.find(
    (r) => r.realmId === forecast.realmId && r.seasonIndex === state.turn && r.kind === 'payroll',
  );
  const regular = gb(sum(bills.filter((b) => b.regular).map((b) => b.amount - b.waived))),
    covered = gb(sum(paid?.payroll.map((a) => a.rpGold) ?? [])),
    paidGold = paid?.goldDebit ?? gb(0n);
  return {
    status: 'quote-only' as const,
    bills,
    regularPayable: regular,
    maximumAllRegularRPCost: rp((5n * regular + 119n) / 120n),
    selected: priced,
    alreadyAllocated: !!paid,
    paidByRP: covered,
    paidByGold: paidGold,
    actualRPSpent: paid?.rpDebit ?? rp(0n),
    remainingRegularPayroll: gb(
      regular -
        covered -
        sum(
          (paid?.payroll ?? [])
            .filter((a) => bills.find((b) => b.unitId === a.unitId)?.regular)
            .map((a) => a.gold),
        ),
    ),
    fundedNow:
      !paid &&
      priced.rpCost <= resources.availableForNewObligations &&
      priced.goldCost <= resources.goldAvailable,
    projectedRPAfterSelectedAllocation: paid
      ? resources.available
      : priced.rpCost <= resources.available
        ? rp(resources.available - priced.rpCost)
        : null,
    createsSpendableGB: false as const,
  };
}
/** Reservation arithmetic only: no spell qualification, fee financing or casting opportunity is supplied. */
export function alchemyResourceQuote15(
  state: Birthright15Campaign,
  realmId: string,
  amount: RegencyPoints,
) {
  rp(amount);
  if (amount === 0n) throw new Error('Alchemy quantity must be positive');
  const free = regencyResources15(state, realmId),
    fee = goldFromGB(1n);
  return {
    rpCost: amount,
    fee,
    grossOutput: gb(amount * GOLD_UNITS_PER_GB),
    netGoldChange: gb(amount * GOLD_UNITS_PER_GB - fee),
    reservable: amount <= free.availableForNewObligations && fee <= free.goldAvailable,
    executionActive: false as const,
    required: [
      'known Alchemy entitlement',
      'eligible actual caster',
      'legal Source/ley access',
      'casting opportunity',
      'funded separate fee before output',
    ],
  };
}
/** RP companion data, kept separate from cash production and economic handler qualifications. */
export function regencyForecast15(
  state: Birthright15Campaign,
  scenario: Scenario,
  quote: CollectionQuote15,
) {
  const resources = regencyResources15(state, quote.realmId),
    p = state.regency15?.state;
  const actual = p?.receipts.find(
    (r) =>
      r.realmId === quote.realmId &&
      r.seasonIndex === state.turn &&
      ['collection', 'withheld'].includes(r.kind),
  );
  const pending = actual ? rp(0n) : quote.collectibleRP;
  const incoming = rp(
    sum(
      p?.receipts
        .filter(
          (r) =>
            r.kind === 'transfer' &&
            r.targetRealmId === quote.realmId &&
            r.seasonIndex === state.turn,
        )
        .map((r) => r.rpDebit) ?? [],
    ),
  );
  const receipts =
    p?.receipts.filter((r) => r.realmId === quote.realmId && r.seasonIndex === state.turn) ?? [];
  const projected = pending === null ? null : rp(resources.available + pending);
  return {
    quote,
    resources,
    actualReceipt: actual ?? null,
    forecastNewRP: pending,
    projectedUncommittedRP: projected,
    projectedAvailableAfterKnownObligations:
      projected === null
        ? null
        : rp(
            projected > resources.unreservedKnownPledges
              ? projected - resources.unreservedKnownPledges
              : 0n,
          ),
    knownPledges: p?.boundary
      ? knownPledgeStatus(p).filter((x) => x.realmId === quote.realmId)
      : recordedPledges(state).filter((x) => x.realmId === quote.realmId),
    receivedTransfers: incoming,
    spent: rp(sum(receipts.filter((r) => r.kind === 'spend').map((r) => r.rpDebit))),
    sacrificeGain: rp(sum(receipts.filter((r) => r.kind === 'sacrifice').map((r) => r.rpCredit))),
    growthSpent: rp(sum(receipts.filter((r) => r.kind === 'growth').map((r) => r.rpDebit))),
    payrollSpent: rp(sum(receipts.filter((r) => r.kind === 'payroll').map((r) => r.rpDebit))),
    growth: growth(
      p ?? initialProjection(initialRegencyData(state, scenario)),
      quote.realmId,
      state.turn,
    ),
    executionScope: 'explicit-regency-only' as const,
  };
}
