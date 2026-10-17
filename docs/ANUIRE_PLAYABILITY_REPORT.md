# M1B: playable Anuire template campaign

Date: 2026-10-17. **Implemented and exercised:** Anuire — Experimental Original Template Campaign. It loads the user's local research JSON and runs through the existing strategic command engine. This is not a certified stock 1997 New Game state or a complete original-rules implementation.

## Start and restore

```powershell
cd C:\birthright-hd
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`, select **New game → Load Anuire campaign data**, and open:

```text
C:\birthright-hd\reference\extracted\anuire\anuire.research.json
```

Choose one of the 18 eligible default regents and **Begin your reign**. The campaign selector switches between loaded Anuire and Covenant Marches. **Open Anuire research preview** is the separate raw-record inspector; it does not start gameplay.

After restarting/reloading the app, load the private data again before choosing **Load game**. Close New Game without starting another reign, then restore the manual/autosave or import an exported save. The save contains runtime state and a scenario fingerprint, not the private source dataset. Different scenarios/fingerprints have separate local save slots. A mismatched dataset/adapter is rejected.

Windows uses the same file-input flow through the Tauri WebView: `npm run desktop:dev` / `npm run desktop:build`. Tauri configuration is checked; native execution remains untested because Rust/Cargo are unavailable. No historical game/editor binary is executed. No private dataset, original graphics or original source code is bundled.

## Import coverage

| Record                  | Imported | Preservation                                                                                     |
| ----------------------- | -------: | ------------------------------------------------------------------------------------------------ |
| Provinces               |      206 | Every name, owner, development/source value, center and source ID                                |
| Geometry                |      206 | All rings, including seven multi-ring provinces; no island connections invented                  |
| Domain records          |       51 | Independent treasury/regency, default regent, original flags and raw records                     |
| Regent records          |      116 | Complete roster and raw avatar definitions; six literal placeholder identities remain unresolved |
| Holdings                |      766 | Every source ID, owner, type, level and location                                                 |
| Fortifications          |       39 | Individual owner/location/level/type, including levels above five and wizard towers              |
| Military units          |      234 | Every individual source ID/type/owner/location; grouped into armies by domain and province       |
| Character deployments   |       63 | Separate location/owner/source records; not converted into invented military power               |
NIE                |

There are **32 territorial domains and 17 holding-only domains**, plus two passive records (Mieres and Chaos) whose absent assets/placeholder identities do not establish a playable faction. With a territorial player, **48 AI controllers** run: 31 territorial and 17 holding-only. Special rulers retain their raw fields and generic AI compatibility behavior, not a claim of authentic NPC logic.

`packages/world-data/anuire-scenario.ts` imports all 206 provinces. The earlier M1A `province-schema-projection.json` remains a deliberately restricted legacy projection, not the M1B game adapter. Its 177/29 split and raw research-preview flags do not describe the playable adapter's coverage. No original ownership changes at initialization; all source locations and starting balances are checked by tests.

## Original evidence versus compatibility behavior

