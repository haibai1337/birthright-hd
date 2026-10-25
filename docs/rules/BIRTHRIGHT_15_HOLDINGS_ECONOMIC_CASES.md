# Birthright 1.5 holdings: economic cases and exploit analysis

Research date: **2026-10-24**. Companion to the [main audit](BIRTHRIGHT_15_HOLDINGS_AUDIT.md) and [source register](BIRTHRIGHT_15_HOLDINGS_SOURCES.md). These are arithmetic and inspected-code examples, **not** implemented rules, a playtest, an AI tournament or a claim of final balance. All proposed safeguards require the user's rules decision.

## Method and scope

Current-PC expected collections below enumerate the distributions in `packages/core/economy.ts`, clamping each negative outcome to zero exactly as `expectedDice` does. They do not replace dice with the midpoint of a printed minimum/maximum range. Normalized comparison values use the explicit BRCS rate candidates. Snapshot source/hashes and PDF locators are in the source register. Private arithmetic output is `reference/research-cache/birthright15/analytical-examples.json`.

No gameplay command was executed. Opening-template examples read native campaign records without normalizing them. Unless stated otherwise, examples omit magic, claims, tribute, trade, ports, courts, units, forts and administrative expenses. A surplus below is not a complete faction budget. Fractions are exact expressions where possible; decimal displays are rounded only for readability.

## Case 1 — Province-sensitive income versus a normalized holding rate

| Province / holding | Current Guild or Temple expected GB | Normalized 2H/3 candidate | Direct Law H/3 candidate, if adopted as new revenue |
| ------------------ | ----------------------------------: | ------------------------: | --------------------------------------------------: |
| P1 / H1            |                                 1/3 |                       2/3 |                                                 1/3 |
| P2 / H2            |                                 1.5 |                       4/3 |                                                 2/3 |
| P4 / H1            |                                 1.5 |                       2/3 |                                                 1/3 |
| P4 / H4            |                                 3.5 |                       8/3 |                                                 4/3 |
| P6 / H6            |                                   6 |                         4 |                                                   2 |
| P7 / H7            |                                   7 |                      14/3 |                                                 7/3 |

These are **our calculations** from the named candidate formulas, not copied rulebook tables. The comparison shows why "modern income is higher" is not a valid general statement. A small frontier institution benefits from normalization; some developed institutions lose substantial cash. A P6/H6 institution would lose 2 GB/season before considering any changed maintenance burden. That is the upkeep of real military assets, not a cosmetic fraction.

At P1/H1 the current die is `max(0, d3 − 2)`: outcomes 0, 0, 1, mean 1/3. Using the printed range midpoint would incorrectly forecast 1/2. A tiny landless institution may have zero collection in two out of three seasons and need a reserve, sponsor or contract despite a positive mean.

**Decision relevance:** D01/J01. Compare annual cash and bankruptcy probability, not just one expected season. If income is normalized, choose whether it is net of administration before charging the old maintenance bill.

## Case 2 — The same control divided into records can produce more money

In P4, the current holding table gives:

- One Guild H4 record: expected **3.5 GB**.
- Four Guild H1 records: **4 × 1.5 = 6 GB**.
- Difference: **2.5 GB/season** despite identical total Guild levels.

The same table effect applies to Temple records. Historical nonlinear collection makes institutional fragmentation matter; that is not automatically a coding bug. The specific HD risk is accidentally rewarding **the same owner** because assimilation preserves several records instead of merging them. Ordinary `CreateHolding` rejects a duplicate active owner/type/province, so the four-record same-owner case is not available through that command alone. It is a transfer/provenance and collusion case to test.

For partial RP entitlement, separate rounding also matters: two priest-owned Law H1 records generate `ceil(1/2) + ceil(1/2) = 2 RP`, while consolidated Law H2 generates `ceil(2/2) = 1 RP`. Merely retaining identities can increase political power.

**Proposed safeguard:** retain every ID and raw source field, but aggregate owner/province/type before economic dice, RP rounding and claim caps. Decide separately whether genuinely independent competing owners should retain a diversification premium. If multiple player-controlled shell domains can split/transfer holdings freely, owner-level aggregation alone is insufficient; action costs, transfer rules and controller relationships must also be considered. No record should be deleted to make the totals look convenient.

## Case 3 — A one-click mixture can make Law disproportionately attractive

Consider P4, Guild H4 and Temple H4. Ignoring Law claims and expenses, the current moderate-tax expectation is 3.5 GB and each institution earns 3.5, for a combined **10.5 GB**.

A normalized candidate with P4, Law H4, Guild H4 and Temple H4 creates `4 + 4/3 + 8/3 + 8/3 = 32/3`, approximately **10.667 GB**, before its associated expense treatment. These comparable totals can hide a major redistribution: Law now receives a dependable stream, while Guild/Temple rates change. Add PC-style claims on top and the beneficiaries shift again. Add the old administration cost without accounting for net rates and the world pays twice for part of its bureaucracy.

