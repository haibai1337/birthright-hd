import type { Army, Campaign, Scenario } from './schema';
import { armyPower } from './selectors';
import { RULESETS } from './rules';
import { fortLevel } from './domains';
import { hostileFortLevel } from './warfare';
import { usesPCStrategy } from './military';
export interface BattleRequest {
  attacker: Army;
  defenders: Army[];
  provinceId: string;
  state: Campaign;
  scenario: Scenario;
}
export interface BattleResult {
  attackerWins: boolean;
  attackerLoss: number;
  defenderLoss: number;
  attackPower: number;
  defensePower: number;
}
export interface BattleResolver {
  resolve(request: BattleRequest): BattleResult;
}
/** Explicit HD projection of native battle-card attributes; no claim of retail auto-battle parity. */
export function strategicBattlePower(
  army: Army,
  enemies: Army[],
  scenario: Scenario,
  terrain: string,
) {
  const opposition = enemies
    .flatMap((a) => a.units)
    .map((u) => scenario.units.find((d) => d.id === u.type));
  const mounted =
    opposition.filter((u) => u?.mobility === 'mounted').length / Math.max(1, opposition.length);
  const pikes =
    opposition.filter(
      (u) => u?.pc?.bonus === 'pikemen' || u?.name.toLowerCase().includes('irregular'),
    ).length / Math.max(1, opposition.length);
  return army.units.reduce((n, u) => {
    const d = scenario.units.find((d) => d.id === u.type),
      pc = d?.pc;
    if (!pc) return n + (((d?.power ?? 0) + (u.blessed ? 1 : 0)) * u.strength) / 100;
    let bonus =
      pc.bonus.includes('vs-cavalry') || pc.bonus === 'pikemen'
        ? mounted
        : pc.bonus.includes('pikes-irreg')
          ? pikes
          : 0;
    // Terrain immunity preserves native scouts/elf/spider identities in the compatibility resolver.
    if (pc.bonus === 'ignore-terrain' && terrain !== 'plains' && terrain !== 'coast') bonus++;
    return n + ((d!.power + (u.blessed ? 1 : 0) + bonus) * u.strength) / 100;
  }, 0);
}
// Tactical adapter must return these authoritative casualties; it never owns campaign state.
export const autoResolve: BattleResolver = {
  resolve({ attacker, defenders, provinceId, state, scenario }) {
    const province = state.provinces.find((p) => p.id === provinceId);
    const terrain = scenario.provinces.find((p) => p.id === provinceId)?.terrain ?? 'plains';
    const ward = state.effects.some(
      (e) => !e.kind && e.provinceId === provinceId && e.realmId === province?.owner,
    )
      ? RULESETS[state.ruleset].wardPower
      : 0;
    const pc = usesPCStrategy(scenario);
    const attackPower = pc
      ? strategicBattlePower(attacker, defenders, scenario, terrain)
      : armyPower(attacker, scenario);
    const defensePower =
      defenders.reduce(
        (n, a) =>
          n +
          (pc ? strategicBattlePower(a, [attacker], scenario, terrain) : armyPower(a, scenario)),
        0,
      ) +
      (province
        ? scenario.policy?.conquest === 'occupation'
          ? attacker.units.length < hostileFortLevel(state, province, attacker.realmId)
            ? hostileFortLevel(state, province, attacker.realmId)
            : 0
          : fortLevel(state, province)
        : 0) *
        3 +
      (pc ? 0 : (province?.level ?? 0)) +
      (RULESETS[state.ruleset].terrainDefense[terrain] ?? 0) +
      ward;
    const attackerWins = attackPower > defensePower;
    return {
      attackerWins,
      attackPower,
      defensePower,
      attackerLoss: attackerWins
        ? Math.min(70, Math.floor((defensePower / Math.max(1, attackPower)) * 65))
        : scenario.policy?.conquest === 'occupation'
          ? 75
          : 100,
      defenderLoss: attackerWins
        ? scenario.policy?.conquest === 'occupation'
          ? 75
          : 100
        : Math.min(70, Math.floor((attackPower / Math.max(1, defensePower)) * 65)),
    };
  },
};
