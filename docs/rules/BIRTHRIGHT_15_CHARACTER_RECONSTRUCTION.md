# Birthright 1.5 — character reconstruction release 1.2.0

Implemented 25 October 2026 against the approved v1.1 rules contract and the user's final character decisions, including the subsequent Spider spell, virtual Guild and racial-sheet approvals. Release1.2.0 completes only Spider's authored sheet after Increment4; all other115 authored and compiled records and actual handler permissions match release1.1.0. **Character content and pure selectors only; gameplay remains guarded.**

## Coverage

| Population                   | Total | Reviewed domain entries | Provisional entries | Unidentified |
| ---------------------------- | ----: | ----------------------: | ------------------: | -----------: |
| Original records             |   116 |                     110 |                   0 |            6 |
| Ordinary default rulers      |    49 |                      49 |                   0 |            0 |
| Active ruler/domain contexts |    80 |                      80 |                   0 |            0 |
| Classic candidates           |    36 |                      36 |                   0 |            0 |
| Expanded candidates          |    63 |                      63 |                   0 |            0 |

There are **109 validated ordinary allocation ledgers and one reviewed racial-HD ledger**, Spider's Monster13 sheet. The six unidentified IDs **030, 043, 044, 045, 046, 093** remain unidentified, without invented ranks or identities. Reviewed domain readiness does not certify a complete tactical/RPG stat block. Spider's ranks, feats and ability/HP allocations are explicitly authored conversion values, not recovered historical ranks. The four exceptional profiles carry individual trait evidence and `tacticalReadiness: partial`.

[Coverage JSON](BIRTHRIGHT_15_CHARACTER_COVERAGE.json) records exact counts, references, domain contexts, Administrate checks and individual capabilities. [Worksheets](BIRTHRIGHT_15_CHARACTER_WORKSHEETS.md) expose the actual authored allocations and special profiles. Original facts remain in `original` and inventory; authored ranks, feats, faiths, doctrines and capability bridges are clearly attributed as reconstructions.

## Applied decisions — exactly 15 original IDs

| ID                     | Reviewed result                                                                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 006 Arlean Borthinie   | Existing AVA Fighter10 ledger approved unchanged.                                                                                                                                                                                                           |
| 028 Caine              | Existing AVA level10 allocation approved: Wizard9/Scion Vorynn1, within the approved ordinary budget.                                                                                                                                                       |
| 038 Kars Fist-Smasher  | Existing AVA Fighter7 approved.                                                                                                                                                                                                                             |
| 048 Grundor Thorkin    | Existing AVA Fighter10 approved.                                                                                                                                                                                                                            |
| 058 Fistal Spitworst   | Existing AVA Fighter5 approved.                                                                                                                                                                                                                             |
| 064 Kraztal Skreedal   | Existing AVA Fighter7 approved.                                                                                                                                                                                                                             |
| 110 Reneava Shaltorn   | User explicitly approved AVA Cleric5 after the genuine Ranger/Priest conflict was presented. New legal Cleric5 ledger, authored Haelyn/Law/Good faith; recovered divine spell references retained. No appointment invented.                                 |
| 082 Larra Nielems      | Native NE retained; derived patron Sera, Luck/Trade domains and approved Neutral sect doctrine. Existing allocation preserved.                                                                                                                              |
| 084 Linnias Baccaere   | Native LG, Cuiraécen, Cleric7 and existing allocation preserved; approved NG sect doctrine.                                                                                                                                                                 |
| 091 Temias Coumain     | Native NG, Sera, Cleric8 and allocation preserved; approved Neutral sect doctrine.                                                                                                                                                                          |
| 037 Razzik Fanggrabber | Existing Fighter4 approved for domain use; subtype and racial tactical details deferred.                                                                                                                                                                    |
| 017 Danita / Chimaera  | Structured awnshegh profile; effective Wizard13; existing legal Wizard13 allocation preserved. Native half-elf record, abilities, HP87 and bloodline38 retained.                                                                                            |
| 033 Gorgon             | Bespoke parallel capability profile: effective martial25 and Wizard16. Existing 25-level allocation is explicitly a rank/feat budget, not his complete martial/casting profile. Native HP170 and Azrai True100 retained.                                    |
| 051 Rhuobhe            | Bespoke parallel capability profile: effective martial16 and Wizard15. Existing 16-level allocation supplies ranks/feats; it no longer limits casting to Wizard7. Native HP88, AVA elven ancestry and bloodline95 retained.                                 |
| 057 Spider             | Reviewed Monster13 / 13 Monstrous Humanoid HD, authored 80-point racial ledger and HP68, derived Azrai True95, ten original Sierra spells and separately approved virtual Guild handling. Raw Major95, zero abilities/HP and original class tuple retained. |

The **95 previously complete ordinary entries are unchanged**, including their levels, Scion model, purchases, spellbooks and feats. [Preservation manifest](validation/character-release-preservation.json) pins each full authored entry's SHA-256 and the previous release references. The initial 1.0.0 release had 95 complete / 14 provisional / seven unresolved; it remains archived, not silently upgraded.

