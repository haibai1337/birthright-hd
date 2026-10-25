# Spider057 — reviewed D&D3.5 racial sheet, release1.2.0

Implemented after Increment4, before Increment5, under the user's completion prompt and final mechanical addendum. **This is character data, pure derivation/eligibility and read-only forecasting. Tactical combat, spells, generic commands and full Maintenance remain disabled for Birthright1.5.**

## Source versus conversion

| Layer                                   | Evidence / result                                                                                                              | Status                                                                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Immutable Sierra record                 | Regent057, avatar1056, Spiderfell; native Major Azrai95, zero six abilities/HP/alignment; native class tuple retained          | Original, unchanged                                                                                                                                                                                |
| Original AVA / inventory                | 13d8 monster HD; all ten original spells; Fear218 and Regeneration224                                                          | Recovered original identities/data, unchanged                                                                                                                                                      |
| CD `RULES.TXT`, Spider King row         | HP81, AC−2, THAC0 7, three attacks, damage1d10+3, magic resistance15%, regeneration/spittle description                        | Original help; **does not independently verify HP68 or the six proposed scores**                                                                                                                   |
| Original tabletop Spider card           | Tal-Qazar, CE, True Azrai95, arachnid/goblin body, claws/bite, poison, webs, exceptional leaps, regeneration, spider influence | Attributed [TSR3100 archival transcription](https://www.completecompendium.com/appendix/thespide/); not silently mixed with Sierra statistics                                                      |
| User-supplied Sierra-oriented reference | STR13 DEX18 CON12 INT16 WIS12 CHA16; HP68                                                                                      | Bibliographic source unidentified; implemented as explicitly approved **authored conversion**, not verified Sierra recovery                                                                        |
| D&D3.5 chassis and calculations         | Large Monstrous Humanoid, 13 racialHD, five feat slots, 80 skill points, derived attack/save/DC values                         | [SRD type rules](https://www.d20srd.org/srd/typesSubtypes.htm#monstrousHumanoidType) and [HD advancement rules](https://www.d20srd.org/srd/improvingMonsters.htm); individual choices are authored |
| Active Birthright1.5 bloodline          | **Azrai True95** initially; subsequent S uses Increment4's separate derived state                                              | Previously user-approved; archival Major95 is not the active grade                                                                                                                                 |

The source zeroes remain in `original`. The complete racial sheet is `exceptionalProfile.monsterSheet`, under the same stable ID057. `reconstruction` remains null because it denotes ordinary class progression; no Wizard or Scion levels are fabricated. Shared selectors now read the reviewed racial ledger. Other115 authored and compiled records, all actual handler permission records, imported scenario/source fingerprints and game saves are unchanged.

## Changed files

| Files                                                                                                                                                                                                     | Change                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/core/spider-sheet35.ts`                                                                                                                                                                         | New Spider-only schema, per-HD validation and pure derivation                                |
| `packages/core/character-sheets.ts`, `index.ts`                                                                                                                                                           | Racial ledger selectors, reviewed1.2.0 validation and exports                                |
| `packages/core/regency15.ts`, `economy15.ts`                                                                                                                                                              | Accept the exact reviewed1.2.0 overlay pair alongside archived1.1.0; no formula changes      |
| `packages/world-data/anuire-characters15.json`, `anuire-characters15.ts`                                                                                                                                  | Only057's authored sheet; per-record provenance version preservation and paired fingerprints |
| `scripts/report-anuire-characters15.mjs`, `report-spider-completion15.mjs`                                                                                                                                | Racial worksheet output and scoped preservation/forecast report                              |
| `scripts/report-anuire-character-finalization.mjs`, `report-anuire-regency15.mjs`                                                                                                                         | Protect historical1.1.0 reports from newer-content regeneration                              |
| `tests/spider-completion.test.ts`, `character-overlays.test.ts`, `regency15.test.ts`                                                                                                                      | New completion regressions and corrected current-sheet expectations                          |
| This report; `BIRTHRIGHT_15_CHARACTER_RECONSTRUCTION.md`, `BIRTHRIGHT_15_CHARACTER_WORKSHEETS.md`, `BIRTHRIGHT_15_CHARACTER_COVERAGE.json`, `BIRTHRIGHT_15_REGENCY_IMPLEMENTATION.md` under `docs/rules/` | Current release, exact allocations/coverage and frozen-versus-current RP reconciliation      |
| `docs/rules/validation/spider-completion-preservation.json`, `spider-completion.json`                                                                                                                     | Unchanged115-record hashes and reproducible focused results                                  |
| `docs/BIRTHRIGHT_15_IMPLEMENTATION.md`, `GAMEPLAY_SYSTEMS.md`, `KNOWN_ISSUES.md`, `ROADMAP.md`                                                                                                            | Current status, verification and remaining integration boundaries                            |

The private compiled derived overlay is refreshed in the established extracted-data location. Earlier1.1.0 authored choices, compiled overlays, coverage and worksheets are retained in the existing research cache; original inputs and saves are not rewritten.

## Final derived statistics

| Statistic                | Value / derivation                                               |
| ------------------------ | ---------------------------------------------------------------- |
| Identity / model         | The Spider / Tal-Qazar; unique awnshegh; Monster13               |
| Type / size / alignment  | Monstrous Humanoid / Large / CE                                  |
| Abilities and modifiers  | STR13(+1), DEX18(+4), CON12(+1), INT16(+3), WIS12(+1), CHA16(+3) |
| HP / racial HD           | **68 / 13d8**                                                    |
| BAB                      | +13                                                              |
| Base saves F/R/W         | +4 / +8 / +8                                                     |
| Total saves F/R/W        | **+5 / +12 / +9**                                                |
| Initiative               | +8 = DEX4 + Improved Initiative4                                 |
| Grapple                  | +18 = BAB13 + STR1 + Large4                                      |
| AC / touch / flat-footed | **22 / 13 / 18**; AC10 + DEX4 − size1 + natural armor9           |
| Ground / climb speed     | 40ft / 20ft, authored                                            |
| Full natural attack      | **Claw+14 / Claw+14 / Bite+11**                                  |
| Damage                   | Each claw1d10+1; bite1d6 plus poison                             |
| Poison save              | **Fortitude19** = 10 + floor(13/2) + CON1 + Ability Focus2       |

Attack modifiers are derived from actual weapon type/primary status and applicable feats. Claws use `13+1−1+1=14`; bite uses `13+1−1−2=11`. Weapon Focus(Claw) never applies to bite. [Multiattack](https://www.d20srd.org/srd/monsterFeats.htm#multiattack) changes only the secondary penalty; it creates no new attacks. Secondary bite damage uses half STR bonus, rounded down: +0. High BAB does not grant iterative natural attacks. No manually copied attack totals drive the selectors.

HP rolls are **8,3,4,4,4,4,4,4,4,4,4,4,4**, sum55; thirteen CON bonuses add13, yielding68. Every roll is legal on d8. The ledger's authored base DEX15 receives its bookkeeping increases at HD4/8/12, yielding the approved final18. Those increases and final size/racial adjustments are already included; they are never added again. These are conversion allocations, not recovered advancement history.

## Skills, costs and feats

The SRD gives this intelligent type `(2+INT modifier)` points perHD, quadrupled at its firstHD: `5×(13+3)=80`. The narrow policy `spider-057-reviewed-racial-skills-v1` lists exactly the following twelve racial class skills. It is authored for057, not a global alteration of Monstrous Humanoids or ordinary character classes. Other skills retain double point cost and half the class rank cap.

| Skill             | Purchased ranks / points |
| ----------------- | -----------------------: |
| Warcraft          |                        9 |
| Lead              |                        7 |
| Intimidate        |                        9 |
| Bluff             |                        6 |
| Diplomacy         |                        3 |
| Hide              |                        8 |
| Move Silently     |                        8 |
| Climb             |                        8 |
| Spot              |                        8 |
| Listen            |                        7 |
| Sense Motive      |                        4 |
| Knowledge(Nature) |                        3 |
| **Total**         |              **80 / 80** |

The actual per-HD purchase ledger spends20 points atHD1 and5 at each laterHD. Validation checks each purchase's price and cumulative cap, not merely the final rank sum. A class skill caps at HD+3, and a cross-class skill at half that value. Removing Warcraft from the racial class list therefore causes both cost and cap failures. The shared ordinary validator is unchanged.

| HD slot | Authored feat         | Prerequisite / use                                   |
| ------: | --------------------- | ---------------------------------------------------- |
|       1 | Multiattack           | Three natural attacks: two claws and bite            |
|       3 | Ability Focus(Poison) | Existing poison special attack; DC+2                 |
|       6 | Improved Initiative   | Initiative+4                                         |
|       9 | Alertness             | Listen/Spot check bonuses+2                          |
|      12 | Weapon Focus(Claw)    | Natural-weapon proficiency and BAB≥1; claw attacks+1 |

These are five ordinary HD feat slots, not bonus feats. Prerequisites and targets are validated. Feat bonuses are check modifiers rather than purchased ranks. [SRD feat rules](https://www.d20srd.org/srd/feats.htm#weaponFocus) and [monster feats](https://www.d20srd.org/srd/monsterFeats.htm#abilityFocus) supply the mechanical rules.

Guild Craft(woodworking) and Profession(steward) are authored zero-rank specialty labels; neither receives extra points. Administrate is explicitly unpurchased. Its BRCS `Administrate(Wis)` heading has no trained-only restriction; the [general untrained-check rule](https://www.d20srd.org/srd/skills/usingSkills.htm#untrainedSkillChecks) therefore allows the current +1 Wisdom-only check. There is no automatic discount. Spot is+11, Listen+10, Climb+17 (including the climb-speed racial+8), and Hide+8 (including Large−4). These checks do not alter RP ranks.

## Regency and economic reconciliation

| Category |                                                          Rating | Bracket percentage | Actual eligibility                                  |
| -------- | --------------------------------------------------------------: | -----------------: | --------------------------------------------------- |
| Province |                                 Diplomacy3 + Warcraft9 = **12** |               100% | Yes                                                 |
| Law      |                                      Lead7 + Warcraft9 = **16** |               100% | Yes                                                 |
| Guild    | (Bluff6 + Diplomacy3 + Intimidate9 + Sense Motive4)/4 = **5.5** |    0% after floor5 | Reviewed skills, zero collection percentage         |
| Temple   |                                           Lead7 + Religion0 = 7 |            40% raw | **No divine qualification**                         |
| Source   |                                           Arcana0 + Nature3 = 3 |                 0% | **No ordinary true-arcane/Source RP qualification** |

The [focused calculation](validation/spider-completion.json) reads actual imported Spiderfell assets and calls the unchanged Increment4 formulas. Opening eligible province levels total5; there are no positive eligible Law levels. **Q=5 and new collection=min(5,S95)=5RP**, replacing the prior unknown quote. No fixed income special case is added. The preserved opening bank50 projects55 before spending; arbitrarily large banks also receive the5RP without a storage ceiling.

Only Spiderfell's NPC/player RP and cash forecasts were rerun. NPC cash net remains **+3GB** and player-controlled cash net **+2GB**; opening virtual income remains0 because the original holdings produce none. His separate virtual Guild handler permission remains active when he is actual ruler or authorized lieutenant. A labeled Source6 regression still earns4/3GB virtual cash and grants no Source RP.

The retained Increment4 baseline described48 known quotes totaling907RP and one unknown. The algebraic update is **49 known quotes / 912 certified RP**. This is not another49-domain recalculation or a modified economic formula. No collection, spending, bloodline development or save migration occurs when the overlay or report is rebuilt.

## Special abilities: data versus execution

- **Venom:** bite-delivered extraordinary attack, derived DC19. The prospective conversion explicitly preserves the 2e bite's lethal failed-save severity and20HP damage on success, rather than claiming ordinary 3.5 poison equivalence. No unsupported delayed secondary damage is added. Tactical execution is deferred.
- **Web:** creation, a40ft cube, web-like entanglement/immobilization, nonflammability and the attributed1–2day duration are represented. Revised Reflex/Escape Artist/Strength DCs are null and marked conversion-partial. It is an ability, not an added Web spell.
- **Mobility:** authored40ft ground/20ft climb; attributed30ft vertical/50ft horizontal exceptional leap with original attack-roll resolution. The latter has no invented 3.5 DC. Standard untrained Jump/check adjustments remain separate from the exceptional leap.
- **Regeneration:** the approved prospective rate is1HP/round. Standard [3.5 regeneration's nonlethal model](https://www.d20srd.org/srd/specialAbilities.htm#regeneration) is identified, while lethal exceptions remain explicitly null/provisional. The original dismember/burn/salt destruction account is retained separately. No unconditional immortality or invented acid/fire exception is enabled.
- **Spider influence:** attributed communication/influence over spiders; extent unestablished, no new political authority or diplomacy bonus.
- **Fear:** original blood-ability item218, not an extra adventure spell.
- **Resistance and abdomen:** original15% magic resistance remains source data. Proposed SR17 is provisional, with no claimed one-to-one conversion. Abdomen AC16 is a future candidate only. Neither is a live combat subsystem.

All capabilities retain provenance and deferred execution flags. The sheet's domain data is reviewed; tactical readiness remains partial because these specific conversions and the tactical engine are not complete. Those limits do not block domain-order infrastructure in Increment5.

## All ten original spells retained

| Original item | Original identity     | Sierra spell level / scope |
| ------------: | --------------------- | -------------------------- |
|           139 | Shocking Grasp        | 1 / adventure              |
|           145 | Morelf's Poison Arrow | 2 / adventure              |
|           147 | Fireball              | 3 / adventure              |
|           153 | Ice Storm             | 4 / adventure              |
|           156 | Cone of Cold          | 5 / adventure              |
|           157 | Disintegrate          | 5 / adventure              |
|           162 | Flesh to Stone        | 6 / adventure              |
|           193 | Death Plague          | Realm entry                |
|           196 | Legion of the Dead    | Realm entry                |
|           197 | Mass Destruction      | Realm entry                |

The `sierraSpellEntitlement` object is unchanged, including inventory SHA-256, line provenance, original names, levels and IDs. `spellEntitlement35` / `characterSpellAccess35` still authorize the Monster13 exception without Wizard levels. Costs, legal targets, actual office, Source/ley access and casting opportunity remain required. **Alchemy and unowned spells are not granted.** Future magic must read these spell entitlements separately from the economic handler and ordinary Source-RP gates.

## Versioning, preservation and verification

Character and handler overlays are **1.2.0**, with exact pairing and canonical SHA-256:

- Characters: `da991cb3f4f418b0b2ca342a68ceab58ecb3d1f53cde37c543e9ab9f124fdf55`.
- Handlers: `28fe78806a9cd92154d89082d664e4598ac51dd8c1f55ce9caa432d93543415f`.

The [preservation manifest](validation/spider-completion-preservation.json) pins all115 unchanged authored records; the scoped report also deep-compares all115 compiled records and every actual handler permission against archived1.1.0. Only Spider and release references change. Prior authored choices, compiled overlays, coverage and worksheets remain under `reference/research-cache/birthright15/character-release-1.1.0/`.

Explicitly supplied1.1.0 content still loads its old unknown-skill RP snapshots exactly; it never acquires new ranks on load. New1.2.0 content cannot substitute for old saved references. No original source, campaign, balance or overlay fingerprint is silently migrated. Baseline financial/RP reports remain frozen; `node scripts/report-spider-completion15.mjs` reproduces only the affected forecast. `node scripts/report-anuire-characters15.mjs` rebuilds coverage/worksheets from existing authored records and performs no bulk authoring.

Focused tests cover the80-point costs/caps, legal rolls/feats, all derived totals, dynamic attack/poison modifiers, unchanged original fields and115 records, current RP collection/unlimited bank, all ten spells, no Alchemy/Source/Temple privilege, virtual cash, old snapshots, strict pairing and general execution guards. See [the implementation log](../BIRTHRIGHT_15_IMPLEMENTATION.md) for completed checks. No broad simulations, screenshots, native builds or tactical/realm-magic execution were performed. The prior17 legacy fixture failures remain outside this task.

**Increment5:** Spider's ordinary skill/RP/Admin content gate is resolved. No new domain-policy decision is required. Tactical-only provisional details remain explicit, and exact domain/court orders, actor/action opportunities and later full Maintenance/UI still need their authorized increments. Birthright1.5 gameplay and M1B remain incomplete.
