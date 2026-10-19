# Birthright HD — investigation of the original audio

2026-10-18. Investigation only. The original image, imported asset pack, audio settings, and game implementation were not changed. No replacement disc, soundtrack, or game asset was downloaded. Historical source code was examined as supporting evidence; no original executable or installer was run.

**The previously reported missing `102.WAV` and `105.WAV` are present on this image, under `WAVE00/`. They are music recordings. The earlier importer missed all six loose `WAVE*` directories.** The nine files under `MUSIC/` are primarily Adventure cues, not the complete soundtrack. A separate defect exists: the image is one sector short at the end of `WINBR.EXE`; this does not affect the recovered audio.

This report supersedes the missing-audio conclusions in [the earlier audio research](archive/ORIGINAL_AUDIO_RESEARCH.md), [asset inventory](archive/ORIGINAL_ASSET_INVENTORY.md), [asset pipeline](ASSET_PIPELINE.md), and the audio entry in [known issues](KNOWN_ISSUES.md). Existing playback choices remain unchanged pending a separate implementation task.

## Previously missing filenames: both located

The project’s earlier research explicitly identified two missing basenames: **`102.WAV` and `105.WAV`**. No additional previously reported missing WAV basename was found in the project documentation or importer references.

| Previously reported filename | Actual CD path   | Use                                          |     Bytes | Duration | Encoding                             |
| ---------------------------- | ---------------- | -------------------------------------------- | --------: | -------: | ------------------------------------ |
| `102.WAV`                    | `WAVE00/102.WAV` | Battle / personal combat music, sound ID 102 | 1,966,644 | 89.185 s | RIFF PCM, mono, 22,050 Hz, **8-bit** |
| `105.WAV`                    | `WAVE00/105.WAV` | Strategic realm / domain music, sound ID 105 | 3,808,582 | 86.361 s | RIFF PCM, mono, 22,050 Hz, 16-bit    |

Both have complete RIFF containers and PCM data chunks. Their absence from `MUSIC/` and `WAVE.RES` is real, but those are not their loading locations. No alternative extension, CD-audio rip, or reconstruction is required to recover them.

| Property                              |                                                   `WAVE00/102.WAV` |                                                   `WAVE00/105.WAV` |
| ------------------------------------- | -----------------------------------------------------------------: | -----------------------------------------------------------------: |
| Starting logical sector, zero-based   |                                                             252559 |                                                             254595 |
| Logical ISO byte offset               |                                                          517240832 |                                                          521410560 |
| Physical BIN byte offset of file data |                                                          594018784 |                                                          598807456 |
| PCM sample bytes                      |                                                            1966522 |                                                            3808536 |
| SHA-256                               | `487f01633cd084cd0d67c254041c73ede6b3507c513292eb3f0089c84e05d0c0` | `04d2c25eee27f5f9b71bda685f880bf9d38cc1d62305c517f9bd7739e89e7dfc` |

Physical offsets account for 2,352-byte sectors and the 16-byte MODE1 sector header. File bytes must be read as 2,048-byte logical payloads, not as one contiguous physical BIN slice.

Independent installer evidence is unusually explicit: the disc’s `SIERRA.INF`, at byte offsets **5626** and **5687**, names `WAVE00\102.WAV` and `WAVE00\105.WAV` in the small-install file group. The installer’s approximate size fields are not the actual file lengths; the lengths above come from the directory and validated file bytes. The full entries are preserved in [installer-and-adventure-text.json](../reference/extracted/audio-investigation/installer-and-adventure-text.json).

## What the retail executable actually loads

The supplied Windows binary was examined statically. Its readable prefix is 1,693,696 bytes, SHA-256 `7d77f6bc47ea8f727682053bbcd5a448a8ad02550d5d1507490b936a3cd9cf21`. Audio code and its strings are fully within that prefix; the missing final sector is in Windows resources.

The function matching historical `PlayTrack` begins at virtual address **`0x0053BFC0`**, file offset **`0x12C3C0`**. Its actual instructions establish these separate namespaces:

| Requested cue           | Retail executable behavior                                    | Original storage                                                           |
| ----------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 2                       | Branch at `0x0053C04C`; requests sound ID 102 at `0x0053C143` | `WAVE00/102.WAV`                                                           |
| 5                       | Branch at `0x0053C031`; requests sound ID 105 at `0x0053C18C` | `WAVE00/105.WAV`                                                           |
| 103                     | Requests sound ID 103 directly at `0x0053C168`                | **`WAVE00/103.WAV`**                                                       |
| 112                     | Randomly selects IDs 112–116                                  | Victory cues in `WAVE00/`                                                  |
| 118                     | Randomly selects IDs 118–122                                  | Defeat cues in `WAVE00/`                                                   |
| 123 / 124               | Selects those sound IDs                                       | Combat defeat / game victory cues in `WAVE00/`                             |
| Other normal scene cues | Requests ID 499                                               | Temporary local `499.WAV`, populated from the selected Adventure recording |

The sound provider at **`0x0053C6AC`** handles ID 499 specially, then routes other IDs by range. IDs below 10000 use `wave00\%d.WAV`; subsequent ranges use `wave10`, `wave20`, `wave30`, `wave384`, and `waveloop`. Its companion resource lookup is at `0x0053C5E0`. The historical [custom audio provider](https://github.com/fire-lizard/birthrt/blob/005b7d3dd1701423a4ce7f8c878d27f791dabd63/CUSTMSYS.CPP#L49) describes the same resource-first / loose-file fallback mechanism.

The Adventure copy routine is at **`0x0053C220`**. At `0x0053C23F`, it adds 100 to the scene cue and constructs a CD pathname using `music\` and `%s%s%d.wav`; it then creates the local file for ID 499. These strings occur at file offsets `0x14EC20` and `0x14EC28`. Therefore **`499.WAV` is a generated playback cache, not a missing soundtrack master**. Scene loading reads the numeric `[Music]` field, and Adventure initialization starts the selected cue. [Scene parser](https://github.com/fire-lizard/birthrt/blob/005b7d3dd1701423a4ce7f8c878d27f791dabd63/SCENE.CPP#L1020), [Adventure initialization](https://github.com/fire-lizard/birthrt/blob/005b7d3dd1701423a4ce7f8c878d27f791dabd63/SCNAI.CPP#L913).

The resource table registers WAV as extension **3**, with numeric filename hashing. All 1,101 `WAVE.RES` entries have IDs consistent with their numeric basenames. IDs 102, 103, 105, 112–124 and 32421 are absent from that archive but available as loose files. Thus a missing archive member does not imply a missing audio asset. [Resource registration and hashing](https://github.com/fire-lizard/birthrt/blob/005b7d3dd1701423a4ce7f8c878d27f791dabd63/RESMANAG.C#L203).

Windows PE resources were also enumerated: 75 leaves, containing cursors, icons, menus, dialogs, strings, grouped cursors/icons, and version information. No embedded WAVE or RCDATA music bank was identified. A grouped-cursor resource numbered 102 is an unrelated resource namespace, not the battle recording.

Evidence files: [retail binary analysis](../reference/extracted/audio-investigation/winbr-analysis.json), [instruction cross-references](../reference/extracted/audio-investigation/winbr-disassembly.json), and [focused loader disassembly](../reference/extracted/audio-investigation/loader-disassembly.json). Virtual addresses above are for this binary only.

## Strategic gameplay, combat, and screen cues

| Situation                           | Established original audio                  | Evidence and limits                                                                                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starting domain / strategic play    | `WAVE00/105.WAV`                            | Realm cue 5; `CHARSEL.CPP` starts it when initializing the selected regent’s campaign.                                                                                                                                                                         |
| Personal combat within an Adventure | `WAVE00/102.WAV`                            | `COMBAT_SCENE_DATA::mfInitCombatVals` saves the previous cue and starts `REDBOOK_PERSCOMBAT` (2); its restore routine reinstates the previous Adventure cue.                                                                                                   |
| Tactical battle music               | `WAVE00/102.WAV` is the declared battle cue | Header assigns battle cue 2; `BATTLE.SCN` contains `[Music] 2`. However, the 16 `BATL[MPSW][0–3].SCN` maps contain cue 100, and one battle-screen start call is commented out. Do not infer uninterrupted music in every tactical battle solely from the enum. |
| Credits                             | `WAVE00/103.WAV`, 44.883 s                  | `PlayCredits` calls cue **103**, which selects the direct sound ID rather than Adventure cue 3.                                                                                                                                                                |
| Victory screen                      | `WAVE00/112.WAV`–`116.WAV`                  | Five randomized musical cues, 5.511–9.658 s.                                                                                                                                                                                                                   |
| Defeat screen                       | `WAVE00/118.WAV`–`122.WAV`                  | Five randomized musical cues, 9.775–18.573 s.                                                                                                                                                                                                                  |
| Combat defeat cue                   | `WAVE00/123.WAV`, 17.797 s                  | Named `SND_LOSE_COMBAT_MUSIC1`; routing confirmed. Its presence does not prove every defeat flow calls it.                                                                                                                                                     |
| Winning the game / finale           | `WAVE00/124.WAV`, 50.380 s                  | `SND_WIN_GAME_MUSIC1`; used by the finale/game-win routines.                                                                                                                                                                                                   |
| Opening historical narration        | `WAVE30/32421.WAV`, 202.666 s               | `SND_INTRO_FLC_VOX1`, started by the intro sequence. This is an intro voice asset; length alone does not make it strategic background music.                                                                                                                   |
| Main menu                           | Exact first-entry music remains unconfirmed | No evidence justifies assigning `MUSIC/106.WAV` to the retail main menu. The historical header names cue 6 “intro,” but that is not a verified menu call site. The current HD menu assignment was a presentation choice.                                       |

The relevant historical call sites are [campaign start](https://github.com/fire-lizard/birthrt/blob/005b7d3dd1701423a4ce7f8c878d27f791dabd63/CHARSEL.CPP#L1377), [personal-combat entry and restoration](https://github.com/fire-lizard/birthrt/blob/005b7d3dd1701423a4ce7f8c878d27f791dabd63/COMBDATA.CPP#L247), [screen outcome routines](https://github.com/fire-lizard/birthrt/blob/005b7d3dd1701423a4ce7f8c878d27f791dabd63/GAME.CPP#L2996), and [credits](https://github.com/fire-lizard/birthrt/blob/005b7d3dd1701423a4ce7f8c878d27f791dabd63/MAIN.CPP#L1581).

`WAVE00/117.WAV` is an additional 16.865-second recording. The source’s victory randomizer stops at 116, so 117 remains **unassigned**, rather than being presented as a confirmed sixth victory cue. `50350.WAV` is named in demo slideshow source but was not found; no reachable retail soundtrack use was established for that demo cue.

## The nine Adventure recordings

All nine are original loose files under the CD’s **`MUSIC/`** directory. They are RIFF PCM format 1, mono, 22,050 Hz, 16-bit, totaling **1,330.977 seconds (22:10.977)**. No authored song titles were recovered; the filenames below are their original identities.

The following assignments use the **26-entry Adventure-site table in the supplied executable**, beginning at file offset **`0x153FA8`**, joined to the actual disc `[Music]` fields. Human-readable place names are corroborated by the historical place-name table. This distinguishes playable Adventure sites from the many leftover scene/test definitions.

| CD filename     | Scene cue |  Duration | Assignments among the 26 retail Adventure sites                                                                 |
| --------------- | --------: | --------: | --------------------------------------------------------------------------------------------------------------- |
| `MUSIC/101.WAV` |         1 | 147.790 s | Lofton (`LOFTO_MW`)                                                                                             |
| `MUSIC/103.WAV` |         3 | 131.834 s | Barrow Hill (`BARRO_MW`); Falcon’s Roost (`FALCOMW`)                                                            |
| `MUSIC/104.WAV` |         4 | 158.722 s | Rose Palace (`NOWEL_KW`); Castle Aglondier (`ILIEN_MW`); Caer Callin (`CALRI_KW`); Drak-mal Castle (`SONNE_KW`) |
| `MUSIC/106.WAV` |         6 | 155.339 s | Black Stone (`BLACK_PW`); Stormpoint (`STORM_KW`); Malentor’s Tower (`DOOM_MW`); Barrow Mound (`SHADC_MW`)      |
| `MUSIC/107.WAV` |         7 | 126.003 s | Caerlinien (`CAERL_KW`); Aerele (`AEREL_MW`); Ansien (`ANSIE_TW`)                                               |
| `MUSIC/108.WAV` |         8 | 192.566 s | Spirit’s End (`SHADG_TW`); Tower Ruannoch (`RHOUB_KW`)                                                          |
| `MUSIC/109.WAV` |         9 | 188.030 s | Bindier (`BINDI_MW`); Winterroot (`WINTE_XX`); Kal-Saitharak (`FELLP_KW`)                                       |
| `MUSIC/110.WAV` |        10 | 146.307 s | Braeme (`BRAEM_MW`); Elfwash Keep (`BORD_KG`); Ruorven (`ROURV_MW`); Castle Haes (`HAES_KW`)                    |
| `MUSIC/111.WAV` |        11 |  84.387 s | Brak-Nor Castle (`ENDIE_MW`); Gaelin’s Keep (`MOONS_KW`)                                                        |

The remaining retail site, Spider’s Lair (`SPIDFELL`), specifies **100**, the sentinel excluded by the automatic music-restart logic. It is not evidence of a missing `200.WAV`. Personal combat can independently switch to cue 2.

Further scene files provide additional assignments: `TUTOR.SCN` uses 1, `ROURV2MW.SCN` uses 1, and `INTRO.SCN` uses 6; second levels such as `LOFTO2MW.SCN` can use a different cue from the first level. All **78** Birthright `.SCN` definitions are listed in [scenes.json](../reference/extracted/audio-investigation/scenes.json). Some leftover scenes reference WADs absent from the disc, so scene presence alone does not prove retail reachability. The legacy text values `flute1`, `fileName`, and `demo_btl` are not validated requests for correspondingly named WAVs: the numeric parser converts such text to zero.

**Preserve both files named 103.** `MUSIC/103.WAV` is a 131.834-second Adventure recording, SHA-256 `13c881cb76efbe02fa2e55c217abb0ac671a5cd6237d8d8f3cb5e54904484f10`. `WAVE00/103.WAV` is the 44.883-second credits recording, SHA-256 `5b28e6231a140d36dc9331f1c6f51a79fc05b0401b4b830e014ff2029a8ef818`. Deduplicating by basename would destroy this distinction.

The exact executable table and all joined assignments are preserved in [retail-adventure-table.json](../reference/extracted/audio-investigation/retail-adventure-table.json); the supporting historical table is [CHARSEL.CPP](https://github.com/fire-lizard/birthrt/blob/005b7d3dd1701423a4ce7f8c878d27f791dabd63/CHARSEL.CPP#L109).

## Whole-disc and container search

Input: `reference/original/RPGBGA.BIN`, **674,671,200 bytes**, SHA-256 **`62b0049a550d046f22e6707ff831df67b456f5959306556ef3569f587b3f945d`**. This matches the prior inventory. The original bytes remain unchanged.

| Search area                                | Result                                                                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ISO9660 directory                          | 2,184 files and 84 directories, traversed without filtering hidden or associated entries                                                            |
| Joliet supplementary directory (`%/E`)     | Same 2,268 records; no additional file extents or lengths                                                                                           |
| Hidden / associated ISO records            | None in either directory tree                                                                                                                       |
| All raw sectors                            | 286,850 sectors; every sector has MODE1 framing, valid sync, and a matching EDC                                                                     |
| Unallocated logical space                  | No additional RIFF/WAVE recording header found; numbered filename hits outside files resolve to directory metadata                                  |
| All 13 Birthright `.RES` containers        | All **9,492** directory entries unpacked and inspected; no decoding errors                                                                          |
| `WAVE.RES`                                 | 1,101 valid PCM WAV members; numeric sound IDs, extension 3                                                                                         |
| All 51 Birthright `.WAD` files             | Directories and lump bounds checked; only map lumps (`THINGS`, `LINEDEFS`, `SIDEDEFS`, etc.), no audio lumps or media signatures                    |
| Installer manifests                        | `SIERRA.INF` directly identifies the two music files in `WAVE00`; `INSTALL.SCR` and configuration files also inspected                              |
| Three ZIP patch packages                   | Every member decompressed with CRC checking: 9, 9, and 400 entries; no audio members or embedded media signatures found                             |
| Two RAR SFX packages                       | Editor: 2 entries; supplied package labelled 1.0.0.4: 401 entries. All member data streamed with trusted UnRAR; no audio signatures found           |
| Windows 1.0.0.3 GLBS installer             | Raw strings/signatures inspected; its proprietary compressed payload was not unpacked                                                               |
| Other bundled demos and support installers | Entire readable files scanned for names and media signatures; proprietary SCI/demo banks and `DISK01DH91` installer packages were not fully decoded |

The last two rows are limits on a universal absence claim. They do not prevent recovery of the requested music, whose complete files are already located directly on the disc. No hidden soundtrack is being asserted absent from every opaque third-party container.

Audio locations belonging to Birthright are:

| Location            |                             WAV files / members |
| ------------------- | ----------------------------------------------: |
| `MUSIC/`            |                                               9 |
| `RESFILES/WAVE.RES` |                                           1,101 |
| `WAVE00/`           |                                              90 |
| `WAVE10/`           |                                               3 |
| `WAVE20/`           |                                              13 |
| `WAVE30/`           |                                              39 |
| `WAVE384/`          |                                              40 |
| `WAVELOOP/`         |                                               9 |
| **Total**           | **1,304 locations; 1,294 distinct file hashes** |

The **194 loose `WAVE*` paths** do not overlap the archive’s WAV basenames. They contain **188 distinct additional file hashes** beyond the existing catalog; some different IDs intentionally contain identical bytes. Every loose WAV exceeds 65,535 bytes (minimum 65,694); every decoded `WAVE.RES` member is smaller (maximum 64,706). This matches the audio provider’s distinction between memory-resident resources and streamed loose samples.

All 194 exact paths, sizes, formats, durations, and available source ID names are listed in [the audio appendix](AUDIO_ASSET_APPENDIX.md). Full hashes and offsets are in [overlooked-loose-audio.json](../reference/extracted/audio-investigation/overlooked-loose-audio.json).

### CD Audio, alternative extensions, and embedded audio

The supplied CUE declares one `MODE1/2352` track and **no AUDIO tracks**. Sector inspection independently confirms that all sectors actually present are MODE1 data, rather than unlisted appended Red Book audio. The examined retail `PlayTrack` function routes to WAV sound IDs and the Adventure cache, not to a CD-audio call. Historical `UseTheCD` branches and comments in later ports do not establish this image’s playback format.

The signature scan found no Birthright MIDI, XMIDI, Ogg, or FLAC sequence/recording in the inspected files or unpacked resources. Thirty-two valid MIDI headers are under **`REALM/`**, the separate Sierra game/demo; this directory is unrelated to Birthright’s realm gameplay. `CIVILWAR/.../CDMUSIC/INTRO.RAW` contains a RIFF/WAVE recording despite its extension, but belongs to the Civil War demo. Neither is a candidate replacement soundtrack.

There is genuine embedded cinematic audio in the root **`LOGO.SMK`**: a 6,641,396-byte `SMK2` movie, 640×480, 260 frames, with a nonzero first audio-channel descriptor. Its header metadata is preserved in [cinematics.json](../reference/extracted/audio-investigation/cinematics.json). It was not decoded into a soundtrack file or assigned to strategic play. The intro’s long numbered voice asset and animation-triggered sound cues must likewise remain distinct from background music.

## Image completeness and extraction diagnosis

The filesystem declares **286,851 logical sectors**, but the BIN contains **286,850 complete raw sectors**. The expected final sector, LBA **286850**, is absent: a difference of **2,352 physical bytes / 2,048 logical bytes**.

Only one directory entry extends beyond the supplied bytes: `WINBR.EXE`, starting at LBA 286023, declares **1,695,744 bytes**, while **1,693,696 bytes** are readable. Its missing tail intersects Windows string resources and later grouped cursor/icon/version resource data. All other file extents, including every located music/effect file and RES archive, fit within the image. Valid EDCs establish sector-level consistency of the supplied sectors, not completeness of an original pressing.

Consequently, **the image is technically truncated, and the audio problem is independently an extraction omission**. Replacing the image is unnecessary to recover 102, 105, or the other loose audio already present. This investigation cannot certify every original game edition’s soundtrack or every unused source-code cue as complete.

The importer’s omission is concrete: [its loose-audio loop](../scripts/import-original-assets.ts#L258) accepts only paths matching `MUSIC/*.WAV`. Its archive loop handles `WAVE.RES`, but it never walks the six loose `WAVE*` directories. The reuse check also considers only `MUSIC/`, so rerunning the current importer retains the incomplete catalog. Its optional `reference/original/MUSIC/105.WAV` path and campaign fallback are based on the earlier mistaken absence diagnosis; they are not needed to recover this disc’s actual `WAVE00/105.WAV`.

The modern source revision previously cited contains explicit substitutions of 102/105. For this investigation, the **earliest repository revision `005b7d3dd1701423a4ce7f8c878d27f791dabd63`** was inspected instead, and the key routing was independently confirmed against the supplied executable. That repository is historical source evidence, not a guarantee that every source line matches this release.

## Recommended recovery work, after this investigation

1. Extend a future importer to enumerate all six loose `WAVE*` directories and preserve all 194 original paths, IDs, hashes, and bytes. Keep source path as identity; do not collapse the two 103 recordings or identical samples with different IDs.
2. Use recovered `WAVE00/105.WAV` for established realm/domain contexts and `WAVE00/102.WAV` for established combat transitions. Preserve its native 8-bit PCM data. No music substitution or resynthesis is necessary.
3. Keep the nine Adventure recordings separate and drive their selection from the original scene cue table, including per-level changes, saved/restored combat cues, and the 100 sentinel. Preserve the distinction between cue 3 and direct sound ID 103.
4. Catalog victory/defeat/finale music, narration, voices, ambience, and effects separately. Retain unresolved files such as 117 without invented titles or usage claims.
5. Verify original main-menu timing and tactical battle transitions in an authorized legacy playback session before claiming exact screen behavior. Static evidence already recovers the files; this follow-up addresses transition timing and runtime conditions.
6. Preserve the current image and audit hashes. Address the missing final executable sector separately by comparing a user-owned verified copy or an appropriate supplied patch. Do not manufacture a padded “repair” or replace audio to compensate for this unrelated defect.

None of these implementation or recovery changes has been applied.

## Reproduction and retained evidence

Run the read-only audit with:

```powershell
node --experimental-strip-types scripts/investigate-audio.ts
python scripts/audit-audio-binaries.py
```

The first command writes metadata to `reference/extracted/audio-investigation/` and compares against the existing `reference/assets/manifest.json`; it does not import audio. The second inspects the existing extracted Windows binary and supplied ZIP/RAR packages. Capstone is optional for disassembly and was available in the private research-tools directory for this run. Historical source-table annotations use the cached, pinned source revision.

The evidence directory retains the full ISO/Joliet listings, raw scan and checksums, all RES member metadata, all WAV hashes/formats/durations, all scene cues, the retail Adventure table, executable resource trees and disassembly references, installer texts, and package audit results. Source downloads and tool dependencies remain in the ignored research cache. No copyrighted audio or historical implementation source was added to tracked project files.
