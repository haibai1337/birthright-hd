# Repository cleanup report

## Changes

- Removed the procedural application/menu branches, nonplayable research preview, old `StrategicMap` renderer, prototype favicon/scenario generator and partial M0 province adapter. Shared rendering types and functional command forms remain.
- Moved synthetic geography into `tests/fixtures`; production unit/event defaults are independent. Anuire is loaded automatically and is the only New Game campaign. Missing/invalid inputs open setup/import diagnostics.
- Removed private-build wrappers, release-exclusion checker and duplicate build commands/output. The sole Vite plugin serves `/original/` and includes the full original asset catalog plus campaign data in the normal build/Tauri frontend.
- Renamed the intact recovered catalog to `reference/assets`. All 9,501 original resource records, including unused battle/RPG/animation content, are preserved. Re-import validates sources and reuses complete outputs rather than decoding them again.
- Consolidated current documentation into README and the eight requested guides/history files. Detailed binary formats, offsets, source IDs, algorithms, rule evidence and UI/audio research remain in `docs/archive`. Superseded milestone/status reports were retired.
- Retained dependencies that remain in active use; no new dependencies were added. Updated browser coverage to use the default Anuire campaign and explicit setup failures. Full original-source testing runs in one invocation.

## Verification

| Check                               | Actual result                                                                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                          | Passed                                                                                                                                                                                              |
| ESLint and Prettier                 | Passed                                                                                                                                                                                              |
| Complete unit/original-source suite | **96 passed** in one run, including deterministic multi-season simulations, complete Anuire record coverage and all recovered asset records                                                         |
| Browser suite                       | **13 passed** in one run; full campaign commands, all 206 province selections, islands, save/load after reopening, offline seasons, original map/UI/audio, 640/1366/1920 layouts and setup failures |
| Asset import                        | Complete catalog reused after source-hash/file checks; no repeated decoding                                                                                                                         |
| Documentation                       | Current guide file links checked; no broken links                                                                                                                                                   |

`App.tsx` was reduced from 1,030 to 640 lines and shared CSS from approximately 1,750 to 906 lines. Existing Anuire save fingerprints remain unchanged; the new automatic campaign load removes the former re-import step. Synthetic core fixtures remain covered; one obsolete partial-projection test and superseded prototype UI cases were removed/replaced.

| Final build check           | Actual result                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Default `npm run build`     | Passed; one output in `apps/game/dist`, including original media and campaign data                                              |
| Standalone production smoke | Passed: original menu, automatic Anuire load, seasonal command, playing original music, catalog pagination and animated preview |
| Compiled content            | 9,501 original asset records and 206 provinces included; fictional campaign text absent from frontend bundles                   |
| Tauri configuration         | Passed: full JSON schema, frontend paths, build commands and icon                                                               |

Rust/Cargo are unavailable, so native Windows compilation/execution remains untested. Vite's existing large-chunk advisory remains; the build succeeds. Main JavaScript decreased from 716.51 to 676.95 kB, and CSS from 34.33 to 23.00 kB. No expensive suites were repeated after these successful final runs.

## Remaining work

Original rules/data decoding, missing music cues 102/105, font metrics, full heraldry/dialog reconstruction and native execution remain as documented in [KNOWN_ISSUES.md](KNOWN_ISSUES.md). No new gameplay systems were added.
