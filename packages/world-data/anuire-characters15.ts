import { z } from 'zod';
import type { Scenario } from '../core/schema';
import {
  characterOverlay35Schema,
  handlerOverlay35Schema,
  reconstruction35Schema,
  exceptionalProfile35Schema,
  sierraSpellEntitlement35Schema,
  evidence35Schema,
  references35,
  validateCharacterOverlays35,
  type CharacterSheet35,
  type CharacterOverlays35,
} from '../core/character-sheets';
import { GRADES35 } from '../core/character-rules35';
import { realmRegentCandidates } from '../core/regents';
import { PC_REALM_SPELLS } from '../core/realm-spells';
import { validateAnuireResearch } from './anuire-research';
import { anuireMagicSchema } from './anuire-magic';
import content from './anuire-characters15.json';

const choicesSchema = z.strictObject({
  version: z.enum(['1.0.0', '1.1.0', '1.2.0']),
  baseRecordVersion: z.literal('1.1.0').optional(),
  method: z.string(),
  records: z.array(
    z.strictObject({
      id: z.string(),
      revisionVersion: z.literal('1.2.0').optional(),
      completion: z.enum(['complete', 'provisional', 'unresolved']),
      review: z.enum(['authored-checked', 'requires-review', 'unresolved']),
      reconstruction: reconstruction35Schema.nullable(),
      exceptionalProfile: exceptionalProfile35Schema.optional(),
      sierraSpellEntitlement: sierraSpellEntitlement35Schema.optional(),
      releaseEvidence: z.array(evidence35Schema).optional(),
      issues: z.array(z.string()),
    }),
  ),
});

/** Derived content attaches to the existing scenario; never a replacement scenario loader.
 * Private facts are joined at explicit caller opt-in, not bundled in the browser. */
