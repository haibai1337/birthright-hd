import { z } from 'zod';
export const anuireMagicSchema = z.object({
  format: z.literal('birthright-hd-magic-research'),
  version: z.literal(1),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  characters: z.array(
    z.object({
      regentId: z.string(),
      avatarId: z.number().int(),
      inventoryVerified: z.boolean(),
      itemIds: z.array(z.number().int().nonnegative()),
      classes: z.array(
        z.object({
          classCode: z.number().int().min(-1).max(7),
          level: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
  leyLines: z.array(
    z.object({
      realmIndex: z.number().int().positive(),
      fromHoldingId: z.string(),
      toHoldingId: z.string(),
    }),
  ),
});
