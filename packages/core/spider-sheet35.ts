/** Reviewed Spider-only racial-HD conversion. Data/derivation, never tactical execution. */
import { z } from 'zod';
import { ABILITIES35, abilityModifier35, SKILLS35 } from './character-rules35';

export const SPIDER_CLASS_SKILLS35 = [
  'warcraft',
  'lead',
  'intimidate',
  'bluff',
  'diplomacy',
  'hide',
  'moveSilently',
  'climb',
  'spot',
  'listen',
  'senseMotive',
  'knowledge:nature',
] as const;
const nat = z.number().int().nonnegative();
const abilities = z.strictObject({
  strength: nat.positive(),
  dexterity: nat.positive(),
  constitution: nat.positive(),
  intelligence: nat.positive(),
  wisdom: nat.positive(),
  charisma: nat.positive(),
});
export const spiderSheet35Schema = z.strictObject({
  policy: z.literal('spider-057-reviewed-racial-skills-v1'),
  creatureType: z.literal('monstrous-humanoid'),
  size: z.literal('large'),
  alignment: z.literal('CE'),
  baseAbilities: abilities,
  abilities,
  racialHD: z
    .array(
      z.strictObject({
        hpRoll: nat.min(1).max(8),
        abilityIncrease: z.enum(ABILITIES35).nullable(),
        purchases: z.array(
          z.strictObject({
            skill: z.string().refine((s) => s in SKILLS35),
            halfRanks: nat.positive(),
          }),
        ),
      }),
    )
    .length(13),
  classSkills: z.array(z.string().refine((s) => s in SKILLS35)),
  feats: z.array(
    z.strictObject({
      id: z.enum(['multiattack', 'abilityFocus', 'improvedInitiative', 'alertness', 'weaponFocus']),
      target: z.string().nullable(),
      hitDie: nat.positive(),
    }),
  ),
  guildCraft: z
    .string()
    .startsWith('craft:')
    .refine((s) => s in SKILLS35),
  guildProfession: z
    .string()
    .startsWith('profession:')
    .refine((s) => s in SKILLS35),
  fixedHP: nat.positive(),
  naturalArmor: nat,
  groundSpeed: nat.positive(),
  climbSpeed: nat.positive(),
  naturalWeapons: z.array(
    z.strictObject({
      id: z.enum(['claw', 'bite']),
      count: nat.positive(),
      primary: z.boolean(),
      dice: nat.positive(),
      die: nat.positive(),
    }),
  ),
  capabilities: z.strictObject({
    poison: z.strictObject({
      kind: z.literal('extraordinary'),
      delivery: z.literal('bite'),
      initialEffect: z.string(),
      secondaryEffect: z.null(),
      source: z.string(),
      conversion: z.string(),
      execution: z.literal('deferred'),
    }),
    web: z.strictObject({
      kind: z.literal('extraordinary'),
      creation: z.boolean(),
      binding: z.string(),
      sourceVolumeFeet: z.tuple([nat, nat, nat]),
      sourceDurationDays: z.tuple([nat, nat]),
      burnable: z.boolean(),
      reflexDC: nat.nullable(),
      escapeArtistDC: nat.nullable(),
      strengthDC: nat.nullable(),
      source: z.string(),
      status: z.literal('conversion-partial'),
      execution: z.literal('deferred'),
    }),
    leap: z.strictObject({
      sourceHighFeet: nat,
      sourceLongFeet: nat,
      sourceResolution: z.string(),
      convertedExceptionalCheck: z.string().nullable(),
      source: z.string(),
      execution: z.literal('deferred'),
    }),
    regeneration: z.strictObject({
      rate: nat.positive(),
      period: z.literal('round'),
      damageModel: z.literal('nonlethal-unless-lethal-exception'),
      lethalExceptions: z.array(z.string()).nullable(),
      sourceFinalDestruction: z.string(),
      source: z.string(),
      status: z.literal('lethal-conversion-provisional'),
      execution: z.literal('deferred'),
    }),
    spiderInfluence: z.strictObject({
      entitlement: z.string(),
      extent: z.literal('unestablished'),
      source: z.string(),
      execution: z.literal('deferred'),
    }),
    fear: z.strictObject({
      originalItemId: z.literal(218),
      kind: z.literal('blood-ability'),
      execution: z.literal('deferred'),
    }),
    spellResistance: z.strictObject({
      sourcePercent: z.literal(15),
      proposedValue: z.literal(17),
      status: z.literal('provisional'),
      reason: z.string(),
      execution: z.literal('deferred'),
    }),
    vulnerableAbdomen: z.strictObject({
      proposedAC: z.literal(16),
      status: z.literal('future-candidate'),
      execution: z.literal('deferred'),
    }),
  }),
  notes: z.array(z.string()),
});
export type SpiderSheet35 = z.infer<typeof spiderSheet35Schema>;

