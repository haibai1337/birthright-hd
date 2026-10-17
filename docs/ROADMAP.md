# Roadmap

| Milestone | Focus                                     | Current position                                                                                      |
| --------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| M0        | Playable offline strategic vertical slice | Browser slice implemented and tested; native build pending toolchain                                  |
| M1A       | Evidence-backed Anuire reconstruction     | Completed private template extraction, formats, provenance and map contours                           |
| M1B       | Playable original-template Anuire         | Complete 206-province import, 48 AI domains, repeated-season play and local loading                   |
| M1C       | Original visual and musical identity      | Local original asset extraction, classic strategic layout, map art and original recordings integrated |
| M1        | Verified complete original strategy       | Stock initialization and several original rules still need validation                                 |
| M2        | Strategy balance and usability            | Provisional rules, simple AI and procedural art need playtesting                                      |
| M3        | Babylon tactical battles                  | Replaceable battle-result boundary exists; no scene implementation                                    |
| M4        | Babylon RPG adventures                    | Request/result and character/inventory schemas only                                                   |
| M5        | Cerilia expansion and multiplayer         | External region data and deterministic core foundations only                                          |

## Next implementation work

Presentation follow-up: finish original font metrics and verified heraldry assignment, refine individual dialog interiors, investigate missing audio cues 102/105 from a fuller user-owned source, and test native WebView audio/file flows. Retain the current playable campaign while improving fidelity. These presentation gaps are documented in the M1C reports.

1. Install the Windows Rust/MSVC/WebView2 prerequisites, build/execute Tauri, test native save persistence and file export, and commit Cargo.lock after successful resolution.
2. Run the controlled VM experiment: immediate stock/patch New Game saves for default/alternate regents and different difficulties, compared to the decoded template. Do not repeat completed template/string/map extraction.
3. Decode original unit definitions, weighted movement codes, character state and diplomacy axes; replace explicit M1B compatibility policies only where evidence supports them. Retain private source/geometry exclusion from releases and add permitted HD presentation assets separately.
4. Extend existing occupation into investiture, monthly military phases, sieges/retreats, and original action rolls/regency bidding. Expand CLASSIC only where supported by evidence.
5. Implement create/contest holdings, road/trade-route actions, court/law claims, class details, richer diplomacy/vassalage/tribute, and canonical spell requirements. Keep each addition behind data and commands.
6. Strengthen AI strategic objectives, diplomacy memory, coordinated reinforcement and unit composition. Add difficulty only as an explicit rules profile, without invisible resource advantages.
7. Conduct human playtesting for economy, victory pacing, military balance, readable labels at low zoom, and keyboard map exploration. Add richer original portraits and terrain assets through replaceable presentation packs.
8. Expand browser regression coverage to terminal victory/defeat, damaged/corrupt storage, and additional graphics/browser hardware. Add rules-versioned replay fixtures before changing balance.

Future UNRESTRICTED faction selection is configurable through the existing availability/support policies and does not require editing imported flags. The M1B UI intentionally retains original eligibility. Develop playable holding-domain objectives, recruitment/access rules and special NPC support before exposing additional factions; unused/placeholder records are not presumed viable. This work must not block experimental Anuire play.

Tactical combat, RPG combat, multiplayer networking, and proprietary-code integration must not displace the complete strategic campaign priority.
