# Birthright 1.5 — Domain Economy and Holdings Rules Specification

**Version:** 0.2 (design decisions consolidated; **NOT IMPLEMENTED**)  
**Date:** 24 October 2026  
**Scope:** Anuire domain economy, holdings, Regency, court, domain actions, maintenance and related political/magical systems.  
**Authority:** User-approved J01–J08 and V02–V13; V01 and V14 explicitly **UNDECIDED**. This document updates the design interpretation of v0.1 without altering original campaign records or treating historical source conflicts as resolved.

## 0. Approval ledger — do not silently change

| ID | Selection | Binding design decision |
|---|---|---|
| J01 | B | BRCS-style normalized, predictable **net** economy; do not stack legacy generic administration expenses. |
| J02 | C | Passive Law revenue H/3; extraordinary Seizure as separate action; no recurring Sierra/AD&D Law Claims on top. |
| J03 | A | Trade uses positive **real** Guild endpoints/authorized partners, bilateral paid shares, no additional trade RP. |
| J04 | C | Higher Sources have BRCS virtual-Guild cash; remote magic pays a distance surcharge. |
| J05 | C | Target skill-sensitive RP and expanded court/character-action framework, contingent on character reconstruction and economic controls. |
| J06 | A | Sierra **two-stage Contest**; military suppression requires sustained, costed occupation rather than instant annihilation. |
| J07 | A | Explicit receipts, financial commitments and defaults, without hidden sacrifices. |
| J08 | A | Identical economic laws; **Basic automatic, Advanced guided, Expert manual**. |
| V01 | — | **OPEN:** bloodline-score conversion, seasonal collection cap, reserve cap, growth/sacrifice package. No strategic reserve limit is approved. |
| V02 | B | **Full D&D 3.5 character-sheet reconstruction** for source regents/eligible actors, with source fields preserved and reviewed derived skill ranks. |
| V03 | A | Preserve the original **Sierra military unit-profile payroll**, not automatic BRCS half-muster payroll. |
| V04 | B | Keep **flat 1 GB per supported fort asset per season**, not per fortification level. No additional ordinary port fee. |
| V05 | A | BRCS court system; court 4 grants **one** extra court action per round, court 5 **two**. |
| V06 | A | Create (0) 1 GB/DC 10; Rule Holding +1 1 GB/DC (10+current H), with typed opposition/bids and paid multi-target expansions. |
| V07 | B | After real skill conversion, one check/season for up to **25% reduction of eligible separately maintained non-income infrastructure**; no old generic administration, court or military discounts. |
| V08 | A | Real bilateral Guild endpoint share **H/2 per eligible route**; route capacity 1/2/3 at Guild H 1–3 / 4–6 / 7+. |
| V09 | C | Virtual-Guild cash belongs to a Source-owning domain only while it has a **named qualified mage as ruler or authorized lieutenant**. |
| V10 | A | Alchemy 1 RP converted to 1 GB, plus 1 GB casting fee and real casting/action opportunity; remote spell +1 RP per traversed province separation, no routine ley upkeep; preserve actual Source endpoints and three-slot network. |
| V11 | A | **Newly collected eligible RP** is available for seasonal payroll shortfalls at 5 RP per GB, with a single aggregate fractional-payroll rounding policy. |
| V12 | A | Optional BRCS tax Decree ±1 GB/season, extra tax at most +50% of base; separately priced, opposed and bounded d6 Law Seizure. |
| V13 | B | Preserve **identified, source-supported special NPC payroll exemptions** as explicit controller-specific policies, not concealed income or Basic-mode benefits. |
| V14 | — | **OPEN and conditional on V01:** how initial RP above a newly selected strategic reserve cap would be handled, if such a cap is approved. |

**Approval interpretation:** These are decisions about the *target rules design*, not permission to fabricate missing records, migrate saves, or modify gameplay code. Earlier audit recommendations that disagree with this table are superseded. In particular, V03/V04/V13 override the exploratory study's half-muster and level-priced fort reference costs.

## 1. Edition identity and unchanged principles

