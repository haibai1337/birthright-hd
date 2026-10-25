# Birthright 1.5 — Increment 4 Regency implementation

Implemented 25 October 2026 under the approved [v1.1 contract](BIRTHRIGHT_15_RULES_SPEC_V1_1_FINAL.md), without changing its decisions. This delivers working headless RP transitions and forecasts. **General gameplay, seasonal Maintenance, ordinary domain commands, magic and UI remain guarded.**

## Implemented scope and entry points

| API / file                                               | Purpose                                                                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `regency-state15.ts`                                     | Version-1 RP journal/projection codecs inside the existing version-2 campaign envelope.                                                                                                                      |
| `initializeRegency15(state, scenario)`                   | Explicitly attach opening accounts, original numerical bloodline references and stable ruler bindings. Returns a new state; never a load migration.                                                          |
| `regencyCollectionQuote15` / `regencyCollectionQuotes15` | Reviewed ruling-character skill entitlements, exclusions, uncertainty, final rounding and current-S cap.                                                                                                     |
| `bloodlineGrowthQuote15` / `sacrificeQuote15`            | Exact development prices and qualification; no debit from viewing a quote.                                                                                                                                   |
| `regencyResources15` / `regencyReservationQuote15`       | Available, reserved and committed funds; preview one identified obligation. Financial affordability does not establish actor permission.                                                                     |
| `applyRegency15`                                         | Explicit, validated, immutable transitions: synchronize rulers, open a boundary, collect/withhold, reserve/commit/release/pay, transfer, sacrifice, allocate payroll and close with optional growth choices. |
| `regencyPayrollQuote15`                                  | Existing economic unit bills, waivers, regular-unit eligibility, mixed GB/RP funding and aggregate rounding.                                                                                                 |
| `alchemyResourceQuote15`                                 | Unbounded RP/output arithmetic and a separately funded 1-GB fee reservation. No Alchemy execution.                                                                                                           |
| Existing `economicForecast15` / `economicForecasts15`    | Added `regency` companion data and optional `regencyPayroll` selections; existing cash comparison fields retain their meaning.                                                                               |

These operations neither call `applyCommand` nor advance `turn`, Council, action rounds or Maintenance. They consume no RNG. The caller supplies transaction IDs and explicit authorizations. No AI policy, GUI control or automatic bloodline policy is enabled by attaching this state.

## Entitlement calculation and eligibility

The existing character selectors remain the sole skill/rating authority. `ratingPercent35` extracts their unchanged bracket lookup for snapshot validation; it does not change allocations or overlay fingerprints.

| Category | Rating from the ruler's ranks                                                                                              | Additional qualification                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Province | Diplomacy + Warcraft                                                                                                       | Reviewed blooded ruler                                  |
| Law      | Lead + Warcraft                                                                                                            | Reviewed blooded ruler                                  |
| Guild    | (Appraise + Bluff + selected Craft + Diplomacy + Gather Information + Intimidate + selected Profession + Sense Motive) / 4 | Reviewed blooded ruler                                  |
| Temple   | Knowledge (Religion) + Lead                                                                                                | Reviewed eligible divine first-level casting            |
| Source   | Knowledge (Arcana) + Knowledge (Nature)                                                                                    | Reviewed true-arcane / Source realm-magic qualification |

Half-ranks remain exact through the full rating; floor only for bracket lookup. Ratings ≤5, 6, 7, 8, 9, ≥10 yield 0%, 20%, 40%, 60%, 80%, 100%. Ability, equipment, feat and synergy bonuses are excluded. Sum all eligible `level × percentage` numerators and floor **once per domain**, then collect `min(Q, current S)`. Fragmentation changes neither result nor rounding.

Province RP preserves the existing legal-owner, unoccupied, uncontested entitlement; occupation does not award the occupier sovereignty RP. Holding RP uses independently owned, undestroyed, uncontested records. Province taxation/loyalty cash tests, ports, routes and virtual Guild cash do not add RP. Later political/suppression commands remain outside this increment.

