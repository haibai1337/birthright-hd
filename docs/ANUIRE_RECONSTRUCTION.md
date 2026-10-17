# M1A/M1B: Anuire reconstruction and experimental play

## Result and scope

The original CD initialization template is now a validated, machine-readable research corpus: **206 provinces and geometries, 51 realm records, 116 regent records, 766 holdings, 39 fortifications, 234 military units and 63 character units**. There are 32 province-owning realms; the other realm records include holding domains and unused/off-map entries. All 297 active units have resolved deployment locations. Province names and geography are recovered from original files, without inventing missing provinces or boundaries.

M1B now loads this corpus through **New game → Load Anuire campaign data** as **Anuire — Experimental Original Template Campaign**. All 206 provinces and all source holdings/fortifications/deployments import into the extended core model. The separate **Open Anuire research preview** remains a raw-record inspector. Covenant Marches remains the regression fixture. Exact stock initialization and original rules are not claimed; see the current [playability report](ANUIRE_PLAYABILITY_REPORT.md).

See [source access and contradictions](ANUIRE_SOURCE_MATRIX.md), [generated coverage](ANUIRE_COVERAGE.json), and the earlier [reference inventory](REFERENCE_INVENTORY.md). These are M1A findings; earlier M0 extraction limitations are historical, not the current coverage.

## Reproduce the extraction

Node 22.12+ and existing npm dependencies are sufficient for campaign/map extraction. Run from the repository root:

```powershell
npm run research:anuire
npm run research:validate
npm run test:original
npm test
npm run test:e2e
npm run build
```

The default source is `reference/original/RPGBGA.BIN`. An alternate MODE1/2352 BIN or logical ISO can be passed as the final argument:

```powershell
npm run research:anuire -- C:\private\birthright.iso
npm run research:validate -- C:\private\anuire.research.json
```

`OriginalDisc` opens the image with `r`, walks ISO9660 with bounds/traversal guards, and never mounts or executes it. All input bytes remain unchanged. The extractor writes private derivatives to `reference/extracted/anuire/`, plus aggregate metadata to `docs/ANUIRE_COVERAGE.json`. Source images, cached web prose, derived geography, catalog contents and extracted game images remain ignored and excluded from application imports, `public/`, and releases.

The existing `node packages/import-tools/inspect-archives.mjs` can optionally obtain `reference/extracted/scenario-editor-SCENED.DAT` using the installed UnRAR path documented in that script. It reads named archive members, not the editor program. This is optional: extraction works without editor data. External snapshots are also optional; missing snapshots give zero secondary-source coverage, never invented comparisons.

Private guide input uses `reference/research-cache/guide-window-<number>.txt`, with research-browser `L<number>: text` lines for guide v1.02. Overlaps must agree; the parser reports gaps. Atlas HTML snapshots use `atlas-Roesone.html`, `atlas-Aerenwe.html`, `atlas-City_of_Anuire.html`. Parsers do not fetch websites, execute scripts, bypass HTTP restrictions or assume missing pages were read. These adapters target the examined guide layout/table structure; another version needs new format validation.

## Generated artifacts

| Private output                    | Contents                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `anuire.research.json`            | Stable IDs, record offsets, raw campaign fields, source hashes/confidence, matrices, exact ID-map contours, validation issues and readiness gates |
| `province-schema-projection.json` | 177 province definitions accepted by the existing M0 schema; 29 blocked with individual reasons; `playable: false`                                |
| `coverage.json`                   | Aggregate record/field coverage and comparison totals; also written as tracked `docs/ANUIRE_COVERAGE.json`                                        |
| `anuire-reference-map.svg`        | Diagnostic vector map with original IDs, contours and generated colors; no original palette/art                                                   |
| `adjacency-report.json`           | Movement edges, asymmetries, raster contacts and differences                                                                                      |
| `pc-guide-facts.json`             | Factual rows only, original spelling, domain association, guide line numbers and coverage gaps                                                    |
| `source-cross-checks.json`        | PC guide comparisons: match, difference or unmatched; no automatic overwrites                                                                     |
| `tabletop-comparisons.json`       | 14 independent Roesone/Aerenwe rows, holding abbreviations and PC differences                                                                     |
| `save-comparisons.json`           | Seven saves' headers, table dimensions/raw changes, semantic province/resource differences and tail bounds                                        |
| `string-catalog-comparison.json`  | Game/editor builds and differing string IDs; no catalog prose                                                                                     |
| `map-manifest.json`               | Three map member dimensions and decoded payload hashes                                                                                            |

