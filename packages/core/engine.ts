import {
  campaignSchema,
  commandSchema,
  type Campaign,
  type Command,
  type LogEntry,
  type RulesetId,
  type Scenario,
  DEFAULT_CAMPAIGN_EVENTS,
  type CampaignEventOptions,
  type CampaignDifficulty,
  type Birthright15Campaign,
  birthright15CampaignCodec,
} from './schema';
import { z } from 'zod';
import {
  birthright15DomainRulesSchema,
  LEGACY_DOMAIN_RULES,
  type DomainOverlays,
} from './domain-rules';
import { goldFromLegacyGB, regencyFromLegacy } from './quantities';
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
import { domainSurvives, provinceController, realmSelectable, taxableBy } from './domains';
import { domainPower } from './selectors';
import {
  beginDomainAction,
  isDomainAction,
  respondDomainAction,
  usesPCDomainActions,
} from './domain-actions';
import { initializeDomainTurn, nextDomainRound } from './domain-turn';
import { collectPCEconomy, finalizePCEconomy, settlePCEconomy } from './economy';
import { refreshTradeRoutes } from './trade';
import { bloodlineStrength } from './bloodlines';
import { realmRegentCandidates } from './regents';
import { applyRealmMagic } from './realm-magic';
import { refreshLeyLines } from './ley-lines';
import { usesPCStrategy, goldBars } from './military';
import { empirePoints, breakAgreement, seasonalDiplomacy, declarePCWar } from './diplomacy';
import {
  strategicEvents,
  synchronizeRebellions,
  npcCampaignAdministration,
  treasuryIncidents,
} from './strategic-events';
import { queueCastle, buildCastles } from './construction';
import { applyFealtyOrder, playerControls } from './fealty';
import {
  investProvince,
  matureOccupations,
  pillageProvince,
  refreshOccupations,
  resolveMarch,
  resolveSieges,
  unitsHere,
} from './warfare';

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
  victoryTarget: 300 | 400 | 500 = 400,
  regentId?: string,
  difficulty: CampaignDifficulty = 'medium',
  eventOptions: CampaignEventOptions = DEFAULT_CAMPAIGN_EVENTS,
  unrestrictedDiplomacy = false,
): Campaign {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295)
    throw new Error('Seed must be a uint32');
  if (!scenario.realms.some((r) => r.id === playerRealm)) throw new Error('Unknown player realm');
  if (!realmSelectable(scenario, playerRealm, selectionMode))
    throw new Error('This domain is not available in the configured faction selection mode.');
  const chosen = realmRegentCandidates(scenario, playerRealm).find(
    (regent) =>
      regent.id === (regentId ?? scenario.realms.find((r) => r.id === playerRealm)!.regent.id),
  );
  if (!chosen) throw new Error('This character is not a regent candidate for the chosen realm.');
  const state: Campaign = {
    domainRules: { ...LEGACY_DOMAIN_RULES },
    settlementVersion: 2,
    selectionMode,
    unrestrictedDiplomacy,
    difficulty,
    eventOptions: { ...eventOptions },
    gorgonPlotStage: 0,
    eventHistory: [],
    lastCampaignEventTurn: 1,
    pendingGorgonScenes: [],
    scenarioId: scenario.id,
    scenarioRevision: scenario.revision,
    ...(scenario.fingerprint ? { scenarioFingerprint: scenario.fingerprint } : {}),
    ruleset,
    seed,
    rng: seed,
    playerRealm,
    turn: 1,
    nextId: 1,
    realms: scenario.realms.map((r) => ({
      id: r.id,
      ...(r.id === playerRealm ? { regentId: chosen.id } : {}),
      treasury:
        scenario.initial.domains?.find((d) => d.id === r.id)?.treasury ?? scenario.initial.treasury,
      regency:
        scenario.initial.domains?.find((d) => d.id === r.id)?.regency ?? scenario.initial.regency,
      actions: RULESETS[ruleset].actions,
      ...(usesPCDomainActions(scenario)
        ? {
            bloodlineStrength: (r.id === playerRealm ? chosen : r.regent).bloodline.strength,
            knownSpells: [...((r.id === playerRealm ? chosen : r.regent).realmSpells ?? [])],
          }
        : {}),
      ...(usesPCDomainActions(scenario)
        ? { court: scenario.initial.domains?.find((d) => d.id === r.id)?.court ?? 1 }
        : {}),
      eliminated: false,
      ...(r.specialBehavior === 'monsters' ? { behavior: 'monsters' as const } : {}),
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
      ...(usesPCDomainActions(scenario) ? { leyLines: scenario.initial.leyLines ?? [] } : {}),
      ...(usesPCDomainActions(scenario)
        ? {
            roads: [],
            tributes: scenario.initial.tributes ?? [],
            ports: scenario.initial.ports ?? [],
          }
        : {}),
      ...(scenario.initial.fortifications
        ? { fortifications: scenario.initial.fortifications }
        : {}),
      ...(scenario.initial.characters ? { characters: scenario.initial.characters } : {}),
    }),
    effects: [],
    warDeclarations: scenario.initial.treaties
      .filter((t) => t.kind === 'war')
      .flatMap((t) => [
        { actor: t.a, target: t.b, turn: 1 },
        { actor: t.b, target: t.a, turn: 1 },
      ]),
    reports: [],
    ...(usesPCDomainActions(scenario)
      ? { seasonFlow: { phase: 'council' as const, transitionId: 'turn-1', initialCouncil: true } }
      : {}),
    log: [],
    history: [],
    pendingEvents: [],
    outcome: 'ongoing',
    ...(usesPCStrategy(scenario) ? { victoryTarget } : {}),
  };
  const candidates = realmRegentCandidates(scenario, playerRealm);
  for (const character of state.characters ?? []) {
    if (character.realmId === playerRealm && candidates.some((r) => r.id === character.regentId))
      character.role = character.regentId === chosen.id ? 'regent' : 'lieutenant';
  }
  log(state, 'campaign.started', playerRealm, { seed });
  refreshLeyLines(state);
  validateStateReferences(state, scenario);
  return campaignSchema.parse(state);
}

