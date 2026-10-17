# Data extraction report

No untrusted game/editor/patch executable was executed. Read-only methods were streaming hashing, byte parsing, PDF rendering, ZIP inspection, and listing/reading members with the installed UnRAR tool.

## Reproducible outputs

| Tool                                              | Output                                                                                                                | Redistribution status             |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `npm run inventory`                               | `docs/REFERENCE_INVENTORY.md`; private inventory JSON, disc directory, selected text/data and resource header summary | Only metadata Markdown is tracked |
| `py -3 packages/import-tools/manual.py`           | Private manual text, PDF inspection metadata and ZIP patch inventories/readmes                                        | Private; manual is mostly scanned |
| `node packages/import-tools/inspect-archives.mjs` | Private RAR listings/editor DAT/patch README; complete `.RES` entry metadata                                          | Private; Windows UnRAR dependency |

The CD image is MODE1/2352 according to its supplied CUE. User data begins 16 bytes into each 2352-byte sector, providing 2048 logical bytes. The tool verifies `CD001` at logical sector 16 and traverses ISO9660 directories without mounting. Volume: `BIRTHV10`. Directory records total 2,268 including directories; the image also contains unrelated Sierra demos, which must not be mistaken for Birthright data.

## Actual candidate contents

| File/type                        | Observed evidence                                                                                        | Interpretation / confidence                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `RULES.TXT` (217,350 bytes)      | Plain text help anchors, complete tax/muster/holding/action descriptions                                 | VERIFIED_ORIGINAL / high: primary mechanical reference                                              |
| `RLMSTART.DAT` (90,730 bytes)    | Structured binary, prefix `51 00 02 00`; no validated field map                                          | INFERRED / medium: campaign starting state candidate; import UNKNOWN                                |
| `SAVEGAME/*.SAV`, tutorial saves | Several equal 76,934-byte files, one tutorial expansion 90,934 bytes                                     | INFERRED / medium: strategic save variants; no reliable state decoder implemented                   |
| `STRDAT.DAT` (183,678 bytes)     | Binary/string resource file, referenced by scene/help tooling                                            | INFERRED: string-ID mapping candidate; record layout not validated                                  |
| `RESFILES/MAP.RES`               | Exactly three indexed members: `PROVMAP.PCX`, `LGMAP.PCX`, `SMMAP.PCX`                                   | VERIFIED_ORIGINAL / high for directory names: map artwork/container, not a proven province database |
| Other `.RES`                     | Named image/font/audio resources across 13 archives; directory bounds checked                            | VERIFIED_ORIGINAL / high for archive metadata; payload codecs not implemented                       |
| `.SCN`                           | `CASTLE.SCN` and `TEMPLATE.SCN` directly inspected: WAD/music/quest/adventure scene properties           | VERIFIED_ORIGINAL / high: scene metadata; not a strategic scenario format                           |
| `.WAD`                           | Present under WADS, supported as adventure maps by modding reference; patch lists replace adventure WADs | INFERRED/documented: no strategic data assumption and no full WAD parser yet                        |
| `.AVA`/`.INV`                    | Present in official patch archives; modding reference discusses character data                           | INFERRED: character/inventory candidates, not verified schema                                       |
| Scenario editor archive          | `SCENED95.EXE`, `SCENED.DAT`; DAT 183,967 bytes with build timestamp and UI names                        | VERIFIED_ORIGINAL container; UNKNOWN data layout; editor not launched                               |

The original 1.0.0.3 README states editor scenarios are loaded from the save directory and alter provinces, holdings, forces and alliances. This is the strongest documentary lead toward `.SAV`/campaign records. The terminology “scenario” does not establish that adventure `.SCN` files contain strategy data.

## Resource-directory verification

[The modding reference](https://www.kiranwelle.com/birthright/modding-reference/) and [BRUT](https://github.com/Shiryou/brut) identify `.RES` containers and compression/palette caveats. Actual supplied bytes provide additional constraints:

- Each observed directory entry is **22 bytes**: hash uint32, resource offset uint32, extension byte, **13-byte NUL-terminated filename field**. The tool verifies offsets and directory bounds. This differs from naively treating the documentation table's abbreviated filename field as four bytes.
- MAP.RES header bytes are `000400001203380003000000`. Reading the first four as little-endian uint32 produces **1024**, rather than the documentation's plain “version 4”. The tool records the raw value; no unsupported normalization is performed.
- MAP.RES directory offset is **3,670,802**, and its three members' offsets are 12, 16,791, and 2,928,545. Its total size is 3,670,868 bytes: 66 bytes remain for the three directory records, confirming the 22-byte stride.
- LZSS decompression, PCX palette recovery, and resource payload reconstruction are **not implemented**. Successfully indexing names is not the same as importing artwork or province geometry.

## Patch/package confidence

ZIP-compatible packages 1.0.0.2 DOS, 1.0.0.2 Windows and 1.0.0.3 DOS can be inspected with Python zipfile without invoking their SFX stubs. The Windows 1.0.0.3 installer is not ZIP-readable and remains unexpanded. The supplied scenario editor and package labelled 1.0.0.4 are RAR SFX and were listed with the trusted local UnRAR executable. The latter's README mentions BRPATCH3/DirectX 5 and does not independently establish its filename's version label.

Patch notes are documentary evidence of fixes. This session did not apply patches, compare game binaries, emulate the original, or verify that a given bug occurs/disappears at runtime.

## Import decision

Safe now: metadata/checksums and manually encoded, cited rule-table facts. No complete authentic campaign has been imported. The bundled world is wholly synthetic and carries TEMPORARY_PLACEHOLDER provenance. No extracted asset or original code is referenced by the frontend build.

Next: isolate an original installation/editor in a suitable legacy environment, compare controlled save edits, identify record counts/endianness/string IDs, prove adjacency and ownership semantics against independent views, then implement bounded parsers and fixtures. Keep decoder outputs private until permissions and provenance are resolved.
