# Original reference inputs

Place user-owned CD images (ISO or BIN/CUE), the manual, official patches, preservation-patch archives, character/scenario editors, and installation data here.

Keep original inputs unchanged. `npm run assets:import` reads the disc and prepares campaign data under `reference/extracted/` and the full original graphics/audio catalog under `reference/assets/`. The normal application build includes these imported resources. All recovered resources are retained, including assets not yet used by current screens.

Supplied on 2026-10-17: BIN/CUE CD, scanned English manual, scenario editor, five version-labelled patch packages, NFO. A separate character editor and preservation-patch archive were not supplied. See `docs/archive/REFERENCE_INVENTORY.md` for the historical names/hashes, or run `npm run inventory` to generate a fresh read-only inventory under `reference/extracted/`.