export interface Birthright15NewGameOptions {
  seed?: number;
  ruleset?: RulesetId;
  selectionMode?: 'CLASSIC' | 'UNRESTRICTED';
  victoryTarget?: 300 | 400 | 500;
  regentId?: string;
  difficulty?: CampaignDifficulty;
  eventOptions?: CampaignEventOptions;
  unrestrictedDiplomacy?: boolean;
  overlays?: DomainOverlays;
}

/** Explicit NEW-GAME foundation only. No save migration, new economy or playable 1.5 entry point. */
export function createBirthright15Foundation(
  scenario: Scenario,
  playerRealm: string,
  options: Birthright15NewGameOptions = {},
): Birthright15Campaign {
  const original = createCampaign(
    scenario,
    playerRealm,
    options.seed,
    options.ruleset,
    options.selectionMode,
    options.victoryTarget,
    options.regentId,
    options.difficulty,
    options.eventOptions,
    options.unrestrictedDiplomacy,
  );
  const state: Birthright15Campaign = {
    ...original,
    domainRules: birthright15DomainRulesSchema.parse({
      id: 'birthright-1.5',
      version: '1.1',
      overlays: options.overlays ?? { characters: null, handlers: null },
    }),
    realms: original.realms.map(({ surplusIncome, ...realm }) => ({
      ...realm,
      treasury: goldFromLegacyGB(realm.treasury),
      regency: regencyFromLegacy(realm.regency),
      ...(surplusIncome !== undefined ? { surplusIncome: goldFromLegacyGB(surplusIncome) } : {}),
    })),
    treaties: original.treaties.map(({ regencyPledge, ...treaty }) => ({
      ...treaty,
      ...(regencyPledge !== undefined ? { regencyPledge: regencyFromLegacy(regencyPledge) } : {}),
    })),
    tributes: original.tributes?.map((tribute) => ({
      ...tribute,
      amount: goldFromLegacyGB(tribute.amount),
    })),
    characters: original.characters?.map(({ salary, ...character }) => ({
      ...character,
      ...(salary !== undefined ? { salary: goldFromLegacyGB(salary) } : {}),
    })),
    // A fresh constructor has no settled reports, effects, pending action or Maintenance receipts.
    reports: [],
    effects: [],
    pendingDomainAction: undefined,
    seasonFlow: original.seasonFlow
      ? { ...original.seasonFlow, maintenance: undefined }
      : undefined,
  };
  z.encode(birthright15CampaignCodec, state);
  return state;
}
function adjustLoyalty(state: Campaign, provinceId: string, delta: number) {
  const p = state.provinces.find((p) => p.id === provinceId);
  if (p) p.loyalty = Math.max(0, Math.min(4, p.loyalty + delta));
}
function checkOutcome(state: Campaign, scenario: Scenario) {
  for (const r of state.realms) {
    if (!r.eliminated && (r.bankrupt || !domainSurvives(state, scenario, r.id))) {
      r.eliminated = true;
      state.armies = state.armies.filter((a) => a.realmId !== r.id);
      for (const h of state.holdings)
        if (
          h.realmId === r.id &&
          state.leyLines?.some((l) => l.fromHoldingId === h.id || l.toHoldingId === h.id)
        ) {
          h.destroyed = true;
          h.level = 0;
          h.contested = false;
        }
      state.holdings = state.holdings.filter((h) => h.realmId !== r.id || h.destroyed);
      state.tradeRoutes = state.tradeRoutes.filter((t) => t.realmId !== r.id);
      state.effects = state.effects.filter((e) => e.realmId !== r.id);
      state.pendingEvents = state.pendingEvents.filter((e) => e.realmId !== r.id);
      if (state.fortifications)
        state.fortifications = state.fortifications.filter((f) => f.realmId !== r.id);
      if (state.characters) state.characters = state.characters.filter((c) => c.realmId !== r.id);
      log(state, 'realm.eliminated', r.id);
    }
  }
  refreshLeyLines(state);
  if (state.realms.find((r) => r.id === state.playerRealm)?.eliminated) state.outcome = 'defeat';
  else if (
    scenario.victory.metric && scenario.victory.metric !== 'province-count'
      ? !state.crowned &&
        victoryScore(state, scenario, state.playerRealm) >=
          (state.victoryTarget ?? scenario.victory.target ?? Infinity)
      : state.provinces.filter((p) => p.owner === state.playerRealm).length >=
        scenario.victory.provinces
  )
    state.outcome = 'victory';
  else if (scenario.victory.metric !== 'empire-points' && state.turn > scenario.victory.turns) {
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
  if (scenario.victory.metric === 'empire-points') return empirePoints(state, scenario, id);
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
  const cost = commandCost(state, scenario, cmd, actor);
  realm.treasury = goldBars(realm.treasury - cost.gold);
  realm.regency -= cost.regency;
  realm.actions -= cost.actions;
  if (cost.gold || cost.regency)
    log(state, 'economy.action-paid', actor, {
      action: cmd.type,
      gold: cost.gold - (cmd.type === 'TransferGold' ? cmd.amount : 0),
      regency: cost.regency,
    });
  if (usesPCDomainActions(scenario) && isDomainAction(cmd, scenario)) {
    beginDomainAction(state, scenario, actor, cmd);
    refreshOccupations(state, scenario);
    refreshTradeRoutes(state, scenario);
    refreshLeyLines(state);
    if (!state.pendingDomainAction) checkOutcome(state, scenario);
    return;
  }
  switch (cmd.type) {
    case 'SetFealtyRegency':
    case 'DonateFealtyRegency':
      applyFealtyOrder(state, actor, cmd);
      break;
    case 'ContinueCampaign':
      state.crowned = true;
      state.outcome = 'ongoing';
      break;
    case 'BreakTreaty':
      breakAgreement(state, actor, cmd.target);
      break;
    case 'DisbandUnit': {
      const army = state.armies.find((a) => a.id === cmd.armyId)!;
      army.units = army.units.filter((u) => u.id !== cmd.unitId);
      state.armies = state.armies.filter((a) => a.units.length);
      log(state, 'unit.disbanded', actor, { unit: cmd.unitId, province: army.provinceId });
      break;
    }
    case 'SplitArmy': {
      const army = state.armies.find((a) => a.id === cmd.armyId)!;
      const units = army.units.filter((u) => cmd.unitIds.includes(u.id));
      army.units = army.units.filter((u) => !cmd.unitIds.includes(u.id));
      state.armies.push({ ...army, id: `army-${state.nextId++}`, units });
      break;
    }
    case 'JoinArmies': {
      const army = state.armies.find((a) => a.id === cmd.armyId)!,
        other = state.armies.find((a) => a.id === cmd.otherArmyId)!;
      army.units.push(...other.units);
      army.moved ||= other.moved;
      army.retreatedTurn = Math.max(army.retreatedTurn ?? 0, other.retreatedTurn ?? 0);
      state.armies = state.armies.filter((a) => a.id !== other.id);
      break;
    }
    case 'IncreaseBloodline':
      realm.bloodlineStrength = bloodlineStrength(state, scenario, actor) + 1;
      log(state, 'bloodline.increased', actor, { strength: realm.bloodlineStrength });
      break;
    case 'SetCourt':
      realm.court = cmd.level;
      log(state, 'court.changed', actor, { level: cmd.level });
      break;
    case 'SetLawClaims':
      realm.lawClaims = cmd.enabled;
      log(state, 'claims.changed', actor, { enabled: cmd.enabled });
      break;
    case 'SetProvinceLawClaim': {
      state.provinceLawClaims ??= [];
      const existing = state.provinceLawClaims.find(
        (claim) => claim.provinceId === cmd.provinceId && claim.realmId === actor,
      );
      if (existing) existing.enabled = cmd.enabled;
      else
        state.provinceLawClaims.push({
          provinceId: cmd.provinceId,
          realmId: actor,
          enabled: cmd.enabled,
        });
      log(state, 'province.claim-changed', actor, {
        province: cmd.provinceId,
        enabled: cmd.enabled,
      });
      break;
    }
    case 'SetUnitPayroll': {
      const unit = state.armies
        .flatMap((army) => army.units)
        .find((unit) => unit.id === cmd.unitId);
      if (unit) unit.payroll = cmd.payroll;
      log(state, 'unit.payroll-changed', actor, { unit: cmd.unitId, payroll: cmd.payroll });
      break;
    }
    case 'SetCastleSupport': {
      const fort = state.fortifications?.find((item) => item.id === cmd.fortificationId);
      if (fort) fort.supported = cmd.supported;
      log(state, 'castle.support-changed', actor, {
        fortification: cmd.fortificationId,
        supported: cmd.supported,
      });
      break;
    }
    case 'TransferGold': {
      // The command cost includes the transfer plus the separately logged 1 GB diplomacy fee.
      state.realms.find((r) => r.id === cmd.target)!.treasury += cmd.amount;
      log(state, 'gold.transferred', actor, { target: cmd.target, amount: cmd.amount });
      break;
    }
    case 'SetTribute': {
      state.tributes ??= [];
      const t = state.tributes.find((t) => t.payer === actor && t.recipient === cmd.target);
      if (t) {
        if (cmd.amount) t.amount = cmd.amount;
        else state.tributes = state.tributes.filter((x) => x !== t);
      } else if (cmd.amount)
        state.tributes.push({
          id: `tribute-${state.nextId++}`,
          payer: actor,
          recipient: cmd.target,
          amount: cmd.amount,
        });
      log(state, 'tribute.changed', actor, { target: cmd.target, amount: cmd.amount });
      break;
    }
    case 'EndTradeRoute': {
      const t = state.tradeRoutes.find((t) => t.id === cmd.routeId)!;
      t.status = 'terminated';
      t.reason = 'Ended by guild owner';
      log(state, 'trade.ended', actor, { province: t.from, target: t.to });
      break;
    }
    case 'BuildRoad': {
      state.roads ??= [];
      state.roads.push({ from: cmd.from, to: cmd.to });
      if (scenario.provinces.find((p) => p.id === cmd.to)?.adjacent.includes(cmd.from))
        state.roads.push({ from: cmd.to, to: cmd.from });
      log(state, 'road.built', actor, { province: cmd.from, target: cmd.to });
      break;
    }
    case 'RecruitUnit': {
      let army = state.armies.find(
        (a) =>
          a.realmId === actor &&
          a.provinceId === cmd.provinceId &&
          (usesPCStrategy(scenario) ? a.units.length < 15 : !a.moved),
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
      if (usesPCStrategy(scenario)) {
        const p = state.provinces.find((p) => p.id === cmd.provinceId)!;
        p.musteredCount = (p.musteredTurn === state.turn ? (p.musteredCount ?? 0) : 0) + 1;
        p.musteredTurn = state.turn;
      }
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
      if (usesPCStrategy(scenario)) {
        queueCastle(state, scenario, actor, cmd.provinceId);
        break;
      }
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
      if (usesPCStrategy(scenario) && cmd.kind === 'war') {
        declarePCWar(state, scenario, actor, cmd.target);
        break;
      }
      let treaty = relation(state, actor, cmd.target);
      if (!treaty) {
        treaty = { a: actor, b: cmd.target, kind: 'peace', opinion: 0, since: state.turn };
        state.treaties.push(treaty);
      }
      const accepted = treatyAcceptance(state, scenario, actor, cmd.target, cmd.kind);
      if (accepted) {
        if (cmd.kind === 'war') {
          state.warDeclarations ??= [];
          state.warDeclarations.push({ actor, target: cmd.target, turn: state.turn });
        } else {
          state.warDeclarations = state.warDeclarations?.filter(
            (w) =>
              !(
                (w.actor === actor && w.target === cmd.target) ||
                (w.actor === cmd.target && w.target === actor)
              ),
          );
        }
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
      resolveMarch(state, scenario, actor, army, p, battle);
      break;
    }
    case 'InvestProvince': {
      investProvince(
        state,
        scenario,
        actor,
        state.provinces.find((p) => p.id === cmd.provinceId)!,
        cmd.regencyBid ?? 0,
      );
      break;
    }
    case 'PillageProvince': {
      pillageProvince(
        state,
        actor,
        state.provinces.find((p) => p.id === cmd.provinceId)!,
      );
      break;
    }
    case 'CastRealmSpell': {
      if (usesPCDomainActions(scenario)) {
        applyRealmMagic(state, scenario, actor, cmd);
        break;
      }
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
    case 'HoldAction':
      log(state, 'domain.held', actor, {});
      break;
    case 'CreateHolding':
    case 'CreateTradeRoute':
    case 'ForgeLeyLine':
    case 'RuleHoldings':
    case 'ContestHolding':
    case 'Agitate':
    case 'RespondDomainAction':
      throw new Error('Domain action must use its resolver');
  }
  refreshOccupations(state, scenario);
  refreshTradeRoutes(state, scenario);
  refreshLeyLines(state);
  checkOutcome(state, scenario);
}
function settleEconomy(state: Campaign, scenario: Scenario) {
  if (usesPCDomainActions(scenario)) {
    settlePCEconomy(state, scenario);
    return;
  }
  const rules = RULESETS[state.ruleset];
  for (const realm of [...state.realms].sort((a, b) => compareIds(a.id, b.id))) {
    if (realm.eliminated || realm.controller === 'passive') continue;
    const report = forecast(state, scenario, realm.id);
    report.taxes = 0;
    for (const p of state.provinces
      .filter((p) => taxableBy(p, realm.id))
      .sort((a, b) => compareIds(a.id, b.id))) {
      const range = rules.tax[p.tax][p.level] ?? [0, 0];
      const tax = randomInt(state, range[0], range[1]);
      report.taxes += tax;
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
  // Apply province loyalty once, after all realms' simultaneous seasonal collections.
  for (const p of state.provinces) {
    if (p.contested) continue;
    const controller = provinceController(p);
    let delta = rules.loyaltyDelta[p.tax] - (p.occupiedBy ? 1 : 0);
    if (scenario.policy?.conquest === 'occupation' && delta < 0) {
      const law = p.occupiedBy
        ? unitsHere(state, p.id, controller)
        : state.holdings
            .filter((h) => h.provinceId === p.id && h.realmId === controller && h.type === 'law')
            .reduce((n, h) => n + h.level, 0);
      const ignored = law >= p.level ? 2 : law * 2 >= p.level ? 1 : 0;
      delta = Math.min(0, delta + ignored);
    }
    adjustLoyalty(state, p.id, delta);
  }
  state.reports = state.reports.slice(-Math.max(60, state.realms.length * 4));
}
function generateEvents(state: Campaign, scenario: Scenario) {
  if (usesPCStrategy(scenario)) {
    strategicEvents(state, scenario);
    return;
  }
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
function finishSeasonLegacy(state: Campaign, scenario: Scenario) {
  if (usesPCStrategy(scenario))
    state.effects = state.effects.filter((effect) => effect.expiresTurn > state.turn + 1);
  settleEconomy(state, scenario);
  if (usesPCStrategy(scenario)) {
    synchronizeRebellions(state);
    buildCastles(state, scenario);
  }
  refreshOccupations(state, scenario);
  resolveSieges(state, scenario);
  refreshOccupations(state, scenario);
  matureOccupations(state, scenario);
  for (const treaty of state.treaties)
    if (RULESETS[state.ruleset].warExpires && treaty.kind === 'war') treaty.kind = 'peace';
  if (RULESETS[state.ruleset].warExpires) state.warDeclarations = [];
  if (usesPCStrategy(scenario)) seasonalDiplomacy(state, scenario);
  state.turn++;
  if (usesPCStrategy(scenario)) treasuryIncidents(state, scenario);
  state.effects = state.effects.filter((effect) => effect.expiresTurn > state.turn);
  for (const realm of state.realms) realm.actions = RULESETS[state.ruleset].actions;
  for (const army of state.armies) army.moved = false;
  state.pendingEvents = [];
  checkOutcome(state, scenario);
  if (state.outcome === 'ongoing') generateEvents(state, scenario);
  if (state.outcome === 'ongoing' && usesPCStrategy(scenario))
    npcCampaignAdministration(state, scenario);
  if (usesPCDomainActions(scenario)) initializeDomainTurn(state);
  if (usesPCDomainActions(scenario))
    state.seasonFlow = { phase: 'actions', transitionId: `legacy-${state.turn}` };
  log(state, 'turn.started', state.playerRealm, { turn: state.turn });
}
function finishSeason(state: Campaign, scenario: Scenario, legacyReplay = false) {
  if (legacyReplay) {
    finishSeasonLegacy(state, scenario);
    return;
  }
  // Native counters expire at the boundary before report income is calculated.
  if (usesPCStrategy(scenario))
    state.effects = state.effects.filter((e) => e.expiresTurn > state.turn + 1);
  if (!usesPCDomainActions(scenario)) settleEconomy(state, scenario);
  if (usesPCStrategy(scenario)) {
    synchronizeRebellions(state);
    buildCastles(state, scenario);
  }
  refreshOccupations(state, scenario);
  resolveSieges(state, scenario);
  refreshOccupations(state, scenario);
  matureOccupations(state, scenario);
  for (const treaty of state.treaties)
    if (RULESETS[state.ruleset].warExpires && treaty.kind === 'war') treaty.kind = 'peace';
  if (RULESETS[state.ruleset].warExpires) state.warDeclarations = [];
  if (usesPCStrategy(scenario)) seasonalDiplomacy(state, scenario);
  state.turn++;
  if (usesPCStrategy(scenario)) treasuryIncidents(state, scenario);
  state.effects = state.effects.filter((e) => e.expiresTurn > state.turn);
  for (const r of state.realms) r.actions = RULESETS[state.ruleset].actions;
  for (const a of state.armies) a.moved = false;
  state.pendingEvents = [];
  checkOutcome(state, scenario);
  if (usesPCDomainActions(scenario)) {
    delete state.domainTurn;
    state.seasonFlow = {
      phase: 'council',
      transitionId: `turn-${state.turn}`,
    };
  } else {
    if (state.outcome === 'ongoing') generateEvents(state, scenario);
    if (state.outcome === 'ongoing' && usesPCStrategy(scenario))
      npcCampaignAdministration(state, scenario);
    log(state, 'turn.started', state.playerRealm, { turn: state.turn });
  }
}
/** One paid action per regent per round; free orders never advance the round cursor. */
function advanceDomainSchedule(
  state: Campaign,
  scenario: Scenario,
  battle: BattleResolver,
  advance: boolean,
  legacyReplay: boolean,
) {
  if (advance) state.domainTurn!.cursor++;
  let freeSteps = 0;
  for (let guard = 0; guard < 10000 && state.outcome === 'ongoing'; guard++) {
    if (state.pendingDomainAction) return;
    const phase = state.domainTurn!;
    if (phase.cursor >= phase.order.length) {
      if (nextDomainRound(phase)) {
        log(state, 'domain.round', state.playerRealm, { round: phase.round });
      } else {
        finishSeason(state, scenario, legacyReplay);
        return;
      }
      freeSteps = 0;
      continue;
    }
    const id = phase.order[phase.cursor]!;
    const realm = state.realms.find((r) => r.id === id)!;
    if (realm.eliminated || realm.controller === 'passive' || realm.actions === 0) {
      phase.cursor++;
      freeSteps = 0;
      continue;
    }
    const controlled = playerControls(state, scenario, id);
    if (controlled && !phase.endingSeason) return;
    const plan = controlled ? null : planNextAI(state, scenario, id);
    const command: Command = !plan || freeSteps >= 4 ? { type: 'HoldAction' } : plan.command;
    const cost = commandCost(state, scenario, command, id);
    const error = validateCommand(state, scenario, id, command);
    if (error) throw new Error(`AI planned invalid command: ${error.code} ${error.detail ?? ''}`);
    state.history.push({
      actor: id,
      command: structuredClone(command),
      turn: state.turn,
      source: 'ai',
    });
    if (!controlled)
      log(state, 'ai.action', id, {
        reason: plan?.reason ?? 'hold',
        action: command.type,
        round: phase.round,
      });
    execute(state, scenario, id, command, battle);
    if (state.pendingDomainAction) return;
    if (cost.actions > 0) {
      phase.cursor++;
      freeSteps = 0;
    } else freeSteps++;
  }
  if (state.outcome === 'ongoing' && !state.pendingDomainAction)
    throw new Error('Domain schedule did not reach the next player slot');
}
function completeCouncil(state: Campaign, scenario: Scenario) {
  const flow = state.seasonFlow;
  if (!flow || flow.phase !== 'council') throw new Error('Council phase is not active');
  if (!flow.initialCouncil && state.outcome === 'ongoing') {
    generateEvents(state, scenario);
    if (state.outcome === 'ongoing' && usesPCStrategy(scenario))
      npcCampaignAdministration(state, scenario);
  }
  state.seasonFlow = {
    phase: 'maintenance',
    transitionId: flow.transitionId,
    ...(flow.initialCouncil ? { initialCouncil: true } : {}),
    maintenance: { stage: 'choices' },
  };
}
function selectActions(state: Campaign, scenario: Scenario) {
  const flow = state.seasonFlow;
  if (!flow || flow.phase !== 'maintenance' || flow.maintenance?.stage !== 'collected')
    throw new Error('Taxes must be collected before selecting actions');
  finalizePCEconomy(state, scenario, flow.maintenance.actualIncome ?? []);
  checkOutcome(state, scenario);
  state.seasonFlow = { phase: 'actions', transitionId: flow.transitionId };
  if (state.outcome === 'ongoing') initializeDomainTurn(state, !!flow.initialCouncil);
  log(state, 'turn.started', state.playerRealm, { turn: state.turn });
}
export function applyCommand(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  input: unknown,
  battle: BattleResolver = autoResolve,
  legacyReplay = false,
): CommandResult {
  const error = validateCommand(state, scenario, actor, input);
  if (error) return { ok: false, state, error };
  const command = commandSchema.parse(input);
  const next = structuredClone(state);
  next.history.push({
    actor,
    command: structuredClone(command),
    turn: state.turn,
    source: playerControls(state, scenario, actor) ? 'player' : 'ai',
  });
  if (command.type === 'SetCampaignOptions') {
    if (command.selectionMode) next.selectionMode = command.selectionMode;
    if (command.unrestrictedDiplomacy !== undefined)
      next.unrestrictedDiplomacy = command.unrestrictedDiplomacy;
    if (command.eventOptions) next.eventOptions = { ...command.eventOptions };
    if (command.difficulty) next.difficulty = command.difficulty;
    return { ok: true, state: next };
  }
  if (command.type === 'AcknowledgeCampaignScene') {
    next.pendingGorgonScenes.shift();
    return { ok: true, state: next };
  }
  if (usesPCDomainActions(scenario) && command.type === 'CompleteCouncil') {
    completeCouncil(next, scenario);
    return { ok: true, state: next };
  }
  if (usesPCDomainActions(scenario) && command.type === 'CollectTaxes') {
    const actualIncome = collectPCEconomy(next, scenario);
    next.seasonFlow!.maintenance = { stage: 'collected', actualIncome };
    return { ok: true, state: next };
  }
  if (usesPCDomainActions(scenario) && command.type === 'SelectActions') {
    selectActions(next, scenario);
    return { ok: true, state: next };
  }
  if (usesPCDomainActions(scenario) && next.seasonFlow?.phase === 'maintenance') {
    execute(next, scenario, actor, command, battle);
    return { ok: true, state: next };
  }
  if (usesPCDomainActions(scenario)) {
    if (!next.domainTurn)
      initializeDomainTurn(
        next,
        true,
        Math.min(3, 4 - (next.realms.find((r) => r.id === actor)?.actions ?? 3)),
      );
    if (command.type === 'RespondDomainAction') {
      const actions = next.pendingDomainAction!.actions;
      respondDomainAction(next, scenario, command.regency);
      refreshOccupations(next, scenario);
      refreshTradeRoutes(next, scenario);
      refreshLeyLines(next);
      if (!next.pendingDomainAction) {
        checkOutcome(next, scenario);
        advanceDomainSchedule(next, scenario, battle, actions > 0, legacyReplay);
      }
    } else if (command.type === 'EndTurn') {
      for (const event of [...next.pendingEvents].filter((e) => e.realmId === actor)) {
        adjustLoyalty(next, event.provinceId, -1);
        next.pendingEvents = next.pendingEvents.filter((e) => e !== event);
        log(next, 'event.resolved', actor, { province: event.provinceId, choice: 'decline' });
      }
      next.domainTurn!.endingSeason = true;
      advanceDomainSchedule(next, scenario, battle, false, legacyReplay);
    } else {
      const cost = commandCost(next, scenario, command, actor);
      execute(next, scenario, actor, command, battle);
      if (!next.pendingDomainAction)
        advanceDomainSchedule(next, scenario, battle, cost.actions > 0, legacyReplay);
    }
    return { ok: true, state: next };
  }
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
      finishSeason(next, scenario, legacyReplay);
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
  const legacyReplay = state.settlementVersion === 1;
  if (legacyReplay && usesPCDomainActions(scenario)) {
    state.seasonFlow = { phase: 'actions', transitionId: `legacy-${state.turn}` };
    if (!state.domainTurn) initializeDomainTurn(state, true);
  }
  for (const entry of history.filter((e) => e.source === 'player')) {
    const result = applyCommand(
      state,
      scenario,
      entry.actor,
      entry.command,
      autoResolve,
      legacyReplay,
    );
    if (!result.ok) throw new Error(`Replay rejected: ${result.error.code}`);
    state = result.state;
  }
  return state;
}
