import { z } from 'zod';
import { provenanceSchema } from '../core/schema.ts';
const number = z.number().int().nonnegative(),
  point = z.tuple([z.number().finite(), z.number().finite()]);
const matrixSchema = z
  .object({
    rows: number.positive().max(1000),
    columns: number.positive().max(1000),
    values: z.array(number.max(255)).max(1_000_000),
  })
  .refine(
    (m) => m.values.length === m.rows * m.columns,
    'Matrix length does not match its dimensions',
  );
export const researchProvinceSchema = z
  .object({
    id: z.string(),
    index: number.positive(),
    offset: number,
    name: z.string().min(1),
    center: point,
    realmIndex: number,
    level: number.max(10),
    currentLevel: number.max(10),
    magic: number.max(15),
    taxCode: number,
    loyaltyCode: number,
    terrainCode: number,
    borders: z.array(z.object({ provinceIndex: number.positive(), movementCode: number })),
    firstPlace: number,
  })
  .passthrough();
export const anuireResearchSchema = z
  .object({
    format: z.literal('birthright-hd-anuire-research'),
    version: z.literal(1),
    status: z.literal('research-preview'),
    sources: z.array(
      z.object({
        id: z.string(),
        location: z.string(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        bytes: number,
        scope: z.string(),
      }),
    ),
    provenance: provenanceSchema,
    campaign: z
      .object({
        reactions: matrixSchema,
        relationships: matrixSchema,
        tribute: matrixSchema,
        realms: z.array(
          z
            .object({
              id: z.string(),
              index: number.positive(),
              name: z.string(),
              regentIndex: number,
              treasury: number,
              regency: number,
              playable: z.boolean(),
            })
            .passthrough(),
        ),
        provinces: z.array(researchProvinceSchema),
        regents: z.array(
          z
            .object({
              id: z.string(),
              index: number.positive(),
              realmIndex: number,
              classCode: number,
              bloodline: z.object({ grade: number, derivation: number, strength: number }),
              identity: z.object({ name: z.string() }).passthrough().nullable(),
            })
            .passthrough(),
        ),
        holdings: z.array(
          z
            .object({
              id: z.string(),
              index: number,
              provinceIndex: number.nullable(),
              realmIndex: number,
              type: z.enum(['law', 'guild', 'temple', 'source']),
              level: number,
            })
            .passthrough(),
        ),
        forts: z.array(
          z
            .object({
              index: number,
              provinceIndex: number.nullable(),
              realmIndex: number,
              level: number,
              iconCode: number,
            })
            .passthrough(),
        ),
        troops: z.array(
          z
            .object({
              id: z.string(),
              index: number,
              realmIndex: number,
              effectiveProvinceIndex: number.nullable(),
              typeCode: number,
              kind: z.enum(['military', 'character']),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
    map: z.object({
      width: number.positive(),
      height: number.positive(),
      coordinateScale: number.positive(),
      geometries: z.array(
        z.object({
          provinceIndex: number.positive(),
          pixelArea: number.positive(),
          centerValue: number.nullable(),
          rings: z.array(z.array(point).min(3)).min(1),
        }),
      ),
    }),
    validation: z
      .object({
        errors: z.array(z.string()),
        warnings: z.array(z.string()),
        readinessBlockers: z.array(z.string()),
      })
      .passthrough(),
  })
  .passthrough();
export type AnuireResearch = z.infer<typeof anuireResearchSchema>;

export function validateAnuireResearch(input: unknown): AnuireResearch {
  const data = anuireResearchSchema.parse(input),
    c = data.campaign;
  const unique = (values: (string | number)[], label: string) => {
    if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
  };
  unique(
    data.sources.map((s) => s.id),
    'source ID',
  );
  for (const [values, label] of [
    [c.provinces, 'province'],
    [c.realms, 'realm'],
    [c.regents, 'regent'],
    [c.holdings, 'holding'],
    [c.troops, 'unit'],
  ] as const) {
    unique(
      values.map((v) => v.id),
      label,
    );
    unique(
      values.map((v) => v.index),
      `${label} index`,
    );
  }
  const provinces = new Set(c.provinces.map((p) => p.index)),
    realms = new Set(c.realms.map((r) => r.index)),
    regents = new Set(c.regents.map((r) => r.index));
  if (!provinces.size || !realms.size || !regents.size || data.validation.errors.length)
    throw new Error('Empty or invalid research corpus');
  const realmSlots = Math.max(...realms) + 1;
  if (
    c.reactions.columns !== realmSlots ||
    c.relationships.columns !== realmSlots ||
    c.relationships.rows !== c.reactions.rows ||
    c.relationships.rows > realmSlots ||
    c.tribute.rows !== realmSlots ||
    c.tribute.columns !== realmSlots
  )
    throw new Error('Invalid realm relationship matrix dimensions');
  for (const p of c.provinces) {
    if (
      !realms.has(p.realmIndex) ||
      p.borders.some((b) => !provinces.has(b.provinceIndex) || b.provinceIndex === p.index)
    )
      throw new Error('Invalid province/border reference');
    unique(
      p.borders.map((b) => b.provinceIndex),
      'province border',
    );
  }
  for (const r of c.realms)
    if (
      !regents.has(r.regentIndex) ||
      c.regents.find((g) => g.index === r.regentIndex)?.realmIndex !== r.index
    )
      throw new Error('Invalid realm regent reference');
  for (const r of c.regents)
    if (!realms.has(r.realmIndex)) throw new Error('Invalid regent realm reference');
  unique(
    c.forts.map((f) => f.index),
    'fort index',
  );
  for (const h of [...c.holdings, ...c.forts])
    if (h.provinceIndex === null || !provinces.has(h.provinceIndex) || !realms.has(h.realmIndex))
      throw new Error('Invalid holding/fort reference');
  for (const u of c.troops)
    if (
      u.effectiveProvinceIndex === null ||
      !provinces.has(u.effectiveProvinceIndex) ||
      !realms.has(u.realmIndex)
    )
      throw new Error('Invalid troop deployment');
  unique(
    data.map.geometries.map((g) => g.provinceIndex),
    'map geometry',
  );
  if (
    data.map.geometries.length !== c.provinces.length ||
    data.map.geometries.some(
      (g) => !provinces.has(g.provinceIndex) || g.centerValue !== g.provinceIndex,
    )
  )
    throw new Error('Map coverage or coordinate mismatch');
  return data;
}