Only the actual ruling character supplies RP skills and Temple/Source qualification. A mage lieutenant can qualify economic Source handling while the ruler remains ineligible for Source RP. One person cannot collect as rulers of multiple independent domains; duplicates are blocked. Frozen receipts prevent another collection after preview, reload or another transaction ID.

RP execution accepts exact paired **character/handler overlays1.1.0 or1.2.0**. Current1.2.0 supplies Spider's approved racial ledger; archived1.1.0 retains its original unknown Spider quote and validates its existing RP snapshots. Older1.0.0 payloads still load and retain cash forecasts without acquiring RP execution. Saved references never silently acquire newer qualifications. Missing/unreviewed data has explicit unknown outputs, not maximum ranks or invented zero-ranked sheets.

Spider remains reviewed Monster13, derived Azrai True95, with all ten verified Sierra spells and his separately approved virtual Guild handling. The subsequent [release1.2.0 racial ledger](BIRTHRIGHT_15_SPIDER_COMPLETION.md) resolves Province rating12/Law16 and5RP on his original opening assets, replacing the1.1.0 unknown quote. No Wizard ranks, Source RP or Temple RP follow from spell/handler permission. Gorgon, Rhuobhe and Chimaera retain effective Wizard16/15/13 and their unchanged allocation ledgers. The three approved sect doctrines and Reneava's reviewed AVA Cleric5 feed the existing divine gates. Reneava has no invented domain office. The six anonymous records remain unidentified and unqualified.

## Exact resources and saved derived bloodline

Original A is copied once into a separate exact current S during explicit initialization. Subsequent changes affect only that person's derived state. Derivation, grade, blood abilities, raw Sierra records and the older `realm.bloodlineStrength` field are not rewritten. Bloodlines use stable character IDs across ruler selections; resource accounts remain the existing domain accounts.

RP and derived scores use nonnegative BigInt quantities; money remains exact 1/120-GB units. Canonical decimal integer strings are used on the wire. No stored-RP headroom, 2S/5S/65,535/safe-integer ceiling, expiry, decay, automatic reset or overflow account exists. Starting RP is preserved even above S or any historical storage limit. No unbounded value is projected through Number.

`campaign.regency15` has its own `version: 1`, opening accounts/bloodlines/rulers, an ordered transaction journal and a materialized projection. The latter retains current S, streaks, qualifying boundary, yearly growth counts, reservations, receipts and any open boundary. Replay validates the projection and current RP/GB balances; it does not run gameplay or grant resources during load. Initialization never runs automatically when this optional section is missing.

Save/load rejects unsupported versions, malformed quantities, duplicate transaction IDs, inconsistent accounts/projections, incorrect original-score references, invalid snapshot formulas, mismatched current rulers and open boundaries for the wrong season. With actual overlay content supplied, frozen ratings and eligibility are checked against the pinned character sheets and reviewed authority. Existing separate overlay hash/version/scenario checks remain mandatory. Loading old saves neither inserts past receipts nor substitutes a current overlay.

## Scoped seasonal boundary and replay safety

1. Explicitly open the current RP boundary, freezing actual ruler/asset entitlements and recorded fixed fealty pledges. The first observed boundary is the current campaign turn; no past qualification is inferred.
2. Record each ordinary domain's one actual collection. Unknown skill data requires an explicit withholding acknowledgement and cannot receive a fabricated receipt. Actual collections are immediately available for subsequent authorized funding.
3. Reserve, commit and pay actual obligations; settle explicitly authorized pledges and any selected payroll allocation. A reservation is not income. Paid/released reservations cannot be paid again, and the same active/paid obligation cannot be booked twice.
4. Close after every frozen domain has a collection or an unknown withholding record. Compute growth qualification from actual remaining funds, reservations and unbooked known pledges. Execute only the supplied valid growth choices; persist the closed boundary once.

