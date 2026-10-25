import { z } from 'zod';
import type { Scenario, StoredCampaign } from './schema';
import { realmRegentCandidates, rulingRegent } from './regents';
import { canonicalOverlayJSON, overlayFingerprint } from './overlay-fingerprint';
import {
  ABILITIES35,
  type Abilities35,
  abilityModifier35,
  CLASSES35,
  SKILLS35,
  FEATS35,
  classSkill35,
  culturalSkills35,
  derivedCombat35,
  racialTraits35,
  CLASS_FEATURES35,
  RACES35,
  GRADES35,
  spellSlots35,
  WIZARD_ACQUISITIONS35,
  BARD_KNOWN35,
  DEITIES35,
} from './character-rules35';
import { derivedOverlaySchema, type DomainOverlays } from './domain-rules';
import { PC_REALM_SPELLS } from './realm-spells';
import {
  spiderSheet35Schema,
  spiderRanks35,
  deriveSpider35,
  validateSpider35,
} from './spider-sheet35';

export const isRegencyOverlayVersion35 = (version: string | undefined) =>
  version === '1.1.0' || version === '1.2.0';

const nat = z.number().int().nonnegative();
const abilitySchema = z
  .object({
    strength: nat,
    dexterity: nat,
    constitution: nat,
    intelligence: nat,
    wisdom: nat,
    charisma: nat,
  })
  .strict();
