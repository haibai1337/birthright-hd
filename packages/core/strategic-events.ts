import type { Campaign, CampaignEventOptions, Scenario } from './schema';
import { randomInt } from './random';
import { goldBars } from './military';
import { playerControls } from './fealty';
import { empirePoints, diplomaticHelp } from './diplomacy';
import { relation } from './selectors';
import { rulingRegent } from './regents';
import { fortLevel } from './domains';
import { refreshLeyLines } from './ley-lines';
import { refreshTradeRoutes } from './trade';
import { refreshOccupations } from './warfare';

/** Initial report is native date 1 = HD turn 1. At the post-report event phase date = turn. */
export const originalCampaignDate = (state: Pick<Campaign, 'turn'>) => state.turn;
export function originalEventPool(state: Pick<Campaign, 'turn' | 'difficulty'>) {
  return originalCampaignDate(state) < { easy: 4, medium: 3, hard: 2 }[state.difficulty] ? 9 : 18;
}
export function originalEventCategory(event: number): keyof CampaignEventOptions {
  return event <= 3
    ? 'economicEvents'
    : event <= 8
      ? 'magicalEvents'
      : event <= 16
        ? 'militaryEvents'
        : 'randomRebellions';
}
function record(
  state: Campaign,
  key: string,
  outcome: 'applied' | 'disabled' | 'failed',
  eventId?: number,
  provinceId?: string,
) {
  state.eventHistory.push({ key, outcome, turn: state.turn, eventId, provinceId });
}
function special(state: Campaign, s: Scenario, name: string) {
  const nativeIndex: Record<string, number> = {
    'Five Peaks': 15,
    "Gorgon's Crown": 17,
    Markazor: 19,
    'Mur-Kilad': 24,
    Rhuobhe: 26,
    Spiderfell: 29,
  };
  const definition =
    s.realms.find((r) => r.original?.index === nativeIndex[name]) ??
    s.realms.find((r) => r.name === name);
  return state.realms.find((r) => r.id === definition?.id);
}
function controlled(state: Campaign, s: Scenario, id: string) {
  return (
    state.realms.find((r) => r.id === id)?.controller === 'player' || playerControls(state, s, id)
  );
}
function orderedProvinces(state: Campaign, s: Scenario) {
  const index = new Map(s.provinces.map((p, i) => [p.id, Number(p.original?.index ?? i + 1)]));
  return [...state.provinces].sort((a, b) => index.get(a.id)! - index.get(b.id)!);
}
function region(state: Campaign, s: Scenario, first: string, last = first) {
  // Native source IDs survive localization (GORGE is displayed as The Gorge on this CD).
  const nativeIndex: Record<string, number> = {
    Abattoir: 121,
    Zaptig: 137,
    Gorge: 148,
    Torain: 154,
    Spiderfell: 25,
    Rhuobhe: 45,
    Sideath: 134,
  };
  const find = (name: string) =>
    s.provinces.find(
      (p) => p.id === `anuire-province-${String(nativeIndex[name]).padStart(3, '0')}`,
    ) ?? s.provinces.find((p) => p.name === name);
  const a = find(first),
    b = find(last);
  if (!a || !b) return [];
  const ordered = orderedProvinces(state, s),
    start = ordered.findIndex((p) => p.id === a.id),
    end = ordered.findIndex((p) => p.id === b.id);
  return start >= 0 && end >= start ? ordered.slice(start, end + 1) : [];
}
function eventOwner(state: Campaign, s: Scenario, provinceId: string) {
  for (const [name, first, last] of [
    ['Five Peaks', 'Gorge', 'Torain'],
    ["Gorgon's Crown", 'Abattoir', 'Zaptig'],
    ['Spiderfell', 'Spiderfell', 'Spiderfell'],
    ['Rhuobhe', 'Rhuobhe', 'Rhuobhe'],
  ]) {
    const realm = special(state, s, name!);
    if (
      realm &&
      !realm.eliminated &&
      region(state, s, first!, last).some((p) => p.id === provinceId)
    )
      return realm.id;
  }
  return s.realms.find((r) => r.specialBehavior === 'monsters')?.id;
}
const UNIT_ICONS = [20, 22, 24, 26, 27, 12, 10, 14];

