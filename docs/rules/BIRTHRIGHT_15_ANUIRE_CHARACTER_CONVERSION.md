# Birthright 1.5 — Anuire character and bloodline conversion research

Date: **2026-10-24**. Research only; J01–J08 remain binding. Companion to the [economic validation](BIRTHRIGHT_15_ANUIRE_ECONOMIC_VALIDATION.md).

## Inventory: recovered fields versus missing rules data

The [116-record inventory](validation/regents.csv) preserves original IDs, realm association, avatar/deployment references, numerical bloodline, derivation/grade, both native and AVA class/level fields, six ability scores, HP and alignment. It identifies original default rulers and every currently offered candidate. [Ruler comparison](validation/ruler-variants.csv) covers 80 actual domain/ruler combinations: 49 active defaults plus offered alternatives, including all 36 Classic and 63 expanded candidates. Holding-only rulers are included even though ordinary New Game does not offer their domains.

| Evidence                             | Result                                                  | Interpretation                                                                                                        |
| ------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| AVA identity object                  | Present for 116 records                                 | Presence does not establish a real named character.                                                                   |
| Identified names                     | 110; six generic `unknown` identities reuse avatar 1999 | Preserve the six records; do not assign them optimized skills or ordinary player roles.                               |
| Six positive numerical attributes    | 115 records                                             | Five generic unknown records still contain numerical template values. Those are not trustworthy personal biographies. |
| Native numerical bloodline           | Range 0–100; six records at zero; 64 odd scores         | Numerical score is distinct from grade; odd-score rounding affects more than half the roster.                         |
| BRCS rank allocation                 | None recovered/verified                                 | Every `proposedRanks` field remains blank, not zero.                                                                  |
| Command/diplomacy in runtime adapter | Both are zero sentinels                                 | They are not the recovered AVA Charisma/Intelligence and must not be used as BRCS skill ranks.                        |

Recovered native class codes and AVA class tuples are both retained because special avatars and source/class discrepancies need review. The existing adapter deliberately falls back to native classes for specific special avatars; the worksheet exposes its resulting classes without asserting that this is a complete 3.5 conversion. Race codes, character class, bloodline ownership and actual ability to learn/cast realm magic must be reconciled individually. Existing Source ownership stays intact even when the ruler is not the caster.

The parser/known AVA structure provides physical/mental abilities, combat fields and class experience, not a BRCS skill-point allocation. This is a bounded statement about the inspected layout, not a claim that every unknown character-tail byte has been decoded. Source evidence: existing `campaign.ts::parseAvatarText`, Anuire research records and privately inspected `AVA.HXX` at the previously recorded historical revision. No historical implementation code is reproduced here.

## Authentic skill research and its limits

