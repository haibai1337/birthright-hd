import { rulingRegent } from './regents';
import type { Campaign, Scenario, Army, Report, TreatyKind } from './schema';
import { RULESETS } from './rules';
import { fortLevel, taxableBy } from './domains';
import { economicForecast } from './economy';
import { characterClasses } from './bloodlines';
import { assertLegacyDomainRules } from './domain-rules';
export function domainFocus(state: Campaign, realmId = state.playerRealm): string {
  return (
    state.provinces.find((p) => p.owner === realmId && p.fort > 0)?.id ??
    state.provinces.find((p) => p.owner === realmId)?.id ??
    state.holdings.find((h) => h.realmId === realmId && !h.destroyed)?.provinceId ??
    state.armies.find((a) => a.realmId === realmId)?.provinceId ??
    state.characters?.find((c) => c.realmId === realmId)?.provinceId ??
    state.provinces[0]?.id ??
    ''
  );
}
export function relation<T extends { a: string; b: string }>(
  state: { treaties: readonly T[] },
  a: string,
  b: string,
) {
  return state.treaties.find((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a));
}
export function armyPower(army: Army, scenario: Scenario): number {
  return army.units.reduce(
    (n, u) =>
      n +
      (((scenario.units.find((d) => d.id === u.type)?.power ?? 0) + (u.blessed ? 1 : 0)) *
        u.strength) /
        100,
    0,
  );
}
export function sourcePotential(scenario: Scenario, provinceId: string, level: number): number {
  const def = scenario.provinces.find((p) => p.id === provinceId);
  const population = def?.original?.population as { elf?: boolean } | undefined;
  if (scenario.policy?.domainActions === 'pc' && population?.elf)
    return Math.max(
      0,
      (def?.magicPotential ?? 0) -
        (scenario.initial.provinces.find((p) => p.id === provinceId)?.level ?? level),
    );
  return Math.max(
    0,
    (scenario.provinces.find((p) => p.id === provinceId)?.magicPotential ?? 0) - level,
  );
}
function holdingPower(level: number, type: string, classes: Set<string>) {
  if (
    (type === 'law' &&
      (classes.has('fighter') || classes.has('paladin') || classes.has('ranger'))) ||
    (type === 'source' && classes.has('wizard')) ||
    (type === 'temple' && (classes.has('priest') || classes.has('paladin'))) ||
    (type === 'guild' && (classes.has('thief') || classes.has('ranger')))
  )
    return level;
  if (
    (type === 'law' && (classes.has('priest') || classes.has('thief'))) ||
    (type === 'guild' && classes.has('bard'))
  )
    return Math.ceil(level / 2);
  return 0;
}
export function provinceDomainPower(
  state: Campaign,
  scenario: Scenario,
  realmId: string,
  provinceId: string,
) {
  const classes = new Set(characterClasses(scenario, realmId, state).map((c) => c.type));
  const province = state.provinces.find((item) => item.id === provinceId);
  const provinceValue =
    province?.owner === realmId && !province.occupiedBy && !province.contested ? province.level : 0;
  const holdingValue = state.holdings
    .filter(
      (holding) =>
        holding.provinceId === provinceId &&
        holding.realmId === realmId &&
        !holding.contested &&
        !holding.destroyed,
    )
    .reduce((sum, holding) => sum + holdingPower(holding.level, holding.type, classes), 0);
  return provinceValue + holdingValue;
}
export function domainPower(state: Campaign, scenario: Scenario, realmId: string): number {
  const classes = new Set(characterClasses(scenario, realmId, state).map((c) => c.type));
  const provinces = state.provinces
    .filter((province) => province.owner === realmId && !province.occupiedBy && !province.contested)
    .reduce((sum, province) => sum + province.level, 0);
  const holdings = state.holdings
    .filter((holding) => holding.realmId === realmId && !holding.contested && !holding.destroyed)
    .reduce((sum, holding) => sum + holdingPower(holding.level, holding.type, classes), 0);
  return provinces + holdings;
}
export function forecast(state: Campaign, scenario: Scenario, realmId: string): Report {
  assertLegacyDomainRules(state);
  if (scenario.policy?.domainActions === 'pc') return economicForecast(state, scenario, realmId);
  const rules = RULESETS[state.ruleset];
  const owned = state.provinces.filter((p) => p.owner === realmId);
  const taxed = state.provinces.filter((p) => taxableBy(p, realmId));
  const taxes = taxed.reduce((n, p) => {
    const range = rules.tax[p.tax][p.level] ?? [0, 0];
    return n + (range[0] + range[1]) / 2;
  }, 0);
  const holdings = state.holdings
    .filter(
      (h) =>
        h.realmId === realmId &&
        !h.contested &&
        !h.destroyed &&
        (h.type === 'guild' || h.type === 'temple'),
    )
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
    owned.length * rules.provinceMaintenance +
    state.provinces.filter((p) => p.occupiedBy === realmId && p.owner !== realmId).length +
    (state.fortifications
      ? state.fortifications.filter((f) => f.realmId === realmId && f.level > 0).length
      : owned.filter((p) => fortLevel(state, p) > 0).length);
  const military = state.armies
    .filter((a) => a.realmId === realmId)
    .reduce(
      (n, a) =>
        n +
        a.units.reduce((k, u) => k + (scenario.units.find((d) => d.id === u.type)?.upkeep ?? 0), 0),
      0,
    );
  const regency = Math.min(
    rulingRegent(scenario, realmId, state)?.bloodline.strength ?? 0,
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
