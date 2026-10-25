# Architecture

Birthright HD is one React/Pixi application with a headless TypeScript simulation and an optional Tauri Windows shell. Anuire and imported original media are required product data. Browser and desktop builds share one Vite configuration and the same `apps/game/dist` output.

## Data and presentation flow

`assets:import` reads the supplied CD through `OriginalDisc`. Campaign decoders write `reference/extracted/anuire/anuire.research.json`; bitmap/FLC/palette/audio tools write the complete `reference/assets` catalog. Import checks source hashes before reusing decoded output. No decoder or simulation module executes historical binaries.

`scripts/game-assets-plugin.ts` serves `/original/` during development and copies the same assets/campaign into the build. Preview and Tauri serve compiled files directly. There is no environment switch, alternate asset bundle or second build implementation.

`App.tsx` loads the compact original-asset manifest and validates/adapts the default Anuire dataset. Loading errors lead to a setup/import screen. Once ready, a single classic menu and campaign layout expose the existing command handlers. `ClassicChrome.tsx` owns layout/keyboard interaction, `Sidebar.tsx` owns council command forms, and `Modal.tsx` owns dialog focus/Escape behavior. Prototype menus, research-only UI and procedural product layout have been removed.

`NewGamePanel.tsx` presents eligible kingdoms, both original regent candidates and starting province counts alongside campaign settings. It uses the existing `realmSelectable` filter and delegates selection and campaign creation to `App.tsx`; its parchment/leather styles are scoped to the new-game dialog. The adapter supplies verified `regentCandidates`; a campaign realm's optional `regentId` stores its chosen ruler. `core/regents.ts::rulingRegent` resolves that identity for rules and presentation, falling back to the template head for old saves. At 1366×768 the kingdom list scrolls independently and the start button stays in the dialog footer.

`MapPanel.tsx` hosts the sole Pixi `WorldMap` renderer. It builds province geometry once, queues updates until initialization completes, supports disjoint rings/holes, aligns original terrain with source coordinates and updates selection/overlays/markers without rebuilding the scene. Map camera/labels/textures never consume simulation RNG. `rendering/types.ts` contains the small presentation contract.

`original-assets.ts` validates resource identities/paths independently of game rules. `audio.ts` manages gesture activation, scene transitions, looping, effects and persisted preferences. UI image IDs and manifest paths can later point at replacement artwork without changing campaign state.

## Simulation and persistence

`packages/core` owns schemas, reference validation, costs/preconditions, command execution, selectors, AI, combat, PRNG and persistence. UI and AI both submit commands through `applyCommand`; controls use the same validation to explain unavailable orders. The simulation has no DOM, Pixi, media or filesystem dependency.

Accepted commands produce validated campaign state and journal entries. In PC domain-action campaigns, three interleaved action rounds end at a persisted Council phase. `finishSeason` handles construction, siege/occupation, treaty/effect expiry, diplomacy and the turn increment before Council. Automatic Council dismissal runs standard events/NPC administration once and opens Maintenance; Collect Taxes stores actual receipts/tribute once, and Select Actions finalizes expenses/RP/reports before initializing the next action schedule. Initial Council skips the seasonal event/NPC pass. Non-PC scenarios retain their one-step settlement, and legacy histories retain versioned replay behavior. Stable IDs/order and the campaign PRNG make repeated seeds/commands replay identically. Exact original boundary timing remains open in the [M1B completion matrix](ROADMAP.md#m1b-completion-contract).

The world schema supports source IDs, multiple geometry rings, directed movement/codes, original raw records, occupation/contested state, individual forts, character deployments, regent rosters and per-domain starting resources. `anuire-scenario.ts` adapts all original records. `simulation-defaults.json` holds existing generic unit/event compatibility values; synthetic geography is confined to `tests/fixtures`.

Original selectability, technical playability and scenario selection overrides remain separate. Territorial, holding-only and passive domains have configurable controller/survival policies; domain-power victory does not require territorial ownership. This preserves future unrestricted factions without treating every special record as playable.

Saved campaigns include schema/rules identifiers, seed/PRNG state, command/journal state and the scenario fingerprint. Browser manual/autosave slots and exported JSON preserve this contract. The automatically loaded dataset supplies the same fingerprint on restart, so Anuire no longer needs manual re-import before loading a save. Cleanup retains existing Anuire save compatibility.

Detailed mechanics are in [GAMEPLAY_SYSTEMS.md](GAMEPLAY_SYSTEMS.md). Binary findings and raw-field provenance are in [ANUIRE_DATA.md](ANUIRE_DATA.md) and the research archive. Future tactical/RPG renderers can consume core state/commands without replacing the strategic engine.

### Birthright 1.5 foundation — Increment 1

`domain-rules.ts` adds an independent domain-rules identity: legacy HD version 1, or Birthright 1.5 contract 1.1 with separate character/handler overlay versions and SHA-256 fingerprints (explicit null while absent). `quantities.ts` provides branded BigInt gold units (120/GB), whole RP, exact arithmetic/ratios, explicit rounding and canonical serialization. Legacy numeric helpers and source schemas are unchanged.

The existing save API now supports legacy version-1 numeric campaigns and version-2 exact foundation campaigns using nested Zod codecs. New quantities are decimal integer strings on the wire; there is one authoritative balance representation per campaign. Missing identity loads as legacy; existing balances/reports are never rescaled. Loading a non-PC save no longer adds an unused seasonal phase. Identity-only reference checks work for either quantity type without converting balances to Number.

`createBirthright15Foundation` reuses the existing fresh-game constructor and already-adapted scenario resources; it is not an existing-save upgrade. Exact saves require explicit core loading and optional expected-overlay matching. Current command, forecast, AI and settlement entry points reject foundations before execution; UI/New Game remains legacy. No 1.5 economic formulas are active. See the [implementation notes, APIs and verification limits](BIRTHRIGHT_15_IMPLEMENTATION.md).

## Campaign events integration — 2026-10-18

`strategic-events.ts` runs the native-date standard-event scheduler once per season, separate from legal-action AI and ordinary seasonal systems. In the current staged PC path, standard events/NPC administration run after automatic Council dismissal and before collection; treasury incidents retain their earlier `finishSeason` boundary. Campaign schema v1 additively persists difficulty, eight event choices, diagnostic history, plot stage/ally and a presentation queue. Free validated options/scene-acknowledgement commands never advance AI slots. Browser Gorgon playback uses imported frames/text/cues and never consumes gameplay RNG. See [implementation report](CAMPAIGN_EVENTS_IMPLEMENTATION_REPORT.md).
