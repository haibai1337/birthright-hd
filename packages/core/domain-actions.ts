import { rulingRegent } from './regents';
import type { Campaign, Command, Scenario } from './schema';
import { sourcePotential } from './selectors';
import { randomInt } from './random';
import { compareIds } from './order';
import { tradeProblem } from './trade';
import { leyLineProblem, provincePath } from './ley-lines';
import { hasMagicEffect } from './realm-magic';
import { diplomacyTerms, diplomacyProblem, applyDiplomacy } from './diplomacy';
import { usesPCStrategy } from './military';
import { playerControls } from './fealty';

export const usesPCDomainActions = (s: Scenario) => s.policy?.domainActions === 'pc';
type Check = NonNullable<Campaign['pendingDomainAction']>['checks'][number];
/** Same d20/seed contract for legacy commands and the explicit quantity-safe 1.5 path. */
export function rollDomainCheck(state: { rng: number }, threshold: number | bigint) {
  const roll = randomInt(state, 1, 20),
    target = typeof threshold === 'bigint' ? threshold : BigInt(threshold);
  return { roll, success: BigInt(roll) >= (target < 1n ? 1n : target) };
}
export const domainResponseOrder = (ids: readonly string[]) => [...new Set(ids)].sort(compareIds);
export interface DomainQuote {
  gold: number;
  regency: number;
  actions: number;
  checks: Check[];
}
export const isDomainAction = (c: Command, scenario?: Scenario) =>
  [
    'DevelopProvince',
    'ImproveHolding',
    'CreateHolding',
    'RuleHoldings',
    'ContestHolding',
    'Agitate',
    'CreateTradeRoute',
    'ForgeLeyLine',
  ].includes(c.type) ||
  (c.type === 'ProposeTreaty' && c.kind !== 'war' && (!scenario || usesPCStrategy(scenario)));
