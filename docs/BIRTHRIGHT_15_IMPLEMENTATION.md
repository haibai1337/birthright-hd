# Birthright 1.5 implementation

**Current implementation: Increment5 delivers explicit headless court/development orders.** Lawful seats, funded palace capacity, actual standard/Court/global-character opportunities, Create/Rule/Realm Rule/Province Rule, paid Court increases, palace construction, pending Administrate nominations and replay-safe costs/checks use the existing scheduler and Increment4 accounts. See the [court/action implementation](rules/BIRTHRIGHT_15_COURT_ACTIONS_IMPLEMENTATION.md). It requires an explicit action-phase checkpoint and does not bypass Council/Maintenance. General `applyCommand`, commercial/magic/political execution, full Maintenance and UI remain guarded. Earlier increment sections retain their historical figures/boundaries.

**Current character release:1.2.0.** All15 finalization decisions remain applied. Spider's subsequent reviewed racial sheet resolves his RP/Admin inputs, preserving ten original Sierra spells and explicit virtual Guild qualification. There are110 reviewed domain profiles and six unidentified records. The [Spider completion section](#spider-completion--overlay-release-120) records current hashes, unchanged115-record coverage, exact calculations and tactical limits. Earlier increment/release sections retain their historical acceptance figures and former gates; the current character report and Spider section supersede those gates. Gameplay remains guarded.

## Increment 1 — versioning, exact quantities and persistence

Implemented **24 October 2026**, against the [approved v1.1 contract](rules/BIRTHRIGHT_15_RULES_SPEC_V1_1_FINAL.md), §2/§11/§12. All J/V/F decisions are approved; no historical research or policy vote was reopened. **The 1.5 gameplay economy is not active. M1B remains in progress / partial.**

### Rules identity and new-game boundary

`domainRules` is independent of Classic/Enhanced, faction availability, difficulty, management mode and settlement execution version:

| Campaign       | Identity                                             | Overlay metadata                                                                                    | Save envelope                        |
| -------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Existing HD    | `{ id: 'birthright-hd-legacy', version: 1 }`         | No derived 1.5 overlay implied                                                                      | Existing version 1, numeric balances |
| 1.5 foundation | `{ id: 'birthright-1.5', version: '1.1', overlays }` | Separate `characters` and `handlers` references, each `{ version, fingerprint }` or explicit `null` | Version 2, canonical integer strings |

The overlay fingerprint is a lowercase SHA-256 identifier. `null` means no overlay is attached; no reviewed characters or handlers are fabricated. `domainRulesOf` resolves absent legacy metadata; unsupported/malformed identities are rejected. Metadata defaults do not select a new economy.

`createCampaign` remains the existing playable legacy constructor. `createBirthright15Foundation(scenario, playerRealm, options)` reuses that constructor and initializes exact quantities **only for a fresh game**. It is not an existing-save migration or another scenario loader. Options retain the existing seed, profile, faction selection, ruler, difficulty and event choices, plus overlay references. There is no UI entry point for the foundation.

The factory consumes **already-adapted GB** from the existing scenario. For Anuire, the existing adapter has already converted native 150 treasury tenths into 15 GB; the foundation stores **1,800 accounting units**, without dividing by ten again. Initial RP, character/source identities, ownership, armies, geography and source fingerprints remain intact. Exact and legacy balances are different typed campaign variants, not two synchronized copies in a campaign.

### Quantities

`quantities.ts` supplies distinct branded BigInt `GoldUnits` and `RegencyPoints`. **1 GB = 120 units.** Monetary differences/reports can be signed; stored treasury and RP balances must be nonnegative. No RP stock cap, safe-number ceiling, overflow account, saturation or decay is present in the new representation. Future seasonal collection still needs the approved skill/bloodline limit; that mechanic is not implemented here.

| Boundary / operation                       | API                                                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact units / RP                           | `goldUnits(bigintOrCanonicalString)`, `regencyPoints(bigintOrCanonicalString)`                                                                            |
| Decimal / rational GB                      | `goldFromGB('0.1')`, `goldFromGBRatio(1n, 3n)`                                                                                                            |
| Known numeric initialization/static prices | `goldFromLegacyGB(number)`, `regencyFromLegacy(number)`; rejects unsafe or inexact inputs                                                                 |
| Arithmetic                                 | `addGold`, `subtractGold`, `multiplyGold`, `multiplyGoldRatio`; corresponding Regency helpers                                                             |
| Comparison                                 | `compareGold`, `compareRegency`                                                                                                                           |
| Explicit rounding                          | Ratio helpers default to `exact` and throw if indivisible; callers can select `floor`, `ceil`, `trunc`. `roundGoldToGB` is an explicit whole-GB boundary. |
| Serialization                              | `serializeGold`/`deserializeGold`, `serializeRegency`/`deserializeRegency`, nested Zod codecs                                                             |
| Exact display / GB ratio                   | `formatGold`, `formatRegency`, `goldInGB`                                                                                                                 |

Examples: 1/3 GB = 40 units; 1/2 = 60; 1/10 = 12; 1/12 = 10. Values below a representable accounting unit are not silently rounded. Formatting uses terminating decimals or exact mixed fractions; no Number conversion is needed even for very large quantities. Existing `goldBars` and unrelated game-wide numeric helpers are unchanged.

### Persistence and execution isolation

The existing `serializeCampaign` / `deserializeCampaign` API and schema/reference validation remain the sole persistence architecture. Version-2 codecs encode exact realm balances/surplus, report and Maintenance quantities, RP pledges/opposition, tribute amounts, character salaries and effect RP costs as canonical decimal integer strings. Positive values reject signs, whitespace, leading zeros, exponents and JSON numbers; signed report quantities allow canonical negatives. BigInt has no global JSON patch or tagged-object encoding.

