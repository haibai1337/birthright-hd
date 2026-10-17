import { expect, it } from 'vitest';
import {
  applyCommand,
  createCampaign,
  insideProvince,
  realmSelectable,
  validateScenario,
} from '../packages/core';
import { developmentScenario } from './fixtures/scenario';
it('separates original flags, technical support, configurable overrides and future unrestricted mode', () => {
  const s = structuredClone(developmentScenario),
    r = s.realms[0]!;
  r.originalPlayable = false;
  r.technicalPlayable = true;
  expect(realmSelectable(s, r.id, 'CLASSIC')).toBe(false);
  expect(() => createCampaign(s, r.id)).toThrow('selection');
  expect(createCampaign(s, r.id, 1, 'ENHANCED', 'UNRESTRICTED').playerRealm).toBe(r.id);
  s.selection = { mode: 'CLASSIC', overrides: { [r.id]: true } };
  expect(realmSelectable(s, r.id)).toBe(true);
  expect(r.originalPlayable).toBe(false);
  r.technicalPlayable = false;
  expect(realmSelectable(s, r.id, 'UNRESTRICTED')).toBe(false);
});
it('keeps holding-only domains alive with a victory metric independent of territory', () => {
  const s = structuredClone(developmentScenario),
    id = s.realms[2]!.id;
  for (const p of s.initial.provinces) if (p.owner === id) p.owner = s.realms[0]!.id;
  s.policy!.survival = 'domain-assets';
  s.victory = { provinces: 100, turns: 20, metric: 'holding-levels', target: 100 };
  const scenario = validateScenario(s),
    result = applyCommand(createCampaign(scenario, id, 17), scenario, id, { type: 'EndTurn' });
  expect(result.ok).toBe(true);
  expect(result.state.realms.find((r) => r.id === id)?.eliminated).toBe(false);
  expect(result.state.holdings.some((h) => h.realmId === id)).toBe(true);
});
it('supports directed borders, disjoint islands and holes', () => {
  const s = structuredClone(developmentScenario),
    p = s.provinces[0]!,
    neighbor = s.provinces.find((n) => n.id === p.adjacent[0])!;
  neighbor.adjacent = neighbor.adjacent.filter((id) => id !== p.id);
  expect(() => validateScenario(s)).toThrow('Asymmetric');
  s.policy!.directedBorders = true;
  expect(() => validateScenario(s)).not.toThrow();
  p.rings = [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ],
    [
      [2, 2],
      [2, 4],
      [4, 4],
      [4, 2],
    ],
    [
      [20, 0],
      [24, 0],
      [24, 4],
      [20, 4],
    ],
  ];
  expect(insideProvince(1, 1, p)).toBe(true);
  expect(insideProvince(3, 3, p)).toBe(false);
  expect(insideProvince(22, 2, p)).toBe(true);
  expect(insideProvince(15, 2, p)).toBe(false);
});
