# Birthright 1.5 — Holdings and Domain Economy Rules Specification

**Version:** 0.1 — proposed integration specification  
**Date:** 24 October 2026  
**Authority:** Eight user questionnaire selections J01–J08, interpreted with the supplied [holdings audit](BIRTHRIGHT_15_HOLDINGS_AUDIT.md), [source register](BIRTHRIGHT_15_HOLDINGS_SOURCES.md) and [economic cases](BIRTHRIGHT_15_HOLDINGS_ECONOMIC_CASES.md).  
**Status:** User-selected directions are confirmed. Individual sub-rules labeled **PROPOSED** require validation or separate approval. **No implementation is authorized or reported.**

## 1. Identity and scope

Birthright 1.5 preserves the named regents, original Anuire map/data, independent ownership of provinces and institutional holdings, strategic presentation and recognizable domain-turn progression from *The Gorgon's Alliance*. The economic foundation is the BRCS 3.0/3.5 normalized model, with selected Sierra mechanics and explicit HD refinements. There is one simulation across Basic, Advanced and Expert; the modes differ in how much management is delegated.

Evidence priority is not a simple chronological hierarchy: identify rules explicitly as **E2** (1995 AD&D), **PC-H / PC-S / PC-B** (Sierra documentation / qualified modified source / narrow executable evidence), **B30** (January 2003 playtest), **B35** (later composite 3.5 chapters), or **P15** (new adaptation). Some B35 chapters reuse B30; do not invent edition changes. Historical document locators are in the source register.

**Notation:** P = province level; H = economically aggregated holding level; B = bloodline on the applicable *edition-specific* scale; GB = gold bars; RP = regency points. A season is a domain turn of three months, with three strategic action rounds unless separately revised.

## 2. User-selected design decisions (LOCKED direction, not yet tested)

| ID | Selected | Binding direction |
|---|---|---|
| J01 | B | Predictable BRCS-style *net* collections, paired with its corresponding treatment of operating costs; not PC dice plus legacy administration. |
| J02 | C | BRCS passive Law GB by Law level; extraordinary Seizure separately; no stacked ordinary E2/PC automatic Law Claims. |
| J03 | A | Real positive Guilds at both trade endpoints (or an authorized positive-Guild partner), bounded bilateral earnings, no extra trade RP. |
| J04 | C | BRCS virtual-Guild cash for sufficiently developed Source Holdings and distance-based remote-casting costs. |
| J05 | C | BRCS skill-sensitive RP and expanded court/action taxonomy **only after** historical-character data and economic throughput can be supported. |
| J06 | A | Sierra two-stage political Contest plus sustained, independently costly military suppression. |
| J07 | A | Immutable collections, explicit commitments, transparent defaults and no invisible player-managed asset sacrifices. |
| J08 | A | Same economy for all modes; Basic automates, Advanced guides/asks confirmation, Expert gives full manual management. |

**Interpretation of J07/J08:** Manual resolution applies to **Expert**. Basic must make accountable automatic choices from the same legal actions and resources. Advanced proposes choices and obtains confirmation for consequential losses. All modes expose the consequences afterward. This is not a rules or difficulty bonus.

## 3. Collections: selected BRCS-style normalized economy

### 3.1 Revenue and accounting

- **Law**: ordinary recurring net holding revenue = **H/3 GB per season** (B30/B35). This is part of the selected normalized world economy, not a transfer from the province ruler's tax line.
- **Guild**: ordinary recurring net holding revenue = **2H/3 GB**.
- **Temple**: ordinary recurring net holding revenue = **2H/3 GB**.
- **Source**: zero intrinsic cash. A separate, restricted virtual-Guild component applies at Source H >= 4 (section 5).
- **Provinces**: use the matching BRCS provincial/tax collection rules and their expense interpretation. The audit's normalized illustrative case has P4 = 4 GB before any optional variable-tax policy or other effects. **Pending:** transcribe and verify the complete tax levels, collection table and optional rate changes in B30/B35; do not silently substitute the current HD dice.
- Preserve the already-approved HD **full seaport / half river-port** receipts, including fractional GB, as a separate explicit legacy decision until the user changes it. Do not double-pay port revenue through generic route or shipping returns.

