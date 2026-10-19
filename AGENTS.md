# Birthright HD: permanent agent instructions

These are durable working rules, not a progress log. Keep findings, milestone results and open defects in the existing project documentation.

## Project identity and roadmap

- Build a private, expanded remake of **Birthright: The Gorgon's Alliance (1997)**, preserving its geography, characters, domains, distinctive strategic systems and atmosphere.
- Combine recovered PC data and mechanics, appropriate AD&D Birthright references, explicitly chosen enhancements and modern HD presentation. Avoid generic fantasy replacements that erase Birthright's identity.
- Anuire is the initial campaign; keep architecture open to other Cerilia regions without inventing their data.
- Preserve the original milestone names and scope:
  - **M1A: Anuire Reconstruction** — original geography, records and playable technical foundation.
  - **M1B: Original Strategic Mechanics** — warfare, occupation, investiture, actions, holdings, economy, trade, magic, bloodlines, diplomacy and armies.
  - **M1C: HD Graphics & Visual Reconstruction** — art, interfaces, illustrated 2.5D map and distinctive landmarks.
  - **M1D: Advanced AI & Balance** — domain personalities, planning and campaign balance.
- Never rename milestone letters to match historical asset filenames. Consult `docs/ROADMAP.md` for progress and the latest user task for authorized scope; reconcile stale status with actual implementation.
- Keep `docs/ROADMAP.md` current as part of the repository contract: when a task changes actual implementation status, scope, blockers, or milestone completion, update the roadmap in the same change instead of leaving stale completion claims behind.
- Tactical combat and 3D RPG adventures are separate future systems. Do not start them, or the next milestone, incidentally.

## Architecture and verified paths

- Browser-first stack: TypeScript, React, PixiJS, Vite and npm workspaces; Zod validates data, Vitest tests logic and Playwright checks browser behavior.
- `packages/core/`: headless simulation, schemas, commands, validation, seeded PRNG, AI and persistence.
- `packages/world-data/`: original-data schemas, Anuire adapters and generic compatibility defaults; `anuire-scenario.ts` adapts private campaign records.
- `packages/import-tools/`: read-only extraction/decoding and asset-selection metadata.
- `packages/rendering/`: Pixi `WorldMap`, geometry-aligned presentation and terrain placement; `terrain-regions.ts` holds small visual-only geographic exceptions.
- `packages/ui/`: shared UI components. `apps/game/src/`: React application, councils, map host, original-asset access, styles and audio.
- `scripts/`: existing import, research, build and review tools. `tests/fixtures/`: synthetic Covenant Marches regression data, never a production replacement campaign.
- `reference/original/`: private source inputs; `reference/extracted/`: derived campaign/research data; `reference/assets/`: recovered media; `reference/research-cache/`: retained research evidence.
- `apps/game/public/art/anuire/`: illustrated map artwork. Preserve its provenance alongside the existing original/enhanced asset pipeline.
- `scripts/game-assets-plugin.ts` serves `/original/` in development and copies imported data/media into `apps/game/dist/original/` for the single browser build.
- `apps/game/src/MapPanel.tsx` hosts the existing renderer; `original-assets.ts` and `audio.ts` manage media independently of game rules.
- Preserve working architecture. Do not replace frameworks or subsystems without a clear technical need.
- **Do not work on Tauri, Rust, native packaging or desktop compilation unless explicitly requested.** Leave existing desktop configuration undisturbed.

## Commands and local development