## Reneava's exact source conflict

`RLMSTART.DAT` regent110 is at offset **2685**, length14, native class **3:5**. Historical `REGENTS.HXX::CLASS_ENUM` is one-based with `NO_CLASS=0`: 3 means Ranger. This is not an off-by-one decoder fix.

Original `SCENES/ID2016.AVA` explicitly documents its different enum: Fighter0, Paladin1, Ranger2, Priest3, Wizard4; its class record is **3 5 0**, Priest5. `PLAYCLAS.HXX::PLAYER_CLASS_INFO::TYPE` corroborates this. The existing adapter already prefers this AVA class for avatar2016. `ID2016.INV` contains **207 Divine Dispel** and **209 Investiture**, corroborated by `ITEMTYPE.HXX`, CD help and the existing realm-spell catalogue. Native Ranger5 and AVA Priest5 genuinely disagree. The user explicitly approved the AVA Cleric5 interpretation after seeing this conflict.

AVA SHA-256: `b6ba9fc1b7c8a2989b1fbe01f74bbe6ca0da4230db4ea7ea608c861a245b13fd`; INV: `d200250950f8be4304ca5795cc9db100db56cb7513abe50c74f46feb167c2de4`. The derived skill ledger spends 28 points at level1 and seven at each later level, total56, with native final attributes and LG unchanged. Patron/domains and purchases are authored; they are not claimed as recovered biography or office.

## Exceptional profile contract

`exceptionalProfile` separates source body/traits, actual allocation levels, effective martial/casting progression, optional recovered monster HD, derived grade, domain readiness and tactical readiness. Each trait has an edition, source, evidence status and deferred mechanical status. Unknown template HD and level adjustment are **null**, never free zero-cost templates.

The Gorgon/Rhuobhe bridge is an explicitly user-approved Sierra preservation model, not a claimed universal published 3.5 formula. The old legal ledgers remain allocation budgets: F14/Scion2/W9 and F7/Scion2/W7. Their ordinary class totals are not advertised as the full exceptional profiles. Effective Wizard16/15 drives pure casting slots/level selectors; no extra ranks, feats, ASIs, HD or ordinary spellbook entries arise. Chimaera retains Wizard13 without invented template costs. `derivedSheet35` labels exceptional combat output as allocation-ledger-only. Tactical martial progression is deferred.

Supported profile evidence includes CD Gorgon petrifying gaze/Wizard16 and native power items; BRCS2003 pp170–172 describes stone skin, horns, hooves, effective Wizard16 and edition-specific immunities. Its 916HP, bloodline60, equipment and huge stacked stat block are not substituted into Sierra. Rhuobhe's AVA race1 supports elven ancestry; native Fear/Regeneration remain separate. Danita's source half-elf record and Enhanced Sense/Regeneration items are preserved. Her detailed transformed anatomy, natural attacks, flight/breath and supernatural template numbers remain explicitly unverified; no generic chimera stat block is attached.

