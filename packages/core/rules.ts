import type { RulesetId } from './schema';
export interface Ruleset {
  id: RulesetId;
  actions: number;
  developmentGold: number;
  developmentRegency: number;
  fortCost: number;
  diplomacyGold: number;
  diplomacyRegency: number;
  provinceMaintenance: number;
  holdingIncomeDivisor: number;
  warExpires: boolean;
  terrainDefense: Record<string, number>;
  tax: Record<'light' | 'moderate' | 'severe', readonly (readonly [number, number])[]>;
  loyaltyDelta: Record<'light' | 'moderate' | 'severe', number>;
  wardPower: number;
}
// Tax ranges: supplied CD RULES.TXT, section 126. Other numerical balance is provisional.
const taxes: Ruleset['tax'] = {
  light: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
    [2, 5],
    [2, 7],
    [2, 9],
    [2, 11],
    [2, 13],
    [2, 16],
  ],
  moderate: [
    [0, 0],
    [0, 2],
    [1, 3],
    [1, 4],
    [2, 5],
    [2, 7],
    [2, 9],
    [2, 11],
    [2, 13],
    [2, 16],
    [4, 18],
  ],
  severe: [
    [0, 1],
    [1, 3],
    [1, 4],
    [2, 5],
    [2, 7],
    [2, 9],
    [2, 11],
    [2, 13],
    [2, 16],
    [4, 18],
    [4, 22],
  ],
};
const common = {
  actions: 3,
  developmentGold: 2,
  developmentRegency: 1,
  fortCost: 5,
  diplomacyGold: 1,
  diplomacyRegency: 2,
  provinceMaintenance: 1,
  holdingIncomeDivisor: 2,
  terrainDefense: { plains: 0, coast: 0, forest: 2, hills: 3, mountains: 5 },
  tax: taxes,
  loyaltyDelta: { light: 1, moderate: 0, severe: -1 },
  wardPower: 4,
};
export const RULESETS: Record<RulesetId, Ruleset> = {
  CLASSIC: { ...common, id: 'CLASSIC', warExpires: true },
  ENHANCED: { ...common, id: 'ENHANCED', warExpires: false },
};
