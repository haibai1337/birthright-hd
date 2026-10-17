import type { Campaign, LogEntry, Scenario } from '../core/schema';
import type { ErrorCode } from '../core/validation';
export const errors: Record<ErrorCode, string> = {
  INVALID_COMMAND: 'This order is malformed.',
  UNKNOWN_REALM: 'This realm is no longer active.',
  UNKNOWN_PROVINCE: 'This province is unavailable.',
  NOT_OWNER: 'You do not control this asset.',
  NO_ACTIONS: 'No domain actions remain. End the season to renew them.',
  GOLD: 'Your treasury cannot cover this order.',
  REGENCY: 'You need more Regency Points.',
  MAX_LEVEL: 'This asset has reached its current capacity.',
  INVALID_TARGET: 'Choose another target.',
  NOT_ADJACENT: 'Armies can move only to adjacent provinces.',
  ALREADY_MOVED: 'This army has already marched this season.',
  TREATY_REQUIRED: 'Declare war or secure an alliance before crossing this border.',
  TERRAIN: 'Cavalry cannot cross the mountain passes.',
  PREREQUISITE: 'The prerequisites for this order are not met.',
  PENDING_EVENT: 'Resolve the petition before issuing another order.',
  GAME_OVER: 'This campaign has ended.',
};
export const loyaltyNames = ['Rebellious', 'Restless', 'Content', 'Loyal', 'Devoted'];
export function season(turn: number) {
  return `${['Spring', 'Summer', 'Autumn', 'Winter'][(turn - 1) % 4]} · Year ${1 + Math.floor((turn - 1) / 4)}`;
}
export function signed(n: number) {
  return `${n >= 0 ? '+' : ''}${n}`;
}
export function logText(entry: LogEntry, scenario: Scenario): string {
  const d = entry.data;
  const province =
    scenario.provinces.find((p) => p.id === d.province)?.name ?? String(d.province ?? '');
  const realm = scenario.realms.find((r) => r.id === entry.realmId)?.name ?? entry.realmId;
  const target = scenario.realms.find((r) => r.id === d.target)?.name ?? String(d.target ?? '');
  switch (entry.code) {
    case 'campaign.started':
      return `The council is assembled. ${realm} begins its rule.`;
    case 'province.developed':
      return `${province} develops to level ${d.level}. Its magical potential recedes.`;
    case 'unit.recruited':
      return `${scenario.units.find((u) => u.id === d.unit)?.name ?? d.unit} mustered in ${province}.`;
    case 'tax.changed':
      return `${province} adopts ${d.tax} taxation.`;
    case 'province.fortified':
      return `The defenses of ${province} are strengthened.`;
    case 'holding.improved':
      return 'A holding grows in influence.';
    case 'treaty.accepted':
      return d.kind === 'war'
        ? `${realm} declares war on ${target}.`
        : `${target} accepts a treaty of ${d.kind} with ${realm}.`;
    case 'treaty.rejected':
      return `${target} declines the ${d.kind} proposal. Relations improve by 5.`;
    case 'army.moved':
      return `${realm} troops march to ${province}.`;
    case 'battle.won':
      return `${realm} wins at ${province} (${d.attack} against ${d.defense}).`;
    case 'battle.lost':
      return `${realm} loses at ${province} (${d.attack} against ${d.defense}).`;
    case 'spell.cast':
      return `${province} is protected by Warden’s Aegis.`;
    case 'event.resolved':
      return d.choice === 'relief'
        ? `Relief reaches the people of ${province}. Loyalty improves.`
        : `The petition from ${province} is declined. Loyalty falls.`;
    case 'event.harvest':
      return `A plentiful harvest adds 3 GB to ${realm}’s treasury.`;
    case 'event.quiet':
      return `A quiet season in ${province}. The realm holds steady.`;
    case 'event.petition':
      return `The people of ${province} petition their regent for relief.`;
    case 'event.unrest':
      return `Unrest in ${province} costs 1 GB and one grade of loyalty.`;
    case 'economy.shortfall':
      return `${realm} faces a ${d.deficit} GB shortfall. Unpaid troops disband and loyalty falls.`;
    case 'economy.collected':
      return `${realm}: ${signed(Number(d.net))} GB net; +${d.regency} RP collected.`;
    case 'turn.started':
      return `The ${season(Number(d.turn)).toLowerCase()} council begins.`;
    case 'realm.eliminated':
      return `${realm} has lost its final province.`;
    case 'ai.action':
      return `${realm} chooses ${d.action} to ${d.reason}.`;
    default:
      return entry.code;
  }
}
export function playerJournal(state: Campaign) {
  return state.log.filter(
    (e) =>
      e.realmId === state.playerRealm ||
      e.code.startsWith('treaty.') ||
      e.code === 'realm.eliminated' ||
      e.code.startsWith('battle.'),
  );
}