Legacy loading remains the default. A 1.5 file requires explicit core opt-in:

```ts
const text = serializeCampaign(foundation);
const restored = deserializeCampaign(text, scenario, {
  domainRules: 'birthright-1.5',
  expectedOverlays: reviewedOverlayReferences,
  overlayContent: reviewedOverlayContent,
});
```

`expectedOverlays` checks both versions and hashes, including explicit absence. **Increment 2 strengthens this boundary:** any non-null saved overlay now also requires its actual content in `overlayContent`; core recomputes the canonical content hash and validates its supported version, identities, allocations and character/handler pairing. References alone are insufficient. Null/null foundations remain available for isolated foundation tests. The original scenario fingerprint is never substituted. A version-1 save cannot be passed to this 1.5 option for automatic conversion. Unknown envelope/rules/overlay versions fail; they never fall back to legacy interpretation.

Legacy numeric balances and historical reports are not converted, scaled, truncated or recomputed. Existing compatible legacy migrations still apply. One directly related persistence defect was corrected: a non-PC campaign with no seasonal phase no longer gains an unrelated `seasonFlow` merely by loading; PC legacy phase upgrades remain supported. RNG, IDs, action cursor, ownership and settled records remain saved state.

The existing save-size resource guard remains; it is not an RP balance rule. New individual quantity schemas have no numeric maximum. Old binaries are not expected to load version-2 files.

`Campaign` remains the legacy simulation type; `Birthright15Campaign` is the exact foundation type; `StoredCampaign` is their persistence union. Identity-only reference helpers accept both without projecting balances to numbers. Command validation returns a prerequisite error for a 1.5 foundation, before spending, history or RNG mutation. Direct cost/forecast, AI planning and PC collection/settlement entry points also reject it. Default UI loading rejects the foundation explicitly. Current numeric command/history definitions remain legacy; adapting future 1.5 orders is later work, not permission to execute those commands against exact balances.

### Files changed in this increment

- Added `packages/core/domain-rules.ts` and `packages/core/quantities.ts`.
- Adapted `packages/core/schema.ts`, `persistence.ts`, `engine.ts` and `index.ts` for identity, exact schemas, the shared save envelope and explicit fresh-game foundation.
- Added execution guards to `validation.ts`, `economy.ts`, `selectors.ts` and `ai.ts`; narrowed identity-only types in `regents.ts`, `fealty.ts` and `selectors.ts` so reference checks do not depend on numeric balances.
- Added `tests/quantities.test.ts` and `tests/domain-rules-persistence.test.ts`.
- Updated this report, architecture, gameplay systems, known issues and roadmap. The final rules contract and original imported campaign/source files are unchanged.

### Verification and existing failures

Focused checks cover exact fractions/ratios and signed rounding, RP above 65,535 and beyond the safe-integer range (including 151-digit values), canonical strings, malformed/unknown versions, fingerprints, exact report/collected-Maintenance round trips, original numeric-save behavior, all 51 Anuire balances/identities, RNG/cursors and blocked execution. TypeScript checking covers application integration. No browser interaction, screenshot review, import regeneration, native build or extended simulation is needed for this headless foundation.

The final focused run (`quantities`, `domain-rules-persistence`, `core`, `maintenance-phase`) passed **40/40 tests**. The new quantity/persistence files account for 12 of these; the remaining 28 exercise existing core and staged Maintenance behavior. The broader compatibility comparison below is reported separately.

The selected legacy compatibility run initially exposed **18 failures**. A read-only baseline using the pre-increment core sources reproduced all 18. Fixing the non-PC save phase defect removes one; **17 unchanged baseline failures** remain: 11 in `domain-actions.test.ts`, six in `fealty-initialization.test.ts`. These fixtures enter domain-action schedules while still at Council, or assume a pre-Maintenance phase/AI flow. Their failure names match the baseline exactly; no new failure was introduced in that comparison. The existing private-Anuire initialization/preservation cases pass. Baseline/current JSON evidence is retained under ignored `tmp/br15-increment1/`; the baseline check did not replace workspace files. These suites are not reported as passing and were not rewritten or disabled to close this increment.

### Stop boundary and Increment 2

Increment 1 supplies the requested infrastructure and is complete. **No 1.5 collection formula, RP generation, bloodline growth/sacrifice, Alchemy, court action, trade, tax, suppression, payroll or AI-management rule is activated.** This remains true after Increment 2. The legacy 65,535 collection/headroom paths remain legacy behavior; they are not used by the exact foundation and must not be carried into the later 1.5 collection implementation.

The Increment 1 handoff had no new technical blocker to character authoring. Increment 2 results follow. The recorded stale phase-test fixtures need repair before a later integrated M1B closeout, but do not block character-sheet authoring. Gameplay activation additionally requires the later quantity-safe command/economy increments. Do not mark Birthright 1.5 or M1B complete from this foundation.

## Increment 2 — initial character release 1.0.0 (historical snapshot)

The counts and pending approvals below record the initial release. The finalization section supersedes those gates; previous payloads remain archived.

All **116 original IDs** now have structured entries and [full worksheets](rules/BIRTHRIGHT_15_CHARACTER_WORKSHEETS.md). The [reconstruction report](rules/BIRTHRIGHT_15_CHARACTER_RECONSTRUCTION.md) explains methods and individual release gates; [coverage JSON](rules/BIRTHRIGHT_15_CHARACTER_COVERAGE.json) records exact counts, retained input hashes, both real SHA-256 fingerprints and handler contexts.

| Coverage                   | Complete authored | Provisional | Unresolved |
| -------------------------- | ----------------: | ----------: | ---------: |
| 116 records                |                95 |          14 |          7 |
| 49 ordinary default rulers |                41 |           7 |          1 |
| 80 ruler/domain contexts   |                66 |          13 |          1 |
| 36 Classic candidates      |                35 |           1 |          0 |
| 63 expanded candidates     |                52 |          10 |          1 |

