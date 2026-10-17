# Implementation status and session report

As of **2026-10-17**. The browser M0 vertical slice is implemented and tested. The Windows wrapper is configured and statically validated; a native executable remains **untested** because Cargo/Rust are absent.

## Implemented and exercised

- Main menu, new campaign/regent/seed/profile selection, manual load/import, persistent settings, and in-game guide.
- Twelve-province **synthetic** campaign with three selectable regents and two AI-controlled opponents for every player choice.
- PixiJS 8 WebGL map: original procedural cartography, terrain relief, castles, realm colors, army markers, borders, selected/hover states, zoom/pan/fit, and political/military/economic/magical overlays.
- Province inspection through pointer selection and an accessible selection list; province level, source potential, forts, loyalty, separate and overlapping holdings.
- Command-driven development, holding improvement, tax policy, fortification, recruitment, once-per-season adjacent movement, diplomacy, and deterministic auto-combat with real losses/conquest.
- Gold Bar treasury, seeded original-table provincial taxes, simplified holding income/maintenance, unit upkeep, class-dependent regency capped by bloodline, and shortfall/disbanding consequences.
- Transparent diplomatic willingness, alliances/pacts/peace/war, military passage restrictions, and configured seasonal versus persistent war profiles.
- Stable AI candidate planning with shared validation, domain development, recruitment, threat evaluation, military movement, and basic diplomacy.
- Three-action seasonal loop, income/upkeep reports, seeded events, meaningful relief decisions, action/reason journal, and terminal victory/defeat.
- One explicitly enhanced source-dependent ward spell; it is not represented as an original PC spell implementation.
- Versioned local manual/autosaves, JSON export/import, schema and reference validation, saved RNG state, and player-command replay that regenerates AI turns.
- Strict TypeScript; npm workspace and lockfile; headless core; original-code asset placeholders; thin Tauri shell; full research/developer documentation.

## Actual verification

| Check                             | Result                                                                                                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript strict compilation     | PASS                                                                                                                                                                                               |
| ESLint                            | PASS                                                                                                                                                                                               |
| Vitest                            | **61 tests passed, 2 files**, including 25 rule/persistence/data cases and 36 parameterized deterministic simulation cases                                                                         |
| Simulation coverage               | All three player regents × 12 seeds, each run twice, up to 20 seasons, terminal outcome, valid world references and nonnegative resources                                                          |
| Playwright gameplay               | **3 tests passed**: develop/recruit/march/negotiate/repeated turns/save restore/map selection; settings/wizard ward at 1920×1080; third regent multi-turn play with network disabled after loading |
| Browser layout                    | Screenshots inspected at 1366×768 and 1920×1080; main menu inspected at 1920×1080                                                                                                                  |
| Browser release build             | PASS; outputs only static frontend files                                                                                                                                                           |
| Release reference exclusion check | PASS; no original/reference formats or paths bundled                                                                                                                                               |
| Installed dependency tree         | PASS; `npm ls --depth=0` resolves all declared dependencies                                                                                                                                        |
| Installation audit                | npm reported **0 vulnerabilities** when dependencies were installed                                                                                                                                |
| Tauri JSON/configuration          | PASS against full installed Tauri 2 schema, hooks, frontend paths and generated icon; CLI launcher/help exercised                                                                                  |
| Windows native build/run          | **UNTESTED**: `cargo` and `rustc` unavailable; no EXE or installer produced                                                                                                                        |
| In-app browser                    | Connection unavailable; Playwright test runner used for browser verification                                                                                                                       |

One earlier combined simulation test exceeded a 30-second timeout while browser tests ran concurrently. It had no failed state assertions. It was split into individually timed realm/seed cases; the final complete suite passed. Earlier peer-resolution, import-path, and schema-validator configuration errors were fixed. No currently failing automated checks are known.

The release build emits Vite's large-chunk advisory (main chunk around 685 kB before gzip, roughly 204 kB gzip). This is a load-size limitation, not a build failure. Desktop-only layout is the current target. Very small map labels at fit scale can require zooming; no broad hardware/browser compatibility claim is made.

## Original materials and verification