To inspect the corpus in the app, start `npm run dev`, select **New game**, choose **Open Anuire research preview**, and select `reference/extracted/anuire/anuire.research.json`. The file is read locally, validated and held in memory. It is not uploaded, inserted into saved campaigns, or added to the frontend bundle. The map supports province selection, movement-neighbor navigation, focusing, holdings and evidence inspection.

## File formats and independently implemented readers

All integers below are little endian. Layouts describe the examined CD/version, not every historical patch. Readers reject unsupported versions/strides, truncated ranges, cyclic chains, duplicate names/IDs and inconsistent bitmap sizes.

### Disc and executable string pool

The CUE describes MODE1/2352. Logical sector payload is 2048 bytes at physical sector offset 16. The directory has 2,268 records, including 2,184 files. Bounds are checked against the actual image length.

The CD directory advertises `WINBR.EXE` as 1,695,744 bytes, but only 1,693,696 bytes are present: its final 2,048-byte logical sector is missing. The new reader rejects a purported full-file read. Extraction deliberately reads and hashes the **first 1,600,000 bytes**, with that scope recorded; it never pads missing data. This prefix includes PE32 headers and the complete province-name pool.

Province records serialize stale 32-bit name addresses. `pe.ts` translates those addresses through the executable image base/section table into file offsets; it never loads the executable. The observed image base is `0x400000`; the relevant data section has RVA `0x160000`, raw offset 1,318,912. Every one of the 206 names resolves to a bounded NUL-terminated Windows-1252 string. Index 0 is a sentinel; index 206 is the real stored `Lost Realm` record, not an invented extra province.

### `STRDAT.DAT` and editor `SCENED.DAT`

`strings.ts` reads the actual two-level catalog:

| Offset            | Meaning                                                    |
| ----------------- | ---------------------------------------------------------- |
| 0                 | u32 string count, 4,567                                    |
| 4                 | 40-byte NUL-terminated build text                          |
| 44                | u16 last group index, 45; therefore 46 groups              |
| 46                | Absolute u32 group pointers in a 100-slot table            |
| group start       | u32 string-data byte count                                 |
| group start + 4   | 100 u32 offsets relative to the group's string-data region |
| group start + 404 | NUL-terminated string bytes                                |

Only 67 slots of the last group are meaningful. Bounds/contiguity and terminal lengths are checked. Realm names resolve through each realm record's string ID (observed `4400 + realmIndex`), not guessed enum spellings.

The CD string build is `Aug 27 1997 14:31:23`; editor build is `Nov 05 1997 18:21:04`. Both catalogs contain 4,567 entries; **31 strings differ**. `SCENED.DAT` is therefore useful editor text/version evidence, not a serialized province/holding database. No editor campaign export was generated in this session.

### `RLMSTART.DAT` and original PC saves

`campaign.ts` reads versions `0x20051` (template) and `0x20050` (supplied saves), an 89-byte header and consecutive blocks. Each block starts with u32 record size and u32 record count. The template contains:

| Block           | Header offset | Stride | Count, including unused/sentinel slots |
| --------------- | ------------: | -----: | -------------------------------------: |
| realms          |            89 |     20 |                                     52 |
| regents         |         1,137 |     14 |                                    117 |
| reactions       |         2,783 |     52 |                                     35 |
| relationships   |         4,611 |     52 |                                     35 |
| provinces       |         6,439 |     32 |                                    207 |
| places          |        13,071 |     20 |                                  1,000 |
| units           |        33,079 |     14 |                                  2,000 |
| AI              |        61,087 |     56 |                                     35 |
| realm order     |        63,055 |      1 |                                     35 |
| tribute         |        63,098 |     52 |                                     52 |
| adventure sites |        65,810 |     16 |                                     26 |

The character serialization tail starts at **66,234**, followed by variable structures; it is not safely decoded as `264 × 116` fixed bytes. Supplied saves mostly have a 1,000-unit pool, moving subsequent blocks by 14,000 bytes. Counts must be read from each file. The parser records the tail boundary and length without guessing its contents.

Header fields exposed are version @0, raw home-realm i16 @4, date u32 @6, scenario flags u32 @73. The template home-realm field is uninitialized/out of range; it is not used as ownership or a selected player. Names in saves can be runtime pointers, so the comparison adapter excludes name pointers when comparing semantic province changes.

### Realms: 20 bytes

Name string ID u32 @0; label x/y i16 @4/@6; packed flags u32 @8; first-province byte @12; surplus-income byte @13; regency u16 @14; treasury u16 @16; income i16 @18. Packed flags include regent index (bits 17–23), playable bit 26, court bits 28–30 and exists bit 31.

There are 51 non-sentinel realm records and 18 template playable bits. These are not 51 independently playable territorial states. Resource values are exposed as **template** resources: e.g. Roesone stores 150 GB and 56 RP. They are not replaced with the synthetic game's shared resource defaults.

The 35-by-52 reaction/status blocks and 52-by-52 tribute block are preserved byte-for-byte as matrices. The inspected source identifies low-nibble relationship values 1 war, 2 neutral, 3 permissive alliance, 4 full alliance, 5 vassal, with flags `0x40` adjacency and `0x80` an additional state flag. Matrix-class storage axes and runtime flag behavior need further tracing before directional diplomatic records can be safely imported. No symmetric M0 treaties are fabricated from these arrays.

### Provinces: 32 bytes

| Offset | Meaning                                                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0      | Serialized name address, translated through the CD PE name pool                                                                                                                 |
| 4, 6   | i16 map-center x/y, in large-map coordinates                                                                                                                                    |
| 8      | Packed word: realm 7 bits @0; development 4 @7; current development 4 @11; remaining source 4 @15; tax 2 @19; loyalty 2 @21; contested @23; occupying realm 7 @24; pillaged @31 |
| 12     | Additional flags/effects; human/elf/dwarf/goblin bits 20–23; levy count bits 24–27; terrain bits 28–31                                                                          |
| 16–29  | Seven pairs of u8 destination province and u8 movement code; province zero means unused                                                                                         |
| 30     | i16 first place index                                                                                                                                                           |

All 206 records have names, owners, development/source levels, terrain, centers and border references. Terrain values in this template: forest 62, plains 88, mountains 24, heavy mountains 9, swamp 6, hills 17. Four provinces' development + remaining source exceeds the M0 cap of 10; the highest observed sum is 12. These values are retained, not clamped.

### Regents and text avatar definitions

Regent records are 14 bytes. First packed word: realm 7 bits @0, race 4 @7, first class 4 @11, first level 6 @15, second class 4 @21, second level 6 @25. Next packed word: bloodline grade 3 bits @0, derivation 3 @3, strength 8 @6. Unit index i16 @8, avatar file ID i16 @10, icon/cache i16 @12.

All **116 regent slots** resolve to their referenced `SCENES/ID<number>.AVA` text definition. They include alternate rulers and lieutenants; only 51 are referenced realm heads. Six slots explicitly resolve to literal `unknown` from a shared placeholder definition, leaving **110 non-placeholder names**, not 116 fully identified people. Mieres and Chaos have placeholder heads. No replacement identity was invented.