The six unidentified entries remain unidentified. Spider's zero ability/HP record remains unresolved. Four special-body/true-bloodline cases, seven native/AVA conflicts and three institutional faith/alignment conflicts have explicit provisional conversions or withheld divine standing. No pending actor is silently approved by passing schema validation. `authored-checked` describes an authored allocation review, never recovered historical skill ranks.

The versioned JSON stores actual per-level skills, feats, HP rolls, abilities, class progression, ordinary spell acquisitions and choices. The maximum selected original class level supplies the total level budget; multiclass levels are not added. Revised scion levels consume that budget. Native numerical bloodline and final abilities are preserved; neither racial adjustments nor scion score bonuses are added again. Original HP/inventory, AVA/native disagreements and source offsets remain visible. The existing importer, scenario fingerprint, campaign relationships/appointments and original files are retained.

Pure core selectors provide derived sheets, rank/check separation, the five approved RP ratings/brackets, exact combined whole-RP rounding, caster eligibility and named actor authorization. They do not collect RP or money. Twenty-four roster characters meet reviewed Source qualifications, twenty-three Temple qualifications. Seventeen named mages have thirty conditional ruler/lieutenant handler contexts; current same-domain authority and dates still gate eligibility. An unused candidate, outside mage, duplicate deployment or nominal Source owner cannot qualify by itself.

Separate character and handler `1.0.0` payloads use canonical sorted JSON and real SHA-256. Handler content pins the exact character version/hash. Loading attached content through the existing version-2 persistence API recomputes hashes and rejects missing/mismatched/cross-paired/unsupported overlays; it does not select a replacement. Legacy saves and null-overlay foundations retain their prior behavior. `references35` supplies the existing `domainRules.overlays` metadata. Merely building or attaching content never removes an execution guard.

### Files and reproducibility

- Added core `character-rules35.ts`, `character-sheets.ts`, `overlay-fingerprint.ts`; exported their pure APIs through the existing core index.
- Added world-data `anuire-characters15.ts` and actual authored `anuire-characters15.json`, exported through its existing index. The private compiled content is derived at `reference/extracted/anuire/birthright15.characters.json`.
- Extended the existing persistence options with `overlayContent`; strengthened load checks without introducing another persistence format or auto-migration.
- Added `tests/character-overlays.test.ts`; adjusted the Increment 1 overlay-reference case to require actual content. Unrelated fixtures/scheduling remain untouched.
- Added explicit content-authoring/report scripts and the linked reconstruction/worksheet/coverage documents; updated this report, the roadmap, gameplay systems and known issues.

Run `node scripts/report-anuire-characters15.mjs` to verify the five retained original input hashes and reproduce coverage, worksheets and the private compiled payload without rewriting allocations. The original bulk `author-anuire-characters15.mjs` is now guarded against overwriting finalized releases; use scoped content edits and the report command. Neither script runs turns, adds assets, changes ownership or replaces the native importer.

### Validation and remaining boundary

Focused validation covers all 116 IDs and allocation ledgers; malformed spending/feats/abilities/levels; original input/value preservation; casting/faith gates; Classic/expanded coverage; same-person ruler/lieutenant authorization; independent Node SHA-256 vectors/content comparisons; actual-content save/load pairing; and Increment 1 exact quantities/guards. No UI, browser, screenshot, native build or extended campaign simulation is included.

The final focused run passed **21/21 tests** across `character-overlays`, `domain-rules-persistence` and `quantities`; `npm run typecheck` passed. Canonical SHA-256 results match independent Node crypto calculations, and the report verifies all five retained input hashes against the economic-study baseline. Formatting and diff whitespace checks also pass. The **17 pre-existing failures** remain exactly as documented above (11 domain-action, six fealty initialization); they were not rewritten, hidden or treated as an Increment 2 blocker.

Increment 2's content and validation are delivered with explicit individual release gates. Before full RP activation, approve the provisional class/body/faith choices and Spider's missing sheet, freeze accepted overlay versions/hashes, and complete the later quantity-safe economy/command/settlement increments. The six unidentified non-actors can stay unidentified. Final budget substitution belongs to the existing later integration gate. Basic automatic, Advanced guided and Expert manual continue to share one simulation. **No 1.5 gameplay or character UI is activated; M1B remains partial.**

## Increment 3 — exact read-only economy and forecasts (1.0.0 baseline)

The financial figures below describe the preserved initial report. The finalization section records the current 1.1.0 qualifications and affected forecast updates.

Implemented **25 October 2026**. The [economic forecast report](rules/BIRTHRIGHT_15_ECONOMY_FORECAST_REPORT.md) documents APIs, source gates, accounting semantics and remaining boundaries. [All 51 domain rows](rules/validation/increment3-domains.csv) and [full exact source ledgers](rules/validation/increment3-economy.json) reproduce the approved repricing with **zero reference mismatches**. Mieres remains inactive and Chaos a separate event controller; neither receives an ordinary settlement result.

For 49 ordinary domains, fixed production is **1,363 1/6 GB**, gross recorded expenses **413 GB**, NPC payroll waivers **54 GB**, and payable expense **359 GB** (271 military +39 forts +49 courts). Actual approved/current handlers qualify **21 1/3 GB** virtual cash; **24 2/3 GB** remains withheld. Net is **1,025 1/2 GB**, within the original **1,004 1/6–1,050 1/6 GB** envelope. These are forecasts of represented obligations, not completed receipts or proof of unknown costs being zero. The two recurring −1-GB mage deficits retain opening funds; no rescue income was invented.

### Implemented and changed files