export const evidence35Schema = z.strictObject({
  paths: z.array(z.string()).min(1),
  category: z.enum(['original', 'source_verified', 'reconstructed', 'unknown']),
  confidence: z.enum(['high', 'medium', 'low', 'unknown']),
  sources: z.array(z.string()),
  rationale: z.string().min(1),
});
const purchaseSchema = z.strictObject({
  skill: z.string().refine((s) => s in SKILLS35),
  halfRanks: nat.positive(),
});
const featSchema = z.strictObject({
  id: z.string().refine((s) => s in FEATS35),
  target: z.string().nullable(),
  level: nat.positive(),
  grant: z.enum(['general', 'human', 'fighter', 'wizard', 'scribeScroll', 'scion:Azrai']),
});
export const reconstruction35Schema = z.strictObject({
  race: z.string(),
  culture: z.string().nullable(),
  alignment: z.string(),
  baseAbilities: abilitySchema,
  abilities: abilitySchema,
  levels: z
    .array(
      z.strictObject({
        classId: z.string().refine((s) => s in CLASSES35),
        abilityIncrease: z.enum(ABILITIES35).nullable(),
        hpRoll: nat.positive(),
        purchases: z.array(purchaseSchema),
      }),
    )
    .min(1)
    .max(40),
  scionChoices: z.array(z.string().refine((s) => s in SKILLS35)),
  feats: z.array(featSchema),
  guildCraft: z.string().startsWith('craft:'),
  guildProfession: z.string().startsWith('profession:'),
  languages: z.array(z.string()),
  deity: z.string().nullable(),
  domains: z.array(z.string()).max(2),
  divineStanding: z.enum(['active', 'unconfirmed', 'not-applicable']),
  sectDoctrine: z
    .strictObject({
      alignment: z.enum(['TN', 'NG']),
      review: z.literal('user-approved'),
      source: z.string(),
    })
    .optional(),
  spellbook: z.array(
    z.strictObject({ spell: z.string(), spellLevel: nat.max(9), learnedAt: nat.positive() }),
  ),
  spontaneousSpells: z.array(z.strictObject({ spell: z.string(), spellLevel: nat.max(6) })),
  choices: z.record(z.string(), z.string()),
  notes: z.array(z.string()),
});
export type Reconstruction35 = z.infer<typeof reconstruction35Schema>;
/** Capability overlays do not award class levels, purchases, feats or tactical bonuses. */
export const exceptionalProfile35Schema = z.strictObject({
  kind: z.enum(['chimaera', 'gorgon', 'rhuobhe', 'spider']),
  domainReadiness: z.enum(['reviewed', 'reviewed-limited']),
  tacticalReadiness: z.literal('partial'),
  progression: z.strictObject({
    model: z.enum(['sierra-parallel-capabilities', 'sierra-monster']),
    allocationLevels: nat,
    effectiveMartialLevel: nat.positive().nullable(),
    effectiveWizardLevel: nat.positive().nullable(),
    monsterLevel: nat.positive().nullable(),
    monsterHitDice: z
      .strictObject({ number: nat.positive(), die: nat.positive(), bonus: z.number().int() })
      .nullable(),
    templateHitDice: z.null(),
    levelAdjustment: z.null(),
    rationale: z.string().min(1),
  }),
  derivedBloodlineGrade: z.literal('true').nullable(),
  virtualGuildHandler: z.literal(true).optional(),
  monsterSheet: spiderSheet35Schema.optional(),
  traits: z.array(
    z.strictObject({
      id: z.string(),
      kind: z.enum(['physical', 'extraordinary', 'supernatural', 'blood', 'elven']),
      status: z.enum(['source-verified', 'source-attributed', 'provisional']),
      edition: z.string(),
      source: z.string(),
      description: z.string(),
      mechanics: z.literal('deferred'),
    }),
  ),
  unknowns: z.array(z.string()).min(1),
});
export const sierraSpellEntitlement35Schema = z.strictObject({
  kind: z.literal('sierra-monster-inventory'),
  review: z.literal('user-approved'),
  effectiveCastingLevel: nat.positive(),
  inventory: z.strictObject({ member: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }),
  spells: z
    .array(
      z.strictObject({
        originalItemId: nat.positive(),
        id: z.string(),
        name: z.string(),
        scope: z.enum(['adventure', 'realm']),
        sierraSpellLevel: nat.positive().nullable(),
        inventoryLine: nat.positive(),
        requirements: z.literal('birthright15-magic-requirements'),
      }),
    )
    .min(1),
});
/** Complete spell subset of CD SCENES/ID1056.INV. Items 218/224 are blood powers. */
export const SPIDER_SIERRA_SPELLS35 = [
  [139, 'shocking-grasp', 'Shocking Grasp', 'adventure', 1, 5],
  [145, 'poison-arrow', "Morelf's Poison Arrow", 'adventure', 2, 6],
  [147, 'fireball', 'Fireball', 'adventure', 3, 7],
  [153, 'ice-storm', 'Ice Storm', 'adventure', 4, 8],
  [156, 'cone-of-cold', 'Cone of Cold', 'adventure', 5, 9],
  [157, 'disintegrate', 'Disintegrate', 'adventure', 5, 10],
  [162, 'flesh-to-stone', 'Flesh to Stone', 'adventure', 6, 11],
  [193, 'death-plague', 'Death Plague', 'realm', null, 22],
  [196, 'legion-of-the-dead', 'Legion of the Dead', 'realm', null, 23],
  [197, 'mass-destruction', 'Mass Destruction', 'realm', null, 24],
].map(([originalItemId, id, name, scope, sierraSpellLevel, inventoryLine]) => ({
  originalItemId: originalItemId as number,
  id: id as string,
  name: name as string,
  scope: scope as 'adventure' | 'realm',
  sierraSpellLevel: sierraSpellLevel as number | null,
  inventoryLine: inventoryLine as number,
  requirements: 'birthright15-magic-requirements' as const,
}));
export const characterSheet35Schema = z.strictObject({
  id: z.string(),
  name: z.string(),
  completion: z.enum(['complete', 'provisional', 'unresolved']),
  review: z.enum(['authored-checked', 'requires-review', 'unresolved']),
  // Verbatim private original record, not a normalized replacement for the importer.
  original: z.record(z.string(), z.unknown()),
  inventory: z.strictObject({
    avatarId: z.number().int().nullable(),
    verified: z.boolean(),
    itemIds: z.array(z.number().int()),
    avaClasses: z.array(
      z.strictObject({
        classCode: z.number().int(),
        level: nat,
        experience: z.number().int().nullable(),
      }),
    ),
  }),
  bloodline: z.strictObject({
    score: nat,
    derivation: z.string(),
    grade: z.string(),
    abilities: z.array(z.string()),
  }),
  knownRealmSpells: z.array(z.string()),
  reconstruction: reconstruction35Schema.nullable(),
  exceptionalProfile: exceptionalProfile35Schema.optional(),
  sierraSpellEntitlement: sierraSpellEntitlement35Schema.optional(),
  provenance: z.array(evidence35Schema).min(1),
  issues: z.array(z.string()),
});
export type CharacterSheet35 = z.infer<typeof characterSheet35Schema>;
export const characterOverlay35Schema = z.strictObject({
  kind: z.literal('birthright15-characters'),
  version: z.enum(['1.0.0', '1.1.0', '1.2.0']),
  canonicalization: z.literal('sorted-json-v1'),
  scenarioFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  sources: z.array(z.strictObject({ id: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) })),
  records: z.array(characterSheet35Schema),
});
export type CharacterOverlay35 = z.infer<typeof characterOverlay35Schema>;
export const handlerOverlay35Schema = z.strictObject({
  kind: z.literal('birthright15-handlers'),
  version: z.enum(['1.0.0', '1.1.0', '1.2.0']),
  canonicalization: z.literal('sorted-json-v1'),
  scenarioFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  characters: derivedOverlaySchema,
  records: z.array(
    z.strictObject({
      realmId: z.string(),
      characterId: z.string(),
      authority: z.enum(['ruler', 'lieutenant']),
      validFromTurn: nat.positive(),
      validThroughTurn: nat.positive().nullable(),
      review: z.enum(['evidence-checked', 'requires-review']),
      evidence: z.enum(['scenario-ruler', 'candidate-deployment']),
    }),
  ),
});
export type HandlerOverlay35 = z.infer<typeof handlerOverlay35Schema>;
export type CharacterOverlays35 = {
  characters: CharacterOverlay35 | null;
  handlers: HandlerOverlay35 | null;
};
export const references35 = (bundle: CharacterOverlays35): DomainOverlays => ({
  characters: bundle.characters
    ? { version: bundle.characters.version, fingerprint: overlayFingerprint(bundle.characters) }
    : null,
  handlers: bundle.handlers
    ? { version: bundle.handlers.version, fingerprint: overlayFingerprint(bundle.handlers) }
    : null,
});
export function character35(overlay: CharacterOverlay35, id: string): CharacterSheet35 {
  const sheet = overlay.records.find((r) => r.id === id);
  if (!sheet) throw new Error(`Missing character overlay: ${id}`);
  return sheet;
}
export function skillRanks35(sheet: CharacterSheet35): Record<string, number> {
  if (sheet.exceptionalProfile?.monsterSheet)
    return spiderRanks35(sheet.exceptionalProfile.monsterSheet);
  const ranks: Record<string, number> = {};
  for (const l of sheet.reconstruction?.levels ?? [])
    for (const p of l.purchases) ranks[p.skill] = (ranks[p.skill] ?? 0) + p.halfRanks;
  return Object.fromEntries(Object.entries(ranks).map(([s, h]) => [s, h / 2]));
}
export function skillCheck35(sheet: CharacterSheet35, skill: string) {
  const monster = sheet.exceptionalProfile?.monsterSheet;
  const s = sheet.reconstruction ?? (monster ? { ...monster, race: 'spider-monster' } : null);
  if (!s || !(skill in SKILLS35) || skill === 'speakLanguage') return null;
  const ranks = skillRanks35(sheet);
  let bonus = abilityModifier35(s.abilities[SKILLS35[skill]!]);
  if (s.feats.some((f) => f.id === 'skillFocus' && f.target === skill)) bonus += 3;
  if (s.feats.some((f) => f.id === 'alertness') && ['listen', 'spot'].includes(skill)) bonus += 2;
  if (
    (s.race === 'cerilian-elf' || s.race === 'cerilian-half-elf') &&
    ['listen', 'search', 'spot'].includes(skill)
  )
    bonus += s.race === 'cerilian-elf' ? 2 : 1;
  if (s.race === 'cerilian-dwarf' && ['swim', 'tumble'].includes(skill)) bonus -= 4;
  if (monster && skill === 'hide') bonus -= 4; // Large creature.
  if (monster && skill === 'climb') bonus += 8; // SRD climb-speed racial bonus.
  if (monster && skill === 'jump') bonus += Math.floor((monster.groundSpeed - 30) / 10) * 4;
  // PHB synergies applicable to this bounded skill catalog. Situational synergies stay conditional.
  const synergy: Record<string, string[]> = {
    lead: ['diplomacy'],
    diplomacy: ['bluff', 'senseMotive', 'knowledge:nobility'],
    intimidate: ['bluff'],
    sleightOfHand: ['bluff'],
    spellcraft: ['knowledge:arcana'],
    balance: ['tumble'],
    jump: ['tumble'],
    tumble: ['jump'],
  };
  for (const source of synergy[skill] ?? []) if ((ranks[source] ?? 0) >= 5) bonus += 2;
  return {
    ranks: ranks[skill] ?? 0,
    unconditionalBonus: bonus,
    total: (ranks[skill] ?? 0) + bonus,
    conditionalTraits: [
      ...racialTraits35(s.race).filter((t) => t.startsWith('infamy-') || t.includes('stone-metal')),
      ...(skill === 'useMagicDevice' &&
      ((ranks.spellcraft ?? 0) >= 5 || (ranks.decipherScript ?? 0) >= 5)
        ? ['scroll-use-synergy-only']
        : []),
    ],
    // Armor, tools, spells and inventory bonuses are not inferred from item IDs.
    equipmentBonusesVerified: false as const,
  };
}
export function rating35(
  sheet: CharacterSheet35,
  kind: 'province' | 'law' | 'guild' | 'temple' | 'source',
) {
  const s = sheet.reconstruction ?? sheet.exceptionalProfile?.monsterSheet;
  if (!s) return null;
  const r = skillRanks35(sheet),
    sum = (skills: string[]) => skills.reduce((n, s) => n + (r[s] ?? 0), 0);
  const raw =
    kind === 'province'
      ? sum(['diplomacy', 'warcraft'])
      : kind === 'law'
        ? sum(['lead', 'warcraft'])
        : kind === 'temple'
          ? sum(['knowledge:religion', 'lead'])
          : kind === 'source'
            ? sum(['knowledge:arcana', 'knowledge:nature'])
            : sum([
                'appraise',
                'bluff',
                s.guildCraft,
                'diplomacy',
                'gatherInformation',
                'intimidate',
                s.guildProfession,
                'senseMotive',
              ]) / 4;
  const bracket = Math.floor(raw),
    percent = ratingPercent35(raw);
  return { raw, bracket, percent, review: sheet.review };
}
/** Shared bracket lookup for ratings and persisted RP entitlement validation. */
export function ratingPercent35(raw: number): number {
  if (!Number.isFinite(raw) || raw < 0) throw new Error('Invalid Regency rating');
  const bracket = Math.floor(raw);
  return bracket <= 5 ? 0 : bracket >= 10 ? 100 : (bracket - 5) * 20;
}
export function eligibleRating35(sheet: CharacterSheet35, kind: Parameters<typeof rating35>[1]) {
  const rating = rating35(sheet, kind),
    magic = casting35(sheet);
  if (!rating) return { eligible: false, percent: 0, reason: 'missing-skill-ledger' };
  if (!magic.approved) return { eligible: false, percent: 0, reason: 'unreviewed-sheet' };
  if (sheet.bloodline.score === 0) return { eligible: false, percent: 0, reason: 'unblooded' };
  if (
    (kind === 'source' && !magic.sourceRealmMagic) ||
    (kind === 'temple' && !magic.templeRealmMagic)
  )
    return { eligible: false, percent: 0, reason: 'spellcasting-gate' };
  return { eligible: true, percent: rating.percent, reason: 'qualified', rating };
}
/** One final floor after summing holding entitlements. No campaign mutation or collection. */
export function wholeRatedRP35(
  entitlements: readonly { levels: bigint; percent: number }[],
): bigint {
  let numerator = 0n;
  for (const e of entitlements) {
    if (e.levels < 0n || ![0, 20, 40, 60, 80, 100].includes(e.percent))
      throw new Error('Invalid RP entitlement');
    numerator += e.levels * BigInt(e.percent);
  }
  return numerator / 100n;
}
export function casting35(sheet: CharacterSheet35) {
  const s = sheet.reconstruction;
  const levels: Record<string, number> = {};
  for (const l of s?.levels ?? []) levels[l.classId] = (levels[l.classId] ?? 0) + 1;
  const allocatedWizard = levels.wizard ?? 0;
  const wizard = sheet.exceptionalProfile?.progression.effectiveWizardLevel ?? allocatedWizard,
    cleric = levels.cleric ?? 0,
    ranger = levels.ranger ?? 0,
    paladin = levels.paladin ?? 0,
    bard = levels.bard ?? 0;
  const int = s?.abilities.intelligence ?? 0,
    wis = s?.abilities.wisdom ?? 0,
    cha = s?.abilities.charisma ?? 0;
  // A 4th-level paladin/ranger has zero base 1st-level slots, but may gain a Wis bonus slot.
  const minorDivine = (l: number) => l >= 4 && wis >= 11 && (l >= 6 || wis >= 12);
  const divine =
    s?.divineStanding === 'active' &&
    ((cleric >= 1 && wis >= 11) || minorDivine(ranger) || minorDivine(paladin));
  const blooded = sheet.bloodline.score > 0;
  const trueArcane = wizard >= 1 && int >= 11 && blooded;
  const effectiveLevels = { ...levels, ...(wizard ? { wizard } : {}) };
  return {
    trueArcaneFirst: trueArcane,
    divineFirst: divine,
    sourceRealmMagic: trueArcane,
    templeRealmMagic: blooded && divine,
    approved: sheet.completion === 'complete' && sheet.review === 'authored-checked',
    classes: Object.entries(effectiveLevels)
      .filter(([c]) => ['wizard', 'cleric', 'ranger', 'paladin', 'bard', 'magician'].includes(c))
      .map(([classId, level]) => ({
        classId,
        level,
        allocationLevel: levels[classId] ?? 0,
        progression:
          classId === 'wizard' && wizard !== allocatedWizard
            ? 'sierra-effective-casting'
            : 'class-ledger',
        casterLevel:
          classId === 'ranger' || classId === 'paladin'
            ? level >= 4
              ? Math.floor(level / 2)
              : 0
            : level,
        maximumSpellLevel:
          classId === 'wizard'
            ? Math.max(0, Math.min(9, Math.ceil(level / 2), int - 10))
            : classId === 'cleric'
              ? Math.max(0, Math.min(9, Math.ceil(level / 2), wis - 10))
              : classId === 'bard'
                ? Math.max(
                    0,
                    ...spellSlots35(classId, level, cha)
                      .filter((s) => s.total > 0)
                      .map((s) => s.spellLevel),
                  )
                : classId === 'ranger' || classId === 'paladin'
                  ? minorDivine(level)
                    ? Math.min(level >= 14 ? 4 : level >= 11 ? 3 : level >= 8 ? 2 : 1, wis - 10)
                    : 0
                  : 0,
        access:
          classId === 'wizard'
            ? wizard !== allocatedWizard
              ? 'effective-casting; recovered inventory and allocated spellbook only; further acquisitions unknown'
              : 'authored-spellbook'
            : classId === 'bard' || classId === 'magician'
              ? 'lesser-magic-only'
              : 'divine-class-list-and-preparation',
        slots: spellSlots35(
          classId,
          level,
          classId === 'wizard' || classId === 'magician' ? int : classId === 'bard' ? cha : wis,
        ),
      })),
    lesserArcaneOnly: bard > 0 && !wizard,
    knownRealmSpells: [...sheet.knownRealmSpells],
    sierraSpellEntitlement: sheet.sierraSpellEntitlement ?? null,
    evidence: sheet.provenance.filter((p) =>
      p.paths.some(
        (path) =>
          path.startsWith('reconstruction') || path === 'original' || path === 'knownRealmSpells',
      ),
    ),
  };
}
export function derivedSheet35(sheet: CharacterSheet35) {
  const s = sheet.reconstruction;
  const monster = sheet.exceptionalProfile?.monsterSheet;
  if (monster)
    return {
      ...deriveSpider35(monster),
      exceptionalProfile: sheet.exceptionalProfile ?? null,
      combatReadiness: 'validated-authored-data; tactical execution deferred',
      casting: casting35(sheet),
      equipment: 'original IDs retained; unverified bonuses excluded',
      bloodline: sheet.bloodline,
      scionConditionalBenefits: {
        bloodlineScoreBonusAlreadyEmbedded: true,
        leadershipBonus: 0,
        seasonalBonusHP: 'not activated',
        bloodAbilities: 'original identities retained; no powers inferred from grade',
      },
    };
  if (!s) return null;
  let hp = s.levels.reduce(
    (n, l) => n + Math.max(1, l.hpRoll + abilityModifier35(s.abilities.constitution)),
    0,
  );
  if (s.feats.some((f) => f.id === 'toughness')) hp += 3;
  const levels: Record<string, number> = {};
  for (const l of s.levels) levels[l.classId] = (levels[l.classId] ?? 0) + 1;
  return {
    level: s.levels.length,
    exceptionalProfile: sheet.exceptionalProfile ?? null,
    combatReadiness: sheet.exceptionalProfile
      ? 'allocation-ledger-only; exceptional combat deferred'
      : 'derived',
    classLevels: levels,
    abilities: s.abilities,
    modifiers: Object.fromEntries(ABILITIES35.map((a) => [a, abilityModifier35(s.abilities[a])])),
    hp,
    hitDice: s.levels.map((l) => CLASSES35[l.classId]!.hd),
    combat: derivedCombat35(s.levels, s.abilities, s.feats, s.race),
    ranks: skillRanks35(sheet),
    traits: racialTraits35(s.race),
    features: Object.entries(levels).flatMap(([c, l]) =>
      (CLASS_FEATURES35[c] ?? []).filter((f) => !f.includes('@') || Number(f.split('@')[1]) <= l),
    ),
    casting: casting35(sheet),
    classBonusFeats:
      (levels.ranger ?? 0) > 0
        ? [
            { id: 'track', level: 1, conditional: false },
            { id: 'rapidShot', level: 2, conditional: true },
            { id: 'endurance', level: 3, conditional: false },
            { id: 'manyshot', level: 6, conditional: true },
            { id: 'improvedPreciseShot', level: 11, conditional: true },
          ]
            .filter((f) => f.level <= (levels.ranger ?? 0))
            .map((f) => ({
              ...f,
              grant: 'ranger-class-feature',
              ordinaryPrerequisitesWaived: true,
              armorRestriction: f.conditional ? 'light-or-no-armor' : 'none',
            }))
        : [],
    equipment: 'original inventory IDs retained; unverified bonuses excluded',
    bloodline: sheet.bloodline,
    scionConditionalBenefits: {
      bloodlineScoreBonusAlreadyEmbedded: true,
      leadershipBonus:
        Math.min(2, s.levels.filter((l) => l.classId.startsWith('scion:')).length) * 2,
      seasonalBonusHP: 'not activated; depends on actual RP collections',
      bloodAbilities: 'native IDs only; powers not reconstructed from grade',
    },
  };
}