* Preserve Sierra's province borders, all 51 domains, original ruler identities, campaign content, opening holdings/units/forts, sound/UI style, and 3-seasonal-round strategic rhythm.
* Retain independent legal ownership of province, Law, Guild, Temple, Source, castles/towers, military control, vassalage and regent character.
* BRCS 3.x supplies the selected cash/skill/court framework; selected Sierra elements override only where explicitly recorded above.
* Approved port receipts remain **full province-level GB for a seaport; half for a river port**. Do not equate port ownership, trade profit and a ship's cargo space.
* Preserve all original records and IDs. Derived 1.5 fields must use versioned overlays, with provenance and confidence, instead of overwriting recovered source attributes.

## 2. Net economic production and money types

**Ordinary seasonal production** before taxes/options/temporary modifiers:

| Asset | Production | Qualifications |
|---|---:|---|
| Province of level P | P GB | BRCS base; single tax-Decree policy below |
| Law Holding level H | H/3 GB | Passive new income, not a provincial debit |
| Guild Holding level H | 2H/3 GB | Net normal collection |
| Temple Holding level H | 2H/3 GB | Net normal collection |
| Source Holding level H | 0 intrinsic GB | Magical RP/access separate |
| Source-derived virtual Guild | 2·max(H−4,0)/3 GB | **Only if V09 qualified mage is present**; not an independent real Guild |
| Eligible bilateral route endpoint | H_endpoint/2 GB | Valid **real** Guild and unique contract only |
| Ports | Existing approved HD rates | Separate identifiable production, never duplicate route profit |

No recurring original Table 18A/HD Law Claims; extra cash seized from a victim must be an equal debit/credit transfer. No province/holding-count administration charge on top of *net* ordinary collections. Separately paid army payroll, courts, forts, infrastructure, active orders and spells remain real costs.

Economic level aggregation occurs per actual owner/province/holding type **before** revenue dice/rounding, RP, capacity and claim caps, while preserving historical record IDs. Production, conversions, bilateral transfers and costs have distinct ledger types. Choose rational/adequately exact internal accounting before implementing thirds/halves; do not round per original record. Research used 1/120 GB units; that is a **candidate representation**, not an approved game-schema migration.

## 3. Character conversion, RP and bloodlines

### 3.1 V02 B — Full D&D 3.5 reconstruction

* Reconstruct a **reviewed, versioned 3.5 character sheet** for all 116 source regent records, prioritizing active player/NPC rulers, selectable alternatives and acting lieutenants. Six generic/unknown identities remain explicitly unknown where history is absent; full worksheets may contain unresolved fields instead of invented biographies.
* Preserve original class tuples, level, ability scores, bloodline number, derivation/grade, inventory/deployment IDs and title. Map to 3.5 skills, skill-point budgets, class/cross-class limits, feats, synergies, spellcasting and true-realm-magic eligibility with provenance. Document any authored conversion as **Birthright 1.5 interpretation**, not recovered Sierra data.
* RP rating inputs use **skill ranks**, not total modifiers: Province = Diplomacy + Warcraft; Law = Lead + Warcraft; Temple = Knowledge (Religion) + Lead; Source = Knowledge (Arcana) + Knowledge (Nature); Guild = one quarter of Appraise + Bluff + one Craft + Diplomacy + Gather Information + Intimidate + one Profession + Sense Motive.
* Ratings 5 or below / 6 / 7 / 8 / 9 / 10+ yield 0 / 20 / 40 / 60 / 80 / 100% eligible RP. Respect type-specific spellcasting gates, bloodline, actor status and multiclass nonduplication. Fractional Guild rating and final whole-RP rounding boundaries still need a written contract.
* Administrative skill/other bonus checks must never be smuggled into RP **rank** values. Authentic class and caster details for special avatars require individual reviews.

### 3.2 V01 OPEN — No new RP storage cap approved

There are **three independent concepts**: (i) skill-based eligible RP, (ii) seasonal maximum collection as a function of bloodline, and (iii) maximum total RP stock ("reserve"). J05 chooses skill-sensitive RP **but not** an RP storage ceiling.

The audited historical choices differ:

| Candidate | Derived scale | Seasonal collection cap | Total RP reserve | Growth / sacrifice |
|---|---|---|---|---|
| Revised B35 chapter 2 | S=A (proposed identity mapping) | S | 2S | +1 S costs S+1 RP; lose 1 S -> prior S RP |
| B30 | b≈A/2, odd-score rounding to choose | 2b | 5b | +1 b costs 4b RP; lose 1 b -> 2·prior b RP |
| Proposed **no-hard-reserve hybrid** | Preserve native A | **To approve** | **No new strategic stock cap** (existing storage/safety representation only) | Choose a coherent published or explicit 1.5 growth/sacrifice model |

The older 3.5 chapter 5's 2B/5B conflicts with revised chapter 2's S/2S. **No reserve formula, forced truncation, silent decay, bloodline sacrifice, growth price or save rescaling is approved by V01.** Current HD's 65,535 new-reserve ceiling is a **technical representation policy**, not consent to a new balance rule.

**V14 OPEN:** If V01 ultimately approves a new strategic RP reserve, separately choose opening-stock handling (preserve as spendable overflow without replenishment; truncate only on explicitly approved new-game creation; permanent floor; or another approved policy). If **no new strategic reserve cap** is chosen, V14 can be marked **not applicable**. Pending decision, preserve all starting RP and existing saves untouched.

## 4. Law, taxes and exceptional seizure

Law H/3 is ordinary, unbacked production in the normalized BRCS economy. Taxation is optional BRCS **one ±1 GB Decree modification per season** against P base, with raised tax income capped at 50% above base; no parallel Sierra Light/Moderate/Severe penalties.

**Extraordinary Law Seizure (V12 A)** is a separate standard action costing **1 GB**; preliminary 1.5 amount limited by `min(1d6 GB, acting Law H, actual eligible uncommitted victim receipts)`, with eligible province/Guild/Temple receipts apportioned once, fortified target immunity, reserved victim pool shared between rival claimants, visible defense and documented public/diplomatic consequences. The exact opposed check, repetition scope, lawful immunity conditions and attitude penalty are **unsettled connected political sub-rules**, not already selected historical text. Never seize Source RP or Alchemy receipts through a generic Guild selector; do not give automatic Claim income as well.

Adopt a single seasonal **attitude/loyalty** calculation, including Law coercion, taxes, religious influence, Agitate and occupation. Do not stack the 1995, Sierra and 3.x loyalty penalties. Retain readable Sierra-style labels if useful. BRCS's duplicated attitude threshold needs an explicitly declared 1.5 correction after inspection.

## 5. Guild trade and infrastructure (V08 A)

* Each route is one canonical bilateral contract between positive, uncontested **real** Guilds, potentially in different ownership domains with explicit consent, share entitlements and revocation.
* Each valid endpoint earns `H/2 GB` per seasonal route; one domain owning both endpoints may receive both shares, **not twice the entire contract**. Ordinary 2H/3 Guild income remains separate.
* Endpoint route capacity: Guild levels 1–3: **one**; 4–6: **two**; 7+: **three**. Reserve capacity at both endpoints. Level-0 Guilds and virtual-only Source/Guild equivalents are not valid profit endpoints (J03 takes precedence over broader BRCS virtual-guild action access).
* Apply roads, bridge/passage contracts, seaports, ship cargo, blockade/transport and payer-specific maintenance before commercial profit; a ship cannot simultaneously satisfy unrestricted routes and army movement. Unknown original road/sea routes are not invented as opening assets.
* No additional trade-derived RP. Do not pay thief RP again merely because currently approved port receipts are grouped under a `trade` ledger field.

## 6. Source virtual commerce, mage access and remote spellcasting (V09 C; V10 A)

