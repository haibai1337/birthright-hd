import type { Campaign, Scenario, Army, Report, TreatyKind } from './schema';
import { RULESETS } from './rules';
export function relation(state: Campaign, a: string, b: string) {
  return state.treaties.find((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a));
}
export function armyPower(army: Army, scenario: Scenario): number {
  return army.units.reduce(
    (n, u) => n + ((scenario.units.find((d) => d.id === u.type)?.power ?? 0) * u.strength) / 100,
    0,
  );
}
export function sourcePotential(scenario: Scenario, provinceId: string, level: number): number {
  return Math.max(
    0,
    (scenario.provinces.find((p) => p.id === provinceId)?.magicPotential ?? 0) - level,
  );
}
export function domainPower(state: Campaign, scenario: Scenario, realmId: string): number {
  const cls = scenario.realms.find((r) => r.id === realmId)?.regent.class;
  const provinces = state.provinces
    .filter((p) => p.owner === realmId)
    .reduce((n, p) => n + p.level, 0);
  const holdings = state.holdings
    .filter((h) => h.realmId === realmId)
    .reduce((n, h) => {
      if (
        (h.type === 'law' && cls === 'warrior') ||
        (h.type === 'source' && cls === 'wizard') ||
        (h.type === 'temple' && cls === 'priest') ||
        (h.type === 'guild' && cls === 'rogue')
      )
        return n + h.level;
      if (h.type === 'law' && (cls === 'priest' || cls === 'rogue'))
        return n + Math.ceil(h.level / 2);
      return n;
    }, 0);
  return provinces + holdings;
}
export function forecast(state: Campaign, scenario: Scenario, realmId: string): Report {
  const rules = RULESETS[state.ruleset];
  const owned = state.provinces.filter((p) => p.owner === realmId);
  const taxes = owned.reduce((n, p) => {
    const range = rules.tax[p.tax][p.level] ?? [0, 0];
    return n + (range[0] + range[1]) / 2;
  }, 0);
  const holdings = state.holdings
    .filter((h) => h.realmId === realmId && (h.type === 'guild' || h.type === 'temple'))
    .reduce((n, h) => n + Math.ceil(h.level / rules.holdingIncomeDivisor), 0);
  const trade = state.tradeRoutes
    .filter((t) => t.realmId === realmId)
    .reduce(
      (n, t) =>
        n +
        Math.floor(
          ((state.provinces.find((p) => p.id === t.from)?.level ?? 0) +
            (state.provinces.find((p) => p.id === t.to)?.level ?? 0)) /
            2,
        ),
      0,
    );
  const maintenance =
    owned.length * rules.provinceMaintenance + owned.filter((p) => p.fort > 0).length;
  const military = state.armies
    .filter((a) => a.realmId === realmId)
    .reduce(
      (n, a) =>
        n +
        a.units.reduce((k, u) => k + (scenario.units.find((d) => d.id === u.type)?.upkeep ?? 0), 0),
      0,
    );
  const regency = Math.min(
    scenario.realms.find((r) => r.id === realmId)?.regent.bloodline.strength ?? 0,
    domainPower(state, scenario, realmId),
  );
  return {
    realmId,
    turn: state.turn,
    taxes: Math.floor(taxes),
    holdings,
    trade,
    maintenance,
    military,
    regency,
    net: Math.floor(taxes) + holdings + trade - maintenance - military,
  };
}
export function treatyAcceptance(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  target: string,
  kind: TreatyKind,
): boolean {
  if (kind === 'war') return true;
  const opinion = relation(state, actor, target)?.opinion ?? 0;
  const ours = state.armies
    .filter((a) => a.realmId === actor)
    .reduce((n, a) => n + armyPower(a, scenario), 0);
  const theirs = state.armies
    .filter((a) => a.realmId === target)
    .reduce((n, a) => n + armyPower(a, scenario), 0);
  if (kind === 'peace') return opinion >= -30 || ours >= theirs;
  return opinion >= (kind === 'alliance' ? 20 : -10);
}
