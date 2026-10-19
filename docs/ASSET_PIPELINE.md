# Asset pipeline

The main menu (including the in-game menu) and campaign menu-button logo use the user-supplied birthright.net artwork at `apps/game/public/art/branding/birthright-logo-hd.png` (1377×768 RGBA, SHA-256 `b6d48cf3be87725847cffd43db899a4bb2334a8aa8890c26c08d0e9826ddd494`). The PNG is displayed unchanged with proportional containment and its existing transparency. The recovered `UI/MAINPANL.PCX` remains the lower shield/button artwork; its baked-in upper emblem is hidden only in presentation. Original files and `UI/MAINPANL.PCX` / `UI/LOGO.PCX` manifest mappings remain available.

Original graphics and audio are standard game assets. One command prepares them, one runtime path serves them, and one build includes them. **All recovered original resources are retained**, including currently unused font sheets, alternate buttons, animations, battle sprites, voices and adventure illustrations.

```powershell
npm run assets:import
```

Input defaults to `reference/original/RPGBGA.BIN`. Output is `reference/assets/`; campaign research is `reference/extracted/anuire/`. The importer opens the CD read-only, reconstructs missing campaign data and reuses complete asset outputs when source archive/palette/music hashes match. It does not delete unreferenced assets or repeatedly decode an unchanged complete catalog. Use `npm run assets:import -- --force` after intentionally changing decoding algorithms to regenerate previews; otherwise retain the default reuse path.

`scripts/game-assets-plugin.ts` serves `/original/` in development. `npm run build` copies the complete recovered catalog plus campaign JSON into `apps/game/dist/original/`. Preview and Tauri load these compiled files directly. There are no alternate bundles or optional procedural campaign presentation.

