# Known issues

- Gameplay is an experimental Anuire reconstruction. Original template records are imported, but exact retail New Game transformations/difficulty changes are not certified.
- Original relationship/tribute matrix axes and runtime flags, variable save character tails, native unit balance and special NPC behavior remain partially decoded.
- Movement preserves three asymmetric source links; Floodspaeth → Caercas is geographically suspicious. Original movement-code costs remain unknown. See [Anuire data](ANUIRE_DATA.md).
- Ten original holding-capacity excesses are retained. Runtime orders cannot enlarge them; this is deliberate preservation of source data.
- Diplomacy, development, combat, AI and victory use the explicit compatibility rules in [gameplay systems](GAMEPLAY_SYSTEMS.md). Classic is not yet the full 1997 rule set.
- Realm cue 105 and battle cue 102 are missing from the supplied single-data-track CD. Campaign track 101 is explicitly disclosed as an alternate original recording.
- Original font sheets and heraldic artwork are recovered, but font metrics, complete realm/heraldry mappings, individual dialog interiors and advisor animation remain unfinished. Tactical battles and RPG adventures are not implemented.
- The 640×480 layout is a comparison reference; modern forms may scroll. Main modern targets are 1366×768 and 1920×1080.
- Tauri configuration is maintained; a native Windows build/run cannot be certified here without Rust/Cargo. Browser production and original-media checks are separate from that limitation.
- A stale Vite process/cache can cause a blank page with `504 Outdated Optimize Dep`. Restart the existing server with `npm run dev -- --force` and Ctrl+F5; avoid a second server on the same port.

Missing game data/artwork opens setup diagnostics. Run `npm run assets:import` and retry setup. All recovered resources are retained even when no current screen uses them.
