import {
  commandSchema,
  scenarioSchema,
  type Campaign,
  type Command,
  type Scenario,
} from './schema';
import { RULESETS } from './rules';
import { magicProblem, magicQuote, bloodlineProblem } from './realm-magic';
import { bloodlineStrength } from './bloodlines';
import { realmRegentCandidates, rulingRegent } from './regents';
import { commandRealm, fealtyProblem, playerControls } from './fealty';
import { militaryProblem, movementCost, usesPCStrategy, monsterEncounter } from './military';
import { tradeProblem, roadCost } from './trade';
import { relation, sourcePotential } from './selectors';
import { fortLevel, holdingCapacityLimit, provinceController } from './domains';
import { investitureProblem, investitureTerms, mayEnter, mayInvade, unitsHere } from './warfare';
import {
  domainActionProblem,
  domainActionQuote,
  isDomainAction,
  usesPCDomainActions,
} from './domain-actions';

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
export function commandCost(
  state: Campaign,
  scenario: Scenario,
  command: Command,
  actor = state.playerRealm,
): Cost {
  if (usesPCDomainActions(scenario)) {
    const quote = domainActionQuote(state, scenario, actor, command);
    if (quote) return quote;
  }
  const rules = RULESETS[state.ruleset];
  const p =
    'provinceId' in command ? state.provinces.find((p) => p.id === command.provinceId) : undefined;
  switch (command.type) {
    case 'IncreaseBloodline':
      return { gold: 0, regency: bloodlineStrength(state, scenario, actor) + 1, actions: 0 };
    case 'BuildRoad':
      return { gold: roadCost(scenario, command.from, command.to), regency: 0, actions: 0 };
    case 'TransferGold':
      return { gold: command.amount + 1, regency: 1, actions: 1 };
    case 'SetTribute':
      return {
        gold: command.amount ? 1 : 0,
        regency: command.amount ? 1 : 0,
        actions: command.amount ? 1 : 0,
      };
    case 'RecruitUnit':
      return {
        gold: scenario.units.find((u) => u.id === command.unitType)?.cost ?? 0,
        regency: 0,
        actions: usesPCDomainActions(scenario) ? 0 : 1,
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
      return {
        gold: usesPCStrategy(scenario) ? 0 : rules.fortCost + (p?.fort ?? 0),
        regency: 0,
        actions: 1,
      };
    case 'ProposeTreaty':
      if (command.kind === 'war') return { gold: 0, regency: 0, actions: 1 };
      return { gold: rules.diplomacyGold, regency: rules.diplomacyRegency, actions: 1 };
    case 'InvestProvince':
      return p
        ? investitureTerms(
            state,
            scenario,
            p,
            p.occupiedBy ?? state.playerRealm,
            command.regencyBid ?? 0,
          )
        : { gold: 0, regency: 0, actions: 1 };
    case 'PillageProvince':
      return { gold: 0, regency: 0, actions: 0 };
    case 'CastRealmSpell': {
      if (usesPCDomainActions(scenario)) return magicQuote(state, scenario, actor, command);
      const s = scenario.spells.find((s) => s.id === command.spellId);
      return { gold: s?.gold ?? 0, regency: s?.regency ?? 0, actions: 1 };
    }
    case 'ResolveEvent':
      return { gold: command.choice === 'relief' ? 2 : 0, regency: 0, actions: 0 };
    case 'MoveArmy':
      return {
        gold:
          usesPCStrategy(scenario) && state.armies.some((a) => a.id === command.armyId)
            ? (movementCost(
                state,
                scenario,
                state.armies.find((a) => a.id === command.armyId)!,
                command.destination,
              ) ?? 0)
            : 0,
        regency: 0,
        actions: usesPCDomainActions(scenario) ? 0 : 1,
      };
    case 'HoldAction':
      return { gold: 0, regency: 0, actions: 1 };
    case 'RespondDomainAction':
      return { gold: 0, regency: command.regency, actions: 0 };
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
  if (cmd.type === 'SetCampaignOptions')
    return actor === state.playerRealm ? null : { code: 'NOT_OWNER' };
  if (cmd.type === 'AcknowledgeCampaignScene')
    return actor === state.playerRealm && state.pendingGorgonScenes[0] === cmd.stage
      ? null
      : { code: 'INVALID_TARGET' };
  if (cmd.type === 'ContinueCampaign')
    return state.outcome === 'victory' && usesPCStrategy(scenario) && actor === state.playerRealm
      ? null
      : { code: 'GAME_OVER' };
  if (
    [
      'CompleteCouncil',
      'CollectTaxes',
      'SelectActions',
      'SetProvinceLawClaim',
      'SetUnitPayroll',
      'SetCastleSupport',
    ].includes(cmd.type) &&
    !usesPCDomainActions(scenario)
  )
    return {
      code: 'PREREQUISITE',
      detail: 'Maintenance transitions require the PC strategic rules.',
    };
  if (state.outcome !== 'ongoing') return { code: 'GAME_OVER' };
  if (usesPCDomainActions(scenario)) {
    const phase = state.seasonFlow?.phase ?? 'actions';
    if (phase === 'council' && cmd.type !== 'CompleteCouncil')
      return { code: 'PREREQUISITE', detail: 'Complete the Council before realm management.' };
    if (
      phase === 'actions' &&
      ['CompleteCouncil', 'CollectTaxes', 'SelectActions'].includes(cmd.type)
    )
      return { code: 'PREREQUISITE', detail: 'The Maintenance transition is not active.' };
    if (
      phase === 'actions' &&
      ['SetProvinceLawClaim', 'SetUnitPayroll', 'SetCastleSupport'].includes(cmd.type)
    )
      return {
        code: 'PREREQUISITE',
        detail: 'This management choice is available during Maintenance.',
      };
    if (phase === 'maintenance') {
      const allowed = [
        'CollectTaxes',
        'SelectActions',
        'ChangeTaxPolicy',
        'SetCourt',
        'SetLawClaims',
        'SetProvinceLawClaim',
        'SetUnitPayroll',
        'SetCastleSupport',
        'IncreaseBloodline',
        'ResolveEvent',
      ];
      if (!allowed.includes(cmd.type))
        return {
          code: 'PREREQUISITE',
          detail: 'Only Maintenance decisions are available before selecting Domain Actions.',
        };
      if (
        cmd.type === 'CollectTaxes' &&
        (state.seasonFlow?.maintenance?.stage !== 'choices' ||
          state.pendingGorgonScenes.length > 0 ||
          state.pendingEvents.some((event) => event.realmId === state.playerRealm))
      )
        return {
          code: 'PREREQUISITE',
          detail: 'Resolve pending scenes and event decisions before collecting taxes.',
        };
      if (
        cmd.type === 'SelectActions' &&
        (state.seasonFlow?.maintenance?.stage !== 'collected' ||
          state.pendingGorgonScenes.length > 0 ||
          state.pendingEvents.some((event) => event.realmId === state.playerRealm))
      )
        return {
          code: 'PREREQUISITE',
          detail:
            'Taxes must be collected and pending decisions resolved before selecting actions.',
        };
      if (
        state.seasonFlow?.maintenance?.stage === 'collected' &&
        ['ChangeTaxPolicy', 'SetLawClaims', 'SetProvinceLawClaim'].includes(cmd.type)
      )
        return {
          code: 'PREREQUISITE',
          detail: 'Tax and law-claim decisions are locked after Collect Taxes.',
        };
    }
    if (
      ['CompleteCouncil', 'CollectTaxes', 'SelectActions'].includes(cmd.type) &&
      actor !== state.playerRealm
    )
      return { code: 'NOT_OWNER' };
  }
  const realm = state.realms.find((r) => r.id === actor);
  if (!realm || realm.eliminated || realm.controller === 'passive')
    return { code: 'UNKNOWN_REALM' };
  if (state.pendingDomainAction) {
    if (cmd.type !== 'RespondDomainAction' || actor !== commandRealm(state as Campaign, scenario))
      return {
        code: 'PREREQUISITE',
        detail: 'Resolve the pending domain action and regency opposition first.',
      };
    return realm.regency < cmd.regency ? { code: 'REGENCY' } : null;
  }
  if (cmd.type === 'RespondDomainAction')
    return { code: 'INVALID_TARGET', detail: 'No domain action is waiting for a response.' };
  if (
    usesPCDomainActions(scenario) &&
    state.domainTurn &&
    state.domainTurn.order[state.domainTurn.cursor] !== actor &&
    cmd.type !== 'ResolveEvent'
  )
    return { code: 'PREREQUISITE', detail: 'Wait for your domain action slot in this round.' };
  if (cmd.type === 'EndTurn')
    return !playerControls(state, scenario, actor) ? { code: 'INVALID_TARGET' } : null;
  if (cmd.type === 'SetUnitPayroll') {
    const unit = state.armies
      .filter((army) => army.realmId === actor)
      .flatMap((army) => army.units)
      .find((unit) => unit.id === cmd.unitId);
    return unit ? null : { code: 'NOT_OWNER' };
  }
  if (cmd.type === 'SetCastleSupport') {
    const fort = state.fortifications?.find(
      (item) => item.id === cmd.fortificationId && item.realmId === actor && item.level > 0,
    );
    return fort ? null : { code: 'NOT_OWNER' };
  }
  if (cmd.type === 'SetProvinceLawClaim') {
    const province = state.provinces.find((item) => item.id === cmd.provinceId);
    return province &&
      !province.contested &&
      state.holdings.some(
        (holding) =>
          holding.provinceId === province.id &&
          holding.realmId === actor &&
          holding.type === 'law' &&
          holding.level > 0 &&
          !holding.contested &&
          !holding.destroyed,
      )
      ? null
      : { code: 'NOT_OWNER' };
  }
  if (cmd.type === 'SetFealtyRegency' || cmd.type === 'DonateFealtyRegency') {
    if (!usesPCStrategy(scenario))
      return { code: 'PREREQUISITE', detail: 'Fealty orders require the Anuire strategic rules.' };
    const detail = fealtyProblem(state, actor, cmd);
    if (detail) return { code: 'PREREQUISITE', detail };
  }
  if (cmd.type !== 'ResolveEvent' && state.pendingEvents.some((e) => e.realmId === actor))
    return { code: 'PENDING_EVENT' };
  const pcAction = usesPCDomainActions(scenario) && isDomainAction(cmd, scenario);
  if (usesPCStrategy(scenario)) {
    const detail = militaryProblem(state, scenario, actor, cmd);
    if (detail) return { code: 'PREREQUISITE', detail };
  } else if (['DisbandUnit', 'SplitArmy', 'JoinArmies', 'BreakTreaty'].includes(cmd.type))
    return {
      code: 'PREREQUISITE',
      detail: 'This scenario uses legacy military and diplomatic rules.',
    };
  if (
    cmd.type === 'BreakTreaty' &&
    !['pact', 'alliance', 'vassal'].includes(relation(state, actor, cmd.target)?.kind ?? '')
  )
    return { code: 'INVALID_TARGET', detail: 'No agreement with this domain can be renounced.' };
  if (
    cmd.type === 'BreakTreaty' &&
    state.realms.some(
      (r) =>
        (r.id === actor || r.id === cmd.target) &&
        r.lieutenantOf === (r.id === actor ? cmd.target : actor),
    )
  )
    return {
      code: 'PREREQUISITE',
      detail:
        'This domain has already joined as a lieutenant. Dismissal and restoration of transferred holdings are not implemented.',
    };
  const pcMagic = usesPCDomainActions(scenario) && cmd.type === 'CastRealmSpell';
  if (cmd.type === 'IncreaseBloodline' || cmd.type === 'ForgeLeyLine') {
    if (!usesPCDomainActions(scenario))
      return { code: 'PREREQUISITE', detail: 'This scenario uses legacy magic rules.' };
    if (cmd.type === 'IncreaseBloodline') {
      const detail = bloodlineProblem(state, scenario, actor);
      if (detail) return { code: 'PREREQUISITE', detail };
    }
  }
  if (pcMagic) {
    const detail = magicProblem(state, scenario, actor, cmd);
    if (detail) return { code: 'PREREQUISITE', detail };
  }
  const economicCommands = [
    'CreateTradeRoute',
    'EndTradeRoute',
    'BuildRoad',
    'SetCourt',
    'SetLawClaims',
    'TransferGold',
    'SetTribute',
  ];
  if (economicCommands.includes(cmd.type)) {
    if (!usesPCDomainActions(scenario))
      return { code: 'PREREQUISITE', detail: 'This scenario uses legacy economics.' };
    const detail = tradeProblem(state, scenario, actor, cmd);
    if (detail) return { code: 'PREREQUISITE', detail };
  }
  if (cmd.type === 'TransferGold' || cmd.type === 'SetTribute') {
    if (
      actor === cmd.target ||
      !state.realms.some((r) => r.id === cmd.target && !r.eliminated && r.controller !== 'passive')
    )
      return { code: 'INVALID_TARGET' };
    if ((realm.court ?? 1) === 0 && (cmd.type === 'TransferGold' || cmd.amount > 0))
      return { code: 'PREREQUISITE', detail: 'A court is required for diplomacy.' };
  }
  if (
    cmd.type === 'ProposeTreaty' &&
    cmd.kind !== 'war' &&
    !state.unrestrictedDiplomacy &&
    usesPCDomainActions(scenario) &&
    (realm.court ?? 1) === 0
  )
    return { code: 'PREREQUISITE', detail: 'A court is required for diplomacy.' };
  if (pcAction) {
    const detail = domainActionProblem(state, scenario, actor, cmd);
    if (detail) return { code: 'PREREQUISITE', detail };
  } else if (['CreateHolding', 'RuleHoldings', 'ContestHolding', 'Agitate'].includes(cmd.type))
    return { code: 'PREREQUISITE', detail: 'This scenario uses legacy domain actions.' };
  if ('provinceId' in cmd && !pcAction && !pcMagic) {
    const p = state.provinces.find((p) => p.id === cmd.provinceId);
    if (!p) return { code: 'UNKNOWN_PROVINCE' };
    if (cmd.type === 'InvestProvince') {
      const detail = investitureProblem(state, p, actor);
      if (detail) return { code: 'PREREQUISITE', detail };
    } else if (cmd.type === 'PillageProvince') {
      if (provinceController(p) !== actor || p.contested || unitsHere(state, p.id, actor) === 0)
        return {
          code: 'PREREQUISITE',
          detail: 'Pillaging requires uncontested military control and at least one unit.',
        };
      if (p.level === 0 || p.pillagedTurn === state.turn)
        return {
          code: 'PREREQUISITE',
          detail: 'A province can be pillaged once per season and must have a positive level.',
        };
    } else if (cmd.type === 'ChangeTaxPolicy') {
      if (provinceController(p) !== actor || p.contested) return { code: 'NOT_OWNER' };
    } else if (cmd.type === 'RecruitUnit' && usesPCStrategy(scenario)) {
      // Recruitment checks include original holding-only and mercenary exceptions.
    } else if (cmd.type === 'RecruitUnit') {
      if (provinceController(p) !== actor || p.contested) return { code: 'NOT_OWNER' };
    } else if (p.owner !== actor || provinceController(p) !== actor || p.contested)
      return { code: 'NOT_OWNER' };
    const def = scenario.provinces.find((d) => d.id === p.id);
    if (!def) return { code: 'UNKNOWN_PROVINCE' };
    if (cmd.type === 'DevelopProvince' && p.level >= def.maxLevel) return { code: 'MAX_LEVEL' };
    if (cmd.type === 'Fortify' && p.fort >= Math.min(scenario.policy?.maxFort ?? 5, p.level))
      return { code: 'MAX_LEVEL' };
    if (cmd.type === 'Fortify' && usesPCStrategy(scenario)) {
      if (realm.treasury < 1) return { code: 'GOLD' };
      if (
        state.fortifications?.some(
          (f) =>
            f.realmId === actor &&
            f.provinceId === p.id &&
            f.kind === 'castle' &&
            (f.constructionTarget ?? f.level) >= p.level,
        )
      )
        return { code: 'MAX_LEVEL' };
    }
    if (cmd.type === 'RecruitUnit' && !usesPCStrategy(scenario)) {
      const unit = scenario.units.find((u) => u.id === cmd.unitType);
      if (!unit) return { code: 'INVALID_TARGET' };
      if (unit.recruitable === false) return { code: 'PREREQUISITE' };
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
      const cls = rulingRegent(scenario, actor, state)?.class;
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
  if (cmd.type === 'ImproveHolding' && !pcAction) {
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
    if (army.moved && !usesPCStrategy(scenario)) return { code: 'ALREADY_MOVED' };
    if (
      [army.provinceId, destination.id].some((id) =>
        state.effects.some(
          (e) =>
            e.kind === 'warding' &&
            e.provinceId === id &&
            e.realmId !== actor &&
            e.expiresTurn > state.turn,
        ),
      )
    )
      return {
        code: 'PREREQUISITE',
        detail: 'Warding prevents foreign units from entering or leaving the province.',
      };
    if (
      !(
        usesPCStrategy(scenario) &&
        cmd.destination === army.provinceId &&
        monsterEncounter(state, army)
      ) &&
      !scenario.provinces.find((p) => p.id === army.provinceId)?.adjacent.includes(cmd.destination)
    )
      return { code: 'NOT_ADJACENT' };
    if (
      !usesPCStrategy(scenario) &&
      ['mountains', 'heavy-mountains'].includes(
        scenario.provinces.find((p) => p.id === cmd.destination)?.terrain ?? '',
      ) &&
      army.units.some(
        (u) =>
          u.type === 'cavalry' ||
          scenario.units.find((d) => d.id === u.type)?.mobility === 'mounted',
      )
    )
      return { code: 'TERRAIN' };
    if (!mayEnter(state, actor, destination)) return { code: 'TREATY_REQUIRED' };
    const blocked = state.armies.some(
      (a) =>
        a.provinceId === destination.id &&
        a.realmId !== actor &&
        !mayInvade(state, actor, a.realmId) &&
        !(destination.owner === actor && a.realmId === destination.occupiedBy) &&
        !['war', 'alliance', ...(usesPCStrategy(scenario) ? ['pact', 'vassal'] : [])].includes(
          relation(state, actor, a.realmId)?.kind ?? 'peace',
        ),
    );
    if (blocked) return { code: 'TREATY_REQUIRED' };
  }
  if (cmd.type === 'ProposeTreaty') {
    const target = state.realms.find((r) => r.id === cmd.target);
    if (!target || target.id === actor || target.eliminated || target.controller === 'passive')
      return { code: 'INVALID_TARGET' };
    if (
      relation(state, actor, target.id)?.kind === cmd.kind &&
      (cmd.kind !== 'war' || mayInvade(state, actor, target.id))
    )
      return { code: 'INVALID_TARGET' };
    if (
      cmd.kind === 'war' &&
      RULESETS[state.ruleset].warExpires &&
      (realm.actions === 1 || state.domainTurn?.round === 3)
    )
      return { code: 'PREREQUISITE' };
  }
  if (cmd.type === 'ResolveEvent' && !state.pendingEvents.some((e) => e.realmId === actor))
    return { code: 'INVALID_TARGET' };
  const cost = commandCost(state, scenario, cmd, actor);
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
      if (
        id === p.id ||
        !s.provinces.some((n) => n.id === id) ||
        (!s.policy?.directedBorders &&
          !s.provinces.find((n) => n.id === id)?.adjacent.includes(p.id))
      )
        throw new Error(`Asymmetric border ${p.id}/${id}`);
    if (
      p.movement &&
      (p.movement.length !== p.adjacent.length ||
        p.movement.some((e) => !p.adjacent.includes(e.to)) ||
        new Set(p.movement.map((e) => e.to)).size !== p.movement.length)
    )
      throw new Error('Movement records do not match directed adjacency');
  }
  const firstRealm = s.realms[0];
  if (!firstRealm) throw new Error('Scenario must contain a realm');
  validateStateReferences(
    {
      ...s.initial,
      realms: s.realms.map((r) => ({
        id: r.id,
        treasury: s.initial.domains?.find((d) => d.id === r.id)?.treasury ?? s.initial.treasury,
        regency: s.initial.domains?.find((d) => d.id === r.id)?.regency ?? s.initial.regency,
        actions: 3,
        eliminated: false,
      })),
      effects: [],
      pendingEvents: [],
      playerRealm: firstRealm.id,
    },
    s,
  );
  if (s.initial.domains) {
    unique(
      s.initial.domains.map((d) => d.id),
      'domain balances',
    );
    if (
      s.initial.domains.length !== s.realms.length ||
      s.initial.domains.some((d) => !s.realms.some((r) => r.id === d.id))
    )
      throw new Error('Incomplete domain balances');
  }
  if (s.regents) {
    unique(
      s.regents.map((g) => g.id),
      'regent',
    );
    if (s.realms.some((r) => !s.regents!.some((g) => g.id === r.regent.id)))
      throw new Error('Unknown realm regent');
  }
  for (const realm of s.realms) {
    if (
      realm.regentCandidates &&
      (!realm.regentCandidates.includes(realm.regent.id) ||
        new Set(realm.regentCandidates).size !== realm.regentCandidates.length ||
        realm.regentCandidates.some(
          (id) => id !== realm.regent.id && !s.regents?.some((g) => g.id === id),
        ))
    )
      throw new Error('Invalid regent candidates');
  }
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
> &
  Pick<
    Campaign,
    | 'fortifications'
    | 'characters'
    | 'warDeclarations'
    | 'domainTurn'
    | 'pendingDomainAction'
    | 'roads'
    | 'ports'
    | 'tributes'
    | 'leyLines'
    | 'gorgonAllyRealmId'
    | 'seasonFlow'
    | 'provinceLawClaims'
  >;
export function validateStateReferences(state: ReferenceState, s: Scenario): void {
  if (state.gorgonAllyRealmId && !state.realms.some((r) => r.id === state.gorgonAllyRealmId))
    throw new Error('Unknown Gorgon ally realm');
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
    (state.provinceLawClaims ?? []).map((claim) => `${claim.provinceId}|${claim.realmId}`),
    'province law claim',
  );
  for (const claim of state.provinceLawClaims ?? [])
    if (
      !state.provinces.some((province) => province.id === claim.provinceId) ||
      !state.realms.some((realm) => realm.id === claim.realmId)
    )
      throw new Error('Invalid province law claim reference');
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
  if (state.seasonFlow) {
    const flow = state.seasonFlow;
    if (flow.phase !== 'actions' && state.domainTurn)
      throw new Error('Council and Maintenance cannot contain an active domain-action schedule');
    if (flow.phase === 'maintenance' && !flow.maintenance)
      throw new Error('Maintenance phase is missing its transaction state');
    if (flow.phase !== 'maintenance' && flow.maintenance)
      throw new Error('Maintenance transaction exists outside Maintenance');
    if (flow.maintenance?.stage === 'collected') {
      const reports = flow.maintenance.actualIncome;
      const active = state.realms.filter(
        (realm) =>
          !realm.eliminated && realm.controller !== 'passive' && realm.behavior !== 'monsters',
      );
      if (
        !reports ||
        reports.length !== active.length ||
        new Set(reports.map((report) => report.realmId)).size !== active.length ||
        reports.some((report) => !active.some((realm) => realm.id === report.realmId))
      )
        throw new Error('Collected Maintenance income ledger is incomplete');
    }
  }
  for (const r of state.realms) {
    if (!s.realms.some((d) => d.id === r.id)) throw new Error('Unknown realm');
    if (r.regentId && !realmRegentCandidates(s, r.id).some((g) => g.id === r.regentId))
      throw new Error('Invalid ruling regent');
  }
  for (const p of state.provinces) {
    const def = s.provinces.find((d) => d.id === p.id);
    if (
      !def ||
      !s.realms.some((r) => r.id === p.owner) ||
      p.level > def.maxLevel ||
      (s.policy?.conquest !== 'occupation' &&
        p.fort >
          (s.policy?.holdingCapacity === 'preserve-template-excess'
            ? Math.max(
                Math.min(s.policy.maxFort, p.level),
                s.initial.provinces.find((i) => i.id === p.id)?.fort ?? 0,
              )
            : Math.min(s.policy?.maxFort ?? 5, p.level))) ||
      (p.fortOwner != null && !s.realms.some((r) => r.id === p.fortOwner)) ||
      (p.occupiedBy != null && !s.realms.some((r) => r.id === p.occupiedBy))
    )
      throw new Error('Invalid province state');
    if (state.fortifications && fortLevel(state, p) !== p.fort)
      throw new Error('Fortification aggregate does not match sovereign castles');
    for (const type of ['law', 'guild', 'temple', 'source']) {
      const total = state.holdings
        .filter((h) => h.provinceId === p.id && h.type === type && !h.destroyed)
        .reduce((n, h) => n + h.level, 0);
      if (
        total >
        holdingCapacityLimit(
          s,
          p.id,
          type,
          type === 'source' ? sourcePotential(s, p.id, p.level) : p.level,
        )
      )
        throw new Error('Holding capacity exceeded');
    }
  }
  for (const h of state.holdings)
    if (
      !state.provinces.some((p) => p.id === h.provinceId) ||
      !state.realms.some((r) => r.id === h.realmId) ||
      (h.destroyed && h.level !== 0)
    )
      throw new Error('Invalid holding reference');
  if (state.domainTurn) {
    const d = state.domainTurn;
    unique(d.order, 'domain turn order');
    if (
      d.cursor >= d.order.length ||
      d.order.some((id) => !state.realms.some((r) => r.id === id)) ||
      !d.order.includes(state.playerRealm)
    )
      throw new Error('Invalid domain turn order');
  }
  if (state.pendingDomainAction) {
    const p = state.pendingDomainAction;
    if (
      !state.domainTurn ||
      state.domainTurn.order[state.domainTurn.cursor] !== p.actor ||
      p.index >= p.checks.length ||
      !isDomainAction(p.command, s)
    )
      throw new Error('Invalid pending domain action');
    if (
      p.stage === 'prepare' ||
      !playerControls(state, s, p.responseRealm ?? state.playerRealm) ||
      (p.stage === 'counter' && p.actor !== (p.responseRealm ?? state.playerRealm)) ||
      (p.stage === 'defend' &&
        !p.checks[p.index]!.opponents.includes(p.responseRealm ?? state.playerRealm)) ||
      p.responseQueue?.some(
        (id) => !p.checks[p.index]!.opponents.includes(id) || !playerControls(state, s, id),
      )
    )
      throw new Error('Invalid pending response role');
    for (const c of p.checks)
      if (
        !state.provinces.some((x) => x.id === c.provinceId) ||
        (c.holdingId && !state.holdings.some((h) => h.id === c.holdingId)) ||
        c.opponents.some((id) => !state.realms.some((r) => r.id === id))
      )
        throw new Error('Invalid pending domain target');
    unique(
      p.opposition.map((o) => o.realmId),
      'domain opposition',
    );
    if (p.opposition.some((o) => !p.checks[p.index]!.opponents.includes(o.realmId)))
      throw new Error('Invalid domain opposition');
  }
  for (const a of state.armies)
    if (
      !state.provinces.some((p) => p.id === a.provinceId) ||
      !state.realms.some((r) => r.id === a.realmId) ||
      a.units.some((u) => !s.units.some((d) => d.id === u.type))
    )
      throw new Error('Invalid army reference');
  for (const [records, label] of [
    [state.fortifications ?? [], 'fortification'],
    [state.characters ?? [], 'character deployment'],
  ] as const) {
    unique(
      records.map((r) => r.id),
      label,
    );
    for (const record of records)
      if (
        !state.provinces.some((p) => p.id === record.provinceId) ||
        !state.realms.some((r) => r.id === record.realmId)
      )
        throw new Error(`Invalid ${label} reference`);
  }
  for (const c of state.characters ?? [])
    if (
      (c.regentId !== null && !s.regents?.some((r) => r.id === c.regentId)) ||
      (c.role === 'regent' && c.regentId !== rulingRegent(s, c.realmId, state)?.id) ||
      (c.role === 'lieutenant' &&
        (c.originRealm
          ? !state.realms.some((r) => r.id === c.originRealm && r.lieutenantOf === c.realmId)
          : c.regentId === rulingRegent(s, c.realmId, state)?.id ||
            !realmRegentCandidates(s, c.realmId).some((g) => g.id === c.regentId) ||
            !s.initial.characters?.some(
              (original) =>
                original.id === c.id &&
                original.realmId === c.realmId &&
                original.regentId === c.regentId,
            )))
    )
      throw new Error('Invalid deployed regent reference');
  for (const r of state.realms)
    if (
      r.lieutenantOf &&
      (r.id === r.lieutenantOf || !state.realms.some((d) => d.id === r.lieutenantOf))
    )
      throw new Error('Invalid assimilated domain reference');
  if (
    !!s.initial.fortifications !== !!state.fortifications ||
    !!s.initial.characters !== !!state.characters
  )
    throw new Error('Incomplete imported entity state');
  unique(
    state.treaties.map((t) => [t.a, t.b].sort().join('|')),
    'treaty',
  );
  for (const t of state.treaties)
    if (
      t.a === t.b ||
      ![t.a, t.b].every((id) => s.realms.some((r) => r.id === id)) ||
      (t.kind === 'vassal' && (!t.vassal || ![t.a, t.b].includes(t.vassal))) ||
      (t.brokenBy && ![t.a, t.b].includes(t.brokenBy))
    )
      throw new Error('Invalid treaty');
  unique(
    (state.warDeclarations ?? []).map((w) => `${w.actor}|${w.target}`),
    'war declaration',
  );
  for (const w of state.warDeclarations ?? [])
    if (
      w.actor === w.target ||
      ![w.actor, w.target].every((id) => state.realms.some((r) => r.id === id)) ||
      relation(state as Campaign, w.actor, w.target)?.kind !== 'war'
    )
      throw new Error('Invalid war declaration');
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
  for (const t of state.tradeRoutes) {
    if (
      t.guildId &&
      !state.holdings.some(
        (h) => h.id === t.guildId && h.type === 'guild' && h.provinceId === t.from,
      )
    )
      throw new Error('Invalid trade guild reference');
  }
  unique(
    (state.roads ?? []).map((r) => `${r.from}|${r.to}`),
    'road',
  );
  for (const r of state.roads ?? [])
    if (!s.provinces.find((p) => p.id === r.from)?.adjacent.includes(r.to))
      throw new Error('Invalid road reference');
  unique(
    (state.ports ?? []).map((p) => p.id),
    'port',
  );
  for (const p of state.ports ?? [])
    if (
      !state.provinces.some((d) => d.id === p.provinceId) ||
      !state.realms.some((r) => r.id === p.realmId)
    )
      throw new Error('Invalid port reference');
  unique(
    (state.tributes ?? []).map((t) => t.id),
    'tribute',
  );
  unique(
    (state.tributes ?? []).map((t) => `${t.payer}|${t.recipient}`),
    'tribute agreement',
  );
  for (const t of state.tributes ?? [])
    if (
      t.payer === t.recipient ||
      ![t.payer, t.recipient].every((id) => state.realms.some((r) => r.id === id))
    )
      throw new Error('Invalid tribute reference');
  unique(
    (state.leyLines ?? []).map((l) => l.id),
    'ley line',
  );
  unique(
    (state.leyLines ?? []).map((l) => [l.fromHoldingId, l.toHoldingId].sort().join('|')),
    'ley connection',
  );
  for (const line of state.leyLines ?? []) {
    const a = state.holdings.find((h) => h.id === line.fromHoldingId),
      b = state.holdings.find((h) => h.id === line.toHoldingId);
    if (
      !a ||
      !b ||
      a.type !== 'source' ||
      b.type !== 'source' ||
      a.provinceId === b.provinceId ||
      !state.realms.some((r) => r.id === line.realmId) ||
      line.path[0] !== a.provinceId ||
      line.path.at(-1) !== b.provinceId ||
      line.path
        .slice(1)
        .some((id, i) => !s.provinces.find((p) => p.id === line.path[i])?.adjacent.includes(id))
    )
      throw Error('Invalid ley line reference or geography');
  }
  for (const r of state.realms) {
    unique(r.knownSpells ?? [], 'known realm spell');
    if (r.knownSpells?.some((id) => !s.spells.some((spell) => spell.id === id)))
      throw Error('Unknown learned realm spell');
  }
  unique(
    state.effects.flatMap((e) => (e.id ? [e.id] : [])),
    'spell effect',
  );
  for (const e of state.effects)
    if (
      !s.spells.some((d) => d.id === e.spellId) ||
      !state.provinces.some((p) => p.id === e.provinceId) ||
      !state.realms.some((r) => r.id === e.realmId) ||
      (e.kind &&
        !s.spells.some(
          (d) => d.id === e.spellId && d.effect === (e.kind === 'antimagic' ? 'dispel' : e.kind),
        )) ||
      (e.kind === 'antimagic' && e.resistance === undefined)
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
