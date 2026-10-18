import type { Campaign } from './schema';
import { randomInt } from './random';
import { compareIds } from './order';

/** MAPAI::DoNPCAdmin chooses a seasonal order, reused by all three action rounds. */
export function initializeDomainTurn(state: Campaign, preserveOpening = false, round = 1) {
  const order = state.realms
    .filter((r) => r.id === state.playerRealm || (!r.eliminated && r.controller !== 'passive'))
    .map((r) => r.id)
    .sort(compareIds);
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(state, 0, i);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  // Preserve the pristine imported opening and a legacy save's remaining action budget.
  if (preserveOpening) {
    const i = order.indexOf(state.playerRealm);
    order.push(...order.splice(0, i));
  }
  state.domainTurn = { round, order, cursor: 0 };
}
