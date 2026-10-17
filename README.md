# Birthright HD

A private personal reconstruction of **Birthright: The Gorgon's Alliance**, with playable Anuire, original map/UI artwork, portraits, soundtrack and sound effects. The campaign contains **206 provinces, 51 domains, 116 regent records and 18 selectable regents**. Deterministic seasonal strategy, AI, economy, recruitment, movement, diplomacy, occupation and save/load are implemented. Gameplay rules remain an explicitly documented reconstruction.

## Install and launch

Requires Node **22.12+**, npm and the supplied original disc image at `reference/original/RPGBGA.BIN`.

```powershell
cd C:\birthright-hd
npm ci
npm run assets:import
npm run dev
```

Open **http://127.0.0.1:5173/**, choose **New game**, select an Anuire regent and **Begin your reign**. Anuire loads automatically; there is no scenario file to select on every launch. Music begins after the first click or key. Missing inputs open setup/import diagnostics. When the local data is already imported, just run `npm run dev`.

## Build and Windows

```powershell
npm run build
npm run preview
```

There is one frontend output: `apps/game/dist/`, containing original artwork/audio and the campaign under `original/`. Preview serves that output. `npm run desktop:dev` and `npm run desktop:build` use the same frontend through the existing Tauri wrapper; native builds require Rust/Cargo and Windows build tools.

All recovered original resources remain in `reference/assets`, including assets for future screens, animation, battles and RPG adventures. Browse them at http://127.0.0.1:5173/original/catalog.html.

## Play and development

Use the left council and bottom toolbar. Each season grants three actions. Save locally or export a campaign from the Load window. Saves restore against the automatically loaded dataset after reopening the app. Shortcuts: **P** provinces, **M** military, **D** diplomacy, **Ctrl+S** save, **F1** help, **Escape** close council.

The modern display target is **1920×1080**, with 1366×768 supported. Original fonts/heraldry/dialog details and some original rules are incomplete; realm music 105 and battle music 102 are absent from the supplied CD. Tactical battles and RPG adventures remain future work.

- [Architecture](docs/ARCHITECTURE.md)
- [Gameplay systems and limitations](docs/GAMEPLAY_SYSTEMS.md)
- [Anuire data and extraction](docs/ANUIRE_DATA.md)
- [Graphics/audio pipeline](docs/ASSET_PIPELINE.md)
- [Development and testing](docs/DEVELOPMENT.md)
- [Known issues](docs/KNOWN_ISSUES.md), [roadmap](docs/ROADMAP.md), [changelog](docs/CHANGELOG.md)
- [Cleanup report](docs/REPOSITORY_CLEANUP_REPORT.md), [detailed research archive](docs/archive/README.md)
