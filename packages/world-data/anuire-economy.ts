import { z } from 'zod';
const index = z.number().int().positive();
export const anuireEconomySchema = z.object({
  format: z.literal('birthright-hd-economy-research'),
  version: z.literal(1),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  sourceBytes: index,
  ports: z.array(
    z.object({
      index,
      provinceIndex: index.max(206),
      realmIndex: index.max(51),
      iconCode: z.union([z.literal(94), z.literal(95), z.literal(96)]),
    }),
  ),
});
