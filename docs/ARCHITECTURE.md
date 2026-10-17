# Architecture

Birthright HD is one React/Pixi application with a headless TypeScript simulation and an optional Tauri Windows shell. Anuire and imported original media are required product data. Browser and desktop builds share one Vite configuration and the same `apps/game/dist` output.

## Data and presentation flow

`assets:import` reads the supplied CD through `OriginalDisc`. Campaign decoders write `reference/extracted/anuire/anuire.research.json`; bitmap/FLC/palette/audio tools write the complete `reference/assets` catalog. Import checks source hashes before reusing decoded output. No decoder or simulation module executes historical binaries.

`scripts/game-assets-plugin.ts` serves `/original/` during development and copies the same assets/campaign into the build. Preview and Tauri serve compiled files directly. There is no environment switch, alternate asset bundle or second build implementation.

`App.tsx` loads the compact original-asset manifest and validates/adapts the default Anuire dataset. Loading errors lead to a setup/import screen. Once ready, a single classic menu and campaign layout expose the existing command handlers. `ClassicChrome.tsx` owns layout/keyboard interaction, `Sidebar.tsx` owns council command forms, and `Modal.tsx` owns dialog focus/Escape behavior. Prototype menus, research-only UI and procedural product layout have been removed.

`MapPanel.tsx` hosts the sole Pixi `WorldMap` renderer. It builds province geometry once, queues updates until initialization completes, supports disjoint rings/holes, aligns original terrain with source coordinates and updates selection/overlays/markers without rebuilding the scene. Map camera/labels/textures never consume simulation RNG. `rendering/types.ts` contains the small presentation contract.

`original-assets.ts` validates resource identities/paths independently of game rules. `audio.ts` manages gesture activation, scene transitions, looping, effects and persisted preferences. UI image IDs and manifest paths can later point at replacement artwork without changing campaign state.

## Simulation and persistence

`packages/core` owns schemas, reference validation, costs/preconditions, command execution, selectors, AI, combat, PRNG and persistence. UI and AI both submit commands through `applyCommand`; controls use the same validation to explain unavailable orders. The simulation has no DOM, Pixi, media or filesystem dependency.

Accepted commands produce validated campaign state and journal entries. Seasonal resolution executes deterministic AI actions, economy/upkeep/regency, war-profile behavior and seeded events, then grants the next season's actions. Stable IDs/order and the campaign PRNG make repeated seeds/commands replay identically. The cleanup does not alter these rules.

The world schema supports source IDs, multiple geometry rings, directed movement/codes, original raw records, occupation/contested state, individual forts, character deployments, regent rosters and per-domain starting resources. `anuire-scenario.ts` adapts all original records. `simulation-defaults.json` holds existing generic unit/event compatibility values; synthetic geography is confined to `tests/fixtures`.

Original selectability, technical playability and scenario selection overrides remain separate. Territorial, holding-only and passive domains have configurable controller/survival policies; domain-power victory does not require territorial ownership. This preserves future unrestricted factions without treating every special record as playable.

Saved campaigns include schema/rules identifiers, seed/PRNG state, command/journal state and the scenario fingerprint. Browser manual/autosave slots and exported JSON preserve this contract. The automatically loaded dataset supplies the same fingerprint on restart, so Anuire no longer needs manual re-import before loading a save. Cleanup retains existing Anuire save compatibility.

Detailed mechanics are in [GAMEPLAY_SYSTEMS.md](GAMEPLAY_SYSTEMS.md). Binary findings and raw-field provenance are in [ANUIRE_DATA.md](ANUIRE_DATA.md) and the research archive. Future tactical/RPG renderers can consume core state/commands without replacing the strategic engine.
