import type { Campaign, Scenario } from './schema';

export function characterClasses(scenario: Scenario, realmId: string) {
  const r = scenario.realms.find((r) => r.id === realmId)?.regent;
  if (!r) return [];
  if (r.classes) return r.classes;
  const type = (
    { warrior: 'fighter', wizard: 'wizard', priest: 'priest', rogue: 'thief' } as const
  )[r.class];
  // Legacy synthetic fixtures have no original class/level data.
  return [{ type, level: 1 }];
}
export function bloodlineStrength(state: Campaign, scenario: Scenario, realmId: string): number {
  return (
    state.realms.find((r) => r.id === realmId)?.bloodlineStrength ??
    scenario.realms.find((r) => r.id === realmId)?.regent.bloodline.strength ??
    0
  );
}
export function casterProfile(scenario: Scenario, realmId: string, holding: 'source' | 'temple') {
  return characterClasses(scenario, realmId).find((c) =>
    holding === 'temple' ? c.type === 'priest' : ['wizard', 'magician', 'bard'].includes(c.type),
  );
}
export function isTrueWizard(scenario: Scenario, realmId: string) {
  return characterClasses(scenario, realmId).some(
    (c) => c.type === 'wizard' || c.type === 'magician',
  );
}
