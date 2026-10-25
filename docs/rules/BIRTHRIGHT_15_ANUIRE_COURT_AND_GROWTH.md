# Birthright 1.5 — Courts, actions and economic development

Date: **2026-10-24**. Research only. Companion to the [campaign-wide accounts](BIRTHRIGHT_15_ANUIRE_ECONOMIC_VALIDATION.md). J01–J08 remain fixed; every parameter recommendation below still needs approval.

## The court-level-4 ambiguity is inherited

B30 printed p. 91 and B35 ch. 5 PDF p. 4 both print Average **3–4**, granting one court action/round, and Good **4–5**, granting two. The publisher-hosted [components transcription](https://birthright.net/wiki/index.php/BRCS%3AChapter_five/Ruling_a_domain/Components_of_a_domain) repeats the overlap. It therefore predates the recent v1.1 formatting reconstruction. No inspected authoritative correction resolves it. A failed retrieval of the errata page is not evidence that no correction exists anywhere.

Recommend **level 4 grants one; level 5 grants two**, explicitly labeled a 1.5 correction. That preserves the 3–4 interval and charges another GB for the stronger bracket. The alternative giving level 4 two is evaluated quantitatively, rather than described as a verified historical rule.

| BRCS court level |                    Extra court actions/round | Extra opportunities/season | Court GB/season |
| ---------------- | -------------------------------------------: | -------------------------: | --------------: |
| 0                | 0; regent personally handles domain business |                          0 |               0 |
| 1–2              |                                            0 |                          0 |             1–2 |
| 3                |                                            1 |                          3 |               3 |
| 4                |                         **1 or 2: disputed** |                 **3 or 6** |               4 |
| 5                |                                            2 |                          6 |               5 |
| 6–7              |                                            3 |                          9 |             6–7 |
| 8–9              |                                            4 |                         12 |             8–9 |
| 10+              |                                            5 |                         15 |             10+ |

These are **court actions**, not arbitrary additional standard or personal actions. Normally each round has one standard plus one character action, or one full action using both. Realm-wide Rule/Contest/Agitate extensions use court capacity, charge each target separately, and obey their scope restrictions. Source spellcasting/Alchemy must not become a court-action factory. Lieutenant delegation supplies an actor, not an unlimited second domain.

Sierra/HD instead has five court tiers: None/Minimal/Acceptable/Average/Opulent, costing **0/1/3/6/9 GB**, with diplomacy effects. The native opening data sets **all 51 courts to tier 1**, costing 1 GB in HD. That is not proof that the old integer has the same meaning as a BRCS level, nor that Sierra's 6/10/18 visible action menus were extra monthly action budgets. Retain raw court records; select an overlay mapping. Source: CD help §§097/099/167; existing Maintenance investigation and `COURTS` table.

## Progression and physical capacity have real costs

B35 ch. 5 p. 4 increases court size by at most **one level/season** through Decree. Decree is a court action costing **1 GB** (p. 17); a small court can use its standard action instead. From court 1 to 3 therefore needs at least **two seasons, two Decrees and 5 GB of incremental progression spending** if the new level is charged for that season: +1/+2 upkeep plus two fees. To court 10 takes at least nine seasons and 54 GB incremental progression spending under the same timing. These costs do not include a palace, bids, normal court-1 upkeep or unrelated development. The precise effective-date convention is still a calendar choice.

A court is normally limited by its seat province, with palace support potentially raising the limit. Palaces cost **6 GB/level** to build and **1/2 GB/level/season** to maintain (Table 5-4). The components prose also discusses effective court benefits from a funded palace; implementation must choose one interpretation rather than adding the same palace level twice to capacity and paid throughput. No original palace levels, complete court-seat permissions or construction schedules are recovered in the opening sidecars.

The research therefore records a **minimum palace requirement** using the highest-level province where a domain owns land or a positive holding. That is a cost lower bound, not a recovered seat or permission. Palace capital/upkeep is included in developed growth cases; permission and Build timing remain unresolved. High courts are not granted instant free palaces. All developed-court cases disclose earlier progression costs separately from their sampled mature-season spending.

## Administrate is a separate candidate

B35 ch. 1 PDF pp. 22–24 supplies the [primary skill rules](https://forum.birthright.net/uploads/short-url/A2p8Enx1s0qMjoOB9vaSyDAtL8o.pdf): maintenance reduction 25%, with rounding down, DC 10 + base maintenance; qualifying standard actions costing at least 2 GB can save 1 GB at DC 20 − planned cost. Failure by 10 can penalize the domain check. It does **not** make 1-GB Rule actions free.

The [98 conditional calculations](validation/administrate-candidates.csv) compare a narrow forts-only cost base with all separately paid expenses. No actor ranks/check success are assumed. Large-domain DCs may exceed an ordinary character's maximum possible result, so a conditional saving is not necessarily attainable. Under the broad interpretation, a successful check saves 3 GB for Rhuobhe and Spiderfell but leaves reference deficits of **6** and **6.167 GB**. The two zero-income mages' 1-GB court costs round to no saving. Thus Administrate is neither a universal budget rescue nor a substitute for choosing expense rules. Embedded ordinary administration cannot be discounted/refunded a second time. Recommend a defined non-income-infrastructure base after ranks exist; specialists, retries, stacking and event use need bounded actor rules.

## Actual holding-growth experiments

The [343 cases](validation/growth-cases.csv) cover every ordinary active faction at courts 1/3/4-low/4-high/5/6/10. They use original existing holding contacts, aggregate capacity, grandfathered original records, positive-owner limits and Source-caster screening. There are **197 capacity-eligible owner/province/type opportunities**, including zero-cash Source steps; cash-oriented batches use only currently profitable steps. No holdings are changed in a campaign.

Candidate B30/B35 Rule costs **1 GB/attempt**, DC **10+current H**. Crucially, the ruling holding **does not add its own level** to the check (B35 ch. 5 p. 21). Other typed support/opposition and RP bids remain possible. With no such modifiers, success probability is (11−H)/20 within the tested levels. This is an analytical condition, not a fabricated character skill value. Higher Sources, for example, cannot be ruled automatically merely by adding themselves to the roll.

Each hypothetical season has three standard batches. Additional targets use court slots, remain the same holding type in different provinces under one host sovereignty, and pay separately. Each existing aggregate is attempted at most once per case. Available opening cash and ordinary obligations bound funded attempts; extra palace capital is deducted. No new Create contacts, Province Rule, repeated retries, RP bids, trade returns or attacks are added to this particular experiment. It is not a maximum-growth solver or a forecast of what every ruler will choose.

| Court / level-4 reading | Extra per round | Funded attempts across 49 cases | Perfect-success additional GB/season | Zero-modifier expected additional GB/season | Minimum palace capital across cases |
| ----------------------- | --------------: | ------------------------------: | -----------------------------------: | ------------------------------------------: | ----------------------------------: |
| 1                       |               0 |                              93 |                               52.667 |                                      24.667 |                                   0 |
| 3                       |               1 |                             132 |                                   71 |                                       32.75 |                                   6 |
| 4 lower                 |               1 |                             132 |                                   71 |                                       32.75 |                                  30 |
| 4 upper                 |               2 |                             147 |                               76.667 |                                       35.15 |                                  30 |
| 5                       |               2 |                             145 |                               75.667 |                                      34.783 |                                 102 |
| 6                       |               3 |                             146 |                                   76 |                                      34.917 |                                 240 |
| 10                      |               5 |                              47 |                               22.667 |                                      10.433 |                                1176 |

Upgrading **every** faction from court 1 to 3 would cost 98 extra GB/season before palace upkeep, while this case's aggregate zero-modifier ordinary income increase over court 1 is only **8.083 GB/season**. Even perfect success gives an 18.333-GB increase, before 39 additional GB of Rule attempts and earlier progression costs. Therefore universal high courts are not self-financing from the tested ordinary growth. Raising the level-4 bracket adds 15 funded attempts, 2.4 expected GB or 5.667 perfect-success GB across the campaign in this sample. It changes strategy but does not create unbounded cash by itself.

The court-10 result is lower because minimum palace requirements and the unchanged 15-GB opening treasury leave many illustrative developed cases unable to finance the same year's palace capital. This is a funding constraint, not evidence that a mature wealthy court 10 is weaker than court 6. A later accumulated treasury could finance it; that trajectory and repeated attempts are outside this bounded comparison.

**Assessment:** no automatic economic explosion is demonstrated when court upkeep, target costs, capacity and action scope are honored. Cheap growth is still sensitive to RP bids, new contacts, repeat attempts, trade multipliers and multi-target two-stage Contest. Unlimited personal/court casting, free extra targets or omission of court/palace progression would invalidate this result. Province Rule's evidenced once-per-season attempt limit, current-P GB cost and exclusion of RP bidding must be considered with any holding-growth package; they are not silently adopted by the calculator.

## Trade contracts and infrastructure

All 171 recovered Guild route-field records have zero links: **opening route income is zero**. The [154 route candidates](validation/trade-candidates.csv) are independent hypothetical pairs with positive real Guilds, mutually adjacent provinces and different terrain. They are not an accepted portfolio: consent, endpoint capacity, roads, bridges, construction time and spending may conflict across rows. No virtual-only endpoint enters the list and no trade RP is added.

An actual-data example is Southern Anuire Shipping's **Guild 3 in Abbatuor**, paired with Port of Call Exchange's **Guild 7 in Ilien**. Candidate endpoint shares are **1.5 and 3.5 GB**, totaling 5. Hypothetical forest/plains highways cost **4+2 GB**, route creation **1 GB**, and road upkeep **1/2 GB/season**. The joint surplus before contractual tribute is **4.5 GB**, implying about **1.56 seasons** to repay 7 GB capital under uninterrupted operation. Any bridge, defense, partner charge or lost service increases that figure. Province rulers must approve and finance/contract the roads; a merchant does not receive their infrastructure for free.

The Guild 3 is in a province 3 with no spare Guild capacity. Growing it to 4 and unlocking a second route cannot be assumed free: it needs provincial capacity development/cooperation first. That development costs actions and provincial GB, may reduce Source potential, and must not retroactively increase the original records. Existing endpoint-capacity candidates are one route at Guild 1–3, two at 4–6 and three at 7+; a canonical contract reserves both sides and pays each share once. A ship cannot simultaneously supply unlimited routes and army transport. Sea shipping remains uncosted unless an actual vessel/contract is documented; sea-route profits are not inserted into opening budgets.

This is a more consequential expansion incentive than the ordinary +2/3 GB of one Guild level. It warrants explicit route capacity, non-duplication, counterparty revocation and separate transport obligations, not a reversal of J03.

## Source growth and the two zero-income mages

The [17 Source paths](validation/source-development.csv) use existing original Sources and unclaimed capacity, without displacement. Two important paths are:

| Domain and existing Source                                       | Cash-supporting target | Minimum successful Rules / GB | Expected attempts at zero other modifiers | New seasonal virtual cash |
| ---------------------------------------------------------------- | ---------------------- | ----------------------------: | ----------------------------------------: | ------------------------: |
| Hermedhie: Bliene H4, potential 6, no rival Source levels        | H6                     |                         2 / 2 |                                     6.190 |                  1.333 GB |
| Eyeless One: Floodspaeth H1, potential 6, no rival Source levels | H6                     |                         5 / 5 |                                    12.913 |                  1.333 GB |
| Eyeless One: Doom's Peak H2, potential 6, rival owns 1           | H5                     |                         3 / 3 |                                     7.579 |                  0.667 GB |

H5 alone does not cover court 1; H6 does, before spell spending. Ranks/RP bids could change these probabilities, but cannot be supplied as convenient assumptions. These are minimum-success/expected-action costs, not guaranteed budgets: failures consume GB and time.

An [exact eight-season probability experiment](validation/mage-funding-experiment.csv) follows the first two paths with no RP bids, Alchemy, patronage, opposition or other spending. It aggressively attempts each available round until H6, then collects once at season end. Court 0 pays a 1-GB Decree and uses the first action. A negative court-payment balance is recorded as a **funding failure**, without deleting a domain or changing assets. This is not Basic's required allocation algorithm and is not an optimal survival strategy.

| Domain / chosen court | H6 reached by season 8 | Court-funding failure by season 8 | Still funded, incomplete |
| --------------------- | ---------------------: | --------------------------------: | -----------------------: |
| Hermedhie / 1         |                94.767% |                            5.233% |                       0% |
| Hermedhie / 0         |                98.721% |                                0% |                   1.279% |
| Eyeless One / 1       |                53.597% |                           46.403% |                       0% |
| Eyeless One / 0       |                80.066% |                                0% |                  19.934% |

The zero-court case can wait indefinitely at zero cash, rather than pay a recurring deficit. It does not make failed Rules or realm magic free. The experiment establishes a genuine funding risk for an aggressive court-1 plan; it does not prove a necessary bankruptcy, a guaranteed optimal path or a failure of Basic automation. J07/J08 require visible alternatives and the same resources: automatic affordable choices in Basic, guided confirmation in Advanced, manual choice in Expert.

For Alchemy, the existing 1 RP → 1 GB rate and 1-GB casting fee turn a 10-RP cast into **9 net GB**, paid for by RP and a casting opportunity. Future skill/cap packages may make that a much stronger funding channel than virtual cash. No RP income is assumed in the opening ledger. Use a shared standard/casting budget, explicit collection boundaries and conserved transfers. An RP-funded investment that earns later income is ordinary development; a same-boundary duplicated conversion/pledge or free-actor loop is not.