| Area                                                          | Status and explicit policy                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geography, terrain, holdings, ownership and template balances | Source-derived. Forest, plains, mountains, heavy mountains, swamp and hills all import. Development/source values are not clamped. Raw data remains in `Scenario.originalData` and per-definition `original` records.                                                                                                                                                                                |
| Geometry/rendering                                            | Exact original hit-map contours, with generated colors/icons and replaceable Pixi presentation. This is not continuous HD artwork or original map art. Even-odd hit testing handles islands/holes.                                                                                                                                                                                                   |
| Initial unit condition                                        | 100% military strength is a compatibility default. Native type IDs stay separate. Character units remain noncombat deployments. Original serialized condition/inventory/abilities remain unresolved.                                                                                                                                                                                                 |
| Unit balance/recruitment                                      | Three M0 basic recruitment types use their existing costs/minimum levels and provisional combat power. Imported types 20/21/23 reuse base archer/cavalry/infantry balance. Other native types are labelled by original type code and use power 5/upkeep 1. All native variants are non-recruitable until their rules are decoded. Raw template salary zero is retained, not used as verified upkeep. |
| Development/fortification                                     | Ceiling 10 or a higher observed initial province level; fort schema ceiling 15, with construction limited by province level. Observed stronger forts remain intact. Province fort summary is the strongest controlled castle; wizard towers remain individual records without invented castle defense.                                                                                               |
| Holding capacity                                              | Ten original excesses are grandfathered through source-specific initial ceilings. Existing records are not deleted to fit M0. Improve orders cannot increase an already over-capacity pool; development may reduce runtime sources as in M0.                                                                                                                                                         |
| Economy/regency                                               | Existing seeded PC tax ranges, simplified guild/temple income, maintenance, upkeep and class-derived regency. Full original court/law/tribute/trade behavior is deferred. Role mappings and unused zero command/diplomacy sentinels are compatibility choices; raw classes/attributes remain available.                                                                                              |
| Diplomacy                                                     | Original matrices remain raw and uninterpreted. No symmetric treaties are imported from them. Runtime contacts begin neutral under an explicit policy; subsequent player/AI treaties use the existing simplified system.                                                                                                                                                                             |
| Movement                                                      | One directed original link per march, once per army/season, consuming one action. Raw movement codes are preserved and displayed; their original weighted movement semantics are not implemented. The suspicious distant link remains unchanged and documented. Mounted troops retain the simplified mountain restriction.                                                                           |
| Warfare                                                       | Existing deterministic strength/terrain/fort auto-resolution. Conquest records occupation and contested state separately from sovereignty. Occupation denies the sovereign's provincial tax/control orders; regency still follows sovereignty in this compatibility model. Full investiture, sieges, retreats and character warfare are deferred.                                                    |
| Survival/victory                                              | Imported active domains survive while they retain sovereignty, positive holdings, armies or forts. Losing territorial ownership alone does not eliminate a holding domain. Passive records persist. Experimental objective: domain power 600, or highest domain power after 80 seasons. This pacing is provisional.                                                                                  |
| AI/events                                                     | Existing deterministic planner and shared validation, generic territorial/holding behavior, inherited enhanced development/events. No authentic original AI personality, monster behavior or original event reconstruction is claimed.                                                                                                                                                               |
| Rule profiles                                                 | CLASSIC retains M0's seasonal-war behavior; ENHANCED keeps wars persistent. Both are experimental. Faction selection mode is a separate concept.                                                                                                                                                                                                                                                     |

No canonical realm spells, original trade routes, variable save character state, exact post-New-Game transformations or exact diplomatic matrices are fabricated to fill gaps.

## Faction availability architecture

`originalPlayable` preserves the imported flag; `technicalPlayable` records supported gameplay. `selection.mode` is CLASSIC by default; `selection.overrides` can configure availability without modifying either the source records or original flag. The core also accepts future UNRESTRICTED selection, subject to technical support. There is no hardcoded original faction list in the simulation.

The M1B UI exposes original eligible factions only. Holding-only play and unrestricted selection are not presented as completed campaign modes. Special classless/monster rulers remain technically unavailable to player selection pending investigation; retaining their raw records or running generic NPC AI is not proof that every such faction is ready to play. Per-domain controller/survival settings and territory-independent victory metrics provide extension points.

## Automated verification and measurements

Final verification on 2026-10-17:

| Check                                        | Result                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Public Vitest suite                          | 79 passed; 12 private tests are opt-in                                                             |
| Private original-data suite                  | 12 passed                                                                                          |
| Playwright browser suite                     | 8 passed in 3.7 minutes, including the private campaign and existing M0 flows                      |
| Strict TypeScript, ESLint and Prettier       | Passed                                                                                             |
| Production build and release exclusion check | Passed; 12 static files, 1,014,489 bytes, without original/reference assets or the private dataset |
| Tauri configuration                          | Passed; native build/run remains untested without Cargo/Rust                                       |
| Synthetic scenario JSON                      | Unchanged                                                                                          |