Closing this RP boundary does not close the full game's season. Later Maintenance orchestration must invoke it at the approved dependency point and advance the existing campaign schedule separately. Ruler replacement requires explicit synchronization outside a frozen boundary; it resets both affected characters' growth streaks, preserves their scores/yearly usage and never duplicates their identities or the domain's bank.

Transactions identify the actual source domain/actor, season, obligation and reservation. A transfer has one immutable counterparty and one conserved debit/credit amount. Same-boundary incoming RP cannot finance outgoing relays/circular promises. Incoming RP can pay local bills while an independently funded opening/collected reserve finances an outgoing pledge. Fixed imported fealty promises are visible; unfunded/unreserved portions do not count as free growth or new-obligation funds. They are not automatically executed, forgiven or subsidized.

## Growth and sacrifice

Growth from S to S+1 costs exactly S+1 RP. Qualification requires free reserve **greater** than that price, at least S+2, at two successive observed boundaries. An intervening failed boundary, growth, positive sacrifice or ruler replacement resets the streak. Growth is at most one point at a boundary and two points per character per campaign year, using `floor((seasonIndex−1)/4)`. No growth from zero is granted merely because saved RP exists.

The close request carries an explicit named authorization for each chosen growth: Basic `selected-policy`, Advanced `confirmation`, Expert `order`. All use the same prices and qualification. No choice means no growth even with a large bank and a completed streak. The interactive mode workflows remain Increment8 work.

Sacrifice is a separate explicit ruler authorization. Losing k points from S grants `k(2S−k+1)/2` RP and reduces current S by k in the same replay-safe operation. k cannot exceed S; zero is a harmless explicitly recorded no-op. Reaching S=0 stops ordinary collection while preserving stored RP. No distress, payroll failure or NPC condition calls sacrifice automatically. Growth then sacrifice yields zero RP profit and retains the used growth cadence. Bloodtheft, succession, heirs and grade/power recalculation are not implemented.

## Payroll and future Alchemy

Payroll reads the existing economic forecast's per-unit bills and applies NPC waivers first. Only explicitly known regular profiles can use RP; mercenaries, unknown profiles and waived costs cannot. Court, forts, taxes, infrastructure and magic have no RP-payroll path.

An explicit plan identifies each unit and its selected RP-funded money portion plus actual GB portion. For the combined RP-funded portion x, cost is **ceil(5x)** once per domain/season. Partial unit portions are exact in money units. One controlled plan is accepted per domain/season, so splitting calls cannot bypass the rounding boundary. It records covered units and debits only real RP and selected GB. It never credits spendable GB or invokes unpaid-unit consequences. Both existing banked RP and freshly collected uncommitted RP can fund the plan.

Forecasts expose actual covered payroll and selected-plan RP separately. Their `projectedClosingAfterRecordedPayroll` removes already covered payroll from future cash requirements; the original all-GB comparison fields remain available. A forecast is not an actual receipt/payment. Full Maintenance must consume the saved coverage/obligation identities instead of billing them again.

Future Alchemy can reserve arbitrary positive RP and the separate **1 GB fee** without using its own not-yet-produced output to fund the fee. Exact output is `RP × 120` money units. The generic payment primitive refuses to execute an Alchemy reservation. Known spell, true casting/Source access, opportunity and effect execution remain Increment6 requirements; Spider is not granted Alchemy.

## Frozen Increment4 opening quotes — overlays1.1.0

These accepted figures use the archived1.1.0 release. `scripts/report-anuire-regency15.mjs` now refuses to overwrite them from newer authored content. The current [Spider-only report](validation/spider-completion.json), reproduced with `node scripts/report-spider-completion15.mjs`, supplies the1.2.0 delta. No extraction, bulk character authoring, AI run, seasonal mutation or save write is required.

- [49-domain RP budget table](validation/increment4-regency.csv).
- [Exact category quotes, input hashes, funding scenarios and alternatives](validation/increment4-regency.json).