export function validateReconstruction35(sheet: CharacterSheet35): string[] {
  const errors: string[] = [],
    s = sheet.reconstruction;
  if (sheet.exceptionalProfile?.monsterSheet) {
    if (
      sheet.id !== 'anuire-regent-057' ||
      sheet.exceptionalProfile.kind !== 'spider' ||
      s !== null
    )
      return [
        'Racial monster ledger is authorized only for Spider057 without ordinary class levels',
      ];
    if (sheet.completion !== 'complete' || sheet.review !== 'authored-checked')
      return ['Monster ledger lacks review'];
    return validateSpider35(sheet.exceptionalProfile.monsterSheet);
  }
  if (!s) {
    if (
      !(
        sheet.id === 'anuire-regent-057' &&
        sheet.exceptionalProfile?.kind === 'spider' &&
        sheet.completion === 'complete' &&
        sheet.review === 'authored-checked'
      ) &&
      (sheet.completion !== 'unresolved' || sheet.review !== 'unresolved')
    )
      errors.push('Missing sheet must be unresolved');
    return errors;
  }
  if (s.feats.some((f) => f.level > s.levels.length))
    errors.push('Feat granted beyond character level');
  if (sheet.completion === 'complete' && sheet.review !== 'authored-checked')
    errors.push('Complete sheet lacks allocation review');
  const abilities = { ...s.baseAbilities },
    ranks: Record<string, number> = {},
    counts: Record<string, number> = {},
    previous: string[] = [];
  const human = s.race.startsWith('human-');
  const scions = s.levels.filter((l) => l.classId.startsWith('scion:'));
  const needed =
    sheet.bloodline.grade === 'major'
      ? 1
      : ['great', 'true'].includes(sheet.bloodline.grade)
        ? 2
        : 0;
  if (
    scions.length !== needed ||
    scions.some((l) => l.classId !== `scion:${sheet.bloodline.derivation}`)
  )
    errors.push('Scion level/derivation mismatch');
  const choiceCount = ['Azrai', 'Brenna'].includes(sheet.bloodline.derivation) ? 2 : 1;
  if (
    needed &&
    (s.scionChoices.length !== choiceCount ||
      new Set(s.scionChoices).size !== choiceCount ||
      s.scionChoices.some((c) =>
        CLASSES35[`scion:${sheet.bloodline.derivation}`]?.skills.includes(c),
      ))
  )
    errors.push('Invalid chosen scion skills');
  if (!(s.guildCraft in SKILLS35) || !(s.guildProfession in SKILLS35))
    errors.push('Unknown guild specialty');
  const awarded = new Set<string>();
  s.levels.forEach((l, i) => {
    const level = i + 1,
      c = CLASSES35[l.classId]!;
    if ((level % 4 === 0) !== (l.abilityIncrease !== null))
      errors.push(`Ability increase at level ${level}`);
    if (l.abilityIncrease) abilities[l.abilityIncrease]++;
    if (l.hpRoll > c.hd || (i === 0 && l.hpRoll !== c.hd)) errors.push(`HP roll at level ${level}`);
    counts[l.classId] = (counts[l.classId] ?? 0) + 1;
    previous.push(l.classId);
    const classLevel = counts[l.classId]!;
    if (l.classId === 'paladin' && s.alignment !== 'LG') errors.push('Paladin must be lawful good');
    if (
      l.classId === 'paladin' &&
      previous.slice(0, -1).includes('paladin') &&
      previous.slice(previous.indexOf('paladin'), -1).some((c) => c !== 'paladin')
    )
      errors.push('Paladin advancement after multiclass departure');
    if (l.classId === 'bard' && s.alignment.startsWith('L')) errors.push('Bard must be nonlawful');
    const budget =
      Math.max(1, c.points + abilityModifier35(abilities.intelligence)) * (i === 0 ? 4 : 1) +
      (human ? (i === 0 ? 4 : 1) : 0);
    let cost = 0,
      cultural = 0;
    for (const p of l.purchases) {
      const isClass = classSkill35(p.skill, l.classId, previous, s.race, s.scionChoices, s.domains);
      if (isClass && p.halfRanks % 2 !== 0)
        errors.push(`Fractional class-skill purchase at ${level}`);
      const spent = isClass ? p.halfRanks / 2 : p.halfRanks;
      cost += spent;
      if (culturalSkills35(s.race).includes(p.skill)) cultural += spent;
      ranks[p.skill] = (ranks[p.skill] ?? 0) + p.halfRanks;
      const everClass = previous.some((c) =>
        classSkill35(p.skill, c, previous, s.race, s.scionChoices, s.domains),
      );
      if (ranks[p.skill]! > (level + 3) * (everClass ? 2 : 1))
        errors.push(`Rank cap ${p.skill} at ${level}`);
    }
    if (cost !== budget) errors.push(`Skill budget ${cost}/${budget} at level ${level}`);
    if (human && cultural < (i === 0 ? 4 : 1))
      errors.push(`Cultural skill-point allocation at ${level}`);
    const expected = ['general', ...(human && i === 0 ? ['human'] : [])].filter(
      (g) => g !== 'general' || i === 0 || level % 3 === 0,
    );
    if (l.classId === 'fighter' && (classLevel === 1 || classLevel % 2 === 0))
      expected.push('fighter');
    if (l.classId === 'wizard' && classLevel === 1) expected.push('scribeScroll');
    if (l.classId === 'wizard' && classLevel % 5 === 0) expected.push('wizard');
    if (l.classId === 'scion:Azrai' && classLevel === 1) expected.push('scion:Azrai');
    const given = s.feats.filter((f) => f.level === level);
    if (
      expected.sort().join('|') !==
      given
        .map((f) => f.grant)
        .sort()
        .join('|')
    )
      errors.push(`Feat grants at level ${level}`);
    for (const f of given) {
      const rule = FEATS35[f.id as keyof typeof FEATS35];
      const key = f.id + ':' + (f.target ?? '');
      if (awarded.has(key)) errors.push(`Duplicate feat ${key}`);
      awarded.add(key);
      if (f.id === 'skillFocus' && (!f.target || !(f.target in SKILLS35)))
        errors.push('Skill Focus needs a real specialty');
      if (
        f.id === 'spellFocus' &&
        ![
          'abjuration',
          'conjuration',
          'divination',
          'enchantment',
          'evocation',
          'illusion',
          'necromancy',
          'transmutation',
        ].includes(f.target ?? '')
      )
        errors.push('Spell Focus school');
      if (
        f.id === 'weaponFocus' &&
        (!['longsword', 'longbow', 'dagger', 'heavy-mace'].includes(f.target ?? '') ||
          derivedCombat35(s.levels.slice(0, level), abilities, [], s.race).baseAttack < 1 ||
          !(counts.fighter ?? 0))
      )
        errors.push('Weapon Focus proficiency/BAB prerequisite');
      if (!['skillFocus', 'spellFocus', 'weaponFocus'].includes(f.id) && f.target !== null)
        errors.push('Unexpected feat target');
      if ('ability' in rule && abilities[rule.ability as keyof Abilities35] < rule.minimum)
        errors.push(`Feat prerequisite ${key}`);
      if (
        'caster' in rule &&
        !['wizard', 'cleric', 'bard', 'magician'].some((c) => (counts[c] ?? 0) > 0) &&
        !['ranger', 'paladin'].some((c) => (counts[c] ?? 0) >= 4)
      )
        errors.push(`Caster prerequisite ${key}`);
      if (f.grant === 'fighter' && !('fighter' in rule))
        errors.push(`Not a fighter bonus feat: ${key}`);
      if (
        f.grant === 'wizard' &&
        !['extendSpell', 'silentSpell', 'stillSpell', 'empowerSpell', 'quickenSpell'].includes(f.id)
      )
        errors.push(`Not a wizard bonus feat: ${key}`);
      if (f.grant === 'scribeScroll' && f.id !== 'scribeScroll')
        errors.push('Missing Scribe Scroll');
    }
  });
  if (ABILITIES35.some((a) => abilities[a] !== s.abilities[a] || s.baseAbilities[a] < 1))
    errors.push('Final abilities do not match advancement ledger');
  if (
    s.levels.some((l) => l.classId === 'cleric') &&
    (!s.deity || s.domains.length !== 2 || new Set(s.domains).size !== 2)
  )
    errors.push('Cleric deity/domains missing');
  if (s.levels.some((l) => l.classId === 'cleric')) {
    const deity = DEITIES35[s.deity ?? ''];
    if (!deity || s.domains.some((d) => !deity.domains.includes(d)))
      errors.push('Invalid deity domain');
    const axes = (alignment: string) => [
      alignment[0] === 'L' ? 1 : alignment[0] === 'C' ? -1 : 0,
      alignment.endsWith('G') ? 1 : alignment.endsWith('E') ? -1 : 0,
    ];
    const a = axes(s.alignment),
      b = axes(s.sectDoctrine?.alignment ?? deity?.alignment ?? 'TN'),
      patron = axes(deity?.alignment ?? 'TN');
    if (s.sectDoctrine && Math.abs(b[0]! - patron[0]!) + Math.abs(b[1]! - patron[1]!) > 1)
      errors.push('Sect doctrine/patron conflict');
    if (
      s.divineStanding === 'active' &&
      (Math.abs(a[0]! - b[0]!) + Math.abs(a[1]! - b[1]!) > 1 ||
        (s.alignment === 'TN' && (s.sectDoctrine?.alignment ?? deity?.alignment) !== 'TN'))
    )
      errors.push('Active cleric alignment/deity conflict');
    if (
      s.domains.some(
        (d) =>
          ['Law', 'Chaos', 'Good', 'Evil'].includes(d) &&
          !s.alignment.includes({ Law: 'L', Chaos: 'C', Good: 'G', Evil: 'E' }[d]!),
      ) &&
      s.divineStanding === 'active'
    )
      errors.push('Alignment domain restriction');
  }
  if (s.divineStanding === 'unconfirmed' && sheet.completion !== 'provisional')
    errors.push('Unconfirmed divine standing must be provisional');
  const wizardCount = s.levels.filter((l) => l.classId === 'wizard').length;
  if (wizardCount) {
    const seen = new Set<string>();
    let wizardLevel = 0;
    s.levels.forEach((l, i) => {
      if (l.classId !== 'wizard') return;
      wizardLevel++;
      const spells = s.spellbook.filter((p) => p.learnedAt === i + 1);
      if (
        spells.length !==
        (wizardLevel === 1
          ? 3 +
            Math.max(
              0,
              abilityModifier35(
                s.baseAbilities.intelligence +
                  s.levels.slice(0, i + 1).filter((l) => l.abilityIncrease === 'intelligence')
                    .length,
              ),
            )
          : 2)
      )
        errors.push(`Wizard spellbook budget at ${i + 1}`);
      for (const spell of spells) {
        if (
          seen.has(spell.spell) ||
          spell.spellLevel < 1 ||
          spell.spellLevel > Math.min(9, Math.ceil(wizardLevel / 2)) ||
          !WIZARD_ACQUISITIONS35[spell.spellLevel]?.includes(spell.spell)
        )
          errors.push(`Spellbook access ${spell.spell}`);
        seen.add(spell.spell);
      }
    });
    if (s.spellbook.some((p) => s.levels[p.learnedAt - 1]?.classId !== 'wizard'))
      errors.push('Spellbook acquisition without wizard advancement');
  } else if (s.spellbook.length) errors.push('Spellbook without wizard');
  const bardLevel = s.levels.filter((l) => l.classId === 'bard').length;
  if (bardLevel) {
    // The original roster has one bard, level 4. Other levels need their known-spell table.
    const known = bardLevel === 4 ? [6, 3, 2] : null;
    if (!known) errors.push('Unsupported bard known-spell advancement');
    else
      for (let spellLevel = 0; spellLevel < known.length; spellLevel++)
        if (
          s.spontaneousSpells.filter((p) => p.spellLevel === spellLevel).length !==
          known[spellLevel]
        )
          errors.push(`Bard spells known at spell level ${spellLevel}`);
    if (
      s.spontaneousSpells.some(
        (p) => p.spellLevel > 2 || !BARD_KNOWN35[p.spellLevel]?.includes(p.spell),
      ) ||
      new Set(s.spontaneousSpells.map((p) => p.spell)).size !== s.spontaneousSpells.length
    )
      errors.push('Invalid bard spells known');
    if (
      s.spontaneousSpells.some(
        (p) =>
          !spellSlots35('bard', bardLevel, s.abilities.charisma).some(
            (slot) => slot.spellLevel === p.spellLevel && slot.total > 0,
          ),
      )
    )
      errors.push('Bard known-spell bonus-slot requirement');
  } else if (s.spontaneousSpells.length) errors.push('Spontaneous spells without bard');
  return errors;
}