/** Dispatch without category filtering: independent reinforcements also reuse IDs 9–16. */
export function applyOriginalEvent(
  state: Campaign,
  s: Scenario,
  event: number,
  provinceId: string,
) {
  const p = state.provinces.find((p) => p.id === provinceId);
  if (!p || !Number.isInteger(event) || event < 0 || event > 17)
    throw new Error('Invalid original event');
  const diagnostic = {
    key: `original.event-${event}`,
    turn: state.turn,
    eventId: event,
    provinceId,
    outcome: 'failed' as 'applied' | 'failed',
  };
  state.eventHistory.push(diagnostic);
  const report = (code: string, data: Campaign['log'][number]['data'] = {}, target = p) => {
    state.log.push({
      code,
      turn: state.turn,
      realmId: target.owner,
      data: { province: target.id, eventId: event, ...data },
    });
  };
  if (event <= 3) {
    const names =
      event <= 1
        ? ["Gorgon's Crown", 'Markazor', 'Mur-Kilad']
        : [event === 2 ? 'Rhuobhe' : 'Spiderfell'];
    const gate = special(state, s, names[0]!);
    if (!gate || controlled(state, s, gate.id)) return;
    const date = originalCampaignDate(state);
    const amounts =
      event === 0
        ? [200 * date + 1000, 150 * date + 500, 70 * date + 300]
        : event === 1
          ? [1000, 500, 300]
          : [2000];
    names.forEach((name, i) => {
      const r = special(state, s, name);
      if (!r) return;
      r.treasury = goldBars(r.treasury + amounts[i]! / 10);
      // Surplus is a spending estimate, not another collection of the same grant.
      if (event === 0) r.surplusIncome = goldBars((r.surplusIncome ?? 0) + [100, 50, 30][i]!);
    });
  } else if (event <= 8) {
    const kind = (['bless-land', 'blight', 'warding', 'honest-dealing', 'antimagic'] as const)[
      event - 4
    ]!;
    state.effects = state.effects.filter(
      (e) =>
        e.provinceId !== p.id ||
        (e.kind !== kind &&
          !((event === 6 || event === 8) && (e.kind === 'antimagic' || e.kind === 'warding'))),
    );
    const resistance = event === 8 ? randomInt(state, 0, 19) : undefined;
    state.effects.push({
      id: `effect-${state.nextId++}`,
      spellId: event === 8 ? 'dispel-realm-magic' : kind,
      kind,
      realmId:
        event === 6
          ? (s.realms.find((r) => r.specialBehavior === 'monsters')?.id ?? p.owner)
          : p.owner,
      provinceId: p.id,
      expiresTurn: state.turn + 3,
      resistance,
      regencyCost: 0,
    });
    report(
      event === 8 ? 'event.antimagic' : 'event.realm-magic',
      event === 8 ? { resistance: resistance!, regency: resistance! + 1 } : { spell: kind },
    );
  } else if (event === 17) {
    let target = p;
    for (const q of orderedProvinces(state, s))
      if (q.owner === p.owner && q.loyalty > 0 && q.loyalty < target.loyalty) target = q;
    target.loyalty = 0;
    report('event.rebellion', {}, target);
  } else {
    // cntUnits_ includes reserved slot zero; military/character records each count once.
    if (
      1 + state.armies.reduce((n, a) => n + a.units.length, 0) + (state.characters?.length ?? 0) >=
      1000
    )
      return;
    const owner = eventOwner(state, s, p.id),
      icon = UNIT_ICONS[event - 9]!,
      type = `pc-unit-${icon}`;
    if (
      !owner ||
      !state.realms.some((r) => r.id === owner && !r.eliminated) ||
      !s.units.some((u) => u.id === type)
    )
      return;
    let army = state.armies.find(
      (a) => a.realmId === owner && a.provinceId === p.id && a.units.length < 15,
    );
    if (!army) {
      army = {
        id: `army-${state.nextId++}`,
        realmId: owner,
        provinceId: p.id,
        units: [],
        moved: false,
      };
      state.armies.push(army);
    }
    army.units.push({ id: `unit-${state.nextId++}`, type, nativeIcon: icon, strength: 100 });
    report('event.raiders', { target: owner, unit: type });
  }
  diagnostic.outcome = 'applied';
}

