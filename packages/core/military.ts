import type { Army, Campaign, Command, Scenario } from './schema';
import records from '../world-data/pc-units.json';
import { provinceController } from './domains';
import { relation } from './selectors';
import { hostileFortLevel, unitsHere } from './warfare';

export const usesPCStrategy = (s: Scenario) => s.policy?.strategicRules === 'pc-1997';
export const goldBars = (n: number) => Math.round(n * 10) / 10;
export const PC_UNITS: Scenario['units'] = records.map((r) => ({
  id: `pc-unit-${r.icon}`,
  name: r.name,
  // CD help takes priority over the modified source's reversed gnoll muster prices.
  cost: r.icon === 23 ? 3 : r.icon === 24 ? 2 : r.cost,
  upkeep: r.upkeep,
  minLevel: r.minLevel,
  recruitable: r.icon <= 24,
  mobility: [8, 9, 14, 17, 22].includes(r.icon) ? 'mounted' : 'foot',
  power: Math.max(1, Math.round(r.melee + r.defense + r.morale + r.missile / 2 + r.charge / 2)),
  pc: {
    icon: r.icon,
    move: r.move,
    defense: r.defense,
    melee: r.melee,
    charge: r.charge,
    missile: r.missile,
    morale: r.morale,
    bonus: r.bonus,
    race: r.race as 'human' | 'elf' | 'dwarf' | 'goblin' | 'gnoll' | 'monster',
    mercenary: r.mercenary,
  },
  provenance: {
    status: 'INFERRED',
    source:
      'CD RULES.TXT §§073/158/226; historical BATTLE.CPP::BattleTroopInfo, ACTNMENU.CPP, GAMEMAP.CPP (fc470550)',
    note: 'Original unit characteristics and cost tables. Scalar power is an explicit HD auto-resolution projection, not a retail formula.',
  },
}));

