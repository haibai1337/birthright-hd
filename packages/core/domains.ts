import type { Campaign, Scenario, Province } from './schema';

export function realmSelectable(
  scenario: Scenario,
  id: string,
  mode: 'CLASSIC' | 'UNRESTRICTED' = scenario.selection?.mode ?? 'CLASSIC',
) {
  const r = scenario.realms.find((r) => r.id === id);
  if (!r || r.technicalPlayable === false || r.domainType === 'inactive') return false;
  return (
    scenario.selection?.overrides?.[id] ?? (mode === 'UNRESTRICTED' || r.originalPlayable !== false)
  );
}
export const provinceController = (p: Province) => p.occupiedBy ?? p.owner;
export function fortLevel(state: Pick<Campaign, 'fortifications'>, province: Province) {
  if (!state.fortifications) return province.fort;
  return Math.max(
    0,
    ...state.fortifications
      .filter(
        (f) =>
          f.provinceId === province.id &&
          f.realmId === provinceController(province) &&
          f.kind === 'castle',
      )
      .map((f) => f.level),
  );
}
export function domainSurvives(state: Campaign, scenario: Scenario, id: string) {
  const policy =
    scenario.realms.find((r) => r.id === id)?.survival ??
    scenario.policy?.survival ??
    'domain-assets';
  if (policy === 'persistent') return true;
  if (state.provinces.some((p) => p.owner === id)) return true;
  if (policy === 'territory') return false;
  return (
    state.holdings.some((h) => h.realmId === id && h.level > 0) ||
    state.armies.some((a) => a.realmId === id) ||
    (state.fortifications?.some((f) => f.realmId === id && f.level > 0) ?? false)
  );
}
export function holdingCapacityLimit(
  scenario: Scenario,
  provinceId: string,
  type: string,
  normal: number,
) {
  if (scenario.policy?.holdingCapacity !== 'preserve-template-excess') return normal;
  return Math.max(
    normal,
    scenario.initial.holdings
      .filter((h) => h.provinceId === provinceId && h.type === type)
      .reduce((n, h) => n + h.level, 0),
  );
}