- Added `packages/core/economy15.ts`, exported through the existing core index: deterministic typed income/cost helpers, active owner/province/type holding aggregation, linear court quotes, exact source ledgers, conditional virtual income, evidenced infrastructure/commitments, Administrate and conserved transfer funding quotes. All money/balances use existing exact quantities.
- Reused `sourceHandler35`, `characterActor35` and `skillCheck35` directly. No alternative mage/class/candidate qualification logic or new character allocations were added. Both Increment 2 content fingerprints remain unchanged.
- Exposed the existing `npcPayrollExempt` predicate from `economy.ts` with balance-independent input typing so both forecasts use the same controller/liege-chain rule. Legacy economic formulas and entry-point guards remain unchanged.
- Added `tests/economy15.test.ts` and `scripts/report-anuire-economy15.mjs`. The report reuses retained inputs and approved per-domain references, checks original/overlay hashes and purity, and writes only the linked supporting documents. It does not regenerate character content.
- Updated this implementation log, the roadmap, gameplay systems, known issues and validation index. No UI, importer, original campaign data, character content, persistence format or save file changed.

The new APIs are explicitly `economicForecast15`/`economicForecasts15`; legacy numeric calls still reject 1.5 states. Named handler candidates are not appointments. Suppressed/destroyed holding levels produce no receipts; virtual thresholding occurs once per aggregated group and grants no real Guild or trade rights. All unit payroll is shown gross/waived/payable; legacy RP/unpaid selections do not make obligations vanish. Unknown prices/salaries/contracts and hypothetical infrastructure remain separately visible.

Administrate's eligible base excludes military, court and ordinary net administration. No nomination/die means no discount. An explicit reviewed actor/d20 quote uses the exact fractional DC and whole-GB saving; no live roll, receipt or campaign mutation occurs. Already-paid commitments are excluded from new bills. Transfer previews conserve matching debits/credits and cannot fund circular promises or relays with incoming same-boundary cash.

Rhuobhe's current NPC/player alternatives are **+2/3 / −4 1/3 GB**, with its 4-GB virtual opportunity still conditional. Spiderfell is **+3 / +2 GB**. Selecting a formerly exempt realm removes its NPC-only waiver; management mode grants no replacement money.

### Verification and stop boundary

The final focused run passed **46/46 tests** across `economy15`, the existing legacy `economy`, `domain-rules-persistence`, `quantities` and `character-overlays`; `npm run typecheck` passed. Exact per-domain/aggregate comparison, immutable original inputs/character fingerprints, formatting and diff whitespace checks pass. The **17 pre-existing failures** documented above remain untouched; no unrelated fixture or turn-scheduling changes were made.

The fourteen provisional character decisions and unresolved Spider remain the Increment 4 approval gate. No seasonal RP, bloodline growth/sacrifice, Alchemy, new trade route, tax/Seizure/Contest order, court progression/action, AI management, character UI or live Maintenance execution was implemented. All 1.5 execution guards remain. Later increments must integrate exact commands, reviewed actors, commercial/magic rights and resumable settlement before activation. **Increment 3's read-only scope is delivered; Birthright 1.5 and M1B remain partial.**

## Character finalization — overlay release 1.1.0

Implemented **25 October 2026** after Increment3. All 15 user-approved cases are applied; the subsequent explicit approvals for **Reneava AVA Cleric5** and **Spider virtual Guild qualification** are included. [The reconstruction report](rules/BIRTHRIGHT_15_CHARACTER_RECONSTRUCTION.md) is the complete release/content/evidence record, with the exact fifteen IDs, original class conflicts, ten Spider spells, profile limitations and later activation gates.

Coverage is **110 reviewed domain entries, zero provisional entries, six unidentified**. This means 109 validated allocation ledgers plus Spider's reviewed limited Monster13 profile, not 110 complete tactical stat blocks. All 49 default ordinary rulers, all 80 active ruler/domain contexts, all 36 Classic candidates and all 63 expanded candidates have reviewed domain profiles. The six original unidentified IDs remain unidentified. **All 95 previously completed ordinary authored entries compare unchanged**, including levels, Scions, ranks, feats and spellbooks; the [preservation manifest](rules/validation/character-release-preservation.json) pins their SHA-256 values.

Exceptional profiles explicitly separate allocation ledgers, effective martial/casting capabilities, monster HD, body/traits, domain readiness and deferred tactical mechanics. Gorgon retains effective martial25/Wizard16 and original HP170; Rhuobhe martial16/Wizard15; Chimaera Wizard13 and native HP87. The legal original allocation budgets remain in place without summing free native classes or awarding extra purchases. Spider retains native zero abilities/HP, raw Azrai Major95 and original Wizard-code13 tuple, with approved derived **Monster13 / 13d8 / Azrai True95**. His missing skill ledger is explicit rather than filled with fictional ranks.

Direct read-only CD inspection recovered **all ten Spider spells**: items139,145,147,153,156,157,162,193,196,197. Items218/224 are Fear/Regeneration blood abilities. Native IDs, names, scopes, inventory line numbers and SHA-256 provenance are in `sierraSpellEntitlement`. Pure `spellEntitlement35` / `characterSpellAccess35` recognize the explicit monster entitlement without ordinary Wizard levels. Costs, opportunities, source access, targets and casting restrictions remain future execution gates. No Alchemy or unlisted spell is granted. A separate explicit `virtualGuildHandler` approval qualifies him through the existing dated ruler/lieutenant authorization checks. That exception grants no Source RP or fabricated skill ranks.

The three approved intermediary doctrines activate qualified clerical access while preserving native alignments; Larra's derived patron is Sera. Reneava's native class3 Ranger and AVA class3 Priest are a genuine two-enum conflict; original AVA text, `PLAYCLAS.HXX`, `REGENTS.HXX` and divine items207/209 establish the conflict. The user explicitly selected AVA Cleric5. Its 56-point legal skill allocation, feats and patron/domains are clearly authored. No appointments or additional spell inventories are invented.

