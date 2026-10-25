/** Bounded sheet rules, not a combat or advancement engine. BRCS ch1 v1.1;
 * revised ch2 v1.1 scions; 3.5 SRD class/skill/feat tables. */
export const ABILITIES35 = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;
export type Ability35 = (typeof ABILITIES35)[number];
export type Abilities35 = Record<Ability35, number>;
export const abilityModifier35 = (score: number) => Math.floor((score - 10) / 2);
export const SKILLS35: Record<string, Ability35> = {
  administrate: 'wisdom',
  lead: 'charisma',
  warcraft: 'intelligence',
  diplomacy: 'charisma',
  appraise: 'intelligence',
  bluff: 'charisma',
  'craft:weaponsmithing': 'intelligence',
  'craft:alchemy': 'intelligence',
  'craft:stonemasonry': 'intelligence',
  'craft:woodworking': 'intelligence',
  'profession:merchant': 'wisdom',
  'profession:steward': 'wisdom',
  'profession:sailor': 'wisdom',
  'profession:herbalist': 'wisdom',
  'profession:scribe': 'wisdom',
  gatherInformation: 'charisma',
  intimidate: 'charisma',
  senseMotive: 'wisdom',
  'knowledge:arcana': 'intelligence',
  'knowledge:nature': 'intelligence',
  'knowledge:religion': 'intelligence',
  'knowledge:nobility': 'intelligence',
  'knowledge:history': 'intelligence',
  'knowledge:geography': 'intelligence',
  'knowledge:local': 'intelligence',
  'knowledge:planes': 'intelligence',
  concentration: 'constitution',
  spellcraft: 'intelligence',
  ride: 'dexterity',
  handleAnimal: 'charisma',
  survival: 'wisdom',
  heal: 'wisdom',
  listen: 'wisdom',
  spot: 'wisdom',
  search: 'intelligence',
  hide: 'dexterity',
  moveSilently: 'dexterity',
  tumble: 'dexterity',
  balance: 'dexterity',
  jump: 'strength',
  climb: 'strength',
  swim: 'strength',
  useMagicDevice: 'charisma',
  disableDevice: 'intelligence',
  openLock: 'dexterity',
  sleightOfHand: 'dexterity',
  escapeArtist: 'dexterity',
  perform: 'charisma',
  decipherScript: 'intelligence',
  disguise: 'charisma',
  forgery: 'intelligence',
  useRope: 'dexterity',
  speakLanguage: 'intelligence',
};
const crafts = Object.keys(SKILLS35).filter((s) => s.startsWith('craft:'));
const professions = Object.keys(SKILLS35).filter((s) => s.startsWith('profession:'));
const knowledges = Object.keys(SKILLS35).filter((s) => s.startsWith('knowledge:'));
type ClassRule = {
  hd: number;
  points: number;
  bab: 1 | 0.75 | 0.5;
  good: readonly ('fortitude' | 'reflex' | 'will')[];
  skills: string[];
};
export const CLASSES35: Record<string, ClassRule> = {
  fighter: {
    hd: 10,
    points: 2,
    bab: 1,
    good: ['fortitude'],
    skills: [
      'lead',
      'warcraft',
      'climb',
      'handleAnimal',
      'intimidate',
      'jump',
      'ride',
      'swim',
      ...crafts,
    ],
  },
  paladin: {
    hd: 10,
    points: 2,
    bab: 1,
    good: ['fortitude'],
    skills: [
      'lead',
      'concentration',
      'diplomacy',
      'handleAnimal',
      'heal',
      'knowledge:nobility',
      'knowledge:religion',
      'ride',
      'senseMotive',
      ...crafts,
      ...professions,
    ],
  },
  ranger: {
    hd: 8,
    points: 6,
    bab: 1,
    good: ['fortitude', 'reflex'],
    skills: [
      'climb',
      'concentration',
      'handleAnimal',
      'heal',
      'hide',
      'jump',
      'knowledge:geography',
      'knowledge:nature',
      'listen',
      'moveSilently',
      'ride',
      'search',
      'spot',
      'survival',
      'swim',
      'useRope',
      ...crafts,
      ...professions,
    ],
  },
  cleric: {
    hd: 8,
    points: 2,
    bab: 0.75,
    good: ['fortitude', 'will'],
    skills: [
      'administrate',
      'lead',
      'concentration',
      'diplomacy',
      'heal',
      'knowledge:arcana',
      'knowledge:history',
      'knowledge:religion',
      'knowledge:planes',
      'spellcraft',
      ...crafts,
      ...professions,
    ],
  },
  rogue: {
    hd: 6,
    points: 8,
    bab: 0.75,
    good: ['reflex'],
    skills: [
      'administrate',
      'lead',
      'appraise',
      'balance',
      'bluff',
      'climb',
      'decipherScript',
      'diplomacy',
      'disableDevice',
      'disguise',
      'escapeArtist',
      'forgery',
      'gatherInformation',
      'hide',
      'intimidate',
      'jump',
      'knowledge:local',
      'listen',
      'moveSilently',
      'openLock',
      'perform',
      'search',
      'senseMotive',
      'sleightOfHand',
      'spot',
      'swim',
      'tumble',
      'useMagicDevice',
      'useRope',
      ...crafts,
      ...professions,
    ],
  },
  bard: {
    hd: 6,
    points: 6,
    bab: 0.75,
    good: ['reflex', 'will'],
    skills: [
      'lead',
      'appraise',
      'balance',
      'bluff',
      'climb',
      'concentration',
      'decipherScript',
      'diplomacy',
      'disguise',
      'escapeArtist',
      'gatherInformation',
      'hide',
      'jump',
      'listen',
      'moveSilently',
      'perform',
      'senseMotive',
      'sleightOfHand',
      'spellcraft',
      'swim',
      'tumble',
      'useMagicDevice',
      ...knowledges,
      ...crafts,
      ...professions,
    ],
  },
  wizard: {
    hd: 4,
    points: 2,
    bab: 0.5,
    good: ['will'],
    skills: [
      'concentration',
      'decipherScript',
      'spellcraft',
      ...knowledges,
      ...crafts,
      ...professions,
    ],
  },
  magician: {
    hd: 4,
    points: 4,
    bab: 0.5,
    good: ['will'],
    skills: [
      'administrate',
      'appraise',
      'bluff',
      'concentration',
      'diplomacy',
      'disguise',
      'gatherInformation',
      'heal',
      'perform',
      'spellcraft',
      ...knowledges,
      ...crafts,
      ...professions,
    ],
  },
  'scion:Anduiras': {
    hd: 8,
    points: 2,
    bab: 1,
    good: ['fortitude'],
    skills: ['lead', 'knowledge:nobility', 'ride', 'warcraft'],
  },
  'scion:Azrai': {
    hd: 6,
    points: 2,
    bab: 0.5,
    good: ['will'],
    skills: ['bluff', 'gatherInformation', 'intimidate', 'spellcraft', 'warcraft'],
  },
  'scion:Basaia': {
    hd: 8,
    points: 2,
    bab: 0.5,
    good: ['fortitude', 'will'],
    skills: ['diplomacy', 'spot', ...knowledges],
  },
  'scion:Brenna': {
    hd: 8,
    points: 4,
    bab: 0.75,
    good: ['reflex'],
    skills: ['appraise', 'balance', 'bluff', 'senseMotive', 'tumble'],
  },
  'scion:Masela': {
    hd: 8,
    points: 2,
    bab: 0.5,
    good: ['fortitude', 'reflex'],
    skills: ['balance', 'heal', 'profession:sailor', 'swim'],
  },
  'scion:Reynir': {
    hd: 10,
    points: 2,
    bab: 0.5,
    good: ['fortitude'],
    skills: ['handleAnimal', 'knowledge:geography', 'knowledge:nature', 'survival'],
  },
  'scion:Vorynn': {
    hd: 6,
    points: 2,
    bab: 0.5,
    good: ['will'],
    skills: ['concentration', 'spellcraft', 'useMagicDevice', ...knowledges],
  },
};
export const DERIVATIONS35 = [
  'Anduiras',
  'Reynir',
  'Brenna',
  'Basaia',
  'Masela',
  'Vorynn',
  'Azrai',
] as const;
export const GRADES35 = ['tainted', 'minor', 'major', 'great', 'true'] as const;
/** Only the authored acquisition catalog, not a substitute spell engine. */
export const WIZARD_ACQUISITIONS35: Record<number, readonly string[]> = {
  1: [
    'magic missile',
    'shield',
    'mage armor',
    'identify',
    'detect secret doors',
    'feather fall',
    'comprehend languages',
    'grease',
    'charm person',
    'sleep',
    'enlarge person',
    'expeditious retreat',
    'obscuring mist',
    'protection from evil',
    'unseen servant',
  ],
  2: [
    'invisibility',
    'mirror image',
    'scorching ray',
    'web',
    'glitterdust',
    'detect thoughts',
    'levitate',
    'resist energy',
    'rope trick',
    'see invisibility',
  ],
  3: [
    'dispel magic',
    'fireball',
    'fly',
    'haste',
    'slow',
    'clairaudience/clairvoyance',
    'protection from energy',
    'nondetection',
  ],
  4: [
    'dimension door',
    'stoneskin',
    'scrying',
    'greater invisibility',
    'ice storm',
    'arcane eye',
    'fear',
    'solid fog',
  ],
  5: [
    'teleport',
    'wall of force',
    'cone of cold',
    'dominate person',
    'overland flight',
    'contact other plane',
  ],
  6: [
    'greater dispel magic',
    'true seeing',
    'disintegrate',
    'contingency',
    'chain lightning',
    'antimagic field',
  ],
  7: [
    'greater teleport',
    'forcecage',
    'spell turning',
    'delayed blast fireball',
    'limited wish',
    'prismatic spray',
  ],
  8: ['mind blank', 'maze', 'greater prying eyes', 'sunburst'],
  9: ['foresight', 'time stop', 'gate', 'wish'],
};
export const BARD_KNOWN35: Record<number, readonly string[]> = {
  0: ['detect magic', 'read magic', 'light', 'mage hand', 'message', 'prestidigitation'],
  1: ['charm person', 'cure light wounds', 'silent image'],
  2: ['invisibility', 'suggestion'],
};
export const DEITIES35: Record<string, { alignment: string; domains: string[] }> = {
  Haelyn: { alignment: 'LG', domains: ['Good', 'Justice', 'Law', 'Nobility', 'War'] },
  Cuiraecen: { alignment: 'CG', domains: ['Chaos', 'Good', 'Strength', 'Storm', 'War'] },
  Ruornil: { alignment: 'TN', domains: ['Knowledge', 'Magic', 'Moon', 'Spell'] },
  Sera: { alignment: 'CN', domains: ['Chaos', 'Luck', 'Trade', 'Travel'] },
  Erik: { alignment: 'TN', domains: ['Animal', 'Earth', 'Plant', 'Wilderness'] },
  Belinik: { alignment: 'CE', domains: ['Chaos', 'Evil', 'Strength', 'Terror', 'War'] },
  Moradin: { alignment: 'LG', domains: ['Earth', 'Good', 'Law', 'Protection'] },
};
export const RACES35 = [
  'cerilian-dwarf',
  'cerilian-elf',
  'cerilian-half-elf',
  'cerilian-halfling',
  'human-anuirean',
  'human-brecht',
  'human-khinasi',
  'human-rjurik',
  'human-vos',
  'goblin-unresolved-subtype',
  'gnoll',
  'awnshegh-unresolved-template',
] as const;
export function culturalSkills35(race: string): string[] {
  if (race === 'human-anuirean') return ['bluff', 'diplomacy', 'senseMotive', 'knowledge:nobility'];
  if (race === 'human-khinasi') return ['diplomacy', 'knowledge:history', 'ride', 'spellcraft'];
  return [];
}
export function classSkill35(
  skill: string,
  current: string,
  previous: string[],
  race: string,
  scionChoices: string[],
  domains: readonly string[] = [],
): boolean {
  return (
    culturalSkills35(race).includes(skill) ||
    !!CLASSES35[current]?.skills.includes(skill) ||
    (current === 'cleric' &&
      ((domains.includes('Knowledge') && skill.startsWith('knowledge:')) ||
        ((domains.includes('Animal') || domains.includes('Plant')) &&
          skill === 'knowledge:nature') ||
        (domains.includes('Travel') && skill === 'survival') ||
        (domains.includes('Trickery') && ['bluff', 'disguise', 'hide'].includes(skill)))) ||
    (previous.some((c) => c.startsWith('scion:')) &&
      (scionChoices.includes(skill) ||
        previous.some((c) => c.startsWith('scion:') && CLASSES35[c]?.skills.includes(skill))))
  );
}
export function racialTraits35(race: string): string[] {
  if (race.startsWith('human-'))
    return [
      'human-bonus-feat',
      'cultural-skill-points',
      'cultural-class-skills',
      ...(race === 'human-anuirean' || race === 'human-khinasi' ? ['will+1'] : []),
    ];
  if (race === 'cerilian-dwarf')
    return [
      'darkvision60',
      'speed20-unencumbered',
      'stonecunning+2',
      'stability+4',
      'poison-save+2',
      'spell-save+2',
      'dodge-vs-orog-ogre+2',
      'stone-metal-appraise-craft+2',
      'DR5/slashing-or-piercing',
      'swim-tumble-4',
      'dwarven-weapons',
    ];
  if (race === 'cerilian-elf')
    return [
      'low-light',
      'sleep-immunity',
      'enchantment-save+2',
      'listen-search-spot+2',
      'infamy-conditional:diplomacy-gather-4:intimidate+4',
      'timeless',
      'disease-immunity',
      'trance',
      'nature-stride',
      'elven-weapons',
    ];
  if (race === 'cerilian-half-elf')
    return [
      'low-light',
      'sleep-immunity',
      'enchantment-save+2',
      'disease-aging-save+2',
      'listen-search-spot+1',
      'infamy-conditional:diplomacy-gather-2:intimidate+2',
      'elven-blood',
    ];
  return ['racial-template-unresolved'];
}
export function derivedCombat35(
  levels: readonly { classId: string }[],
  abilities: Abilities35,
  feats: readonly { id: string }[],
  race: string,
) {
  const counts: Record<string, number> = {};
  for (const l of levels.slice(0, 20)) counts[l.classId] = (counts[l.classId] ?? 0) + 1;
  const epic = Math.max(0, levels.length - 20);
  const bab =
    Object.entries(counts).reduce((n, [c, l]) => n + Math.floor(CLASSES35[c]!.bab * l), 0) +
    Math.ceil(epic / 2);
  const save = (key: 'fortitude' | 'reflex' | 'will', ability: Ability35, feat: string) =>
    Object.entries(counts).reduce(
      (n, [c, l]) =>
        n + (CLASSES35[c]!.good.includes(key) ? 2 + Math.floor(l / 2) : Math.floor(l / 3)),
      0,
    ) +
    Math.floor(epic / 2) +
    abilityModifier35(abilities[ability]) +
    (feats.some((f) => f.id === feat) ? 2 : 0) +
    (key === 'will' && racialTraits35(race).includes('will+1') ? 1 : 0);
  return {
    baseAttack: bab,
    fortitude: save('fortitude', 'constitution', 'greatFortitude'),
    reflex: save('reflex', 'dexterity', 'lightningReflexes'),
    will: save('will', 'wisdom', 'ironWill'),
    unarmoredAC: 10 + abilityModifier35(abilities.dexterity),
    touchAC: 10 + abilityModifier35(abilities.dexterity),
    initiative:
      abilityModifier35(abilities.dexterity) +
      (feats.some((f) => f.id === 'improvedInitiative') ? 4 : 0),
    melee: bab + abilityModifier35(abilities.strength),
    ranged: bab + abilityModifier35(abilities.dexterity),
    grapple: bab + abilityModifier35(abilities.strength),
    iterativeAttackBonuses: Array.from(
      { length: Math.min(4, Math.max(1, Math.ceil(bab / 5))) },
      (_, i) => bab - 5 * i,
    ),
  };
}
export const FEATS35 = {
  improvedInitiative: { fighter: true },
  combatReflexes: { fighter: true },
  blindFight: { fighter: true },
  improvedUnarmedStrike: { fighter: true },
  powerAttack: { fighter: true, ability: 'strength', minimum: 13 },
  combatExpertise: { fighter: true, ability: 'intelligence', minimum: 13 },
  dodge: { fighter: true, ability: 'dexterity', minimum: 13 },
  weaponFocus: { fighter: true },
  ironWill: {},
  greatFortitude: {},
  lightningReflexes: {},
  alertness: {},
  toughness: {},
  skillFocus: {},
  scribeScroll: { caster: true },
  extendSpell: {},
  silentSpell: {},
  stillSpell: {},
  empowerSpell: {},
  quickenSpell: {},
  spellFocus: {},
  spellPenetration: {},
} as const;
export const CLASS_FEATURES35: Record<string, string[]> = {
  'scion:Anduiras': [
    'simple-weapons',
    'light-medium-armor',
    'shields',
    'one-martial-melee-weapon:longsword',
  ],
  'scion:Azrai': ['simple-weapons', 'light-medium-armor', 'chosen-good-save:will', 'dark-taint'],
  'scion:Basaia': ['simple-weapons', 'light-medium-armor', 'shields'],
  'scion:Brenna': ['simple-weapons', 'light-armor'],
  'scion:Masela': ['simple-weapons', 'light-medium-armor', 'shields'],
  'scion:Reynir': ['simple-weapons', 'light-armor', 'shortbow'],
  'scion:Vorynn': ['simple-weapons', 'light-armor', 'scion-cantrip-entitlement'],
  fighter: ['martial-weapons', 'all-armor', 'shields', 'fighter-bonus-feats'],
  paladin: [
    'martial-weapons',
    'all-armor',
    'shields',
    'detect-evil',
    'smite-evil',
    'divine-grace@2',
    'lay-on-hands@2',
    'aura-of-courage@3',
    'turn-undead@4',
    'special-mount@5',
  ],
  ranger: [
    'martial-weapons',
    'light-armor',
    'shields',
    'track@1',
    'wild-empathy@1',
    'combat-style:archery@2',
    'endurance@3',
    'animal-companion@4',
    'improved-style:manyshot@6',
    'woodland-stride@7',
    'swift-tracker@8',
    'evasion@9',
    'greater-style:improved-precise-shot@11',
  ],
  cleric: [
    'simple-weapons',
    'all-armor',
    'shields',
    'turn-or-rebuke-undead',
    'two-domains',
    'spontaneous-cure-or-inflict',
  ],
  rogue: [
    'rogue-weapons',
    'light-armor',
    'sneak-attack',
    'trapfinding',
    'evasion@2',
    'trap-sense@3',
    'uncanny-dodge@4',
    'improved-uncanny-dodge@8',
  ],
  bard: ['bard-weapons', 'light-armor', 'shields', 'bardic-music', 'bardic-knowledge'],
  wizard: ['wizard-weapons', 'scribe-scroll@1', 'familiar-entitlement', 'wizard-bonus-feats'],
  magician: ['lesser-arcane-only', 'magician-spell-access'],
};

