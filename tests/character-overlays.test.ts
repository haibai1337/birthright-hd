import { beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import {
  canonicalOverlayJSON,
  sha256Text,
  overlayFingerprint,
  characterOverlay35Schema,
  validateCharacterOverlays35,
  validateReconstruction35,
  character35,
  derivedSheet35,
  skillRanks35,
  skillCheck35,
  rating35,
  eligibleRating35,
  wholeRatedRP35,
  casting35,
  sourceHandler35,
  references35,
  createBirthright15Foundation,
  serializeCampaign,
  deserializeCampaign,
  realmRegentCandidates,
  realmSelectable,
  characterActor35,
  spellSlots35,
  spellEntitlement35,
  characterSpellAccess35,
  SPIDER_SIERRA_SPELLS35,
  type Scenario,
  type CharacterOverlays35,
} from '../packages/core';
import { loadAnuireScenario, buildAnuireCharacterOverlays35 } from '../packages/world-data';

describe('canonical overlay SHA-256', () => {
  it('matches independent SHA-256 vectors, Unicode and multiple blocks', () => {
    for (const input of ['', 'abc', 'a'.repeat(1000), 'Cerilia — Sidhelien 🧙'])
      expect(sha256Text(input)).toBe(createHash('sha256').update(input).digest('hex'));
    expect(overlayFingerprint({ b: [1, 2], a: 'x' })).toBe(
      overlayFingerprint({ a: 'x', b: [1, 2] }),
    );
    expect(overlayFingerprint({ a: [2, 1] })).not.toBe(overlayFingerprint({ a: [1, 2] }));
    for (const invalid of [undefined, NaN, Infinity, 1n, new Date(), { a: undefined }])
      expect(() => canonicalOverlayJSON(invalid)).toThrow();
  });
});

describe.skipIf(!existsSync('reference/extracted/anuire/strategy.research.json'))(
  'original Anuire character content',
  () => {
    let scenario: Scenario, bundle: CharacterOverlays35, bytes: Buffer[], paths: string[];
    beforeAll(async () => {
      paths = ['anuire', 'economy', 'magic', 'strategy'].map(
        (n) => `reference/extracted/anuire/${n}.research.json`,
      );
      bytes = paths.map((p) => readFileSync(p));
      const inputs = bytes.map((b) => JSON.parse(b.toString('utf8'))) as [
        unknown,
        unknown,
        unknown,
        unknown,
      ];
      scenario = await loadAnuireScenario(...inputs);
      bundle = buildAnuireCharacterOverlays35(scenario, inputs[0], inputs[2]);
    }, 120000);
    it('accounts for all 116 identities without modifying inputs or original facts', () => {
      expect(bundle.characters!.records).toHaveLength(116);
      expect(new Set(bundle.characters!.records.map((r) => r.id)).size).toBe(116);
      expect(
        ['complete', 'provisional', 'unresolved'].map(
          (status) => bundle.characters!.records.filter((r) => r.completion === status).length,
        ),
      ).toEqual([110, 0, 6]);
      for (const [mode, count] of [
        ['CLASSIC', 36],
        ['UNRESTRICTED', 63],
      ] as const) {
        const ids = new Set(
          scenario.realms
            .filter((r) => realmSelectable(scenario, r.id, mode))
            .flatMap((r) => realmRegentCandidates(scenario, r.id).map((c) => c.id)),
        );
        expect(ids.size).toBe(count);
      }
      validateCharacterOverlays35(bundle, scenario);
      const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
      expect(paths.map((p) => hash(readFileSync(p)))).toEqual(bytes.map(hash));
      for (const sheet of bundle.characters!.records) {
        expect(sheet.original).toEqual(scenario.regents!.find((r) => r.id === sheet.id)!.original);
        expect(sheet.bloodline.score).toBe(
          scenario.regents!.find((r) => r.id === sheet.id)!.bloodline.strength,
        );
        expect(validateReconstruction35(sheet), sheet.id).toEqual([]);
      }
    });
    it('keeps six unidentified records unresolved and separates reviewed monster readiness', () => {
      for (const id of [30, 43, 44, 45, 46, 93]) {
        const sheet = character35(
          bundle.characters!,
          `anuire-regent-${String(id).padStart(3, '0')}`,
        );
        expect(sheet.name).toBe('unknown');
        expect(sheet.reconstruction).toBeNull();
        expect(sheet.review).toBe('unresolved');
        expect(casting35(sheet).approved).toBe(false);
        expect(rating35(sheet, 'source')).toBeNull();
      }
      expect(character35(bundle.characters!, 'anuire-regent-057').reconstruction).toBeNull();
      const gorgon = character35(bundle.characters!, 'anuire-regent-033');
      expect(validateReconstruction35(gorgon)).toEqual([]);
      expect(gorgon.review).toBe('authored-checked');
      expect(casting35(gorgon).approved).toBe(true);
      expect(gorgon.provenance.some((p) => p.category === 'reconstructed')).toBe(true);
    });
    it('rejects overspending, per-level caps, illegal feats, extra levels and ability edits', () => {
      const sheet = character35(bundle.characters!, 'anuire-regent-001');
      const overspend = structuredClone(sheet);
      overspend.reconstruction!.levels[0]!.purchases[0]!.halfRanks += 100;
      expect(validateReconstruction35(overspend).some((e) => e.includes('Rank cap'))).toBe(true);
      expect(validateReconstruction35(overspend).some((e) => e.includes('Skill budget'))).toBe(
        true,
      );
      const feat = structuredClone(sheet);
      feat.reconstruction!.feats.push({ ...feat.reconstruction!.feats[0]! });
      expect(validateReconstruction35(feat).some((e) => e.includes('Duplicate feat'))).toBe(true);
      const lateFeat = structuredClone(sheet);
      lateFeat.reconstruction!.feats[0]!.level = 100;
      expect(validateReconstruction35(lateFeat)).toContain('Feat granted beyond character level');
      const fakeAvatar = structuredClone(bundle);
      fakeAvatar.handlers = null;
      fakeAvatar.characters!.records[0]!.inventory.avaClasses[0]!.classCode = 4;
      expect(() => validateCharacterOverlays35(fakeAvatar, scenario)).toThrow('AVA identity');
      const wrongAbility = structuredClone(bundle);
      wrongAbility.handlers = null;
      wrongAbility.characters!.records[0]!.reconstruction!.abilities.strength++;
      expect(() => validateCharacterOverlays35(wrongAbility, scenario)).toThrow(
        'abilities mismatch',
      );
      const extra = structuredClone(bundle);
      extra.handlers = null;
      extra.characters!.records[0]!.reconstruction!.levels.push(
        ...extra.characters!.records[0]!.reconstruction!.levels,
      );
      expect(() => validateCharacterOverlays35(extra, scenario)).toThrow('class/level');
    });
    it('separates ranks from check modifiers and floors the combined entitlement once', () => {
      const sheet = structuredClone(character35(bundle.characters!, 'anuire-regent-027'));
      const s = sheet.reconstruction!;
      s.levels = [
        {
          ...s.levels[0]!,
          purchases: [
            { skill: 'diplomacy', halfRanks: 11 },
            { skill: 'warcraft', halfRanks: 2 },
            { skill: 'bluff', halfRanks: 10 },
          ],
        },
      ];
      expect(skillRanks35(sheet).diplomacy).toBe(5.5);
      expect(rating35(sheet, 'province')).toMatchObject({ raw: 6.5, bracket: 6, percent: 20 });
      const before = rating35(sheet, 'province');
      s.abilities.charisma = 30;
      s.feats.push({ id: 'skillFocus', target: 'diplomacy', level: 1, grant: 'general' });
      expect(rating35(sheet, 'province')).toEqual(before);
      expect(skillCheck35(sheet, 'diplomacy')!.total).toBeGreaterThan(5.5);
      expect(
        wholeRatedRP35([
          { levels: 1n, percent: 60 },
          { levels: 1n, percent: 60 },
        ]),
      ).toBe(1n);
      expect(wholeRatedRP35([{ levels: 10n ** 100n, percent: 100 }])).toBe(10n ** 100n);
    });
    it('checks divine slots, true arcane qualification and explicitly authored specialty choices', () => {
      const bard = character35(bundle.characters!, 'anuire-regent-067');
      expect(casting35(bard).sourceRealmMagic).toBe(false);
      expect(casting35(bard).classes[0]!.maximumSpellLevel).toBe(2);
      for (const id of ['082', '084', '091']) {
        const priest = character35(bundle.characters!, `anuire-regent-${id}`);
        expect(priest.completion).toBe('complete');
        expect(casting35(priest).templeRealmMagic).toBe(true);
      }
      expect(spellSlots35('paladin', 4, 11).find((s) => s.spellLevel === 1)?.total).toBe(0);
      expect(spellSlots35('paladin', 4, 12).find((s) => s.spellLevel === 1)?.total).toBe(1);
      const ranger = structuredClone(character35(bundle.characters!, 'anuire-regent-041'));
      ranger.reconstruction!.levels = Array.from({ length: 4 }, () => ({
        ...ranger.reconstruction!.levels[0]!,
        classId: 'ranger',
      }));
      ranger.reconstruction!.abilities.wisdom = 11;
      expect(casting35(ranger).divineFirst).toBe(false);
      ranger.reconstruction!.abilities.wisdom = 12;
      expect(casting35(ranger).divineFirst).toBe(true);
      const wizard = structuredClone(character35(bundle.characters!, 'anuire-regent-004'));
      expect(casting35(wizard).sourceRealmMagic).toBe(true);
      wizard.bloodline.score = 0;
      expect(casting35(wizard).sourceRealmMagic).toBe(false);
      for (const sheet of bundle.characters!.records.filter((r) => r.reconstruction)) {
        expect(sheet.reconstruction!.guildCraft.startsWith('craft:')).toBe(true);
        expect(sheet.reconstruction!.guildProfession.startsWith('profession:')).toBe(true);
      }
    });
    it('requires current same-domain authorization and never duplicates a selected alternative', () => {
      const state = createBirthright15Foundation(scenario, 'anuire-realm-02', {
        selectionMode: 'UNRESTRICTED',
      });
      const id = 'anuire-regent-004';
      expect(sourceHandler35(bundle, scenario, state, 'anuire-realm-02', id).eligible).toBe(true);
      expect(
        characterActor35(bundle, scenario, state, 'anuire-realm-02', 'anuire-regent-003').eligible,
      ).toBe(true);
      expect(
        sourceHandler35(bundle, scenario, state, 'anuire-realm-02', 'anuire-regent-003').eligible,
      ).toBe(false);
      const unit = state.characters!.find((c) => c.regentId === id)!;
      unit.role = undefined;
      expect(sourceHandler35(bundle, scenario, state, 'anuire-realm-02', id).eligible).toBe(false);
      unit.role = 'lieutenant';
      unit.realmId = 'anuire-realm-04';
      expect(sourceHandler35(bundle, scenario, state, 'anuire-realm-02', id).eligible).toBe(false);
      const alternative = createBirthright15Foundation(scenario, 'anuire-realm-02', {
        selectionMode: 'UNRESTRICTED',
        regentId: id,
      });
      expect(alternative.characters!.filter((c) => c.regentId === id)).toHaveLength(1);
      expect(sourceHandler35(bundle, scenario, alternative, 'anuire-realm-02', id).eligible).toBe(
        true,
      );
      for (const realm of scenario.realms)
        for (const c of realmRegentCandidates(scenario, realm.id))
          expect(character35(bundle.characters!, c.id).id).toBe(c.id);
    });
    it('requires actual matching content when loading attached overlays and preserves exact balances', () => {
      const refs = references35(bundle);
      expect(refs.characters!.fingerprint).toBe(
        createHash('sha256').update(canonicalOverlayJSON(bundle.characters)).digest('hex'),
      );
      expect(refs.handlers!.fingerprint).toBe(
        createHash('sha256').update(canonicalOverlayJSON(bundle.handlers)).digest('hex'),
      );
      const state = createBirthright15Foundation(scenario, 'anuire-realm-04', {
        selectionMode: 'UNRESTRICTED',
        overlays: refs,
      });
      const text = serializeCampaign(state),
        options = {
          domainRules: 'birthright-1.5' as const,
          expectedOverlays: refs,
          overlayContent: bundle,
        };
      expect(deserializeCampaign(text, scenario, options)).toEqual(state);
      expect(() => deserializeCampaign(text, scenario, { domainRules: 'birthright-1.5' })).toThrow(
        'overlay content',
      );
      const changed = structuredClone(bundle);
      changed.characters!.records[0]!.issues.push('changed');
      expect(() =>
        deserializeCampaign(text, scenario, { ...options, overlayContent: changed }),
      ).toThrow('fingerprint');
      const wrongVersion = structuredClone(bundle) as unknown as {
        characters: { version: string };
      };
      wrongVersion.characters.version = '2.0.0';
      expect(() => characterOverlay35Schema.parse(wrongVersion.characters)).toThrow();
      const badHandler = structuredClone(bundle);
      badHandler.handlers!.characters.fingerprint = 'a'.repeat(64);
      expect(() => validateCharacterOverlays35(badHandler, scenario)).toThrow(
        'exact character overlay',
      );
      const restored = deserializeCampaign(text, scenario, options);
      expect(restored.realms[0]!.regency).toBe(state.realms[0]!.regency);
    });
    it('provides derived sheets without altering the legacy scenario or consuming RNG', () => {
      const before = structuredClone(scenario);
      const sheet = derivedSheet35(character35(bundle.characters!, 'anuire-regent-005'))!;
      expect(sheet.level).toBe(16);
      expect(Object.values(sheet.classLevels).reduce((a, b) => a + b, 0)).toBe(16);
      expect(sheet.combat.baseAttack).toBeGreaterThan(0);
      expect(sheet.hp).toBeGreaterThan(0);
      expect(scenario).toEqual(before);
    });
    it('preserves 95 approved allocations and validates the 15 reviewed exceptions', () => {
      const content = JSON.parse(
        readFileSync('packages/world-data/anuire-characters15.json', 'utf8'),
      );
      const preserved = JSON.parse(
        readFileSync('docs/rules/validation/character-release-preservation.json', 'utf8'),
      );
      expect(Object.keys(preserved.records)).toHaveLength(95);
      for (const [id, hash] of Object.entries(preserved.records))
        expect(
          createHash('sha256')
            .update(JSON.stringify(content.records.find((r: { id: string }) => r.id === id)))
            .digest('hex'),
          id,
        ).toBe(hash);
      const reneava = character35(bundle.characters!, 'anuire-regent-110');
      expect(reneava.original.classCode).toBe(3);
      expect(reneava.inventory.avaClasses[0]).toMatchObject({ classCode: 3, level: 5 });
      expect(reneava.reconstruction!.levels.map((l) => l.classId)).toEqual(Array(5).fill('cleric'));
      expect(reneava.knownRealmSpells).toEqual(['divine-dispel', 'investiture-ritual']);
      expect(casting35(reneava).templeRealmMagic).toBe(true);
      for (const [id, level] of [
        ['017', 13],
        ['033', 16],
        ['051', 15],
      ] as const) {
        const sheet = character35(bundle.characters!, `anuire-regent-${id}`);
        expect(casting35(sheet).classes.find((c) => c.classId === 'wizard')!.level).toBe(level);
        expect(sheet.exceptionalProfile!.tacticalReadiness).toBe('partial');
        expect(sheet.reconstruction!.levels.length).toBe(
          sheet.exceptionalProfile!.progression.allocationLevels,
        );
      }
      for (const [id, patron, doctrine] of [
        ['082', 'Sera', 'TN'],
        ['084', 'Cuiraecen', 'NG'],
        ['091', 'Sera', 'TN'],
      ]) {
        const s = character35(bundle.characters!, `anuire-regent-${id}`).reconstruction!;
        expect(s.deity).toBe(patron);
        expect(s.sectDoctrine!.alignment).toBe(doctrine);
      }
    });
    it('preserves every Sierra Spider spell and explicitly approves virtual handling without Wizard or Source RP', () => {
      const spider = character35(bundle.characters!, 'anuire-regent-057');
      expect(spider.bloodline).toMatchObject({ score: 95, grade: 'true', derivation: 'Azrai' });
      expect(spider.original.bloodline).toMatchObject({ grade: 2, strength: 95 });
      expect(spider.exceptionalProfile!.progression.monsterHitDice).toEqual({
        number: 13,
        die: 8,
        bonus: 0,
      });
      expect(spider.sierraSpellEntitlement!.spells).toEqual(SPIDER_SIERRA_SPELLS35);
      expect(spider.sierraSpellEntitlement!.spells).toHaveLength(10);
      expect(casting35(spider)).toMatchObject({
        approved: true,
        trueArcaneFirst: false,
        sourceRealmMagic: false,
        templeRealmMagic: false,
        classes: [],
      });
      expect(rating35(spider, 'source')).toMatchObject({ raw: 3, percent: 0 });
      expect(eligibleRating35(spider, 'source')).toMatchObject({
        eligible: false,
        percent: 0,
        reason: 'spellcasting-gate',
      });
      expect(skillCheck35(spider, 'administrate')).toMatchObject({ ranks: 0, total: 1 });
      for (const spell of SPIDER_SIERRA_SPELLS35) {
        const access = spellEntitlement35(spider, spell.id);
        expect(access).toMatchObject({
          eligible: true,
          basis: 'sierra-monster-inventory',
          effectiveCastingLevel: 13,
          originalItemId: spell.originalItemId,
          executionActive: false,
        });
        expect(access.requirements!.additionalChecks.length).toBeGreaterThan(0);
      }
      expect(spellEntitlement35(spider, 'alchemy').eligible).toBe(false);
      expect(spellEntitlement35(spider, 'mass-destruction').requirements).toMatchObject({
        baseGB: 5,
        baseRP: 10,
        minimumHoldingLevel: 5,
      });
      const state = createBirthright15Foundation(scenario, 'anuire-realm-04', {
        selectionMode: 'UNRESTRICTED',
      });
      expect(
        characterSpellAccess35(
          bundle,
          scenario,
          state,
          'anuire-realm-29',
          spider.id,
          'death-plague',
        ).eligible,
      ).toBe(true);
      expect(sourceHandler35(bundle, scenario, state, 'anuire-realm-29', spider.id).eligible).toBe(
        true,
      );
      expect(
        characterSpellAccess35(
          bundle,
          scenario,
          state,
          'anuire-realm-04',
          spider.id,
          'death-plague',
        ).eligible,
      ).toBe(false);
      const altered = structuredClone(bundle);
      altered.handlers = null;
      altered
        .characters!.records.find((r) => r.id === spider.id)!
        .sierraSpellEntitlement!.spells.pop();
      expect(() => validateCharacterOverlays35(altered, scenario)).toThrow('spell entitlement');
      const fake = structuredClone(bundle);
      fake.handlers = null;
      fake.characters!.records[0]!.exceptionalProfile = structuredClone(spider.exceptionalProfile);
      expect(() => validateCharacterOverlays35(fake, scenario)).toThrow();
    });
    it.skipIf(
      !existsSync('reference/research-cache/birthright15/character-release-1.0.0/overlays.json'),
    )('loads explicitly supplied old overlays without migrating to the new release', () => {
      const old = JSON.parse(
        readFileSync(
          'reference/research-cache/birthright15/character-release-1.0.0/overlays.json',
          'utf8',
        ),
      );
      validateCharacterOverlays35(old, scenario);
      const refs = references35(old);
      const state = createBirthright15Foundation(scenario, 'anuire-realm-04', {
        selectionMode: 'UNRESTRICTED',
        overlays: refs,
      });
      const saved = serializeCampaign(state);
      expect(
        deserializeCampaign(saved, scenario, {
          domainRules: 'birthright-1.5',
          overlayContent: old,
        }),
      ).toEqual(state);
      expect(() =>
        deserializeCampaign(saved, scenario, {
          domainRules: 'birthright-1.5',
          overlayContent: bundle,
        }),
      ).toThrow('fingerprint');
    });
  },
);
