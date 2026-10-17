# Asset pipeline

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
| **Total**                                  |          **9,501** |

There are 2,384 indexed bitmap records, 6,007 FLC records and 1,110 WAV recordings. All have decoded previews/audio. All 44 frames of 13 UI animations are exported. Other sprite animations retain first-frame previews and their original source records; the decoder supports full sequences for later gameplay. Nine palettes and 246 AVA-to-portrait mappings are retained.

RES framing/LZSS uses the original read-only extractor. Embedded PCX members are ten-byte-header indexed bitmaps, not ordinary PCX files. COL palettes contain an eight-byte header and 768 full 8-bit RGB bytes. PNG export preserves native indices/dimensions; source map art is opaque and UI cutouts use index-zero transparency. FLC supports palette/copy/black/BRUN/LC/SS2 chunks. Eleven observed COPY chunks underdeclare by one or two bytes; the bounded decoder accepts only data fitting within the enclosing frame tail. WAV data is preserved byte-for-byte, including harmless trailing non-audio bytes.

The original soundtrack has nine mono 22,050 Hz, 16-bit PCM recordings: 101, 103, 104, 106–111, totaling 22 minutes 11 seconds. No conversion is needed. The CUE has one MODE1/2352 data track and no CD audio tracks. Menu playback uses original 106; campaign playback explicitly labels original 101 as an alternate because realm cue 105 is absent. Battle cue 102 is also absent. A user-supplied `reference/original/MUSIC/105.WAV` is validated and selected on the next import. No unrelated replacement soundtrack is generated.

`audio.ts` activates after a user gesture, loops recordings, crossfades scene changes and persists music/effects volume, mute and track selection. UI click/error sounds are original 8010/8015. Browser and Tauri use same-origin media; the CSP allows those loads. Native WebView execution still needs verification on a machine with Rust/Cargo.

The classic presentation uses the original 420×480 shield menu, left regent/resource council, map, toolbar, portraits and materials. Modern targets are 1366×768 and **1920×1080**, with 640×480 as a reference. Font metrics, full heraldry assignment, exact dialog interiors and live advisor animation remain incomplete. Original/reference comparison captures can be regenerated with `scripts/capture-m1c-comparisons.mjs` using the saved local reference images and browser screenshots.

Detailed [format/palette findings](archive/ORIGINAL_ASSET_INVENTORY.md), [cue provenance/durations](archive/ORIGINAL_AUDIO_RESEARCH.md) and [UI coordinates/reference screenshots](archive/ORIGINAL_UI_RECONSTRUCTION.md) are preserved in the archive.
