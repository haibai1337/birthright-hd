# Birthright 1.5 holdings audit: sources and version boundaries

Research date: **2026-10-24**. Supports the [main audit](BIRTHRIGHT_15_HOLDINGS_AUDIT.md) and [economic cases](BIRTHRIGHT_15_HOLDINGS_ECONOMIC_CASES.md). References identify rules for comparison, not permission to implement them. Primary texts were inspected; no historical executable was run. Only research documents are deliverables. Downloaded books, extracted text, images and historical implementation remain in ignored private research storage.

## Evidence labels

| Label | Meaning                                                                                                                          |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| E2    | The 1995 boxed-set Rulebook, distinct from later AD&D supplements and fan variants.                                              |
| PC-H  | Original Sierra CD help, a confirmed description of intended PC behavior. It is not proof that every executable implemented it.  |
| PC-B  | A specifically identified static executable observation; no claim about other patches or a live seasonal run.                    |
| PC-S  | Qualified historical C/C++ corroboration at the retained commit; modified source, not retail certification.                      |
| B30   | The inspected January 2003 playtest PDF.                                                                                         |
| B35   | The inspected later chapter PDFs; chapters 6–9 inherit the older material where specified by the publisher.                      |
| W     | Current community BRCS transcription/errata, checked against a PDF where possible. Expanded/variant articles are not core rules. |
| HD    | Current working-tree implementation, read directly. A code path is not a historical-fidelity claim.                              |
| P15   | This audit's proposed design, analysis or safeguard. Not an implemented or approved rule.                                        |

## Bibliography and stable locators

### E2 — Original AD&D Birthright Campaign Setting

Richard Baker and Colin McComb, **Birthright Campaign Setting: Rulebook**, TSR #3100, 1995. The Rulebook is one booklet of the boxed set; do not substitute _Ruins of Empire_. Inspected through the digitized [first part](https://anyflip.com/cmjgl/okan/basic) and [second part](https://anyflip.com/cmjgl/okan/basic/51-98). The mirror's OCR interleaves columns and occasionally loses page numbers. Use the printed heading/table as the primary locator; table transcription ambiguities are explicitly retained in the audit. A complete local PDF of this booklet was not obtained, so no file hash or universal visual-verification claim is supplied.

Key locators: pp. 33–36, provinces, holdings and assets; Classes and Regency, Table 14; pp. 41–44, collection and Tables 17, 18 and 18A; pp. 44–45, maintenance and Table 19; pp. 47–49, loyalty and action resolution; pp. 50–60, named domain actions; p. 82, source limitations and Table 24. In particular, Forge Ley Line appears with Fortify around pp. 54–55; Rule and Trade Route are around pp. 59–60. Named headings take precedence over uncertain OCR page association.