/** Post-report phase, once per season. Disabled outcomes stay in the native pool; never reroll. */
export function strategicEvents(state: Campaign, s: Scenario) {
  if (originalCampaignDate(state) < 2 || state.lastCampaignEventTurn === state.turn) return;
  state.lastCampaignEventTurn = state.turn;
  const provinces = orderedProvinces(state, s),
    own = provinces.filter((p) => p.owner === state.playerRealm);
  const attempts = randomInt(state, 3, 7),
    pool = originalEventPool(state);
  record(state, `original.scheduler-${attempts}`, 'applied');
  for (let i = 0; i < attempts; i++) {
    // The source decrements k for every scanned province, not just owned ones.
    // Preserve that bias as well as the small-realm chance of no final event.
    const k = i === attempts - 1 ? randomInt(state, 0, Math.max(3, own.length) - 1) : undefined;
    const p =
      k === undefined
        ? provinces[randomInt(state, 0, provinces.length - 1)]
        : k >= own.length
          ? undefined
          : provinces.find((p, index) => index >= k && p.owner === state.playerRealm);
    if (!p) continue;
    const event = randomInt(state, 0, pool - 1);
    if (!state.eventOptions[originalEventCategory(event)])
      record(state, `original.event-${event}`, 'disabled', event, p.id);
    else applyOriginalEvent(state, s, event, p.id);
  }
  processGorgonPlot(state, s);
  specialReinforcements(state, s);
  // Permanent scripted ward is independent of the random magic switch.
  const sideath = region(state, s, 'Sideath')[0],
    monsters = s.realms.find((r) => r.specialBehavior === 'monsters');
  if (sideath && monsters) {
    state.effects = state.effects.filter(
      (e) => e.provinceId !== sideath.id || e.kind !== 'warding',
    );
    state.effects.push({
      id: `effect-${state.nextId++}`,
      spellId: 'warding',
      kind: 'warding',
      realmId: monsters.id,
      provinceId: sideath.id,
      expiresTurn: state.turn + 3,
      regencyCost: 0,
    });
  }
}

