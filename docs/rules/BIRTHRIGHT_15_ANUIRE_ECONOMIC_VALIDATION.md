# Birthright 1.5 — Complete Anuire economic validation

Date: **2026-10-24**. **Research only. J01–J08 remain binding.** Follows the [v0.1 reconciliation](BIRTHRIGHT_15_RULES_SPEC_V0_1_RECONCILIATION.md). No rules, original records, saves or UI were changed.

**Result: the selected income system funds the modeled first season of all 49 ordinary active factions, but does not yet establish a sustainable economy for every faction.** With BRCS active-payroll pricing applied to Sierra muster values, a court costing 1 GB and the conservative province-fort rate, four factions have recurring deficits. Original treasuries cover the opening deficit; they do not cure it. Skill-based RP and several cost/entitlement choices remain uncertified. This is a completed campaign-wide accounting study with explicit limits, not approval to implement its reference parameters.

The [remaining decisions](BIRTHRIGHT_15_ANUIRE_ECONOMIC_DECISIONS.md) provide A/B/C/D alternatives. Detailed [character research](BIRTHRIGHT_15_ANUIRE_CHARACTER_CONVERSION.md), [court/development analysis](BIRTHRIGHT_15_ANUIRE_COURT_AND_GROWTH.md) and [calculation guide](validation/README.md) accompany this report.

## Coverage and method

The existing Anuire loader reads the retained campaign, economy, magic and strategy sidecars. The calculator calls the current HD initializer and **read-only forecasts** on isolated in-memory states. It never calls `applyCommand`, season settlement, save loading/writing or an importer. Aerenwe is the HD comparison's initial player; a second column shows each ordinary faction's hypothetical controlled cost view, exposing NPC payroll exceptions without changing availability flags. No events, AI orders, treasury fallback or dice rolls run. HD figures are forecasts, not actual settled receipts or a retail Sierra certification.

| Coverage                         | Count / finding                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Original domains                 | 51; **49 ordinary active**, including **17 holding-only**                                                      |
| Separate roles                   | Mieres: inactive/passive; Chaos: MONSTERS event controller                                                     |
| Provinces                        | 206, including all original ownership and levels                                                               |
| Holdings                         | 766; no duplicate owner/province/type groups in the opening template                                           |
| Fortifications                   | 39, totaling 165 levels; 36 castle records and 3 wizard towers                                                 |
| Military / character deployments | 234 / 63; all retained separately                                                                              |
| Regents                          | 116 records; 110 identified, 6 generic unknown identities                                                      |
| Ports                            | 11 seaports and 8 river ports; approved income retained                                                        |
| Opening commitments              | All 51 native courts are tier 1; no encoded Guild routes, recorded tributes, occupations or contested holdings |
| Choices covered                  | 36 Classic and 63 expanded-access candidates; 80 ruler/domain combinations including holding-only defaults     |

All 51 records appear in the [opening ledger](validation/opening-domains.csv). The [asset ledger](validation/opening-assets.csv) retains every original holding ID, province, fort and deployment. Inactive/controller rows show potential ordinary arithmetic separately; they are **not** assigned an ordinary tax/payroll policy or counted as failed ordinary factions. Mieres' mechanically computed court bill is not evidence that an inactive record owes it.

## Parameter sheet: what is fixed and what is conditional

All variants keep Province P, Law H/3, Guild/Temple 2H/3, Source-derived virtual cash 2×max(H−4,0)/3 and approved port receipts. Ordinary administration is already net; **no legacy count-based administration bill** is added. No automatic Law Claims, extra trade RP, new grants or invented contracts enter the 1.5 ledger. Cash is aggregated by owner/province/type, preserving source IDs.

