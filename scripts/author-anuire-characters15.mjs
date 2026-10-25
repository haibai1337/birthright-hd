/** Explicit authoring operation: writes only derived choices/worksheets/review report.
 * Not used by new-game initialization, tests or ordinary overlay loading.
 * Re-running is a content revision requiring inspection of its diff. */
import fs from 'node:fs';
import { createServer } from 'vite';
if (
  JSON.parse(fs.readFileSync('packages/world-data/anuire-characters15.json', 'utf8')).version !==
  '1.0.0'
)
  throw new Error(
    'Bulk authoring is retired after release 1.0.0. Preserve the reviewed entries; use scoped content revisions and report-anuire-characters15.mjs.',
  );
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const rules = await server.ssrLoadModule('/packages/core/character-rules35.ts');
  const core = await server.ssrLoadModule('/packages/core/character-sheets.ts');
  const { loadAnuireScenario } = await server.ssrLoadModule(
    '/packages/world-data/anuire-scenario.ts',
  );
  const read = (n) =>
    JSON.parse(fs.readFileSync(`reference/extracted/anuire/${n}.research.json`, 'utf8'));
  const [raw, economy, magic, strategy] = ['anuire', 'economy', 'magic', 'strategy'].map(read);
  const scenario = await loadAnuireScenario(raw, economy, magic, strategy);
  const {
    CLASSES35,
    abilityModifier35,
    DERIVATIONS35,
    RACES35,
    classSkill35,
    culturalSkills35,
    FEATS35,
  } = rules;
  // Individual editorial role choices. These are authored, not biographies recovered from Sierra.
  const roles = {
    steward: [3, 5, 20, 39, 42, 53, 60, 61, 81, 82, 83, 88, 89],
    commander: [1, 7, 11, 15, 23, 25, 26, 31, 34, 40, 49, 50, 52, 68, 94, 96, 98, 100],
    scout: [19, 41, 56, 95, 97, 99, 101, 102, 103, 104, 110],
    diplomat: [2, 8, 13, 21, 27, 54, 65, 67],
    merchant: [10, 16, 18, 69, 72, 74, 75, 78, 79, 85, 86],
    intriguer: [6, 33, 37, 38, 48, 51, 58, 64, 66, 73],
    battleMage: [4, 17, 24, 29, 32, 62, 87, 111, 113, 114],
    natureMage: [12, 22, 55, 70, 90, 112, 115, 116],
    scholar: [28, 35, 59, 76, 80],
    pastor: [14, 36, 71, 91, 105, 106, 107, 108, 109],
    militantPriest: [9, 47, 63, 77, 84, 92],
  };
  const portfolios = {
    steward: [
      'administrate',
      'diplomacy',
      'knowledge:nobility',
      'senseMotive',
      'lead',
      'knowledge:history',
      'profession:steward',
      'warcraft',
    ],
    commander: [
      'warcraft',
      'lead',
      'ride',
      'intimidate',
      'diplomacy',
      'handleAnimal',
      'craft:weaponsmithing',
      'knowledge:nobility',
    ],
    scout: [
      'survival',
      'spot',
      'listen',
      'hide',
      'moveSilently',
      'knowledge:nature',
      'ride',
      'warcraft',
    ],
    diplomat: [
      'diplomacy',
      'senseMotive',
      'bluff',
      'knowledge:nobility',
      'lead',
      'gatherInformation',
      'perform',
      'knowledge:history',
    ],
    merchant: [
      'appraise',
      'profession:merchant',
      'diplomacy',
      'senseMotive',
      'bluff',
      'gatherInformation',
      'craft:woodworking',
      'administrate',
    ],
    intriguer: [
      'bluff',
      'senseMotive',
      'intimidate',
      'gatherInformation',
      'hide',
      'moveSilently',
      'lead',
      'warcraft',
    ],
    battleMage: [
      'spellcraft',
      'knowledge:arcana',
      'concentration',
      'warcraft',
      'knowledge:planes',
      'craft:alchemy',
      'knowledge:history',
      'intimidate',
    ],
    natureMage: [
      'knowledge:nature',
      'knowledge:arcana',
      'spellcraft',
      'concentration',
      'profession:herbalist',
      'survival',
      'knowledge:geography',
      'listen',
    ],
    scholar: [
      'knowledge:arcana',
      'spellcraft',
      'knowledge:history',
      'decipherScript',
      'knowledge:planes',
      'concentration',
      'craft:alchemy',
      'knowledge:nature',
    ],
    pastor: [
      'knowledge:religion',
      'heal',
      'lead',
      'diplomacy',
      'concentration',
      'profession:herbalist',
      'knowledge:history',
      'administrate',
    ],
    militantPriest: [
      'knowledge:religion',
      'lead',
      'concentration',
      'warcraft',
      'heal',
      'diplomacy',
      'craft:weaponsmithing',
      'senseMotive',
    ],
  };
  const native = ['none', 'fighter', 'paladin', 'ranger', 'cleric', 'wizard', 'rogue', 'bard'];
  const ava = ['fighter', 'paladin', 'ranger', 'cleric', 'wizard', 'magician', 'rogue', 'bard'];
  const conflictIds = new Set([6, 28, 38, 48, 58, 64, 110]);
  const specialIds = new Set([17, 33, 37, 51]);
  const alignments = ['unknown', 'LG', 'LN', 'LE', 'NG', 'TN', 'NE', 'CG', 'CN', 'CE'];
  function faithFor(index, alignment, cores) {
    if (!cores.some((c) => c.classId === 'cleric'))
      return {
        deity: null,
        domains: [],
        standing: cores.some((c) => ['ranger', 'paladin'].includes(c.classId))
          ? 'active'
          : 'not-applicable',
      };
    if (index === 9)
      return { deity: 'Moradin', domains: ['Law', 'Protection'], standing: 'active' };
    if (index === 39)
      return { deity: 'Ruornil', domains: ['Knowledge', 'Magic'], standing: 'active' };
    if ([77, 84].includes(index))
      return {
        deity: 'Cuiraecen',
        domains: ['War', 'Strength'],
        standing: index === 84 ? 'unconfirmed' : 'active',
      };
    if (index === 91)
      return { deity: 'Sera', domains: ['Luck', 'Travel'], standing: 'unconfirmed' };
    if (index === 82)
      return { deity: 'Haelyn', domains: ['Law', 'Nobility'], standing: 'unconfirmed' };
    if ([3, 6, 9].includes(alignment))
      return { deity: 'Belinik', domains: ['Strength', 'War'], standing: 'active' };
    if (alignment === 5) return { deity: 'Erik', domains: ['Animal', 'Plant'], standing: 'active' };
    if (alignment === 7 || alignment === 8)
      return { deity: 'Cuiraecen', domains: ['War', 'Strength'], standing: 'active' };
    return {
      deity: 'Haelyn',
      domains: [alignment === 1 || alignment === 2 ? 'Law' : 'Good', 'Nobility'],
      standing: 'active',
    };
  }
  const spellLists = {
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
  function author(r) {
    const index = r.index,
      identity = r.identity;
    const role = Object.entries(roles).find(([, ids]) => ids.includes(index))?.[0];
    const unknown =
      !identity ||
      /^unknown$/i.test(identity.name) ||
      Object.values(identity.attributes).some((n) => n <= 0);
    if (unknown)
      return {
        id: r.id,
        completion: 'unresolved',
        review: 'unresolved',
        reconstruction: null,
        issues: [
          index === 57
            ? 'Named Spider record has zero abilities/HP; awnshegh template unresolved.'
            : 'Unidentified original record; template defaults are not an authored person.',
        ],
      };
    if (!role) throw new Error(`Missing editorial role ${index}`);
    let cores = [
      { classId: native[r.classCode], level: r.level },
      ...(r.secondClassCode ? [{ classId: native[r.secondClassCode], level: r.secondLevel }] : []),
    ];
    const inventory = magic.characters.find((c) => c.regentId === r.id);
    // AVA fighter advancement is explicit source evidence for the five native-level-1 stubs.
    // Caine follows the existing adapter's AVA 10. Reneava retains native ranger 5, pending review.
    if (conflictIds.has(index) && index !== 110)
      cores = inventory.classes
        .filter((c) => c.classCode >= 0)
        .map((c) => ({ classId: ava[c.classCode], level: c.level }));
    const total = Math.max(...cores.map((c) => c.level));
    const faith = faithFor(index, identity.alignment, cores);
    const scionCount = r.bloodline.grade >= 3 ? 2 : r.bloodline.grade === 2 ? 1 : 0;
    const available = total - scionCount,
      sum = cores.reduce((n, c) => n + c.level, 0);
    let counts = cores.map((c) => Math.max(1, Math.floor((available * c.level) / sum)));
    while (counts.reduce((n, c) => n + c, 0) < available)
      counts[counts.indexOf(Math.min(...counts))]++;
    while (counts.reduce((n, c) => n + c, 0) > available)
      counts[counts.indexOf(Math.max(...counts))]--;
    const sequence = [cores[0].classId];
    counts[0]--;
    const derivation = DERIVATIONS35[r.bloodline.derivation];
    for (let n = 0; n < scionCount; n++) sequence.push(`scion:${derivation}`);
    while (counts.some((n) => n > 0))
      for (let i = 0; i < cores.length; i++)
        if (counts[i] > 0) {
          sequence.push(cores[i].classId);
          counts[i]--;
        }
    // PHB paladins cannot resume advancement after entering another class.
    // Heritage levels precede the uninterrupted paladin career; no free levels.
    if (cores[0].classId === 'paladin')
      sequence.sort((a, b) => Number(b.startsWith('scion:')) - Number(a.startsWith('scion:')));
    const race = RACES35[r.raceCode],
      abilities = { ...identity.attributes };
    const increase = cores.some((c) => c.classId === 'wizard')
      ? 'intelligence'
      : cores[0].classId === 'cleric'
        ? 'wisdom'
        : cores[0].classId === 'rogue'
          ? 'dexterity'
          : cores[0].classId === 'bard'
            ? 'charisma'
            : 'strength';
    const baseAbilities = { ...abilities };
    baseAbilities[increase] -= Math.floor(total / 4);
    const working = { ...baseAbilities };
    const focus = [...portfolios[role]];
    const craft =
      focus.find((s) => s.startsWith('craft:')) ??
      (r.raceCode === 0
        ? 'craft:stonemasonry'
        : cores.some((c) => c.classId === 'wizard')
          ? 'craft:alchemy'
          : 'craft:woodworking');
    const profession =
      focus.find((s) => s.startsWith('profession:')) ??
      (role === 'commander' || role === 'diplomat'
        ? 'profession:steward'
        : role === 'scout'
          ? 'profession:herbalist'
          : cores.some((c) => ['wizard', 'cleric', 'bard'].includes(c.classId))
            ? 'profession:scribe'
            : 'profession:merchant');
    const scionSkills = CLASSES35[`scion:${derivation}`].skills;
    const scionChoices = focus
      .filter((s) => !scionSkills.includes(s))
      .slice(0, ['Brenna', 'Azrai'].includes(derivation) ? 2 : 1);
    const ranks = {},
      previous = [],
      levels = [],
      feats = [],
      classCounts = {},
      usedFeats = new Set();
    // Supporting skills stay within this person's classes, heritage, culture and role.
    // Do not sprinkle unrelated magic lore/crafts across the whole cast to exhaust a budget.
    const supportingSkills = [
      ...new Set([...sequence.flatMap((c) => CLASSES35[c].skills), ...culturalSkills35(race)]),
    ].filter(
      (s) =>
        (!s.startsWith('craft:') || s === craft || focus.includes(s)) &&
        (!s.startsWith('profession:') || s === profession || focus.includes(s)),
    );
    const skillOrder = [...new Set([...focus, craft, profession, ...supportingSkills])];
    function addFeat(grant, level) {
      const candidates =
        grant === 'scribeScroll'
          ? [['scribeScroll', null]]
          : grant === 'wizard'
            ? ['extendSpell', 'silentSpell', 'stillSpell', 'empowerSpell', 'quickenSpell'].map(
                (id) => [id, null],
              )
            : grant === 'fighter'
              ? [
                  ['improvedInitiative', null],
                  ['powerAttack', null],
                  ['combatReflexes', null],
                  ['weaponFocus', 'longsword'],
                  ['blindFight', null],
                  ['combatExpertise', null],
                  ['dodge', null],
                  ['improvedUnarmedStrike', null],
                  ['weaponFocus', 'longbow'],
                  ['weaponFocus', 'heavy-mace'],
                  ['weaponFocus', 'dagger'],
                ]
              : [
                  ['skillFocus', focus[0]],
                  ['ironWill', null],
                  ['alertness', null],
                  ['greatFortitude', null],
                  ['lightningReflexes', null],
                  ['toughness', null],
                  ...focus.slice(1, 6).map((s) => ['skillFocus', s]),
                  ['spellFocus', 'divination'],
                  ['spellPenetration', null],
                ];
      const chosen = candidates.find(([id, target]) => {
        const rule = FEATS35[id];
        if (usedFeats.has(`${id}:${target}`)) return false;
        if (rule.ability && working[rule.ability] < rule.minimum) return false;
        if (
          rule.caster &&
          !['wizard', 'cleric', 'bard', 'magician'].some((c) => classCounts[c] > 0)
        )
          return false;
        return true;
      });
      if (!chosen) throw new Error(`Exhausted feat choices for ${r.id}/${grant}/${level}`);
      const [id, target] = chosen;
      usedFeats.add(`${id}:${target}`);
      feats.push({ id, target, level, grant });
    }
    sequence.forEach((classId, i) => {
      const level = i + 1,
        c = CLASSES35[classId];
      if (level % 4 === 0) working[increase]++;
      previous.push(classId);
      classCounts[classId] = (classCounts[classId] ?? 0) + 1;
      const purchases = [],
        human = race.startsWith('human-');
      const budget =
        Math.max(1, c.points + abilityModifier35(working.intelligence)) * (i === 0 ? 4 : 1) +
        (human ? (i === 0 ? 4 : 1) : 0);
      function buy(skill) {
        const cc = !classSkill35(skill, classId, previous, race, scionChoices, faith.domains),
          halfRanks = cc ? 1 : 2;
        ranks[skill] = (ranks[skill] ?? 0) + halfRanks;
        const row = purchases.find((p) => p.skill === skill);
        if (row) row.halfRanks += halfRanks;
        else purchases.push({ skill, halfRanks });
      }
      const canBuy = (skill) => {
        const isClass = classSkill35(skill, classId, previous, race, scionChoices, faith.domains),
          everClass = previous.some((c) =>
            classSkill35(skill, c, previous, race, scionChoices, faith.domains),
          );
        return (ranks[skill] ?? 0) + (isClass ? 2 : 1) <= (level + 3) * (everClass ? 2 : 1);
      };
      let spent = 0;
      if (human)
        for (let h = 0; h < (i === 0 ? 4 : 1); h++) {
          const skill = culturalSkills35(race)
            .filter(canBuy)
            .sort(
              (a, b) =>
                (ranks[a] ?? 0) - (ranks[b] ?? 0) || skillOrder.indexOf(a) - skillOrder.indexOf(b),
            )[0];
          if (!skill) throw new Error(`Cultural allocation impossible ${r.id}`);
          buy(skill);
          spent++;
        }
      while (spent < budget) {
        // A broad portfolio. Class efficiency matters, but RP caps are not an allocation target.
        const score = (skill) => {
          const pos = focus.indexOf(skill),
            weight = pos < 0 ? 0.6 : pos === 0 ? 3 : pos < 4 ? 2 : 1.3;
          const classFactor = classSkill35(
            skill,
            classId,
            previous,
            race,
            scionChoices,
            faith.domains,
          )
            ? 1
            : 0.55;
          return ((ranks[skill] ?? 0) / 2 + 1) / (weight * classFactor);
        };
        const skill = skillOrder
          .filter(canBuy)
          .sort((a, b) => score(a) - score(b) || skillOrder.indexOf(a) - skillOrder.indexOf(b))[0];
        if (!skill) throw new Error(`Allocation impossible ${r.id}/${level}`);
        buy(skill);
        spent++;
      }
      levels.push({
        classId,
        abilityIncrease: level % 4 === 0 ? increase : null,
        hpRoll: i === 0 ? c.hd : Math.ceil(c.hd / 2),
        purchases,
      });
      if (i === 0 || level % 3 === 0) addFeat('general', level);
      if (i === 0 && human) addFeat('human', level);
      if (classId === 'fighter' && (classCounts.fighter === 1 || classCounts.fighter % 2 === 0))
        addFeat('fighter', level);
      if (classId === 'wizard' && classCounts.wizard === 1) addFeat('scribeScroll', level);
      if (classId === 'wizard' && classCounts.wizard % 5 === 0) addFeat('wizard', level);
      if (classId === 'scion:Azrai' && classCounts[classId] === 1) addFeat('scion:Azrai', level);
    });
    // Fit original HP only within legal HD limits; otherwise retain it solely as an original fact.
    const con = abilityModifier35(abilities.constitution),
      tough = feats.some((f) => f.id === 'toughness') ? 3 : 0;
    const hp = () => levels.reduce((n, l) => n + Math.max(1, l.hpRoll + con), tough);
    let delta = identity.hitPoints - hp();
    for (let round = 0; delta && round < 50; round++)
      for (let i = 1; i < levels.length && delta; i++) {
        const l = levels[i],
          next = l.hpRoll + Math.sign(delta);
        if (next < 1 || next > CLASSES35[l.classId].hd) continue;
        const before = hp();
        l.hpRoll = next;
        delta -= hp() - before;
      }
    const notes = [
      `Authored role: ${role}; this is an editorial interpretation, not a recovered biography.`,
      `Total level budget ${total}, using maximum original class level, never the sum; ${scionCount} scion levels are inside this budget.`,
      'Final native ability scores are preserved. Starting 3.5 scores are reverse-derived from level increases; racial adjustments are already included, never added twice.',
      'Native bloodline score is final. Revised scion +4/+8 is treated as embedded, not added to Sierra values.',
      'No equipment bonuses, monster HD, level adjustment, researched realm spells or extra blood powers are invented.',
      'Ordinary wizard cantrips use the generalist class entitlement; spellbook entries below are authored level-up acquisitions only.',
    ];
    if (delta)
      notes.push(
        `Native HP ${identity.hitPoints} cannot be matched within this HD allocation; legal reconstructed HP ${hp()} retained separately.`,
      );
    const spellbook = [],
      known = new Set();
    let wizardLevel = 0;
    sequence.forEach((c, i) => {
      if (c !== 'wizard') return;
      wizardLevel++;
      let remaining =
        wizardLevel === 1
          ? 3 +
            Math.max(
              0,
              abilityModifier35(
                baseAbilities.intelligence +
                  (increase === 'intelligence' ? Math.floor((i + 1) / 4) : 0),
              ),
            )
          : 2;
      for (
        let spellLevel = Math.min(9, Math.ceil(wizardLevel / 2));
        spellLevel >= 1 && remaining;
        spellLevel--
      )
        for (const spell of spellLists[spellLevel])
          if (!known.has(spell) && remaining) {
            spellbook.push({ spell, spellLevel, learnedAt: i + 1 });
            known.add(spell);
            remaining--;
          }
      if (remaining) throw new Error(`Spellbook pool exhausted ${r.id}`);
    });
    const cleric = sequence.includes('cleric');
    const { deity, domains } = faith;
    if (cleric) {
      notes.push(
        `Faith/domain selection ${deity} (${domains.join(', ')}) is authored; faction names corroborate only where explicit. Daily preparation is not a known realm-spell grant.`,
      );
    }
    const issues = [];
    if (faith.standing === 'unconfirmed')
      issues.push(
        'Preserved native alignment conflicts with the institution-associated BRCS patron. Faith standing and divine authorization withheld; no deity or alignment silently replaced. Review this character before Temple RP activation.',
      );
    if (conflictIds.has(index))
      issues.push(
        index === 110
          ? 'Native ranger 5 conflicts with AVA priest 5; native ranger used, eligibility withheld pending review.'
          : `Native class/level conflicts with AVA; AVA ${cores.map((c) => c.classId + c.level).join('/')} used consistently with existing adapter; approve individual conversion before RP activation.`,
      );
    if (specialIds.has(index))
      issues.push(
        'Unusual body/race/template or true bloodline needs individual approval; no invented monster HD/LA, powers or caster authorization.',
      );
    if (r.raceCode === 1 && [1, 2, 3].includes(identity.alignment))
      issues.push(
        'Native lawful alignment conflicts with BRCS elven restriction; preserved and requires review.',
      );
    const provisional = issues.length > 0;
    return {
      id: r.id,
      completion: provisional ? 'provisional' : 'complete',
      review: provisional ? 'requires-review' : 'authored-checked',
      issues,
      reconstruction: {
        race,
        culture: race.startsWith('human-') ? race.slice(6) : null,
        alignment: alignments[identity.alignment],
        baseAbilities,
        abilities,
        levels,
        scionChoices: scionCount ? scionChoices : [],
        feats,
        guildCraft: craft,
        guildProfession: profession,
        languages: [
          race === 'cerilian-dwarf'
            ? 'Karamhul'
            : race === 'cerilian-elf'
              ? 'Sidhelien'
              : race === 'human-khinasi'
                ? 'Basarji'
                : 'Anuirean',
          ...[
            'Anuirean',
            'Sidhelien',
            'Karamhul',
            'Basarji',
            'Low Brecht',
            'Goblin',
            'Giant',
            'Draconic',
          ]
            .filter(
              (l) =>
                l !==
                (race === 'cerilian-dwarf'
                  ? 'Karamhul'
                  : race === 'cerilian-elf'
                    ? 'Sidhelien'
                    : race === 'human-khinasi'
                      ? 'Basarji'
                      : 'Anuirean'),
            )
            .slice(0, Math.max(0, abilityModifier35(baseAbilities.intelligence))),
        ],
        deity,
        domains,
        divineStanding: faith.standing,
        spellbook,
        spontaneousSpells: sequence.includes('bard')
          ? [
              ...[
                'detect magic',
                'read magic',
                'light',
                'mage hand',
                'message',
                'prestidigitation',
              ].map((spell) => ({ spell, spellLevel: 0 })),
              ...['charm person', 'cure light wounds', 'silent image'].map((spell) => ({
                spell,
                spellLevel: 1,
              })),
              ...['invisibility', 'suggestion'].map((spell) => ({ spell, spellLevel: 2 })),
            ]
          : [],
        choices: {
          role,
          familiar: sequence.includes('wizard')
            ? 'none summoned; entitlement only, no active companion bonuses'
            : 'not applicable',
          animalCompanion: sequence.includes('ranger')
            ? 'none bonded; entitlement only'
            : 'not applicable',
          paladinMount: sequence.includes('paladin')
            ? 'heavy warhorse entitlement at paladin 5; not added to imported assets'
            : 'not applicable',
          rangerStyle: sequence.includes('ranger') ? 'archery' : 'not applicable',
          rangerFavoredEnemies: sequence.includes('ranger')
            ? 'humanoid (goblinoid), giant; priorities in that order as levels permit (authored)'
            : 'not applicable',
          rogueSpecialAbility: sequence.includes('rogue')
            ? 'improved evasion if rogue level 10 reached'
            : 'not applicable',
          azraiGoodSave: 'will',
          racialAdjustments: 'embedded in final original scores',
          equipment: 'original inventory references; equipment modifiers unknown',
          bloodAbilities: 'original inventory IDs; detailed powers unverified',
          scionCantrips:
            derivation === 'Vorynn' && scionCount
              ? 'detect magic, read magic; at scion 2 also light, mage hand (authored)'
              : 'none',
        },
        notes,
      },
    };
  }
  const choices = {
    version: '1.0.0',
    method:
      'Authored BRCS35/PHB35 conversion with explicit per-level budgets; native numerical bloodline and final abilities preserved; level budget is maximum source class level with scion levels included.',
    records: raw.campaign.regents.map(author),
  };
  fs.writeFileSync(
    'packages/world-data/anuire-characters15.json',
    JSON.stringify(choices, null, 2) + '\n',
  );
  server.moduleGraph?.invalidateAll();
  const { buildAnuireCharacterOverlays35 } = await server.ssrLoadModule(
    '/packages/world-data/anuire-characters15.ts',
  );
  const bundle = buildAnuireCharacterOverlays35(scenario, raw, magic, choices);
  core.validateCharacterOverlays35(bundle, scenario);
  fs.writeFileSync(
    'reference/extracted/anuire/birthright15.characters.json',
    JSON.stringify(bundle, null, 2) + '\n',
  );
  const counts = Object.fromEntries(
    ['complete', 'provisional', 'unresolved'].map((s) => [
      s,
      choices.records.filter((r) => r.completion === s).length,
    ]),
  );
  console.log(JSON.stringify({ counts, references: core.references35(bundle) }, null, 2));
} finally {
  await server.close();
}