AVA comments document its field format. The independent parser strips comments/empty lines, validates version 0 and numeric fields, and reads six attributes, name, race, alignment, HP and two class/level/experience tuples. It never evaluates text. Avatar class codes and regent enum codes differ by convention; raw codes are kept separately. Zero/default monster attributes and serialized character state are not silently treated as complete initialized character profiles. Bloodline abilities, inventory and full spellbooks still require the variable character tail and additional format work.

### Places: holdings and fortifications

Places are 20 bytes. x/y i16 @0/@2; packed word @4: realm 7 bits @0, level 4 @7, icon 7 @11, first trade-route link 10 @18. Word @8 stores two more 10-bit route links and flags/name index. Next-place i16 @12; scene/address information begins @14.

**Next-place is relative to the province's first-place index**, not relative to the current node or an absolute index. Zero terminates; otherwise next index = province first + stored relative value. Shared/cyclic/out-of-range chains are rejected. All active places in the examined template are associated with a province.

Icons distinguish holdings: law 99 (243 records), temple 103 (162), guild 107 (171), source 111 (190). Fortification icons 97 and 115–118 yield **39 records** (wizard towers included). Ports/ruins/villages are not mislabeled as castles. The maximum observed fortification level is 7, beyond M0's fort cap of 5. Trade-route fields are retained as raw links; their economic/endpoint semantics are not imported as completed routes.

There are ten observed capacity discrepancies under the usual per-province holding sum check. These are original data findings, not validation fixes: Aerele/source, Ciliene/temple, Alamier/source, Lindholme/temple, Alaroine/law, Giant's Fastness/source, Cymryr/guild, Bran's Retreat/temple, Cliff's Lament/temple, Ruorven/temple. The private report contains exact records/totals. Contested/runtime capacity treatment still needs investigation.

### Units and deployment chains

Unit records are 14 bytes. First word: province 8 bits @0, realm 7 @8, salary 7 @15, icon 7 @22, moving/avoid/joined bits 29/30/31. Second word includes paid bit 4. Type ID i16 @8; absolute next-unit index i16 @10; cache/icon i16 @12.

An active candidate has index >0, type >0 and realm >0. A deployed head has nonzero province and joined=false. Follow its **absolute** next indices to place its joined members; a joined member's own province field can be stale and must not override the head. Cycle/shared-node/mixed-realm checks resolve all 297 active records: 234 military and 63 character units. Type IDs >=1000 are classified as character units for this examined template. Complete unit combat definitions/recruitment permissions and post-selection unit changes are separate from deployment recovery.

## Original map reconstruction

`resources.ts` validates the archive directory instead of assuming a documented approximation. File version raw is `0x400`; directory entries are 22 bytes (hash u32, offset u32, extension u8, name[13]). Each member starts with a **36-byte** `RSRC` header: magic, total/packed/unpacked sizes, hash, flags, compression, extension and name[13]. Header/index names/hashes, intervals and lengths must agree.

All three map members use codec 2. The independently implemented LZSS reader consumes little-endian 16-bit flag words, most-significant bit first: 1 is a literal, 0 is a 16-bit back-reference, zero token terminates. Distance = low 10 bits +1; run length = high 6 bits +3; overlapping copies are valid. Exactly the declared output length and bounded zero terminator padding are required. No external historical decoder is executed.

Decoded bitmap header is 10 bytes (width, height, scale, center, type); examined maps have type 11 and indexed pixels:

- `LGMAP.PCX`: 1920 × 2234.
- `SMMAP.PCX`: 960 × 1117.
- `PROVMAP.PCX`: 480 × 559, province IDs rather than art colors.