| Parameter                                  | Reference calculation                                            | Explicit alternatives / limits                                                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Taxes                                      | P GB, optional modifier zero                                     | No silent use of PC tax grades or a new optional taxation variant.                                                                                          |
| Virtual beneficiary                        | Cash follows preserved Source ownership                          | Wizard-regent-only sensitivity removes 10 GB across four default rulers; actor eligibility remains a choice.                                                |
| Court                                      | 1 GB, matching every native opening tier's existing spending     | Largest non-Source holding level as historical expectation; zero for source-only domains in that scenario. Not a compulsory starting court conversion.      |
| Military                                   | Half of each Sierra profile's muster value                       | Native payroll; quarter muster as an **all-garrison lower bound**. Original home provinces are not recovered, so the discount is not asserted to apply.     |
| Forts                                      | 2/3 GB per level for all 39, a conservative classification bound | Three wizard towers at 1/3 instead; or native flat 1 GB/asset. Tower-to-holding mapping is not proven.                                                      |
| Ports                                      | Approved income; no additional separate fee in reference         | Extra 1/2 GB per seaport, totaling 5.5 GB; no invented river-port maintenance rate. Whether this double-charges an income-producing port requires judgment. |
| Routes / tribute / salaries / action spend | Zero **recorded or committed opening amounts**                   | No claim that services, roads, fleets or later commitments are costless. Their missing data stay flagged.                                                   |
| Administrate / RP payroll / Alchemy        | No income or discount assumed                                    | Separate candidate calculations; no missing ranks or automatic RP-to-GB subsidy inserted.                                                                   |

The reference military calculation is a formula transfer, **not a complete BRCS unit conversion**. Four non-recruitable Spiderfell monster units have Sierra price values but no established BRCS muster valuation. Their active-payroll result is provisional. Rhuobhe's four units are ordinary recruitable profiles; its deficit does not rely on that monster-price gap.

Primary rules: B30 pp. 95–97, Tables 5-9–11; B35 ch. 5 PDF pp. 7–10; Table 5-4 at pp. 3–4. Version and source qualifications remain in the [source register](BIRTHRIGHT_15_HOLDINGS_SOURCES.md). Fortification prose at B30 p. 121 says to double ordinary maintenance, which conflicts with net collections and the explicit construction table; it does not supply an additional bill to stack on top.

## Opening accounts across the campaign

Amounts are GB/season. The detailed CSV includes opening treasury/RP, all income heads, military alternatives, fort/court bills, known zero commitments, HD components and missing-data flags. Here **M/F/C** are the reference military, fort and court expenses. Closing = opening + income − M − F − C, without default, asset deletion or treasury clamping. Negative analytical balances remain signed; they are not written to a save. HD net is the existing forecast in the initial-player/NPC context; use the CSV's controlled comparison when isolating payroll policy.

