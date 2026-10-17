# Birthright HD

A playable, offline strategic remake inspired by _Birthright: The Gorgon's Alliance_. The simulation is original TypeScript. Clean/public builds exclude proprietary assets; a separate ignored local pack restores the original graphics and recordings for private use.

**The bundled campaign is synthetic.** Covenant Marches has twelve invented provinces and three selectable regents. The privately extracted Anuire template can also be loaded for experimental play. See [implementation status](docs/IMPLEMENTATION_STATUS.md) and [original research](docs/ORIGINAL_GAME_RESEARCH.md).

M1B makes the reconstructed world playable as **Anuire — Experimental Original Template Campaign**: 206 provinces/geometries, 51 domain records, 116 regents, 766 holdings, 39 fortifications and 297 military/character deployments. Original starting records coexist with explicitly provisional HD gameplay. It is not a certified stock 1997 campaign. See [playability report](docs/ANUIRE_PLAYABILITY_REPORT.md), [reconstruction](docs/ANUIRE_RECONSTRUCTION.md), and [source matrix](docs/ANUIRE_SOURCE_MATRIX.md).

## Play locally

Requires Node.js **22.12 or newer** (tested with 22.20.0) and npm. From PowerShell:

```powershell
cd C:\birthright-hd
npm ci
npm run assets:import
npm run dev
```

Open **http://127.0.0.1:5173/**. Select **New game**, choose a regent, and **Begin your reign**. In Covenant Marches the other two regents become AI opponents. You have three actions per season. Use the province council for development, Military for recruitment and movement, Diplomacy for treaties, and Realm for the economy. The Guide explains the campaign objective and provisional mechanics.

M1C discovers `reference/private-assets/manifest.json` automatically after extraction from the supplied `reference/original/RPGBGA.BIN`. It restores the shield menu, original map artwork, portraits, a left-council strategic layout and original music after the first interaction. Skip `assets:import` when original inputs are unavailable; the development presentation still works. Browse the private catalog at `/_private/catalog.html`. Anuire is selected by loading `reference/extracted/anuire/anuire.research.json` from New Game. See the [M1C visual report](docs/M1C_VISUAL_REPORT.md) for screenshots, exact setup and known differences, including missing original realm-music cue 105.

`npm run build:private` includes the pack in `apps/game/dist-private/` and marks the output private. `npm run desktop:build:private` does the same for Tauri through its `dist/` frontend build hook. Never distribute those outputs. `npm run build` remains the separate clean path in `apps/game/dist/`, verified by `npm run release:check`.

There is no gameplay backend, account, remote font, telemetry, or runtime API dependency. An internet connection is needed to obtain development dependencies initially. Afterwards, the local server and game run without internet. The browser build is a static application; it needs an HTTP file server, not a game server. It is not an installable PWA and does not cache the first page for disconnected remote hosting.

Manual saves and autosaves use separate localStorage slots. Export/import JSON from the game menu for backups and transfers. Saves belong to the browser origin; port/domain changes use different storage. Browser storage can be cleared by the browser or user. Native WebView persistence and export dialogs have not been tested.

## Verify

```powershell
npm run typecheck
npm run lint
npm test
npm exec playwright install chromium
npm run test:e2e
npm run build
npm run desktop:check
```

Browser tests start the local server if necessary. They exercise real development, recruitment, movement, diplomacy, multi-season play, local save/load, Pixi selection, and settings. `npm run simulate` runs the seeded multi-season simulations separately. `npm run format` formats source and documentation; `npm run format:check` checks it.

Serve the compiled frontend with:

```powershell
npm run build
npm run preview
```