Every province center, sampled at `(floor(x/4), floor(y/4))`, agrees with its stored province index: **206/206**. Height uses ceiling division, so do not force a 2236-pixel large map. Raster IDs 0 and 254 are background/outside sentinels. Two pixels have unassigned ID 240; no province is created from them.

`geometry.ts` traces exposed cell edges, preserves orientation, reduces only collinear vertices, and validates signed polygon area against pixel count. It preserves disconnected islands and holes. The actual corpus has **206 geometries, 143,310 province pixels, seven multi-ring provinces and no hole rings**. The synthetic test suite also checks holes and corner contacts. Multi-ring provinces are Ghoried, Ilien, Ice Haven, Bindier, Islien, Bevaldruor and Winoene.

This is exact original **selection-map geometry at quarter resolution**. It does not claim recovery of continuous high-resolution artwork boundaries, named rivers, or terrain artwork. Original art/palettes are not distributed. The diagnostic SVG can be regenerated from the local disc. Printed-map comparison remains unavailable because the supplied MobyGames page returned HTTP 403.

### Adjacency is two different observations

The province records contain **1,053 directed movement links / 528 unordered movement pairs**. The ID raster contains **544 unordered shared-edge contacts**. Three stored links lack a reverse link: 19→25 (code 1), 39→29 (code 7), 149→3 (code 0). Only pair 3:149 lacks raster contact; it is a suspicious distant link, retained with a warning. Seventeen raster contacts lack movement links, several only one pixel long. Corner touches do not count as shared edges.

The report preserves both graphs. It does not silently symmetrize movement, infer traversability from touching pixels, or repair suspicious edges. Movement code interpretation and any runtime correction must precede a faithful campaign import.

## Scenario Editor and save route

The editor package contains the program and its string catalog, with no separate initial campaign export. Its strings and published save-editing reports make scenario/save editing a plausible route, but execution is unnecessary to recover the principal template tables/map.

`compare-campaigns.ts` compares stored table rows, meaningful province fields and resource balances without dereferencing saved runtime names. Seven CD saves parse: Baruk/Endier/Sielwode date 2, Roesone date 3, adventure/expert tutorial date 1, base tutorial date 0. Even the date-0 tutorial differs in five province field values and 63 realm resource values. These are useful version/runtime observations, **not untouched general New Game snapshots**. Files under the unrelated Civil War demo directory are deliberately excluded.

The inspected source's `NewGameConfirmed` loads `rlmstart.dat`; `BeginRule2` selects the chosen regent, marks player control, transfers regent icons and links units. The pinned modified source also changes realm selectability. This establishes the route and explains why stored template records should not be advertised as every final starting state. It does not establish that each post-load adjustment in this modified revision matches the stock CD executable.

### Highest-value next experiment

Produce **paired, immediate New Game saves from the stock CD and each relevant patch**, starting with Roesone/default Marlae on Expert, then alternate regent and one different difficulty. Compare each against the template using `compareCampaigns`, keeping executable/version hashes and selected options. This directly tests resource preservation, selected-regent/unit changes, source/holding discrepancies and the remaining character serialization. It is more useful than guessing from progressed quick-start saves or executing the editor on the host.

If execution is necessary, use this controlled procedure:

1. Prepare a disposable isolated Windows 95/98 or XP VM with legally supplied OS/game media. Disable network adapters, shared clipboard, drag/drop, host filesystem mounts, USB passthrough and host integration.
2. Snapshot the clean VM. Transfer only copies of hashed game/editor inputs through a read-only virtual ISO; never launch those executables on the host. Keep version/patch experiments on separate snapshots.
3. Start the stock game, record selected realm/regent/difficulty, save immediately before taking actions, and record any displayed starting resources. For editor work, export an unchanged scenario, then a copy with exactly one changed field.
4. Shut down the guest. Copy only the resulting data/screenshot files out through an offline transfer image mounted read-only. Hash them and inspect as data with these bounded readers. Treat output filenames/contents as untrusted input.
5. Revert/delete the disposable guest through its VM manager after preserving the experiment log. No VM was created or historical executable run during M1A.

