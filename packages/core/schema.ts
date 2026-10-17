import { z } from 'zod';

export const idSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_-]*$/);
const integer = z.number().int().nonnegative();
export const provenanceSchema = z.object({
  status: z.enum([
    'VERIFIED_ORIGINAL',
    'VERIFIED_TABLETOP',
    'INFERRED',
    'ENHANCED_DESIGN',
    'TEMPORARY_PLACEHOLDER',
    'UNKNOWN',
  ]),
  source: z.string(),
  note: z.string(),
});
export const terrainSchema = z.enum([
  'plains',
  'forest',
  'hills',
  'mountains',
  'heavy-mountains',
  'swamp',
  'coast',
]);
const originalFields = z.record(z.string(), z.unknown()).optional();
const pointSchema = z.tuple([z.number().finite(), z.number().finite()]);
export const selectionModeSchema = z.enum(['CLASSIC', 'UNRESTRICTED']);
export const holdingTypeSchema = z.enum(['law', 'guild', 'temple', 'source']);
export const taxSchema = z.enum(['light', 'moderate', 'severe']);
export const treatyKindSchema = z.enum(['peace', 'pact', 'alliance', 'war']);
export const unitDefinitionSchema = z.object({
  id: idSchema,
  name: z.string(),
  cost: integer,
  upkeep: integer,
  power: integer.positive(),
  minLevel: integer,
  recruitable: z.boolean().optional(),
  mobility: z.enum(['foot', 'mounted']).optional(),
  original: originalFields,
  provenance: provenanceSchema,
});
export const bloodlineSchema = z.object({
  derivation: z.string(),
  strength: integer,
  abilities: z.array(idSchema),
});
export const characterSchema = z.object({
  id: idSchema,
  name: z.string(),
  class: z.enum(['warrior', 'wizard', 'priest', 'rogue']),
  bloodline: bloodlineSchema,
  attributes: z.object({ command: integer, diplomacy: integer }),
  inventory: z.array(idSchema),
  original: originalFields,
});
export const regionSchema = z.object({
  id: idSchema,
  name: z.string(),
  culture: z.string(),
  provenance: provenanceSchema,
});
export const provinceDefinitionSchema = z.object({
  id: idSchema,
  name: z.string(),
  regionId: idSchema,
  terrain: terrainSchema,
  polygon: z.array(z.tuple([z.number().finite(), z.number().finite()])).min(3),
  rings: z.array(z.array(pointSchema).min(3)).min(1).optional(),
  movement: z.array(z.object({ to: idSchema, code: integer.max(255) })).optional(),
  center: z.tuple([z.number().finite(), z.number().finite()]),
  adjacent: z.array(idSchema),
  maxLevel: integer.max(15),
  magicPotential: integer.max(30),
  original: originalFields,
  provenance: provenanceSchema,
});
export const realmDefinitionSchema = z.object({
  id: idSchema,
  name: z.string(),
  adjective: z.string(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  sigil: z.enum(['crown', 'stag', 'tower']),
  motto: z.string(),
  regent: characterSchema,
  originalPlayable: z.boolean().optional(),
  technicalPlayable: z.boolean().optional(),
  domainType: z.enum(['territorial', 'holding', 'special', 'inactive']).optional(),
  specialBehavior: z.enum(['standard', 'unresolved-original']).optional(),
  controller: z.enum(['ai', 'passive']).optional(),
  survival: z.enum(['territory', 'domain-assets', 'persistent']).optional(),
  original: originalFields,
  provenance: provenanceSchema,
});
export const holdingSchema = z.object({
  id: idSchema,
  provinceId: idSchema,
  realmId: idSchema,
  type: holdingTypeSchema,
  level: integer.max(15),
  sourceId: idSchema.optional(),
});
export const provinceStateSchema = z.object({
  id: idSchema,
  owner: idSchema,
  level: integer.max(15),
  loyalty: integer.max(4),
  tax: taxSchema,
  fort: integer.max(15),
  occupiedBy: idSchema.nullable().optional(),
  contested: z.boolean().optional(),
  sourceId: idSchema.optional(),
});
export const unitSchema = z.object({
  id: idSchema,
  type: idSchema,
  strength: integer.min(1).max(100),
  sourceId: idSchema.optional(),
});
export const armySchema = z.object({
  id: idSchema,
  realmId: idSchema,
  provinceId: idSchema,
  units: z.array(unitSchema).min(1),
  moved: z.boolean(),
});
export const treatySchema = z.object({
  a: idSchema,
  b: idSchema,
  kind: treatyKindSchema,
  opinion: z.number().int().min(-100).max(100),
  since: integer,
});
export const tradeRouteSchema = z.object({
  id: idSchema,
  realmId: idSchema,
  from: idSchema,
  to: idSchema,
});
export const spellDefinitionSchema = z.object({
  id: idSchema,
  name: z.string(),
  holding: holdingTypeSchema,
  minLevel: integer,
  gold: integer,
  regency: integer,
  effect: z.enum(['ward']),
  duration: integer.positive(),
  provenance: provenanceSchema,
});
export const effectSchema = z.object({
  spellId: idSchema,
  provinceId: idSchema,
  realmId: idSchema,
  expiresTurn: integer,
});
export const eventDefinitionSchema = z.object({
  id: idSchema,
  weight: integer.positive(),
  gold: z.number().int(),
  loyalty: z.number().int(),
  decision: z.boolean(),
  provenance: provenanceSchema,
});
export const fortificationSchema = z.object({
  id: idSchema,
  sourceId: idSchema.optional(),
  provinceId: idSchema,
  realmId: idSchema,
  level: integer.max(15),
  kind: z.enum(['castle', 'wizard-tower']),
});
export const characterDeploymentSchema = z.object({
  id: idSchema,
  sourceId: idSchema,
  provinceId: idSchema,
  realmId: idSchema,
  regentId: idSchema.nullable(),
  typeCode: integer,
});
export const scenarioSchema = z.object({
  id: idSchema,
  revision: z.literal(1),
  name: z.string(),
  description: z.string(),
  provenance: provenanceSchema,
  fingerprint: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  map: z.object({ width: integer.positive(), height: integer.positive() }).optional(),
  regents: z.array(characterSchema).optional(),
  originalData: z.unknown().optional(),
  compatibilityNotes: z.array(z.string()).optional(),
  selection: z
    .object({ mode: selectionModeSchema, overrides: z.record(idSchema, z.boolean()).optional() })
    .optional(),
  policy: z
    .object({
      directedBorders: z.boolean(),
      survival: z.enum(['territory', 'domain-assets', 'persistent']),
      maxFort: integer.max(15),
      holdingCapacity: z.enum(['strict', 'preserve-template-excess']),
      conquest: z.enum(['transfer', 'occupation']),
    })
    .optional(),
  regions: z.array(regionSchema).min(1),
  realms: z.array(realmDefinitionSchema).min(3),
  provinces: z.array(provinceDefinitionSchema).min(3),
  units: z.array(unitDefinitionSchema).min(1),
  spells: z.array(spellDefinitionSchema),
  events: z.array(eventDefinitionSchema).min(1),
  initial: z.object({
    provinces: z.array(provinceStateSchema),
    holdings: z.array(holdingSchema),
    armies: z.array(armySchema),
    treaties: z.array(treatySchema),
    tradeRoutes: z.array(tradeRouteSchema),
    treasury: integer,
    regency: integer,
    domains: z.array(z.object({ id: idSchema, treasury: integer, regency: integer })).optional(),
    fortifications: z.array(fortificationSchema).optional(),
    characters: z.array(characterDeploymentSchema).optional(),
  }),
  victory: z.object({
    provinces: integer.positive(),
    turns: integer.positive(),
    metric: z.enum(['province-count', 'domain-power', 'holding-levels']).optional(),
    target: integer.positive().optional(),
  }),
});
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('RecruitUnit'), provinceId: idSchema, unitType: idSchema }),
  z.object({ type: z.literal('MoveArmy'), armyId: idSchema, destination: idSchema }),
  z.object({ type: z.literal('DevelopProvince'), provinceId: idSchema }),
  z.object({ type: z.literal('ChangeTaxPolicy'), provinceId: idSchema, tax: taxSchema }),
  z.object({ type: z.literal('ImproveHolding'), holdingId: idSchema }),
  z.object({ type: z.literal('Fortify'), provinceId: idSchema }),
  z.object({ type: z.literal('ProposeTreaty'), target: idSchema, kind: treatyKindSchema }),
  z.object({ type: z.literal('CastRealmSpell'), provinceId: idSchema, spellId: idSchema }),
  z.object({ type: z.literal('ResolveEvent'), choice: z.enum(['relief', 'decline']) }),
  z.object({ type: z.literal('EndTurn') }),
]);
export const realmStateSchema = z.object({
  id: idSchema,
  treasury: integer,
  regency: integer,
  actions: integer.max(3),
  eliminated: z.boolean(),
  controller: z.enum(['player', 'ai', 'passive']).optional(),
});
export const reportSchema = z.object({
  realmId: idSchema,
  turn: integer,
  taxes: integer,
  holdings: integer,
  trade: integer,
  maintenance: integer,
  military: integer,
  regency: integer,
  net: z.number().int(),
});
export const logSchema = z.object({
  code: z.string(),
  turn: integer,
  realmId: z.string(),
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});
export const historySchema = z.object({
  actor: idSchema,
  command: commandSchema,
  turn: integer,
  source: z.enum(['player', 'ai']),
});
export const campaignSchema = z.object({
  scenarioId: idSchema,
  scenarioRevision: z.literal(1),
  scenarioFingerprint: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  selectionMode: selectionModeSchema.optional(),
  ruleset: z.enum(['CLASSIC', 'ENHANCED']),
  seed: integer.max(4294967295),
  rng: integer.max(4294967295),
  playerRealm: idSchema,
  turn: integer.min(1),
  nextId: integer,
  realms: z.array(realmStateSchema),
  provinces: z.array(provinceStateSchema),
  holdings: z.array(holdingSchema),
  armies: z.array(armySchema),
  fortifications: z.array(fortificationSchema).optional(),
  characters: z.array(characterDeploymentSchema).optional(),
  treaties: z.array(treatySchema),
  tradeRoutes: z.array(tradeRouteSchema),
  effects: z.array(effectSchema),
  reports: z.array(reportSchema),
  log: z.array(logSchema),
  history: z.array(historySchema),
  pendingEvents: z.array(
    z.object({ id: idSchema, realmId: idSchema, provinceId: idSchema, turn: integer }),
  ),
  outcome: z.enum(['ongoing', 'victory', 'defeat']),
});
export const saveSchema = z.object({
  format: z.literal('birthright-hd'),
  version: z.literal(1),
  campaign: campaignSchema,
});
export type Scenario = z.infer<typeof scenarioSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type Command = z.infer<typeof commandSchema>;
export type Realm = z.infer<typeof realmStateSchema>;
export type Province = z.infer<typeof provinceStateSchema>;
export type Army = z.infer<typeof armySchema>;
export type TreatyKind = z.infer<typeof treatyKindSchema>;
export type LogEntry = z.infer<typeof logSchema>;
export type Report = z.infer<typeof reportSchema>;
export type RulesetId = Campaign['ruleset'];