export function spiderRanks35(s: SpiderSheet35): Record<string, number> {
  const half: Record<string, number> = {};
  for (const hd of s.racialHD)
    for (const p of hd.purchases) half[p.skill] = (half[p.skill] ?? 0) + p.halfRanks;
  return Object.fromEntries(Object.entries(half).map(([k, v]) => [k, v / 2]));
}
export function deriveSpider35(s: SpiderSheet35) {
  const hd = s.racialHD.length,
    mod = Object.fromEntries(
      ABILITIES35.map((a) => [a, abilityModifier35(s.abilities[a])]),
    ) as Record<(typeof ABILITIES35)[number], number>;
  const has = (id: string, target: string | null = null) =>
    s.feats.some((f) => f.id === id && f.target === target);
  const sizeAttack = -1,
    sizeGrapple = 4,
    bab = hd;
  const baseSaves = {
    fortitude: Math.floor(hd / 3),
    reflex: 2 + Math.floor(hd / 2),
    will: 2 + Math.floor(hd / 2),
  };
  const naturalAttacks = s.naturalWeapons.flatMap((w) =>
    Array.from({ length: w.count }, () => {
      const secondaryPenalty = w.primary ? 0 : has('multiattack') ? -2 : -5;
      const focus = has('weaponFocus', w.id) ? 1 : 0;
      return {
        weapon: w.id,
        primary: w.primary,
        baseAttack: bab,
        strength: mod.strength,
        size: sizeAttack,
        weaponFocus: focus,
        secondaryPenalty,
        attack: bab + mod.strength + sizeAttack + focus + secondaryPenalty,
        damage: {
          dice: w.dice,
          die: w.die,
          bonus: w.primary ? mod.strength : Math.floor(mod.strength / 2),
        },
        poison: w.id === 'bite',
      };
    }),
  );
  const combat = {
    baseAttack: bab,
    ...baseSaves,
    fortitude: baseSaves.fortitude + mod.constitution,
    reflex: baseSaves.reflex + mod.dexterity,
    will: baseSaves.will + mod.wisdom,
    unarmoredAC: 10 + sizeAttack + mod.dexterity + s.naturalArmor,
    touchAC: 10 + sizeAttack + mod.dexterity,
    flatFootedAC: 10 + sizeAttack + s.naturalArmor,
    initiative: mod.dexterity + (has('improvedInitiative') ? 4 : 0),
    melee: bab + mod.strength + sizeAttack,
    ranged: bab + mod.dexterity + sizeAttack,
    grapple: bab + mod.strength + sizeGrapple,
    sizeAttack,
    sizeGrapple,
    baseSaves,
    naturalAttacks,
    poisonDC: 10 + Math.floor(hd / 2) + mod.constitution + (has('abilityFocus', 'poison') ? 2 : 0),
  };
  return {
    level: hd,
    classLevels: { 'monstrous-humanoid': hd } as Record<string, number>,
    abilities: s.abilities,
    modifiers: mod,
    hp: s.racialHD.reduce((n, h) => n + Math.max(1, h.hpRoll + mod.constitution), 0),
    hitDice: s.racialHD.map(() => 8),
    combat,
    ranks: spiderRanks35(s),
    skillPointBudget: Math.max(1, 2 + mod.intelligence) * (hd + 3),
    traits: [
      'large',
      'darkvision-60ft',
      'natural-weapon-proficiency',
      'simple-weapons',
      'no-armor-proficiency',
      'eat-sleep-breathe',
    ],
    features: Object.keys(s.capabilities),
    classBonusFeats: [] as {
      id: string;
      grant: string;
      level: number;
      armorRestriction: string;
      ordinaryPrerequisitesWaived: boolean;
      conditional: boolean;
    }[],
    movement: { ground: s.groundSpeed, climb: s.climbSpeed },
    capabilities: s.capabilities,
    executionActive: false as const,
  };
}