Current overlay references (canonical sorted JSON; separate real SHA-256):

| Payload    | Version | Fingerprint                                                        |
| ---------- | ------- | ------------------------------------------------------------------ |
| Characters | 1.1.0   | `9a22d7774bd2ec90a35e989f95fe8bbfd68c9aa822fbe1e99236b38baa48df95` |
| Handlers   | 1.1.0   | `6e27435553bebea50c9478fbb16aa2a2e0c7aed2e82a00615de84f59f73ea58c` |

There are **28** reviewed ordinary Source casting qualifications, **27** Temple qualifications and **22** distinct reviewed economic handlers across **40** conditional authority contexts, including Spider's separately approved exception. An entry remains conditional on actual current office; unused candidates are not silently appointed. Explicit archived1.0.0 payloads still load with their original hashes; current1.1.0 cannot substitute for them. Missing, altered, unsupported and cross-paired content fails. No save auto-migration occurs.

Only the affected Increment3 forecasts were queried: Chimaeron, Endier, Gorgon's Crown, Rhuobhe and Spiderfell, plus the existing Rhuobhe/Spider controlled alternatives. [Exact forecast reconciliation](rules/validation/character-finalization-economy.json) preserves all original costs and nonvirtual income. Chimaeron gains **14/3 GB**, Gorgon **6 GB**, Rhuobhe **4 GB**; Endier's approved Caine is still unappointed. Spider qualifies as a handler but the original opening holdings produce **zero virtual income**. A labeled hypothetical Source6 case verifies **4/3 GB** when he handles a qualifying Source. Total delta is **44/3 GB**, taking qualified virtual cash to **36 GB**, conditional cash to **10 GB** and aggregate net to **6241/6 GB**. These aggregate figures are arithmetic updates to the frozen baseline, not a repeated 51-domain audit. No economic formula changes.

Reproduce content with `node scripts/report-anuire-characters15.mjs` and focused finances with `node scripts/report-anuire-character-finalization.mjs`. The accepted bulk-authoring generator and broad baseline reporter are guarded against overwriting finalized choices or the original baseline. Previous choices, compiled overlays and coverage remain under `reference/research-cache/birthright15/character-release-1.0.0/`.

**Remaining character boundaries:** Spider's own skill-rated RP and Administrate need a reviewed numeric skill/stat conversion or an approved missing-data policy before those operations can be certified for him. Six unidentified unused records cannot be activated as fictional people. Exceptional tactical traits, ordinary spellbook expansion and combat statistics remain source-qualified partial data; they do not remove reviewed domain spell/handler rights. Increment4's actual quantity-safe RP/bloodline/command integration and later magic execution are not implemented here. All execution guards remain. No UI, original data, saves, combat, economics or scheduling was activated or rewritten. Basic automatic, Advanced guided and Expert manual retain the same simulation. The **17 pre-existing fixture failures** remain visible for later M1B integration.

Focused final verification: **22 tests passed** (character overlays, exact-overlay persistence and the three affected financial/Administrate cases); nine other cases in the selected economic test file were intentionally excluded by the test-name filter. `npm run typecheck` passed. Coverage/report generation validates all five preserved campaign-input hashes and all 116 stable IDs. Independent SHA-256 checks, the 95-entry preservation manifest, explicitly supplied old-overlay load, altered/cross-paired overlay rejection, ten-spell Spider coverage, exceptional Wizard16/15/13 and hypothetical authorized Spider Source6 cash are covered. No broad campaign audit, unrelated baseline-fixture repair, browser/native build or gameplay activation was performed.

## Increment 4 — Regency, bloodline and exact resource operations

Implemented **25 October 2026**, under the unchanged approved v1.1 contract. The [technical implementation report](rules/BIRTHRIGHT_15_REGENCY_IMPLEMENTATION.md) documents formulas, eligibility, APIs, persistence, funding and integration boundaries. No character allocations or source records were regenerated.

### Files and working mechanics

- Added `packages/core/regency-state15.ts`: strict exact-quantity codecs for the versioned journal, original/current bloodline records, seasonal entitlements, authorizations, reservations and derived projection.
- Added `packages/core/regency15.ts`: existing-selector-based RP quotes; explicit initialization and atomic opt-in transitions; once-per-regent collection; explicit unknown withholding; conservation-checked reservations/commitments/spending/transfers; elective growth; sequential sacrifice; regular-unit payroll; future-Alchemy financial quotes.
- Extended `schema.ts`, `persistence.ts` and `index.ts` with the optional `regency15` section and strict replay/account/character validation. Existing version1 saves and version2 foundations without that section retain their interpretation. Initialization is explicit, not a load migration.
- Extended `economy15.ts` with separate Regency/financing companion data and optional RP-payroll previews. Existing cash formulas, gross costs, NPC waivers and all-GB reference figures remain intact. The RP-adjusted projection exposes recorded coverage so later settlement can avoid billing it again.
- Extracted the existing bracket lookup as `ratingPercent35` in `character-sheets.ts` for shared calculation/validation. Actual character/handler payloads and SHA-256 fingerprints are unchanged.
- Added `tests/regency15.test.ts`, `scripts/report-anuire-regency15.mjs`, and [JSON](rules/validation/increment4-regency.json)/[CSV](rules/validation/increment4-regency.csv) opening comparisons. Updated the roadmap, gameplay systems and known issues.

RP uses the ruling character's actual reviewed ranks and existing class gates. Fractions survive until the completed rating; weighted contributions are summed and floored once, then capped only by current S. No lieutenant substitution, multiclass duplication, port/trade RP, Source-owner fallback or virtual-cash-to-RP inference is introduced. Province RP preserves the existing legal-owner/unoccupied/uncontested entitlement; holdings remain independently owned.