/** Validate supplied content, not merely self-declared metadata. No overlay replacement. */
export function validateCharacterOverlays35(
  bundle: CharacterOverlays35,
  scenario: Scenario,
  expected?: DomainOverlays,
): void {
  const chars = bundle.characters ? characterOverlay35Schema.parse(bundle.characters) : null;
  const handlers = bundle.handlers ? handlerOverlay35Schema.parse(bundle.handlers) : null;
  const actual = references35({ characters: chars, handlers });
  if (expected && canonicalOverlayJSON(actual) !== canonicalOverlayJSON(expected))
    throw new Error('Birthright 1.5 overlay content/version/fingerprint mismatch');
  for (const content of [chars, handlers])
    if (content && content.scenarioFingerprint !== scenario.fingerprint)
      throw new Error('Overlay requires the same scenario dataset');
  if (
    handlers &&
    (!chars ||
      canonicalOverlayJSON(handlers.characters) !== canonicalOverlayJSON(actual.characters))
  )
    throw new Error('Handler overlay requires its exact character overlay');
  if (chars) {
    const originals = scenario.regents ?? [];
    if (
      chars.records.length !== originals.length ||
      new Set(chars.records.map((r) => r.id)).size !== originals.length
    )
      throw new Error('Character overlay ID coverage mismatch');
    for (const sheet of chars.records) {
      if (
        chars.version === '1.0.0' &&
        (sheet.exceptionalProfile ||
          sheet.sierraSpellEntitlement ||
          sheet.reconstruction?.sectDoctrine)
      )
        throw new Error('Overlay 1.0.0 cannot contain release 1.1 capabilities');
      const special = sheet.exceptionalProfile;
      if (special?.monsterSheet && (chars.version !== '1.2.0' || sheet.id !== 'anuire-regent-057'))
        throw new Error(
          'Spider racial sheet requires overlay release1.2.0 and original057 identity',
        );
      if (chars.version === '1.2.0' && sheet.id === 'anuire-regent-057' && !special?.monsterSheet)
        throw new Error('Overlay1.2.0 requires the completed Spider racial sheet');
      if (special) {
        if (
          special.virtualGuildHandler &&
          (sheet.id !== 'anuire-regent-057' || special.kind !== 'spider')
        )
          throw new Error('Unapproved exceptional virtual Guild handler');
        const policy: Record<string, [string, number, number | null, number | null]> = {
          'anuire-regent-017': ['chimaera', 13, null, 13],
          'anuire-regent-033': ['gorgon', 25, 25, 16],
          'anuire-regent-051': ['rhuobhe', 16, 16, 15],
          'anuire-regent-057': ['spider', special.monsterSheet ? 13 : 0, null, null],
        };
        const p = policy[sheet.id],
          progress = special.progression;
        if (
          !p ||
          special.kind !== p[0] ||
          progress.allocationLevels !== p[1] ||
          progress.effectiveMartialLevel !== p[2] ||
          progress.effectiveWizardLevel !== p[3] ||
          (special.monsterSheet?.racialHD.length ?? sheet.reconstruction?.levels.length ?? 0) !==
            p[1] ||
          progress.model !==
            (special.kind === 'spider' ? 'sierra-monster' : 'sierra-parallel-capabilities') ||
          progress.monsterLevel !== (special.kind === 'spider' ? 13 : null) ||
          special.derivedBloodlineGrade !== (special.kind === 'spider' ? 'true' : null)
        )
          throw new Error(`Unsupported exceptional profile: ${sheet.id}`);
        if (
          special.kind === 'spider' &&
          (sheet.reconstruction !== null ||
            canonicalOverlayJSON(progress.monsterHitDice) !==
              canonicalOverlayJSON({ number: 13, die: 8, bonus: 0 }))
        )
          throw new Error(
            'Spider must retain the Sierra monster profile without fabricated abilities',
          );
      }
      const entitlement = sheet.sierraSpellEntitlement;
      if (
        entitlement &&
        (sheet.id !== 'anuire-regent-057' ||
          special?.kind !== 'spider' ||
          entitlement.effectiveCastingLevel !== 13 ||
          !sheet.inventory.verified ||
          entitlement.inventory.member !== 'SCENES/ID1056.INV' ||
          entitlement.inventory.sha256 !==
            'ebc621b97670f8eab8c3dce6286ee1bf184657d28dd21c9b00b498ddcb916de5' ||
          canonicalOverlayJSON(entitlement.spells) !==
            canonicalOverlayJSON(SPIDER_SIERRA_SPELLS35) ||
          entitlement.spells.some((s) => !sheet.inventory.itemIds.includes(s.originalItemId)))
      )
        throw new Error('Unsupported Sierra monster spell entitlement');
      if (special?.kind === 'spider' && !entitlement)
        throw new Error('Reviewed Spider profile requires every original Sierra spell');
      if (special?.kind === 'spider' && !special.virtualGuildHandler)
        throw new Error('Reviewed Spider profile requires the approved virtual Guild entitlement');
      if (sheet.reconstruction?.sectDoctrine) {
        const allowed: Record<string, [string, string]> = {
          'anuire-regent-082': ['Sera', 'TN'],
          'anuire-regent-084': ['Cuiraecen', 'NG'],
          'anuire-regent-091': ['Sera', 'TN'],
        };
        const rule = allowed[sheet.id],
          s = sheet.reconstruction;
        if (!rule || s.deity !== rule[0] || s.sectDoctrine!.alignment !== rule[1])
          throw new Error('Unapproved sect doctrine');
      }
      const native = originals.find((r) => r.id === sheet.id);
      if (
        !native ||
        native.name !== sheet.name ||
        canonicalOverlayJSON(native.original) !== canonicalOverlayJSON(sheet.original)
      )
        throw new Error(`Character source identity mismatch: ${sheet.id}`);
      if (
        sheet.bloodline.score !== native.bloodline.strength ||
        sheet.bloodline.derivation !== native.bloodline.derivation ||
        sheet.bloodline.grade !==
          (special?.derivedBloodlineGrade ?? GRADES35[native.bloodline.grade ?? -1]) ||
        canonicalOverlayJSON(sheet.bloodline.abilities) !==
          canonicalOverlayJSON(native.bloodline.abilities)
      )
        throw new Error(`Character bloodline mismatch: ${sheet.id}`);
      if (
        sheet.inventory.verified !== (native.inventoryVerified ?? false) ||
        canonicalOverlayJSON(sheet.inventory.itemIds.map((id) => `original-item-${id}`)) !==
          canonicalOverlayJSON(native.inventory)
      )
        throw new Error(`Character inventory mismatch: ${sheet.id}`);
      const known = PC_REALM_SPELLS.filter((s) =>
        sheet.inventory.itemIds.includes(s.originalItemId!),
      ).map((s) => s.id);
      if (canonicalOverlayJSON(sheet.knownRealmSpells) !== canonicalOverlayJSON(known))
        throw new Error(`Recovered realm spell inventory mismatch: ${sheet.id}`);
      const identity = sheet.original.identity as
        | {
            attributes?: Abilities35;
            alignment?: number;
            classes?: { classCode: number; level: number; experience: number }[];
          }
        | undefined;
      if (
        sheet.inventory.avatarId !== sheet.original.avatarId ||
        canonicalOverlayJSON(sheet.inventory.avaClasses) !==
          canonicalOverlayJSON(identity?.classes ?? [])
      )
        throw new Error(`Character AVA identity mismatch: ${sheet.id}`);
      if (
        sheet.reconstruction &&
        canonicalOverlayJSON(sheet.reconstruction.abilities) !==
          canonicalOverlayJSON(identity?.attributes)
      )
        throw new Error(`Character abilities mismatch: ${sheet.id}`);
      if (sheet.reconstruction) {
        const s = sheet.reconstruction,
          raw = sheet.original;
        if (
          s.alignment !==
          ['unknown', 'LG', 'LN', 'LE', 'NG', 'TN', 'NE', 'CG', 'CN', 'CE'][
            identity?.alignment ?? -1
          ]
        )
          throw new Error(`Character alignment mismatch: ${sheet.id}`);
        if (s.race !== RACES35[Number(raw.raceCode)])
          throw new Error(`Character race mismatch: ${sheet.id}`);
        const nativeClasses = [
          'none',
          'fighter',
          'paladin',
          'ranger',
          'cleric',
          'wizard',
          'rogue',
          'bard',
        ];
        const avaClasses = [
          'fighter',
          'paladin',
          'ranger',
          'cleric',
          'wizard',
          'magician',
          'rogue',
          'bard',
        ];
        const allowed = new Set([
          nativeClasses[Number(raw.classCode)],
          nativeClasses[Number(raw.secondClassCode)],
          ...sheet.inventory.avaClasses.map((c) => avaClasses[c.classCode]),
        ]);
        const maximum = Math.max(
          Number(raw.level ?? 0),
          Number(raw.secondLevel ?? 0),
          ...sheet.inventory.avaClasses.map((c) => c.level),
        );
        if (
          s.levels.length > maximum ||
          s.levels.some((l) => !l.classId.startsWith('scion:') && !allowed.has(l.classId))
        )
          throw new Error(`Unsupported class/level conversion: ${sheet.id}`);
        if (/^unknown$/i.test(sheet.name))
          throw new Error('Unidentified record cannot receive a reconstructed identity');
      }
      const issues = validateReconstruction35(sheet);
      if (issues.length) throw new Error(`${sheet.id}: ${issues.join('; ')}`);
    }
  }
  if (handlers) {
    if (handlers.version !== chars?.version) throw new Error('Overlay release versions must match');
    const keys = new Set<string>();
    for (const h of handlers.records) {
      const key = `${h.realmId}/${h.characterId}/${h.authority}`;
      if (keys.has(key)) throw new Error('Duplicate handler authorization');
      keys.add(key);
      const realm = scenario.realms.find((r) => r.id === h.realmId);
      if (!realm || !chars?.records.some((r) => r.id === h.characterId))
        throw new Error('Unknown handler identity');
      if (h.validThroughTurn !== null && h.validThroughTurn < h.validFromTurn)
        throw new Error('Handler authorization dates');
      const candidate = realmRegentCandidates(scenario, h.realmId).some(
        (r) => r.id === h.characterId,
      );
      if (
        h.evidence === 'scenario-ruler' &&
        (h.authority !== 'ruler' || realm.regent.id !== h.characterId)
      )
        throw new Error('Invalid original ruler authorization');
      if (
        h.evidence === 'candidate-deployment' &&
        (!candidate ||
          !scenario.initial.characters?.some(
            (c) => c.realmId === h.realmId && c.regentId === h.characterId,
          ))
      )
        throw new Error('Invalid deployed candidate authorization');
      if (
        h.review === 'evidence-checked' &&
        !casting35(character35(chars!, h.characterId)).approved
      )
        throw new Error('Unreviewed character handler');
    }
  }
}
export function characterActor35(
  bundle: CharacterOverlays35,
  scenario: Scenario,
  state: Pick<StoredCampaign, 'realms' | 'characters' | 'turn'>,
  realmId: string,
  characterId: string,
) {
  if (!bundle.characters || !bundle.handlers) return { eligible: false, reason: 'missing-overlay' };
  const sheet = character35(bundle.characters, characterId),
    casting = casting35(sheet);
  if (!casting.approved) return { eligible: false, reason: 'character-not-qualified' };
  if (state.realms.find((r) => r.id === realmId)?.eliminated)
    return { eligible: false, reason: 'domain-eliminated' };
  const ruler = rulingRegent(scenario, realmId, state)?.id === characterId;
  const deployment = state.characters?.find(
    (c) => c.regentId === characterId && c.realmId === realmId,
  );
  const authority = ruler ? 'ruler' : deployment?.role === 'lieutenant' ? 'lieutenant' : null;
  if (!authority) return { eligible: false, reason: 'not-authorized-in-domain' };
  // One original person cannot be simultaneously deployed under two independently acting identities.
  if ((state.characters ?? []).filter((c) => c.regentId === characterId).length > 1)
    return { eligible: false, reason: 'duplicate-character-deployment' };
  const entry = bundle.handlers.records.find(
    (h) =>
      h.realmId === realmId &&
      h.characterId === characterId &&
      h.authority === authority &&
      h.review === 'evidence-checked' &&
      h.validFromTurn <= state.turn &&
      (h.validThroughTurn === null || h.validThroughTurn >= state.turn),
  );
  return entry
    ? { eligible: true, reason: 'qualified-named-actor' }
    : { eligible: false, reason: 'missing-reviewed-authorization' };
}
export function sourceHandler35(
  bundle: CharacterOverlays35,
  scenario: Scenario,
  state: Pick<StoredCampaign, 'realms' | 'characters' | 'turn'>,
  realmId: string,
  characterId: string,
) {
  const actor = characterActor35(bundle, scenario, state, realmId, characterId);
  if (!actor.eligible) return actor;
  return virtualGuildHandler35(character35(bundle.characters!, characterId))
    ? actor
    : { eligible: false, reason: 'character-not-qualified' };
}
/** V09 character qualification, including Spider's explicit user-approved exception.
 * This does not grant Source RP, Wizard levels or spells outside his inventory. */
