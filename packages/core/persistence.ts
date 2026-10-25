import { rulingRegent } from './regents';
import { z } from 'zod';
import {
  saveSchema,
  legacySaveSchema,
  birthright15SaveCodec,
  type Campaign,
  type Birthright15Campaign,
  type StoredCampaign,
  type Scenario,
} from './schema';
import { type DomainOverlays, domainOverlaysSchema } from './domain-rules';
import { validateStateReferences } from './validation';
import { fortLevel } from './domains';
import { initializeDomainTurn } from './domain-turn';
import { usesPCDomainActions } from './domain-actions';
import { portIncomeRule } from './ports';
import { refreshLeyLines } from './ley-lines';
import { usesPCStrategy } from './military';
import { validateCharacterOverlays35, type CharacterOverlays35 } from './character-sheets';
import { validateRegencyState15 } from './regency15';
import { validateCourtActions15 } from './court-actions15';
export function serializeCampaign(campaign: StoredCampaign): string {
  if (isBirthright15(campaign)) {
    validateRegencyState15(campaign);
    validateCourtActions15(campaign);
    return JSON.stringify(
      z.encode(birthright15SaveCodec, { format: 'birthright-hd', version: 2, campaign }),
    );
  }
  return JSON.stringify(legacySaveSchema.parse({ format: 'birthright-hd', version: 1, campaign }));
}
function isBirthright15(campaign: StoredCampaign): campaign is Birthright15Campaign {
  return campaign.domainRules?.id === 'birthright-1.5';
}
export function deserializeCampaign(text: string, scenario: Scenario): Campaign;
export function deserializeCampaign(
  text: string,
  scenario: Scenario,
  options: {
    domainRules: 'birthright-1.5';
    expectedOverlays?: DomainOverlays;
    overlayContent?: CharacterOverlays35;
  },
): Birthright15Campaign;
export function deserializeCampaign(
  text: string,
  scenario: Scenario,
  options?: {
    domainRules: 'birthright-1.5';
    expectedOverlays?: DomainOverlays;
    overlayContent?: CharacterOverlays35;
  },
): StoredCampaign {
  if (text.length > 10_000_000) throw new Error('Save is too large');
  const raw = JSON.parse(text);
  const save = saveSchema.parse(raw as unknown);
  if (save.version === 2) {
    if (options?.domainRules !== 'birthright-1.5')
      throw new Error(
        'Birthright 1.5 foundation save: explicit 1.5 loading is required; gameplay is not active.',
      );
    if (options.expectedOverlays) {
      const expected = domainOverlaysSchema.parse(options.expectedOverlays);
      for (const key of ['characters', 'handlers'] as const) {
        const actual = save.campaign.domainRules.overlays[key];
        if (
          actual?.version !== expected[key]?.version ||
          actual?.fingerprint !== expected[key]?.fingerprint
        )
          throw new Error(`Birthright 1.5 ${key} overlay version/fingerprint mismatch`);
      }
    }
    validateScenarioIdentity(save.campaign, scenario);
    const attached = save.campaign.domainRules.overlays;
    if (attached.characters || attached.handlers || options.overlayContent)
      validateCharacterOverlays35(
        options.overlayContent ?? { characters: null, handlers: null },
        scenario,
        attached,
      );
    validateLoadedState(save.campaign, scenario);
    validateRegencyState15(save.campaign, scenario, false, options.overlayContent);
    if (save.campaign.courtActions15 && !options.overlayContent)
      throw new Error('Court/action saves require their exact overlay content');
    validateCourtActions15(save.campaign, scenario, options.overlayContent);
    return save.campaign;
  }
  if (options?.domainRules === 'birthright-1.5')
    throw new Error('Legacy saves are not automatically converted to Birthright 1.5.');
  const state = save.campaign;
  // Legacy saves are already inside their current action turn; never backfill a season.
  if (usesPCDomainActions(scenario))
    state.seasonFlow ??= { phase: 'actions', transitionId: `legacy-${state.turn}` };
  state.settlementVersion ??= 1;
  // Old saves already completed their current post-report phase. Never backfill past events.
  if (raw.campaign.eventHistory === undefined) state.lastCampaignEventTurn = state.turn;
  if (usesPCStrategy(scenario)) {
    for (const d of scenario.realms.filter((r) => r.specialBehavior === 'monsters')) {
      const realm = state.realms.find((r) => r.id === d.id);
      if (realm) {
        realm.behavior = 'monsters';
        realm.controller = 'ai';
        if (state.domainTurn && !realm.eliminated && !state.domainTurn.order.includes(realm.id))
          state.domainTurn.order.push(realm.id);
      }
    }
    // Recover per-record icon identity without replacing armies, IDs, strength or balances.
    const originals = scenario.initial.armies.flatMap((a) => a.units);
    for (const a of state.armies)
      for (const u of a.units) {
        const original = originals.find((t) => t.sourceId === u.sourceId && t.id === u.id);
        if (original?.nativeIcon !== undefined && u.type.startsWith('original-troop-')) {
          u.type = original.type;
          u.nativeIcon = original.nativeIcon;
          u.nativeTypeCode = original.nativeTypeCode;
        }
      }
  }
  if (usesPCDomainActions(scenario)) {
    state.roads ??= [];
    state.tributes ??= [];
    state.ports ??= structuredClone(scenario.initial.ports ?? []);
    state.leyLines ??= structuredClone(scenario.initial.leyLines ?? []).filter(
      (l) =>
        state.holdings.some((h) => h.id === l.fromHoldingId) &&
        state.holdings.some((h) => h.id === l.toHoldingId),
    );
    refreshLeyLines(state);
    for (const p of state.ports) p.incomeRule = portIncomeRule(p.kind);
    for (const r of state.realms) {
      r.court ??= scenario.initial.domains?.find((d) => d.id === r.id)?.court ?? 1;
      r.bloodlineStrength ??= rulingRegent(scenario, r.id, state)!.bloodline.strength;
      r.knownSpells ??= [...(rulingRegent(scenario, r.id, state)!.realmSpells ?? [])];
    }
  }
  validateScenarioIdentity(state, scenario);
  // Additive v1 extension. Old saves had reciprocal wars and no occupation timing.
  // Preserve all entities/resources; require a newly observed boundary for investiture.
  if (!state.warDeclarations) {
    state.warDeclarations = state.treaties
      .filter((t) => t.kind === 'war')
      .flatMap((t) => [
        { actor: t.a, target: t.b, turn: t.since },
        { actor: t.b, target: t.a, turn: t.since },
      ]);
    for (const p of state.provinces)
      if (p.occupiedBy) {
        p.occupationSinceTurn = state.turn;
        delete p.investitureReadyTurn;
      }
    // Earlier occupation saves aggregated the occupier's castles in p.fort.
    // Preserve every fort and its saved owner; only rebuild this derived summary.
    if (state.fortifications) for (const p of state.provinces) p.fort = fortLevel(state, p);
    state.log.push({
      code: 'save.warfare-upgraded',
      turn: state.turn,
      realmId: state.playerRealm,
      data: {},
    });
  }
  if (usesPCDomainActions(scenario) && state.seasonFlow?.phase === 'actions' && !state.domainTurn) {
    const remaining = state.realms.find((r) => r.id === state.playerRealm)!.actions;
    initializeDomainTurn(state, true, Math.min(3, 4 - remaining));
    state.log.push({
      code: 'save.domain-rounds-upgraded',
      turn: state.turn,
      realmId: state.playerRealm,
      data: { remaining },
    });
  }
  validateLoadedState(state, scenario);
  return state;
}