Under the preferred **funded-service** proposal, an agreed Law payment is transferred from the already-collected provincial receipts. A 4/3 GB payment gives Law 4/3 and leaves the province's payer with 4/3 less; world money is unchanged. This is deliberately different from adding H/3 as new production. An internal allocation where the same ruler owns province and Law also cannot increase his combined treasury.

**Decision relevance:** D03/D04/J02. Record the payer, source income, priority and availability before adopting any Law stream. The value of loyalty protection, local opposition and recruitment support must be considered alongside cash.

## Case 4 — A claim's target level is not its actual cash production

Current HD's equal-level claim uses `floor(target level × 3/4)`, capped at 3 GB and actual remaining revenue. A Law H4 claim against a level-4 institution that actually produces 4 GB therefore takes **3 GB**; the target retains 1 GB.

E2 Table 18A's equal-level row for that cash band uses a random result with mean **1 GB**. The table's actual-receipts axis is economically important; it is not equivalent to multiplying the institution's level. This conditional example is an analytical comparison, not a complete reproduction of that table or a claim about Sierra's unknown retail implementation. See E2's table locator in the source register; OCR table layouts need image verification before coding.

If two separate Law records each qualify for a capped claim, their combined limit can exceed the intended per-regent allowance. Current HD avoids creating GB because each claimant draws from the remaining pool, but deterministic record order can still favor one claimant over another and starve the target.

**Proposed safeguard:** establish one aggregate eligible claimant per owner/province; reserve a bounded total claim pool; debit/credit simultaneously; use proportional shares or a separately agreed non-random priority. Predatory seizure is a separately limited action, not an invisible extra auto-claim. Never subtract the same claim from both provincial and institutional revenue when they are different streams.

## Case 5 — Zero-level guild versus genuine commercial capacity

Assume different terrain, a legal road/passage path, free endpoint route capacity and P6/P4 endpoints.

Current `tradeProblem` permits Guild H0 at the origin. `tradeIncome` yields `floor((6+4)/2) = 5 GB/season` to the route owner; a destination guild is not required. With the relevant thief class, that route can also supply 5 RP before collection caps. The initial commercial base has no positive Guild level and no normal holding income.

Under the bilateral-throughput comparison, actual endpoint guilds H4/H1 earn 2 GB and 0.5 GB respectively: **2.5 GB combined**, with no extra trade RP in the conservative candidate. The H1 partner's capacity limits how many routes can be supported; it is not just a name on a treaty. These are different economic packages, not two ways of rounding the same income.

**Advantages of the current model:** large markets and political route access are valuable quickly. **Risk:** a cheap contact becomes a province-scale cash/RP machine, and wealthy markets subsidize underdeveloped businesses. **Cost of the proposal:** merchant opening budgets may fall and trade diplomacy becomes more complex.

**Proposed safeguards:** positive uncontested endpoint Guilds; one bilateral route record; an explicit total payout and shares; capacity reserved at both endpoints; destruction/contest/owner transfer handled consistently. Do not give the full PC payout to both partners. Do not pay full route income again for every transit province or every road segment.

## Case 6 — Ports, sea routes and fleet reuse

Approved HD income at P3 is **3 GB for a seaport** or **1.5 GB for a river port**, irrespective of a new rule recommendation. Removing or halving that approved income is not authorized by this audit.

Adding a "parts unknown" route is not a reason to automatically pay the same provincial value again. The 1.5 design must identify whether additional income comes from a guild's commercial operation, the port authority's fees, shipping capacity or a new independent market. Any example that counts port receipts, full province-based trade, partner profit and ship trade receipts as four unrelated free revenues requires justification.

One vessel cannot provide its entire cargo capacity to two routes and also transport an army in the same interval. Nor should it earn an idle-port maintenance discount while doing those jobs. Road/bridge/naval upkeep and blockades must be included before declaring maritime trade underpowered or overpowered.

**Decision relevance:** D11/D12/J03. Current HD does not implement that complete naval economy; this case defines an audit requirement, not an existing exploit reproduction.

## Case 7 — Virtual guilds can remove the mage's intended financing constraint

A high Source can simultaneously contribute RP, provide realm-spell access and support a wide network. Add passive virtual-Guild cash outside normal Guild capacity, import strong trade returns, and let Alchemy convert cheaply: the mage can become a merchant without fighting for a merchant's economic slots.

For example, the inspected BRCS virtual-guild exception makes Source 7 act as Guild 3 for these purposes. Under its 2H/3 commercial rate, that means **2 GB/season** in addition to Source RP/access, with no reduction of the ordinary Guild pool. This is a comparison of that explicit exception, not a passive income already present in HD.