export function virtualGuildHandler35(sheet: CharacterSheet35): boolean {
  const magic = casting35(sheet);
  return (
    magic.approved &&
    (magic.sourceRealmMagic || sheet.exceptionalProfile?.virtualGuildHandler === true)
  );
}

/** Character-side permission only. Requirements are retained, never paid or waived here.
 * Future magic execution must additionally validate resources, holdings, targets and actions. */
export function spellEntitlement35(sheet: CharacterSheet35, spellId: string) {
  const magic = casting35(sheet),
    native = sheet.sierraSpellEntitlement?.spells.find((s) => s.id === spellId),
    realm = PC_REALM_SPELLS.find((s) => s.id === spellId),
    known = sheet.knownRealmSpells.includes(spellId);
  const permission =
    !!native ||
    (!!realm &&
      known &&
      (realm.holding === 'source' ? magic.sourceRealmMagic : magic.templeRealmMagic));
  return {
    eligible: magic.approved && permission,
    basis: native
      ? 'sierra-monster-inventory'
      : permission
        ? 'qualified-class-and-inventory'
        : 'no-entitlement',
    effectiveCastingLevel: native
      ? sheet.sierraSpellEntitlement!.effectiveCastingLevel
      : Math.max(0, ...magic.classes.map((c) => c.casterLevel)),
    originalItemId: native?.originalItemId ?? realm?.originalItemId ?? null,
    scope: native?.scope ?? (realm ? 'realm' : null),
    requirements: realm
      ? {
          contract: 'BIRTHRIGHT_15_RULES_SPEC_V1_1_FINAL:magic',
          holding: realm.holding,
          minimumHoldingLevel: realm.minLevel,
          minimumCasterLevel: realm.casterLevel,
          baseGB: realm.gold,
          baseRP: realm.regency,
          variableCost:
            realm.id === 'death-plague'
              ? 'RP=sum(target province levels)'
              : realm.id === 'mass-destruction'
                ? 'RP=10 per targeted unit'
                : realm.id === 'legion-of-the-dead'
                  ? 'CD help: 1 GB and 4 RP for one skeleton unit; verified unit profile required'
                  : 'spell-specific quote',
          additionalChecks: [
            'casting opportunity/action',
            'actual ruler or authorized lieutenant',
            'own uncontested local holding and sufficient Source/ley access',
            'legal targets and caster-level limits',
            'GB and RP affordability',
            'remote casting surcharge under V10',
            'spell-specific restrictions and supported effect',
          ],
        }
      : native
        ? {
            contract:
              'Sierra RULES.TXT wizard adventure-spell table / future adventure-magic conversion',
            sierraSpellLevel: native.sierraSpellLevel,
            additionalChecks: [
              'spell preparation/usage limits',
              'casting opportunity',
              'components/resources required by the magic contract',
              'range, targets and saving throws',
              'edition-specific effect conversion',
            ],
          }
        : null,
    executionActive: false as const,
  };
}
export function characterSpellAccess35(
  bundle: CharacterOverlays35,
  scenario: Scenario,
  state: Pick<StoredCampaign, 'realms' | 'characters' | 'turn'>,
  realmId: string,
  characterId: string,
  spellId: string,
) {
  const actor = characterActor35(bundle, scenario, state, realmId, characterId);
  const access = bundle.characters
    ? spellEntitlement35(character35(bundle.characters, characterId), spellId)
    : null;
  return {
    actor,
    access,
    eligible: actor.eligible && !!access?.eligible,
    executionActive: false as const,
  };
}