The publisher-hosted [Kalien stat block](https://birthright.net/wiki/index.php/Kalien) contains community d20 skill **check modifiers**, including conditional reputation adjustments. It is relevant attributed conversion evidence, not recovered Sierra ranks. Craft is not supplied as a complete component of his Guild collection allocation; subtracting ability modifiers cannot reliably reconstruct every rank because synergies, racial effects, feats and situational modifiers intervene.

The community [Friemen Caine entry](https://birthright.net/wiki/index.php/Friemen_Caine) leaves its Skills field blank and uses Wizard 7/Natural Magician 3. Sierra's recovered Caine is Wizard 10 with different ability values. Replacing his original class record with that article would silently choose another conversion. Searches for Marlae, Aelies and Suris did not establish complete original-compatible rank sets. Aelies' organization dossier supplies descriptive roles, not ranks. This was a targeted source search, not a claim to have exhausted every private campaign sheet.

A publisher-hosted [database discussion](https://forum.birthright.net/t/database/24177) identifies a user-created Anuire collection and explicitly says some campaign statistics changed during play. Such a sheet cannot be treated as the original Sierra template. The [older campaign-data discussion](https://forum.birthright.net/t/campaign-province-domain-holding-regent-unit-information-source/4332) establishes that community databases exist, but does not establish verified BRCS rank allocations for these 116 IDs. No external database was imported or used to alter a campaign record. Unrelated fan characters returned by searches were excluded.

Therefore the authentic result is **available attribute/class evidence, some attributed later conversion material, and no verified complete rank allocation for this roster**. The research neither labels all community content worthless nor fabricates missing skills to make a budget pass.

## Required domain skill overlay

Keep ranks separate from ability/feat/synergy/check bonuses. The approved target uses:

| Control type | Required rank-based rating                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Province     | Diplomacy + Warcraft                                                                                                                 |
| Law          | Lead + Warcraft                                                                                                                      |
| Guild        | (Appraise + Bluff + one Craft specialty + Diplomacy + Gather Information + Intimidate + one Profession specialty + Sense Motive) / 4 |
| Temple       | Knowledge (Religion) + Lead; divine level-1+ spell eligibility                                                                       |
| Source       | Knowledge (Arcana) + Knowledge (Nature); greater-arcane level-1+ / realm-learning eligibility                                        |

This needs thirteen skill categories. **Administrate is additional**, relevant to checks/discounts but not an RP-rating ingredient. Engineer/Profession, Espionage and other adopted action skills need their own check data; no complete tactical or RPG skill implementation is required to record domain evidence.

Ratings 6/7/8/9/10+ yield 20/40/60/80/100%; the printed bottom row 5 yields zero. Define fractional Guild-rating intervals and aggregate final RP rounding once. Ordinary unblooded regents do not gain RP merely by being skilled. A multiclass ruler does not collect the same holding twice. Tables 5-9/5-10: B30 pp. 95–96; B35 ch. 5 PDF pp. 7–8. The erroneous older 80% example at rating 8 is not a different rule.

Recommended conversion work is a **versioned domain-character overlay**, retaining original fields and listing evidence for ranks, specialties, class/cross-class treatment, skill-point budget, level limits, ability modifiers and relevant synergies. Review each allocation against the actual character's history and role; do not give every regent the maximum economically useful ranks. Native multiclass levels cannot automatically become a sum of full 3.5 class levels plus free scion levels. Unknown values remain unknown until reviewed. No rank values are proposed in this research.

## Bloodline packages and the chapter conflict

**A** is the preserved native numerical score. **b** is the B30 ability-scale score. **S** is the revised B35 chapter-2 score. These symbols must not be interchanged.

| Package           | Verified historical treatment                                                                                      | Conversion implication                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| B30               | Ch. 2 pp. 36–37 explicitly suggests roughly half the AD&D score, with Avan 70 → 35. Collection cap 2b; reserve 5b. | Compare floor/ceil for odd A; no historical exact rounding contract for all Sierra records was established. Preserve raw A in either case. |
| B35 revised ch. 2 | PDF pp. 8–9 doubles an initially generated ability into S. Collection cap S; reserve 2S.                           | S=A is an attractive identity-preserving **1.5 conversion hypothesis**, not a verified instruction for each imported character.            |
| B35 ch. 5         | PDF pp. 8 and 13 retains older 2B/5B caps and doubled sacrifice wording.                                           | Internally inconsistent with revised chapter 2. Never apply 2S/5S and call that the unambiguous later rules.                               |

The [inventory](validation/regents.csv) calculates floor/ceil B30 caps, growth and sacrifice for **all 116 records**, alongside the S=A hypothesis. [RP envelopes](validation/regent-rp-envelopes.csv) provide three package comparisons per active ruler combination without invented ranks.

| Actual native character |   A | B30 floor b: collection / reserve | B30 ceil b: collection / reserve | B35 S=A: collection / reserve |
| ----------------------- | --: | --------------------------------: | -------------------------------: | ----------------------------: |
| Darien Avan             |  70 |                          70 / 175 |                         70 / 175 |                      70 / 140 |
| Kalien                  |  30 |                           30 / 75 |                          30 / 75 |                       30 / 60 |
| Caine                   |  27 |                           26 / 65 |                          28 / 70 |                       27 / 54 |
| Marlae Roesone          |  24 |                           24 / 60 |                          24 / 60 |                       24 / 48 |
| Eyeless One             |  35 |                           34 / 85 |                          36 / 90 |                       35 / 70 |

Among the 49 current active default rulers, existing starting RP exceeds the proposed reserve cap for **10** under either B30 rounding and **18** under S=A/2S. Across all 80 candidate combinations the counts are **20 floor / 19 ceil / 31 S=A**. These are diagnostic excesses, not permission to delete RP, rebuild a bloodline or alter initialization. A conversion contract needs explicit treatment of opening stock and old saves. The optional level-based variant is not selected automatically.

### Growth, sacrifice and inheritance

| Mechanic            | B30 package                                                                                         | Revised B35 chapter 2                                                | Economic consequence                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Increase            | +1 b costs 4b RP                                                                                    | +1 S costs S+1 RP                                                    | A B30 point represents roughly two native points. Compare like-sized increases before calling either package cheaper.                                            |
| Timing              | Two successive turns with sufficient surplus; at most two increases/year                            | Same general timing/annual limit                                     | Do not turn every spare seasonal RP into repeated instant growth. Personal choice/automation must honor J07/J08.                                                 |
| Emergency reduction | −1 b releases twice the previous b in RP                                                            | −1 S releases the previous S in RP                                   | Approximately the same payout can consume different amounts of original-scale bloodline. Requires explicit visible consent/policy, not automatic hidden payroll. |
| Birth               | Generally one parent's derivation, weaker parental grade, approximate mean score; variation allowed | Same basic inheritance language, revised scion-class/score framework | These are not deterministic algorithms or permission to create new Anuire heirs. Odd rounding and order of conversion can alter outcomes.                        |
| Invested transfer   | Living donor can pass bloodline and become unblooded                                                | Same broad rule                                                      | Bloodline, domain assets and stored RP are distinct transfers. Do not add both rulers' full power or clone reserves.                                             |

Sources: B30 ch. 2 pp. 33, 35–39; B35 ch. 2 PDF pp. 1–2, 8–10. Existing abilities/derivation/grade must be preserved independently of a domain-cap overlay. Inheritance must not automatically recalculate all blood abilities from a new table. Handling a true/awnshegh bloodline needs explicit exceptions rather than clamping to a sample table's last row.

For example, parental native scores 27 and 30 have a mean of 28.5. Halving and rounding parents before averaging can differ from averaging original scores first. Neither text establishes a universal Sierra-specific rounding or genetic randomness procedure. Keep a single approved scale and serialized randomness if that future mechanic is adopted; no child/heir records are invented here.

The current roster's numerical scores and current reserves are sufficient to compute **cap sensitivities**, not actual new RP. Actual collection is bounded by skill-qualified control, bloodline cap and reserve room, with paid pledges conserved once. Each upper envelope assumes 100% in every screened eligible category; one legal skill allocation may not achieve those maxima together. The worksheet's preliminary class screen for casting is explicitly provisional: BRCS class/race/spell conversion must establish true eligibility, particularly for paladins/rangers, magicians and special avatars. No envelope is a final skill allocation or a promise to pay Alchemy/payroll from new RP.

Recommendation: the [approval report](BIRTHRIGHT_15_ANUIRE_ECONOMIC_DECISIONS.md) presents revised-chapter-2 S=A as the preferred coherent domain package, with a reviewed skill overlay and explicit opening-stock protection. This is a recommendation requiring approval, not a change to the specification or data.
