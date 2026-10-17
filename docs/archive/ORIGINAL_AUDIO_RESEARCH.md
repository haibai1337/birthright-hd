> Historical research snapshot. Runtime/build instructions and milestone limitations below may be superseded. Current documentation starts at [README](../../README.md), [Anuire data](../ANUIRE_DATA.md) and [asset pipeline](../ASSET_PIPELINE.md). Binary layouts, source IDs, offsets and extraction findings are preserved here.

# Original audio research and playback — M1C

2026-10-17. All audio comes from the user's local disc. No generated or unrelated replacement music is used. No historical audio driver or executable is run.

## Disc evidence

RPGBGA.CUE declares one MODE1/2352 data track, beginning at 00:00:00, and no AUDIO tracks. The supplied BIN therefore does not provide separate Red Book tracks to rip. Other games' demos on the CD contain MIDI/RAW/SOL files; those are not evidence for Birthright's soundtrack and are excluded.

Birthright has nine loose MUSIC WAV files and 1,101 WAVE.RES members. All nine music tracks are RIFF PCM format 1, mono, 22,050 Hz, 16-bit. Their original samples are already supported by modern browser/WebView audio playback, so conversion is unnecessary. The reproducible pipeline copies them byte-for-byte and records SHA-256 plus sample-derived duration. Effects are also PCM WAV (individual rates/bit depths are in the manifest).

| Original file |                     Duration |
| ------------- | ---------------------------: |
| 101.WAV       |                     147.79 s |
| 103.WAV       |                     131.83 s |
| 104.WAV       |                     158.72 s |
| 106.WAV       |                     155.34 s |
| 107.WAV       |                     126.00 s |
| 108.WAV       |                     192.57 s |
| 109.WAV       |                     188.03 s |
| 110.WAV       |                     146.31 s |
| 111.WAV       |                      84.39 s |
| **Total**     | **1,330.98 s (22 min 11 s)** |

`WAVE/8010.WAV` is the source-indexed UI button click; `8015.WAV` is its invalid-click counterpart. These replace arbitrary fantasy effects. Voices, ambience and combat sounds remain catalogued without pretending tactical/adventure systems are implemented.

## Cue provenance and missing content

Research references are [SOUND.HXX](https://github.com/fire-lizard/birthrt/blob/fc47055002c4b776bfb1e8737b5aaf7f6d43edce/SOUND.HXX), [REDBOOK.C](https://github.com/fire-lizard/birthrt/blob/fc47055002c4b776bfb1e8737b5aaf7f6d43edce/REDBOOK.C), [SOUNDFX.HXX](https://github.com/fire-lizard/birthrt/blob/fc47055002c4b776bfb1e8737b5aaf7f6d43edce/SOUNDFX.HXX) and [MAIN.CPP](https://github.com/fire-lizard/birthrt/blob/fc47055002c4b776bfb1e8737b5aaf7f6d43edce/MAIN.CPP). This is a modified historical repository; its modern fallback behavior is not proof of the retail game's exact playback.

The headers identify realm cue 5, battle/personal-combat cue 2 and intro cue 6. The loader associates numbered tracks with MUSIC files numbered 100 higher. The supplied disc has **no 105.WAV or 102.WAV**, and neither is present in WAVE.RES. No MIDI sequence or alternate game container was found that could reconstruct those missing recordings. Their absence plus the one-track CUE is a source-content blocker, not a missing browser codec. The modified repository's automatic substitute behavior is explicitly not treated as original cue provenance.

M1C uses recovered original **106 (intro) for the menu** and recovered original **101 as an explicitly labelled alternate during campaign play**. Exact original menu/realm cue reproduction is therefore incomplete. The settings panel discloses the missing realm cue and allows choosing any of the nine recovered originals. There are no invented titles or claims about unidentified track associations. Combat/adventure/event cue transitions remain deferred with those game modes.

If a user-owned PCM `reference/original/MUSIC/105.WAV` becomes available, `npm run assets:import` validates and hashes it, includes it in the private pack and selects that realm cue automatically. A verified fuller disc image or supplied recording is the next useful source; executing an old binary cannot restore audio sectors absent from this image.

## Runtime behavior

`OriginalAudio` is presentation-only and never accesses campaign RNG. Before a pointer/key interaction no music element plays. After activation it starts the scene's recovered recording. Menu/campaign changes use a short volume crossfade; each recording loops at its end. No sample-level seamless loop points have been inferred. Rapid changes stop retired tracks, so unrelated music cannot accumulate. Up to four short effects may overlap.

Music volume, effects volume, mute and chosen campaign recording persist with existing local settings. Old M0 settings remain readable and receive audio defaults. Audio works through same-origin HTML media in Vite and the private static build; the local server supports HTTP byte ranges. The Tauri CSP now permits same-origin manifest and media loads. Native WebView behavior is not claimed as tested without Rust/Cargo.

Browser acceptance checks verify no pre-interaction playback, advancing media time for 106 and 101, scene changes, volume/mute, the original click request and preference persistence. This establishes actual decoding/playback in Chromium, not subjective loudspeaker quality. Missing/corrupt pack files remain a local setup issue; no network music service or substitute soundtrack is contacted.
