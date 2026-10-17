# Roadmap

| Milestone | Focus                                     | Current position                                                     |
| --------- | ----------------------------------------- | -------------------------------------------------------------------- |
| M0        | Playable offline strategic vertical slice | Browser slice implemented and tested; native build pending toolchain |
| M1        | Authentic complete Anuire strategy        | Original data candidates inventoried, no complete trusted import yet |
| M2        | Strategy balance and usability            | Provisional rules, simple AI and procedural art need playtesting     |
| M3        | Babylon tactical battles                  | Replaceable battle-result boundary exists; no scene implementation   |
| M4        | Babylon RPG adventures                    | Request/result and character/inventory schemas only                  |
| M5        | Cerilia expansion and multiplayer         | External region data and deterministic core foundations only         |

## Next implementation work

1. Install the Windows Rust/MSVC/WebView2 prerequisites, build/execute Tauri, test native save persistence and file export, and commit Cargo.lock after successful resolution.
2. Verify `RLMSTART.DAT`, original `.SAV` layouts, and string-ID mapping with independent observations. Compare scenario-editor output in isolation. Import only validated province/domain/holding/unit fields, with per-field provenance and fixtures.
3. Reconstruct original province geometry/borders separately from `.RES` map images. Keep any private visual reference/extractions outside release builds. Create original HD cartography from permitted references.
4. Implement ownership versus occupation and investiture, monthly military phases, sieges/retreats, and original action rolls/regency bidding. Expand CLASSIC only where supported by evidence.
5. Implement create/contest holdings, road/trade-route actions, court/law claims, class details, richer diplomacy/vassalage/tribute, and canonical spell requirements. Keep each addition behind data and commands.
6. Strengthen AI strategic objectives, diplomacy memory, coordinated reinforcement and unit composition. Add difficulty only as an explicit rules profile, without invisible resource advantages.
7. Conduct human playtesting for economy, victory pacing, military balance, readable labels at low zoom, and keyboard map exploration. Add richer original portraits and terrain assets through replaceable presentation packs.
8. Expand browser regression coverage to terminal victory/defeat, damaged/corrupt storage, and additional graphics/browser hardware. Add rules-versioned replay fixtures before changing balance.

Tactical combat, RPG combat, multiplayer networking, and proprietary-code integration must not displace the complete strategic campaign priority.