* Virtual level = `max(Source H − 4, 0)`; revenue = `2/3 GB × virtual level`. **Must have a named eligible mage in that Source-owning domain**, as ruler or properly authorized lieutenant; an outside mage does not automatically satisfy V09. Ownership alone is not spell eligibility, but original source ownership remains unchanged even when the current court cannot exercise benefits.
* Eligibility requires reconstructed true-realm-magic capability; no dummy casting ranks or automatic fallback for non-qualified mixed domains. If an actual mage becomes unavailable, suspend the derived virtual income prospectively at a declared collection boundary; do not delete the Source or historical cash.
* Virtual capability grants neither normal Guild capacity nor Guild RP, and cannot independently qualify as a profitable trade-route endpoint. Other BRCS virtual-Guild-like action rights are **not automatically approved**; enumerate and adjudicate separately.
* **Alchemy:** convert 1 RP -> 1 GB before the separate 1-GB spell fee; requires a real domain casting opportunity, RP spending and eligible caster. Avoid using RP already reserved for payroll, pledges, spells or other orders. No costless extra casting through court/lieutenant action slots.
* **Ley lines:** no recurring upkeep; remote spells require +1 RP for each traversed province separation along the approved original directed province adjacency graph. Keep valid Source endpoints including Source 0, strongest accessible Source rather than sum, and the three recovered outgoing slot limit. Graph distance, multiple available paths, warding/interference and border checks must be documented before implementation. These are intentional HD constraints versus broader BRCS geometry.

## 7. Courts, actions and development (V05 A, V06 A, V07 B)

### Courts and actor budget

* Use BRCS court upkeep **1 GB per court level per season**, with optional court 0 for personal management. Do not treat native Sierra tier integers as automatically equal levels in the converted sheet. The opening native tier 1 is mapped to **court 1** for the new-game economic overlay; preserve raw source values.
* Court 1–2: no extra court actions; court 3–4: **one extra court action each action round**; court 5: **two**; court 6–7: three; court 8–9: four; court 10+: five. Court 4's lower bracket is a deliberate 1.5 correction of the overlapping table.
* Normally one standard and one character action per round (or one full action using both); extra court actions are **limited court/realm-extension opportunities**, not unrestricted personal actions, independent castings, or bonus standard actions.
* Court raises are at most +1 level/season by paid Decree (1 GB, plus new upkeep); physical seat/palace capacity and separately priced palace capital/upkeep are mandatory if applicable. A lieutenant is an actor, not a second court/treasury/action generator.

### Create/Rule

* Create Holding (0) 1 GB, DC 10; Rule Holding +1 1 GB, DC `10 + current H`; without self-level as an automatic success bonus. Apply typed opposition, eligible RP/GB influence and a budgeted, finite action sequence. Each additional realm target pays separate action cost/check and uses an eligible court slot.
* Province Rule is a separate BRCS candidate selected with V06 A: current P GB, DC 10+P, one attempt/season, no RP influence; specify effective date, capacity changes and Source-potential loss. Retain imported overcapacity records rather than deleting them automatically.
* Court size or independent assimilated/vassal records cannot turn into infinite Create/Rule or twice-in-the-same-round Contest attempts. Second-stage Contest timing remains a pending conflict-contract choice.

### Administrate

* After skill conversion, one check per season may reduce eligible **separate non-income infrastructure** upkeep by up to 25%, using documented BRCS DC and one agreed rounded total. **Exclude** embedded ordinary administration, army payroll and court upkeep from this V07 B maintenance discount. No stacking, retries or retroactive collection changes.
* Distinguish the separate historical saving of 1 GB on qualifying standard actions already costing at least 2 GB; it does not make a 1-GB Rule/Create order free. Specify actor, phase, eligibility and non-failure effects before implementation.

## 8. Contest, occupation, fortifications and ceremonial transfers

* Preserve Sierra's political **two-stage Contest**: success first suppresses income/RP/action benefit (with legal restoration/recovery), a later eligible success may destroy the holding. Do **not** also apply immediate BRCS 1d3 permanent damage.
* Occupation requires stationed, funded forces and an explicit costly suppression/destruction order; political ownership, war control and independent institutions remain separate. BRCS's month-long occupancy is a proposal pending strength, exact targeting, recovery and Source protection. Don't reset all Guild/Temple/Law holdings at zero via one cheap army click; physical soldiers are not a generic Source-destruction power.
* **Fort upkeep V04 B:** 1 GB **per separately supported fortification asset**, independent of its level. This includes the original castles/towers until provenance-based exceptions are specifically approved; do not automatically multiply 1 GB by 165 historical levels. Existing per-fort decay/nonpayment remains visible; fortification improvements and defenses must be jointly priced. Do not import **free absolute fortified-Holding immunity** without specifying siege, political counterplay or a separate fortification requirement.
* Preserve the approved port receipts without inventing a second ordinary maintenance fee (unless a future separately approved port project has an explicit cost).
* Investiture transfers a legal title or eligible institution by the correct ceremony; conquest, inheritance, voluntary holding transfer, and vassalage have distinct requirements. A military takeover cannot silently confiscate unrelated Temples/Guilds/Sources. Religious eligibility/costs and opposing bids require a follow-on rules contract.