Current HD has **no virtual-guild cash**. It does have Alchemy at 1 RP per GB plus a 1 GB casting fee and an action, as recorded in the PC-help-based implementation. Converting 10 RP creates 10 GB but consumes 1 GB, leaving **9 GB net** before other costs and limits. Treating gross 10 as net 10 would already misstate the result. Repeated seasonal use still spends a scarce action and RP; it is not free income.

Keeping a small RP collection cap limits that conversion. Importing a larger BRCS-scale collection/reserve allowance without converting the imported bloodline scale can remove the limit. A treasury-to-RP conversion, pledge reward or source bonus that returns enough RP could then create a profitable loop.

**Proposed safeguards:** no passive virtual Guild in the initial candidate; explicitly priced patronage; one declared Alchemy rate/fee/frequency; separate collection/reserve scales; no circular conversion arbitrage. Evaluate wizard solvency with spells and patronage, not by demanding identical merchant GB. These are design cases; no infinite money loop is claimed to have been executed in HD.

## Case 8 — Free network growth needs a different expansion cost

Suppose a mage connects ten otherwise valid links and rarely casts remotely. A recurring upkeep candidate charges each period even when idle. A use-based distance candidate charges only remote spells, making a faraway military campaign more expensive than local defense. Taking **neither** cost leaves only initial establishment as the expansion restraint.

Current HD preserves three outgoing original slots and endpoint sources, but has neither a recurring ley charge nor the later BRCS per-cast distance surcharge. This is a disclosed rules gap, not proof of an original Sierra bug. Do not remove the endpoint/slot restriction while also ignoring the new system's distance cost.

**Proposed safeguard:** choose one transparent network operating cost and test the strongest connected Source, not the sum of Source levels. Preserve graph/owner identity and define endpoint contest/destruction and province-growth effects.

## Case 9 — Political suppression and cheap permanent destruction

Sierra-style two-success destruction can remove a large holding after two successful political attacks, independent of its original level. A permanent-damage model instead reduces levels each success. These create different counterplay windows and reconstruction bills.

A combined hybrid that suppresses all income/RP, immediately removes 1d3 levels and still permits total destruction on the second success is more destructive than either isolated model. Adding a cheap military operation that sets every foreign holding to zero can make both political systems irrelevant.

**Proposed safeguards:** one declared Contest outcome model, recoverable warning state, typed attacking influence, defended bids and separately priced sustained military suppression. Fortifications and special Source protection must be included in the comparison. Court actions and lieutenants must not permit limitless repeated attacks in the same round.

## Case 10 — Tax timing, cancellation and spell collection rights

Any staged-pillaging design must answer whether damage affects this collection, whether loot replaces or supplements taxes, when dice are committed and whether a choice can be undone. Otherwise: preview loot, collect normal taxes, enable pillage, reverse the choice after seeing the result, reload and repeat can become a free option on the RNG.

Current HD stores immutable actual income after Collect Taxes and disables staged pillage. Its immediate action-phase pillage is a separate existing order. The audit recommends retaining that distinction until the final calendar is chosen.

A related **code-traced risk** concerns short income spells: action-turn `expiresTurn = t+1`, followed by pre-Council removal at the boundary, can prevent the intended next Maintenance collection benefit. The correct reproduction must cast during Actions, finish the season, dismiss Council, collect, save/reload and verify the effect exactly once. Directly calling the economy helper before the boundary does not exercise this path. No fix or fresh reproduction is performed here.

## Case 11 — RP caps, rounding and vassal chains

If B=30 in the imported current HD scale, normal collection is at most 30 RP. Substituting a `2B` collection limit would allow 60 before other qualifications; a `5B` reserve would mean 150. This arithmetic illustrates why edition scales must be converted deliberately; it is not a valid direct conversion between their bloodline systems. Current new-reserve ceiling 65,535 is a technical compatibility policy with preserved older values, not a design endorsement of unlimited accumulated political power.

For pledged RP, debit the actual payer and cap the recipient. A→B and B→C pledges cannot use the same newly received points to create additional collection unless the chosen rules explicitly permit onward transfer and account for it. Current HD reserves against same-settlement re-forwarding; preserve conservation when comparing a native investiture obligation.

**Proposed safeguards:** aggregate fractional entitlement, explicit caps and scale, ordered reserved payments, no fake collection and no silent sacrifice of bloodline to fund a missing balance. Voluntary growth, emergency sacrifice, inheritance and usurpation are separate rules.

## Case 12 — Fortification upkeep and immunity must be priced together

