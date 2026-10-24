# Original Council, advisor and seasonal UI flow

## Evidence and confidence

The CD `RULES.TXT` describes the player-facing sequence; the cached C++ provides call sites and screen transitions. Source references below are from the retained `fire-lizard/birthrt` checkout (revision `fc47055002c4b776bfb1e8737b5aaf7f6d43edce`). That source contains later modifications, so source-only details are qualified rather than treated as certified retail behavior. No original executable was run.

## Seasonal presentation flow

1. **End of the domain turn.** When the last domain action round is over, `GAMEMAP.CPP::UpdateDataArea` settles seasonal effects (including occupation, loyalty, castle maintenance and relation changes). A victory check can call `PlayFinale` here, before the advisor screen. The same end-of-round work can select a new adventure site; that selection is state preparation, not a separate screen.
2. **Advisor hub opens automatically.** The state changes to `INIT_REPORT_MODE`; the next update increments the date and calls `GiveReport(0)`, which opens the full-screen advisor interface. The CD help explicitly says this screen appears at the start of every domain turn, including the first. It is the recurring seasonal report entry point, not an automatically paged-through stack of every report.
3. **The player chooses report pages.** The hub presents four advisors and report buttons. The cached source automatically sequences the four advisors' voice introductions and brings each animated advisor forward while speaking on the first hub visit in that process. The report pages themselves are opened by clicking their buttons. `Done` closes the hub.
4. **Post-report processing.** Only after `Done` does `REPORT_DONE_MODE` call `RandomEvents()` and then `DoNPCAdmin()`. A qualifying Gorgon's Plot scene is played synchronously from `RandomEvents`, after the advisor hub has closed and before normal player realm management. Ordinary event messages are queued as immediate reports; the inspected `CheckForImmediateReports()` call site is after `DoNPCAction()`, not in the seasonal report-opening path, so their exact presentation point depends on later action processing.
5. **Realm management / actions follow.** The flow returns to the domain-turn interface for management and tax collection, then domain actions. The manual says the realm-management screen is not available in Basic mode.