## 9. Military payroll and special NPC policy (V03 A, V13 B)

* Recurring army pay uses the **original imported Sierra unit-profile upkeep** for each actual military unit. Do not replace it with muster-price/2 or invent quarter-home garrison discounts. Non-recruitable original monster-profile ambiguities remain recorded rather than fabricating new values.
* Preserve only **identified, historically supported** special-NPC payroll waivers in a documented **controller-specific** policy table. This is a selected faction/controller exception to ordinary costing (V13 B), **not a Basic/Advanced/Expert mode bonus**, new world income stream or universal free garrison benefit.
* Every waived obligation is shown in ledgers as `gross requirement`, `approved NPC exception`, `net payable`. Preserve separate distinctions for named original hostile/event controllers, player-controllable regents and potential expanded-mode access; **whether a historical NPC waiver follows an opponent realm after the player selects it must be decided explicitly**, not silently. Classify inactive Mieres and Chaos/event controller separately from ordinary active domains.
* Do not silently add the old NPC RP/GB emergency floors or unconditional subsidies unless specifically evidenced, identified and approved as separate rules. Their prior existence in HD is not blanket authorization for all exceptions.

## 10. Seasonal collection, RP payroll, obligations and modes (V11 A, J07/J08)

1. Preserve final action/effect entitlements for the upcoming collection; every income-modifying spell must remain eligible for exactly its promised collections. Do not apply income effects twice on reload.
2. Snapshot ownership, legal contracts, Source mage eligibility, ports, eligible Law and virtual production and selected tax Decrees once.
3. Collect ordinary cash and direct transfers/Seizures once with reserved victim pools and a balanced ledger. Collect qualified RP using the eventual V01 package only after it is approved. Resolve vassal pledges and obligations without reuse or invented receipts.
4. **Permit freshly collected RP** to help pay eligible current-season regular-unit payroll (V11 A), at 5 RP per GB, **once-only aggregate rounding** and after previously committed RP is reserved. No unlimited pre-collection advance or double conversion via Alchemy.
5. Pay armies, courts, individual forts, roads/transport, occupation, actions and magic using explicit priorities and real available balances; show default and consequences rather than hidden arbitrary sacrifices. Do not call a recoverable shortfall a terminal bankruptcy without approved terminal conditions.
6. Commit loyalty/attitude adjustments and damage at declared collection boundaries; expired temporary effects are removed **after** satisfying owed collection benefits. Show the saved reconciliation for each faction.

| Mode | Who makes maintenance decisions? |
|---|---|
| Basic | Automation chooses legal, affordable allocations/defaults and records any consequences. No extra grants or exemption. |
| Advanced | Guided proposals; confirms consequential decisions and losses with the player. |
| Expert | Full manual tax, court, payroll and funding decisions, or explicit acceptance of documented default outcomes. |

For the same allocations, all three modes produce the same numerical ledger. J07 A is **not** a requirement to demand manual prompts in Basic. Court action menus/complexity may be surfaced differently, but eligible rules and costs are shared.

## 11. Cross-rule tensions that must stay visible