- Use Node **22.12+** and npm; verify commands against `package.json` before assuming a tool exists.
- `npm ci`: install dependencies when needed; do not reinstall routinely.
- `npm run assets:import`: existing private CD/campaign/media setup, using `reference/original/RPGBGA.BIN` by default. Reuse complete imported outputs rather than forcing regeneration.
- `npm run dev`: Vite at `http://127.0.0.1:5173/`; reuse an existing server instead of starting a competing instance on that port.
- `npm run build`: TypeScript check plus browser production build into `apps/game/dist/`; `npm run preview`: serve that output.
- `npm run typecheck`: TypeScript only. `npm test -- tests/<file>.test.ts`: focused Vitest checks. `npm run test:e2e`: browser suite, only when scope justifies it.
- `npm run research:anuire` and `npm run research:validate`: campaign extraction/validation; use the other existing `research:*` scripts for their specific systems.
- `node scripts/audit-terrain-placement.mjs`: read-only placement audit with the local Vite server and imported private map available.
- Use existing scripts and documentation; do not create parallel import pipelines, alternate builds or substitute scenario loaders.

## Simulation and strategic contracts

- Keep core logic free of DOM, rendering, media and filesystem dependencies. UI and AI submit commands through `applyCommand` and share command validation.
- Gameplay randomness must use the serialized seeded PRNG. Rendering, camera movement, audio and visual variation must never consume it.
- Preserve stable IDs, deterministic ordering, source relationships, save fingerprints and schema/rules contracts. Add explicit compatible migrations where necessary; do not silently reset ongoing campaigns.
- Treat existing strategic systems as the gameplay foundation. Visual milestones must not change their rules except to fix a directly related defect.
- Keep occupation/military control separate from sovereignty, and territorial ownership separate from independent holdings and fort ownership.
- Holding-only domains remain meaningful. Do not eliminate domains solely because they own no provinces; use configured survival and victory policies appropriate to each domain type.
- Keep **Classic / Enhanced rules profiles** distinct from **CLASSIC / UNRESTRICTED faction selection**.
- Preserve original availability flags separately from technical playability and scenario overrides. Do not hardcode the original selection list into the simulation or assume unused/special records are playable.
- Preserve special NPC/event-controller roles for further investigation; do not turn every domain into an ordinary territorial player.
- Approved HD port income: seaports earn full province-level GB; river ports earn half, preserving fractional GB. This deliberate rule applies to both rules profiles.
- Convert verified native treasury tenths to GB once when initializing new campaigns (divide by ten). Preserve raw source amounts and never rescale existing saved balances or reports.
- Read `docs/GAMEPLAY_SYSTEMS.md` and `docs/KNOWN_ISSUES.md` before rule-related changes; preserve deliberate HD decisions even when one historical implementation differs.

## Historical fidelity and research

- Prioritize evidence in this order:
  1. Original PC game data, CD help and manual.
  2. Verified original executable behavior.
  3. Historical C/C++ implementation, accounting for modifications and release differences.
  4. AD&D Birthright tabletop rules where PC behavior remains uncertain.
  5. Explicit HD compatibility or enhancement rules.
- Clearly distinguish confirmed original behavior, source-supported reconstruction, compatibility approximation and deliberate HD enhancement. Never present an assumption as a verified 1997 rule.
- Preserve source IDs, raw fields, hashes, offsets, units and provenance when extracting/adapting records. Do not fabricate missing records or silently normalize unusual data, directed borders or imported excesses.
- Use bounded, reusable, read-only extraction tools. Preserve source files; keep proprietary assets and historical implementation code out of distributed/tracked deliverables.
- Do not execute untrusted historical binaries on the host. If execution is necessary, document a controlled isolated-VM procedure first.
- Do not copy proprietary source implementation into the project. Historical source is evidence to examine and qualify.
- Consult `docs/ANUIRE_DATA.md` and the relevant existing research documents before repeating established investigations.

## Visual standards and geography

