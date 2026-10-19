# Birthright HD Roadmap

This roadmap reflects the current repository state as of the present implementation and documentation, not historical labels or stale milestone summaries. The original milestone letters remain authoritative; the work below distinguishes verified completion from partial implementation, active work and remaining research.

## Status at a glance

| Milestone | Scope | Status |
| --- | --- | --- |
| M1A | Anuire reconstruction, original data, playable technical foundation | Complete |
| M1B | Original strategic mechanics | In progress / partial foundation |
| M1C | HD graphics and visual reconstruction | Partial / active |
| M1D | Advanced AI and balance | Planned |
| Original Strategic Interface — Complete HD Reconstruction | Cohesive original-inspired HD strategic UI | High priority / planned |

## Verified accomplishments

### M1A: Anuire Reconstruction — Complete

- Recovered and integrated the original Anuire dataset: 206 provinces, 51 domains, 116 original regent records and their source relationships.
- Rebuilt the original campaign technical foundation: deterministic simulation, seeded PRNG, campaign schema, scenario adaptation and save compatibility guards.
- Preserved original source IDs, raw fields, province geometry and relationship metadata for future compatibility work.
- Recovered and cataloged original game assets, including art, UI materials, music and mapped resource metadata.
- Restored and retained the original soundtrack and audio catalog, including recovered strategy and campaign cues.

### M1B: Original Strategic Mechanics — In progress / partial

- The simulation engine is functional and includes major strategic systems already implemented, including warfare, occupation, investiture, holdings, diplomacy, economy, movement, regency and campaign events.
- The event system is actively implemented and documented as a bounded source-supported reconstruction, with supported logic, diagnostics and save safety.
- The codebase retains HD compatibility decisions and explicit source-verified differences rather than claiming a full retail match.
- Key remaining gaps are not a failure of the engine as a whole; they are the expected remaining work on exact original behavior, player-facing interfaces and completeness of the original rules set.

### M1C: HD Graphics & Visual Reconstruction — Partial / active

- The strategic map is substantially reconstructed in HD, including terrain-first painting, relief/landscape generation and source-aligned placement for the broader world.
- Mountains and hills, forests and woodland ground, and plains, fields and meadows have completed reconstruction passes. Swamps/wetlands, unified transitions across all terrain types, environmental reconstruction beyond the 206 province boundaries, and final whole-map visual consistency review remain planned.
- Original recovered artwork is preserved and used; the importer and asset pipeline retain the complete catalog, including currently unused resources.
- Strategic interface reconstruction remains a major unfinished workstream; the functional provisional interface is not visually approved as the intended final Birthright HD experience.

### M1D: Advanced AI & Balance — Planned

- The project has not yet implemented the original advanced AI and campaign-balance work as a finished milestone.
- Existing strategic and event systems are treated as the design foundation; advanced AI, balance tuning and original NPC behavior remain explicit future work.

## Current implementation status by workstream

### 1) Connected terrain and environmental reconstruction