Later _Book of Magecraft_, _Book of Priestcraft_, regional trade supplements and _Book of Regency_ are **not** automatically 1995 rules. Their ideas can be design candidates, but require a separate citation and label. The [expanded trade article](https://birthright.net/wiki/index.php/Create_Trade_Route_action) explicitly contains alternatives and a later source-based trade variant; it is not evidence that the 1995 boxed set used the BRCS virtual-guild formula.

### PC — Sierra, Birthright: The Gorgon's Alliance, 1997

Primary local text: [CD RULES.TXT](../../reference/extracted/disc/RULES.TXT), SHA-256 `9757f81a666a222bd4e20c85e78c0fdb229859f9a15bcc25936f4e4e57885077`. Locate sections by their `^#` identifier, not just line numbers. Relevant sections: 004/040, actions and free actions; 008, candidates; 043/125, sources; 097/099, management; 110–118, occupation and pillage; 126–129, taxes, loyalty and Law Claims; 144, Agitate; 148, Contest; 149, Create Holding; 150/223, occupation/investiture; 151/258, diplomacy/vassalage; 159, ley lines; 160, Rule; 167/168/169, maintenance, holding income and tax collection; 199, ports; 231, realm magic; 250, trade.

The [scanned Sierra manual](https://www.gamesdatabase.org/Media/SYSTEM/Microsoft_DOS/Manual/formated/Birthright_-_The_Gorgon-s_Alliance.pdf) and locally retained manual establish presentation/modes; detailed action rules are delegated to the help. Existing repository investigations already index these materials. Reuse [gameplay research](../GAMEPLAY_SYSTEMS.md), [Maintenance audit](../ORIGINAL_MAINTENANCE_AUDIT.md), [Council flow](../ORIGINAL_COUNCIL_UI_FLOW.md), [Anuire provenance](../ANUIRE_DATA.md) and [port investigation](../PORT_INCOME_INVESTIGATION.md).

Historical source evidence: `fire-lizard/birthrt`, retained commit `fc47055002c4b776bfb1e8737b5aaf7f6d43edce`; `PROVTAX.C`, `GAMEMAP.CPP::ProvinceInfo/UpdateDataArea/SwitchToActionMode`, `ACTNMENU.CPP` action screens/checks, `MAPAI.CPP::DoNPCAdmin`, realm and character definitions. Private copies remain under `reference/research-cache/`. Relevant conflicts include Law Claims' conditional logic, source handling/allied exemptions during holding reduction, port icon accounting and acquisition/caster behavior. None is silently promoted to a verified retail rule.

PC-B port evidence is narrowly scoped to the CD Windows executable branch documented in the existing port audit: icons 94/96 receive full province-level revenue there; icon 95 is skipped. PC-H §199 instead describes half-level port revenue. HD's full seaport/half river-port policy is a separate explicit user decision. This observation cannot certify all DOS/Windows patches.

### B30 — BRCS 3.0, 2003

Primary [publisher listing](https://forum.birthright.net/t/brcs-3e-pdf-ruleset-developed-by-birthright-net/35906) and [PDF](https://forum.birthright.net/uploads/short-url/ezVAqNVn0yqpYSCB5DXzqF3QueY.pdf). The download is advertised as `brcs-3e-v1.0.pdf`, but its internal title page says **Version 0.0; Jan 30, 2003**, first-release playtest, draft/unsanctioned. Both identities are recorded; this audit does not rename it a final official WotC edition.

187 PDF pages. In the inspected body, the printed page number matches the **one-based PDF page number**; do not add one again because a browser tool reports zero-based page indices. For example, PDF index 95 is PDF page 96 and printed p. 96. SHA-256 `f79005d071fef838e16c1f5917611ac8fb525de233a41e97ceaf86b7b96360e0`.

| Topic                                 | Printed pages / stable headings                          |
| ------------------------------------- | -------------------------------------------------------- |
| Capacity, regent count and assets     | pp. 88–93; Tables 5-3/5-4                                |
| RP and income                         | pp. 95–97; Tables 5-9/5-10/5-11; Seizures                |
| Expenses and sequence                 | pp. 94, 97–98; Table 5-7; Domain asset maintenance costs |
| Action resolution and sources         | pp. 101–104; Domain actions with source holdings         |
| Occupation, Agitate and Ceremony      | pp. 106–108, named action headings                       |
| Contest, Create, ley lines and routes | pp. 107–109, named action headings                       |
| Rule Holding / Rule Province          | pp. 109–110, named action headings                       |
| Realm magic                           | pp. 132–135; sources, ley lines, casting                 |

### B35 — Later BRCS 3.5 material

Primary [publisher/version record](https://forum.birthright.net/t/brcs-3-5e-pdf-ruleset-chapters-developed-by-birthright-net/35907). This is a chapter collection, not a separately verified complete rewrite. The publisher identifies revised chapters 1–5 and **no separate 3.5 versions of chapters 6–9**. Thus military/realm-magic text inherited from B30 must be labeled inherited, not a newly established 3.5 change. The version record describes v1.1 as reconstruction of the earlier chapter release, largely formatting, and says the wiki errata have not all been incorporated. A 2026 upload date does not date the original rule's invention.

| Inspected file                                                                                   | Extent / exact locator                                                                           | SHA-256                                                            |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [Chapter 5 v1.1](https://forum.birthright.net/uploads/short-url/kzgRCgo4pW6eDpMcWXeksjxcX3D.pdf) | 21 PDF pages; lacks a useful continuous printed page sequence, so this audit cites **PDF pages** | `25be109daf29e2678e8bfb23d098f05531e528159f7682b60dae5be0998ac942` |
| [Chapter 2 v1.1](https://forum.birthright.net/uploads/short-url/mZzhJbd1XrYTT2xuh6uhgGUTgrn.pdf) | 25 PDF pages; bloodline/reserve background                                                       | `f4fb252a04c51af753816ae37671a40c1d6b6af65df7893d65ca125fe457a8a3` |
| [Change log](https://forum.birthright.net/uploads/short-url/mF8GiVSkusaa8WUm1gL8icWYPzV.txt)     | Publisher's revision history, distinct from a rules errata resolution                            | Retained privately; not a substitute for the PDFs                  |

Chapter 5 PDF page locators: capacity/regent limits p. 2; construction/maintenance Table 5-4 pp. 3–4; trade p. 5; seasonal attitudes/sequence pp. 6–7; regency pp. 7–8; income/seizures/expenses pp. 8–10; source actions/virtual guilds p. 15; Occupy p. 17; Agitate/Ceremony/Contest pp. 18–19; Create/ley lines/trade p. 19; Rule p. 21. The main holding-income, skill-based RP, Create/Rule/Contest and virtual-guild systems inspected here already appear in B30. This audit does **not** manufacture an edition difference where these passages agree.

Useful publisher-hosted transcriptions, used with their individual headings and version caveats:

- [Components and trade](https://birthright.net/wiki/index.php/BRCS%3AChapter_five/Ruling_a_domain/Components_of_a_domain).
- [Collections, skills and seizures](https://birthright.net/wiki/index.php/BRCS%3AChapter_five/Ruling_a_domain/Domain_collections).
- [Action descriptions](https://birthright.net/wiki/index.php/Contest_holding).
- [Action rounds and source actions](https://birthright.net/wiki/index.php/BRCS%3AChapter_five/Ruling_a_domain/Domain_action_rounds).
- [Attitude adjustments](https://birthright.net/wiki/index.php/BRCS%3AChapter_five/Ruling_a_domain/Adjusting_domain_attitude).
- [Inherited arcane magic](https://birthright.net/wiki/index.php/BRCS%3AChapter_seven/Realm_magic/Arcane_realm_magic).
- [Errata](https://birthright.net/wiki/index.php/Errata): the skill-RP example, duplicated attitude threshold and fortification-maintenance conflicts remain especially relevant.

PDF pages 96–98 of B30 and PDF pp. 3, 8–9 of B35 chapter 5 were locally rendered; the income tables were visually inspected to distinguish columns and fractions. E2 is an OCR-based primary-text comparison with the limitations above. Do not claim every historical table was visually verified.

## HD snapshot and evidence map

Working-tree baseline: **2026-10-24**, repository HEAD `26624e981ba7c095f4e089728d62f8ac90e8462d`; pre-existing documentation changes retained. Relevant code was read directly. Research did not call `applyCommand`, rewrite data, change a save or run a campaign.

| Rule area                                        | Actual implementation locators                                                                                                                                | Existing check locations, not a fresh certification              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Income, claims, expenses and ledger              | [economy.ts](../../packages/core/economy.ts): `taxDice`, `holdingDice`, `income`, `domainMaintenance`, `collectPCEconomy`, `finalizePCEconomy`                | `tests/economy.test.ts`, `tests/maintenance-phase.test.ts`       |
| Actions, opposition, contest and source trimming | [domain-actions.ts](../../packages/core/domain-actions.ts): `domainActionQuote`, `domainActionProblem`, `holdingInfluence`, `resolveCheck`                    | `tests/domain-actions.test.ts`                                   |
| RP, class and local power                        | [selectors.ts](../../packages/core/selectors.ts): `provinceDomainPower`, `domainPower`, `sourcePotential`; [bloodlines.ts](../../packages/core/bloodlines.ts) | `tests/realm-magic.test.ts`, regent-selection tests              |
| Trade                                            | [trade.ts](../../packages/core/trade.ts): `tradeProblem`, `tradeIncome`, `inspectTradeRoute`, `routeLimit`                                                    | Economy/strategy tests                                           |
| Ley access / ownership                           | [ley-lines.ts](../../packages/core/ley-lines.ts): `availableSource`, `inspectLeyLine`, `leyLineProblem`                                                       | Realm-magic tests                                                |
| Occupation and damage                            | [warfare.ts](../../packages/core/warfare.ts): `investProvince`, `pillageProvince`; [domains.ts](../../packages/core/domains.ts)                               | Warfare/strategy tests                                           |
| Phase timing and outcomes                        | [engine.ts](../../packages/core/engine.ts): `finishSeason`, `completeCouncil`, `selectActions`, `checkOutcome`                                                | Maintenance/events/warfare tests                                 |
| Saves / UI                                       | [schema.ts](../../packages/core/schema.ts), [persistence.ts](../../packages/core/persistence.ts); Maintenance, Economy, Magic and Fealty councils             | Existing phase/browser checks; this audit adds no behavior tests |

Private audit copies/hashes/calculation output: `reference/research-cache/birthright15/`. Core snapshot hashes include economy `4b35e4c7b654f227c580c47141c1eb3d2d856fe4e88088ce1062d73602292d9f`, domain actions `c9a0cdf82ba25e80df5138ddf230200501bef0279bc6cfb15033407e01ee94e8`, trade `f2153d3619063a8f1c68fddc86a3303421c4e683c1e04255051afd302450f967`, and engine `3228fc13aa8593a6da6d4f584b9a62c0f0956d6804d5e0fa45732d5e9c965f91`. A complete private `code-hashes.json` accompanies the arithmetic output.

## Questions that evidence does not settle

- Exact retail Sierra Law Claims distribution and every patched/platform-specific difference.
- Several E2 OCR table/layout ambiguities and inconsistent Rule success examples: original page images should be rechecked before implementing exact tables or thresholds.
- Conflicting BRCS fortification maintenance and attitude-table entries: compare the explicit competing statements; do not resolve them by edition label alone.
- The point at which a simulated economy should depart from a tabletop game master's discretion, including unlimited zero-level contacts, Decree effects and diplomatic enforcement.
- Which proposed 1.5 changes the user accepts, and which require a new rules/save version. This research authorizes none of them.
