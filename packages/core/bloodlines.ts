import type { Campaign, Scenario } from './schema';
import { rulingRegent } from './regents';

export function characterClasses(
  scenario: Scenario,
  realmId: string,
  state?: Pick<Campaign, 'realms'>,
) {
  const r = rulingRegent(scenario, realmId, state);
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
    rulingRegent(scenario, realmId, state)?.bloodline.strength ??
    0
  );
}
export function casterProfile(
  scenario: Scenario,
  realmId: string,
  holding: 'source' | 'temple',
  state?: Pick<Campaign, 'realms'>,
) {
  return characterClasses(scenario, realmId, state).find((c) =>
    holding === 'temple' ? c.type === 'priest' : ['wizard', 'magician', 'bard'].includes(c.type),
  );
}
export function isTrueWizard(
  scenario: Scenario,
  realmId: string,
  state?: Pick<Campaign, 'realms'>,
) {
  return characterClasses(scenario, realmId, state).some(
    (c) => c.type === 'wizard' || c.type === 'magician',
  );
}