// Base slots (domain slots and ability bonuses are separate). Null/absent means
// unavailable; zero permits bonus slots. Index 0 is cantrips/orisons.
const WIZARD_SLOTS35: number[][] = [
  [],
  [3, 1],
  [4, 2],
  [4, 2, 1],
  [4, 3, 2],
  [4, 3, 2, 1],
  [4, 3, 3, 2],
  [4, 4, 3, 2, 1],
  [4, 4, 3, 3, 2],
  [4, 4, 4, 3, 2, 1],
  [4, 4, 4, 3, 3, 2],
  [4, 4, 4, 4, 3, 2, 1],
  [4, 4, 4, 4, 3, 3, 2],
  [4, 4, 4, 4, 4, 3, 2, 1],
  [4, 4, 4, 4, 4, 3, 3, 2],
  [4, 4, 4, 4, 4, 4, 3, 2, 1],
  [4, 4, 4, 4, 4, 4, 3, 3, 2],
  [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
  [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
  [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];
const BARD_SLOTS35: number[][] = [
  [],
  [2],
  [3, 0],
  [3, 1],
  [3, 2, 0],
  [3, 3, 1],
  [3, 3, 2],
  [3, 3, 2, 0],
  [3, 3, 3, 1],
  [3, 3, 3, 2],
  [3, 3, 3, 2, 0],
  [3, 3, 3, 3, 1],
  [3, 3, 3, 3, 2],
  [3, 3, 3, 3, 2, 0],
  [4, 3, 3, 3, 3, 1],
  [4, 4, 3, 3, 3, 2],
  [4, 4, 4, 3, 3, 2, 0],
  [4, 4, 4, 4, 3, 3, 1],
  [4, 4, 4, 4, 4, 3, 2],
  [4, 4, 4, 4, 4, 4, 3],
  [4, 4, 4, 4, 4, 4, 4],
];
const MINOR_SLOTS35: number[][] = [
  [],
  [],
  [],
  [],
  [0],
  [0],
  [1],
  [1],
  [1, 0],
  [1, 0],
  [1, 1],
  [1, 1, 0],
  [1, 1, 1],
  [1, 1, 1],
  [2, 1, 1, 0],
  [2, 1, 1, 1],
  [2, 2, 1, 1],
  [2, 2, 2, 1],
  [3, 2, 2, 1],
  [3, 3, 3, 2],
  [3, 3, 3, 3],
];
export function spellSlots35(classId: string, level: number, score: number) {
  const capped = Math.min(20, level);
  let base: (number | null)[] =
    classId === 'wizard' || classId === 'cleric'
      ? [...(WIZARD_SLOTS35[capped] ?? [])]
      : classId === 'bard'
        ? [...(BARD_SLOTS35[capped] ?? [])]
        : classId === 'ranger' || classId === 'paladin'
          ? [null, ...(MINOR_SLOTS35[capped] ?? [])]
          : [];
  if (classId === 'cleric' && base.length)
    base[0] = level <= 3 ? (level === 1 ? 3 : 4) : level <= 6 ? 5 : 6;
  return base.map((count, spellLevel) => ({
    spellLevel,
    base: count,
    bonus:
      count !== null && spellLevel > 0
        ? Math.max(0, 1 + Math.floor((abilityModifier35(score) - spellLevel) / 4))
        : 0,
    available: count !== null && score >= 10 + spellLevel,
    total:
      count !== null && score >= 10 + spellLevel
        ? count +
          (spellLevel > 0
            ? Math.max(0, 1 + Math.floor((abilityModifier35(score) - spellLevel) / 4))
            : 0)
        : 0,
    domain: classId === 'cleric' && spellLevel > 0 && score >= 10 + spellLevel ? 1 : 0,
  }));
}
