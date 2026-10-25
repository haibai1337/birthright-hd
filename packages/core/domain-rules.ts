import { z } from 'zod';

/** Rules identity is independent of rules profile, control mode and settlement replay. */
export const LEGACY_DOMAIN_RULES = Object.freeze({
  id: 'birthright-hd-legacy',
  version: 1,
} as const);
export const legacyDomainRulesSchema = z.strictObject({
  id: z.literal(LEGACY_DOMAIN_RULES.id),
  version: z.literal(LEGACY_DOMAIN_RULES.version),
});

export const derivedOverlaySchema = z.strictObject({
  version: z
    .string()
    .min(1)
    .max(100)
    .refine((v) => v === v.trim(), 'Overlay version must not have surrounding whitespace'),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
});
export const domainOverlaysSchema = z.strictObject({
  // Null means not authored/attached; it must never stand for an invented reviewed overlay.
  characters: derivedOverlaySchema.nullable(),
  handlers: derivedOverlaySchema.nullable(),
});
export const birthright15DomainRulesSchema = z.strictObject({
  id: z.literal('birthright-1.5'),
  version: z.literal('1.1'),
  overlays: domainOverlaysSchema,
});
export const domainRulesSchema = z.discriminatedUnion('id', [
  legacyDomainRulesSchema,
  birthright15DomainRulesSchema,
]);
export type DomainRules = z.infer<typeof domainRulesSchema>;
export type DomainOverlays = z.infer<typeof domainOverlaysSchema>;

export function domainRulesOf(state: { domainRules?: unknown }): DomainRules {
  return domainRulesSchema.parse(
    state.domainRules === undefined ? LEGACY_DOMAIN_RULES : state.domainRules,
  );
}

export const BIRTHRIGHT15_NOT_ACTIVE =
  'Birthright 1.5 gameplay is not active: versioning, exact quantities, persistence and character content are isolated foundations.';

/** Never let a foundation save enter a numeric legacy command/settlement path. */
export function assertLegacyDomainRules(state: { domainRules?: unknown }): void {
  if (domainRulesOf(state).id !== LEGACY_DOMAIN_RULES.id) throw new Error(BIRTHRIGHT15_NOT_ACTIVE);
}