| Opening comparison                                            |              Result |
| ------------------------------------------------------------- | ------------------: |
| Original character records retained                           |                 116 |
| Ordinary default domain quotes                                |                  49 |
| Known RP quotes                                               |                  48 |
| Explicit unknown                                              | Spider / Spiderfell |
| Preserved ordinary opening RP bank                            |            2,456 RP |
| Skill-qualified whole RP before cap, known domains            |            1,067 RP |
| Certified seasonal RP after current-S caps                    |              907 RP |
| Spider conditional upper bound, **not credited**              |                5 RP |
| Payable regular-unit payroll eligible for optional RP funding |              259 GB |
| Cash reference mismatches against Increment3/finalization     |                   0 |

The funding scenarios use finite opening banks plus certified new RP and label unknown income separately. They spend resources rather than adding subsidies. Full use of those per-domain regular-payroll opportunities quotes 1,108 RP in the opening scenario; this is not an automatic policy or repeatable opening-bank grant.

| Supported context                  |                Certified new RP | Optional regular payroll coverage |     Funding cost | Cash net with that explicit scenario |
| ---------------------------------- | ------------------------------: | --------------------------------: | ---------------: | -----------------------------------: |
| Player-controlled Rhuobhe          |                               1 |                              5 GB |            25 RP |                             +14/3 GB |
| Player-controlled Spiderfell       | Unknown; no assumed new receipt |          1 GB from preserved bank |             5 RP |                                +3 GB |
| Caine actually selected for Endier |                              27 |                  See exact report | See exact report |                     See exact report |

NPC waiver cases have no waived payroll left to finance. Hermedhie and Eyeless One retain their existing recurring cash deficits; no Alchemy, sacrifice or other income was invented to remove them. Conditional Source commercial cash stays separate from Source RP. All five recovered research-input hashes remain unchanged. This table's authored-content hash and character/handler fingerprints identify its archived1.1.0 inputs.

**Current1.2.0 reconciliation:** Spider's new reviewed quote is5RP, so the arithmetic aggregate is **49 known quotes / 912 certified RP**, with1,072 qualified RP before caps. Opening banks and regular payroll bills are unchanged. Spiderfell NPC/player cash nets remain+3/+2GB before elective RP financing; his preserved bank50 projects55 after collection. This delta reruns only Spiderfell, not the full campaign. No receipt or growth is executed by reporting, and old1.1.0 saves retain their exact old quotes.

## Verification and next integration

Focused tests cover brackets/fractions, once-only rounding, fragmentation, ownership/occupation, reviewed ruling identity versus handlers, Temple/Source gates, the reviewed Spider ledger and archived unknown quote, current-S caps, unlimited reserves, exact reservations/commitments, conservation, blocked relays, explicit mode authorization, two-boundary development, interruptions/replacements, annual limits, sequential sacrifice/no-profit round trips, aggregate mixed payroll, fresh RP, exclusions, huge future-Alchemy reservations, malformed saves and general execution guards. Save/load tests include completed collections/payments, before/after growth/sacrifice and old1.1.0 Spider snapshots. Current results are recorded in the [implementation report](../BIRTHRIGHT_15_IMPLEMENTATION.md).

The subsequent [Increment5 implementation](BIRTHRIGHT_15_COURT_ACTIONS_IMPLEMENTATION.md) supplies scoped quantity-safe development orders, real action/actor opportunities and exact per-target reservations/payments. Its replay uses read-only prefixes of this same journal; it does not add an RP ledger or change these formulas. Increment6 still implements commercial/magic execution, Increment7 political commands, and Increment8 resumable full Maintenance/mode UI. No new rules questionnaire is needed. Spider's rank-dependent RP/Admin content gate is resolved in1.2.0; six unidentified records remain gated if later activated. The17 previously reproduced legacy fixture failures remain untouched for later M1B integration. **Birthright1.5 and M1B remain incomplete.**
