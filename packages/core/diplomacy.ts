import { rulingRegent } from './regents';
import type { Campaign, Command, Scenario, TreatyKind } from './schema';
import { relation, domainFocus } from './selectors';
import { goldBars } from './military';
import { randomInt } from './random';
import { assimilateNonLanded } from './fealty';

type Proposal = Extract<Command, { type: 'ProposeTreaty' }>;
/** Shared by UI and command validation; opt-in audience access does not revive inactive records. */
export function diplomaticTargetAvailable(state: Campaign, actor: string, targetId: string) {
  const target = state.realms.find((r) => r.id === targetId);
  return (
    !!target &&
    targetId !== actor &&
    !target.eliminated &&
    target.controller !== 'passive' &&
    (state.unrestrictedDiplomacy || target.behavior !== 'monsters')
  );
}
export const grantsPassage = (kind: TreatyKind | undefined) =>
  kind === 'pact' || kind === 'alliance' || kind === 'vassal';
export function diplomaticReaction(state: Campaign, from: string, toward: string) {
  const t = relation(state, from, toward);
  if (!t) return 50;
  const stored = from === t.a ? t.reactionA : t.reactionB;
  if (stored !== undefined) return stored;
  // The native rectangular matrix has no reverse cell for a non-landed target.
  // Do not turn the pair's legacy display average into a purported recovered reaction.
  return t.originalStatusA !== undefined || t.originalStatusB !== undefined
    ? 50
    : Math.max(0, t.opinion + 50);
}
const alignments = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 15, 5, -15, 10, 0, -20, 0, -10, -30],
  [0, 5, 15, 5, 0, 10, 0, -10, 0, -10],
  [0, -15, 5, 15, -20, 0, 10, -30, -10, 0],
  [0, 10, 0, -20, 15, 5, -15, 10, 0, -20],
  [0, 0, 10, 0, 5, 15, 5, 0, 10, 0],
  [0, -20, 0, 10, -15, 5, 15, -20, 0, 10],
  [0, 0, -10, -30, 10, 0, -20, 15, 5, -15],
  [0, -10, 0, -10, 0, 10, 0, 5, 15, 5],
  [0, -30, -10, 0, -20, 0, 10, -15, 5, 15],
];
function alignment(s: Scenario, id: string, state: Campaign) {
  const identity = rulingRegent(s, id, state)?.original?.identity as
    { alignment?: number } | undefined;
  return identity?.alignment ?? 0;
}
function troopValue(state: Campaign, s: Scenario, id: string) {
  return state.armies
    .filter((a) => a.provinceId === id)
    .reduce(
      (n, a) =>
        n + a.units.reduce((m, u) => m + (s.units.find((d) => d.id === u.type)?.cost ?? 0), 0),
      0,
    );
}
export function diplomacyTerms(state: Campaign, s: Scenario, actor: string, cmd: Proposal) {
  const raw = diplomaticReaction(state, cmd.target, actor);
  const hostile = state.warDeclarations?.some(
    (w) =>
      (w.actor === actor && w.target === cmd.target) ||
      (w.actor === cmd.target && w.target === actor),
  );
  const base = Math.max(0, raw - (hostile ? 25 : 0));
  const align = alignments[alignment(s, cmd.target, state)]?.[alignment(s, actor, state)] ?? 0;
  const blood = rulingRegent(s, actor, state)?.bloodline.abilities ?? [];
  const ability = blood.includes('blood-divine-aura')
    ? 15
    : blood.includes('blood-bloodmark')
      ? 10
      : 0;
  let reaction =
    base +
    align +
    ability +
    2 * (cmd.offerGold ?? 0) -
    3 * (cmd.demandGold ?? 0) +
    5 * (cmd.offerTribute ?? 0) -
    10 * (cmd.demandTribute ?? 0);
  if (cmd.offerHolding)
    reaction += 5 * Math.max(1, state.holdings.find((h) => h.id === cmd.offerHolding)?.level ?? 0);
  if (cmd.demandHolding)
    reaction -=
      10 * Math.max(1, state.holdings.find((h) => h.id === cmd.demandHolding)?.level ?? 0);
  if (cmd.offerProvince)
    reaction +=
      20 +
      troopValue(state, s, cmd.offerProvince) +
      5 * (state.provinces.find((p) => p.id === cmd.offerProvince)?.level ?? 0);
  if (cmd.demandProvince)
    reaction -=
      40 +
      2 * troopValue(state, s, cmd.demandProvince) +
      10 * (state.provinces.find((p) => p.id === cmd.demandProvince)?.level ?? 0);
  const provinces = state.provinces.filter((p) => p.owner === cmd.target).length;
  const nonLanded = [4, 19, 5, 26, 4, 8, 12, 16, 7, 9, 20, 26, 9, 17, 10, 18, 23];
  const index = s.realms.find((r) => r.id === cmd.target)?.original?.index as number | undefined;
  const minimum =
    cmd.kind === 'pact'
      ? 75
      : cmd.kind === 'alliance'
        ? 95 + 5 * Math.max(0, provinces - 1)
        : cmd.kind === 'vassal'
          ? 150 +
            (provinces ? 10 * Math.max(0, provinces - 1) : (nonLanded[(index ?? 0) - 35] ?? 0))
          : cmd.demandGold
            ? 60
            : 50;
  const court = state.realms.find((r) => r.id === actor)?.court ?? 1;
  return {
    reaction,
    minimum,
    ambassador: base + align,
    threshold: Math.max(
      1,
      Math.min(
        21,
        20 - Math.trunc(reaction / 5) - (cmd.regencyBid ?? 0) + ([0, 4, 2, 0, -3][court] ?? 0),
      ),
    ),
    provinceId: domainFocus(state, cmd.target),
  };
}
export function diplomacyProblem(
  state: Campaign,
  s: Scenario,
  actor: string,
  cmd: Proposal,
): string | null {
  if (cmd.kind === 'war') return null;
  const target = state.realms.find((r) => r.id === cmd.target),
    realm = state.realms.find((r) => r.id === actor)!;
  if (!target || target.eliminated || target.controller === 'passive' || cmd.target === actor)
    return 'Choose an active foreign domain.';
  if (
    !state.unrestrictedDiplomacy &&
    (target.behavior === 'monsters' || realm.behavior === 'monsters')
  )
    return 'The native MONSTERS controller does not negotiate treaties.';
  if (!state.unrestrictedDiplomacy && !realm.court) return 'A court is required for diplomacy.';
  const t = relation(state, actor, cmd.target);
  if (t?.lastProposalTurn === state.turn)
    return 'This domain has already considered your proposal this season.';
  if (realm.treasury < 1 + (cmd.offerGold ?? 0))
    return 'Pay the 1 GB fee and retain enough gold for the offered payment.';
  if (target.treasury < (cmd.demandGold ?? 0)) return 'The target cannot pay the requested gold.';
  if (cmd.offerGold && cmd.demandGold) return 'Offer or demand gold in a proposal, not both.';
  if (cmd.kind === 'vassal') {
    if (
      s.realms.find((r) => r.id === cmd.target)?.domainType === 'holding' &&
      !s.regents?.some(
        (r) =>
          r.original?.realmIndex === s.realms.find((d) => d.id === cmd.target)?.original?.index &&
          typeof r.original?.index === 'number' &&
          r.original.index >= 69,
      )
    )
      return 'Non-landed fealty requires a verified original lieutenant identity.';
    if (state.treaties.some((t) => t.kind === 'vassal' && t.vassal === cmd.target))
      return 'The target already has a liege.';
    // Walk the single-liege chain to reject direct or indirect circular fealty.
    let current = actor;
    const seen = new Set<string>();
    while (!seen.has(current)) {
      seen.add(current);
      if (current === cmd.target) return 'Vassalage cannot form a cycle.';
      const parent = state.treaties.find((t) => t.kind === 'vassal' && t.vassal === current);
      if (!parent) break;
      current = parent.a === current ? parent.b : parent.a;
    }
  }
  for (const [key, owner] of [
    ['offerProvince', actor],
    ['demandProvince', cmd.target],
  ] as const) {
    const id = cmd[key];
    if (!id) continue;
    const p = state.provinces.find((p) => p.id === id);
    if (!p || p.owner !== owner || p.occupiedBy || p.contested)
      return 'Territorial offers require the named sovereign’s uncontested, unoccupied province.';
  }
  for (const [key, owner] of [
    ['offerHolding', actor],
    ['demandHolding', cmd.target],
  ] as const) {
    const id = cmd[key];
    if (!id) continue;
    const h = state.holdings.find((h) => h.id === id);
    if (!h || h.realmId !== owner || h.destroyed || h.contested)
      return 'Select a surviving, uncontested holding belonging to the offeror.';
  }
  const terms = diplomacyTerms(state, s, actor, cmd);
  if (!state.unrestrictedDiplomacy && terms.ambassador < 10)
    return 'The target refuses an audience at its current reaction and alignment.';
  if (!state.unrestrictedDiplomacy && terms.reaction < terms.minimum)
    return `Modified reaction ${terms.reaction}% is below the ${terms.minimum}% consideration threshold; improve the offer before bidding RP.`;
  return null;
}
function ensureTreaty(state: Campaign, a: string, b: string) {
  let t = relation(state, a, b);
  if (!t) {
    t = { a, b, kind: 'peace', opinion: 0, reactionA: 50, reactionB: 50, since: state.turn };
    state.treaties.push(t);
  }
  return t;
}
export function applyDiplomacy(
  state: Campaign,
  _s: Scenario,
  actor: string,
  cmd: Proposal,
  won: boolean,
) {
  const t = ensureTreaty(state, actor, cmd.target);
  t.lastProposalTurn = state.turn;
  if (won) {
    const acceptedReaction = diplomacyTerms(state, _s, actor, cmd).reaction;
    const lieutenantSalary =
      cmd.offerTribute === undefined
        ? undefined
        : cmd.offerTribute +
          (state.tributes?.find((t) => t.payer === actor && t.recipient === cmd.target)?.amount ??
            0);
    t.kind = cmd.kind;
    t.since = state.turn;
    delete t.brokenBy;
    if (cmd.kind === 'vassal') t.vassal = cmd.target;
    else {
      delete t.vassal;
      delete t.regencyPledge;
    }
    // ACTNMENU::PaintDiplomacy caps the accepted reactions in each direction.
    const towardActor = Math.max(0, Math.min(150, acceptedReaction));
    const towardTarget = Math.max(0, Math.min(cmd.kind === 'vassal' ? 95 : 150, acceptedReaction));
    t.reactionA = t.a === actor ? towardTarget : towardActor;
    t.reactionB = t.a === actor ? towardActor : towardTarget;
    state.warDeclarations = state.warDeclarations?.filter(
      (w) =>
        !(
          (w.actor === actor && w.target === cmd.target) ||
          (w.actor === cmd.target && w.target === actor)
        ),
    );
    const a = state.realms.find((r) => r.id === actor)!,
      b = state.realms.find((r) => r.id === cmd.target)!;
    const transfer = (cmd.offerGold ?? 0) - (cmd.demandGold ?? 0);
    a.treasury = goldBars(a.treasury - transfer);
    b.treasury = goldBars(b.treasury + transfer);
    for (const [id, owner] of [
      [cmd.offerProvince, cmd.target],
      [cmd.demandProvince, actor],
    ])
      if (id) state.provinces.find((p) => p.id === id)!.owner = owner!;
    for (const [id, owner] of [
      [cmd.offerHolding, cmd.target],
      [cmd.demandHolding, actor],
    ])
      if (id) state.holdings.find((h) => h.id === id)!.realmId = owner!;
    state.tributes ??= [];
    for (const [payer, recipient, amount] of [
      [actor, cmd.target, cmd.offerTribute],
      [cmd.target, actor, cmd.demandTribute],
    ] as const) {
      if (amount === undefined) continue;
      state.tributes = state.tributes.filter(
        (t) => !(t.payer === payer && t.recipient === recipient),
      );
      if (amount)
        state.tributes.push({ id: `tribute-${state.nextId++}`, payer, recipient, amount });
    }
    if (cmd.kind === 'vassal') assimilateNonLanded(state, _s, actor, cmd.target, lieutenantSalary);
  }
  state.log.push({
    code: won ? 'treaty.accepted' : 'treaty.rejected',
    turn: state.turn,
    realmId: actor,
    data: { target: cmd.target, kind: cmd.kind },
  });
}
export function breakAgreement(state: Campaign, actor: string, target: string) {
  const t = ensureTreaty(state, actor, target);
  t.kind = 'peace';
  delete t.vassal;
  delete t.regencyPledge;
  t.brokenBy = actor;
  if (t.a === target) {
    t.grievanceA = true;
    t.grievanceB = false;
  } else {
    t.grievanceB = true;
    t.grievanceA = false;
  }
  if (t.a === target) t.reactionA = Math.max(0, diplomaticReaction(state, target, actor) - 25);
  else t.reactionB = Math.max(0, diplomaticReaction(state, target, actor) - 25);
  state.tributes = state.tributes?.filter(
    (t) =>
      !(
        (t.payer === actor && t.recipient === target) ||
        (t.payer === target && t.recipient === actor)
      ),
  );
  state.log.push({ code: 'treaty.broken', turn: state.turn, realmId: actor, data: { target } });
}
export function seasonalDiplomacy(state: Campaign, scenario?: Scenario) {
  const excluded = new Set([15, 17, 19, 23, 24, 26, 29]);
  const realms = scenario?.realms
    .filter((r) => {
      const i = Number(r.original?.index);
      return Number.isInteger(i) && i >= 1 && i < 35;
    })
    .sort((a, b) => Number(a.original?.index) - Number(b.original?.index));
  // Iterate native directed cells. Existing treaty consequences run even with random events off.
  const pairs = realms?.length
    ? realms.flatMap((a) => realms.filter((b) => a.id !== b.id).map((b) => [a.id, b.id] as const))
    : state.treaties.flatMap(
        (t) =>
          [
            [t.a, t.b],
            [t.b, t.a],
          ] as const,
      );
  for (const [from, toward] of pairs) {
    const t = ensureTreaty(state, from, toward);
    let value = diplomaticReaction(state, from, toward);
    const status = (from === t.a ? t.originalStatusA : t.originalStatusB) ?? 0;
    const grievance =
      (from === t.a ? t.grievanceA : t.grievanceB) ??
      Boolean(status & 0x80 || (t.brokenBy === toward && from !== t.brokenBy));
    const index = (id: string) =>
      Number(scenario?.realms.find((r) => r.id === id)?.original?.index);
    if (state.eventOptions.diplomaticEvents) {
      if (grievance) value -= randomInt(state, 1, 5);
      else if (
        !excluded.has(index(from)) &&
        !excluded.has(index(toward)) &&
        randomInt(state, 0, 49) === 0
      )
        value += randomInt(state, 1, 5);
    }
    const oldKind = t.kind;
    const vassalSide = t.kind === 'vassal' && t.vassal === from;
    if (vassalSide) {
      const tribute =
        state.tributes?.find((x) => x.payer === toward && x.recipient === from)?.amount ?? 0;
      if (tribute && value >= 40 && value < 65) value = 65 + tribute * 3;
    }
    if ((t.kind === 'alliance' || (t.kind === 'vassal' && !vassalSide)) && value < 45) {
      t.kind = 'pact';
      delete t.vassal;
      delete t.regencyPledge;
    } else if ((t.kind === 'pact' && value < 35) || (vassalSide && value < 40)) {
      if (t.kind === 'vassal')
        state.tributes = state.tributes?.filter(
          (x) =>
            !(
              (x.payer === from && x.recipient === toward) ||
              (x.payer === toward && x.recipient === from)
            ),
        );
      t.kind = 'peace';
      delete t.vassal;
      delete t.regencyPledge;
    }
    if (from === t.a) t.reactionA = Math.max(0, Math.min(255, value));
    else t.reactionB = Math.max(0, Math.min(255, value));
    if (oldKind !== t.kind && toward === state.playerRealm)
      state.log.push({
        code: 'event.diplomacy',
        turn: state.turn,
        realmId: toward,
        data: { target: from, kind: t.kind },
      });
  }
}
/** SetHelped reconstruction: forgive a grievance, otherwise improve both directed reactions. */
export function diplomaticHelp(state: Campaign, target: string, actor: string) {
  const t = ensureTreaty(state, target, actor),
    side = t.a === target;
  const grieved =
    (side ? t.grievanceA : t.grievanceB) ??
    Boolean(((side ? t.originalStatusA : t.originalStatusB) ?? 0) & 0x80 || t.brokenBy === actor);
  if (grieved) {
    if (side) t.grievanceA = false;
    else t.grievanceB = false;
    return;
  }
  const a = Math.min(150, diplomaticReaction(state, t.a, t.b) + randomInt(state, 1, 5));
  const b = Math.min(150, diplomaticReaction(state, t.b, t.a) + randomInt(state, 1, 5));
  t.reactionA = a;
  t.reactionB = b;
}
/** Historical WarDeclared: explicit directional declarations and NPC full-alliance support. */
export function declarePCWar(state: Campaign, s: Scenario, actor: string, target: string) {
  const full = (a: string, b: string) =>
    ['alliance', 'vassal'].includes(relation(state, a, b)?.kind ?? '');
  const eligible = state.realms.filter(
    (r) =>
      !r.eliminated &&
      r.controller === 'ai' &&
      s.realms.some((d) => d.id === r.id && d.domainType === 'territorial'),
  );
  const attackers = [
    actor,
    ...eligible
      .filter((r) => r.id !== target && r.id !== actor && full(r.id, actor) && !full(r.id, target))
      .map((r) => r.id),
  ];
  const defenders =
    state.realms.find((r) => r.id === target)?.controller === 'ai'
      ? [
          target,
          ...eligible
            .filter(
              (r) => r.id !== actor && r.id !== target && full(r.id, target) && !full(r.id, actor),
            )
            .map((r) => r.id),
        ]
      : [];
  const declare = (from: string, to: string) => {
    state.warDeclarations ??= [];
    if (state.warDeclarations.some((w) => w.actor === from && w.target === to)) return;
    const reverse = state.warDeclarations.some((w) => w.actor === to && w.target === from);
    const t = ensureTreaty(state, from, to);
    if (!reverse) {
      const fromReaction = diplomaticReaction(state, from, to),
        toReaction = diplomaticReaction(state, to, from);
      const paid = state.tributes?.find((t) => t.payer === to && t.recipient === from)?.amount ?? 0;
      const sent = state.tributes?.find((t) => t.payer === from && t.recipient === to)?.amount ?? 0;
      const a = Math.max(0, fromReaction - paid * 5),
        b = Math.max(0, toReaction - randomInt(state, 5, 14) - sent * 5);
      t.reactionA = t.a === from ? a : b;
      t.reactionB = t.a === from ? b : a;
    }
    t.kind = 'war';
    delete t.vassal;
    delete t.regencyPledge;
    t.since = state.turn;
    state.tributes = state.tributes?.filter(
      (t) =>
        !((t.payer === from && t.recipient === to) || (t.payer === to && t.recipient === from)),
    );
    state.warDeclarations.push({ actor: from, target: to, turn: state.turn });
    state.log.push({
      code: 'treaty.accepted',
      turn: state.turn,
      realmId: from,
      data: { target: to, kind: 'war' },
    });
  };
  for (const from of [...new Set(attackers)]) declare(from, target);
  for (const from of [...new Set(defenders)]) declare(from, actor);
}
export function empirePoints(state: Campaign, s: Scenario, realm: string) {
  return state.provinces.reduce((n, p) => {
    if (p.owner === realm)
      return (
        n +
        3 +
        (s.victory.excludedBonusRealms?.includes(realm)
          ? 0
          : (s.victory.conquestPoints?.[p.id] ?? 0))
      );
    const t = relation(state, realm, p.owner);
    return (
      n +
      (t?.kind === 'vassal' && t.vassal === p.owner
        ? 3
        : t?.kind === 'alliance' || t?.kind === 'vassal'
          ? 2
          : t?.kind === 'pact'
            ? 1
            : 0)
    );
  }, 0);
}