Ten supplied reference files were hashed. The BIN/CUE image was inspected read-only: volume BIRTHV10, 2,268 directory records / 2,184 files. Thirteen `.RES` directories expose 9,492 entries. MAP.RES contains three PCX map images; `.SCN` samples are adventure scene metadata. No complete original strategic state importer was claimed.

The scanned 24-spread English manual was partially rendered/read; CD RULES.TXT and READMEs, official 1.0.0.2/1.0.0.3 patch notes, the package labelled 1.0.0.4, and the scenario-editor archive/data were inspected. The 1.0.0.3 Windows installer was signature/string-inspected only. Online modding, BRUT licensing, historical-source provenance, preservation release notes, and the requested forum index were reviewed. No supplied executable was executed and no historical engine code was copied.

Verified original facts used include quarterly three-action turns, the tax ranges, basic unit muster/upkeep/minimum levels, the regency/domain/bloodline relationship, holding capacity and overlapping sovereignty, and inverse source/development behavior. Exact tax-roll distribution and original auto-combat formula remain unknown. No tabletop rulebook was directly verified.

## Partial, provisional, and deferred

| System                                                                     | Status                                                                                           |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Authentic complete Anuire                                                  | NOT IMPLEMENTED; original campaign binaries not sufficiently decoded/validated                   |
| Development campaign geography/regents/initial state                       | TEMPORARY_PLACEHOLDER, prominently labelled throughout UI/data/docs                              |
| CLASSIC                                                                    | PARTIAL reconstruction; original factual foundations with explicit simplified/enhanced mechanics |
| Auto-combat, conquest, loyalty, province maintenance, diplomacy thresholds | ENHANCED_DESIGN; balanced provisionally, no claim of original formula fidelity                   |
| Full realm magic                                                           | PARTIAL; one test ward only; ley lines and canonical spell catalog absent                        |
| Trade                                                                      | Schemas/income path only; no construction orders or initial active routes                        |
| Occupation/investiture/sieges/retreats                                     | NOT IMPLEMENTED; immediate conquest used                                                         |
| Vassalage/tribute/negotiation offers/dynastic succession                   | NOT IMPLEMENTED                                                                                  |
| Blood abilities, lieutenant actions, inventories/quests                    | Schema/extension foundations only; no claimed playable RPG system                                |
| AI                                                                         | FUNCTIONAL initial heuristic, limited long-range coordination and unit composition               |
| Final HD assets/portraits/audio                                            | NOT IMPLEMENTED; original procedural/vector placeholders                                         |
| Asset-pack loading                                                         | Interface only; no user pack installation flow                                                   |
| Babylon/tactical scenes/3D RPG                                             | NOT IMPLEMENTED; no Babylon dependency or engine instantiated                                    |
| Multiplayer                                                                | NOT IMPLEMENTED; deterministic local foundation only                                             |
| Save migration/authentication                                              | Version 1 only; no crypto or proof of history/state equivalence                                  |
| Native Windows/WebView storage/export                                      | UNTESTED                                                                                         |

## Run commands

Browser, from `C:\birthright-hd`:

```powershell
npm ci
npm run dev
# Open http://127.0.0.1:5173/
```

Windows after installing Rust/MSVC/Windows SDK/WebView2 prerequisites:

```powershell
npm run desktop:dev
npm run desktop:build
```

Shared browser release: `npm run build`, then `npm run preview`. Native bundle target: `apps/game/src-tauri/target/release/bundle/nsis/`. This path describes expected output, not an artifact generated this session.

## Structure and next priorities

`packages/core` owns gameplay; `world-data` owns the portable scenario; `rendering` owns Pixi; `ui` owns presentation strings/heraldry; `import-tools` owns private research adapters. `apps/game` wires the React frontend and Tauri wrapper. `tests` and `docs` supply regression and developer context.

Next: verify the native build and commit Cargo.lock; validate original state/string formats and province geography; implement occupation/investiture, trade and canonical spells; expand Classic reconstruction and AI; conduct human balance playtests. See [ROADMAP.md](ROADMAP.md), [GAME_MECHANICS_REFERENCE.md](GAME_MECHANICS_REFERENCE.md), and [DATA_EXTRACTION_REPORT.md](DATA_EXTRACTION_REPORT.md).