export function chooseGorgonAlly(state: Campaign, s: Scenario) {
  const excluded = new Set([3, 9, 17, 19, 23, 24, 26, 29]);
  let best: string | undefined,
    rawMaximum = 0;
  const ordered = [...s.realms].sort(
    (a, b) => Number(a.original?.index ?? 999) - Number(b.original?.index ?? 999),
  );
  for (const d of ordered) {
    const index = Number(d.original?.index),
      r = state.realms.find((r) => r.id === d.id);
    if (
      !r ||
      r.eliminated ||
      controlled(state, s, r.id) ||
      !Number.isInteger(index) ||
      index < 1 ||
      index >= 35 ||
      excluded.has(index)
    )
      continue;
    const score = empirePoints(state, s, r.id);
    const adjacent = s.provinces.some(
      (p) =>
        state.provinces.some((q) => q.id === p.id && q.owner === state.playerRealm) &&
        p.adjacent.some((id) => state.provinces.some((q) => q.id === id && q.owner === r.id)),
    );
    const allied = ['pact', 'alliance', 'vassal'].includes(
      relation(state, state.playerRealm, r.id)?.kind ?? '',
    );
    const adjusted =
      score +
      Math.trunc((score * Number(adjacent) * 15) / 10) +
      Math.trunc((score * Number(allied) * 15) / 10);
    // Preserve adjusted comparison / raw maximum asymmetry.
    if (adjusted > rawMaximum) {
      best = r.id;
      rawMaximum = score;
    }
  }
  return best;
}
function absorbGorgonAlly(state: Campaign, s: Scenario, gorgon: string) {
  const ally = state.realms.find((r) => r.id === state.gorgonAllyRealmId && !r.eliminated);
  if (!ally || ally.id === gorgon || controlled(state, s, ally.id)) return;
  for (const p of state.provinces) {
    if (p.owner === ally.id) p.owner = gorgon;
    if (p.fortOwner === ally.id) p.fortOwner = gorgon;
    if (p.occupiedBy === ally.id) p.occupiedBy = gorgon;
  }
  for (const collection of [
    state.armies,
    state.holdings,
    state.fortifications ?? [],
    state.ports ?? [],
    state.tradeRoutes,
    state.leyLines ?? [],
    state.effects,
  ])
    for (const entity of collection) if (entity.realmId === ally.id) entity.realmId = gorgon;
  for (const c of state.characters ?? [])
    if (c.realmId === ally.id) {
      c.realmId = gorgon;
      c.role = 'lieutenant';
      c.originRealm ??= ally.id;
    }
  ally.eliminated = true;
  ally.controller = 'passive';
  ally.actions = 0;
  ally.lieutenantOf = gorgon;
  for (const r of state.realms)
    if (r.id !== ally.id && r.lieutenantOf === ally.id) r.lieutenantOf = gorgon;
  state.tributes = state.tributes?.filter((t) => t.payer !== ally.id && t.recipient !== ally.id);
  state.warDeclarations = state.warDeclarations?.filter(
    (w) => w.actor !== ally.id && w.target !== ally.id,
  );
  for (const t of state.treaties)
    if (t.a === ally.id || t.b === ally.id) {
      t.kind = 'peace';
      delete t.vassal;
      delete t.regencyPledge;
    }
  state.pendingEvents = state.pendingEvents.filter((e) => e.realmId !== ally.id);
  for (const p of state.provinces) p.fort = fortLevel(state, p);
  refreshOccupations(state, s);
  refreshTradeRoutes(state, s);
  refreshLeyLines(state);
}
export function processGorgonPlot(state: Campaign, s: Scenario) {
  if (!state.eventOptions.gorgonPlot) return;
  const gorgon = special(state, s, "Gorgon's Crown");
  if (!gorgon || gorgon.eliminated || controlled(state, s, gorgon.id)) return;
  const date = originalCampaignDate(state),
    stage = state.gorgonPlotStage;
  let advance = false;
  if (stage === 0 && date >= 3) {
    delete state.gorgonAllyRealmId;
    advance = true;
  } else if (stage === 1 && date >= 8 && randomInt(state, 0, 3) === 0) {
    state.gorgonAllyRealmId = chooseGorgonAlly(state, s);
    advance = true;
  } else if (stage === 2 && date >= 16 && randomInt(state, 0, 3) === 0) {
    for (const [name, amount] of [
      ["Gorgon's Crown", 40],
      ['Markazor', 20],
      ['Mur-Kilad', 10],
    ] as const) {
      const r = special(state, s, name);
      if (r) r.treasury = goldBars(r.treasury + amount);
    }
    absorbGorgonAlly(state, s, gorgon.id);
    advance = true;
  }
  if (advance) {
    state.gorgonPlotStage++;
    state.pendingGorgonScenes.push(state.gorgonPlotStage);
    record(state, `gorgon.stage-${state.gorgonPlotStage}`, 'applied');
    state.log.push({
      code: 'event.gorgon-plot',
      turn: state.turn,
      realmId: state.playerRealm,
      data: { stage: state.gorgonPlotStage },
    });
  }
  if (state.gorgonPlotStage === 2) {
    const ally = state.realms.find((r) => r.id === state.gorgonAllyRealmId && !r.eliminated);
    if (ally && !controlled(state, s, ally.id)) {
      ally.treasury = goldBars(ally.treasury + 10);
      ally.regency = Math.min(65535, ally.regency + 50);
    }
  }
}
export function specialReinforcements(state: Campaign, s: Scenario) {
  if (!state.eventOptions.specialReinforcements) return;
  const date = originalCampaignDate(state),
    span = { easy: 5, medium: 10, hard: 15 }[state.difficulty];
  const eligible = (name: string) => {
    const r = special(state, s, name);
    return r && !controlled(state, s, r.id);
  };
  const spawn = (id: number, provinceId: string) => applyOriginalEvent(state, s, id, provinceId);
  if (date > 3 && eligible("Gorgon's Crown")) {
    const targets = region(state, s, 'Abattoir', 'Zaptig');
    if (targets.length) {
      const p = targets[randomInt(state, 0, targets.length - 1)]!;
      const skeletons = randomInt(state, 0, 2) !== 0,
        count = randomInt(state, 6, span + 5);
      for (let i = 0; i < count; i++) spawn(skeletons ? 12 : randomInt(state, 9, 16), p.id);
    }
    const gorgon = special(state, s, "Gorgon's Crown")!;
    const character = state.characters?.find(
      (c) => c.realmId === gorgon.id && c.regentId === rulingRegent(s, gorgon.id, state)?.id,
    );
    if (character) {
      const count = randomInt(state, 6, span + 5);
      for (let i = 0; i < count; i++) spawn(12, character.provinceId);
    }
  }
  if (date <= 4) return;
  if (eligible('Five Peaks')) {
    const targets = region(state, s, 'Gorge', 'Torain');
    if (targets.length) {
      const stacks = randomInt(state, 1, { easy: 3, medium: 4, hard: 5 }[state.difficulty]);
      for (let j = 0; j < stacks; j++) {
        const p = targets[randomInt(state, 0, targets.length - 1)]!,
          count = randomInt(state, 5, 7);
        for (let i = 0; i < count; i++) spawn(randomInt(state, 9, 16), p.id);
      }
    }
  }
  for (const name of ['Spiderfell', 'Rhuobhe'])
    if (eligible(name)) {
      const p = region(state, s, name)[0];
      if (!p) continue;
      const count = randomInt(state, 5, 7);
      for (let i = 0; i < count; i++)
        spawn(
          name === 'Spiderfell' && randomInt(state, 0, 2) !== 0 ? 13 : randomInt(state, 9, 12),
          p.id,
        );
    }
}
/** Essential AI administration is independent of all eight event switches. */
export function npcCampaignAdministration(state: Campaign, s: Scenario) {
  for (const d of [...s.realms].sort(
    (a, b) => Number(a.original?.index ?? 999) - Number(b.original?.index ?? 999),
  )) {
    const index = Number(d.original?.index),
      r = state.realms.find((r) => r.id === d.id);
    if (
      !r ||
      r.eliminated ||
      r.controller !== 'ai' ||
      controlled(state, s, r.id) ||
      !Number.isInteger(index) ||
      index < 1 ||
      index >= 35
    )
      continue;
    const amount =
      ({ easy: 5, medium: 10, hard: 15 }[state.difficulty] * originalCampaignDate(state)) / 10 +
      (randomInt(state, 0, 4) === 0 ? 50 : 0);
    r.treasury = goldBars(r.treasury + amount);
    r.surplusIncome = r.treasury;
  }
}
export function synchronizeRebellions(state: Campaign) {
  for (const p of state.provinces)
    if (p.loyalty === 0 && !p.contested) {
      p.contested = true;
      state.log.push({
        code: 'event.rebellion',
        turn: state.turn,
        realmId: p.owner,
        data: { province: p.id },
      });
    }
}