| Domain                  | Role        | Opening |  Income |       M / F / C |    Net | Closing | HD net |
| ----------------------- | ----------- | ------: | ------: | --------------: | -----: | ------: | -----: |
| 01 Aerenwe              | territorial |      15 |  29.667 |     2.5 / 4 / 1 | 22.167 |  37.167 |   13.5 |
| 02 Alamie               | territorial |      15 |    27.5 |  14 / 4.667 / 1 |  7.833 |  22.833 |    3.5 |
| 03 Anuire               | territorial |      15 |      21 |   5 / 4.667 / 1 | 10.333 |  25.333 |     15 |
| 04 Avanil               | territorial |      15 | 122.667 |      38 / 4 / 1 | 79.667 |  94.667 | 60.667 |
| 05 Baruk-Azhik          | territorial |      15 |  45.333 |  16 / 4.667 / 1 | 23.667 |  38.667 |     21 |
| 06 Boeruine             | territorial |      15 |      75 |  31 / 7.333 / 1 | 35.667 |  50.667 |   24.5 |
| 07 Brosengae            | territorial |      15 |      36 |   3 / 2.667 / 1 | 29.333 |  44.333 |     32 |
| 08 Cariele              | territorial |      15 |      45 | 3.5 / 3.333 / 1 | 37.167 |  52.167 | 32.167 |
| 09 Chimaeron            | territorial |      15 |      25 |     4.5 / 0 / 1 |   19.5 |    34.5 |  5.167 |
| 10 Coeranys             | territorial |      15 |  46.333 |   4 / 2.667 / 1 | 38.667 |  53.667 |   34.5 |
| 11 Dhoesone             | territorial |      15 |  34.333 |  15 / 2.667 / 1 | 15.667 |  30.667 | 10.833 |
| 12 Diemed               | territorial |      15 |      33 |  10 / 2.667 / 1 | 19.333 |  34.333 |   10.5 |
| 13 Elinie               | territorial |      15 |  23.667 |   9 / 3.333 / 1 | 10.333 |  25.333 |      4 |
| 14 Endier               | territorial |      15 |      35 |   3 / 0.667 / 1 | 30.333 |  45.333 |   29.5 |
| 15 Five Peaks           | territorial |      15 |      21 |   0 / 2.667 / 1 | 17.333 |  32.333 |   13.5 |
| 16 Ghoere               | territorial |      15 |  87.167 |  36 / 3.333 / 1 | 46.833 |  61.833 |     44 |
| 17 Gorgon's Crown       | territorial |      15 |  78.667 |  49 / 4.667 / 1 |     24 |      39 | 35.333 |
| 18 Ilien                | territorial |      15 |  16.333 |   2 / 4.667 / 1 |  8.667 |  23.667 |    9.5 |
| 19 Markazor             | territorial |      15 |  24.333 |   0 / 2.667 / 1 | 20.667 |  35.667 |   14.5 |
| 20 Medoere              | territorial |      15 |      20 |       5 / 2 / 1 |     12 |      27 |     10 |
| 21 Mhoried              | territorial |      15 |  59.167 |      25 / 4 / 1 | 29.167 |  44.167 |   17.5 |
| 22 Mieres               | inactive*   |       0 |       0 |       0 / 0 / 1 |     -1 |      -1 |    N/A |
| 23 Chaos                | special*    |      15 |       0 |       0 / 0 / 1 |     -1 |      14 |    N/A |
| 24 Mur-Kilad            | territorial |      15 |       9 |   0 / 5.333 / 1 |  2.667 |  17.667 |      3 |
| 25 Osoerde              | territorial |      15 |  24.333 |   5 / 2.667 / 1 | 15.667 |  30.667 |    7.5 |
| 26 Rhuobhe              | territorial |      15 |   6.667 |  10 / 4.667 / 1 |     -9 |       6 |      0 |
| 27 Roesone              | territorial |      15 |      27 |      11 / 2 / 1 |     13 |      28 |      6 |
| 28 Sielwode             | territorial |      15 |  46.667 |  16 / 6.667 / 1 |     23 |      38 |   10.5 |
| 29 Spiderfell           | territorial |      15 |       5 | 8.5 / 4.667 / 1 | -9.167 |   5.833 |    2.5 |
| 30 Taeghas              | territorial |      15 |      31 |       3 / 2 / 1 |     25 |      40 |   16.5 |
| 31 Talinie              | territorial |      15 |  46.833 |       8 / 2 / 1 | 35.833 |  50.833 |   34.5 |
| 32 Thurazor             | territorial |      15 |  22.667 | 6.5 / 1.333 / 1 | 13.833 |  28.833 |      2 |
| 33 Tuarhievel           | territorial |      15 |  34.333 |      26 / 4 / 1 |  3.333 |  18.333 |      4 |
| 34 Tuornen              | territorial |      15 |  29.833 |   8 / 3.333 / 1 |   17.5 |    32.5 |     13 |
| 35 N. Import and Export | holding     |      15 |  11.333 |       0 / 0 / 1 | 10.333 |  25.333 | 11.333 |
| 36 Impregnable Heart    | holding     |      15 |  16.667 |       0 / 0 / 1 | 15.667 |  30.667 |   19.5 |
| 37 S. Anuire Shipping   | holding     |      15 |   8.667 |       0 / 0 / 1 |  7.667 |  22.667 |    9.5 |
| 38 High Mage Aelies     | holding     |      15 |   1.333 |       0 / 0 / 1 |  0.333 |  15.333 |     -1 |
| 39 Port of Call Exchg.  | holding     |      15 |  16.667 |       0 / 0 / 1 | 15.667 |  30.667 |   20.5 |
| 40 Orth. Imp. Temple    | holding     |      15 |  15.333 |       0 / 0 / 1 | 14.333 |  29.333 |   17.5 |
| 41 Wizard Hermedhie     | holding     |      15 |       0 |       0 / 0 / 1 |     -1 |      14 |     -1 |
| 42 Jewel of Sarimie     | holding     |      15 |  18.667 |       0 / 0 / 1 | 17.667 |  32.667 | 22.833 |
| 43 Temple of Cuiraecen  | holding     |      15 |  13.333 |       0 / 0 / 1 | 12.333 |  27.333 |   15.5 |
| 44 Upper Anuire Traders | holding     |      15 |  15.333 |       0 / 0 / 1 | 14.333 |  29.333 | 15.167 |
| 45 Haelyn's Aegis       | holding     |      15 |  22.333 |       0 / 0 / 1 | 21.333 |  36.333 |     26 |
| 46 Militant Order       | holding     |      15 |  29.333 |       0 / 0 / 1 | 28.333 |  43.333 |   34.5 |
| 47 Points East Trading  | holding     |      15 |      18 |       0 / 0 / 1 |     17 |      32 |     19 |
| 48 Second Swamp Mage    | holding     |      15 |       2 |       0 / 0 / 1 |      1 |      16 |     -1 |
| 49 N. Reformed Church   | holding     |      15 |  14.667 |       0 / 0 / 1 | 13.667 |  28.667 |   13.5 |
| 50 Wizard Eyeless One   | holding     |      15 |       0 |       0 / 0 / 1 |     -1 |      14 |     -1 |
| 51 Ruarch Rockhammer    | holding     |      15 |      16 |       0 / 0 / 1 |     15 |      30 |     17 |

