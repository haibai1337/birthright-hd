import { expect, it } from 'vitest';
import {
  applyCommand,
  campaignSchema,
  createCampaign,
  validateStateReferences,
  type Campaign,
} from '../packages/core';
import { developmentScenario as scenario } from '../packages/world-data';
import { planNextAI } from '../packages/core/ai';
function simulate(seed: number, player: string): Campaign {
  let s = createCampaign(scenario, player, seed);
  for (let turns = 0; turns < 20 && s.outcome === 'ongoing'; turns++) {
    // A bot uses exactly the same player-facing commands, exercising military and economics.
    for (let steps = 0; steps < 6; steps++) {
      const plan = planNextAI(s, scenario, player);
      if (!plan) break;
      const r = applyCommand(s, scenario, player, plan.command);
      if (!r.ok) throw new Error(r.error.code);
      s = r.state;
      if (s.outcome !== 'ongoing') break;
    }
    if (s.outcome !== 'ongoing') break;
    const result = applyCommand(s, scenario, player, { type: 'EndTurn' });
    if (!result.ok) throw new Error(result.error.code);
    s = result.state;
    expect(campaignSchema.safeParse(s).success).toBe(true);
    validateStateReferences(s, scenario);
  }
  return s;
}
const cases = scenario.realms.flatMap((realm) =>
  Array.from({ length: 12 }, (_, seed) => ({ player: realm.id, seed })),
);
it.each(cases)(
  'reproduces a complete campaign for $player with seed $seed',
  ({ player, seed }) => {
    const a = simulate(seed, player),
      b = simulate(seed, player);
    expect(a).toEqual(b);
    expect(a.outcome).not.toBe('ongoing');
    expect(a.history.some((h) => h.source === 'ai' && h.actor !== player)).toBe(true);
    expect(a.realms.every((r) => r.treasury >= 0 && r.regency >= 0)).toBe(true);
  },
  20000,
);
