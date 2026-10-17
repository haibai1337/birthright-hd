import {
  campaignSchema,
  commandSchema,
  type Campaign,
  type Command,
  type LogEntry,
  type RulesetId,
  type Scenario,
} from './schema';
import { RULESETS } from './rules';
import { randomInt } from './random';
import {
  commandCost,
  validateCommand,
  validateStateReferences,
  type RuleError,
} from './validation';
import { forecast, relation, sourcePotential, treatyAcceptance } from './selectors';
import { autoResolve, type BattleResolver } from './combat';
import { planNextAI } from './ai';
import { compareIds } from './order';
import { domainSurvives, provinceController, realmSelectable, fortLevel } from './domains';
import { domainPower } from './selectors';

export type CommandResult =
  { ok: true; state: Campaign } | { ok: false; state: Campaign; error: RuleError };
function log(state: Campaign, code: string, realmId: string, data: LogEntry['data'] = {}) {
  state.log.push({ code, turn: state.turn, realmId, data });
}
export function createCampaign(
  scenario: Scenario,
  playerRealm: string,
  seed = 1997,
  ruleset: RulesetId = 'ENHANCED',
  selectionMode: 'CLASSIC' | 'UNRESTRICTED' = scenario.selection?.mode ?? 'CLASSIC',
): Campaign {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295)
    throw new Error('Seed must be a uint32');
  if (!scenario.realms.some((r) => r.id === playerRealm)) throw new Error('Unknown player realm');
  if (!realmSelectable(scenario, playerRealm, selectionMode))
    throw new Error('This domain is not available in the configured faction selection mode.');
  const state: Campaign = {
    scenarioId: scenario.id,
    scenarioRevision: scenario.revision,
    ...(scenario.fingerprint ? { scenarioFingerprint: scenario.fingerprint, selectionMode } : {}),
    ruleset,
    seed,
    rng: seed,
    playerRealm,
    turn: 1,
    nextId: 1,
    realms: scenario.realms.map((r) => ({
      id: r.id,
      treasury:
        scenario.initial.domains?.find((d) => d.id === r.id)?.treasury ?? scenario.initial.treasury,
      regency:
        scenario.initial.domains?.find((d) => d.id === r.id)?.regency ?? scenario.initial.regency,
      actions: RULESETS[ruleset].actions,
      eliminated: false,
      ...(r.controller
        ? { controller: r.id === playerRealm ? ('player' as const) : r.controller }
        : {}),
    })),
    ...structuredClone({
      provinces: scenario.initial.provinces,
      holdings: scenario.initial.holdings,
      armies: scenario.initial.armies,
      treaties: scenario.initial.treaties,
      tradeRoutes: scenario.initial.tradeRoutes,
      ...(scenario.initial.fortifications
        ? { fortifications: scenario.initial.fortifications }
        : {}),
      ...(scenario.initial.characters ? { characters: scenario.initial.characters } : {}),
    }),
    effects: [],
    reports: [],
    log: [],
    history: [],
    pendingEvents: [],
    outcome: 'ongoing',
  };
  log(state, 'campaign.started', playerRealm, { seed });
  validateStateReferences(state, scenario);
  return campaignSchema.parse(state);
}
function adjustLoyalty(state: Campaign, provinceId: string, delta: number) {
  const p = state.provinces.find((p) => p.id === provinceId);
  if (p) p.loyalty = Math.max(0, Math.min(4, p.loyalty + delta));
}
function checkOutcome(state: Campaign, scenario: Scenario) {
  for (const r of state.realms) {
    if (!r.eliminated && !domainSurvives(state, scenario, r.id)) {
      r.eliminated = true;
      state.armies = state.armies.filter((a) => a.realmId !== r.id);
      state.holdings = state.holdings.filter((h) => h.realmId !== r.id);
      state.tradeRoutes = state.tradeRoutes.filter((t) => t.realmId !== r.id);
      state.effects = state.effects.filter((e) => e.realmId !== r.id);
      state.pendingEvents = state.pendingEvents.filter((e) => e.realmId !== r.id);
      if (state.fortifications)
        state.fortifications = state.fortifications.filter((f) => f.realmId !== r.id);
      if (state.characters) state.characters = state.characters.filter((c) => c.realmId !== r.id);
      log(state, 'realm.eliminated', r.id);
    }
  }
  if (state.realms.find((r) => r.id === state.playerRealm)?.eliminated) state.outcome = 'defeat';
  else if (
    scenario.victory.metric && scenario.victory.metric !== 'province-count'
      ? victoryScore(state, scenario, state.playerRealm) >= (scenario.victory.target ?? Infinity)
      : state.provinces.filter((p) => p.owner === state.playerRealm).length >=
        scenario.victory.provinces
  )
    state.outcome = 'victory';
  else if (state.turn > scenario.victory.turns) {
    const scores = state.realms
      .map((r) => ({
        id: r.id,
        score: victoryScore(state, scenario, r.id),
      }))
      .sort((a, b) => b.score - a.score || compareIds(a.id, b.id));
    state.outcome = scores[0]?.id === state.playerRealm ? 'victory' : 'defeat';
  }
}
export function victoryScore(state: Campaign, scenario: Scenario, id: string) {
  if (scenario.victory.metric === 'domain-power') return domainPower(state, scenario, id);
  if (scenario.victory.metric === 'holding-levels')
    return state.holdings.filter((h) => h.realmId === id).reduce((n, h) => n + h.level, 0);
  return state.provinces.filter((p) => p.owner === id).reduce((n, p) => n + p.level, 0);
}
function execute(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  cmd: Command,
  battle: BattleResolver,
) {
  const realm = state.realms.find((r) => r.id === actor);
  if (!realm) throw new Error('Validated realm missing');
  const cost = commandCost(state, scenario, cmd);
  realm.treasury -= cost.gold;
  realm.regency -= cost.regency;
  realm.actions -= cost.actions;
  switch (cmd.type) {
    case 'RecruitUnit': {
      let army = state.armies.find(
        (a) => a.realmId === actor && a.provinceId === cmd.provinceId && !a.moved,
      );
      if (!army) {
        army = {
          id: `army-${state.nextId++}`,
          realmId: actor,
          provinceId: cmd.provinceId,
          units: [],
          moved: false,
        };
        state.armies.push(army);
      }
      army.units.push({ id: `unit-${state.nextId++}`, type: cmd.unitType, strength: 100 });
      log(state, 'unit.recruited', actor, { province: cmd.provinceId, unit: cmd.unitType });
      break;
    }
    case 'DevelopProvince': {
      const p = state.provinces.find((p) => p.id === cmd.provinceId);
      if (!p) throw new Error('Validated province missing');
      p.level++;
      // Development reduces magical capacity, including sources belonging to other regents.
      let remaining = sourcePotential(scenario, p.id, p.level);
      for (const h of state.holdings
        .filter((h) => h.provinceId === p.id && h.type === 'source')
        .sort((a, b) => compareIds(a.id, b.id))) {
        h.level = Math.min(h.level, remaining);
        remaining -= h.level;
      }
      log(state, 'province.developed', actor, { province: p.id, level: p.level });
      break;
    }
    case 'ChangeTaxPolicy': {
      const p = state.provinces.find((p) => p.id === cmd.provinceId);
      if (p) p.tax = cmd.tax;
      log(state, 'tax.changed', actor, { province: cmd.provinceId, tax: cmd.tax });
      break;
    }
    case 'ImproveHolding': {
      const h = state.holdings.find((h) => h.id === cmd.holdingId);
      if (h) h.level++;
      log(state, 'holding.improved', actor, { holding: cmd.holdingId });
      break;
    }
    case 'Fortify': {
      const p = state.provinces.find((p) => p.id === cmd.provinceId);
      if (p) {
        p.fort++;
        if (state.fortifications) {
          const fort = state.fortifications.find(
            (f) =>
              f.provinceId === p.id &&
              f.realmId === actor &&
              f.kind === 'castle' &&
              f.level === p.fort - 1,
          );
          if (fort) fort.level = p.fort;
          else
            state.fortifications.push({
              id: `fort-${state.nextId++}`,
              provinceId: p.id,
              realmId: actor,
              kind: 'castle',
              level: p.fort,
            });
        }
      }
      log(state, 'province.fortified', actor, { province: cmd.provinceId });
      break;
    }
    case 'ProposeTreaty': {
      let treaty = relation(state, actor, cmd.target);
      if (!treaty) {
        treaty = { a: actor, b: cmd.target, kind: 'peace', opinion: 0, since: state.turn };
        state.treaties.push(treaty);
      }
      const accepted = treatyAcceptance(state, scenario, actor, cmd.target, cmd.kind);
      if (accepted) {
        treaty.kind = cmd.kind;
        treaty.since = state.turn;
        treaty.opinion = Math.max(
          -100,
          Math.min(100, treaty.opinion + (cmd.kind === 'war' ? -40 : 10)),
        );
      } else treaty.opinion = Math.min(100, treaty.opinion + 5);
      log(state, accepted ? 'treaty.accepted' : 'treaty.rejected', actor, {
        target: cmd.target,
        kind: cmd.kind,
      });
      break;
    }
    case 'MoveArmy': {
      const army = state.armies.find((a) => a.id === cmd.armyId);
      const p = state.provinces.find((p) => p.id === cmd.destination);
      if (!army || !p) throw new Error('Validated movement missing');
      army.moved = true;
      const defenders = state.armies.filter(
        (a) =>
          a.provinceId === p.id &&
          a.realmId !== actor &&
          relation(state, actor, a.realmId)?.kind === 'war',
      );
      if (
        (provinceController(p) !== actor &&
          relation(state, actor, provinceController(p))?.kind === 'war') ||
        defenders.length > 0
      ) {
        const result = battle.resolve({
          attacker: structuredClone(army),
          defenders: structuredClone(defenders),
          provinceId: p.id,
          state: structuredClone(state),
          scenario,
        });
        // Reject a broken future tactical adapter instead of contaminating campaign state.
        if (
          !Number.isFinite(result.attackerLoss) ||
          !Number.isFinite(result.defenderLoss) ||
          result.attackerLoss < 0 ||
          result.attackerLoss > 100 ||
          result.defenderLoss < 0 ||
          result.defenderLoss > 100
        )
          throw new Error('Invalid battle outcome');
        for (const u of army.units) u.strength = Math.max(0, u.strength - result.attackerLoss);
        for (const a of defenders)
          for (const u of a.units) u.strength = Math.max(0, u.strength - result.defenderLoss);
        for (const a of state.armies) a.units = a.units.filter((u) => u.strength > 0);
        state.armies = state.armies.filter((a) => a.units.length > 0);
        if (result.attackerWins && state.armies.some((a) => a.id === army.id)) {
          army.provinceId = p.id;
          if (
            provinceController(p) !== actor &&
            relation(state, actor, provinceController(p))?.kind === 'war'
          ) {
            if (scenario.policy?.conquest === 'occupation') {
              p.occupiedBy = actor === p.owner ? null : actor;
              p.contested = actor !== p.owner;
            } else p.owner = actor;
            p.loyalty = 1;
            if (state.fortifications) {
              for (const f of state.fortifications.filter(
                (f) => f.provinceId === p.id && f.kind === 'castle',
              )) {
                f.realmId = actor;
                f.level = Math.max(0, f.level - 1);
              }
              p.fort = fortLevel(state, p);
            } else p.fort = Math.max(0, p.fort - 1);
          }
        }
        log(state, result.attackerWins ? 'battle.won' : 'battle.lost', actor, {
          province: p.id,
          attack: Math.round(result.attackPower),
          defense: Math.round(result.defensePower),
        });
      } else {
        army.provinceId = p.id;
        log(state, 'army.moved', actor, { province: p.id });
      }
      break;
    }
    case 'CastRealmSpell': {
      const spell = scenario.spells.find((s) => s.id === cmd.spellId);
      if (!spell) throw new Error('Validated spell missing');
      state.effects.push({
        spellId: spell.id,
        provinceId: cmd.provinceId,
        realmId: actor,
        expiresTurn: state.turn + spell.duration,
      });
      log(state, 'spell.cast', actor, { province: cmd.provinceId, spell: spell.id });
      break;
    }
    case 'ResolveEvent': {
      const event = state.pendingEvents.find((e) => e.realmId === actor);
      if (!event) throw new Error('Validated event missing');
      adjustLoyalty(state, event.provinceId, cmd.choice === 'relief' ? 1 : -1);
      state.pendingEvents = state.pendingEvents.filter((e) => e !== event);
      log(state, 'event.resolved', actor, { province: event.provinceId, choice: cmd.choice });
      break;
    }
    case 'EndTurn':
      throw new Error('EndTurn must use season resolver');
  }
  checkOutcome(state, scenario);
}
function settleEconomy(state: Campaign, scenario: Scenario) {
  const rules = RULESETS[state.ruleset];
  for (const realm of [...state.realms].sort((a, b) => compareIds(a.id, b.id))) {
    if (realm.eliminated || realm.controller === 'passive') continue;
    const report = forecast(state, scenario, realm.id);
    report.taxes = 0;
    for (const p of state.provinces
      .filter((p) => p.owner === realm.id && provinceController(p) === realm.id)
      .sort((a, b) => compareIds(a.id, b.id))) {
      const range = rules.tax[p.tax][p.level] ?? [0, 0];
      const tax = randomInt(state, range[0], range[1]);
      report.taxes += p.loyalty === 0 ? 0 : tax;
      adjustLoyalty(state, p.id, rules.loyaltyDelta[p.tax]);
    }
    report.net =
      report.taxes + report.holdings + report.trade - report.maintenance - report.military;
    const cash = realm.treasury + report.net;
    realm.treasury = Math.max(0, cash);
    realm.regency += report.regency;
    if (cash < 0) {
      let debt = -cash;
      for (const army of state.armies
        .filter((a) => a.realmId === realm.id)
        .sort((a, b) => compareIds(a.id, b.id))
        .reverse()) {
        while (debt > 0 && army.units.length > 0) {
          const unit = army.units.pop();
          debt -= scenario.units.find((d) => d.id === unit?.type)?.upkeep ?? 1;
        }
      }
      state.armies = state.armies.filter((a) => a.units.length > 0);
      for (const p of state.provinces.filter((p) => p.owner === realm.id))
        adjustLoyalty(state, p.id, -1);
      log(state, 'economy.shortfall', realm.id, { deficit: -cash });
    }
    state.reports.push(report);
    log(state, 'economy.collected', realm.id, { net: report.net, regency: report.regency });
  }
  state.reports = state.reports.slice(-Math.max(60, state.realms.length * 4));
}
function generateEvents(state: Campaign, scenario: Scenario) {
  for (const realm of [...state.realms].sort((a, b) => compareIds(a.id, b.id))) {
    if (realm.eliminated || realm.controller === 'passive') continue;
    const owned = state.provinces
      .filter((p) => p.owner === realm.id)
      .sort((a, b) => compareIds(a.id, b.id));
    if (!owned.length) continue;
    const province = owned[randomInt(state, 0, owned.length - 1)];
    if (!province) continue;
    const sum = scenario.events.reduce((n, e) => n + e.weight, 0);
    let roll = randomInt(state, 1, sum);
    const event = scenario.events.find((e) => {
      roll -= e.weight;
      return roll <= 0;
    });
    if (!event) continue;
    realm.treasury = Math.max(0, realm.treasury + event.gold);
    adjustLoyalty(state, province.id, event.loyalty);
    log(state, `event.${event.id}`, realm.id, { province: province.id, gold: event.gold });
    if (event.decision)
      state.pendingEvents.push({
        id: event.id,
        realmId: realm.id,
        provinceId: province.id,
        turn: state.turn,
      });
  }
}
export function applyCommand(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  input: unknown,
  battle: BattleResolver = autoResolve,
): CommandResult {
  const error = validateCommand(state, scenario, actor, input);
  if (error) return { ok: false, state, error };
  const command = commandSchema.parse(input);
  const next = structuredClone(state);
  next.history.push({
    actor,
    command: structuredClone(command),
    turn: state.turn,
    source: actor === state.playerRealm ? 'player' : 'ai',
  });
  if (command.type !== 'EndTurn') execute(next, scenario, actor, command, battle);
  else {
    // An unanswered decision defaults to decline, also recorded in the journal.
    for (const event of [...next.pendingEvents].filter((e) => e.realmId === actor)) {
      adjustLoyalty(next, event.provinceId, -1);
      next.pendingEvents = next.pendingEvents.filter((e) => e !== event);
      log(next, 'event.resolved', actor, { province: event.provinceId, choice: 'decline' });
    }
    for (const ai of [...next.realms]
      .filter((r) => r.id !== actor && r.controller !== 'passive')
      .sort((a, b) => compareIds(a.id, b.id))) {
      let steps = 0;
      while (!ai.eliminated && next.outcome === 'ongoing' && steps++ < 8) {
        const plan = planNextAI(next, scenario, ai.id);
        if (!plan) break;
        if (validateCommand(next, scenario, ai.id, plan.command))
          throw new Error('AI planned invalid command');
        next.history.push({
          actor: ai.id,
          command: structuredClone(plan.command),
          turn: next.turn,
          source: 'ai',
        });
        log(next, 'ai.action', ai.id, { reason: plan.reason, action: plan.command.type });
        execute(next, scenario, ai.id, plan.command, battle);
      }
    }
    if (next.outcome === 'ongoing') {
      settleEconomy(next, scenario);
      for (const treaty of next.treaties)
        if (RULESETS[next.ruleset].warExpires && treaty.kind === 'war') treaty.kind = 'peace';
      next.turn++;
      next.effects = next.effects.filter((e) => e.expiresTurn > next.turn);
      for (const r of next.realms) r.actions = RULESETS[next.ruleset].actions;
      for (const a of next.armies) a.moved = false;
      // Resolve outstanding AI events before generating the next season's decisions.
      next.pendingEvents = [];
      checkOutcome(next, scenario);
      if (next.outcome === 'ongoing') generateEvents(next, scenario);
      log(next, 'turn.started', actor, { turn: next.turn });
    }
  }
  return { ok: true, state: next };
}
export function replay(
  scenario: Scenario,
  initial: Campaign,
  history: Campaign['history'],
): Campaign {
  let state = structuredClone(initial);
  for (const entry of history.filter((e) => e.source === 'player')) {
    const result = applyCommand(state, scenario, entry.actor, entry.command);
    if (!result.ok) throw new Error(`Replay rejected: ${result.error.code}`);
    state = result.state;
  }
  return state;
}
