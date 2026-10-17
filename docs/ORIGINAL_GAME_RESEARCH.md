# Original game research

Research date: **2026-10-17**. Scope: supplied files and the five requested online references. This report distinguishes documentary evidence from observed file structures and untested behavior. No supplied executable was run.

## Classification

- **VERIFIED_ORIGINAL:** directly supported by a supplied original document or observed original file bytes. A patch README verifies its author's stated changes, not that those changes work at runtime.
- **VERIFIED_TABLETOP:** supported by a directly inspected tabletop rulebook. No tabletop rulebook was supplied or verified this session.
- **INFERRED:** reasonable interpretation requiring independent confirmation.
- **ENHANCED_DESIGN:** deliberate remake behavior or modernized balance.
- **TEMPORARY_PLACEHOLDER:** invented development content, never treated as canon.
- **UNKNOWN:** insufficient or inaccessible evidence.

## Supplied inventory and inspection

[REFERENCE_INVENTORY.md](REFERENCE_INVENTORY.md) contains all ten filenames, byte sizes, signatures/formats and SHA-256 hashes. No existing application or Git repository was present at audit. `reference/original/` already existed.

| Material                          | Inspection                                                                                                                                           | Purpose / confidence                                                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RPGBGA.BIN` + `RPGBGA.CUE`       | CUE read; streaming SHA-256; ISO9660 directory traversal inside MODE1/2352 sectors; selected text/data reads; all resource-directory records indexed | VERIFIED_ORIGINAL / high: CD volume `BIRTHV10`, game files plus unrelated Sierra demos                                                             |
| English manual PDF                | 24 scanned PDF spreads; text-layer extraction yielded only 518 characters; representative spreads rendered and visually read                         | VERIFIED_ORIGINAL / high for inspected pages, no claim of full OCR/transcription                                                                   |
| Scenario-editor EXE               | RAR wrapper listed with installed UnRAR; contains `SCENED95.EXE` and `SCENED.DAT`; DAT read without executing editor                                 | VERIFIED_ORIGINAL / high for container; UNKNOWN for complete editor interchange layout                                                             |
| 1.0.0.2 DOS/Windows-labelled EXEs | ZIP-compatible SFX directory inspection; patch text extracted privately; Windows README read                                                         | VERIFIED_ORIGINAL / high documentary confidence                                                                                                    |
| 1.0.0.3 DOS-labelled EXE          | ZIP-compatible SFX; 400 members; README read                                                                                                         | VERIFIED_ORIGINAL / high documentary confidence                                                                                                    |
| 1.0.0.3 Windows-labelled EXE      | Signature and printable installer strings; ZIP reader cannot open it                                                                                 | UNKNOWN payload details; no installer executed                                                                                                     |
| 1.0.0.4 Windows-labelled EXE      | RAR SFX with 401 listed entries; README read                                                                                                         | High for archive, uncertain version identity: README dated 1997-10-31 refers to BRPATCH3 and does not independently prove a 1.0.0.4 engine version |
| NFO                               | Hash, size and signature inventory                                                                                                                   | Packaging metadata, not authoritative rules or rights evidence                                                                                     |

Missing: separate Character Editor package, a supplied preservation-patch archive, tabletop books, and independently verified complete strategic field definitions. Their contents have not been invented.

## Manual and help findings

The supplied PDF is introductory rather than a complete machine-readable rulebook. Visually inspected printed pages include 2–3 (requirements/installation), 6–7 (options and help), 10–11 (expert actions/tutorials), 22–23 (definitions and setting), and 34–35 (blood abilities/wizard realm spells).

Printed p.7 directs players to the rules help; p.10 lists eighteen expert domain actions; p.23 defines the three action rounds in a domain turn, bloodlines/regency, and four holding types. P.35 contains a Wizard Realm Spells table, including Warding; the M0 test ward is deliberately **not** represented as that original spell.

The CD's `RULES.TXT` is substantially more useful for systems extraction. Its opening says that the How To Play help takes precedence over conflicting manual/history material. Verified sections include:

| Topic                                                                                           | Evidence                                                      | Confidence                                         |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| Quarterly domain turn; three monthly domain actions                                             | RULES.TXT §033; manual p.23                                   | High                                               |
| Reports → realm management/taxes/maintenance → domain actions                                   | RULES.TXT §033                                                | High documentary, original runtime not exercised   |
| Regency: accumulate unused RP plus lesser of bloodline and class-dependent domain power         | §§123, bloodline/domain-power and holding collection sections | High                                               |
| Original tax ranges for province levels 0–10                                                    | §126 table                                                    | High for ranges; exact RNG distribution UNKNOWN    |
| Law/guild/temple/source holdings; overlapping control; per-type capacity                        | §102 source, holdings overview and §§099–101                  | High                                               |
| Sources lose potential as provinces develop; wizard prerequisites                               | §102; official 1.0.0.2 README item 6                          | High                                               |
| Infantry/archers/cavalry muster/upkeep/minimum province                                         | Muster table near §158                                        | High; remake auto-combat power is enhanced         |
| Rule increases one province or holding level; maximum ten                                       | §160                                                          | High; success rolls differ from M0                 |
| War declarations expire each domain turn and are directional in the PC game                     | Declare War discussion                                        | High; M0 wars are symmetric                        |
| Diplomacy includes alliances, vassals, transfers/tribute                                        | §151                                                          | High; only a limited M0 subset exists              |
| Occupation differs from ownership; investiture required for permanent rule/regency              | Occupation overview                                           | High; simplified immediate M0 conquest is enhanced |
| Trade routes need different terrain, roads and a starting guild; income is mean province levels | §§133–135                                                     | High; construction deferred                        |
| Castle maintenance costs one GB per turn                                                        | §098                                                          | High; remaining maintenance is simplified          |

No complete original strategic starting dataset was validated. Place names/regents visible in historical references are not enough to reconstruct ownership, holdings, geometry, and force counts reliably.

## Editors and patch history

The 1.0.0.3 DOS README explicitly describes Scenario Editor control over starting province/holding/force ownership, alliances, participating realms and player starts. It states scenarios can load from the save directory and expand the selectable realms beyond the original seventeen. This is strong evidence to investigate the `.SAV`/scenario representation, rather than assume adventure `.SCN` files store strategic scenarios. The supplied editor's DAT begins with a timestamp and contains UI resource names; its 183,967 bytes have not been mapped to campaign fields.

The 1.0.0.2 Windows README documents source-capacity correction, allied/vassal occupation fixes, realm reputation corrections, multiplayer/editor synchronization, lieutenant action cost correction, and several adventure/battle bugs. These guide regression cases; the source-capacity correction is exercised by M0 tests. The 1.0.0.3 README documents editor support and fixes around realm reports, retreats, experience, and artifacts. The package labelled 1.0.0.4 has a sparse README emphasizing tool support and DirectX 5; its filename/version discrepancy remains unresolved.

[Preservation Patch 1.4.2 release notes](https://www.moddb.com/mods/birthright-preservation-patch/downloads/birthright-preservation-patch-142-archive) were read as published claims, not installed or diffed. They describe mouse-wheel zoom, adventure pathfinding/combat fixes, and realm-interface fixes. This provides a usability reference; it does not establish original 1997 rules or verify binary behavior. No preservation-patch assets/code were incorporated.

## Online references

- [Kiranwelle modding reference](https://www.kiranwelle.com/birthright/modding-reference/): adventure WAD/SCN separation, resource containers, LZSS and palette limitations. Cross-checked against actual `.RES` directory contents; field-size/version differences are recorded in the extraction report.
- [BRUT](https://github.com/Shiryou/brut): resource utility/library; repository states MIT license. Reviewed as a candidate tool, not installed/run or copied into this project.
- [fire-lizard/birthrt](https://github.com/fire-lizard/birthrt): repository/README inspected; describes modified original source and withholding binary assets due to copyright. No clear reusable license found in inspected root. No proprietary engine code was incorporated.
- [ModDB preservation-patch page](https://www.moddb.com/mods/birthright-preservation-patch): project description and release notes inspected.
- [Birthright.net forum](https://forum.birthright.net/): accessible category index reviewed. No authoritative tabletop rule or authenticated campaign dataset was obtained from it.

## Conclusion and remaining research

The strongest current foundation is original PC documentary rules plus observed private file metadata. Campaign binaries are available but not decoded safely enough to ship canonical data. The playable synthetic scenario is the correct M0 fallback. Next: independently map original state records and string IDs, compare editor-generated saves in isolation, reconstruct adjacency/geometry, and establish a provenance-backed import validation suite.
