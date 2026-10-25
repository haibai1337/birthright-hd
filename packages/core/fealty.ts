import { rulingRegent } from './regents';
import type { Campaign, Command, Scenario, Report } from './schema';

type FealtyIdentity = Pick<Campaign['treaties'][number], 'a' | 'b' | 'kind' | 'vassal'>;
type Domains = {
  playerRealm: string;
  realms: ReadonlyArray<Pick<Campaign['realms'][number], 'id' | 'eliminated' | 'controller'>>;
  treaties: readonly FealtyIdentity[];
};
export function fealtyTo<T extends FealtyIdentity>(
  state: { treaties: readonly T[] },
  vassal: string,
) {
  const t = state.treaties.find((t) => t.kind === 'vassal' && t.vassal === vassal);
  return t ? { treaty: t, liege: t.a === vassal ? t.b : t.a } : null;
}
/** ACTNMENU's non-landed branch: holdings join the liege and the regent becomes a lieutenant. */
export function assimilateNonLanded(
  state: Campaign,
  scenario: Scenario,
  liege: string,
  domain: string,
  offeredSalary?: number,
) {
  const definition = scenario.realms.find((r) => r.id === domain);
  if (definition?.domainType !== 'holding') return;
  // Require the recovered non-landed identity used by the original >=69 scan.
  const regent = scenario.regents
    ?.filter(
      (r) =>
        r.original?.realmIndex === definition.original?.index &&
        typeof r.original?.index === 'number' &&
        r.original.index >= 69,
    )
    .at(-1);
  if (!regent) return;
  const location =
    state.characters?.find(
      (c) => c.realmId === liege && c.regentId === rulingRegent(scenario, liege, state)?.id,
    )?.provinceId ??
    state.provinces.find((p) => p.owner === liege)?.id ??
    state.holdings.find((h) => h.realmId === liege && !h.destroyed)?.provinceId;
  if (!location) return;
  state.characters ??= [];
  let deployment = state.characters.find((c) => c.regentId === regent.id);
  if (!deployment) {
    // A new runtime deployment has no original packed troop word; 0 is an unused sentinel.
    // The verified regent/sourceId supplies identity; no native type code is invented.
    deployment = {
      id: `character-${state.nextId++}`,
      sourceId: regent.id,
      regentId: regent.id,
      realmId: liege,
      provinceId: location,
      typeCode: 0,
    };
    state.characters.push(deployment);
  }
  deployment.realmId = liege;
  deployment.provinceId = location;
  deployment.role = 'lieutenant';
  deployment.originRealm = domain;
  deployment.salary = offeredSalary ?? 0;
  for (const h of state.holdings) if (h.realmId === domain) h.realmId = liege;
  for (const f of state.fortifications ?? []) if (f.realmId === domain) f.realmId = liege;
  for (const p of state.ports ?? []) if (p.realmId === domain) p.realmId = liege;
  for (const l of state.leyLines ?? []) if (l.realmId === domain) l.realmId = liege;
  for (const t of state.tradeRoutes) if (t.realmId === domain) t.realmId = liege;
  const original = state.realms.find((r) => r.id === domain)!;
  original.lieutenantOf = liege;
  original.controller = 'passive';
  original.actions = 0;
  if (offeredSalary !== undefined)
    state.tributes = state.tributes?.filter((t) => t.payer !== domain && t.recipient !== domain);
  state.log.push({
    code: 'fealty.assimilated',
    turn: state.turn,
    realmId: liege,
    data: { target: domain, regent: regent.name, salary: deployment.salary },
  });
}
/** Native landed fealty enables PlayerCtrl; assimilated lieutenant domains have no own slot. */
export function playerControls(state: Domains, scenario: Scenario, realm: string): boolean {
  const seen = new Set<string>();
  let id = realm;
  while (!seen.has(id)) {
    if (id === state.playerRealm) return true;
    seen.add(id);
    const r = state.realms.find((r) => r.id === id),
      def = scenario.realms.find((r) => r.id === id);
    if (!r || r.eliminated || r.controller === 'passive' || def?.domainType !== 'territorial')
      return false;
    const f = fealtyTo(state, id);
    if (!f) return false;
    id = f.liege;
  }
  return false;
}
export function commandRealm(state: Campaign, scenario: Scenario): string {
  const p = state.pendingDomainAction;
  if (p) return p.responseRealm ?? (p.stage === 'counter' ? p.actor : state.playerRealm);
  const current = state.domainTurn?.order[state.domainTurn.cursor];
  return current && playerControls(state, scenario, current) ? current : state.playerRealm;
}
export function fealtyProblem(state: Campaign, actor: string, cmd: Command): string | null {
  if (cmd.type !== 'SetFealtyRegency' && cmd.type !== 'DonateFealtyRegency') return null;
  const f = fealtyTo(state, actor);
  if (!f) return 'Only a vassal may pledge or donate RP to its current liege.';
  const recipient = state.realms.find((r) => r.id === f.liege),
    payer = state.realms.find((r) => r.id === actor)!;
  if (!recipient || recipient.eliminated) return 'The liege is no longer an active domain.';
  if (
    cmd.type === 'DonateFealtyRegency' &&
    (payer.regency < cmd.amount || recipient.regency + cmd.amount > 65535)
  )
    return 'The donation must fit both the vassal reserve and the liege RP capacity of 65,535.';
  return null;
}
export function applyFealtyOrder(state: Campaign, actor: string, cmd: Command) {
  if (cmd.type !== 'SetFealtyRegency' && cmd.type !== 'DonateFealtyRegency') return;
  const f = fealtyTo(state, actor)!;
  if (cmd.type === 'SetFealtyRegency') f.treaty.regencyPledge = cmd.amount;
  else {
    state.realms.find((r) => r.id === actor)!.regency -= cmd.amount;
    state.realms.find((r) => r.id === f.liege)!.regency += cmd.amount;
  }
  state.log.push({
    code: cmd.type === 'SetFealtyRegency' ? 'fealty.pledge' : 'fealty.donated',
    turn: state.turn,
    realmId: actor,
    data: { target: f.liege, regency: cmd.amount },
  });
}
/** Fixed RP amounts are an explicit HD compatibility pledge, never a fabricated native rate. */
export function settleFealtyRegency(state: Campaign, reports: Map<string, Report>) {
  const reserved = new Map(state.realms.map((r) => [r.id, r.regency]));
  for (const t of [...state.treaties]
    .filter((t) => t.kind === 'vassal' && t.vassal && t.regencyPledge)
    .sort((a, b) => a.vassal!.localeCompare(b.vassal!))) {
    const payer = state.realms.find((r) => r.id === t.vassal),
      liege = state.realms.find((r) => r.id === (t.a === t.vassal ? t.b : t.a));
    if (
      !payer ||
      !liege ||
      payer.eliminated ||
      liege.eliminated ||
      !reports.has(payer.id) ||
      !reports.has(liege.id)
    )
      continue;
    const paid = Math.min(
      t.regencyPledge!,
      reserved.get(payer.id) ?? 0,
      Math.max(0, 65535 - liege.regency),
    );
    reserved.set(payer.id, (reserved.get(payer.id) ?? 0) - paid);
    payer.regency -= paid;
    liege.regency += paid;
    const a = reports.get(payer.id)!,
      b = reports.get(liege.id)!;
    a.regencyTributeOut = (a.regencyTributeOut ?? 0) + paid;
    b.regencyTributeIn = (b.regencyTributeIn ?? 0) + paid;
    state.log.push({
      code: 'fealty.settled',
      turn: state.turn,
      realmId: payer.id,
      data: { target: liege.id, regency: paid, pledged: t.regencyPledge! },
    });
  }
}
