# Original strategic UI reconstruction — M1C

2026-10-17. The presentation uses the M1B campaign and command engine unchanged. It loads original assets from a separate local pack. Without that pack the clean frontend retains its procedural development presentation.

## Evidence and screen coordinates

References are the [original Windows strategic screen](https://cdn.mobygames.com/screenshots/10101832-birthright-the-gorgons-alliance-windows-main-map-screen-that-you.jpg), the requested [MobyGames gallery](https://www.mobygames.com/game/1410/birthright-the-gorgons-alliance/screenshots/) and [Kiran Welle's Windows captures](https://www.kiranwelle.com/birthright/). The gallery page returned 403; its direct strategic image was accessible. Kiran's `multcommon1.png` shows the original shield menu. Private reference copies are under `reference/research-cache/m1c`.

The original frame is 640×480. Its left council occupies approximately x=0–141, with a braided divider at the right. The map begins around x=142. Realm identity and resources sit at the upper left; turn/action information follows. Large pictorial domain-action buttons descend below them. Small map-mode/action icons and a purple turn/message strip occupy the bottom/right. Management windows overlay the map.

The menu's recovered MAINPANL is 420×480, centered at original x=110. Its eight button rows begin near local y=242 and continue at approximately 26-pixel spacing, narrowing toward the shield point. Those source proportions define the new button hit regions. Resource identity and bounds were cross-checked against the pinned [MENUDATA.H reference](https://github.com/fire-lizard/birthrt/blob/fc47055002c4b776bfb1e8737b5aaf7f6d43edce/MENUDATA.H); no source implementation was copied.

## Implemented layout

`ClassicChrome.tsx` defines a distinct left-council/map/bottom-toolbar layout. It does not arrange the old dashboard around a new color scheme. The persistent council shows original character art, domain identity, separate treasury/regency, season/action information, pictorial command buttons and End season. The bottom bar provides province inspection, domain, recruitment/movement, diplomacy and chronicle. The map has four overlays and zoom/fit/focus controls. Province, realm, military, diplomacy and chronicle contents reuse the tested Sidebar command bindings inside a framed floating window.

MAINPANL and LOGO provide the menu; DTURN_BK supplies the council parchment/braid; DACTN_IC supplies action artwork; SCRLBTN supplies button surfaces; MARBLE supplies dialog material. New Game shows an original portrait for the selected Anuire regent. Main-menu options retain their original hierarchy. Multiplayer remains visibly disabled because it is unimplemented. About replaces browser-level Quit; the in-campaign shield includes Return and Main Menu. Save/export/import remain available.

The campaign's initial camera fills the map viewport around the selected province; Fit map explicitly shows the whole source image. All 206 province contours remain selectable, including detached islands and holes. Original LGMAP (1920×2234) uses the same world coordinates as hit-map-derived geometry: no guessed offset, rotation or aspect correction. Existing province overlays are transparent over the art. Forts and displayed holdings use source place positions/icons where available; recruited entities use explicit fallback marker positions. Army stacks use recovered unit-type art when available and retain readable counts. Logical selection/adjacency remains drawn by Pixi.

## Resolution and interaction

The layout uses a fixed logical council plus a flexible map. Council width ranges from 190 to 284 CSS pixels on modern desktop displays; the 640×480 reference layout uses 142 pixels. The map gains the remaining widescreen area. The bottom toolbar remains a separate row. Original menu art preserves its 420:480 aspect ratio, caps at 2× native height on large displays, and uses nearest-neighbor/pixelated sampling. Bitmap textures are not blurred to invent detail. Repeated frames/materials and readable browser text expand independently of the original image.

Province and marker labels remain readable at zoom; sprite markers have controlled screen size. Resize handling does not rebuild the province scene. Panning, wheel zoom, list selection, overlays, keyboard controls and simulation RNG remain separate. P/M/D open councils, Ctrl+S saves, F1 opens help and Escape closes the floating council. Dialog Escape/focus restoration remains provided by the existing modal component.

Map initialization queues state/selection updates until geometry is ready. Original icon textures load separately; they cannot block province interaction. Camera controls remain disabled until the map is ready, with a visible loading message. A deliberately delayed map-image browser test covers early selection during this process.

## Known visual differences

- Text uses readable system serif/sans fonts. All 23 original font sheets are recovered, but their glyph metrics/character mapping are not yet implemented as a runtime font renderer. Menu lettering therefore differs from the original blackletter font.
- The new council groups supported actions into five windows. It does not pretend unsupported Adventure, Hold Action or Hire Lieutenant commands work. Original icon purposes are adapted and some positions differ.
- Original heraldic sheets are recovered. A complete realm-to-heraldry assignment has not been verified; some existing generated shields remain in management windows. They are not claimed as authentic coats of arms.
- Notifications retain an accessible toast/petition flow. Dialogs use recovered frames/materials with the existing HD command forms, not pixel-exact reproductions of every original dialog.
- The 13 UI FLC animations are fully extracted; live advisor/lip-sync behavior and cinematic playback are deferred. Battle/adventure sprites have catalog previews; those game modes remain deferred.
- The 640×480 comparison is a reference layout; modern text/forms may require internal scrolling at that size. Modern gameplay targets remain 1366×768 and above.

Comparison screenshots and browser results are indexed in [M1C_VISUAL_REPORT.md](M1C_VISUAL_REPORT.md).