/** Optional legacy 16-bit overflow protection; disabled by default in HD by user decision. */
export function treasuryIncidents(state: Campaign, s: Scenario) {
  if (!state.eventOptions.treasuryIncidents) return;
  const player = state.realms.find((r) => r.id === state.playerRealm)!;
  const excluded = new Set([9, 15, 17, 19, 23, 24, 26, 29, 32]);
  for (let safety = 0; player.treasury >= 5000 && safety < 100; safety++) {
    const roll = randomInt(state, 0, 99);
    const party = originalCampaignDate(state) % 4 === 3;
    const amount = party ? randomInt(state, 1, 4) : roll < 60 ? 1 : 2;
    if (party)
      for (const d of [...s.realms].sort(
        (a, b) => Number(a.original?.index) - Number(b.original?.index),
      )) {
        const index = Number(d.original?.index);
        if (
          !Number.isInteger(index) ||
          index < 1 ||
          index >= 35 ||
          excluded.has(index) ||
          d.id === player.id
        )
          continue;
        const times = randomInt(state, 0, amount + 1) - 1;
        for (let i = 0; i < times; i++) diplomaticHelp(state, d.id, player.id);
      }
    player.treasury = goldBars(player.treasury - amount * 1000);
    const report = [...state.reports]
      .reverse()
      .find((r) => r.realmId === player.id && r.turn === state.turn - 1);
    if (report) {
      report.incidents = goldBars((report.incidents ?? 0) + amount * 1000);
      report.closing = player.treasury;
      report.net -= amount * 1000;
    }
    const kind = party ? 'party' : roll < 60 ? 'theft' : 'embezzle';
    record(state, `treasury.${kind}`, 'applied');
    state.log.push({
      code: 'event.treasury-incident',
      turn: state.turn,
      realmId: player.id,
      data: { kind, gold: amount * 1000 },
    });
  }
  // Bounded protection against malicious/extreme imported balances; retry next report.
  if (player.treasury >= 5000) record(state, 'treasury.safety-limit', 'failed');
}