export function buildAnuireCharacterOverlays35(
  scenario: Scenario,
  input: unknown,
  magicInput: unknown,
  authored: unknown = content,
): CharacterOverlays35 {
  const raw = validateAnuireResearch(input),
    magic = anuireMagicSchema.parse(magicInput),
    choices = choicesSchema.parse(authored);
  if (
    !scenario.fingerprint ||
    raw.campaign.regents.length !== 116 ||
    scenario.regents?.length !== 116
  )
    throw new Error('Requires the complete original Anuire scenario');
  if (!raw.sources.some((s) => s.id === 'cd-template' && s.sha256 === magic.sourceSha256))
    throw new Error('Character inventory source mismatch');
  if (choices.records.length !== 116 || new Set(choices.records.map((r) => r.id)).size !== 116)
    throw new Error('Authored character coverage must be exactly 116');
  const records: CharacterSheet35[] = raw.campaign.regents.map((r) => {
    const source = scenario.regents!.find((s) => s.id === r.id),
      choice = choices.records.find((s) => s.id === r.id),
      inventory = magic.characters.find((s) => s.regentId === r.id);
    if (!source || !choice || !inventory)
      throw new Error(`Missing original/choice/inventory ${r.id}`);
    return {
      id: r.id,
      name: source.name,
      completion: choice.completion,
      review: choice.review,
      original: structuredClone(r),
      inventory: {
        avatarId: inventory.avatarId ?? null,
        verified: inventory.inventoryVerified,
        itemIds: [...inventory.itemIds],
        avaClasses: (inventory.classes ?? []).map((c) => ({
          ...c,
          experience:
            (
              r.identity?.classes as
                { classCode: number; level: number; experience: number }[] | undefined
            )?.find((s) => s.classCode === c.classCode && s.level === c.level)?.experience ?? null,
        })),
      },
      bloodline: {
        score: r.bloodline.strength,
        derivation: source.bloodline.derivation,
        grade:
          choice.exceptionalProfile?.derivedBloodlineGrade ??
          GRADES35[r.bloodline.grade] ??
          'unknown',
        abilities: [...source.bloodline.abilities],
      },
      knownRealmSpells: PC_REALM_SPELLS.filter(
        (s) => s.originalItemId !== undefined && inventory.itemIds.includes(s.originalItemId),
      ).map((s) => s.id),
      reconstruction: choice.reconstruction,
      ...(choice.exceptionalProfile ? { exceptionalProfile: choice.exceptionalProfile } : {}),
      ...(choice.sierraSpellEntitlement
        ? { sierraSpellEntitlement: choice.sierraSpellEntitlement }
        : {}),
      issues: choice.issues,
      provenance: [
        {
          paths: [
            'original',
            'inventory',
            ...(choice.exceptionalProfile?.derivedBloodlineGrade ? [] : ['bloodline']),
          ],
          category: 'original',
          confidence: 'high',
          sources: [
            ...((r.evidence as { sourceIds?: string[] } | undefined)?.sourceIds ?? ['cd-template']),
          ],
          rationale:
            'Verbatim CD template/AVA record and decoded inventory. Stored template, not certified post-New-Game behavior.',
        },
        {
          paths: ['knownRealmSpells'],
          category: 'original',
          confidence: inventory.inventoryVerified ? 'high' : 'low',
          sources: [`avatar-${inventory.avatarId}`, 'PC_REALM_SPELLS'],
          rationale:
            'Recovered inventory IDs only; existing HD priest defaults are deliberately excluded.',
        },
        {
          paths: ['reconstruction.rules'],
          category: 'source_verified',
          confidence: 'high',
          sources: [
            'BRCS-ch1-v1.1:pp1-9,22-24',
            'BRCS-ch2-v1.1:pp4-7',
            'SRD35:classes-skills-feats',
          ],
          rationale:
            'Published allocation rules and class/racial framework; this attribution does not verify individual authored allocations.',
        },
        {
          paths: [
            choice.exceptionalProfile?.monsterSheet
              ? 'exceptionalProfile.monsterSheet'
              : 'reconstruction',
          ],
          category:
            choice.reconstruction || choice.exceptionalProfile?.monsterSheet
              ? 'reconstructed'
              : 'unknown',
          confidence:
            choice.completion === 'complete' ? 'medium' : choice.reconstruction ? 'low' : 'unknown',
          sources: [
            `anuire-characters15.json:${choice.revisionVersion ?? choices.baseRecordVersion ?? choices.version}`,
          ],
          rationale: choice.exceptionalProfile?.monsterSheet
            ? 'User-approved authored 3.5 racial-HD conversion. Original zeroed abilities/HP remain archival unknowns; derived ranks, feats and fixed rolls are not recovered Sierra facts.'
            : choice.reconstruction
              ? 'Authored 3.5 conversion, not historical skill/feat recovery. Native numerical bloodline and final abilities preserved.'
              : choice.exceptionalProfile
                ? 'Reviewed monster domain profile; unknown ordinary abilities and skill ranks remain unknown. Explicit Sierra spells are governed separately.'
                : 'No identifiable person or usable abilities; no ranks, feats or casting supplied.',
        },
        ...(choice.releaseEvidence ?? []),
        {
          paths: [
            'reconstruction.equipmentBonuses',
            'reconstruction.bloodAbilityPowers',
            'original.culturalUpbringing',
          ],
          category: 'unknown',
          confidence: 'unknown',
          sources: [],
          rationale:
            'Item IDs are not invented enhancement bonuses; detailed blood powers and nonhuman upbringing remain unestablished.',
        },
      ],
    };
  });
  const characters = characterOverlay35Schema.parse({
    kind: 'birthright15-characters',
    version: choices.version,
    canonicalization: 'sorted-json-v1',
    scenarioFingerprint: scenario.fingerprint,
    sources: raw.sources
      .map((s) => ({ id: s.id, sha256: s.sha256 }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    records,
  });
  const ref = references35({ characters, handlers: null }).characters!;
  const handlers = handlerOverlay35Schema.parse({
    kind: 'birthright15-handlers',
    version: choices.version,
    canonicalization: 'sorted-json-v1',
    scenarioFingerprint: scenario.fingerprint,
    characters: ref,
    records: scenario.realms.flatMap((realm) => {
      const candidates = realmRegentCandidates(scenario, realm.id);
      const rulerIds = new Set([realm.regent.id, ...candidates.map((c) => c.id)]);
      return [...rulerIds].flatMap((id) => {
        const deployed = scenario.initial.characters?.some(
          (c) => c.regentId === id && c.realmId === realm.id,
        );
        const review =
          records.find((r) => r.id === id)?.completion === 'complete'
            ? 'evidence-checked'
            : 'requires-review';
        return [
          {
            realmId: realm.id,
            characterId: id,
            authority: 'ruler',
            validFromTurn: 1,
            validThroughTurn: null,
            review,
            evidence: id === realm.regent.id ? 'scenario-ruler' : 'candidate-deployment',
          },
          ...(deployed && candidates.some((c) => c.id === id)
            ? [
                {
                  realmId: realm.id,
                  characterId: id,
                  authority: 'lieutenant',
                  validFromTurn: 1,
                  validThroughTurn: null,
                  review,
                  evidence: 'candidate-deployment',
                },
              ]
            : []),
        ];
      });
    }),
  });
  const bundle = { characters, handlers };
  validateCharacterOverlays35(bundle, scenario);
  return bundle;
}
