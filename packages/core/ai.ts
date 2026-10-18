import type { Campaign, Command, Scenario } from './schema';
import { armyPower, forecast, relation, treatyAcceptance } from './selectors';
import { validateCommand } from './validation';
import { compareIds } from './order';
import { provinceController } from './domains';
import { mayInvade } from './warfare';
import { domainActionQuote, holdingInfluence, usesPCDomainActions } from './domain-actions';
import { commandCost } from './validation';
import { tradeProblem } from './trade';
import { magicProblem, hasMagicEffect } from './realm-magic';
import { availableSource, leyLineProblem } from './ley-lines';
import { isTrueWizard } from './bloodlines';
export interface AIPlan {
  command: Command;
  reason:
    | 'relief'
    | 'defend'
    | 'invade'
    | 'invest'
    | 'recruit'
    | 'diplomacy'
    | 'develop'
    | 'holding'
    | 'fortify'
    | 'contest'
    | 'agitate'
    | 'trade'
    | 'magic'
    | 'ley';
}
export function planNextAI(state: Campaign, scenario: Scenario, actor: string): AIPlan | null {
  const candidates: AIPlan[] = [];
  const realm = state.realms.find((r) => r.id === actor);
  if (!realm || realm.eliminated || realm.controller === 'passive') return null;
  if (realm.actions === 0 && !state.pendingEvents.some((e) => e.realmId === actor)) return null;
  if (state.pendingEvents.some((e) => e.realmId === actor))
    candidates.push({
      command: { type: 'ResolveEvent', choice: realm.treasury >= 4 ? 'relief' : 'decline' },
      reason: 'relief',
    });
  if (usesPCDomainActions(scenario)) {
    for (const h of state.holdings.filter(
      (h) => h.realmId === actor && h.contested && !h.destroyed,
    ))
      candidates.push({ command: { type: 'ImproveHolding', holdingId: h.id }, reason: 'holding' });
    for (const h of state.holdings.filter((h) => h.realmId !== actor && !h.destroyed)) {
      if (
        holdingInfluence(state, h.provinceId, actor) >= 0 &&
        relation(state, actor, h.realmId)?.kind === 'war'
      )
        candidates.push({
          command: { type: 'ContestHolding', holdingId: h.id },
          reason: 'contest',
        });
    }
    if (
      scenario.realms.find((r) => r.id === actor)?.regent.class === 'priest' &&
      realm.freeAgitateUsedTurn !== state.turn
    )
      for (const p of state.provinces.filter((p) => p.owner === actor && p.loyalty < 3))
        candidates.push({
          command: { type: 'Agitate', targets: [{ provinceId: p.id, direction: 'raise' }] },
          reason: 'agitate',
        });
  }
  const owned = state.provinces
    .filter((p) => p.owner === actor && provinceController(p) === actor)
    .sort((a, b) => compareIds(a.id, b.id));
  const armies = state.armies
    .filter((a) => a.realmId === actor)
    .sort((a, b) => compareIds(a.id, b.id));
  for (const p of state.provinces.filter((p) => p.occupiedBy === actor))
    candidates.push({ command: { type: 'InvestProvince', provinceId: p.id }, reason: 'invest' });
  for (const army of armies) {
    // Keep the necessary garrison in place; advanced siege strategy belongs to M1D.
    if (state.provinces.some((p) => p.id === army.provinceId && p.occupiedBy === actor)) continue;
    const here = scenario.provinces.find((p) => p.id === army.provinceId);
    for (const next of [...(here?.adjacent ?? [])].sort()) {
      const province = state.provinces.find((p) => p.id === next);
      if (!province) continue;
      if (
        provinceController(province) !== actor &&
        (province.owner === actor || mayInvade(state, actor, provinceController(province)))
      ) {
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
      if (provinceController(province) === actor) {
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
  if (usesPCDomainActions(scenario)) {
    for (const h of state.holdings.filter(
      (h) =>
        h.realmId === actor &&
        !h.contested &&
        !h.destroyed &&
        ['source', 'temple'].includes(h.type),
    )) {
      const p = state.provinces.find((p) => p.id === h.provinceId)!;
      const commands: Command[] = [];
      if (h.type === 'temple' && !hasMagicEffect(state, p.id, 'bless-land'))
        commands.push({ type: 'CastRealmSpell', spellId: 'bless-land', provinceId: p.id });
      if (h.type === 'source' && p.loyalty < 3 && p.owner === actor)
        commands.push({
          type: 'CastRealmSpell',
          spellId: 'demagogue',
          provinceId: p.id,
          direction: 'raise',
        });
      if (h.type === 'source' && realm.treasury < 8 && realm.regency >= 5)
        commands.push({ type: 'CastRealmSpell', spellId: 'alchemy', provinceId: p.id, amount: 5 });
      for (const command of commands)
        if (command.type === 'CastRealmSpell' && !magicProblem(state, scenario, actor, command)) {
          candidates.push({ command, reason: 'magic' });
          break;
        }
      if (commands.length && candidates.some((c) => c.reason === 'magic')) break;
    }
    if (isTrueWizard(scenario, actor)) {
      const sources = state.holdings
        .filter((h) => h.realmId === actor && h.type === 'source' && !h.contested && !h.destroyed)
        .sort((a, b) => b.level - a.level || compareIds(a.id, b.id));
      const origin = sources[0];
      if (origin)
        for (const h of sources.slice(1)) {
          const command: Command = {
            type: 'ForgeLeyLine',
            fromHoldingId: origin.id,
            toHoldingId: h.id,
          };
          if (
            availableSource(state, actor, h.provinceId) < origin.level &&
            !leyLineProblem(state, scenario, actor, command)
          ) {
            candidates.push({ command, reason: 'ley' });
            break;
          }
        }
    }
  }
  const tradeOwners = new Set([
    actor,
    ...state.treaties
      .filter((t) => t.kind === 'alliance' && (t.a === actor || t.b === actor))
      .map((t) => (t.a === actor ? t.b : t.a)),
  ]);
  if (
    usesPCDomainActions(scenario) &&
    realm.treasury >= 2 &&
    state.provinces.some((p) => tradeOwners.has(p.owner))
  ) {
    for (const h of state.holdings.filter(
      (h) => h.realmId === actor && h.type === 'guild' && !h.contested && !h.destroyed,
    )) {
      const destination = scenario.provinces.find(
        (p) =>
          tradeOwners.has(state.provinces.find((d) => d.id === p.id)!.owner) &&
          !tradeProblem(state, scenario, actor, {
            type: 'CreateTradeRoute',
            guildId: h.id,
            destination: p.id,
          }),
      );
      if (destination)
        candidates.push({
          command: { type: 'CreateTradeRoute', guildId: h.id, destination: destination.id },
          reason: 'trade',
        });
      if (destination) break;
    }
  }
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
        command: {
          type: 'RecruitUnit',
          provinceId: p.id,
          unitType:
            scenario.units.find((u) => u.id === 'infantry' && u.recruitable !== false)?.id ??
            scenario.units.find((u) => u.recruitable !== false)?.id ??
            'infantry',
        },
        reason: 'recruit',
      });
  }
  if (state.turn % 3 === 0)
    for (const other of state.realms
      .filter((r) => r.id !== actor && !r.eliminated && r.controller !== 'passive')
      .sort((a, b) => compareIds(a.id, b.id))) {
      const current = relation(state, actor, other.id);
      const kind =
        current?.kind === 'war'
          ? 'peace'
          : (current?.kind ?? 'peace') === 'peace'
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
  for (const h of state.holdings.filter((h) => h.realmId === actor && !h.destroyed))
    candidates.push({ command: { type: 'ImproveHolding', holdingId: h.id }, reason: 'holding' });
  if (usesPCDomainActions(scenario)) {
    const cls = scenario.realms.find((r) => r.id === actor)?.regent.class;
    const type =
      cls === 'wizard' ? 'source' : cls === 'priest' ? 'temple' : cls === 'rogue' ? 'guild' : 'law';
    const footholds = [
      ...new Set([
        ...owned.map((p) => p.id),
        ...state.holdings
          .filter((h) => h.realmId === actor && !h.destroyed)
          .map((h) => h.provinceId),
      ]),
    ].sort(compareIds);
    for (const provinceId of footholds)
      candidates.push({
        command: { type: 'CreateHolding', provinceId, holdingType: type },
        reason: 'holding',
      });
  }
  if (realm.treasury >= 12)
    for (const p of owned)
      candidates.push({ command: { type: 'Fortify', provinceId: p.id }, reason: 'fortify' });
  return (
    candidates.find((p) => {
      if (validateCommand(state, scenario, actor, p.command)) return false;
      const cost = commandCost(state, scenario, p.command, actor);
      if (
        !['relief', 'invest', 'defend'].includes(p.reason) &&
        cost.gold > 0 &&
        realm.treasury - cost.gold < Math.max(0, -budget.net)
      )
        return false;
      const quote = usesPCDomainActions(scenario)
        ? domainActionQuote(state, scenario, actor, p.command)
        : null;
      return !quote || quote.checks.some((c) => c.threshold <= 20);
    }) ?? null
  );
}