## Schema integration, validation and remaining gaps

`packages/world-data/anuire-research.ts` defines a Zod research schema with original semantics rather than weakening M0's scenario schema. It validates unique IDs/indices/source IDs, province/realm/regent references, realm-head membership, borders, holdings/forts, deployment locations, nonnegative resources and complete geometry/center identity coverage. The importer checks binary bounds and chain consistency before schema validation. Source conflicts, holding-capacity issues and asymmetric original borders remain explicit warnings.

The compatibility adapter invokes the **existing** `provinceDefinitionSchema`. It accepts 177 definitions and blocks 29 where M0 cannot express heavy mountains/swamp, multiple rings, source sums >10 or asymmetric links. Those are per-definition projections; links to blocked provinces remain intact. **The accepted subset is not a standalone scenario.** Its `maxLevel: 10` is an explicitly labelled M0 compatibility ceiling, not verified original canon, and the projected provenance is `INFERRED`. No made-up regent command/diplomacy stats, mottos, armies or treaties fill schema gaps.

The following were M1A barriers. M1B has resolved the representation/survival/selection barriers for experimental play; remaining original-rule verification is documented in the playability report:

- Extend the representation and rules deliberately for multiple geometry rings, original terrain/source bounds and fort levels; preserve original graph quirks or document independently justified corrections.
- Support holding-only domains and richer/asymmetric relationships without M0's landed-only defeat/shared-start assumptions.
- Decode/validate relationship matrix axes and full runtime state, variable character serialization, blood abilities, inventories, spells and trade routes.
- Certify actual stock/patch post-initialization conditions using paired saves; six placeholder identities remain unresolved, with no inference substituted.
- Reconcile PC-guide holding/character conflicts; expand unit/spell facts into explicit versioned rule catalogs when implementing those systems.
- Compare a retrieved printed map and dated PC screenshots; HD artistic coastline/river reconstruction is not certified by the hit map alone.

Public tests use synthetic binary/text/map fixtures; private CD tests are opt-in (`npm run test:original`) and fail on absent/stale/malformed data rather than shipping original fixtures. Playwright checks invalid imports, actual local corpus selection/focus and returning to normal M0 play; the actual-corpus test skips on machines without private extraction. Existing gameplay and deterministic regression tests continue to pass. No full stock initial campaign has yet been certified: **zero playable authentic campaigns, zero inferred province records**.

## Verification performed

On 2026-10-17: `npm test` passed 76 public tests (five private tests skipped by default); `npm run test:original` passed all five private tests. All five Playwright tests passed, including three existing gameplay flows and two research-import flows. The two preview flows and 15 parser/schema tests were also rerun after final validation changes and passed. Type checking, ESLint, Prettier, production build, release exclusion and Tauri configuration checks passed. The Covenant Marches JSON and core simulation files have no changes from `695e204`.

That paragraph and the legacy 177/29 projection describe the M1A snapshot. M1B extends the core while preserving the synthetic JSON and regression behavior; its adapter accepts all 206 geometries. It adds the previously omitted contested bit to extraction (province packed word @8, bit 23), without changing any original input. Current verification/performance is in [ANUIRE_PLAYABILITY_REPORT.md](ANUIRE_PLAYABILITY_REPORT.md); M1A research-preview readiness metadata is not the M1B runtime campaign policy.

Two consecutive extraction runs produced byte-identical `anuire.research.json` (SHA-256 `263a04aa7c10d4c050d74b70a56a62fe59a402cca43f2fd79e1250b9a25a66a1`). The original CD hash still matches the M0 inventory. The production bundle contains no private original files or campaign data. The build retains Vite's large-chunk advisory; Rust/Cargo remain unavailable, so a native Windows build was not performed. Screenshots of the full/focused preview were inspected locally and remain ignored under `test-results/`.