Current S starts at original numerical A and is stored separately by stable character ID. There is no RP storage cap, decay, headroom or Number conversion of unbounded quantities. Opening banks survive intact. Growth costs S+1 after two successive observed boundaries with free reserve at least S+2, resets on growth/sacrifice/replacement/failure, and is at most twice per campaign year. Basic selected policy, Advanced confirmation and Expert order use the same formula. Sacrifice is separately explicit, prices each point at its preceding S and grants no RP profit when a growth is immediately reversed. No mode or distress condition invokes sacrifice automatically.

Each payment/transfer has an actual source, actor, obligation and transaction identity. Active reservations cannot be reused; paid commitments cannot be charged again. Transfers conserve RP and keep same-boundary incoming pledges from funding relays while allowing local bills and independently funded outgoing promises. Known fixed fealty promises remain visible and cannot masquerade as free growth/new-obligation surplus. Payroll applies native waivers first, accepts only eligible regular-unit RP portions, charges ceil(5 × selected GB) once per domain/season, records units and creates no spendable GB. Fresh actual collections are available immediately. Alchemy can reserve arbitrarily large RP plus its separate 1-GB fee, but generic payment refuses to execute that spell reservation.

### Actual Anuire quote coverage

All **116** stable bloodline references are retained. Of **49 ordinary default domains**, **48** have known collection quotes; Spider's one quote remains explicitly unknown because his ranks are unestablished. His conditional upper bound is **5 RP**, never credited. The known domains produce **1,067 skill-qualified RP before caps** and **907 certified seasonal RP after caps**, against **2,456 RP of preserved opening stock**. **259 GB** of payable regular-unit upkeep is potentially eligible for explicit RP financing; mercenaries and waived obligations are excluded. The optional opening-bank-plus-certified-collection scenarios quote **1,108 RP** spent on regular maintenance; they are not automatic policy or new GB income.

The reference comparison has **zero cash mismatches** against the frozen Increment3 ledger plus the accepted character-finalization delta. All five original research-input hashes, the authored character file and both overlay fingerprints remain unchanged. Player-controlled Rhuobhe can optionally cover 5GB regular pay for25RP, yielding cash net+14/3GB; player-controlled Spiderfell can cover1GB for5RP from its preserved bank without assuming new RP, yielding+3GB. Caine actually selected in Endier has a27RP seasonal quote. These are labeled funding/selection scenarios, not subsidies or newly assigned offices. Hermedhie and Eyeless One retain their existing recurring cash deficits.

### Save/load, verification and remaining boundaries

The existing version2 envelope stores `regency15.version=1`, original references, current scores, boundary/streak/year counts, reservations, transaction IDs, receipts and pending funding data using canonical integer strings. The journal is replayed only to verify the stored projection and account balances. Duplicate/altered operations, inconsistent caches, invalid prices/ranks, incorrect character authority, unsupported versions and malformed quantities fail; loading/reports never credit a second receipt. Old foundations remain explicitly uninitialized. No legacy balances or saved overlay identities are converted.

Focused validation covers collection brackets and fractions, aggregation, class/ruler gates, caps, enormous reserves, two-boundary/elective growth, interrupted/replaced rulers, annual accounting, sacrifice/no-profit/reload, all three authorization modes, resource reuse, conserved transfers/blocked relays, actual known pledges, aggregate mixed payroll, fresh RP, exclusions, future Alchemy resources and malformed saves. General gameplay guards and legacy persistence remain tested. Final check results follow below.

**Increment5 dependencies:** quantity-safe domain/court orders must reserve actual quoted costs and actor/action opportunities through these interfaces; they must not turn a financial quote into an action or magic permission. Full Maintenance must integrate ordinary cash receipts, paid RP obligations, payroll coverage, growth choices and the existing resumable cursor in the approved order. Spell execution stays Increment6, politics later, and mode UI/full settlement Increment8. Spider's rank-dependent RP/Admin and six unidentified records remain specific data gates; they do not block the independent primitives. No new design questionnaire is required. The **17 pre-existing legacy fixture failures** remain untouched for later M1B integration. **All general Birthright1.5 gameplay guards remain; M1B is partial.**

Final Increment4 verification: **17/17 new Regency tests and 36/36 directly related tests passed (53 focused cases total)**. The related suites are `economy15`, `domain-rules-persistence`, `character-overlays` and `quantities`; the final RP run includes the corrected synthetic ley-line setup, before/after growth/sacrifice reloads and a conserved **10^110-RP transfer** from a **10^120-RP** bank. The multi-season full-data test has a bounded15-second allowance; no unrelated fixture, scheduling or gameplay change was used to resolve timing. Large-number Alchemy quotes reserve **10^110 RP** plus the real separate fee without executing a spell. TypeScript checking and focused formatting/content checks complete the verification. The 17 pre-existing domain-action/fealty failures are still recorded above and were not rerun or rewritten for this increment.

## Spider completion — overlay release 1.2.0

Implemented **25 October 2026**, after Increment4 and before Increment5, under the approved completion prompt and final mechanical corrections. [The focused completion report](rules/BIRTHRIGHT_15_SPIDER_COMPLETION.md) records source versus conversion evidence, all derived statistics, ranks, costs, feats, ten spells and remaining tactical uncertainties. This changes only Spider's derived character content and its pure selectors/validation. No gameplay, magic, combat, Maintenance, UI or new economic policy is activated.

### Character content and calculations