- Status: Major terrain passes completed; remaining reconstruction planned.
- Completed: Mountains and hills; forests and woodland ground; plains, fields and meadows. The current Anuire map documents source-guided placement and review of these passes in [M1C1_MAP.md](M1C1_MAP.md#connected-terrain-across-anuire-current).
- Planned: Swamps and wetlands; unified natural transitions between all terrain types; environmental reconstruction outside the 206 province boundaries; and a final whole-map visual consistency review.
- Guardrail: Preserve original province geography and gameplay terrain classes; do not alter the campaign geometry or movement logic in favor of visual convenience.

### 2) Main-menu HD restoration

- Status: Unfinished; separate from strategic-interface reconstruction.
- The current menu uses HD branding and recovered original assets, but a logo or functional menu is not verification of a complete HD restoration. Keep the main-menu HD restoration explicitly open until the full intended menu presentation has been reviewed and approved.
- Remaining visual work includes military icons, regent and character portraits, verified heraldry, original interface art, fonts, animations and other presentation details. Preserve all recovered assets regardless of current use.

### 3) Original Strategic Interface — Complete HD Reconstruction

- Priority: High. Status: Planned; the current React strategic UI is functional but provisional and is not visually approved as the final Birthright HD experience.
- Objective: deliver a cohesive, faithful HD reconstruction of the original strategic user experience, not a collection of unrelated modern panels.
- Scope: full strategic-screen composition and layout; original Birthright parchment, wood, stone and decorative artwork; domain and province management; original action menus and command controls; Council and report integration; army and holding interfaces; regent and character information; consistent typography, icons, buttons and visual hierarchy; responsive presentation at 1366×768 and larger; and restoration or HD recreation of original assets where needed.
- Preserve all existing game functionality and the original campaign's identity. Do not treat functional controls, a React sidebar, or a single restored screen as completion of this milestone.
- The Council is one component of this larger restoration. Reconstruct it from verified original artwork, composition and interactions rather than styling it after the provisional sidebar; do not expand Council work into an unrelated full-interface rewrite.

### 4) Council, advisors and original user experience

- Status: Council hub Phase 1 implemented; full report-page reconstruction remains open within the high-priority strategic-interface milestone.
- In the original game, the report hub is shown automatically at each domain-turn start; detailed advisor/report pages are selected from the hub. The source-supported order, mode comparison, asset identifiers and unresolved retail questions are documented in [the Council UI flow investigation](ORIGINAL_COUNCIL_UI_FLOW.md).
- Implemented: a modular, original-art 4:3 advisor hub opens on new campaigns and after seasonal resolution, can be reopened manually, and closes without issuing a simulation command. Advisor/report choices link only to related existing councils; unavailable original briefings and report pages are clearly marked.
- Remaining future work: restore original briefing text and report-page functions/presentation, and verify the documented source-only details against retail evidence before claiming exact equivalence.
- Preserve current recovered assets and source evidence while avoiding fabricated original behavior.

### 5) Regents, heroes and character interface

- Status: Partial data recovered, interface not complete.
- Completed: Regent/character records and campaign data exist, including original candidates and relevant source-backed identity logic.
- Missing: Character/regent selection and details, inventory/equipment, spellbook, skills, blood abilities, progression, item management, magical items/artifacts, character and lieutenant controls, portraits and related UI.
- Do not mark this system complete simply because regents exist as campaign records.

### 6) Expert Mode, domain actions and magic

- Status: Research needed / partial implementation.
- Expert Mode: The original variable control-mode experience is not considered equivalent to the current Classic/Enhanced rules profiles. The exact Expert Mode UI and rules remain a distinct research and reconstruction task.
- Domain actions: The underlying engine contains substantial domain-action logic, but the full original action inventory, restrictions, UI and interaction flow remain a documented backlog item.
- Magic: Realm spells and spellcasting systems are partly implemented; the full set of original realm spells, character/adventure magic, spell acquisition and spellbook functionality remains outstanding.
- The project must not treat the currently implemented subset as full completion of the original magic system.

### 7) Turn flow, troop movement and original atmosphere

- Status: Research needed / planned.
- Needed work: The advisor/report ordering at the season boundary is now source-documented in [the Council UI flow investigation](ORIGINAL_COUNCIL_UI_FLOW.md). The “Troops are on the march” presentation, visible army movement during turn processing, movement animation/synchronization, waiting phases and clear AI-domain feedback remain to be investigated.
- Research before implementation is required; the project deliberately preserves deterministic strategy logic and avoids artificial gameplay changes for animation alone.

### 8) Remaining major systems

- Status: Planned / partial.
- Tactical battles, RPG adventure mode, character combat and progression, lieutenant systems, espionage, sea transport, relic mechanics, balance investigations, advanced AI and original NPC behavior remain unresolved or not fully implemented.
- This includes the genuine long-tail of original-game systems that are not covered by the core strategic simulation foundation.

## Milestone-specific work plan

### M1B sub-areas

- M1B-1: Warfare, occupation and investiture — implemented and retained as a working core system.
- M1B-2: Domain actions and holdings — partial implementation; action inventory, restrictions and UI completion remain open.
- M1B-3: Economy and trade routes — partial, with compatibility decisions and known unresolved original behaviors.
- M1B-4: Realm magic and bloodlines — partial implementation; full original scope and UI remain open.
- M1B-5: Diplomacy, units and remaining rules — substantially integrated, but not treated as complete retail equivalence.
- M1B-6: Fealty, native events and initialization — implemented as a bounded source-supported reconstruction; remaining native timing and edge-case behavior are explicitly documented as unresolved.

### M1C sub-areas

- M1C-1: Illustrated strategic map — implemented and reviewed in the current repository; terrain and landscape polish remain ongoing.
- M1C-1E and later local refinements: source-constrained placement, terrain continuity and local visual polish remain active work.
- M1C-2 and later visual/interface work: not started as a full milestone bundle; original UI restoration remains a separate task stream.

### M1D

- Planned future milestone for advanced AI, balance, campaign depth, and original NPC/system fidelity.
- Work should proceed only after the relevant original behavior has been researched and documented; do not assume current HD compatibility defaults equal original retail behavior.

## Documentation and validation policy

- Source-backed implementation claims must be matched against current repository evidence before they are marked complete.
- Historical placeholders, stale reports and older milestone headings are not evidence of current completion.
- Future work should proceed with one source of truth: the current code, the documented known issues and this roadmap.

## Birthright HD — Expansion Pack

This is a separate long-term roadmap item for expansion beyond the original Anuire campaign.

**Birthright HD — Expansion Pack**

- New playable territories and provinces.
- Additional realms, regents, holdings and characters.
- Expanded settlements, landmarks and terrain.
- Additional lore, events, mechanics and units where appropriate.
- Gradual expansion from Anuire into wider Cerilia without inventing unsupported data.
- Separate preservation of the original campaign baseline while adding future regional content.

The project should continue to treat Anuire as the initial, verified campaign foundation and keep the expansion pack clearly separated from the original-game reconstruction effort.