1. **V01/V14 unresolved:** skill-based RP selected, but numeric bloodline collection/reserve/growth/sacrifice/overflow still undecided. Do not manufacture approval for a hard strategic RP stock cap.
2. **V02 B scope:** full 3.5 sheets are authorized as design, but missing authentic skill ranks require individually approved derived allocations; six generic/unknown identities cannot be turned into invented historical people.
3. **V09 C versus opening solvency:** the audit's passive-Source-cash reference included owners without named caster gates. Recompute income and debts once qualified resident mage/lieutenant records are verified.
4. **V03 A + V04 B + V13 B versus prior 36 cost scenarios:** replace the study's half-muster and per-level-fort reference with native payroll/flat asset costs and named NPC waivers. The previously reported Rhuobhe/Spiderfell −9 GB figures are **not** final under selected choices.
5. **V04 B + fort immunity:** flat-cost high fortifications can be underpriced if seizure/Contest immunity is absolute; fort tiers must retain meaningful siege costs and boundaries.
6. **V05 A + V06 A:** extra court actions + inexpensive Rule must honor realm scope, separate checks, real actor slots, capacity and palace capital. Court extension is not general rapid-fire growth or multi-target free magic.
7. **V07 B + normalized net collections:** Administrate reduces only separately charged eligible infrastructure; no reimbursement of costs already embedded in net receipts.
8. **V08 A + V09 C:** virtual Guild revenue does not create a real trading endpoint; no route shares from a magically created imaginary merchant record.
9. **V10 A + V11 A + eventual higher RP stock:** coordinate Alchemy, payroll, spellcasting, pledges and storage/collection in one reserved RP ledger. The same RP cannot pay troops and be converted to GB.
10. **V12 A + J02 C:** Law H/3, exceptional seizure and bounded tax Decree must not generate automatic old Law Claims or multiple raids on already-committed revenue.
11. **V13 B + J08 A:** NPC provenance exceptions are actor/controller policies and must be identical in Basic/Advanced/Expert; explicit future unlockable-faction treatment remains open.
12. **Precision/data:** fractions (thirds, halves), imported RP/GB, special faction grants, old save versions and per-record IDs must not be silently rounded, erased or rescaled.

## 12. No-implementation validation and next outputs

Before writing game mechanics, perform a **targeted reconciliation** of the already built 51-domain ledger with the **selected V03/V04/V09/V13** policy, then an RP/skills/court sensitivity update. Retain coverage of all 51 original domains, 116 regents, 206 provinces, 766 holding records, 39 fortifications and 234 military/63 character deployments; keep Chaos and Mieres separate. Do not fabricate absent roads, routes, ships, payment contracts, palaces/skills or magical controllers.

Recommended research deliverables:

1. Exact side-by-side revised money/expense ledger for all 51 domains under the **selected** costs (native military, flat fort, named NPC exceptions, caster-gated virtual cash, BRCS ordinary net production).
2. Reviewed **full 3.5 character-conversion worksheets** for 116 original entries, with unknown fields, provenance and compatibility constraints explicit; prioritize all active rulers and selectable alternatives.
3. Focused **V01 design choice** separating seasonal RP cap, strategic stored-RP cap, bloodline-growth price and sacrifice (with an explicit **no-hard-reserve** alternative), followed by V14 only if a cap is chosen.
4. A remaining political-rules contract for Contest defense/recovery, prolonged occupation targets, tax attitude, Seizure penalties, investiture, casting and court 3.5 action legality.
5. A versioned rules/save/precision migration plan. Do **not** alter existing games or opening values until approved.

**Status: design only. No implementation authorized.** Do not modify engine, imports, UI, saves or original archival records from this document.

## 13. Source register / reproducibility

This specification consolidates:

- `BIRTHRIGHT_15_RULES_SPEC_V0_1.md` and `BIRTHRIGHT_15_RULES_SPEC_V0_1_RECONCILIATION.md`;
- `BIRTHRIGHT_15_HOLDINGS_AUDIT.md`, `BIRTHRIGHT_15_HOLDINGS_ECONOMIC_CASES.md`, `BIRTHRIGHT_15_HOLDINGS_SOURCES.md`;
- `BIRTHRIGHT_15_ANUIRE_ECONOMIC_VALIDATION.md`, `BIRTHRIGHT_15_ANUIRE_ECONOMIC_DECISIONS.md`, `BIRTHRIGHT_15_ANUIRE_CHARACTER_CONVERSION.md`, `BIRTHRIGHT_15_ANUIRE_COURT_AND_GROWTH.md`.

Primary history remains source-labeled **E2** (1995), **PC-H/PC-S/PC-B** (1997 intended/qualified source/executable), **B30** (2003), **B35** (later composite 3.5) and **P15** (intentional hybrid). Historical BRCS chapter discrepancies—bloodline cap, court bracket, fortification and attitudes—must not be hidden by generic "3.5" attributions. For exact locators and verified file hashes, refer to the attached source register and reconciliation.
