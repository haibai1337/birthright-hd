/** Increment 4's opt-in, replayable resource journal. No legacy state is reinterpreted. */
import { z } from 'zod';
import { regencyQuantityCodec as rp, nonnegativeGoldQuantityCodec as gb } from './quantities';
const id = z.string().min(1).max(240);
const season = z.number().int().positive();
const count = z.number().int().nonnegative();
export const regencyAuthorization15Schema = z.strictObject({
  realmId: id,
  characterId: id,
  mode: z.enum(['basic', 'advanced', 'expert']),
  kind: z.enum(['selected-policy', 'confirmation', 'order']),
  reference: id,
});
export const regencyCategory15Schema = z.enum(['province', 'law', 'guild', 'temple', 'source']);
export const collectionQuote15Codec = z.strictObject({
  realmId: id,
  characterId: id.nullable(),
  seasonIndex: season,
  originalScore: rp,
  currentScore: rp,
  reviewedRuler: z.boolean(),
  status: z.enum(['eligible', 'ineligible', 'unknown']),
  reason: z.string(),
  categories: z.array(
    z.strictObject({
      kind: regencyCategory15Schema,
      levels: rp,
      rating: z.number().nonnegative().nullable(),
      percent: count.max(100).nullable(),
      eligible: z.boolean(),
      reason: z.string(),
      sourceIds: z.array(id),
    }),
  ),
  qualifiedRP: rp.nullable(),
  collectibleRP: rp.nullable(),
  knownWeightedHundredths: rp,
  conditionalUpperRP: rp,
  openingRP: rp,
});
export const regencyReservation15Codec = z.strictObject({
  id,
  realmId: id,
  characterId: id,
  obligationId: id,
  seasonIndex: season,
  purpose: z.enum(['bid', 'obligation', 'pledge', 'future-alchemy', 'payroll']),
  rp,
  gold: gb,
  status: z.enum(['reserved', 'committed', 'paid', 'released']),
  targetRealmId: id.nullable(),
});
export const payrollSelection15Codec = z.strictObject({ unitId: id, rpGold: gb, gold: gb });
const payrollBill = z.strictObject({ unitId: id, amount: gb, regular: z.boolean(), waived: gb });
const account = z.strictObject({ realmId: id, rp, gold: gb });
const bloodline = z.strictObject({
  characterId: id,
  originalScore: rp,
  currentScore: rp,
  streak: count.max(2),
  lastQualifiedBoundary: season.nullable(),
  growthYear: count,
  growthCount: count.max(2),
});
const ruler = z.strictObject({ realmId: id, characterId: id });
const pledge = z.strictObject({ realmId: id, targetRealmId: id, obligationId: id, amount: rp });
export const regencyOperation15Codec = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('sync-rulers'), rulers: z.array(ruler) }),
  z.strictObject({
    kind: z.literal('open'),
    quotes: z.array(collectionQuote15Codec),
    pledges: z.array(pledge),
  }),
  z.strictObject({ kind: z.literal('collect'), realmId: id }),
  z.strictObject({ kind: z.literal('withhold'), realmId: id, reason: id }),
  z.strictObject({
    kind: z.literal('reserve'),
    authorization: regencyAuthorization15Schema,
    reservation: regencyReservation15Codec,
  }),
  z.strictObject({
    kind: z.literal('commit'),
    authorization: regencyAuthorization15Schema,
    reservationId: id,
  }),
  z.strictObject({
    kind: z.literal('release'),
    authorization: regencyAuthorization15Schema,
    reservationId: id,
  }),
  z.strictObject({
    kind: z.literal('pay'),
    authorization: regencyAuthorization15Schema,
    reservationId: id,
  }),
  z.strictObject({
    kind: z.literal('transfer'),
    authorization: regencyAuthorization15Schema,
    reservationId: id,
    targetRealmId: id,
  }),
  z.strictObject({
    kind: z.literal('sacrifice'),
    authorization: regencyAuthorization15Schema,
    points: rp,
  }),
  z.strictObject({
    kind: z.literal('payroll'),
    authorization: regencyAuthorization15Schema,
    allocations: z.array(payrollSelection15Codec),
    bills: z.array(payrollBill),
  }),
  z.strictObject({ kind: z.literal('close'), growth: z.array(regencyAuthorization15Schema) }),
]);
const event = z.strictObject({ id, seasonIndex: season, operation: regencyOperation15Codec });
const receipt = z.strictObject({
  id,
  seasonIndex: season,
  realmId: id,
  characterId: id.nullable(),
  kind: z.enum(['collection', 'withheld', 'spend', 'transfer', 'growth', 'sacrifice', 'payroll']),
  obligationId: id.nullable(),
  reservationId: id.nullable(),
  targetRealmId: id.nullable(),
  rpDebit: rp,
  rpCredit: rp,
  goldDebit: gb,
  scoreBefore: rp.nullable(),
  scoreAfter: rp.nullable(),
  payroll: z.array(payrollSelection15Codec),
});
export const regencyProjection15Codec = z.strictObject({
  accounts: z.array(account),
  bloodlines: z.array(bloodline),
  rulers: z.array(ruler),
  reservations: z.array(regencyReservation15Codec),
  receipts: z.array(receipt),
  lastClosedSeason: season.nullable(),
  boundary: z
    .strictObject({
      seasonIndex: season,
      receiptStart: count,
      quotes: z.array(collectionQuote15Codec),
      pledges: z.array(pledge),
    })
    .nullable(),
});
export const regencyState15Codec = z.strictObject({
  version: z.literal(1),
  startedSeason: season,
  opening: z.strictObject({
    accounts: z.array(account),
    bloodlines: z.array(z.strictObject({ characterId: id, originalScore: rp })),
    rulers: z.array(ruler),
  }),
  events: z.array(event),
  state: regencyProjection15Codec,
});
export type RegencyAuthorization15 = z.output<typeof regencyAuthorization15Schema>;
export type CollectionQuote15 = z.output<typeof collectionQuote15Codec>;
export type RegencyReservation15 = z.output<typeof regencyReservation15Codec>;
export type PayrollSelection15 = z.output<typeof payrollSelection15Codec>;
export type RegencyOperation15 = z.output<typeof regencyOperation15Codec>;
export type RegencyState15 = z.output<typeof regencyState15Codec>;
export type RegencyProjection15 = z.output<typeof regencyProjection15Codec>;