The sequence is grounded in [`RULES.TXT` §§ “The Domain Turn” and “Reports”](../reference/extracted/disc/RULES.TXT#L33), [`UpdateDataArea`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4316), [`RandomEvents`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L3996), and [`GiveReport`](../reference/research-cache/fire-lizard-birthrt/REPORT.CPP#L958).

### Answers to the flow questions

- **Did the Council/advisor screen open automatically every season?** Yes: the CD help says it is shown at the start of each domain turn; the cached end-of-round state path calls it automatically. The source calls it the “Councilor's Screen”; the visible interface is the four-advisor report hub.
- **Was a seasonal report displayed automatically?** The hub was automatic. Its individual advisor text, graphs and reports were selected from that hub; the source does not automatically open each report page in sequence. On the first domain turn the advisors summarize the realm; the help describes the later turn-specific reports.
- **What came first?** Seasonal settlement and its possible victory finale; then the automatic advisor hub; after its `Done`, random events (including any qualifying Gorgon cinematic), NPC administration, and then the management/action phase. Adventure-site selection is performed during the pre-report end-of-round work, but is not itself a presentation.
- **Was the hub different in Basic, Advanced or Expert?** No control-mode branch appears in the cached `GiveReport`, `AdvisorButton` or `PaintReportButtons` path, and the turn-state path calls the same `GiveReport` for all modes. The manual's explicit mode difference is that Basic omits realm management after the advisors. This establishes no advisor-screen difference in the inspected sources, not complete retail equivalence.

## Advisor and report inventory

The help's functional inventory is: **Chamberlain** (realm strength and loyalty), **General** (war and troop status), **Mage/Wizard** (adventure news and investiture), and **Spymaster** (information from agents; the help also describes alliances). It states that the detailed Realm Strength, Loyalty and Troop reports begin on domain turn two. The source's hub buttons map to:

| Source button | Screen/report | Access or qualification |
| --- | --- | --- |
| 0–3 | Chamberlain, General, Mage/Wizard, Spymaster report text | Click the corresponding advisor button; text is read from the realm's `.rp0`–`.rp3` files. |
| 4 | Realm Strength / province-and-holdings graph | Click the report button. |
| 5 | War report | Click the report button. |
| 6 | Adventure News | Click when enabled; source disables it without a selectable site and in multiplayer. |
| 7 | Alliance report | Click the report button. |
| 8 | Loyalty graph/report | Click the report button. |
| 9 | Troop graph/report | Click the report button. |
| 10 | Investiture report | Click the report button. |
| 12 | Done | Closes the hub and resumes the saved domain-turn state. |

Selecting a report hides the hub and opens a report menu (`D_DRPRT`, or `D_LOYALTY` for loyalty); its Done action returns to the advisor hub. Separately, the map/domain screen has a Report control wired to `DoReport`, which calls `GiveReport(1)` and reopens the hub during play. The cached source also has button 11, “Dungeon Master Toolkit,” gated to single-player report mode; because this appears to be a source-branch tool and is not part of the manual's advisor inventory, it is **not** treated here as a confirmed retail advisor screen.

Evidence: [`AdvisorButton`](../reference/research-cache/fire-lizard-birthrt/REPORT.CPP#L1408), [`PaintReportButtons`](../reference/research-cache/fire-lizard-birthrt/REPORT.CPP#L1627), [`PaintReportMenu` / `DoneReportMenu`](../reference/research-cache/fire-lizard-birthrt/REPORT.CPP#L1809), [`DoReport`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L3202), and the [CD help report descriptions](../reference/extracted/disc/RULES.TXT#L994).

## Identifiable original UI art and animation

The advisor hub uses the following source-named backgrounds and FLCs:

- Human advisors: `UI\ADVISORS\ADVISORS.PCX`; `HCONSL01.FLC`, `HGENRL01.FLC`, `HWIZRD01.FLC`, `HSPYMS01.FLC`.
- Elf advisors: `UI\ADVISORS\ADVISELF.PCX`; `ECONSL01.FLC`, `EGENRL01.FLC`, `EWIZRD01.FLC`, `ESPYMS01.FLC`; two placements of `ELFTORCH.FLC`.
- Dwarf advisors: `UI\ADVISORS\ADVISDWF.PCX`; `DCONSL01.FLC`, `DGENRL01.FLC`, `DWIZRD01.FLC`, `DSPYMS01.FLC`.
- The hub buttons paint `UI\SCRLBTN0.PCX`; Done uses `UI\SCRLBTN5.PCX`. The code also loads `SCRLBTN1.PCX`–`SCRLBTN4.PCX`, but does not identify their specific use in this hub.
- `D_DRPRT` uses `UI\REPORT1.PCX` at `(142,50)`, size `356×372`, as its parchment. `D_LOYALTY` uses `UI\REPORT2.PCX` at `(102,6)`, size `436×468`, as its loyalty-table screen. `DoneReportMenu` and the report-menu Escape handler return to `D_ADVISOR`.
- Gorgon's Plot scenes invoked from the post-report random-event pass map to `INTRO\GORGON2.FLC`, `GORGON3.FLC` and `GORGON4.FLC` (with `GORGON1.TXT`–`GORGON3.TXT` scene text). These are conditional story cinematics, not part of every seasonal report.

The source animates the advisor FLCs with fidget frames and, during the introductory voice sequence, foreground movement. Its static `introPlaying` state is initialized once and not reset by `GiveReport`, so the cached code supports a one-time sequence per process, not a fresh four-voice sequence every season. This specific playback cadence still needs retail verification. The parchment mappings are source-confirmed; exact final retail presentation and any additional overlays still need visual verification.

Evidence: [`GiveReport` asset selection and setup](../reference/research-cache/fire-lizard-birthrt/REPORT.CPP#L1324), [`PaintReportButtons` animation and buttons](../reference/research-cache/fire-lizard-birthrt/REPORT.CPP#L1627), [`D_DRPRT` bitmap and return regions](../reference/research-cache/fire-lizard-birthrt/MENUDATA.H#L92), [`D_LOYALTY` bitmap and return regions](../reference/research-cache/fire-lizard-birthrt/GAMEMENU.H#L651), [`RandomEvents` Gorgon calls](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4101), and [`PlayGorgon`](../reference/research-cache/fire-lizard-birthrt/MAIN.CPP#L1184). The existing [UI reconstruction notes](archive/ORIGINAL_UI_RECONSTRUCTION.md) and [asset pipeline](ASSET_PIPELINE.md) provide current extraction context; resource identifiers do not by themselves prove a resource was present in every retail installation.

## Current Birthright HD comparison

The provisional strategic interface still provides the persistent regent/domain council, separate domain panels and Chronicle. A modular Council hub now presents the recovered faction-specific 640×480 advisor backgrounds, animated advisor FLC frames, original report-button grid and Done button, scaled proportionally as a centered 4:3 overlay. It opens on a new campaign and when seasonal resolution advances the turn (including advancement after a pending domain-action response); players can also reopen it manually and dismiss it with Done or Escape.

The Council now keeps navigation inside the 4:3 presentation: selecting an advisor or report opens a parchment page, and Done or Escape returns to the hub; only Done or Escape from the hub dismisses the Council. The hub remains mounted beneath the report, preserving advisor animations and the existing seasonal/Gorgon-scene gate. `REPORT1.PCX` supplies the report parchment; `REPORT2.PCX` supplies the loyalty page. The four advisor pages and supported report pages are explicitly HD-derived from current campaign records, not presented as original briefings. Realm Strength, Loyalty and Troop Report show the first-turn availability notice until Domain Turn 2. War, Alliance and Investiture display available campaign data; Adventure News retains its parchment but clearly reports that verified adventure-site content is unavailable. Original `.rp0`–`.rp3` briefing text was not found in the extracted runtime text assets, and spy/agent intelligence is not modeled. Loading a saved campaign does not replay the automatic Council. Unlike the researched original order, HD resolves the season in the simulation before displaying the Council; report navigation is presentation-only and does not rerun or alter that processing. The broader strategic-interface milestone remains unfinished. See [`CouncilScreen.tsx`](../apps/game/src/CouncilScreen.tsx), [`ClassicChrome.tsx`](../apps/game/src/ClassicChrome.tsx), and [`App.tsx`](../apps/game/src/App.tsx).

## Reconstruction recommendations

1. Recover and verify original advisor `.rp0`–`.rp3` text, adventure-site news and spy/agent intelligence before presenting any such content as original.
2. Verify source-supported behavior against retail evidence before claiming exact equivalence; in particular, confirm the intro voice cadence, art selection and mode-specific differences.
3. Preserve presentation-only sequencing and deterministic simulation. The current HD order intentionally waits until seasonal resolution completes before showing its Council, then releases queued Gorgon scenes only when the hub is dismissed.
4. Keep the modular report pages readable at the 1366×768 baseline and integrate them into the future unified strategic interface without styling that interface after the provisional sidebar.

## Remaining verification

- The CD help and cached source agree on the main seasonal sequence, but no retail executable was run; source modifications mean precise retail behavior remains unverified.
- Confirm the first-visit advisor voice sequence, its repeat behavior across seasons and saves, and whether every realm uses the human/elf/dwarf art-selection rules exactly as shown in source.
- Compare the identified `D_DRPRT`/`D_LOYALTY` artwork and reconstructed report layout against retail captures when available.
- Establish the precise timing and ordering of all immediate event reports relative to NPC turns, and confirm whether any retail events show a separate waiting, troop-movement or presentation screen.
- Verify whether Basic, Advanced and Expert have any retail-only differences in advisor content or button availability beyond the documented Basic-mode management omission.
