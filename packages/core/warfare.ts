import type { Army, Campaign, Province, Scenario } from './schema';
import type { BattleResolver } from './combat';
import { relation } from './selectors';
import { fortLevel, provinceController } from './domains';
import { compareIds } from './order';
import { randomInt } from './random';
import { RULESETS } from './rules';

// RULES.TXT §§113/150/155/129; source trace and compatibility limits in GAMEPLAY_SYSTEMS.md.
function record(
  state: Campaign,
  code: string,
  realmId: string,
  data: Campaign['log'][number]['data'],
) {
  state.log.push({ code, turn: state.turn, realmId, data });
}
export const unitsHere = (state: Campaign, provinceId: string, realmId: string) =>
  state.armies
    .filter((a) => a.provinceId === provinceId && a.realmId === realmId)
    .reduce((n, a) => n + a.units.length, 0);
export const allied = (state: Campaign, a: string, b: string) =>
  a === b || relation(state, a, b)?.kind === 'alliance';
export function mayInvade(state: Campaign, actor: string, target: string) {
  return state.warDeclarations
    ? state.warDeclarations.some((w) => w.actor === actor && w.target === target)
    : relation(state, actor, target)?.kind === 'war';
}
export function mayEnter(state: Campaign, actor: string, province: Province) {
  const controller = provinceController(province);
  return (
    province.owner === actor ||
    controller === actor ||
    allied(state, actor, controller) ||
    mayInvade(state, actor, controller)
  );
}
export function hostileFortLevel(state: Campaign, p: Province, actor: string) {
  if (!state.fortifications) return allied(state, actor, p.fortOwner ?? p.owner) ? 0 : p.fort;
  return Math.max(
    0,
    ...state.fortifications
      .filter((f) => f.provinceId === p.id && f.level > 0 && !allied(state, actor, f.realmId))
      .map((f) => f.level),
  );
}
export function investitureGarrison(state: Campaign, p: Province) {
  return Math.max(
    1,
    p.level +
      state.holdings
        .filter((h) => h.provinceId === p.id && h.type === 'law')
        .reduce((n, h) => n + h.level, 0),
  );
}
export function investitureTerms(
  state: Campaign,
  scenario: Scenario,
  p: Province,
  actor: string,
  bid = 0,
) {
  const priest =
    scenario.realms.find((r) => r.id === actor)?.regent.class === 'priest' ||
    state.characters?.some(
      (c) =>
        c.realmId === actor &&
        scenario.regents?.some((r) => r.id === c.regentId && r.class === 'priest'),
    );
  return {
    gold: priest ? 1 : 4,
    regency: p.level + bid,
    actions: 1,
    threshold: Math.max(1, 10 - bid),
    garrison: investitureGarrison(state, p),
  };
}
export function investitureProblem(state: Campaign, p: Province, actor: string): string | null {
  if (p.owner === actor) return 'You already hold legitimate sovereignty over this province.';
  if (p.occupiedBy !== actor) return 'Your army must occupy this province first.';
  if (state.armies.some((a) => a.provinceId === p.id && !allied(state, actor, a.realmId)))
    return 'Enemy troops remain in the province.';
  if (unitsHere(state, p.id, actor) < hostileFortLevel(state, p, actor))
    return 'Neutralize each hostile castle or wizard tower with at least as many units as its level.';
  if (p.contested) return 'Military control is contested.';
  if (unitsHere(state, p.id, actor) < investitureGarrison(state, p))
    return `Investiture requires ${investitureGarrison(state, p)} units (province level plus law levels).`;
  if (
    p.investitureReadyTurn == null ||
    p.investitureReadyTurn > state.turn ||
    p.occupationInterruptedTurn === state.turn
  )
    return 'Maintain the required garrison across End season without an enemy attack before investing.';
  return null;
}
function clearPreparation(p: Province) {
  delete p.investitureReadyTurn;
}
export function refreshOccupations(state: Campaign, scenario: Scenario) {
  if (scenario.policy?.conquest !== 'occupation') return;
  for (const p of state.provinces) {
    if (p.occupiedBy) {
      const occupier = p.occupiedBy;
      if (!unitsHere(state, p.id, occupier)) {
        p.occupiedBy = null;
        p.contested = false;
        p.militaryContested = false;
        delete p.occupationSinceTurn;
        delete p.occupationInterruptedTurn;
        clearPreparation(p);
        record(state, 'occupation.ended', occupier, { province: p.id, target: p.owner });
      } else {
        p.contested =
          state.armies.some((a) => a.provinceId === p.id && !allied(state, occupier, a.realmId)) ||
          unitsHere(state, p.id, occupier) < hostileFortLevel(state, p, occupier);
        p.militaryContested = p.contested;
        if (p.contested || unitsHere(state, p.id, occupier) < investitureGarrison(state, p))
          clearPreparation(p);
      }
    } else {
      // An independently owned, unneutralized fort can still contest an invested province.
      const contested = hostileFortLevel(state, p, p.owner) > unitsHere(state, p.id, p.owner);
      if (contested || p.militaryContested) p.contested = contested;
      p.militaryContested = contested;
    }
  }
}
export function matureOccupations(state: Campaign, scenario: Scenario) {
  if (scenario.policy?.conquest !== 'occupation') return;
  for (const p of state.provinces) {
    if (
      p.occupiedBy &&
      !p.contested &&
      p.occupationInterruptedTurn !== state.turn &&
      unitsHere(state, p.id, p.occupiedBy) >= investitureGarrison(state, p)
    ) {
      if (p.investitureReadyTurn == null) {
        p.investitureReadyTurn = state.turn + 1;
        record(state, 'occupation.prepared', p.occupiedBy, { province: p.id });
      }
    }
  }
}
export function resolveSieges(state: Campaign, scenario: Scenario) {
  if (scenario.policy?.conquest !== 'occupation') return;
  if (state.fortifications) {
    for (const f of state.fortifications) {
      const p = state.provinces.find((p) => p.id === f.provinceId)!;
      const controller = provinceController(p);
      if (
        !allied(state, controller, f.realmId) &&
        f.level > 0 &&
        unitsHere(state, p.id, controller) >= f.level
      ) {
        f.level--;
        record(state, 'fort.besieged', controller, {
          province: p.id,
          level: f.level,
          target: f.realmId,
        });
      }
    }
    for (const p of state.provinces) p.fort = fortLevel(state, p);
  } else {
    for (const p of state.provinces) {
      const controller = provinceController(p);
      if (
        p.fort > 0 &&
        !allied(state, controller, p.fortOwner ?? p.owner) &&
        unitsHere(state, p.id, controller) >= p.fort
      )
        p.fort--;
    }
  }
}
function retreat(state: Campaign, scenario: Scenario, army: Army, from: string, excluded: string) {
  const target = [...(scenario.provinces.find((p) => p.id === from)?.adjacent ?? [])]
    .sort(compareIds)
    .map((id) => state.provinces.find((p) => p.id === id)!)
    .find(
      (p) =>
        p.id !== excluded &&
        allied(state, army.realmId, provinceController(p)) &&
        !state.armies.some((a) => a.provinceId === p.id && !allied(state, army.realmId, a.realmId)),
    );
  if (target) {
    army.provinceId = target.id;
    army.moved = true;
    record(state, 'army.retreated', army.realmId, { province: from, destination: target.id });
  } else {
    army.units = [];
    record(state, 'army.trapped', army.realmId, { province: from });
  }
}
export function resolveMarch(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  army: Army,
  p: Province,
  battle: BattleResolver,
) {
  const originalRules = scenario.policy?.conquest === 'occupation';
  const from = army.provinceId;
  const oldController = provinceController(p);
  army.moved = true;
  const defenders = state.armies.filter(
    (a) =>
      a.provinceId === p.id &&
      a.realmId !== actor &&
      (relation(state, actor, a.realmId)?.kind === 'war' ||
        (originalRules &&
          !allied(state, actor, a.realmId) &&
          (p.owner === actor || p.occupiedBy === a.realmId))),
  );
  // A castle by itself does not create a field army. It contests/suffers siege separately.
  const fight =
    defenders.length > 0 ||
    (!originalRules &&
      oldController !== actor &&
      relation(state, actor, oldController)?.kind === 'war');
  let won = true;
  if (fight) {
    if (originalRules && p.occupiedBy && p.occupiedBy !== actor) {
      p.occupationInterruptedTurn = state.turn;
      clearPreparation(p);
    }
    const result = battle.resolve({
      attacker: structuredClone(army),
      defenders: structuredClone(defenders),
      provinceId: p.id,
      state: structuredClone(state),
      scenario,
    });
    if (
      ![result.attackerLoss, result.defenderLoss].every(
        (n) => Number.isFinite(n) && n >= 0 && n <= 100,
      ) ||
      ![result.attackPower, result.defensePower].every(Number.isFinite)
    )
      throw new Error('Invalid battle outcome');
    for (const u of army.units) u.strength = Math.max(0, u.strength - result.attackerLoss);
    for (const a of defenders)
      for (const u of a.units) u.strength = Math.max(0, u.strength - result.defenderLoss);
    for (const a of [army, ...defenders])
      a.units = a.units.filter((u) => u.strength >= (originalRules ? 25 : 1));
    won = result.attackerWins && army.units.length > 0;
    if (won) {
      army.provinceId = p.id;
      if (originalRules)
        for (const a of defenders.filter((a) => a.units.length))
          retreat(state, scenario, a, p.id, from);
    } else if (originalRules && army.units.length) {
      // Attacker can withdraw to its original province only if it is still safe.
      const origin = state.provinces.find((p) => p.id === from)!;
      if (
        !allied(state, actor, provinceController(origin)) ||
        state.armies.some(
          (a) => a.id !== army.id && a.provinceId === from && !allied(state, actor, a.realmId),
        )
      )
        retreat(state, scenario, army, p.id, p.id);
      else record(state, 'army.retreated', actor, { province: p.id, destination: from });
    }
    state.armies = state.armies.filter((a) => a.units.length > 0);
    record(state, won ? 'battle.won' : 'battle.lost', actor, {
      province: p.id,
      attack: Math.round(result.attackPower),
      defense: Math.round(result.defensePower),
    });
  } else {
    army.provinceId = p.id;
    record(state, 'army.moved', actor, { province: p.id });
  }
  if (won && oldController !== actor && !allied(state, actor, oldController)) {
    if (originalRules) {
      p.occupiedBy = actor === p.owner ? null : actor;
      clearPreparation(p);
      delete p.occupationInterruptedTurn;
      if (p.occupiedBy) {
        p.occupationSinceTurn = state.turn;
        p.loyalty = 1;
        record(state, 'province.occupied', actor, { province: p.id, target: p.owner });
      } else {
        delete p.occupationSinceTurn;
        record(state, 'province.liberated', actor, { province: p.id });
      }
    } else {
      // Covenant Marches remains the explicit legacy conquest regression fixture.
      p.owner = actor;
      p.loyalty = 1;
      p.fort = Math.max(0, p.fort - 1);
    }
  }
}
export function investProvince(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  p: Province,
  bid: number,
) {
  const threshold = investitureTerms(state, scenario, p, actor, bid).threshold;
  const roll = randomInt(state, 1, 20);
  const previous = p.owner;
  if (roll < threshold) {
    record(state, 'investiture.failed', actor, {
      province: p.id,
      roll,
      threshold,
      target: previous,
    });
    return;
  }
  p.owner = actor;
  p.occupiedBy = null;
  p.contested = false;
  p.militaryContested = false;
  delete p.occupationSinceTurn;
  delete p.occupationInterruptedTurn;
  clearPreparation(p);
  // Documented last-province exception applies to the defeated sovereign's forts only.
  // Independent holdings/domains are preserved (future unrestricted-domain compatibility).
  if (!state.provinces.some((q) => q.owner === previous)) {
    for (const f of state.fortifications ?? [])
      if (f.provinceId === p.id && f.realmId === previous) f.realmId = actor;
  }
  if (state.fortifications) p.fort = fortLevel(state, p);
  else if (p.fort > 0)
    p.fortOwner = state.provinces.some((q) => q.owner === previous) ? previous : actor;
  record(state, 'province.invested', actor, { province: p.id, target: previous, roll, threshold });
}
export function pillageProvince(state: Campaign, actor: string, p: Province) {
  const level = Math.min(p.level, unitsHere(state, p.id, actor));
  const range = RULESETS[state.ruleset].tax.severe[level] ?? [0, 0];
  const gold = randomInt(state, range[0], range[1]);
  state.realms.find((r) => r.id === actor)!.treasury += gold;
  p.level--;
  p.loyalty = Math.max(0, p.loyalty - 1);
  p.pillagedTurn = state.turn;
  clearPreparation(p);
  // Keep all holding IDs and owners. Sources are not civilization-dependent.
  for (const type of ['law', 'guild', 'temple'] as const) {
    const holdings = state.holdings
      .filter((h) => h.provinceId === p.id && h.type === type)
      .sort((a, b) => compareIds(a.id, b.id));
    let excess = holdings.reduce((n, h) => n + h.level, 0) - p.level;
    for (const h of holdings.slice().reverse()) {
      const cut = Math.max(0, Math.min(h.level, excess));
      h.level -= cut;
      excess -= cut;
    }
  }
  record(state, 'province.pillaged', actor, { province: p.id, gold, level: p.level });
}