**Conservation / ledger constraints:** classify every entry as (a) newly produced income, (b) income reallocation/transfer, (c) asset conversion, or (d) expenditure. Transfer income must always have a payer and equal debit/credit; passive Law and BRCS virtual-Guild revenue are production under this chosen economy and must be counted in balance tests. No double taxation of one receipt. Do not allow multiple historical records of the same owner's province/holding type to increase economic output; aggregate for production/RP/limits while retaining original IDs and provenance.

Fractions 1/3, 2/3 and 1/2 must survive internally without per-record round-up farming. **PROPOSED:** exact fractional/rational settlement or a scale representing these fractions exactly; one declared rounding boundary and backward-compatible display/saves. Never pretend existing tenths automatically represent thirds exactly.

### 3.2 Expenses

BRCS normalized Guild/Temple/other regular holding collections are *net of ordinary income-producing administration* under the audited interpretation. **Do not** overlay HD's separate old generic administrative bill. Keep separately costed obligations where the selected rules require them: court, armies, mercenaries, fortifications, occupation, roads/bridges, fleets/shipping, realm spells and action costs. Avoid counting the same infrastructure cost under two headings.

**PENDING:** reconcile BRCS expense passages/errata; choose fort building, ownership protection and upkeep jointly. The audited BRCS Table 5-4 candidate is **2/3 GB per province-fort level** and **1/3 GB per fortified-holding level**, versus HD's flat **1 GB per fort asset**; inherited warfare text conflicts. These rates are **not yet a final 1.5 rule**. Reprice army and court costs only with representative faction budgets.

## 4. Law Holdings and political authority

A Law Holding represents institutional authority. The selected passive **H/3 GB** must not coexist by default with recurring original Table 18A or HD automatic claims from taxes, Guilds or Temples. Owning Law still has political functions: type-limited support/opposition to mundane Guild/Temple actions, administrative coercion, lawful recruitment/control and defined loyalty/tax-enforcement interactions.

**Exceptional Seizure** is a separate active BRCS-inspired tool: it consumes an appropriately priced action, targets actual eligible uncommitted receipts, cannot exceed them and subtracts the same amount from the victim. The audit describes the BRCS candidate as **1d6 GB** subject to target income, rather than the PC's routine 0–3 GB claim distribution. **PENDING:** exact eligibility/target order, immune fortified holdings, contested actions, RP/GB bids, reputation/loyalty effect and repetition limits. **PROPOSED P15 safeguard:** at most once per specific target per season, with explicit diplomatic consequences; do not falsely cite this safeguard as a quoted original rule.

Where several Law rulers compete, choose a bounded, deterministic claim/seizure allocation that cannot multiply through duplicate records or order of iteration. An owner does not obtain a fictitious transfer from themselves. Sources' RP and Alchemy resources are not automatically taxable Guild revenue.

**Loyalty remains unresolved as a formula:** keep human-readable loyalty grades and choose one internally coherent system of taxation, Law protection, Agitate, religious grievances and occupation penalties. PC's Light +1 / Moderate 0 / Severe -1 and E2's distinct tax penalties cannot both apply. BRCS's five attitudes/seasonal checks are a third alternative with disputed threshold errata. **PROPOSED:** retain PC-looking presentation and translate a single BRCS-compatible attitude computation into it, without double penalties; require validation before selecting thresholds.

## 5. Guilds, Temples, Sources and trade

### 5.1 Guild trade (J03 A)

Profitable routes require uncontested, **positive real Guild capacity at both endpoints**, either under a single owner or through an explicit, valid positive-Guild partner agreement. A level-zero contact alone cannot yield trade profit. Adopt the audited BRCS comparison as the starting candidate: **each endpoint earns H_endpoint/2 GB**, subject to route and market capacity, and **no additional trade RP**. Route income is distinct from ordinary 2H/3 Guild income. Track one bilateral route, entitlement shares, capacity reservation, endpoint/transport validation and competing claims. **PENDING:** exact traffic capacities, commodity-region/terrain/culture prerequisites, sea transport contracts and blockade logic. Retain approved port receipts without duplicate province-sized sea-route income. No ships used at full capacity simultaneously for two routes and military transport.

Guilds retain economic/contractual and intelligence roles. Guild income must not automatically give divine/agitation rights.

### 5.2 Temples

Use the same **2H/3 net** holding income as Guilds, but distinguish Temple ownership, faith relationships, religious Agitate, divine realm casting, investiture/ceremonies and opposition. Holding ownership by itself does not turn a noncaster into an eligible divine caster. **PENDING:** exact priest free-Agitate allowance and its interaction with expanded court actions; religious influence modifiers and investiture prerequisites. Do not give all churches a universal shared identity or let provincial conquest erase them.