The Spider profile records arachnid/goblin form, natural attacks, poison, webs/jumping, regeneration and spider influence with per-trait evidence. The [archival transcription of TSR3100's Spider card](https://www.completecompendium.com/appendix/thespide/) attributes True95, claw/bite attacks, webs, jumps and spider affinity. This is attributed tabletop material, not independently recovered Sierra values. Native INV items218/224 support Fear/Regeneration; CD help supports poisonous spittle, regeneration and HP81. The card's HP81, Int11 and CE are separate observations; native zero HP/abilities/alignment remain unchanged.

The [release1.2.0 completion report](BIRTHRIGHT_15_SPIDER_COMPLETION.md) records his approved authored scores13/18/12/16/12/16, legal13d8 roll total55 plus13CON HP, 80 skill-point costs and five ordinary feats. The narrow Spider-specific racial class list does not change other classes. Pure derivation gives BAB13, Claw+14/Claw+14/Bite+11, saves5/12/9, grapple18, initiative8, AC22/touch13/flat-footed18 and poisonDC19. Web DCs, regeneration's lethal exceptions, SR17 and abdomen AC16 retain explicit partial/provisional status. All tactical execution remains deferred; HP68 and the six approved scores are authored values, not newly verified Sierra statistics.

## Spider's complete original spell access

Original `SCENES/ID1056.INV` SHA-256: `ebc621b97670f8eab8c3dce6286ee1bf184657d28dd21c9b00b498ddcb916de5`. Direct CD reads match the retained magic sidecar. The AVA hash is `52d571cc1a9ed441493047283e998e3c4d1b776e5bd0d9a61f6e50cd39de83ee`: class slots unset, monster HD **13d8**, three attacks; abilities/HP remain zero. No historical executable was run.

| Item | Original identity     | Scope     | INV line |
| ---: | --------------------- | --------- | -------: |
|  139 | Shocking Grasp        | Adventure |        5 |
|  145 | Morelf's Poison Arrow | Adventure |        6 |
|  147 | Fireball              | Adventure |        7 |
|  153 | Ice Storm             | Adventure |        8 |
|  156 | Cone of Cold          | Adventure |        9 |
|  157 | Disintegrate          | Adventure |       10 |
|  162 | Flesh to Stone        | Adventure |       11 |
|  193 | Death Plague          | Realm     |       22 |
|  196 | Legion of the Dead    | Realm     |       23 |
|  197 | Mass Destruction      | Realm     |       24 |

The original Poison Arrow spelling and original spell levels remain source facts; Sierra Disintegrate level5 is not silently relabeled a 3.5 level5 spell. Items218 Fear and224 Regeneration are blood abilities, not two extra spells. **Alchemy is absent and is not granted.** `sierraSpellEntitlement` stores every spell's native ID, identity, scope, line and hashed inventory provenance.

`spellEntitlement35` and `characterSpellAccess35` recognize the explicit Monster13 entitlement without ordinary Wizard levels. They return character-side permission and retained requirements, not executable magic approval. Death Plague retains 2GB and RP equal to affected province levels; Mass Destruction retains 5GB and 10RP/unit; Legion retains the CD-help 1GB/4RP one-unit basis and its unresolved unit-profile execution blocker. V10 remote costs, casting opportunities, local Source/ley access, actual domain authority, legal targets and resource affordability remain required. Adventure casting keeps preparation/usage, target/range and edition conversion gates. Execution remains later work.

The later user instruction **separately approves Spider as a virtual Guild handler**. `virtualGuildHandler35` and the existing `sourceHandler35` actor gate recognize this exception. He must still be the current ruler or an explicitly authorized lieutenant. Spell ownership alone is not the reason for that economic permission. `casting35.sourceRealmMagic` remains false for ordinary wizard/Source RP purposes. His reviewed racial ledger now supplies Province rating12 and Law16, but grants no Source or Temple RP qualification. Future magic must use spell entitlement rather than using the economic handler selector as a spell gate.

## Selectors, persistence and reproduction

Ranks, rated RP and Administrate use the validated ordinary or Spider racial allocation ledger; ratings exclude ability/feat/check bonuses. Spider's unpurchased Administrate has a Wisdom-only +1 check, with no automatic discount. The three approved doctrines validate priest-to-sect and sect-to-patron alignment independently. Divine eligibility grants no appointment, holding access or unlisted realm spell.

Current release: **characters1.2.0 / handlers1.2.0**, canonical `sorted-json-v1`, real SHA-256. Exact hashes are in the [coverage JSON](BIRTHRIGHT_15_CHARACTER_COVERAGE.json) and [Spider release report](BIRTHRIGHT_15_SPIDER_COMPLETION.md). Both versions remain independently referenced and the handler payload pins its exact character hash. Explicitly supplied archived1.0.0 and1.1.0 content still loads with its original references; old1.1.0 RP snapshots keep Spider's old unknown quote. Missing, altered, cross-paired or unsupported content fails. There is no latest-version fallback or automatic saved-campaign migration.

Run `node scripts/report-anuire-characters15.mjs` to rebuild worksheets, coverage and the private compiled payload from the existing authored choices. It validates allocations and all five preserved research-input hashes. **Do not rerun the original bulk authoring script** to regenerate these accepted entries. Previous choices, payloads, coverage and worksheets remain under `reference/research-cache/birthright15/character-release-1.0.0/` and `character-release-1.1.0/`. The [115-record preservation manifest](validation/spider-completion-preservation.json) covers the release1.2.0 change.

There are **28** approved ordinary Source casting qualifications and **27** Temple qualifications. Handler coverage includes the independently approved Spider exception; use the coverage JSON for exact current handler counts. Conditional entries remain possibilities across ruler/lieutenant selections, not concurrent active appointments.

[Focused financial reconciliation](validation/character-finalization-economy.json) retains the release1.1.0 updates to the frozen Increment3 baseline. The subsequent [Spider-only reconciliation](validation/spider-completion.json) gives5 seasonal RP from the actual opening holdings, with unchanged +3GB NPC / +2GB player cash forecasts and no opening virtual cash. Aggregate certified RP becomes912 by arithmetic update to the frozen907-RP baseline. No economic formula or original campaign record changes. Basic automatic, Advanced guided and Expert manual retain the same simulation.

## Remaining activation boundaries

All15 character decisions and Spider's subsequent racial-sheet corrections are applied. Spider's skill-rated RP/Admin content gate is resolved. The six unidentified unused records remain blocked if later activated. Special tactical templates, the documented Spider-only provisional details and additional exceptional ordinary spellbook details remain partial; they do not block supported domain spell entitlements or Increment5 order infrastructure.

The [Increment4 implementation](BIRTHRIGHT_15_REGENCY_IMPLEMENTATION.md) supplies explicit RP/bloodline/resource operations using the exact supplied overlay version. Release1.2.0 adds Spider's reviewed inputs without changing those formulas or old saved references. It does not activate generic gameplay, spell execution, full seasonal settlement, domain commands, AI behavior or character UI. The17 previously reproduced domain-action/fealty fixture failures remain visible for M1B integration, unchanged by this task. See [implementation verification](../BIRTHRIGHT_15_IMPLEMENTATION.md).