export function holdingInfluence(state: Campaign, provinceId: string, actor: string) {
  return Math.max(
    -1,
    ...state.holdings
      .filter((h) => h.provinceId === provinceId && h.realmId === actor && !h.destroyed)
      .map((h) => h.level),
    ...(state.fortifications ?? [])
      .filter((f) => f.provinceId === provinceId && f.realmId === actor && f.level > 0)
      .map((f) => f.level),
  );
}
export function domainActionQuote(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  cmd: Command,
): DomainQuote | null {
  const q: DomainQuote = { gold: 0, regency: 0, actions: 1, checks: [] };
  const opponents = (ids: string[]) =>
    [...new Set(ids)]
      .filter(
        (id) =>
          id !== actor &&
          state.realms.some((r) => r.id === id && !r.eliminated && r.controller !== 'passive'),
      )
      .sort(compareIds);
  if (cmd.type === 'ProposeTreaty' && cmd.kind !== 'war' && usesPCStrategy(scenario)) {
    const terms = diplomacyTerms(state, scenario, actor, cmd);
    q.gold = 1;
    q.regency = 1 + (cmd.regencyBid ?? 0);
    q.checks.push({
      provinceId: terms.provinceId,
      threshold: terms.threshold,
      opponents: opponents([cmd.target]),
    });
  } else if (cmd.type === 'DevelopProvince') {
    const p = state.provinces.find((p) => p.id === cmd.provinceId);
    if (!p) return null;
    q.gold = p.level + 1;
    q.regency = (p.level ? p.level + 1 : 0) + (cmd.regencyBid ?? 0);
    q.checks.push({
      provinceId: p.id,
      threshold: 10 + p.level - (cmd.regencyBid ?? 0),
      opponents: [],
    });
  } else if (cmd.type === 'CreateHolding') {
    const p = state.provinces.find((p) => p.id === cmd.provinceId);
    if (!p) return null;
    q.gold = 1;
    q.regency = cmd.regencyBid ?? 0;
    q.checks.push({
      provinceId: p.id,
      threshold: 10 + (p.owner === actor ? -p.level : p.level) - (cmd.regencyBid ?? 0),
      opponents: opponents([p.owner]),
    });
  } else if (cmd.type === 'ImproveHolding' || cmd.type === 'RuleHoldings') {
    const targets = cmd.type === 'ImproveHolding' ? [cmd] : cmd.holdings;
    for (const t of targets) {
      const h = state.holdings.find((h) => h.id === t.holdingId);
      if (!h) return null;
      q.gold++;
      q.regency += (h.level ? h.level + 1 : 0) + (t.regencyBid ?? 0);
      q.checks.push({
        provinceId: h.provinceId,
        holdingId: h.id,
        threshold: 10 + h.level - (t.regencyBid ?? 0),
        opponents: [],
      });
    }
  } else if (cmd.type === 'ContestHolding') {
    const h = state.holdings.find((h) => h.id === cmd.holdingId);
    const p = state.provinces.find((p) => p.id === h?.provinceId);
    if (!h || !p) return null;
    const influence = p.owner === actor ? p.level : holdingInfluence(state, p.id, actor);
    q.regency = 1 + (cmd.regencyBid ?? 0);
    q.checks.push({
      provinceId: p.id,
      holdingId: h.id,
      threshold: 10 + h.level - influence - (cmd.regencyBid ?? 0),
      opponents: opponents([h.realmId]),
    });
  } else if (cmd.type === 'Agitate') {
    const r = state.realms.find((r) => r.id === actor);
    if (
      rulingRegent(scenario, actor, state)?.class === 'priest' &&
      r?.freeAgitateUsedTurn !== state.turn
    )
      q.actions = 0;
    for (const t of cmd.targets) {
      const p = state.provinces.find((p) => p.id === t.provinceId);
      if (!p) return null;
      const law = state.holdings
        .filter(
          (h) => h.provinceId === p.id && h.realmId === p.owner && h.type === 'law' && !h.destroyed,
        )
        .reduce((n, h) => n + h.level, 0);
      q.gold += 1 + (t.goldBid ?? 0);
      q.regency += 1 + (t.regencyBid ?? 0);
      // CD §144 permits local holding regents to oppose; source adds the sovereign's law modifier.
      q.checks.push({
        provinceId: p.id,
        threshold:
          10 +
          p.level -
          holdingInfluence(state, p.id, actor) +
          (p.owner === actor ? -law : law) -
          (t.goldBid ?? 0) -
          (t.regencyBid ?? 0),
        opponents: opponents([
          p.owner,
          ...state.holdings
            .filter((h) => h.provinceId === p.id && !h.destroyed)
            .map((h) => h.realmId),
        ]),
      });
    }
  } else if (cmd.type === 'CreateTradeRoute') {
    const h = state.holdings.find((h) => h.id === cmd.guildId);
    if (!h) return null;
    q.gold = 1;
    q.regency = 1 + (cmd.regencyBid ?? 0);
    q.checks.push({
      provinceId: h.provinceId,
      holdingId: h.id,
      threshold: 10 - h.level - (cmd.regencyBid ?? 0),
      opponents: opponents(
        state.holdings
          .filter(
            (x) =>
              x.provinceId === h.provinceId &&
              !x.destroyed &&
              !x.contested &&
              ['law', 'guild'].includes(x.type),
          )
          .map((x) => x.realmId),
      ),
    });
  } else if (cmd.type === 'ForgeLeyLine') {
    const a = state.holdings.find((h) => h.id === cmd.fromHoldingId),
      b = state.holdings.find((h) => h.id === cmd.toHoldingId);
    if (!a || !b) return null;
    const distance = (provincePath(scenario, a.provinceId, b.provinceId)?.length ?? 1) - 1;
    q.gold = distance;
    q.regency = distance + (cmd.regencyBid ?? 0);
    q.checks.push({
      provinceId: a.provinceId,
      holdingId: a.id,
      threshold: 5 - a.level - (cmd.regencyBid ?? 0),
      opponents: opponents([
        state.provinces.find((p) => p.id === a.provinceId)!.owner,
        state.provinces.find((p) => p.id === b.provinceId)!.owner,
      ]),
    });
  } else return null;
  return q;
}
export function domainActionProblem(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  cmd: Command,
): string | null {
  if (!isDomainAction(cmd, scenario)) return null;
  if (!usesPCDomainActions(scenario)) return 'This scenario uses legacy development rules.';
  if (cmd.type === 'ProposeTreaty')
    return usesPCStrategy(scenario) ? diplomacyProblem(state, scenario, actor, cmd) : null;
  if (cmd.type === 'ForgeLeyLine') return leyLineProblem(state, scenario, actor, cmd);
  if (cmd.type === 'CreateTradeRoute') return tradeProblem(state, scenario, actor, cmd);
  if (cmd.type === 'DevelopProvince') {
    const p = state.provinces.find((p) => p.id === cmd.provinceId);
    if (!p) return 'Unknown province.';
    if (p.owner !== actor || (p.occupiedBy && p.occupiedBy !== actor))
      return 'Rule Province requires legitimate sovereignty and freedom from foreign occupation.';
    if (p.militaryContested)
      return 'Military control is contested; Rule cannot replace liberation or investiture.';
    if (p.level >= 10 && !p.contested)
      return 'The PC game permits development only below level 10. Preserved higher levels are unchanged.';
  }
  if (cmd.type === 'CreateHolding') {
    if (!state.provinces.some((p) => p.id === cmd.provinceId)) return 'Unknown province.';
    if (
      state.holdings.some(
        (h) =>
          h.provinceId === cmd.provinceId &&
          h.realmId === actor &&
          h.type === cmd.holdingType &&
          !h.destroyed,
      )
    )
      return 'Your domain already has this type of holding here, including level-zero holdings.';
  }
  if (cmd.type === 'ImproveHolding' || cmd.type === 'RuleHoldings') {
    const targets = cmd.type === 'ImproveHolding' ? [cmd] : cmd.holdings;
    if (new Set(targets.map((t) => t.holdingId)).size !== targets.length)
      return 'Choose each holding once.';
    const growth = new Map<string, number>();
    for (const t of targets) {
      const h = state.holdings.find((h) => h.id === t.holdingId);
      if (!h || h.destroyed) return 'The holding no longer exists.';
      if (h.realmId !== actor) return 'Only the holding owner can Rule or restore it.';
      const p = state.provinces.find((p) => p.id === h.provinceId)!;
      const cap = h.type === 'source' ? sourcePotential(scenario, p.id, p.level) : p.level;
      const used = state.holdings
        .filter((x) => x.provinceId === p.id && x.type === h.type && !x.destroyed)
        .reduce((n, x) => n + x.level, 0);
      const key = `${p.id}|${h.type}`;
      if (h.level >= 10 || used >= cap) {
        if (!h.contested)
          return 'There is no room to develop this holding. A contested holding can still be restored.';
      } else {
        const n = (growth.get(key) ?? 0) + 1;
        growth.set(key, n);
        if (used + n > cap) return 'These selected holdings would exceed their shared capacity.';
      }
    }
  }
  if (cmd.type === 'ContestHolding') {
    const h = state.holdings.find((h) => h.id === cmd.holdingId);
    if (!h || h.destroyed) return 'The target holding no longer exists.';
    if (h.realmId === actor) return 'Contest must target another domain.';
    const p = state.provinces.find((p) => p.id === h.provinceId)!;
    if (p.owner !== actor && holdingInfluence(state, p.id, actor) < 0)
      return 'Contest requires a holding in this province or its sovereignty.';
  }
  if (cmd.type === 'Agitate') {
    if (new Set(cmd.targets.map((t) => t.provinceId)).size !== cmd.targets.length)
      return 'Choose each province once per Agitate action.';
    for (const t of cmd.targets) {
      const p = state.provinces.find((p) => p.id === t.provinceId);
      if (!p) return 'Unknown province.';
      if (hasMagicEffect(state, p.id, 'honest-dealing'))
        return 'Honest Dealing protects this province from Agitate.';
      if (p.owner !== actor && holdingInfluence(state, p.id, actor) < 0)
        return 'Agitate requires sovereignty or a local holding, including level zero.';
      const max = Math.max(3, scenario.initial.provinces.find((i) => i.id === p.id)?.loyalty ?? 3);
      if (t.direction === 'raise' ? p.loyalty >= max : p.loyalty <= 0)
        return 'Loyalty is already at its limit in the selected direction.';
    }
  }
  return null;
}
function log(state: Campaign, code: string, actor: string, data: Campaign['log'][number]['data']) {
  state.log.push({ code, turn: state.turn, realmId: actor, data });
}
function resolveCheck(state: Campaign, scenario: Scenario) {
  const pending = state.pendingDomainAction!;
  const c = pending.checks[pending.index]!;
  const cmd = pending.command;
  const defense = pending.opposition.reduce((n, o) => n + o.regency, 0);
  const threshold = Math.max(1, c.threshold + defense - pending.extraRegency);
  const { roll, success: won } = rollDomainCheck(state, threshold);
  const p = state.provinces.find((p) => p.id === c.provinceId)!;
  const h = state.holdings.find((h) => h.id === c.holdingId);
  if (cmd.type === 'ProposeTreaty') applyDiplomacy(state, scenario, pending.actor, cmd, won);
  if (won) {
    if (cmd.type === 'DevelopProvince') {
      p.contested = false;
      if (p.level < 10) {
        const previousPotential = sourcePotential(scenario, p.id, p.level);
        p.level++;
        const cap = sourcePotential(scenario, p.id, p.level);
        const sources = state.holdings.filter(
          (h) => h.provinceId === p.id && h.type === 'source' && !h.destroyed,
        );
        // Elven growth (or already exhausted potential) must not normalize imported excesses.
        let excess = cap < previousPotential ? sources.reduce((n, h) => n + h.level, 0) - cap : 0;
        while (excess-- > 0) {
          const biggest = sources
            .filter((h) => h.level > 0)
            .sort((a, b) => b.level - a.level || compareIds(a.id, b.id))[0];
          if (biggest) biggest.level--;
        }
      }
    } else if (cmd.type === 'ForgeLeyLine') {
      state.leyLines ??= [];
      const a = state.holdings.find((h) => h.id === cmd.fromHoldingId)!,
        b = state.holdings.find((h) => h.id === cmd.toHoldingId)!;
      state.leyLines.push({
        id: `ley-${state.nextId++}`,
        realmId: pending.actor,
        fromHoldingId: a.id,
        toHoldingId: b.id,
        path: provincePath(scenario, a.provinceId, b.provinceId)!,
        status: 'active',
      });
    } else if (cmd.type === 'CreateTradeRoute' && h) {
      state.tradeRoutes.push({
        id: `route-${state.nextId++}`,
        realmId: pending.actor,
        guildId: h.id,
        from: h.provinceId,
        to: cmd.destination,
        status: 'active',
      });
    } else if (cmd.type === 'CreateHolding')
      state.holdings.push({
        id: `holding-${state.nextId++}`,
        provinceId: p.id,
        realmId: pending.actor,
        type: cmd.holdingType,
        level: 0,
        contested: false,
      });
    else if ((cmd.type === 'ImproveHolding' || cmd.type === 'RuleHoldings') && h) {
      const used = state.holdings
        .filter((x) => x.provinceId === p.id && x.type === h.type && !x.destroyed)
        .reduce((n, x) => n + x.level, 0);
      if (
        h.level < 10 &&
        used < (h.type === 'source' ? sourcePotential(scenario, p.id, p.level) : p.level)
      )
        h.level++;
      h.contested = false;
    } else if (cmd.type === 'ContestHolding' && h) {
      if (h.level === 0 || h.contested) {
        h.destroyed = true;
        h.contested = false;
        h.level = 0;
      } else h.contested = true;
    } else if (cmd.type === 'Agitate') {
      const t = cmd.targets.find((t) => t.provinceId === p.id)!;
      p.loyalty += t.direction === 'raise' ? 1 : -1;
    }
  }
  log(state, 'domain.action', pending.actor, {
    province: p.id,
    holding: c.holdingId ?? '',
    action: cmd.type,
    success: won,
    roll,
    threshold,
    opposition: defense,
    target: h?.realmId ?? p.owner,
    level: h?.level ?? p.level,
    contested: h?.contested ?? p.contested ?? false,
    destroyed: h?.destroyed ?? false,
  });
  pending.index++;
  pending.opposition = [];
  pending.extraRegency = 0;
  pending.stage = 'prepare';
  delete pending.responseRealm;
  delete pending.responseQueue;
}
/** Source action-specific NPC response probabilities; no invented universal RP formula. */
function npcOpposition(state: Campaign, actor: string, kind: Command['type'], threshold: number) {
  const r = state.realms.find((r) => r.id === actor)!;
  let bid = 0;
  if (threshold < 15 && r.regency > 0) {
    if (kind === 'Agitate' && randomInt(state, 0, 2) === 0) bid = randomInt(state, 0, 9);
    else if (
      [
        'CreateHolding',
        'ContestHolding',
        'CreateTradeRoute',
        'ForgeLeyLine',
        'ProposeTreaty',
      ].includes(kind) &&
      randomInt(state, 0, 1) === 1
    )
      bid = randomInt(state, 0, Math.max(0, 19 - threshold));
  }
  return Math.min(r.regency, bid);
}
export function continueDomainAction(state: Campaign, scenario: Scenario) {
  while (state.pendingDomainAction) {
    const pending = state.pendingDomainAction;
    if (pending.index >= pending.checks.length) {
      delete state.pendingDomainAction;
      return;
    }
    const check = pending.checks[pending.index]!;
    if (pending.stage === 'prepare') {
      for (const id of check.opponents.filter((id) => !playerControls(state, scenario, id))) {
        const bid = npcOpposition(state, id, pending.command.type, check.threshold);
        if (bid) {
          state.realms.find((r) => r.id === id)!.regency -= bid;
          pending.opposition.push({ realmId: id, regency: bid });
          log(state, 'domain.opposition', id, {
            province: check.provinceId,
            regency: bid,
            target: pending.actor,
          });
        }
      }
      pending.responseQueue = check.opponents.filter((id) => playerControls(state, scenario, id));
      if (pending.responseQueue.length) {
        pending.stage = 'defend';
        pending.responseRealm = pending.responseQueue.shift()!;
        return;
      }
      if (playerControls(state, scenario, pending.actor) && pending.opposition.length) {
        pending.stage = 'counter';
        pending.responseRealm = pending.actor;
        return;
      }
    }
    resolveCheck(state, scenario);
  }
}
export function beginDomainAction(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  cmd: Command,
) {
  const quote = domainActionQuote(state, scenario, actor, cmd)!;
  if (cmd.type === 'Agitate' && quote.actions === 0)
    state.realms.find((r) => r.id === actor)!.freeAgitateUsedTurn = state.turn;
  state.pendingDomainAction = {
    actor,
    command: structuredClone(cmd),
    checks: quote.checks,
    index: 0,
    opposition: [],
    extraRegency: 0,
    stage: 'prepare',
    actions: quote.actions,
  };
  continueDomainAction(state, scenario);
}
export function respondDomainAction(state: Campaign, scenario: Scenario, regency: number) {
  const pending = state.pendingDomainAction!;
  const check = pending.checks[pending.index]!;
  const responder =
    pending.responseRealm ?? (pending.stage === 'counter' ? pending.actor : state.playerRealm);
  state.realms.find((r) => r.id === responder)!.regency -= regency;
  if (pending.stage === 'counter') {
    pending.extraRegency += regency;
    // A changed offensive bid reopens the original opposition cycle. Passing rolls.
    let modified = false;
    if (regency > 0)
      for (const id of check.opponents.filter((id) => !playerControls(state, scenario, id))) {
        const threshold =
          check.threshold +
          pending.opposition.reduce((n, o) => n + o.regency, 0) -
          pending.extraRegency;
        const bid = npcOpposition(state, id, pending.command.type, threshold);
        if (bid) {
          state.realms.find((r) => r.id === id)!.regency -= bid;
          const previous = pending.opposition.find((o) => o.realmId === id);
          if (previous) previous.regency += bid;
          else pending.opposition.push({ realmId: id, regency: bid });
          log(state, 'domain.opposition', id, {
            province: check.provinceId,
            regency: bid,
            target: pending.actor,
          });
          modified = true;
        }
      }
    if (regency > 0) {
      pending.responseQueue = check.opponents.filter((id) => playerControls(state, scenario, id));
      if (pending.responseQueue.length) {
        pending.stage = 'defend';
        pending.responseRealm = pending.responseQueue.shift()!;
        return;
      }
    }
    if (modified) return;
  } else {
    const previous = pending.opposition.find((o) => o.realmId === responder);
    if (previous) previous.regency += regency;
    else pending.opposition.push({ realmId: responder, regency });
    log(state, 'domain.opposition', responder, {
      province: check.provinceId,
      regency,
      target: pending.actor,
    });
    // A genuine NPC counter-offer returns control to the defender for another bid or pass.
    const actor = state.realms.find((r) => r.id === pending.actor)!;
    const threshold =
      check.threshold +
      pending.opposition.reduce((n, o) => n + o.regency, 0) -
      pending.extraRegency;
    const probability = pending.command.type === 'Agitate' ? 30 : 60;
    if (
      !playerControls(state, scenario, pending.actor) &&
      regency > 0 &&
      threshold > 10 &&
      randomInt(state, 0, 99) < probability
    ) {
      const extra = Math.min(actor.regency, randomInt(state, 0, Math.max(0, threshold - 2)));
      actor.regency -= extra;
      pending.extraRegency += extra;
      log(state, 'domain.counterbid', pending.actor, {
        province: check.provinceId,
        regency: extra,
      });
      if (extra > 0) return;
    }
    if (pending.responseQueue?.length) {
      pending.responseRealm = pending.responseQueue.shift()!;
      return;
    }
    if (
      playerControls(state, scenario, pending.actor) &&
      pending.opposition.some((o) => o.regency > 0)
    ) {
      pending.stage = 'counter';
      pending.responseRealm = pending.actor;
      return;
    }
  }
  resolveCheck(state, scenario);
  continueDomainAction(state, scenario);
}