### 5.3 Sources and BRCS virtual Guilds (J04 C)

The audited B30/B35 exception begins at **Source 4 = virtual Guild 0**; virtual Guild level is **max(H_source - 4, 0)**. Its ordinary GB rate follows virtual Guild level at **2/3 GB per effective level**, so **Source 7 => virtual Guild 3 => 2 GB/season**. This capacity does not consume the real Guild pool, grant additional Guild RP or create a normally independent/tradable holding record. Separate ownership, eligibility to wield realm magic, the Source's RP access and virtual commercial earnings. The audit notes limited Guild-like action access; **J03 A takes priority for profitable trade routes:** no virtual-only route endpoint until specifically approved after economic testing. Ordinary troops cannot freely confiscate/disband magical Sources; use explicit magical/despoiling mechanisms.

Require documented true-realm-magic eligibility for Source development and spellcasting; preserve imported Source identities even if an owner is not an eligible caster. Source access/ley power uses the **maximum** connected Source, never the sum. Retain source-potential/geography and imported province adjacency; avoid invented terrain. Continue the current real Source (including 0) endpoint requirement as a **proposed HD readability constraint**, rather than silently adopting BRCS's broader endpoint exception.

**Ley costs:** adopt BRCS **distance surcharge to remote casts**, not simultaneous routine E2 per-link upkeep. **PENDING:** exact unit of distance, RP/GB cost, path selection and interaction with Source endpoint slots; use verified rules rather than guessing map distances. Preserve the currently recovered three outgoing original slots pending the same review.

**Alchemy:** test the existing conversion (1 RP per GB plus 1 GB fee per action) against higher skill-based RP collection and virtual cash. Do not assume it is automatically still balanced. No circular positive RP -> GB -> RP loop, and no retroactive recalc of already spent RP.

## 6. RP, skills and action economy (J05 C; gated)

The **target** is B30/B35's skill-based collection model, not the old static class-per-holding scheme. According to the audit, calculate skill collection ratings:

| Domain | Skill rating |
|---|---|
| Law | Lead + Warcraft |
| Temple | Knowledge (Religion) + Lead; relevant spellcasting required |
| Source | Knowledge (Arcana) + Knowledge (Nature); relevant spellcasting required |
| Guild | (Appraise + Bluff + one Craft + Diplomacy + Gather Information + Intimidate + one Profession + Sense Motive) / 4 |
| Province | Diplomacy + Warcraft |

Rating **5 or less / 6 / 7 / 8 / 9 / 10+** corresponds to **0 / 20 / 40 / 60 / 80 / 100%** collection of eligible RP; use verified edition-specific rules for rounding, eligibility and special classes. Apply at most one RP award per holding control, aggregate equivalent records before fractional rounding and honor bloodline-related limits.

**HARD GATE:** the 1997 imported characters lack complete trustworthy BRCS skill ranks. Do not manufacture optimal ranks, map a class directly to a skill score, or pretend the conversion is mechanically neutral. Recover verifiable skills or establish an explicitly disclosed, reviewed 1.5 character-conversion protocol before enabling this RP system. Until then, the existing game can remain on its existing rules profile, but a hybrid RP fallback must **not** be mislabeled fully implemented Birthright 1.5.

B30/B35 caps normal RP collection at **2B** per season and storage at **5B** on *their* bloodline ability-score scale. Directly plugging the imported AD&D bloodline numbers into those formulas is prohibited. **PENDING:** bloodline mapping; level/reserve/growth/sacrifice/transfer policies and vassal pledge conservation. Keep actual bloodline data unchanged until the conversion is approved.

Retain **three strategic domain-action rounds**. The expanded BRCS standard/character/court/realm action taxonomy is the target, but no extra throughput is free: court size, delegated actors, lieutenant eligibility, budgets, target counts and one-per-turn limits require bounded rules and authentic actor data. No unlimited administrative factories from assimilated/holding-only realms. **PENDING:** exact court brackets, number and types of extra actions, price/initiative and interaction with Sierra's historical 6/10/18 visible action menus.

Create, Rule, Contest, Occupy and investiture checks must be reconciled as an interconnected cost/difficulty package. **Do not assume J01 B alone selects every B30 holding-growth formula.** B30 proposes Create (0) at 1 GB / DC 10 and Rule Holding +1 at 1 GB / DC (10+H) without HD's fixed target-level RP expense; the new availability of court actions makes those differences strategically consequential. Capacity/positive-owner thresholds and grandfathered original records also remain **PENDING**.

