import { z } from 'zod';
export const anuireStrategySchema = z.object({
  format: z.literal('birthright-hd-strategy-research'),
  version: z.literal(1),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  troops: z.array(
    z.object({
      id: z.string(),
      nativeTypeCode: z.number().int().positive(),
      icon: z.number().int().min(1).max(29),
      blessed: z.boolean(),
      offset: z.number().int().nonnegative(),
    }),
  ),
});
