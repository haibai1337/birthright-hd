import {
  commandSchema,
  scenarioSchema,
  type Campaign,
  type Command,
  type Scenario,
} from './schema';
import { RULESETS } from './rules';
import { relation, sourcePotential } from './selectors';

export type ErrorCode =
  | 'INVALID_COMMAND'
  | 'UNKNOWN_REALM'
  | 'UNKNOWN_PROVINCE'
  | 'NOT_OWNER'
  | 'NO_ACTIONS'
  | 'GOLD'
  | 'REGENCY'
  | 'MAX_LEVEL'
  | 'INVALID_TARGET'
  | 'NOT_ADJACENT'
  | 'ALREADY_MOVED'
  | 'TREATY_REQUIRED'
  | 'TERRAIN'
  | 'PREREQUISITE'
  | 'PENDING_EVENT'
  | 'GAME_OVER';
export interface RuleError {
  code: ErrorCode;
  detail?: string;
}
export interface Cost {
  gold: number;
  regency: number;
  actions: number;
}
export function commandCost(state: Campaign, scenario: Scenario, command: Command): Cost {
  const rules = RULESETS[state.ruleset];
  const p =
    'provinceId' in command ? state.provinces.find((p) => p.id === command.provinceId) : undefined;
  switch (command.type) {
    case 'RecruitUnit':
      return {
        gold: scenario.units.find((u) => u.id === command.unitType)?.cost ?? 0,
        regency: 0,
        actions: 1,
      };
    case 'DevelopProvince':
      return {
        gold: (p?.level ?? 0) + rules.developmentGold,
        regency: (p?.level ?? 0) + rules.developmentRegency,
        actions: 1,
      };
    case 'ImproveHolding':
      return {
        gold: (state.holdings.find((h) => h.id === command.holdingId)?.level ?? 0) + 1,
        regency: 1,
        actions: 1,
      };
    case 'Fortify':
      return { gold: rules.fortCost + (p?.fort ?? 0), regency: 0, actions: 1 };
    case 'ProposeTreaty':
      return { gold: rules.diplomacyGold, regency: rules.diplomacyRegency, actions: 1 };
    case 'CastRealmSpell': {
      const s = scenario.spells.find((s) => s.id === command.spellId);
      return { gold: s?.gold ?? 0, regency: s?.regency ?? 0, actions: 1 };
    }
    case 'ResolveEvent':
      return { gold: command.choice === 'relief' ? 2 : 0, regency: 0, actions: 0 };
    case 'MoveArmy':
      return { gold: 0, regency: 0, actions: 1 };
    default:
      return { gold: 0, regency: 0, actions: 0 };
  }
}
export function validateCommand(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  input: unknown,
): RuleError | null {
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) return { code: 'INVALID_COMMAND' };
  const cmd = parsed.data;
  if (state.outcome !== 'ongoing') return { code: 'GAME_OVER' };
  const realm = state.realms.find((r) => r.id === actor);
  if (!realm || realm.eliminated) return { code: 'UNKNOWN_REALM' };
  if (cmd.type === 'EndTurn')
    return actor !== state.playerRealm ? { code: 'INVALID_TARGET' } : null;
  if (cmd.type !== 'ResolveEvent' && state.pendingEvents.some((e) => e.realmId === actor))
    return { code: 'PENDING_EVENT' };
  if ('provinceId' in cmd) {
    const p = state.provinces.find((p) => p.id === cmd.provinceId);
    if (!p) return { code: 'UNKNOWN_PROVINCE' };
    if (p.owner !== actor) return { code: 'NOT_OWNER' };
    const def = scenario.provinces.find((d) => d.id === p.id);
    if (!def) return { code: 'UNKNOWN_PROVINCE' };
    if (cmd.type === 'DevelopProvince' && p.level >= def.maxLevel) return { code: 'MAX_LEVEL' };
    if (cmd.type === 'Fortify' && p.fort >= Math.min(5, p.level)) return { code: 'MAX_LEVEL' };
    if (cmd.type === 'RecruitUnit') {
      const unit = scenario.units.find((u) => u.id === cmd.unitType);
      if (!unit) return { code: 'INVALID_TARGET' };
      if (p.level < unit.minLevel) return { code: 'PREREQUISITE' };
      if (
        state.armies.some(
          (a) =>
            a.provinceId === p.id &&
            a.realmId !== actor &&
            relation(state, actor, a.realmId)?.kind !== 'alliance',
        )
      )
        return { code: 'INVALID_TARGET' };
    }
    if (cmd.type === 'CastRealmSpell') {
      const spell = scenario.spells.find((s) => s.id === cmd.spellId);
      const cls = scenario.realms.find((r) => r.id === actor)?.regent.class;
      if (!spell || (spell.holding === 'source' ? cls !== 'wizard' : cls !== 'priest'))
        return { code: 'PREREQUISITE' };
      if (
        !state.holdings.some(
          (h) =>
            h.provinceId === p.id &&
            h.realmId === actor &&
            h.type === spell.holding &&
            h.level >= spell.minLevel,
        )
      )
        return { code: 'PREREQUISITE' };
      if (state.effects.some((e) => e.spellId === cmd.spellId && e.provinceId === p.id))
        return { code: 'INVALID_TARGET' };
    }
  }
  if (cmd.type === 'ImproveHolding') {
    const h = state.holdings.find((h) => h.id === cmd.holdingId);
    if (!h) return { code: 'INVALID_TARGET' };
    if (h.realmId !== actor) return { code: 'NOT_OWNER' };
    const p = state.provinces.find((p) => p.id === h.provinceId);
    if (!p) return { code: 'UNKNOWN_PROVINCE' };
    const used = state.holdings
      .filter((x) => x.provinceId === p.id && x.type === h.type)
      .reduce((n, x) => n + x.level, 0);
    const cap = h.type === 'source' ? sourcePotential(scenario, p.id, p.level) : p.level;
    if (used >= cap) return { code: 'MAX_LEVEL' };
  }
  if (cmd.type === 'MoveArmy') {
    const army = state.armies.find((a) => a.id === cmd.armyId);
    const destination = state.provinces.find((p) => p.id === cmd.destination);
    if (!army || !destination) return { code: 'INVALID_TARGET' };
    if (army.realmId !== actor) return { code: 'NOT_OWNER' };
    if (army.moved) return { code: 'ALREADY_MOVED' };
    if (
      !scenario.provinces.find((p) => p.id === army.provinceId)?.adjacent.includes(cmd.destination)
    )
      return { code: 'NOT_ADJACENT' };
    if (
      scenario.provinces.find((p) => p.id === cmd.destination)?.terrain === 'mountains' &&
      army.units.some((u) => u.type === 'cavalry')
    )
      return { code: 'TERRAIN' };
    if (
      destination.owner !== actor &&
      !['war', 'alliance'].includes(relation(state, actor, destination.owner)?.kind ?? 'peace')
    )
      return { code: 'TREATY_REQUIRED' };
    const blocked = state.armies.some(
      (a) =>
        a.provinceId === destination.id &&
        a.realmId !== actor &&
        !['war', 'alliance'].includes(relation(state, actor, a.realmId)?.kind ?? 'peace'),
    );
    if (blocked) return { code: 'TREATY_REQUIRED' };
  }
  if (cmd.type === 'ProposeTreaty') {
    const target = state.realms.find((r) => r.id === cmd.target);
    if (!target || target.id === actor || target.eliminated) return { code: 'INVALID_TARGET' };
    if (relation(state, actor, target.id)?.kind === cmd.kind) return { code: 'INVALID_TARGET' };
    if (cmd.kind === 'war' && RULESETS[state.ruleset].warExpires && realm.actions === 1)
      return { code: 'PREREQUISITE' };
    if (cmd.kind === 'war' && relation(state, actor, target.id)?.kind === 'alliance')
      return { code: 'PREREQUISITE' };
  }
  if (cmd.type === 'ResolveEvent' && !state.pendingEvents.some((e) => e.realmId === actor))
    return { code: 'INVALID_TARGET' };
  const cost = commandCost(state, scenario, cmd);
  if (realm.actions < cost.actions) return { code: 'NO_ACTIONS' };
  if (realm.treasury < cost.gold) return { code: 'GOLD' };
  if (realm.regency < cost.regency) return { code: 'REGENCY' };
  return null;
}