## 7. Contest, war, occupation and investiture (J06 A)

**Political Contest:** the selected Sierra two-stage model prevails over BRCS's immediate **1d3 permanent level loss**. First success suppresses a target (no cash/RP and no ordinary economic/casting benefits as applicable); the target can recover through a properly priced action. A second qualified success can destroy, subject to explicit eligibility, defense and fortification. Do not simultaneously apply 1d3 destruction *and* the Sierra two-success kill. Preserve historical holding IDs/provenance when a record ceases economic activity; do not create live production from a tombstone or level-zero relic.

**Military occupation:** requires a sustained, paid force rather than instantly converting legal ownership or annihilating unrelated holdings. Adopt BRCS's one-month stationary presence as a **candidate**, with explicit occupation action and limited monthly suppression/damage against mundane holdings. **PENDING:** exact duration, strength thresholds, valid targets, protected institutions, ongoing costs, morale/loyalty and restoration. Sources require magical rules; ordinary soldiers should not delete them by a generic political command. Siege and military control are distinct from legal title.

**Investiture and transfers:** province ownership, holding ownership, military control and fealty remain separate. Conquest never automatically assigns hostile Guilds/Temples/Sources to the victor. Define consensual assignment, contested ceremony, conquest investiture, inheritance and vassal tribute separately; preserve independent holding-only realms and original records. The specific religious/RP prerequisites for a 1.5 ceremonial transfer are **PENDING**.

## 8. Maintenance, insolvency and automation (J07 A + J08 A)

Every season runs against an immutable, once-only financial ledger. Actual committed receipts differ from previews; preview, failed order and save/reload must not generate new tax dice or duplicate a receipt. Apply spending and signed transfers only against actual available balances and reserved future commitments. Income-modifying spells must remain active for the **promised number of collections**, not vanish before their next eligible collection.

Nonpayment is a decision with visible consequences, not a hidden automatic deletion. Preserve the historical distinctions among regular-unit pay, mercenary desertion, fort support/decay, court reductions and occupied-province rebellion, with updated amounts and applicability where the chosen economic rules require. **PENDING:** exact RP-for-unpaid-payroll conversion in the normalized system, fortified institution default, terminal-bankruptcy condition and before/after-tax pillage commitment. Pillage must not permit collect-and-reroll/cancel exploitation.

| Mode | Same legal economy, different control |
|---|---|
| **Basic** | Automatically chooses affordable legal allocations and consequences, logs reasoning and losses; no free grants or immunity. |
| **Advanced** | Guided allocations and shortfall proposals; player confirms consequential changes. |
| **Expert** | Fully manual taxes, courts, financial allocations and explicit defaults; cannot proceed with unresolved choices. |

Sierra's Basic 11-GB grant, tax/occupation exemptions and automatic investiture found only in qualified modified source are **not** accepted as universal 1.5 bonuses. Original menu differences can influence which decisions are exposed, but cannot invalidate the economic/action rules. An Expert player sees all eligible functions; Basic automation must operate within those same eligibility limits.

### Seasonal sequencing (PROPOSED contract; implementation mapping PENDING)

1. Resolve and lock the just-finished action-round effects, ownership and military control; record which spells promise the next collection.
2. Apply events and effective-date changes exactly once, with unambiguous before/after collection boundaries.
3. Take a single economic snapshot; compute province, holdings (including passive Law and virtual Guild), port and contractual trade entitlements according to the selected normalized tables.
4. Settle explicit transfers and one-off Seizures against the correct available pool once; prevent duplicates and negative uncommitted receipts.
5. Collect eligible RP once, respecting the eventual mapped bloodline caps and paid pledges.
6. Resolve separately costed obligations and visible shortfalls using the mode's control flow.
7. Finalize province attitude/loyalty, fort/occupation damage, expiry of spells *after* their promised collection, and the saved audit ledger once.

This order is a design proposal, **not** a claim about historical PC execution order. Actions and effects requiring a different boundary must be annotated and tested; changes must not replay collections or invalidate old histories.

## 9. Required nonnegotiable invariants

