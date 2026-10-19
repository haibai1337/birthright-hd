import type { Campaign, Scenario, Command } from './schema';
import { isTrueWizard } from './bloodlines';

export function provincePath(
  scenario: { provinces: Pick<Scenario['provinces'][number], 'id' | 'adjacent'>[] },
  from: string,
  to: string,
): string[] | null {
  const paths = [[from]],
    seen = new Set([from]);
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]!;
    for (const id of scenario.provinces.find((p) => p.id === path.at(-1))?.adjacent ?? []) {
      if (seen.has(id)) continue;
      const next = [...path, id];
      if (id === to) return next;
      seen.add(id);
      paths.push(next);
    }
  }
  return null;
}
export function inspectLeyLine(state: Campaign, line: NonNullable<Campaign['leyLines']>[number]) {
  const a = state.holdings.find((h) => h.id === line.fromHoldingId),
    b = state.holdings.find((h) => h.id === line.toHoldingId);
  if (line.status === 'destroyed' || !a || !b || a.destroyed || b.destroyed)
    return { status: 'destroyed' as const, reason: 'A source was destroyed' };
  if ([a, b].some((h) => h.realmId !== line.realmId || h.contested))
    return {
      status: 'inactive' as const,
      reason: 'A source is contested or belongs to another domain',
    };
  return { status: 'active' as const, reason: '' };
}
export function refreshLeyLines(state: Campaign) {
  for (const l of state.leyLines ?? []) Object.assign(l, inspectLeyLine(state, l));
}
export function availableSource(state: Campaign, realmId: string, provinceId: string): number {
  const local = state.holdings.filter(
    (h) =>
      h.type === 'source' &&
      h.realmId === realmId &&
      h.provinceId === provinceId &&
      !h.destroyed &&
      !h.contested,
  );
  if (!local.length) return 0;
  const ids = new Set(local.map((h) => h.id));
  for (const id of ids)
    for (const line of state.leyLines ?? []) {
      if (line.realmId !== realmId || inspectLeyLine(state, line).status !== 'active') continue;
      if (line.fromHoldingId === id) ids.add(line.toHoldingId);
      if (line.toHoldingId === id) ids.add(line.fromHoldingId);
    }
  return Math.max(0, ...state.holdings.filter((h) => ids.has(h.id)).map((h) => h.level));
}
export function leyLineProblem(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  cmd: Command,
): string | null {
  if (cmd.type !== 'ForgeLeyLine') return null;
  if (!isTrueWizard(scenario, actor, state))
    return 'Only wizard regents may forge ley lines; bards and priests cannot.';
  const a = state.holdings.find((h) => h.id === cmd.fromHoldingId),
    b = state.holdings.find((h) => h.id === cmd.toHoldingId);
  if (
    !a ||
    !b ||
    [a, b].some((h) => h.type !== 'source' || h.realmId !== actor || h.destroyed || h.contested)
  )
    return 'Both endpoints must be your surviving, uncontested source holdings.';
  if (a.provinceId === b.provinceId) return 'Choose sources in different provinces.';
  const lines = (state.leyLines ?? []).filter(
    (l) => inspectLeyLine(state, l).status !== 'destroyed',
  );
  if (
    lines.some(
      (l) =>
        (l.fromHoldingId === a.id && l.toHoldingId === b.id) ||
        (l.fromHoldingId === b.id && l.toHoldingId === a.id),
    )
  )
    return 'These sources already have a ley line.';
  if (lines.filter((l) => l.fromHoldingId === a.id).length >= 3)
    return 'The origin source has filled its three original outgoing ley slots.';
  if (!provincePath(scenario, a.provinceId, b.provinceId))
    return 'No path exists in the original directed province geography.';
  return null;
}
