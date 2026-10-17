import { saveSchema, type Campaign, type Scenario } from './schema';
import { validateStateReferences } from './validation';
export function serializeCampaign(campaign: Campaign): string {
  return JSON.stringify(saveSchema.parse({ format: 'birthright-hd', version: 1, campaign }));
}
export function deserializeCampaign(text: string, scenario: Scenario): Campaign {
  if (text.length > 10_000_000) throw new Error('Save is too large');
  const save = saveSchema.parse(JSON.parse(text) as unknown);
  const state = save.campaign;
  if (state.scenarioId !== scenario.id || state.scenarioRevision !== scenario.revision)
    throw new Error('This save requires a different scenario version');
  if (state.scenarioFingerprint !== scenario.fingerprint)
    throw new Error('Load the same private Anuire dataset and adapter version used by this save.');
  validateStateReferences(state, scenario);
  const ids = [
    ...state.armies.map((a) => a.id),
    ...state.armies.flatMap((a) => a.units.map((u) => u.id)),
    ...(state.fortifications?.map((f) => f.id) ?? []),
  ];
  if (
    ids.some((id) => /^(army|unit|fort)-\d+$/.test(id) && Number(id.split('-')[1]) >= state.nextId)
  )
    throw new Error('Invalid ID sequence');
  return state;
}