1. Land sovereignty, holding ownership, occupation and vassal status remain separate.
2. All transfer GB/RP entries have a payer and recipient with equal signed values; passive production is separately labeled.
3. Economic results cannot improve merely because the same owner's preserved records are split into several IDs.
4. Source virtual-Guild production is limited to the chosen exception and does not consume real Guild capacity or automatically create trade-RP profits.
5. No profitable level-zero trade route.
6. No infinite money/Regency conversion or repeated RP pledge chains.
7. No doubled port-route-fleet income or vessel capacity.
8. No combined two-stage Contest plus automatic permanent 1d3 loss.
9. No instant generic mundane deletion of Source Holdings.
10. No uncharged additional court-action factory.
11. Each income/spell effect, settlement, tax roll and RP award occurs exactly once.
12. No invented character skill ranks, no silent bloodline conversion or old-save rescaling.
13. Existing Anuire entities, original data provenance and explicit approved port policy stay intact.
14. The game mode controls decision delegation, not money creation or political immunity.

## 10. Unresolved rules decisions / blockers before implementation

| Priority | Issue | Decision/evidence required |
|---|---|---|
| **Critical** | Normalized tax and expense tables | Verify complete BRCS province/tax rules and which ordinary administration is net; define all separate cost heads. |
| **Critical** | Character skills and bloodline scaling | Recover or explicitly approve mapping for actual selectable regents; convert 2B/5B caps without arbitrary multiplication. |
| **Critical** | Economic survivability | Evaluate opening and mature budgets of territorial, guild-heavy, temple-only and source-only Anuire domains across bloodline tiers, including court, troops, forts, ports, magic, war and trade. |
| **High** | Law Seizure and Law political influence | Exact dice/check, opposing owner, fort immunity, recurrence, diplomatic cost and interaction with passive H/3. |
| **High** | Virtual Guild and magic | Define which non-trade Guild actions the virtual capacity enables, route exclusion, distance formula, Alchemy balance and true-caster eligibility. |
| **High** | Court throughput and growth | Actual extra-action budget and actor capabilities; Create/Rule cost and RP bids; positive-owner/capacity rules. |
| **High** | Loyalty/attitude | One coherent PC-looking grade / BRCS attitude mapping; check duplicated BRCS threshold erratum; taxes and religion not double-counted. |
| **High** | Fortresses and occupation | Resolve BRCS table-versus-war-text upkeep, siege protections, own occupation, staged damage and investiture. |
| **High** | Calendar / insolvency | Test collection-time spell expiration, pre/post-tax pillage, the all-mode settlement procedure and terminal bankruptcy. |

## 11. Read-only validation gate and implementation boundary

Before the first gameplay change, prepare complete opening- and mature-season ledgers for at least representative territorial, merchant, temple-only and mage/source-only Anuire domains, using actual regent choice and original template data; include peace, war/occupation, weak/strong bloodline and economically stressed cases. Compare normalized 1.5 against current HD, including net income and separately chargeable obligations, liquidity risk, RP growth and available actions. Report all data gaps and propose an explicit save/rules version migration strategy. Include mathematical counterexamples for duplicate record fragmentation, source cash/Alchemy loops and recurring Seizures. Do not fabricate absent character ranks or scenario data.

**No implementation in this phase.** No edits to the core engine, Anuire importer, saves or UI follow from this specification alone. Provisional parameters must be reviewed and approved as a connected package, not enabled one at a time.

## 12. Source links / provenance

- Internal: [Complete holdings audit](BIRTHRIGHT_15_HOLDINGS_AUDIT.md) (D01–D20; J01–J08).
- Internal: [Economic examples](BIRTHRIGHT_15_HOLDINGS_ECONOMIC_CASES.md) (cases 1–13).
- Internal: [Source/version register](BIRTHRIGHT_15_HOLDINGS_SOURCES.md).
- AD&D E2 original: Richard Baker and Colin McComb, *Birthright Campaign Setting: Rulebook* (TSR #3100, 1995), Tables 14, 17–19 and named domain actions, as referenced in source register.
- BRCS B30: [publisher PDF listing](https://forum.birthright.net/t/brcs-3e-pdf-ruleset-developed-by-birthright-net/35906), chapter 5 (printed pp. 88–110) and chapter 7.
- BRCS B35: [publisher version record](https://forum.birthright.net/t/brcs-3-5e-pdf-ruleset-chapters-developed-by-birthright-net/35907), chapter 5 PDF pp. 2–21.
- [BRCS errata](https://birthright.net/wiki/index.php/Errata), relevant for fort maintenance, skill-RP example and attitude thresholds.