Vite prints the preview URL (normally http://127.0.0.1:4173/). The release files are in `apps/game/dist/`.

## Windows / Tauri 2

Install the [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/): Rust with its MSVC toolchain, Visual Studio C++ build tools, Windows SDK, and WebView2. Then:

```powershell
cd C:\birthright-hd
npm ci
npm run desktop:dev
# Or create the NSIS bundle:
npm run desktop:build
```

The launcher runs Tauri from `apps/game/`; its hooks run the root frontend scripts. Expected installer output: `apps/game/src-tauri/target/release/bundle/nsis/`. `npm run desktop:check` validates the complete installed Tauri JSON schema, frontend paths, hooks, icon, and tool availability after a web build.

**Native build is untested:** Rust and Cargo were unavailable in this development environment. No Windows executable was built or launched. No Cargo.lock can be generated until Cargo is available; commit it after the first successful native build.

## Modules

| Location                 | Responsibility                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `packages/core/`         | Headless schemas, rules, commands, AI, economy, combat, replay, save format         |
| `packages/world-data/`   | Validated external scenario JSON, provenance, reproducible synthetic-data generator |
| `packages/rendering/`    | PixiJS 8 WebGL cartography and future presentation interfaces                       |
| `packages/ui/`           | English presentation strings, vector heraldry, icons                                |
| `packages/import-tools/` | Read-only CD, PDF, resource-directory, and patch inspection tools                   |
| `apps/game/src/`         | React application, command wiring, panels, local persistence                        |
| `apps/game/src-tauri/`   | Thin Tauri 2 Windows wrapper                                                        |
| `reference/original/`    | User-supplied private materials; gitignored                                         |
| `reference/extracted/`   | Private extraction outputs; gitignored                                              |
| `tests/`                 | Unit, deterministic simulation, and Playwright gameplay tests                       |
| `docs/`                  | Research, provenance, mechanics, architecture, schema, roadmap, status              |

## Reference inspection

`npm run inventory` hashes supplied originals and reads the MODE1/2352 CD directory without mounting or executing it. It writes the tracked metadata report `docs/REFERENCE_INVENTORY.md` and private extracted text. Keep every original/extraction out of `public/` and release bundles.

With the private CD image in place:

```powershell
npm run research:anuire
npm run research:validate
npm run test:original
```

To play, select **New game → Load Anuire campaign data**, open `C:\birthright-hd\reference\extracted\anuire\anuire.research.json`, choose an eligible regent and **Begin your reign**. All 206 provinces import. Load the private dataset again after restarting the app before restoring an Anuire save; the scenario selector switches between Anuire and Covenant Marches. Saves use separate scenario/fingerprint slots. **Open Anuire research preview** remains available for inspecting raw records without starting a game. External snapshots and editor strings are optional. The [reconstruction report](docs/ANUIRE_RECONSTRUCTION.md) documents extraction and the isolated-VM experiment; the [playability report](docs/ANUIRE_PLAYABILITY_REPORT.md) documents gameplay policies and remaining limits.

Optional manual research requires Python 3 and workspace-local `pymupdf`/`pypdf`:

```powershell
py -3 -m pip install --target .python-tools pymupdf pypdf
py -3 packages/import-tools/manual.py
```

`node packages/import-tools/inspect-archives.mjs` additionally uses the locally installed WinRAR UnRAR tool at its documented Windows path. It only lists archives or reads named members; it never executes the supplied editor or patches. See [extraction report](docs/DATA_EXTRACTION_REPORT.md) for limitations and format discrepancies.

## Scope and rights

M0 implements the strategic loop; M1B runs the complete recovered Anuire template with documented compatibility rules. Verified stock initialization, full investiture, vassalage, trade-route construction, comprehensive realm magic, tactical battles, RPG adventures, and multiplayer remain deferred. CLASSIC is a partial reconstruction profile, not a claim of complete original rules fidelity. Babylon.js is deliberately neither imported nor installed until a 3D layer exists.

The Birthright setting, names, branding, original game content, and reference materials are not presumed public domain. Public distribution of a branded remake and any original assets requires a rights review and appropriate permissions. This project grants no license to third-party material. The inspected historical source repository supplied no clear reusable license; none of its code was incorporated.