function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
}
export function validateScenario(input: unknown): Scenario {
  const s = scenarioSchema.parse(input);
  unique(
    s.provinces.map((p) => p.id),
    'province',
  );
  unique(
    s.realms.map((r) => r.id),
    'realm',
  );
  unique(
    s.regions.map((r) => r.id),
    'region',
  );
  unique(
    s.units.map((u) => u.id),
    'unit type',
  );
  unique(
    s.spells.map((u) => u.id),
    'spell',
  );
  unique(
    s.events.map((u) => u.id),
    'event',
  );
  for (const p of s.provinces) {
    if (!s.regions.some((r) => r.id === p.regionId))
      throw new Error(`Unknown region ${p.regionId}`);
    unique(p.adjacent, `adjacency of ${p.id}`);
    for (const id of p.adjacent)
      if (id === p.id || !s.provinces.find((n) => n.id === id)?.adjacent.includes(p.id))
        throw new Error(`Asymmetric border ${p.id}/${id}`);
  }
  const firstRealm = s.realms[0];
  if (!firstRealm) throw new Error('Scenario must contain a realm');
  validateStateReferences(
    {
      ...s.initial,
      realms: s.realms.map((r) => ({
        id: r.id,
        treasury: s.initial.treasury,
        regency: s.initial.regency,
        actions: 3,
        eliminated: false,
      })),
      effects: [],
      pendingEvents: [],
      playerRealm: firstRealm.id,
    },
    s,
  );
  for (const p of s.initial.provinces)
    if (p.level > (s.provinces.find((d) => d.id === p.id)?.maxLevel ?? 0))
      throw new Error('Province over level cap');
  return s;
}
type ReferenceState = Pick<
  Campaign,
  | 'provinces'
  | 'realms'
  | 'holdings'
  | 'armies'
  | 'treaties'
  | 'tradeRoutes'
  | 'effects'
  | 'pendingEvents'
  | 'playerRealm'
