import type { Army, Campaign, Scenario } from './schema';
import { armyPower } from './selectors';
import { RULESETS } from './rules';
import { fortLevel } from './domains';
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
// Tactical adapter must return these authoritative casualties; it never owns campaign state.
export const autoResolve: BattleResolver = {
  resolve({ attacker, defenders, provinceId, state, scenario }) {
    const province = state.provinces.find((p) => p.id === provinceId);
    const terrain = scenario.provinces.find((p) => p.id === provinceId)?.terrain ?? 'plains';
    const ward = state.effects.some(
      (e) => e.provinceId === provinceId && e.realmId === province?.owner,
    )
      ? RULESETS[state.ruleset].wardPower
      : 0;
    const attackPower = armyPower(attacker, scenario);
    const defensePower =
      defenders.reduce((n, a) => n + armyPower(a, scenario), 0) +
      (province ? fortLevel(state, province) : 0) * 3 +
      (province?.level ?? 0) +
      (RULESETS[state.ruleset].terrainDefense[terrain] ?? 0) +
      ward;
    const attackerWins = attackPower > defensePower;
    return {
      attackerWins,
      attackPower,
      defensePower,
      attackerLoss: attackerWins
        ? Math.min(70, Math.floor((defensePower / Math.max(1, attackPower)) * 65))
        : 100,
      defenderLoss: attackerWins
        ? 100
        : Math.min(70, Math.floor((attackPower / Math.max(1, defensePower)) * 65)),
    };
  },
};
