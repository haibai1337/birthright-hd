import type { Campaign, Command, Scenario } from './schema';

export function routeLimit(level: number) {
  return Math.min(3, Math.ceil(level / 3));
}
export function roadEdges(state: Campaign, scenario: Scenario, from: string): string[] {
  return [
    ...new Set([
      ...(scenario.provinces.find((p) => p.id === from)?.movement ?? [])
        .filter((e) => e.code === 8 || e.code === 9)
        .map((e) => e.to),
      ...(state.roads ?? []).filter((e) => e.from === from).map((e) => e.to),
    ]),
  ].sort();
}
function friendlyPassage(state: Campaign, realmId: string, provinceId: string) {
  const p = state.provinces.find((p) => p.id === provinceId);
  if (!p || p.occupiedBy || p.contested || p.militaryContested) return false;
  return (
    p.owner === realmId ||
    state.treaties.some(
      (t) =>
        t.kind === 'alliance' &&
        ((t.a === realmId && t.b === p.owner) || (t.b === realmId && t.a === p.owner)),
    )
  );
}
/** Native directed road codes 8/9; no inferred river or straight-line links. */
export function tradePath(
  state: Campaign,
  scenario: Scenario,
  realmId: string,
  from: string,
  to: string,
): string[] | null {
  // The original follower checks each destination's sovereign; the guild can begin abroad.
  const queue = [[from]],
    seen = new Set([from]);
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i]!;
    for (const id of roadEdges(state, scenario, path.at(-1)!)) {
      if (seen.has(id) || !friendlyPassage(state, realmId, id)) continue;
      const next = [...path, id];
      if (id === to) return next;
      seen.add(id);
      queue.push(next);
    }
  }
  return null;
}
export function tradeIncome(state: Campaign, from: string, to: string) {
  return Math.floor(
    ((state.provinces.find((p) => p.id === from)?.level ?? 0) +
      (state.provinces.find((p) => p.id === to)?.level ?? 0)) /
      2,
  );
}
export function inspectTradeRoute(
  state: Campaign,
  scenario: Scenario,
  route: Campaign['tradeRoutes'][number],
) {
  if (route.status === 'terminated' || route.status === 'destroyed')
    return {
      status: route.status,
      reason: route.reason ?? route.status,
      income: 0,
      realmId: route.realmId,
    };
  const guild = state.holdings.find((h) =>
    route.guildId
      ? h.id === route.guildId
      : h.provinceId === route.from &&
        h.realmId === route.realmId &&
        h.type === 'guild' &&
        !h.destroyed,
  );
  if (!guild || guild.destroyed || guild.type !== 'guild')
    return {
      status: 'destroyed' as const,
      reason: 'Origin guild destroyed',
      income: 0,
      realmId: route.realmId,
    };
  const owner = guild.realmId;
  const endpoints = state.provinces.filter((p) => p.id === route.from || p.id === route.to);
  let reason = '';
  if (guild.contested) reason = 'Origin guild contested';
  else if (endpoints.some((p) => p.occupiedBy || p.contested || p.militaryContested))
    reason = 'Endpoint occupied or contested';
  else if (!tradePath(state, scenario, owner, route.from, route.to))
    reason = 'Road passage unavailable (ownership, alliance or occupation)';
  else if (endpoints.some((p) => p.level === 0)) reason = 'Endpoint has no route capacity';
  else if (
    endpoints.some(
      (p) =>
        state.tradeRoutes
          .filter(
            (t) =>
              (t.from === p.id || t.to === p.id) &&
              !['terminated', 'destroyed'].includes(t.status ?? '') &&
              state.holdings.some(
                (h) =>
                  (t.guildId
                    ? h.id === t.guildId
                    : h.provinceId === t.from && h.realmId === t.realmId && h.type === 'guild') &&
                  !h.destroyed,
              ),
          )
          .sort((a, b) => a.id.localeCompare(b.id))
          .findIndex((t) => t.id === route.id) >= routeLimit(p.level),
    )
  )
    reason = 'Endpoint route capacity reduced';
  return {
    status: reason ? ('inactive' as const) : ('active' as const),
    reason,
    realmId: owner,
    income: reason ? 0 : tradeIncome(state, route.from, route.to),
  };
}
export function refreshTradeRoutes(state: Campaign, scenario: Scenario) {
  for (const route of state.tradeRoutes) {
    const { income: _income, ...info } = inspectTradeRoute(state, scenario, route);
    Object.assign(route, info);
  }
}
const terrainRoadCost: Record<string, number> = {
  plains: 1,
  coast: 1,
  forest: 2,
  hills: 2,
  mountains: 2,
  swamp: 3,
  'heavy-mountains': 4,
};
export function roadCost(scenario: Scenario, from: string, to: string) {
  return [from, to].reduce(
    (n, id) =>
      n + (terrainRoadCost[scenario.provinces.find((p) => p.id === id)?.terrain ?? ''] ?? 0),
    0,
  );
}
export function tradeProblem(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  cmd: Command,
): string | null {
  if (cmd.type === 'CreateTradeRoute') {
    const h = state.holdings.find((h) => h.id === cmd.guildId);
    const a = state.provinces.find((p) => p.id === h?.provinceId),
      b = state.provinces.find((p) => p.id === cmd.destination);
    if (!h || h.type !== 'guild' || h.realmId !== actor || h.destroyed || h.contested || !a || !b)
      return 'Select your own surviving, uncontested guild (level zero is sufficient).';
    if (a.id === b.id) return 'Choose two different provinces.';
    if (
      scenario.provinces.find((p) => p.id === a.id)?.terrain ===
      scenario.provinces.find((p) => p.id === b.id)?.terrain
    )
      return 'Land trade requires different terrain at the endpoints.';
    if ([a, b].some((p) => p.occupiedBy || p.contested || p.militaryContested))
      return 'Trade endpoints must be free of occupation and contest.';
    if (!friendlyPassage(state, actor, b.id))
      return 'The destination sovereign must be your domain or an ally for road passage.';
    const routes = state.tradeRoutes.filter(
      (t) => !['destroyed', 'terminated'].includes(inspectTradeRoute(state, scenario, t).status),
    );
    if (
      routes.some(
        (t) =>
          t.realmId === actor &&
          ((t.from === a.id && t.to === b.id) || (t.from === b.id && t.to === a.id)),
      )
    )
      return 'Your domain already has a route between these provinces.';
    if (
      [a, b].some(
        (p) => routes.filter((t) => t.from === p.id || t.to === p.id).length >= routeLimit(p.level),
      )
    )
      return 'Endpoint route limit reached: levels 1–3: one; 4–6: two; 7+: three.';
    if (!tradePath(state, scenario, actor, a.id, b.id))
      return 'No continuous road through your own or allied destination provinces. River links alone are not roads.';
  }
  if (cmd.type === 'EndTradeRoute') {
    const route = state.tradeRoutes.find((t) => t.id === cmd.routeId);
    if (
      !route ||
      inspectTradeRoute(state, scenario, route).realmId !== actor ||
      ['terminated', 'destroyed'].includes(route.status ?? '')
    )
      return 'Only the route owner can end an existing route.';
  }
  if (cmd.type === 'BuildRoad') {
    const a = state.provinces.find((p) => p.id === cmd.from),
      b = state.provinces.find((p) => p.id === cmd.to);
    if (
      !a ||
      !b ||
      a.owner !== actor ||
      !friendlyPassage(state, actor, a.id) ||
      !friendlyPassage(state, actor, b.id)
    )
      return 'Road building requires your start province and your own or allied destination, with uncontested control.';
    if (!scenario.provinces.find((p) => p.id === a.id)?.adjacent.includes(b.id))
      return 'Road endpoints must be adjacent.';
    if (roadEdges(state, scenario, a.id).includes(b.id))
      return 'A road already connects these provinces.';
    if (
      [a, b].every(
        (p) => scenario.provinces.find((d) => d.id === p.id)?.terrain === 'heavy-mountains',
      )
    )
      return 'Roads cannot join two high-mountain provinces.';
  }
  return null;
}