For Mieres/Chaos, the displayed arithmetic is **potential ordinary accounting only**; their current scheduler roles govern actual application. The ordinary-faction world totals below exclude both.

| Ordinary-faction world ledger                    | Current HD | 1.5 reference |
| ------------------------------------------------ | ---------: | ------------: |
| Province receipts                                |    561.833 |       620.000 |
| Law production                                   |      0.000 |       167.000 |
| Guild + Temple receipts                          |    666.167 |       510.667 |
| Source virtual cash                              |      0.000 |        46.000 |
| Ports                                            |     65.500 |        65.500 |
| Total production                                 |  1,293.500 |     1,409.167 |
| Separate administration                          |    156.000 |         0.000 |
| Military, all factions at controlled/native cost |    325.000 |       377.500 |
| Forts                                            |     39.000 |       110.000 |
| Courts                                           |     49.000 |        49.000 |
| Net with those complete cost views               |    724.500 |       872.667 |

The current mixed player/NPC forecast instead nets **778.500 GB** because Gorgon's Crown, Rhuobhe and Spiderfell receive 54 GB of combined payroll exemptions in that context. The 1.5 comparison does not invent those exemptions as income. The current RP/cash fallback and small cash floor occur later than the forecast and are explicitly excluded. Ordinary Law production and virtual cash increase production, while normalized Guild/Temple receipts decrease it; the net improvement also depends heavily on removing the old administration charge.

## Negative budgets, funding requirements and holding-only factions

| Faction            | Reference recurring net | Closing first season | First unfunded unchanged season | Net with native payroll, same forts/court |
| ------------------ | ----------------------: | -------------------: | ------------------------------: | ----------------------------------------: |
| Rhuobhe            |                  −9.000 |                6.000 |                               2 |                                    −4.000 |
| Spiderfell         |                  −9.167 |                5.833 |                               2 |                                    −1.667 |
| Wizard Hermedhie   |                  −1.000 |               14.000 |                              16 |                                    −1.000 |
| Wizard Eyeless One |                  −1.000 |               14.000 |                              16 |                                    −1.000 |

Reference recurring funding needed by those four is **20.167 GB/season**, not a proposed payment. With native payroll it falls to **7.667 GB**. First-season external funding required is zero in both cases because these factions each start with 15 GB. The second unchanged reference season leaves Rhuobhe 3 GB short and Spiderfell 3.333 GB short. These are budget gaps, not authorized automatic bankruptcy/elimination outcomes.

Fifteen of the seventeen holding-only domains have positive recurring reference cash; the two exceptions are the mages above. Merchants and temples have no recovered opening military or fort bills; their multiple holdings generally finance court 1 without a subsidy. **There is no independent Law-only domain in this template**, so claims about its viability require a labeled synthetic institutional case, not an invented 52nd faction. The smallest mage surplus is Aelies at **1/3 GB**; the Second Swamp Mage earns **1 GB** after court. Neither has a large discretionary magic budget from cash alone.

Court 0 is a historically available personal-management candidate, not a mode bonus. It removes the two zero-income mages' recurring court deficit while sacrificing delegated court capacity and requiring an explicit Decree if changed after opening. It does not fund their spells or establish their RP ranks. Alternatively, genuine paid magical services, existing Alchemy or lawful Source development could finance them; no patronage income is booked without a payer and agreement.

## Sensitivity and stress results

There are **36 cost combinations and 1,836 domain ledgers**, all preserving selected collections. [Summary](validation/sensitivity-summary.csv); [every faction/case](validation/sensitivity-domains.csv).

