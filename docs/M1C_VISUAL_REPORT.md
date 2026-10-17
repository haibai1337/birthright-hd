# M1C visual and musical restoration report

2026-10-17. Original Anuire map art, the shield menu, a reconstructed left-council strategic layout, regent portraits and original recordings are integrated into the playable M1B campaign. Simulation/commands and the Covenant Marches JSON remain unchanged.

## Local launch

```powershell
cd C:\birthright-hd
npm run assets:import
npm run dev
```

Open `http://127.0.0.1:5173`. The private pack is discovered automatically. The first click/key activates music. Choose **New game → Load Anuire campaign data**, select `C:\birthright-hd\reference\extracted\anuire\anuire.research.json`, choose one of 18 eligible regents and begin. The Assets catalog link is in Options, or open `/_private/catalog.html` directly. Reload the same private campaign data before restoring an Anuire save after an app restart.

For a clean build use `npm run build` and `npm run release:check` (`apps/game/dist`). For a private local static build use `npm run build:private`; serve `apps/game/dist-private` and preserve its `_private` directory. These two web outputs coexist. The private output contains proprietary user-owned content and must not be redistributed. `npm run desktop:build:private` is the corresponding Windows wrapper route; its Tauri build hook uses `apps/game/dist` and Rust/Cargo must be installed. Rebuild clean before checking a public release after a private desktop build.

## Recovered content and implemented screens

- 13 resource archives plus nine music files: **9,501 decoded records**, including all 1,396 UI members, 23 font sheets, 1,101 effects and nine original music recordings. 246 AVA-to-portrait mappings are available.
- Main menu and in-campaign game menu use MAINPANL, original proportions and eight narrowing button rows. Unsupported multiplayer is disabled.
- The strategic screen has a persistent regent/resource/action council on the left, original map terrain with logical province overlays, a bottom toolbar and purple message strip. It preserves source coordinates and all 206 selectable provinces.
- New Game shows the selected original character art. Province, realm, recruitment/movement, diplomacy and chronicle commands open framed floating windows. Load/import/export and Options remain reachable.
- Audio switches between recovered recordings and exposes persistent music/effects/mute controls. Realm track 105 is absent, so the campaign's use of original 101 is visibly labelled as an alternate. The menu uses original intro recording 106.

The detailed formats, provenance and limitations are in [ORIGINAL_ASSET_INVENTORY.md](ORIGINAL_ASSET_INVENTORY.md), [ORIGINAL_UI_RECONSTRUCTION.md](ORIGINAL_UI_RECONSTRUCTION.md) and [ORIGINAL_AUDIO_RESEARCH.md](ORIGINAL_AUDIO_RESEARCH.md).

## Comparison captures

Private reference images are `reference/research-cache/m1c/reference-menu.png` and `reference-strategy.jpg`. They are never included in Git/builds. Reconstructed screenshots and comparison sheets are generated under ignored `test-results/`:

- [Menu at 640×480](../test-results/m1c-menu-640.png) and [1920×1080](../test-results/m1c-menu-1920.png)
- [Strategy at 640×480](../test-results/m1c-strategy-640.png), [1366×768](../test-results/m1c-strategy-1366.png) and [1920×1080](../test-results/m1c-strategy-1920.png)
- [Province management at 1920×1080](../test-results/m1c-province-1920.png)
- [Original / reconstructed menu comparison](../test-results/m1c-menu-comparison.png)
- [Original / reconstructed strategic comparison](../test-results/m1c-strategy-comparison.png)

The comparison is a visual reference, not a claim of pixel-perfect equivalence. Original font metrics, some generated heraldry, exact domain-action arrangement, advisor animation/lip sync, cinematic playback and individually rebuilt original dialog interiors remain incomplete. The supported M1B command forms are deliberately retained. Bitmap edges are controlled but genuine high-resolution redrawn artwork has not been invented.

## Verification record

| Check                        | Result                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Public unit/regression suite | 84 passed; 13 private-source tests intentionally skipped in this mode                                           |
| Opt-in original-source suite | All 13 passed, including all 9,501 asset records and deterministic campaign regression checks                   |
| Browser acceptance           | All 15 distinct cases passed across the main run (12) and targeted rechecks (3)                                 |
| Actual audio decoding        | All nine music recordings and three representative effects decoded; menu/campaign media time advanced           |
| Audio controls               | Interaction gating, scene transitions, volume, mute and persisted preferences passed                            |
| Campaign interaction         | All 206 provinces, map overlays, seasonal commands, save/load, prior M0 flows and offline operation covered     |
| Display captures             | 640×480 reference, 1366×768 gameplay and 1920×1080 gameplay captured; 1920 comparison sheets visually inspected |
| Source integrity             | CD image SHA-256 remains `62b0049a550d046f22e6707ff831df67b456f5959306556ef3569f587b3f945d`                     |

Three browser cases initially hit test timing limits on this host: two completed too near the global 30-second deadline, and the small-reference capture raced an automatically expiring notification. The harness now allows 90 seconds and waits for notification expiry; all three rechecks passed. The production map-readiness race found during implementation was fixed separately and is covered by deliberate image-delay testing. These are combined acceptance results, not a claim that the original full-suite invocation exited successfully.

The user narrowed the modern display target to **1920×1080**; 2560×1440 was removed from acceptance work. Native build/run remains untested without Cargo/Rust. The Browser skill's runtime returned no available browser sessions; repository Playwright Chromium supplies the repeatable browser verification.

Final packaging status: TypeScript and both Vite frontend compilations passed. The standalone private-production smoke test passed before separating the web output directories. The subsequent private build's asset copy was still running at the last observed status. At the user's request, further tests were stopped: no repeated smoke test of `dist-private`, final clean-release scan or native configuration recheck was performed after that packaging adjustment. The earlier lint check passed; these last packaging/documentation edits were not checked again. This does not change the completed gameplay/audio acceptance results above.

To repeat checks: `npm test`, `npm run test:original`, and `npm run test:e2e`. The private tests require the user's disc/campaign/asset files. After `npm run build:private`, `node scripts/smoke-private-build.mjs` tests the private production files with a standalone static server, without Vite; it covers the original menu, 206-province campaign, seasonal command, playing music, catalog pagination and animated previews. `node scripts/capture-m1c-comparisons.mjs` regenerates the comparison sheets after browser screenshots have been captured and the private reference images are available.

No new economy, diplomacy, battle, adventure or AI mechanics are introduced. Future unrestricted faction compatibility is preserved. A fully verified original Classic campaign still has the M1B research limits; M1C restores presentation without relabelling provisional rules as original behavior.