export function recruitmentProblem(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  provinceId: string,
  unitType: string,
): string | null {
  const p = state.provinces.find((p) => p.id === provinceId),
    unit = scenario.units.find((u) => u.id === unitType);
  if (!p || !unit?.pc || !unit.recruitable) return 'Choose a supported original military type.';
  if (p.contested) return 'Recruitment requires uncontested military control.';
  const held = state.holdings.filter(
    (h) => h.realmId === actor && h.provinceId === p.id && !h.destroyed && !h.contested,
  );
  const threshold = [1, 3, 5].includes(unit.pc.icon)
    ? 4
    : unit.pc.icon === 4
      ? 3
      : unit.pc.icon === 7
        ? 2
        : Infinity;
  const holdingRight = held.some(
    (h) =>
      (unit.pc!.icon === 7 ? h.type === 'guild' : ['law', 'guild', 'temple'].includes(h.type)) &&
      h.level >= threshold,
  );
  const control = provinceController(p) === actor;
  const mercenaryRight =
    unit.pc.mercenary &&
    held.length > 0 &&
    ['pact', 'alliance', 'vassal'].includes(
      relation(state, actor, provinceController(p))?.kind ?? '',
    );
  if (!control && !holdingRight && !mercenaryRight)
    return 'Requires military control, the original qualifying holding, or allied mercenary recruitment rights.';
  if (p.level < unit.minLevel && !holdingRight)
    return `Province level ${unit.minLevel} is required.`;
  if (
    state.armies.some(
      (a) =>
        a.provinceId === p.id &&
        a.realmId !== actor &&
        !['pact', 'alliance', 'vassal'].includes(relation(state, actor, a.realmId)?.kind ?? ''),
    )
  )
    return 'Foreign troops prevent mustering here.';
  const population = scenario.provinces.find((d) => d.id === p.id)?.original?.population as
    Record<string, boolean> | undefined;
  if (!unit.pc.mercenary && !population?.[unit.pc.race])
    return `This province has no recovered ${unit.pc.race} population for this unit.`;
  if ((p.musteredTurn === state.turn ? (p.musteredCount ?? 0) : 0) >= p.level)
    return 'The province has reached its total seasonal muster limit (province level).';
  return null;
}
const terrainCosts = [0, 2, 1, 4, 255, 3, 2, 4, 0, 0];
/** Spawned raiders, or their local defenders, can resolve a field encounter in place. */
export function monsterEncounter(state: Campaign, army: Army) {
  return (
    (state.realms.some((r) => r.id === army.realmId && r.behavior === 'monsters') &&
      state.provinces.some(
        (p) => p.id === army.provinceId && provinceController(p) !== army.realmId,
      )) ||
    state.armies.some(
      (a) =>
        a.realmId !== army.realmId &&
        a.provinceId === army.provinceId &&
        state.realms.some(
          (r) => (r.id === a.realmId || r.id === army.realmId) && r.behavior === 'monsters',
        ),
    )
  );
}
export function movementCost(
  state: Campaign,
  scenario: Scenario,
  army: Army,
  destination: string,
): number | null {
  if (army.provinceId === destination && monsterEncounter(state, army)) return 0;
  const def = scenario.provinces.find((p) => p.id === army.provinceId);
  if (!def?.adjacent.includes(destination)) return null;
  const borders = def.original?.borders as
    { provinceIndex: number; movementCode: number }[] | undefined;
  const target = scenario.provinces.find((p) => p.id === destination);
  const index = target?.original?.index as number | undefined;
  const code = state.roads?.some((r) => r.from === def.id && r.to === destination)
    ? 8
    : borders?.find((b) => b.provinceIndex === index)?.movementCode;
  if (code === undefined || terrainCosts[code] === undefined || terrainCosts[code]! >= 100)
    return null;
  return goldBars(
    army.units.reduce((n, u) => {
      const race = scenario.units.find((d) => d.id === u.type)?.pc?.race;
      const cost =
        (code === 1 && race === 'elf') || ([3, 6].includes(code) && race === 'dwarf')
          ? 1
          : terrainCosts[code]!;
      return n + cost;
    }, 0) / 10,
  );
}
export function militaryProblem(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  cmd: Command,
): string | null {
  if (cmd.type === 'RecruitUnit')
    return recruitmentProblem(state, scenario, actor, cmd.provinceId, cmd.unitType);
  if (!['MoveArmy', 'DisbandUnit', 'SplitArmy', 'JoinArmies'].includes(cmd.type)) return null;
  if (!('armyId' in cmd)) return null;
  const a = state.armies.find((a) => a.id === cmd.armyId);
  if (!a || a.realmId !== actor) return 'Choose an army belonging to your domain.';
  if (cmd.type === 'DisbandUnit')
    return a.units.some((u) => u.id === cmd.unitId) ? null : 'Choose a unit in this army.';
  if (cmd.type === 'SplitArmy')
    return cmd.unitIds.length < a.units.length &&
      new Set(cmd.unitIds).size === cmd.unitIds.length &&
      cmd.unitIds.every((id) => a.units.some((u) => u.id === id))
      ? null
      : 'Split a distinct proper subset of this army.';
  if (cmd.type === 'JoinArmies') {
    const b = state.armies.find((b) => b.id === cmd.otherArmyId);
    return b &&
      b.id !== a.id &&
      b.realmId === actor &&
      b.provinceId === a.provinceId &&
      a.units.length + b.units.length <= 15
      ? null
      : 'Join two of your armies in the same province, up to 15 units.';
  }
  if (cmd.type === 'MoveArmy') {
    if (a.retreatedTurn === state.turn)
      return 'This army retreated and must reorganize until the next season (strategic compatibility rule).';
    if (cmd.destination === a.provinceId && monsterEncounter(state, a)) return null;
    if (movementCost(state, scenario, a, cmd.destination) === null)
      return 'No passable recovered border connects these provinces; mountain ranges are impassable.';
    const here = state.provinces.find((p) => p.id === a.provinceId)!;
    if (
      state.armies.some(
        (b) =>
          b.id !== a.id &&
          b.provinceId === a.provinceId &&
          b.realmId !== actor &&
          !['pact', 'alliance', 'vassal'].includes(relation(state, actor, b.realmId)?.kind ?? ''),
      )
    )
      return 'Troops are engaged with a foreign force.';
    const dest = state.provinces.find((p) => p.id === cmd.destination)!;
    if (
      unitsHere(state, here.id, actor) < hostileFortLevel(state, here, actor) &&
      dest.owner !== actor &&
      dest.occupiedBy !== actor
    )
      return 'A hostile fort blocks further foreign advance; neutralize it or withdraw to your land.';
  }
  return null;
}