>;
export function validateStateReferences(state: ReferenceState, s: Scenario): void {
  unique(
    state.provinces.map((p) => p.id),
    'province state',
  );
  unique(
    state.realms.map((r) => r.id),
    'realm state',
  );
  unique(
    state.holdings.map((h) => h.id),
    'holding',
  );
  unique(
    state.armies.map((a) => a.id),
    'army',
  );
  unique(
    state.armies.flatMap((a) => a.units.map((u) => u.id)),
    'unit',
  );
  if (state.provinces.length !== s.provinces.length || state.realms.length !== s.realms.length)
    throw new Error('Incomplete world state');
  if (!s.realms.some((r) => r.id === state.playerRealm)) throw new Error('Unknown player');
  for (const r of state.realms)
    if (!s.realms.some((d) => d.id === r.id)) throw new Error('Unknown realm');
  for (const p of state.provinces) {
    const def = s.provinces.find((d) => d.id === p.id);
    if (
      !def ||
      !s.realms.some((r) => r.id === p.owner) ||
      p.level > def.maxLevel ||
      p.fort > Math.min(5, p.level)
    )
      throw new Error('Invalid province state');
    for (const type of ['law', 'guild', 'temple', 'source']) {
      const total = state.holdings
        .filter((h) => h.provinceId === p.id && h.type === type)
        .reduce((n, h) => n + h.level, 0);
      if (total > (type === 'source' ? sourcePotential(s, p.id, p.level) : p.level))
        throw new Error('Holding capacity exceeded');
    }
  }
  for (const h of state.holdings)
    if (
      !state.provinces.some((p) => p.id === h.provinceId) ||
      !state.realms.some((r) => r.id === h.realmId)
    )
      throw new Error('Invalid holding reference');
  for (const a of state.armies)
    if (
      !state.provinces.some((p) => p.id === a.provinceId) ||
      !state.realms.some((r) => r.id === a.realmId) ||
      a.units.some((u) => !s.units.some((d) => d.id === u.type))
    )
      throw new Error('Invalid army reference');
  unique(
    state.treaties.map((t) => [t.a, t.b].sort().join('|')),
    'treaty',
  );
  for (const t of state.treaties)
    if (t.a === t.b || ![t.a, t.b].every((id) => s.realms.some((r) => r.id === id)))
      throw new Error('Invalid treaty');
  unique(
    state.tradeRoutes.map((t) => t.id),
    'trade route',
  );
  for (const t of state.tradeRoutes)
    if (
      t.from === t.to ||
      ![t.from, t.to].every((id) => state.provinces.some((p) => p.id === id)) ||
      !state.realms.some((r) => r.id === t.realmId)
    )
      throw new Error('Invalid trade route');
  for (const e of state.effects)
    if (
      !s.spells.some((d) => d.id === e.spellId) ||
      !state.provinces.some((p) => p.id === e.provinceId) ||
      !state.realms.some((r) => r.id === e.realmId)
    )
      throw new Error('Invalid spell effect');
  for (const e of state.pendingEvents)
    if (
      !s.events.some((d) => d.id === e.id && d.decision) ||
      !state.provinces.some((p) => p.id === e.provinceId) ||
      !state.realms.some((r) => r.id === e.realmId)
    )
      throw new Error('Invalid event');
}
