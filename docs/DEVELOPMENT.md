# Development

Use Node 22.12+ and npm. Install with `npm ci`, prepare local game data with `npm run assets:import`, then run `npm run dev`. The game is served at `http://127.0.0.1:5173/`. A single Vite configuration handles browser and Tauri development/builds.

| Command                                         | Purpose                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`                                   | Local development server                                                                |
| `npm run build`                                 | TypeScript check and complete application build in `apps/game/dist`                     |
| `npm run preview`                               | Serve the actual compiled application                                                   |
| `npm run desktop:dev` / `desktop:build`         | Existing Tauri Windows wrapper, using the same frontend pipeline                        |
| `npm run assets:import`                         | Single asset/campaign setup workflow; unchanged complete asset outputs are reused       |
| `npm run research:anuire` / `research:validate` | Independent campaign research and reference validation                                  |
| `npm run inventory`                             | Read-only original-input inventory; outputs under `reference/extracted`                 |
| `npm run typecheck` / `lint` / `format:check`   | Static checks                                                                           |
| `npm test`                                      | Core/import/renderer-geometry unit regressions; original-source tests opt in            |
| `npm run test:original`                         | Complete unit suite including source-dependent Anuire/assets checks                     |
| `npm run test:e2e`                              | Browser gameplay, setup diagnostics, map interaction, audio and viewports               |
| `node scripts/smoke-build.mjs`                  | Compiled application on an independent static server, including music/catalog animation |
| `npm run desktop:check`                         | Tauri schema, frontend paths, commands, icon and toolchain availability                 |

Synthetic world data exists only in `tests/fixtures/` for fast deterministic command tests. Production modules never import it. The Anuire adapter gets generic simulation unit/event defaults from `packages/world-data/simulation-defaults.json`; there is no second playable scenario.

Original-source tests preserve 206/51/116 records and all source starting values, validate deployments/holdings/geometry, exercise territorial and holding-only AI, and compare repeated ten-season simulations across multiple seeds/rule profiles. Browser tests exercise development, recruitment, marches, diplomacy, multi-season progression, saving/restoring after reload, all province selections, island hit testing, missing/invalid inputs and actual audio decoding/playback.

Run a complete final validation after a substantial change. Repeat only affected checks after a failure or subsequent change; avoid rerunning long simulation/browser suites for documentation edits. Browser captures and traces are under `test-results`. The optional comparison script retains historical screenshot naming for continuity.

If port 5173 is occupied, an existing server is still running; use it or stop that terminal's process before starting another. For Vite `504 Outdated Optimize Dep`, stop the old server, start `npm run dev -- --force`, then refresh with Ctrl+F5. This does not clear saved games.

Historical binaries must only run in a controlled isolated VM. Keep research read-only on the host; preserve raw source fields and distinguish verified original facts from compatibility policies.