function validateScenarioIdentity(state: StoredCampaign, scenario: Scenario) {
  if (state.scenarioId !== scenario.id || state.scenarioRevision !== scenario.revision)
    throw new Error('This save requires a different scenario version');
  if (state.scenarioFingerprint !== scenario.fingerprint)
    throw new Error('Load the same private Anuire dataset and adapter version used by this save.');
}

function validateLoadedState(state: StoredCampaign, scenario: Scenario) {
  validateStateReferences(state, scenario);
  const ids = [
    ...state.armies.map((a) => a.id),
    ...state.armies.flatMap((a) => a.units.map((u) => u.id)),
    ...(state.fortifications?.map((f) => f.id) ?? []),
    ...state.holdings.map((h) => h.id),
    ...state.tradeRoutes.map((t) => t.id),
    ...(state.tributes ?? []).map((t) => t.id),
    ...(state.leyLines ?? []).map((l) => l.id),
    ...(state.characters ?? []).map((c) => c.id),
    ...state.effects.flatMap((e) => (e.id ? [e.id] : [])),
  ];
  if (
    ids.some(
      (id) =>
        /^(army|unit|fort|holding|route|tribute|ley|effect|character)-\d+$/.test(id) &&
        Number(id.split('-')[1]) >= state.nextId,
    )
  )
    throw new Error('Invalid ID sequence');
}