- Added `packages/core/spider-sheet35.ts`: strict Spider-only racial schema, normal class/cross-class purchase costs and rank caps, per-HD ability/HP/feat validation, and pure combat derivation. The narrow twelve-skill racial list belongs only to original057. Ordinary class/feat validation remains unchanged.
- Updated only057 in `packages/world-data/anuire-characters15.json`: **Monster13**, Large Monstrous Humanoid; approved scores13/18/12/16/12/16; legal HP68 from rolls `8,3,4,4,4,4,4,4,4,4,4,4,4` totaling55 plus13CON; **80 purchased ranks costing80 points**,20 atHD1 and5 at each subsequentHD. Feat slots1/3/6/9/12 hold Multiattack, Ability Focus(Poison), Improved Initiative, Alertness and Weapon Focus(Claw).
- Derived BAB13; **Claw+14 / Claw+14 / Bite+11**; saves5/12/9; grapple18; initiative8; AC22/touch13/flat-footed18; poisonDC19. Weapon Focus applies only to claws; Multiattack changes the bite penalty to−2. Tests change those inputs independently to verify derivation.
- Existing character selectors now read the reviewed racial ledger for ranks/checks/ratings. Province rating12 and Law16 qualify at100%; Guild5.5 floors to bracket5/0%. Temple/Source remain separately disallowed. Unpurchased Administrate has a Wisdom-only+1 check and grants no automatic discount. No ordinary Wizard levels or new RP category is added.
- Structured poison, web, leap, regeneration, spider influence and Fear data retain provenance and deferred execution. Web DCs, regeneration lethal exceptions, SR17 and abdomen AC16 remain explicitly partial/provisional. HP68 and the six approved scores are authored conversion values; the actual CD help's HP81 is preserved as conflicting source evidence.

### Preservation, versioning and forecasts

All **115 other authored records and compiled character records** compare equal to archived1.1.0; every actual handler permission record also compares equal. All116 stable identities remain, including the six unidentified records. Native zero HP/abilities/alignment, Major95 and the original class tuple remain archival; active derived bloodline remains **Azrai True95**. All ten verified spells and their original IDs, levels, inventory lines and hashes remain unchanged. The separate virtual Guild exception remains authorized through actual ruler/lieutenant office; no Source/Temple RP or Alchemy permission follows.

| Overlay    | Version | Canonical SHA-256                                                  |
| ---------- | ------- | ------------------------------------------------------------------ |
| Characters | 1.2.0   | `da991cb3f4f418b0b2ca342a68ceab58ecb3d1f53cde37c543e9ab9f124fdf55` |
| Handlers   | 1.2.0   | `28fe78806a9cd92154d89082d664e4598ac51dd8c1f55ce9caa432d93543415f` |

Handler metadata pins the new character hash; permissions do not change. The world-data builder preserves individual record provenance versions, avoiding changes to the other115 compiled entries. Existing saves keep exact references: explicitly supplied archived1.1.0 content loads its old unknown-skill Spider RP snapshots;1.2.0 cannot silently replace it. Archived1.0.0 remains supported under its earlier boundaries. No source, scenario fingerprint, original campaign balance or saved character state is migrated.

`node scripts/report-anuire-characters15.mjs` updates current coverage and worksheets without authoring characters. `node scripts/report-spider-completion15.mjs` verifies the [115-record preservation manifest](rules/validation/spider-completion-preservation.json), unchanged handler permissions and all five original input hashes, then writes the [Spider-only reconciliation](rules/validation/spider-completion.json). Prior1.1.0 choices/compiled overlays/worksheets/coverage remain archived in the established research cache. Historical full financial/RP reports refuse regeneration from newer character inputs.

Actual Spiderfell opening assets yield **Q5 / collection5RP**, against currentS95. Preserved bank50 projects55; an arbitrarily large bank also receives5 without a storage cap. The old907-RP campaign total becomes **912RP across49 known quotes** by arithmetic delta, not a repeated full audit. Only affected NPC/player forecasts are recalculated: cash stays **+3GB / +2GB**, and opening virtual income stays0. The existing hypothetical Source6 case still yields4/3GB virtual cash without Source RP. Reports/overlay loading do not collect, spend, grow or rewrite saves.

### Focused verification and Increment5 boundary

**55/55 focused tests passed** across `spider-completion`, `character-overlays`, `regency15`, `economy15` and `domain-rules-persistence`, using `--maxWorkers=1 --no-file-parallelism`. An initial parallel run had four5-second timeouts without assertion failures; serial execution passed without changing those fixtures or scheduling. Tests cover80 actual point costs and per-HD caps, legal13d8 rolls, feats/attack math, preserved115 records/raw data/spells,5RP/unlimited reserves, separate qualification gates, unchanged cash, old RP snapshot loading, canonical SHA-256, strict pairing and general gameplay guards. TypeScript and focused formatting/content checks complete verification.

Spider's ordinary RP/Admin content gate is resolved; no new domain-policy judgment is needed before Increment5. Tactical-only unknowns remain explicit. Exact orders, actual actor/action opportunities, realm-magic execution and full Maintenance/UI remain their later increments. Basic automatic, Advanced guided and Expert manual keep one simulation. The **17 pre-existing domain-action/fealty fixture failures** remain visible and untouched. **All general Birthright1.5 gameplay guards remain; M1B is partial.**

## Increment 5 — Court, actors, palace capacity and development

Implemented **25 October 2026**, under the unchanged approved v1.1 rules and installed character/handler overlays1.2.0. The [technical report](rules/BIRTHRIGHT_15_COURT_ACTIONS_IMPLEMENTATION.md) documents actual APIs, formulas, legal actors, action opportunities, lifecycle, deterministic responses, exact payments and later integration requirements.

Added `court-actions-state15.ts` and `court-actions15.ts`. `initializeCourtActions15` requires an explicit action-phase checkpoint and existing Increment4 accounts; it cannot dismiss Council, execute Maintenance or migrate a save. `developmentOrderQuote15` and `actionOpportunities15` are pure. `applyCourtAction15` handles identified reservations, commitment, response, per-target resolution, uncommitted release, explicit end-slot, legal seat/consent, reviewed appointment, scoped Court/palace funding and pending Administrate nomination. General `applyCommand` remains guarded.