| Military / court / fort policy, no extra port fee         | Total ordinary net | Recurring-deficit factions | Unfunded first-season factions |
| --------------------------------------------------------- | -----------------: | -------------------------: | -----------------------------: |
| Native / opening 1 / 2/3 per fort level                   |            925.167 |                          4 |                              0 |
| Half muster / opening 1 / 2/3 per level                   |            872.667 |                          4 |                              0 |
| Quarter muster for every unit / opening 1 / 2/3 per level |          1,061.417 |                          4 |                              0 |
| Native / largest non-Source holding / 2/3 per level       |            794.167 |                          2 |                              0 |
| Half muster / largest non-Source holding / 2/3 per level  |            741.667 |                          3 |                              0 |

The expected-court case reduces source-only courts to zero and raises others: total court expense becomes **180 GB**, so a smaller deficit count does not imply a richer world. The three wizard towers change the total fort bill by only **1 GB** between the two table classifications. The possible seaport fee costs **5.5 GB**. Military valuation and court policy have much larger effects.

The [245 faction stress cases](validation/stress-cases.csv) cover blockade, loss of the largest owned province, suppression of the largest income-producing institution, a 4 GB capital + 3 GB recurring cost shock, and the wizard-regent cash gate. The cost shock is equivalent to two Infantry musters/payroll plus one occupation bill; **it is fiscal analysis, not a claim every faction can legally muster those units or occupy a province**. It makes the already-poor Rhuobhe and Spiderfell first-season funding gaps 1 and 1.167 GB. Other tested single shocks leave opening liquidity nonnegative. This does not cover arbitrary combined wars or guarantee optimal behavior.

Suppression removes the chosen institution's receipts, not title to unrelated holdings. The provincial-loss case removes provincial receipts and the victim's ports there while preserving other institutions; the recipient/occupation regime remains a separate rule choice. Starting routes are zero, so the blockade column understates a developed merchant's potential exposure. No Seizure is booked as guaranteed recurring income: multiple claimants must share actual receipts, and any receipt transferred has an equal debit and credit.

## Development, RP and complete-viability limits

The [court/development report](BIRTHRIGHT_15_ANUIRE_COURT_AND_GROWTH.md) includes actual capacity-limited growth, costed road/contract examples and 17 possible Source-development paths. Its bounded mage experiment shows how retaining court 1 while repeatedly attempting growth can produce a visible funding failure. It does not model Basic automation or mandate that policy. Expensive courts and finite capacity constrain tested ordinary growth; lucrative trade, RP bids and repeated multi-target conflict still need the stated bounds.

The [character inventory](validation/regents.csv) contains **no invented BRCS ranks**. The [240 RP envelopes](validation/regent-rp-envelopes.csv) show zero-to-qualified-potential collection bounds for 80 ruler/domain combinations under three bloodline interpretations. They are not forecasts of actual collection. Thus no faction is certified to fund recurrent expenses through RP payroll, Alchemy or bloodline sacrifice. Gold and RP balances cannot be collapsed into a single solvency score.

**What remains unproven:** approved skill allocations and true-caster conversion; the selected bloodline package; exact cost treatment of towers/ports/home garrisons; court/actor throughput and growth/transport contracts; loyalty/tax choices; Seizure/occupation/default calendar; and original obligations absent from decoded records. Save conversion needs a separate opt-in/version strategy. A cost is not zero merely because its data are missing, and a payment is not income merely because a faction needs it.

The accounting supports continuing with this selected economic direction. It does **not** support declaring all factions sustainably solvent, preserving every old expense unchanged, granting automatic NPC/player subsidies, or implementing a partially chosen hybrid as finished 1.5. The next gate is the [approval package](BIRTHRIGHT_15_ANUIRE_ECONOMIC_DECISIONS.md), then reviewed character overlays and a recalculation with those approved parameters.

## Reproduction and checks

Run `node docs/rules/validation/calculate-anuire.mjs` from the repository root with existing Node/Vite dependencies. It regenerates research CSVs and the private canonical calculation; it does not rebuild the application. Monetary base calculations use **120 integer units/GB**; expected probabilities/HD forecasts use explicitly reported floating-point values. CSV decimals are presentation; canonical signed integer ledgers are retained privately.

Coverage sums, each sensitivity balance, asset-production reconciliation, probability conservation and hashes of original inputs/current gameplay sources were checked. The initializer/scenario objects remain unchanged after all forecasts. No gameplay tests, browser builds or long AI campaign runs were needed or performed. See [validation summary](validation/validation-summary.json) for hashes/counts and [guide](validation/README.md) for assumptions.