The app reads compact `runtime.json`; the browsable [local catalog](http://127.0.0.1:5173/original/catalog.html) reads the full `manifest.json`. Filtering, category selection, native-size thumbnails, pagination, audio controls and UI animation previews are retained. Manifests preserve member names, archive offsets, packed lengths, unpacked hashes, dimensions, palette/transparency metadata, frame timing and PCM duration. Asset identity/path loading remains independent of simulation so artwork can be replaced later.

| Content                                    |            Records |
| ------------------------------------------ | -----------------: |
| FINALE.RES / INTRO.RES                     |            63 / 22 |
| FONT.RES                                   |                 23 |
| HIGHRES.RES / LOWRES.RES                   |      2,277 / 1,154 |
| MEDFTRES.RES / MEDRTRES.RES / MEDSTRES.RES | 1,031 / 1,488 / 44 |
| MAP.RES                                    |                  3 |
| TEXTURES.RES / THINGPCX.RES                |          582 / 308 |
| UI.RES                                     |              1,396 |
| WAVE.RES                                   |              1,101 |
| Loose music WAVs                           |                  9 |
| Loose WAVE00/10/20/30/384/LOOP WAVs        |                194 |
| **Total**                                  |          **9,695** |

There are 2,384 indexed bitmap records, 6,007 FLC records and 1,304 WAV recordings. All have decoded previews/audio. All 44 frames of 13 UI animations are exported. Other sprite animations retain first-frame previews and their original source records; the decoder supports full sequences for later gameplay. Nine palettes and 246 AVA-to-portrait mappings are retained.

RES framing/LZSS uses the original read-only extractor. Embedded PCX members are ten-byte-header indexed bitmaps, not ordinary PCX files. COL palettes contain an eight-byte header and 768 full 8-bit RGB bytes. PNG export preserves native indices/dimensions; source map art is opaque and UI cutouts use index-zero transparency. FLC supports palette/copy/black/BRUN/LC/SS2 chunks. Eleven observed COPY chunks underdeclare by one or two bytes; the bounded decoder accepts only data fitting within the enclosing frame tail. WAV data is preserved byte-for-byte, including harmless trailing non-audio bytes.

The complete recovered audio catalog contains the nine Adventure recordings in `MUSIC/`, 1,101 `WAVE.RES` members and 194 streamed files from the six loose `WAVE*` directories. All 194 paths retain their original IDs and bytes; they contain 188 additional distinct hashes. Realm music is `WAVE00/105.WAV`; battle music is `WAVE00/102.WAV` (native 8-bit PCM). `WAVE00/103.WAV` is credits music and remains separate from the Adventure recording `MUSIC/103.WAV`. Victory, defeat, finale, voices and ambience remain registered for appropriate contexts. The single-track CUE is not an audio blocker. See [the investigation](AUDIO_ASSET_INVESTIGATION.md) and [full recovered file list](AUDIO_ASSET_APPENDIX.md).

`npm run assets:import` upgrades an existing catalog without re-decoding unchanged graphics and checks the loose audio hashes on every run. Existing imported recordings, including an optional previously supplied recording, are retained. Native PCM WAVs are copied byte-for-byte; extraction failures identify the actual source path and stop the import.

`audio.ts` uses one looping HTML media element, starts or resumes after user interaction, and pauses for Music Off, master mute or zero music volume. Music enabled, music/effects volumes, master mute and explicit recording overrides persist independently. Options keeps every reversing control accessible, displays current playback/error state and uses the restored parchment/scroll and original leather assets. UI click/error sounds are 8010/8015; council feedback uses the short UI status cue 8020, and accepted realm-spell casts use general magic 2200. Long dialogue never starts merely from opening a council. Main-menu playback retains 106 as a presentation choice; its exact retail assignment is unverified.

Recording choices saved before recovery of the realm cue migrate once to the original strategy default (105). Other preferences are preserved. Newly saved manual recording choices carry a soundtrack version and remain deliberate overrides on later loads.

The classic presentation uses the original 420×480 shield menu, left regent/resource council, map, toolbar, portraits and materials. Modern targets are 1366×768 and **1920×1080**, with 640×480 as a reference. Font metrics, full heraldry assignment, exact dialog interiors and live advisor animation remain incomplete. Original/reference comparison captures can be regenerated with `scripts/capture-m1c-comparisons.mjs` using the saved local reference images and browser screenshots.

Detailed [format/palette findings](archive/ORIGINAL_ASSET_INVENTORY.md), [cue provenance/durations](archive/ORIGINAL_AUDIO_RESEARCH.md) and [UI coordinates/reference screenshots](archive/ORIGINAL_UI_RECONSTRUCTION.md) are preserved in the archive.

M1D-0B corrects six studies toward faithful textured raster restoration. The [local comparison gallery](http://127.0.0.1:5173/original/enhanced/index.html) shows enlarged originals, rejected M1D-0 redraws and raster trials at matching dimensions; its archive preserves the original 24-item review. **User-approved:** M1D-0B plain/purple-ribbon scrolls, the parchment/B panel and gold (explicitly overriding the earlier negative gold assessment). Both successful M1D-0 HD portraits are retained. Leather, crown and all other unlisted elements require individual selection by quality, with no automatic adoption. Persistent decisions live in `packages/import-tools/art-selections.json`; `enhanced/selections.json` is the gallery copy. `enhanced/restorations.json` adds review statuses, crop/display coordinates and hashes without changing original source mappings. PNG masters and prompts remain in `enhanced/restoration/`. `node scripts/review-restorations.mjs` refreshes the review; `npm run assets:enhance` regenerates historical vector studies only. Original artwork and portrait masters remain unchanged; M1D-1 integrates these explicit choices into the main strategic screen.

M1D-1 uses a 400 px council at 1920×1080, 18–20 px primary text, enlarged cropped icons, nine-slice restored scrolls, and a persistent selected-province summary. Original textured action tiles, crown, generic council emblem and leather are chosen individually; the emblem is not assigned as a verified realm coat of arms. The map retains all 206 original geometries, with screen-size labels, collision suppression and cropped troop sprites. Simulation and other dialogs are unchanged. The reviewed capture is `test-results/m1d1-strategy-1920.png`.

The primary laptop target is now **1366×768**, including **1366×650** of usable browser content. Its 332 px council preserves a vertical command list and moves End season to the bottom toolbar; redundant toolbar shortcuts collapse while all councils remain available. Portrait/details adapt to available height. Map labels follow actual zoom, and resizing preserves the camera instead of forcing Fit map. Laptop captures are `test-results/strategy-laptop-1366x768.png` and `test-results/strategy-laptop-1366x650.png`.

## Campaign events integration — 2026-10-18

The existing importer incrementally recovers loose INTRO/GORGON2–4.FLC and TEXT/GORGON1–3.TXT, retaining source paths, hashes, palettes, frame counts/timing and full PNG sequences. It also maps original campaign immediate report strings from STRDAT.DAT to event IDs with string offsets/provenance under private reference/assets/text. Runtime exposes these alongside existing audio; proprietary media/text remain private imported outputs. Complete prior recoveries are reused. See [implementation report](CAMPAIGN_EVENTS_IMPLEMENTATION_REPORT.md).
