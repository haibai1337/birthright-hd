import type { Campaign, Command, Scenario } from './schema';
import { armyPower, forecast, relation, treatyAcceptance } from './selectors';
import { validateCommand } from './validation';
import { compareIds } from './order';
export interface AIPlan {
  command: Command;
  reason:
    'relief' | 'defend' | 'invade' | 'recruit' | 'diplomacy' | 'develop' | 'holding' | 'fortify';
}
export function planNextAI(state: Campaign, scenario: Scenario, actor: string): AIPlan | null {
  const candidates: AIPlan[] = [];
  const realm = state.realms.find((r) => r.id === actor);
  if (!realm || realm.eliminated) return null;
  if (state.pendingEvents.some((e) => e.realmId === actor))
    candidates.push({
      command: { type: 'ResolveEvent', choice: realm.treasury >= 4 ? 'relief' : 'decline' },
      reason: 'relief',
    });
  const owned = state.provinces
    .filter((p) => p.owner === actor)
    .sort((a, b) => compareIds(a.id, b.id));
  const armies = state.armies
    .filter((a) => a.realmId === actor)
    .sort((a, b) => compareIds(a.id, b.id));
  for (const army of armies) {
    const here = scenario.provinces.find((p) => p.id === army.provinceId);
    for (const next of [...(here?.adjacent ?? [])].sort()) {
      const province = state.provinces.find((p) => p.id === next);
      if (!province) continue;
      if (province.owner !== actor && relation(state, actor, province.owner)?.kind === 'war') {
        const defense =
          state.armies
            .filter((a) => a.provinceId === next && a.realmId !== actor)
            .reduce((n, a) => n + armyPower(a, scenario), 0) +
          province.level +
          province.fort * 3 +
          5;
        if (armyPower(army, scenario) > defense * 1.1)
          candidates.push({
            command: { type: 'MoveArmy', armyId: army.id, destination: next },
            reason: 'invade',
          });
      }
      if (province.owner === actor) {
        const threatened = scenario.provinces
          .find((p) => p.id === next)
          ?.adjacent.some((id) =>
            state.armies.some(
              (a) => a.provinceId === id && relation(state, actor, a.realmId)?.kind === 'war',
            ),
          );
        if (threatened && !state.armies.some((a) => a.provinceId === next && a.realmId === actor))
          candidates.push({
            command: { type: 'MoveArmy', armyId: army.id, destination: next },
            reason: 'defend',
          });
      }
    }
  }
  const units = armies.reduce((n, a) => n + a.units.length, 0);
  const budget = forecast(state, scenario, actor);
  if (units < owned.length + 2 && realm.treasury >= 6 && budget.net >= 0) {
    const border = [...owned].sort(
      (a, b) =>
        Number(
          scenario.provinces
            .find((p) => p.id === b.id)
            ?.adjacent.some((id) => state.provinces.find((n) => n.id === id)?.owner !== actor),
        ) -
          Number(
            scenario.provinces
              .find((p) => p.id === a.id)
              ?.adjacent.some((id) => state.provinces.find((n) => n.id === id)?.owner !== actor),
          ) || compareIds(a.id, b.id),
    );
    for (const p of border)
      candidates.push({
        command: { type: 'RecruitUnit', provinceId: p.id, unitType: 'infantry' },
        reason: 'recruit',
      });
  }
  if (state.turn % 3 === 0)
    for (const other of state.realms
      .filter((r) => r.id !== actor && !r.eliminated)
      .sort((a, b) => compareIds(a.id, b.id))) {
      const current = relation(state, actor, other.id);
      const kind =
        current?.kind === 'war'
          ? 'peace'
          : current?.kind === 'peace'
            ? 'pact'
            : current?.kind === 'pact'
              ? 'alliance'
              : null;
      if (kind && treatyAcceptance(state, scenario, actor, other.id, kind))
        candidates.push({
          command: { type: 'ProposeTreaty', target: other.id, kind },
          reason: 'diplomacy',
        });
    }
  for (const p of [...owned].sort((a, b) => a.level - b.level || compareIds(a.id, b.id)))
    candidates.push({ command: { type: 'DevelopProvince', provinceId: p.id }, reason: 'develop' });
  for (const h of state.holdings.filter((h) => h.realmId === actor))
    candidates.push({ command: { type: 'ImproveHolding', holdingId: h.id }, reason: 'holding' });
  if (realm.treasury >= 12)
    for (const p of owned)
      candidates.push({ command: { type: 'Fortify', provinceId: p.id }, reason: 'fortify' });
  return candidates.find((p) => !validateCommand(state, scenario, actor, p.command)) ?? null;
}
