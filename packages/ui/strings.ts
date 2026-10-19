import type { Campaign, CampaignEventOptions, LogEntry, Scenario } from '../core/schema';
export const campaignAccessStrings = {
  title: 'Campaign Access',
  selection: 'Unlock all landed domains',
  selectionDescription:
    'Choose any landed realm, including Anuire, Mur-Kilad, Thurazor and the Gorgon’s Crown. Applies to new campaigns; your current ruler stays the same.',
  diplomacy: 'Unrestricted diplomacy',
  diplomacyDescription:
    'Negotiate with every active domain regardless of faction, reaction or court. Costs, success rolls and valid treaty terms still apply.',
  note: 'These independent HD options default to Off. Campaign saves preserve both choices; switching them off never undoes existing treaties.',
  originalSelection: 'Original faction selection',
  openSelection: 'All landed domains unlocked',
};
// English is the existing application language; keep new copy in this shared string catalogue.
export const campaignEventStrings = {
  title: 'Campaign Events',
  random: 'Random Events',
  special: 'Special Campaign Events',
  allOn: 'All On',
  allOff: 'All Off',
  difficulty: 'Campaign difficulty',
  timing:
    'Changes apply at the next eligible season. Existing effects and story progress are preserved.',
  saved: 'Event choices and difficulty belong to this campaign save.',
  defaults: 'These choices apply to your next new campaign.',
};
export const campaignEventLabels: Record<
  keyof CampaignEventOptions,
  { label: string; description: string }
