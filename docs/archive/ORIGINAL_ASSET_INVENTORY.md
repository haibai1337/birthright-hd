> Historical research snapshot. Runtime/build instructions and milestone limitations below may be superseded. Current documentation starts at [README](../../README.md), [Anuire data](../ANUIRE_DATA.md) and [asset pipeline](../ASSET_PIPELINE.md). Binary layouts, source IDs, offsets and extraction findings are preserved here.

# Original asset inventory — M1C

2026-10-17. Source: the user's `reference/original/RPGBGA.BIN`, SHA-256 `62b0049a550d046f22e6707ff831df67b456f5959306556ef3569f587b3f945d`. The image is opened read-only through the existing ISO9660 reader. No historical binaries are executed.

## Reproduce and browse

```powershell
cd C:\birthright-hd
npm run assets:import
npm run dev
```

Open `http://127.0.0.1:5173/_private/catalog.html`. Filter by original name or category, click a thumbnail for its native-size PNG, or play an audio entry. Output is `C:\birthright-hd\reference\private-assets`, ignored by Git. The manifest retains archive/member identity, resource-header offset, packed size, unpacked SHA-256, dimensions, palette source, transparency index, animation frame count/timing and audio format/duration. Archive hashes and all nine COL files are included. Offsets for loose music files are logical ISO byte offsets; RES member offsets are relative to that archive.

The importer accepts an alternate BIN/ISO pathname as its first argument. The installed image remains unchanged. `npm run research:anuire` remains the separate campaign-data extraction step.

The game loads a compact `runtime.json` (120,606 bytes for this pack); the browsable catalog uses the complete 6,726,091-byte `manifest.json`. Startup does not parse thousands of unused battle/adventure preview records. Reload the page after creating or replacing a local pack.

## Completed extraction

| Archive           |   Records | Content                             |
| ----------------- | --------: | ----------------------------------- |
| FINALE.RES        |        63 | Finale illustrations                |
| FONT.RES          |        23 | Original bitmap font/glyph sheets   |
| HIGHRES.RES       |     2,277 | FLC character/unit sprites          |
| INTRO.RES         |        22 | Intro images                        |
| LOWRES.RES        |     1,154 | FLC character/unit sprites          |
| MAP.RES           |         3 | LGMAP, SMMAP, PROVMAP               |
| MEDFTRES.RES      |     1,031 | FLC sprites                         |
| MEDRTRES.RES      |     1,488 | FLC sprites                         |
| MEDSTRES.RES      |        44 | FLC sprites                         |
| TEXTURES.RES      |       582 | Terrain/building textures           |
| THINGPCX.RES      |       308 | Object illustrations                |
| UI.RES            |     1,396 | 1,383 bitmaps and 13 FLC animations |
| WAVE.RES          |     1,101 | PCM effects, voices and ambience    |
| Loose MUSIC/*.WAV |         9 | Original recorded soundtrack        |
| **Total**         | **9,501** | **All decoded successfully**        |

There are 2,384 indexed bitmap records, 6,007 FLC records and 1,110 WAV recordings. All FLC records have decoded first-frame previews; all frames of the 13 UI animations are exported (44 frames in total). This does **not** mean all frames of the 5,994 adventure/battle sprite animations have been exported. That would be unnecessary for the current strategic interface. The reusable decoder can decode their complete sequences when requested.

The manifest resolves 246 supplied text AVA definitions to available large portraits. Marlae Roesone's AVA type 99 resolves to `LGLORDF2.PCX`; this is a shared original character-art type, not a newly invented unique portrait. Factual type/resource-name metadata is retained in `art-identities.ts`, with its pinned research reference. It contains filenames/indices, no historical implementation code.

## Formats and corrections

RES framing and LZSS reuse the read-only M1A decoder. The embedded `.PCX` members are the game's decoded indexed-bitmap representation: ten-byte header followed by top-to-bottom indices. They are not ordinary standalone PCX files. PNG export preserves the indices and dimensions without resampling. `DEFAULT.COL` has an eight-byte header followed by 768 full 8-bit RGB values; treating these as six-bit VGA values causes color corruption. Map images remain opaque. UI cutouts use index-zero transparency. Intro previews select INTROPAL; non-strategic intro/finale palette choices have not all been compared with live original playback.

FLC decoding supports palette updates, literal/copy, black, byte-run, byte-delta and word-delta chunks. Eleven source animations under-declare their final COPY payload by one or two bytes. Only when those pixels fit inside the enclosing frame's two-byte tail does the decoder accept that observed variant. It never reads outside the frame. The source bytes and hash remain intact.

Some WAV members contain non-audio trailing bytes. Inspection validates the RIFF container and first PCM data chunk, and does not interpret the tail as additional audio chunks. The files are copied byte-for-byte; samples are not generated or recompressed.

## Reference verification and limits

The requested [Spriters Resource collection](https://www.spriters-resource.com/pc_computer/birthrightthegorgonsalliance/asset/561063/) could not be fetched (HTTP 403/cache failure). Its reported 1,507 graphics therefore have **not** been established as identical to this disc's 1,396 UI records. Do not describe the 111-record difference as missing/corrupt disc assets without comparing the actual collection/version. MAINPANL (420×480), MENBTN1A (290×24), SCRLBTN0 (128×24), MAP48_IC (54×54) and LOGO (32×32) were recovered directly from the disc.

The recovered shield and strategic artwork were visually compared with the original Windows captures linked in [ORIGINAL_UI_RECONSTRUCTION.md](ORIGINAL_UI_RECONSTRUCTION.md). The complete resource directory decoded without a missing member. Music cues 102 and 105 are absent; see the audio report. Demo-game directories on the same CD are intentionally excluded. Smacker cinematics and standalone cursor PCX files are inventoried by the earlier disc audit but are not integrated as strategic assets in M1C.

## Private packaging

`npm run build` produces a clean frontend and never copies the pack. `npm run release:check` explicitly rejects `_private` and `PRIVATE_BUILD` output. Local Vite development and preview serve the ignored pack under `/_private/`, with range support for audio and path containment checks.

`npm run build:private` copies the pack into `apps/game/dist-private/_private` and writes `PRIVATE_BUILD.txt`. This separate web output is private and must not be distributed; it can coexist with the clean `apps/game/dist` output. `npm run desktop:build:private` passes the same opt-in through the existing Tauri build hook, whose frontend output remains `apps/game/dist`. After a private desktop build, run a clean build before public release checks. `npm run desktop:dev` uses the local Vite route. The Tauri CSP permits same-origin manifest and audio requests. Native execution still requires an installed Rust/Cargo toolchain and is untested here.