- **1366×768 at 100% browser zoom is the primary design and review baseline**, not a scaled-down Full HD layout. Keep text, controls and markers comfortably readable; support larger viewports responsively.
- Aim for a premium remaster: hand-painted medieval fantasy, rich parchment/leather/wood/gold textures, distinctive heraldry, original-inspired portraits and regional terrain/architecture.
- Avoid generic SaaS layouts, flat vector replacements for textured art, cartoon substitutions, tiny controls, clutter, weak contrast and overlapping labels.
- Preserve approved restored artwork and portrait masters. Follow `packages/import-tools/art-selections.json`; do not automatically adopt every generated variant or reverse explicit user selections.
- Protect the original **1920×2234** Anuire world, all **206 province geometries**, multi-ring islands/holes, stable IDs, hit testing and selection alignment.
- Preserve original coastlines, rivers and geographic relationships. Never shrink source artwork or alter world coordinates to fit a display resolution.
- Geographic accuracy comes before spectacle. Use province terrain records, local original artwork, masks and source-supported regional corrections together; pixel color alone is not terrain evidence.
- Keep mountain ranges localized and proportionate. Plains, hills and major peaks must look distinct; dense forest must differ from a small wood or lowland edge.
- Preserve painterly assets, shading, depth, pan/zoom and strategic overlays while correcting placement. Keep terrain masks/overrides deterministic and editable instead of accumulating arbitrary coordinates.
- Visual-only terrain and landmarks must not change gameplay terrain categories, movement costs, province geometry or imported campaign records.
- Iconic sites need distinctive identities: Spiderfell, Gorgon's Crown, Rhuobhe, dwarven fortresses, the City of Anuire and Five Peaks must not all become interchangeable castle imagery. Implement landmark work only within the assigned scope.

## Asset and audio preservation

- Retain **all** recovered original art, animation, recordings and unused resources for future screens, tactical battles and RPG adventures. Lack of current usage is never a deletion reason.
- Use the existing import/catalog/manifest pipeline. Preserve original paths, resource IDs, hashes, mappings and enhanced-asset provenance; do not deduplicate solely by basename.
- Keep recovered-on-disc, extracted, cataloged, imported and actually playing in-game as separate claims. Verify the relevant stage before reporting availability or absence.
- Check `docs/AUDIO_ASSET_INVESTIGATION.md` and actual current importer/runtime mappings before making audio claims; older summaries may be superseded. Keep individual WAV findings in research documentation.
- Preserve original recordings rather than inventing replacement music. Respect distinct music, effects, voice, cinematic and scene-cue identities.
- Audio settings must reliably support mute/unmute and enable/disable, including resuming the same track after a setting change or required user gesture.

## Workflow, validation and reporting

- Inspect relevant code and documentation, identify the actual problem, implement the authorized change, preserve unrelated functionality and validate proportionately.
- When implementation is requested, deliver working changes rather than only research, plans, mockups or pseudocode. Do not expand into unrelated systems or advance milestones without user direction.
- Prefer focused edits to existing code over unnecessary abstractions. Do not perform repository administration, unrelated cleanup or broad formatting unless requested.
- Run focused tests for affected behavior and one TypeScript/browser build when appropriate. Repeat checks only for new changes, failures or unresolved concerns.
- For visuals, inspect real browser captures at exactly 1366×768 and 100% zoom before declaring completion. Use identical cameras for Original/Relief comparisons; check selection, labels and dynamic markers when affected.
- Avoid repeated full regressions, large visual test matrices, redundant screenshots and extended AI simulations unless the task requires them. Documentation-only edits need file/content verification, not game builds.
- Verify actual command completion, not only an intermediate success message. Fix obvious defects before reporting completion.
- Use `docs/ARCHITECTURE.md`, `docs/GAMEPLAY_SYSTEMS.md`, `docs/ANUIRE_DATA.md`, `docs/ASSET_PIPELINE.md`, `docs/ROADMAP.md`, `docs/KNOWN_ISSUES.md`, `docs/M1C1_MAP.md` and relevant research documents for details.
- Treat older summaries as evidence to reconcile, not authority over current implementation and explicit user decisions. Update the relevant existing document briefly when an authorized implementation change invalidates it.
- Keep this file stable and concise: no test counts, milestone completion diaries, terrain bug histories or individual audio discoveries. Do not create nested instruction files or a new document for each small fix without a real need.
- Report briefly what changed, what works, material uncertainty/incomplete work and relevant checks. Do not claim historical fidelity or feature completion from an asset, placeholder or data structure alone.