/** Normal class/cross-class prices and caps, scoped policy only for original character057. */
export function validateSpider35(s: SpiderSheet35): string[] {
  const shape = spiderSheet35Schema.safeParse(s);
  if (!shape.success)
    return shape.error.issues.map(
      (i) => `Invalid Spider racial data ${i.path.join('.')}: ${i.message}`,
    );
  const errors: string[] = [],
    current = { ...s.baseAbilities },
    ranks: Record<string, number> = {};
  if (s.classSkills.join('|') !== SPIDER_CLASS_SKILLS35.join('|'))
    errors.push('Spider class-skill policy mismatch');
  if (new Set(s.classSkills).size !== s.classSkills.length)
    errors.push('Duplicate Spider class skill');
  let totalCost = 0;
  s.racialHD.forEach((h, i) => {
    const hd = i + 1;
    if ((hd % 4 === 0) !== (h.abilityIncrease !== null))
      errors.push(`Spider ability increase at HD${hd}`);
    if (h.abilityIncrease) current[h.abilityIncrease]++;
    const budget = Math.max(1, 2 + abilityModifier35(current.intelligence)) * (hd === 1 ? 4 : 1);
    let cost = 0;
    for (const p of h.purchases) {
      const isClass = s.classSkills.includes(p.skill);
      if (isClass && p.halfRanks % 2) errors.push(`Spider fractional class purchase at HD${hd}`);
      cost += isClass ? p.halfRanks / 2 : p.halfRanks;
      ranks[p.skill] = (ranks[p.skill] ?? 0) + p.halfRanks;
      if (ranks[p.skill]! > (hd + 3) * (isClass ? 2 : 1))
        errors.push(`Spider rank cap ${p.skill} at HD${hd}`);
    }
    if (cost !== budget) errors.push(`Spider skill-point cost ${cost}/${budget} at HD${hd}`);
    totalCost += cost;
  });
  if (ABILITIES35.some((a) => current[a] !== s.abilities[a]))
    errors.push('Spider final abilities differ from HD ledger');
  if (totalCost !== 80) errors.push('Spider allocation must cost exactly80 skill points');
  const hd = s.racialHD.length,
    expected = [1, ...Array.from({ length: Math.floor(hd / 3) }, (_, i) => (i + 1) * 3)];
  if (
    s.feats.length !== expected.length ||
    [...s.feats]
      .map((f) => f.hitDie)
      .sort((a, b) => a - b)
      .join(',') !== expected.join(',')
  )
    errors.push('Spider feat-slot schedule');
  if (new Set(s.feats.map((f) => f.id)).size !== 5)
    errors.push('Spider requires the five reviewed distinct feats');
  const seen = new Set<string>();
  for (const f of [...s.feats].sort((a, b) => a.hitDie - b.hitDie)) {
    const key = `${f.id}:${f.target}`;
    if (seen.has(key)) errors.push('Duplicate Spider feat');
    seen.add(key);
    if (
      f.id === 'multiattack' &&
      (f.target !== null || s.naturalWeapons.reduce((n, w) => n + w.count, 0) < 3)
    )
      errors.push('Multiattack requires three natural attacks');
    if (
      f.id === 'weaponFocus' &&
      (f.target !== 'claw' || !s.naturalWeapons.some((w) => w.id === f.target) || f.hitDie < 1)
    )
      errors.push('Spider Weapon Focus proficiency/BAB/weapon prerequisite');
    if (f.id === 'abilityFocus' && (f.target !== 'poison' || !s.capabilities.poison))
      errors.push('Spider Ability Focus requires Poison');
    if (['alertness', 'improvedInitiative'].includes(f.id) && f.target !== null)
      errors.push('Unexpected Spider feat target');
  }
  const d = deriveSpider35(s);
  if (d.hp !== s.fixedHP)
    errors.push('Spider fixed HP differs from legal racial HD rolls and Constitution');
  if (
    s.naturalWeapons.length !== 2 ||
    !s.naturalWeapons.some(
      (w) => w.id === 'claw' && w.count === 2 && w.primary && w.dice === 1 && w.die === 10,
    ) ||
    !s.naturalWeapons.some(
      (w) => w.id === 'bite' && w.count === 1 && !w.primary && w.dice === 1 && w.die === 6,
    )
  )
    errors.push('Unsupported Spider natural weapon allocation');
  return errors;
}