Browser tests run with one worker to avoid competing WebGL instances during verification. This affects the test runner only.

Public tests cover selection overrides/technical restrictions, holding-only survival, territory-independent objectives, directed edges and island/hole hit testing. Existing M0 deterministic regressions remain. Private integration tests check every imported record/reference/value and occupation without a sovereignty change. All AI commands execute through shared validation; an invalid plan fails the test.

Five ten-season configurations were each run twice with full-state equality: Roesone and Endier, seeds 1997 and 2026, ENHANCED; plus Roesone seed 1997, CLASSIC. **100 seasonal transitions** completed in total, each run reaching turn 11 without corruption. Schema/reference validation ran after every season; saves round-tripped exactly and mismatched fingerprints were rejected. Holding domains survived all runs. AI executed 1,379–1,394 accepted commands per measured ten-season run.

Measured on this Windows workspace with Node **22.20.0**, using `performance.now()` around creation, each EndTurn, and serialization/deserialization plus reference validation. These are observed development-machine timings, not hardware-independent guarantees. In the final M1B verification run, the 50 first-pass seasons averaged **247.8 ms**, median **200.1 ms**, p95 **605.2 ms**, maximum **1,241.7 ms**. Creation was **39.9–155.8 ms**; save/load **70.4–208.0 ms**. Saves after ten seasons were **851,012–856,352 bytes**. That M1B measurement snapshot is archived in `reference/extracted/anuire/m1b-performance-verification-2026-10-17.json`; subsequent regression runs write `m1b-performance.json` separately.

| Player  | Seed | Rules    | Mean / worst EndTurn | AI commands | Final turn |
| ------- | ---: | -------- | -------------------: | ----------: | ---------: |
| Roesone | 1997 | Enhanced |   438.3 / 1,241.7 ms |       1,394 |         11 |
| Roesone | 2026 | Enhanced |     154.3 / 298.1 ms |       1,381 |         11 |
| Endier  | 1997 | Enhanced |     328.2 / 605.2 ms |       1,392 |         11 |
| Endier  | 2026 | Enhanced |     166.1 / 298.3 ms |       1,379 |         11 |
| Roesone | 1997 | Classic  |     151.9 / 309.8 ms |       1,394 |         11 |

The large-world renderer constructs static geometry once, indexes bounds for hit testing, updates tints only when changed, and keeps state markers separate. Selection/hover do not recreate the province scene. Browser tests verify one scene build across all 206 list selections. Rendering does not use the simulation RNG.

Browser coverage includes local file chooser, 18-faction selection, management, recruitment, movement, three seasonal transitions, diplomacy, all 206 province selections, four overlays, focus/fit, save restoration, malformed input rejection, and detached-island canvas hover/selection from a second realm. Existing synthetic gameplay/offline/settings tests and the raw research preview remain covered. Local screenshots were visually inspected:

- [Playable overview](../test-results/anuire-playable-overview.png)
- [Focused military management](../test-results/anuire-playable-focused.png)

Screenshots contain privately derived geography, remain ignored under `test-results/`, and are not distributed. The connected Browser runtime had no available sessions; repository Playwright/Chromium provided repeatable browser verification.

Run checks with `npm test`, `npm run test:original`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run release:check`, and `npm run desktop:check`.

## Remaining work

The experimental campaign is functional; a fully verified Classic campaign still needs paired isolated-VM New Game saves, variable character-state decoding, diplomacy matrix interpretation, original unit definitions/movement costs, investiture/occupation rules, trade, court/law claims and canonical magic. The controlled VM experiment in [ANUIRE_RECONSTRUCTION.md](ANUIRE_RECONSTRUCTION.md) remains separate future validation. Native file dialogs/persistence need testing with an installed Windows toolchain. Long-term economy, AI war planning, victory balance, and higher-fidelity art need playtesting. No tactical/RPG/multiplayer implementation was added.
