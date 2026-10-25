/** Increment5 wire types. Exact finances remain exclusively in the Increment4 journal. */
import { z } from 'zod';
import { regencyAuthorization15Schema as authorization } from './regency-state15';
import {
  nonnegativeGoldQuantityCodec as money,
  regencyQuantityCodec as rp,
  goldFromGB,
  goldFromGBRatio,
} from './quantities';
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9_-]*$/);
const count = z.number().int().safe().nonnegative();
const type = z.enum(['law', 'guild', 'temple', 'source']);
export const developmentOrder15Codec = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('create-holding'), provinceId: id, holdingType: type, bid: rp }),
  z.strictObject({ kind: z.literal('rule-holding'), holdingId: id, bid: rp }),
  z.strictObject({
    kind: z.literal('realm-rule'),
    targets: z.array(z.strictObject({ holdingId: id, bid: rp })).min(2),
  }),
  z.strictObject({ kind: z.literal('rule-province'), provinceId: id }),
  z.strictObject({ kind: z.literal('increase-court'), opportunity: z.enum(['standard', 'court']) }),
  z.strictObject({
    kind: z.literal('build-palace'),
    provinceId: id,
    opportunity: z.enum(['standard', 'court']),
  }),
]);
export const courtRequest15Codec = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('reserve'),
    orderId: id,
    authorization,
    order: developmentOrder15Codec,
  }),
  z.strictObject({ kind: z.literal('commit'), orderId: id, authorization }),
  z.strictObject({ kind: z.literal('release'), orderId: id, authorization }),
  z.strictObject({ kind: z.literal('resolve'), orderId: id, authorization }),
  z.strictObject({
    kind: z.literal('respond'),
    orderId: id,
    authorization,
    side: z.enum(['support', 'oppose']),
    holdingIds: z.array(id),
    bid: rp,
  }),
  z.strictObject({ kind: z.literal('end-slot'), authorization }),
  z.strictObject({ kind: z.literal('seat'), authorization, provinceId: id }),
  z.strictObject({
    kind: z.literal('host-consent'),
    authorization,
    provinceId: id,
    guestRealmId: id,
    allowed: z.boolean(),
  }),
  z.strictObject({ kind: z.literal('appoint'), authorization, characterId: id, provinceId: id }),
  z.strictObject({ kind: z.literal('nominate-administrate'), authorization }),
  z.strictObject({ kind: z.literal('fund-palace'), authorization, palaceId: id }),
  z.strictObject({ kind: z.literal('fund-court'), authorization }),
  // Called only after the real future seasonal orchestrator advances turn. Never advances turn itself.
  z.strictObject({ kind: z.literal('resume-season') }),
]);
const target = z.strictObject({
  provinceId: id,
  holdingId: id.nullable(),
  holdingType: type.nullable(),
  groupKey: z.string().nullable(),
  level: count,
  dc: count,
  personalBonus: count,
  gold: money,
  bid: rp,
  responders: z.array(id),
});
export const developmentQuote15Codec = z.strictObject({
  seasonIndex: count.positive(),
  round: count.min(1).max(3),
  realmId: id,
  characterId: id,
  standard: z.boolean(),
  courtSlots: z.array(count),
  personal: z.boolean(),
  targets: z.array(target),
  gold: money,
  rp,
  skill: z.literal('administrate'),
});
const contribution = z.strictObject({
  realmId: id,
  characterId: id,
  side: z.enum(['support', 'oppose']),
  groupKeys: z.array(z.string()),
  levels: count,
  bid: rp,
});
const outcome = z.strictObject({
  provinceId: id,
  roll: count.min(1).max(20),
  threshold: z.string().regex(/^-?(0|[1-9][0-9]*)$/),
  success: z.boolean(),
});
const order = z.strictObject({
  id,
  authorization,
  order: developmentOrder15Codec,
  quote: developmentQuote15Codec,
  status: z.enum(['reserved', 'committed', 'completed', 'released']),
  index: count,
  responseIndex: count,
  contributions: z.array(contribution),
  results: z.array(outcome),
});
export const courtProjection15Codec = z.strictObject({
  seasonIndex: count.positive(),
  awaitingMaintenance: z.boolean(),
  courts: z.array(
    z.strictObject({
      realmId: id,
      level: count,
      seat: id.nullable(),
      grandfather: z.boolean(),
      fundedThroughSeason: count,
      actionLevels: z.array(z.strictObject({ ordinal: count, level: count })),
      upkeepLevels: z.array(z.strictObject({ seasonIndex: count, level: count })),
    }),
  ),
  consents: z.array(
    z.strictObject({ provinceId: id, hostRealmId: id, guestRealmId: id, allowed: z.boolean() }),
  ),
  palaces: z.array(
    z.strictObject({
      id,
      realmId: id,
      provinceId: id,
      level: count,
      fundedSeason: count,
      fundedLevel: count,
      builds: z.array(
        z.strictObject({
          orderId: id,
          builtSeason: count,
          dueOrdinal: count,
          completed: z.boolean(),
        }),
      ),
    }),
  ),
  appointments: z.array(
    z.strictObject({
      realmId: id,
      characterId: id,
      deploymentId: id,
      reference: id,
      seasonIndex: count.positive(),
    }),
  ),
  orders: z.array(order),
  endedSlots: z.array(
    z.strictObject({ seasonIndex: count.positive(), round: count.min(1).max(3), realmId: id }),
  ),
  nominations: z.array(
    z.strictObject({
      realmId: id,
      characterId: id,
      seasonIndex: count.positive(),
      reference: id,
      status: z.literal('pending-maintenance'),
    }),
  ),
});
export const courtEvent15Codec = z.strictObject({
  id,
  seasonIndex: count.positive(),
  round: count.min(1).max(3),
  resourceEventCount: count,
  request: courtRequest15Codec,
});
export type DevelopmentOrder15 = z.output<typeof developmentOrder15Codec>;
export type CourtRequest15 = z.output<typeof courtRequest15Codec>;
export type DevelopmentQuote15 = z.output<typeof developmentQuote15Codec>;
export type CourtProjection15 = z.output<typeof courtProjection15Codec>;
export const courtExtraActions15 = (c: number) => {
  if (!Number.isSafeInteger(c) || c < 0) throw new Error('Invalid Court level');
  return c < 3 ? 0 : c < 5 ? 1 : c === 5 ? 2 : c < 8 ? 3 : c < 10 ? 4 : 5;
};
export const actionOrdinal15 = (season: number, round: number) => {
  const ordinal = (season - 1) * 3 + round - 1;
  if (
    !Number.isSafeInteger(ordinal) ||
    season < 1 ||
    !Number.isInteger(round) ||
    round < 1 ||
    round > 3
  )
    throw new Error('Invalid action round/season');
  return ordinal;
};
type CourtContext = {
  turn: number;
  domainTurn?: { round: number };
  provinces: readonly {
    id: string;
    owner: string;
    level: number;
    occupiedBy?: string | null;
    militaryContested?: boolean;
  }[];
  holdings: readonly {
    provinceId: string;
    realmId: string;
    level: number;
    contested?: boolean;
    destroyed?: boolean;
  }[];
  courtActions15?: { state: CourtProjection15 };
};
export function legalCourtSeat15(s: CourtContext, realmId: string, provinceId: string): boolean {
  const p = s.provinces.find((p) => p.id === provinceId);
  if (!p || p.militaryContested || (p.occupiedBy && p.occupiedBy !== realmId)) return false;
  if (p.owner === realmId) return true;
  return (
    s.holdings.some(
      (h) =>
        h.realmId === realmId &&
        h.provinceId === provinceId &&
        h.level > 0 &&
        !h.contested &&
        !h.destroyed,
    ) &&
    !!s.courtActions15?.state.consents.some(
      (c) =>
        c.provinceId === provinceId &&
        c.hostRealmId === p.owner &&
        c.guestRealmId === realmId &&
        c.allowed,
    )
  );
}
export function courtQuote15(s: CourtContext, realmId: string) {
  const c = s.courtActions15?.state.courts.find((c) => c.realmId === realmId);
  if (!c) throw new Error('Explicit court/action initialization required');
  const legal = !!c.seat && legalCourtSeat15(s, realmId, c.seat),
    p = s.provinces.find((p) => p.id === c.seat);
  const palaceLevel = s
    .courtActions15!.state.palaces.filter(
      (a) => a.realmId === realmId && a.provinceId === c.seat && a.fundedSeason === s.turn,
    )
    .reduce((n, a) => n + Math.min(a.level, a.fundedLevel), 0);
  const capacity = legal ? p!.level + palaceLevel : c.grandfather && c.seat === null ? 1 : 0;
  const effective = c.fundedThroughSeason >= s.turn ? Math.min(c.level, capacity) : 0;
  const ordinal = actionOrdinal15(s.turn, s.domainTurn?.round ?? 1);
  const actionLevel = [...c.actionLevels].reverse().find((x) => x.ordinal <= ordinal)?.level ?? 0;
  const upkeepLevel =
    [...c.upkeepLevels].reverse().find((x) => x.seasonIndex <= s.turn)?.level ?? 0;
  return {
    realmId,
    paidLevel: c.level,
    effectiveLevel: effective,
    seat: c.seat,
    legalSeat: legal,
    capacity,
    fundedPalaceLevel: palaceLevel,
    extraActions: courtExtraActions15(Math.min(actionLevel, effective)),
    upkeep: goldFromGB(BigInt(upkeepLevel)),
    nextSeasonUpkeep: goldFromGB(BigInt(c.level)),
    grandfather: c.grandfather && c.seat === null,
  };
}
export const palaceUpkeep15 = (level: number) => {
  if (!Number.isSafeInteger(level) || level < 0) throw new Error('Invalid palace level');
  return goldFromGBRatio(BigInt(level), 2n);
};

/** Priced derived assets only. No fabricated opening palace or additional ordinary port bill. */
export function courtCostProjection15(s: CourtContext) {
  const p = s.courtActions15?.state;
  if (!p) return { courtLevels: [], infrastructure: [] };
  return {
    courtLevels: p.courts.map((c) => ({
      realmId: c.realmId,
      level: [...c.upkeepLevels].reverse().find((x) => x.seasonIndex <= s.turn)?.level ?? 0,
      sourceId: `court15-${c.realmId}`,
    })),
    infrastructure: p.palaces
      .filter((a) => a.level > 0)
      .map((a) => ({
        id: a.id,
        realmId: a.realmId,
        kind: 'palace' as const,
        sourceIds: [a.id],
        reference: 'F01-A runtime palace',
        seasonalUpkeep: palaceUpkeep15(a.level),
        evidence: 'recorded-contract' as const,
        paid: true, // The capital asset exists; seasonal support is separately recorded below.
        administrateBase: palaceUpkeep15(
          a.fundedSeason === s.turn ? Math.min(a.fundedLevel, a.level) : 0,
        ),
        supported: legalCourtSeat15(s, a.realmId, a.provinceId),
      })),
  };
}