Under a flat 1 GB per supported fort asset, a level-1 and a level-8 castle have the same support bill. Under a `2/3 GB × level` province-fort candidate, those bills are 2/3 and 16/3 GB. The latter greatly increases the recurring price of a major fortress. That comparison must include build cost, protection, siege duration and garrison benefit.

Adding broad fortified-holding seizure immunity to cheap flat upkeep can make the investment repay too quickly. Conversely, charging holding administration, fortification maintenance and an extra "double normal holding maintenance" from conflicting BRCS passages can overcharge it. The source register cites the publisher's unresolved contradiction. Do not claim a single uncontested rate.

## Case 13 — Real Anuire archetypes already have different economies

Read-only native-template example, excluding all omitted categories listed in Method:

| Realm   | Provinces                  | Law / Guild / Temple / Source levels | Starting GB after verified tenths conversion | Mean provincial tax | Mean Guild/Temple cash |
| ------- | -------------------------- | ------------------------------------ | -------------------------------------------: | ------------------: | ---------------------: |
| Endier  | One P6                     | 8 / 31 / 0 / 27                      |                                           15 |                 5.5 |                     29 |
| Ilien   | One P7                     | 7 / 0 / 0 / 14                       |                                           15 |                 6.5 |                      0 |
| Roesone | P3, P3, P4, P3, P3, P3, P2 | 9 / 0 / 0 / 0                        |                                           15 |                  18 |                      0 |

These are the recovered **realm records**, including institutions outside owned provinces; they are not a claim that each regent candidate personally receives every class-specific RP or spell benefit. Choice of Kalien/Caine or another candidate changes those class-dependent results. Imported excesses and raw identities are retained. Ports, roads, armies, courts, claims, initial settlement and NPC grants are excluded, so the table must not be used as the final playable budget.

The table illustrates why identical starting gold does not imply identical strategic potential. A rule that adds passive Source commerce benefits the mage and hybrid realm differently from a territorial ruler. A rule that cuts developed Guild collection changes Endier far more than Roesone. A new direct-Law stream changes them differently again.

**Required next analysis before mechanics selection:** complete once-only opening and mature ledgers for representative territorial, merchant, temple-only and source-only domains, with real expenses and chosen characters. Current source-only/holding-only player availability remains a distinct technical issue; do not unlock unsupported factions just to generate a comparison.

## Exploit checklist and proposed acceptance criteria

| Risk                                                | Current status                                                                             | Required invariant for a selected 1.5 specification                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Duplicate/fragmented holding cash or rounded RP     | Formula/transfer risk demonstrated arithmetically; ordinary Create duplicates are rejected | Equivalent owner control is independent of record count, unless explicitly priced |
| Multiple Law records multiplying caps               | Current claims iterate records                                                             | One bounded conserved claimant pool and explicit priority                         |
| Level-zero commercial engine                        | Explicitly permitted by current route validation                                           | Positive economic capacity before profit-generating routes                        |
| Double route ownership payout                       | Future bilateral-route integration risk                                                    | One route object and one declared combined payout                                 |
| Port/route/shipping triple count                    | Future sea-system design risk                                                              | Separate justified streams and exclusive fleet allocation                         |
| Virtual Guild outside capacity                      | Absent in current HD; cross-edition integration risk                                       | No unpriced passive economic layer                                                |
| Alchemy / RP / bloodline conversion loop            | Cross-system design risk; no executed infinite loop claimed                                | No profitable closed conversion cycle without limited consumed inputs/actions     |
| Unlimited remote magic                              | Current network omits two editions' alternative operating costs                            | Explicit access and expansion restraint                                           |
| Full suppression plus damage plus cheap destruction | Hybrid design risk                                                                         | One selected political damage model and separate military cost                    |
| Post-tax pillage reroll/cancel                      | Current staged control disabled                                                            | Immutable receipts, committed RNG and once-only damage/loot                       |
| Income magic expires too early                      | Current code-path risk, not fresh reproduced test                                          | Each promised collection benefit occurs exactly once                              |
| RP transfer chains / reserve overflow               | Current safeguards exist                                                                   | Equal debit/credit, capped receipt and no invented collection                     |
| Court/lieutenant action factories                   | Full lieutenant/court system absent                                                        | Bounded actor-aware throughput and shared resource checks                         |
| Auto-defaulting missing source/skill data           | Missing data exists                                                                        | Unknown remains unknown; no invented optimal ranks                                |
| Conquest deleting independent domains               | Current asset-survival policy protects them                                                | Sovereignty, military control, institution ownership and survival stay distinct   |
| New rules rewriting existing balances               | Prospective rules decision only                                                            | Explicit version/migration plan; no retroactive rescaling or double settlement    |

These criteria are research recommendations. They define what later tests should establish after rules selection. Passing current tests cannot validate unimplemented candidate economics, and no new tests or gameplay modifications are authorized by this document.
