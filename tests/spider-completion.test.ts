import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  character35,
  derivedSheet35,
  skillRanks35,
  skillCheck35,
  rating35,
  eligibleRating35,
  casting35,
  deriveSpider35,
  validateSpider35,
  SPIDER_CLASS_SKILLS35,
  classSkill35,
  validateCharacterOverlays35,
  references35,
  canonicalOverlayJSON,
  createBirthright15Foundation,
  initializeRegency15,
  applyRegency15,
  regencyCollectionQuote15,
  economicForecast15,
  administrateQuote15,
  spellEntitlement35,
  characterSpellAccess35,
  sourceHandler35,
  SPIDER_SIERRA_SPELLS35,
  serializeCampaign,
  deserializeCampaign,
  applyCommand,
  goldFromGB,
  regencyPoints,
  type Scenario,
  type CharacterOverlays35,
  type Campaign,
} from '../packages/core';
import { loadAnuireScenario, buildAnuireCharacterOverlays35 } from '../packages/world-data';

describe.skipIf(!existsSync('reference/extracted/anuire/strategy.research.json'))(
  'Spider057 reviewed racial sheet release',
  () => {
    let scenario: Scenario, bundle: CharacterOverlays35, old: CharacterOverlays35;
    beforeAll(async () => {
      const inputs = ['anuire', 'economy', 'magic', 'strategy'].map((n) =>
        JSON.parse(readFileSync(`reference/extracted/anuire/${n}.research.json`, 'utf8')),
      ) as [unknown, unknown, unknown, unknown];
      scenario = await loadAnuireScenario(...inputs);
      bundle = buildAnuireCharacterOverlays35(scenario, inputs[0], inputs[2]);
      old = JSON.parse(
        readFileSync(
          'reference/research-cache/birthright15/character-release-1.1.0/overlays.json',
          'utf8',
        ),
      );
    }, 120000);
    const sheet = () => character35(bundle.characters!, 'anuire-regent-057');
    const monster = () => sheet().exceptionalProfile!.monsterSheet!;
    const fresh = () =>
      createBirthright15Foundation(scenario, 'anuire-realm-29', {
        selectionMode: 'UNRESTRICTED',
        overlays: references35(bundle),
      });

    it('preserves original zeroed facts, active True95 and all115 other full records', () => {
      const s = sheet();
      expect(s.original.identity).toMatchObject({
        hitPoints: 0,
        alignment: 0,
        attributes: {
          strength: 0,
          dexterity: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0,
        },
      });
      expect(s.original.bloodline).toMatchObject({ grade: 2, strength: 95 });
      expect(s.bloodline).toMatchObject({ grade: 'true', score: 95, derivation: 'Azrai' });
      expect(s.reconstruction).toBeNull();
      expect(s.exceptionalProfile!.progression).toMatchObject({
        monsterLevel: 13,
        allocationLevels: 13,
        effectiveWizardLevel: null,
      });
      const authored = JSON.parse(
        readFileSync('packages/world-data/anuire-characters15.json', 'utf8'),
      );
      const manifest = JSON.parse(
        readFileSync('docs/rules/validation/spider-completion-preservation.json', 'utf8'),
      );
      expect(Object.keys(manifest.records)).toHaveLength(115);
      for (const [id, expected] of Object.entries(manifest.records)) {
        const record = authored.records.find((r: { id: string }) => r.id === id);
        expect(createHash('sha256').update(JSON.stringify(record)).digest('hex'), id).toBe(
          expected,
        );
        expect(character35(bundle.characters!, id)).toEqual(character35(old.characters!, id));
      }
      expect(bundle.handlers!.records).toEqual(old.handlers!.records);
      expect(
        s.provenance.some(
          (p) =>
            p.category === 'reconstructed' && p.paths.includes('exceptionalProfile.monsterSheet'),
        ),
      ).toBe(true);
    });
    it('validates80 paid points and per-HD class/cross-class caps without weakening other classes', () => {
      const m = monster();
      expect(validateSpider35(m)).toEqual([]);
      expect(m.classSkills).toEqual([...SPIDER_CLASS_SKILLS35]);
      expect(skillRanks35(sheet())).toEqual({
        warcraft: 9,
        lead: 7,
        intimidate: 9,
        bluff: 6,
        diplomacy: 3,
        hide: 8,
        moveSilently: 8,
        climb: 8,
        spot: 8,
        listen: 7,
        senseMotive: 4,
        'knowledge:nature': 3,
      });
      let total = 0;
      m.racialHD.forEach((h, i) => {
        const cost = h.purchases.reduce(
          (n, p) => n + (m.classSkills.includes(p.skill) ? p.halfRanks / 2 : p.halfRanks),
          0,
        );
        expect(cost).toBe(i === 0 ? 20 : 5);
        total += cost;
      });
      expect(total).toBe(80);
      expect(deriveSpider35(m).skillPointBudget).toBe(80);
      const cross = structuredClone(m);
      cross.classSkills = cross.classSkills.filter((s) => s !== 'warcraft');
      expect(validateSpider35(cross).some((s) => s.includes('skill-point cost'))).toBe(true);
      expect(validateSpider35(cross).some((s) => s.includes('rank cap warcraft'))).toBe(true);
      const overflow = structuredClone(m);
      overflow.racialHD[0]!.purchases[0]!.halfRanks += 20;
      expect(validateSpider35(overflow).some((s) => s.includes('rank cap'))).toBe(true);
      expect(classSkill35('knowledge:nature', 'fighter', ['fighter'], 'awnshegh', [], [])).toBe(
        false,
      );
      const broad = structuredClone(m);
      broad.classSkills.push('administrate');
      expect(validateSpider35(broad)).toContain('Spider class-skill policy mismatch');
    });
    it('derives HP68 and corrected attacks/saves/AC from chassis, abilities and applicable feats', () => {
      const m = monster(),
        d = deriveSpider35(m);
      expect(m.racialHD.map((h) => h.hpRoll)).toEqual([8, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
      expect(m.racialHD.reduce((n, h) => n + h.hpRoll, 0)).toBe(55);
      expect(d.hp).toBe(68);
      expect(d.abilities).toEqual({
        strength: 13,
        dexterity: 18,
        constitution: 12,
        intelligence: 16,
        wisdom: 12,
        charisma: 16,
      });
      expect(m.feats.map((f) => f.hitDie)).toEqual([1, 3, 6, 9, 12]);
      expect(m.feats).toHaveLength(5);
      expect(d.combat).toMatchObject({
        baseAttack: 13,
        baseSaves: { fortitude: 4, reflex: 8, will: 8 },
        fortitude: 5,
        reflex: 12,
        will: 9,
        grapple: 18,
        initiative: 8,
        unarmoredAC: 22,
        touchAC: 13,
        flatFootedAC: 18,
        poisonDC: 19,
      });
      expect(d.combat.naturalAttacks.map((a) => a.attack)).toEqual([14, 14, 11]);
      expect(d.combat.naturalAttacks.map((a) => a.damage)).toEqual([
        { dice: 1, die: 10, bonus: 1 },
        { dice: 1, die: 10, bonus: 1 },
        { dice: 1, die: 6, bonus: 0 },
      ]);
      const noFocus = structuredClone(m);
      noFocus.feats = noFocus.feats.filter((f) => f.id !== 'weaponFocus');
      expect(deriveSpider35(noFocus).combat.naturalAttacks.map((a) => a.attack)).toEqual([
        13, 13, 11,
      ]);
      const noMulti = structuredClone(m);
      noMulti.feats = noMulti.feats.filter((f) => f.id !== 'multiattack');
      expect(deriveSpider35(noMulti).combat.naturalAttacks[2]!.attack).toBe(8);
      const stronger = structuredClone(m);
      stronger.abilities.strength = 14;
      expect(deriveSpider35(stronger).combat.naturalAttacks.map((a) => a.attack)).toEqual([
        15, 15, 12,
      ]);
      const noAbilityFocus = structuredClone(m);
      noAbilityFocus.feats = noAbilityFocus.feats.filter((f) => f.id !== 'abilityFocus');
      expect(deriveSpider35(noAbilityFocus).combat.poisonDC).toBe(17);
      const badHP = structuredClone(m);
      badHP.racialHD[0]!.hpRoll = 1;
      expect(validateSpider35(badHP).some((s) => s.includes('fixed HP'))).toBe(true);
      const illegalDice = structuredClone(m);
      illegalDice.racialHD[0]!.hpRoll = 9;
      illegalDice.racialHD[1]!.hpRoll = 2;
      expect(validateSpider35(illegalDice).some((s) => s.includes('hpRoll'))).toBe(true);
      const badPrereq = structuredClone(m);
      badPrereq.naturalWeapons[0]!.count = 1;
      expect(validateSpider35(badPrereq)).toContain('Multiattack requires three natural attacks');
      expect(derivedSheet35(sheet())!.hp).toBe(68);
      expect(d.executionActive).toBe(false);
    });
    it('keeps provisional capabilities explicit and keeps check bonuses out of RP ranks', () => {
      const d = deriveSpider35(monster());
      expect(d.capabilities.spellResistance).toMatchObject({
        sourcePercent: 15,
        proposedValue: 17,
        status: 'provisional',
        execution: 'deferred',
      });
      expect(d.capabilities.regeneration).toMatchObject({
        rate: 1,
        period: 'round',
        lethalExceptions: null,
        execution: 'deferred',
      });
      expect(d.capabilities.web).toMatchObject({
        reflexDC: null,
        escapeArtistDC: null,
        strengthDC: null,
        burnable: false,
      });
      expect(d.capabilities.vulnerableAbdomen).toMatchObject({
        proposedAC: 16,
        status: 'future-candidate',
      });
      expect(skillCheck35(sheet(), 'administrate')).toMatchObject({ ranks: 0, total: 1 });
      expect(skillCheck35(sheet(), 'spot')).toMatchObject({ ranks: 8, total: 11 });
      expect(skillCheck35(sheet(), 'listen')).toMatchObject({ ranks: 7, total: 10 });
      expect(skillCheck35(sheet(), 'climb')).toMatchObject({ ranks: 8, total: 17 });
      expect(skillCheck35(sheet(), 'hide')).toMatchObject({ ranks: 8, total: 8 });
      expect(rating35(sheet(), 'province')).toMatchObject({ raw: 12, percent: 100 });
      expect(rating35(sheet(), 'law')).toMatchObject({ raw: 16, percent: 100 });
      expect(rating35(sheet(), 'guild')).toMatchObject({ raw: 5.5, bracket: 5, percent: 0 });
      expect(eligibleRating35(sheet(), 'temple').eligible).toBe(false);
      expect(eligibleRating35(sheet(), 'source').eligible).toBe(false);
      const s = fresh();
      const quote = administrateQuote15(
        s,
        scenario,
        bundle,
        'anuire-realm-29',
        [{ key: 'fort-quote', kind: 'fort', amount: goldFromGB(8n) }],
        { characterId: sheet().id },
      );
      expect(quote).toMatchObject({ eligible: true, modifier: 1, success: null, discount: 0n });
    });
    it('uses actual Spiderfell assets for RP, leaves cash intact and retains unlimited storage', () => {
      let s = fresh();
      s.realms.find((r) => r.id === 'anuire-realm-29')!.regency = regencyPoints(10n ** 120n);
      s = initializeRegency15(s, scenario);
      const before = serializeCampaign(s),
        q = regencyCollectionQuote15(s, scenario, 'anuire-realm-29', bundle);
      const provinces = s.provinces
        .filter((p) => p.owner === 'anuire-realm-29' && !p.occupiedBy && !p.contested)
        .reduce((n, p) => n + BigInt(p.level), 0n);
      const law = s.holdings
        .filter(
          (h) =>
            h.realmId === 'anuire-realm-29' && h.type === 'law' && !h.contested && !h.destroyed,
        )
        .reduce((n, h) => n + BigInt(h.level), 0n);
      expect(q).toMatchObject({
        status: 'eligible',
        currentScore: 95n,
        qualifiedRP: provinces + law,
        collectibleRP: provinces + law,
      });
      expect(q.collectibleRP).toBe(5n);
      const f = economicForecast15(s, scenario, 'anuire-realm-29', { overlays: bundle });
      expect(f.result!.netOperating).toBe(goldFromGB(2n));
      expect(f.income.virtualGuild).toBe(0n);
      expect(sourceHandler35(bundle, scenario, s, 'anuire-realm-29', sheet().id).eligible).toBe(
        true,
      );
      expect(serializeCampaign(s)).toBe(before);
      for (const r of s.realms) if (r.id !== 'anuire-realm-29') r.eliminated = true;
      s = applyRegency15(s, scenario, bundle, 'spider-open', { kind: 'open' });
      s = applyRegency15(s, scenario, bundle, 'spider-collect', {
        kind: 'collect',
        realmId: 'anuire-realm-29',
      });
      expect(s.realms.find((r) => r.id === 'anuire-realm-29')!.regency).toBe(10n ** 120n + 5n);
      const saved = serializeCampaign(s);
      expect(
        deserializeCampaign(saved, scenario, {
          domainRules: 'birthright-1.5',
          overlayContent: bundle,
        }),
      ).toEqual(s);
      expect(
        applyCommand(s as unknown as Campaign, scenario, 'anuire-realm-29', { type: 'HoldAction' })
          .ok,
      ).toBe(false);
    }, 15000);
    it('preserves all ten spell entitlements without Wizard, Alchemy, Source or Temple permission', () => {
      const s = fresh();
      expect(sheet().sierraSpellEntitlement).toEqual(
        character35(old.characters!, sheet().id).sierraSpellEntitlement,
      );
      expect(sheet().sierraSpellEntitlement!.spells).toEqual(SPIDER_SIERRA_SPELLS35);
      expect(casting35(sheet())).toMatchObject({
        classes: [],
        trueArcaneFirst: false,
        divineFirst: false,
        sourceRealmMagic: false,
        templeRealmMagic: false,
      });
      for (const spell of SPIDER_SIERRA_SPELLS35) {
        expect(spellEntitlement35(sheet(), spell.id)).toMatchObject({
          eligible: true,
          originalItemId: spell.originalItemId,
          executionActive: false,
        });
        expect(
          characterSpellAccess35(bundle, scenario, s, 'anuire-realm-29', sheet().id, spell.id)
            .eligible,
        ).toBe(true);
      }
      expect(spellEntitlement35(sheet(), 'alchemy').eligible).toBe(false);
      expect(spellEntitlement35(sheet(), 'mass-destruction').requirements).toMatchObject({
        baseGB: 5,
        baseRP: 10,
      });
      const hypothetic = structuredClone(s);
      hypothetic.holdings.push({
        id: 'spider-source-test',
        realmId: 'anuire-realm-29',
        provinceId: s.provinces[0]!.id,
        type: 'source',
        level: 6,
      });
      hypothetic.holdings.push({
        id: 'spider-temple-test',
        realmId: 'anuire-realm-29',
        provinceId: s.provinces[0]!.id,
        type: 'temple',
        level: 10,
      });
      const q = regencyCollectionQuote15(hypothetic, scenario, 'anuire-realm-29', bundle);
      expect(q.categories.find((c) => c.kind === 'source')!.eligible).toBe(false);
      expect(q.categories.find((c) => c.kind === 'temple')!.eligible).toBe(false);
      expect(
        economicForecast15(hypothetic, scenario, 'anuire-realm-29', { overlays: bundle }).income
          .virtualGuild,
      ).toBe(160n);
    });
    it('loads archived1.1 RP snapshots with their old unknown skills and rejects silent replacement', () => {
      let s = createBirthright15Foundation(scenario, 'anuire-realm-29', {
        selectionMode: 'UNRESTRICTED',
        overlays: references35(old),
      });
      for (const r of s.realms) if (r.id !== 'anuire-realm-29') r.eliminated = true;
      s = initializeRegency15(s, scenario);
      s = applyRegency15(s, scenario, old, 'archived-open', { kind: 'open' });
      expect(regencyCollectionQuote15(s, scenario, 'anuire-realm-29', old).status).toBe('unknown');
      s = applyRegency15(s, scenario, old, 'archived-withhold', {
        kind: 'withhold',
        realmId: 'anuire-realm-29',
        reason: 'preserved old missing skills',
      });
      const saved = serializeCampaign(s),
        restored = deserializeCampaign(saved, scenario, {
          domainRules: 'birthright-1.5',
          overlayContent: old,
        });
      expect(restored).toEqual(s);
      expect(skillRanks35(character35(old.characters!, sheet().id))).toEqual({});
      expect(() =>
        deserializeCampaign(saved, scenario, {
          domainRules: 'birthright-1.5',
          overlayContent: bundle,
        }),
      ).toThrow('fingerprint');
      for (const kind of ['characters', 'handlers'] as const)
        expect(references35(bundle)[kind]!.fingerprint).toBe(
          createHash('sha256').update(canonicalOverlayJSON(bundle[kind])).digest('hex'),
        );
      expect(references35(bundle).characters!.version).toBe('1.2.0');
      const mixed = { characters: bundle.characters, handlers: old.handlers };
      expect(() => validateCharacterOverlays35(mixed, scenario)).toThrow();
    }, 15000);
  },
);
