import { saveSchema, type Campaign, type Scenario } from './schema';
import { validateStateReferences } from './validation';
import { fortLevel } from './domains';
import { initializeDomainTurn } from './domain-turn';
import { usesPCDomainActions } from './domain-actions';
import { portIncomeRule } from './ports';
import { refreshLeyLines } from './ley-lines';
export function serializeCampaign(campaign: Campaign): string {
  return JSON.stringify(saveSchema.parse({ format: 'birthright-hd', version: 1, campaign }));
}
export function deserializeCampaign(text: string, scenario: Scenario): Campaign {
  if (text.length > 10_000_000) throw new Error('Save is too large');
  const save = saveSchema.parse(JSON.parse(text) as unknown);
  const state = save.campaign;
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
      r.bloodlineStrength ??= scenario.realms.find((d) => d.id === r.id)!.regent.bloodline.strength;
      r.knownSpells ??= [...(scenario.realms.find((d) => d.id === r.id)!.regent.realmSpells ?? [])];
    }
  }
  if (state.scenarioId !== scenario.id || state.scenarioRevision !== scenario.revision)
    throw new Error('This save requires a different scenario version');
  if (state.scenarioFingerprint !== scenario.fingerprint)
    throw new Error('Load the same private Anuire dataset and adapter version used by this save.');
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
  if (usesPCDomainActions(scenario) && !state.domainTurn) {
    const remaining = state.realms.find((r) => r.id === state.playerRealm)!.actions;
    initializeDomainTurn(state, true, Math.min(3, 4 - remaining));
    state.log.push({
      code: 'save.domain-rounds-upgraded',
      turn: state.turn,
      realmId: state.playerRealm,
      data: { remaining },
    });
  }
  validateStateReferences(state, scenario);
  const ids = [
    ...state.armies.map((a) => a.id),
    ...state.armies.flatMap((a) => a.units.map((u) => u.id)),
    ...(state.fortifications?.map((f) => f.id) ?? []),
    ...state.holdings.map((h) => h.id),
    ...state.tradeRoutes.map((t) => t.id),
    ...(state.tributes ?? []).map((t) => t.id),
    ...(state.leyLines ?? []).map((l) => l.id),
    ...state.effects.flatMap((e) => (e.id ? [e.id] : [])),
  ];
  if (
    ids.some(
      (id) =>
        /^(army|unit|fort|holding|route|tribute|ley|effect)-\d+$/.test(id) &&
        Number(id.split('-')[1]) >= state.nextId,
    )
  )
    throw new Error('Invalid ID sequence');
  return state;
}
