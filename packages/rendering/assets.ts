// Asset references are presentation-only. Licensed packs can override these paths later.
export interface AssetPack {
  id: string;
  provenance: string;
  crest: string;
  portraits: Record<string, string>;
  textures: Record<string, string>;
}
export const proceduralPack: AssetPack = {
  id: 'procedural-m0',
  provenance: 'Original code-generated art; no CD assets',
  crest: '/crest.svg',
  portraits: {},
  textures: {},
};
export interface AdventureRequest {
  campaignId: string;
  partyCharacterIds: string[];
  questId: string;
  seed: number;
}
export interface AdventureOutcome {
  questId: string;
  completed: boolean;
  gold: number;
  survivingCharacterIds: string[];
  artifactIds: string[];
}
// Babylon is intentionally not imported or instantiated. Future scene adapters implement this.
export interface AdventureAdapter {
  run(request: AdventureRequest): Promise<AdventureOutcome>;
}