> = {
  economicEvents: {
    label: 'Economic Events',
    description: 'Random aid for the Gorgon, Markazor, Mur-Kilad, Rhuobhe and the Spider.',
  },
  magicalEvents: {
    label: 'Magical Events',
    description: 'Bless, Blight, Warding, Honest Dealing and Dispel.',
  },
  militaryEvents: {
    label: 'Military Events',
    description: 'Random monster and mercenary units across Anuire.',
  },
  randomRebellions: {
    label: 'Random Rebellions',
    description: 'Random loyalty shocks. Ordinary loyalty rebellions still occur.',
  },
  gorgonPlot: {
    label: 'Gorgon Plot',
    description: 'The three-stage story and realm takeover. Turning off pauses progress.',
  },
  specialReinforcements: {
    label: 'Special Reinforcements',
    description: 'Scheduled troops for the Gorgon, Five Peaks, Spiderfell and Rhuobhe.',
  },
  diplomaticEvents: {
    label: 'Diplomatic Events',
    description: 'Random reaction changes. Diplomacy actions and treaty rules remain active.',
  },
  treasuryIncidents: {
    label: 'Treasury Incidents',
    description: 'Legacy parties, theft and embezzlement above 5,000 GB. Off by default.',
  },
};
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
export const domainActionNames: Record<string, string> = {
  DevelopProvince: 'Rule Province',
  ImproveHolding: 'Rule Holding',
  RuleHoldings: 'Rule Holdings',
  CreateHolding: 'Create Holding',
  ContestHolding: 'Contest Holding',
  Agitate: 'Agitate',
  CreateTradeRoute: 'Create Trade Route',
  ForgeLeyLine: 'Forge Ley Line',
};
export function season(turn: number) {
  return `${['Spring', 'Summer', 'Autumn', 'Winter'][(turn - 1) % 4]} · Year ${1 + Math.floor((turn - 1) / 4)}`;
}
export function signed(n: number) {
  return `${n >= 0 ? '+' : ''}${Number(n.toFixed(2))}`;
}
export function logText(
  entry: LogEntry,
  scenario: Scenario,
  eventReports?: Record<string, string>,
): string {
  const d = entry.data;
  const province =
    scenario.provinces.find((p) => p.id === d.province)?.name ?? String(d.province ?? '');
  const realm = scenario.realms.find((r) => r.id === entry.realmId)?.name ?? entry.realmId;
  const target = scenario.realms.find((r) => r.id === d.target)?.name ?? String(d.target ?? '');
  const template = typeof d.eventId === 'number' ? eventReports?.[String(d.eventId)] : undefined;
  if (template) {
    const args =
      Number(d.eventId) >= 9 && Number(d.eventId) <= 16 ? [target, province] : [province];
    let index = 0;
    return template.replace(/%s/g, () => args[index++] ?? '').replace(/\^[A-Z]\d+/g, '');
  }
  switch (entry.code) {
    case 'event.gorgon-plot':
      return `The Gorgon’s plot advances: chapter ${d.stage} of 3.`;
    case 'event.diplomacy':
      return `${target}: relations have changed to ${d.kind}.`;
    case 'event.treasury-incident':
      return `${realm}: ${d.kind} costs the treasury ${d.gold} GB.`;
    case 'magic.cast':
      return `${realm} cast ${scenario.spells.find((s) => s.id === d.spell)?.name ?? d.spell} at ${province}: ${d.gold} GB and ${d.regency} RP.`;
    case 'bloodline.increased':
      return `${realm} raised bloodline strength to ${d.strength}.`;
    case 'campaign.started':
      return `The council is assembled. ${realm} begins its rule.`;
    case 'domain.action': {
      const result = d.success
        ? d.destroyed
          ? 'holding destroyed'
          : d.contested
            ? 'holding contested'
            : 'succeeded'
        : 'failed';
      return `${realm}: ${domainActionNames[String(d.action)] ?? d.action} in ${province} ${result} (d20 ${d.roll}, required ${d.threshold}; ${d.opposition} RP opposition).`;
    }
    case 'domain.opposition':
      return `${realm} commits ${d.regency} RP opposing ${target}'s action in ${province}.`;
    case 'domain.counterbid':
      return `${realm} counters with ${d.regency} additional RP in ${province}.`;
    case 'domain.round':
      return `Domain action round ${d.round} of 3 begins.`;
    case 'domain.held':
      return `${realm} holds its action and yields this round.`;
    case 'save.domain-rounds-upgraded':
      return `Legacy save upgraded to domain rounds with ${d.remaining} actions remaining; completed actions and original records are preserved.`;
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
      return `${target} declines the ${d.kind} proposal.`;
    case 'treaty.broken':
      return `${realm} renounces its agreement with ${target}; passage and reciprocal tribute end.`;
    case 'fealty.pledge':
      return `${realm} pledges ${d.regency} RP/season to ${target} (HD compatibility pledge).`;
    case 'fealty.donated':
      return `${realm} donates ${d.regency} RP to ${target}.`;
    case 'fealty.settled':
      return `${realm} pays ${d.regency} of ${d.pledged} pledged RP to ${target}.`;
    case 'fealty.assimilated':
      return `${d.regent} of ${target} joins ${realm} as a lieutenant; holdings transfer, salary ${d.salary} GB/season.`;
    case 'event.antimagic':
      return `An antimagic ward protects ${province} for three seasonal boundaries; realm spells cost +${d.regency} RP.`;
    case 'unit.mutinied':
      return `${realm}'s unpaid mercenaries in ${province} join ${target}; the original unit survives as a raider.`;
    case 'unit.disbanded':
      return `${realm} disbands ${d.unit} at ${province}.`;
    case 'fort.construction':
      return `${realm} spends ${d.gold} GB building in ${province}: fort ${d.level}, target ${d.target}, progress ${d.progress}/8 GB.`;
    case 'event.npc-aid':
      return `${realm} receives ${d.gold} GB of original campaign reinforcement funding.`;
    case 'event.realm-magic':
      return `A magical event places ${d.spell} on ${province}.`;
    case 'event.rebellion':
      return d.eventId === 17
        ? `${province} rebels. Loyalty has fallen to zero.`
        : `${province} rebels. Loyalty is zero and political control is contested; tax collection stops.`;
    case 'event.raiders':
      return `${target} raises raiders in ${province}.`;
    case 'event.unresolved':
      return `Original event ${d.event} in ${province}: ${d.reason}`;
    case 'army.moved':
      return `${realm} troops march to ${province}.`;
    case 'province.occupied':
      return `${realm} occupies ${province}. Legitimate sovereign: ${target}. Maintain a garrison for investiture.`;
    case 'occupation.ended':
      return `${realm} abandons occupation of ${province}; control returns to ${target}.`;
    case 'occupation.prepared':
      return `${province} has maintained its garrison across the season and can be invested.`;
    case 'province.liberated':
      return `${realm} liberates ${province}.`;
    case 'province.invested':
      return `${realm} gains sovereignty over ${province} from ${target} (d20 ${d.roll} ≥ ${d.threshold}). Independent holdings retain their owners.`;
    case 'investiture.failed':
      return `Investiture of ${province} fails (d20 ${d.roll} < ${d.threshold}). Costs were spent; occupation continues.`;
    case 'fort.besieged':
      return `${realm}'s siege reduces ${target}'s fort in ${province} to level ${d.level}.`;
    case 'army.retreated':
      return `${realm}'s survivors retreat from ${province} to ${scenario.provinces.find((p) => p.id === d.destination)?.name}.`;
    case 'army.trapped':
      return `${realm}'s survivors at ${province} are lost: no safe retreat.`;
    case 'province.pillaged':
      return `${realm} pillages ${province} for ${d.gold} GB. Province falls to level ${d.level}; loyalty and holdings suffer.`;
    case 'save.warfare-upgraded':
      return 'Legacy save upgraded: reciprocal wars preserved. Occupations must cross a new season boundary to qualify for investiture.';
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
      return (
        `${realm}: ${signed(Number(d.net))} GB net; +${d.regency} RP collected.` +
        (d.taxes === undefined
          ? ''
          : ` Tax ${d.taxes}, holdings ${d.holdings}, trade ${d.trade}, claims ${d.claims}; tribute +${d.tributeIn}/−${d.tributeOut}; administration/court/forts/occupation ${d.maintenance}, army ${d.military} GB + ${d.regencyUpkeep} RP; unpaid ${d.unpaid} GB.`)
      );
    case 'economy.action-paid':
      return `${realm} paid ${d.gold} GB and ${d.regency} RP for ${d.action}.`;
    case 'gold.transferred':
      return `${realm} gave ${d.amount} GB to ${target}.`;
    case 'tribute.changed':
      return `${realm} pledges ${d.amount} GB/season to ${target} (zero ends the pledge).`;
    case 'tribute.shortfall':
      return `${realm} paid ${d.paid} of ${d.amount} GB tribute to ${target}.`;
    case 'court.changed':
      return `${realm} changed court to level ${d.level}.`;
    case 'claims.changed':
      return `${realm}: Law Claims ${d.enabled ? 'enabled (approximation)' : 'disabled'}.`;
    case 'trade.ended':
      return `${realm} ended trade from ${province}.`;
    case 'road.built':
      return `${realm} built a road from ${province} to ${scenario.provinces.find((p) => p.id === d.target)?.name ?? d.target}.`;
    case 'unit.unpaid':
      return `${realm}: an unpaid ${d.unit} unit at ${province} disbanded.`;
    case 'economy.bankrupt':
      return `${realm} cannot cover ${d.deficit} GB of compulsory domain/occupation costs and becomes insolvent.`;
    case 'turn.started':
      return `The ${season(Number(d.turn)).toLowerCase()} council begins.`;
    case 'realm.eliminated':
      return `${realm} has lost its remaining domain assets.`;
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
      e.code === 'province.invested' ||
      (e.code.startsWith('fealty.') && e.data.target === state.playerRealm) ||
      (e.code.startsWith('domain.') && e.data.target === state.playerRealm) ||
      (e.data.target === state.playerRealm &&
        ['province.occupied', 'fort.besieged', 'province.pillaged'].includes(e.code)) ||
      e.code.startsWith('battle.'),
  );
}