The existing `domainTurn` is the only round/order/cursor. Its three-round boundary and seeded d20 are shared with legacy execution; initiative, Council/AI sequencing and Classic/Enhanced behavior remain intact. Ordinary headless slots skip the original special controller without granting it an ordinary budget. Round3 parks for future Maintenance; explicit resume requires actual season advancement and a closed prior RP boundary, and advances no season itself.

Effective Court is capped by lawful seat P plus completed funded palace L. Opening unspecified Court1 is grandfathered; host consent is explicit. Brackets0–2/3–4/5/6–7/8–9/10+ grant0/1/2/3/4/5 Court actions, preserving ordinary standard action at Court0. Paid Court increase costs1GB, is limited to+1/domain/season, adds slots next round and upkeep next season. Palace Build costs6GB per level and completes no earlier than next round. **Capital grants no upkeep support:** completed levels add capacity only after actual half-GB/level seasonal funding. Partial funding retains only supported levels; forecasts keep the full obligation while Administrate uses the funded portion. No opening palace or historical seat is invented.

Global personal opportunities use stable original character IDs. A full action reserves one domain standard plus one personal opportunity. Realm Rule reserves additional real Court slots; it cannot create independent standards/casts. Lieutenants require genuine unique deployment/appointment and a reviewed pinned authority context, use the authorizing domain's account, and bring no independent Court budget. Independent vassals remain independent. The personal assistance modifier uses `floor(purchased Administrate ranks/5)`, not a full skill check or stacked actors.

Create Holding0 costs1GB/DC10; Rule Holding costs1GB/DC10+aggregated H; finite same-type/host Realm Rule charges and rolls each distinct province separately; Rule Province costs currentP GB/DC10+P, with no bids/holding modifiers and one paid attempt/domain/season including failure. Typed support/opposition and real RP bids use exact Increment4 reservations/commitments/payments. Logical groups preserve constituent IDs/provenance; own-H and fragmented-record duplication are blocked. Original terrain/elven Source-potential and grandfathered excess policies remain distinct from ownership/levels. There is no fixed legacy target-level RP charge or unreviewed automatic success.

The additive `courtActions15.version=1` in the version2 envelope stores the minimum development before-state, typed event journal and validated projection. RP balances remain solely in Increment4. Per-event RP prefix checkpoints and exact financial identities validate chronology, prices, payers, consumed slots, results, RNG, entities and ID sequence; replay grants no new resources or rolls. Orders cannot be reopened after reload. Development leaves already frozen RP entitlements and completed receipts unchanged. Existing foundations without the section remain uninitialized; old overlay payloads keep exact matching and cannot silently acquire1.2.0 behavior.

Administrate nomination records one reviewed available actor/domain/season and a replay-safe pending handoff. Quotes include eligible real forts, paid roads/bridges and funded palace infrastructure. No die, saving, substitute, automatic1GB action discount or seasonal settlement is executed. Increment8 must recheck availability, freeze eligible obligations, record and apply one result, and avoid rebilling already paid Court/palace/RP-payroll identities. Basic automatic, Advanced guided and Expert manual remain one simulation with later UI/policy orchestration.

`node scripts/report-anuire-court-actions15.mjs` writes the [focused Anuire artifact](rules/validation/increment5-court-actions.json). It confirms **49 known/912RP**, Spider5, opening Court1/zero extra actions and no invented seats/palaces. Endier's real province108 quotes6GB/DC16 with zero purchased-rank assistance; its Law0 contact in province094 quotes1GB/DC10 with identified response domains. A real holding-only institution35 cannot seat in province110 without sovereign11's consent. All116 character records, all handler permissions, Rhuobhe051, the five original input hashes and prior financial artifacts remain unchanged. Both overlays remain1.2.0 with character hash `da991cb3f4f418b0b2ca342a68ceab58ecb3d1f53cde37c543e9ab9f124fdf55` and handler hash `28fe78806a9cd92154d89082d664e4598ac51dd8c1f55ce9caa432d93543415f`. No character authoring or original-data extraction was rerun.

### Increment5 verification and Increment6 handoff

Final focused verification: **76/76 tests passed across6 files** (21 Increment5 cases plus55 directly related regressions), with no excluded cases. The command was:

`npm test -- tests/court-actions15.test.ts tests/spider-completion.test.ts tests/character-overlays.test.ts tests/regency15.test.ts tests/economy15.test.ts tests/domain-rules-persistence.test.ts --maxWorkers=1 --no-file-parallelism`

Source0 RP permission is tested separately from typed holding levels; palace capital/support, partial levels, exact halves, next-season funding, the original special-controller cursor and rejection of already spent activation checkpoints are explicit regressions. **Standalone TypeScript checking, final `npm run build`, focused Prettier checks and `git diff --check` passed.** The browser build completed its original-asset copy and exited0; its existing large-chunk advisory remains nonblocking. The first sandboxed build could not start Vite's Windows helper (`spawn EPERM`); the authorized retry used the same npm command, with no build/config replacement. Independent post-build hashes confirm unchanged source/character/financial artifacts. The17 known legacy domain-action/fealty fixture failures are untouched and are not claimed as passing.

**Increment6 handoff:** extend this exact order/opportunity path for bilateral trade/endpoint/cargo contracts, qualified Source/virtual-cash execution, legal ley endpoints/path/distance costs, Alchemy and supported realm-spell effects. Reserve real payer funds and one actual casting opportunity, retain separate spell/handler/Source-RP qualification, consume each result once, and keep unopened action guards. All ten Spider spells and Rhuobhe's installed sheet remain binding. Political mechanics stay Increment7; general once-only Maintenance/defaults, pending Administrate and mode workflows stay Increment8; integrated acceptance stays Increment9. **No full Birthright1.5 or M1B completion is claimed.**
