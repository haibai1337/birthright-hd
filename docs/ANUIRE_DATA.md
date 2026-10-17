# Anuire data

Anuire loads automatically from `/original/anuire.research.json`. Development serves `reference/extracted/anuire/anuire.research.json`; the default build copies the same file into `apps/game/dist/original/`. New Game selects an eligible regent, rules profile and seed. A missing or invalid dataset opens setup/import diagnostics rather than a substitute campaign.

`npm run assets:import` reconstructs the campaign if it is missing, then prepares original assets. The independent research tools remain available:

```powershell
npm run research:anuire
npm run research:validate
```

Both default to `reference/original/RPGBGA.BIN`; the extraction command also accepts an alternate image path. Original inputs are opened read-only. Historical executables are never run on the host.

| Recovered records          | Count |
| -------------------------- | ----: |
| Provinces and geometries   |   206 |
| Domains                    |    51 |
| Regent records             |   116 |
| Selectable default regents |    18 |
| Holdings                   |   766 |
| Fortifications             |    39 |
| Military deployments       |   234 |
| Character deployments      |    63 |
| Directed movement links    | 1,053 |

The playable adapter is `packages/world-data/anuire-scenario.ts`. It preserves source identities, starting ownership/resources, raw fields, occupation, holdings, deployment locations and original selection flags. It imports the complete world; the retired partial M0 projection is no longer generated. Generic unit/event compatibility values live in `simulation-defaults.json`, independent of test geography. Research-format labels such as `research-preview` describe the evidence corpus, not a restriction on playing the adapted campaign.

Geometry comes from the original quarter-scale province ID raster. All 206 source centers match their IDs. LGMAP is 1920×2234 and shares those coordinates exactly. Seven provinces have multiple rings: Ghoried, Ilien, Ice Haven, Bindier, Islien, Bevaldruor and Winoene. Disconnected islands and holes remain supported by hit testing.

Three links have no reverse link:

| Direction             | Source indices | Movement code |
| --------------------- | -------------- | ------------: |
| Moere → Spiderfell    | 19 → 25        |             1 |
| Seaport → Fhoruile    | 39 → 29        |             7 |
| Floodspaeth → Caercas | 149 → 3        |             0 |

The last pair has no shared raster border. There are also 17 raster contacts without movement links, some just one pixel long. Neither graph is silently repaired or substituted for the other. Original movement-code meanings remain unresolved.

Verified inputs include `RLMSTART.DAT`, `STRDAT.DAT`, the recovered executable name-pool prefix, AVA identity definitions, `MAP.RES`, PC help text and separately compared saves/editor strings. The supplied CD SHA-256 is `62b0049a550d046f22e6707ff831df67b456f5959306556ef3569f587b3f945d`.

Original template balances are verified; exact retail post-New-Game regent/difficulty transformations are not. Original diplomacy matrices, variable save character tails and special NPC behavior remain raw research. The highest-value experiment is a controlled isolated-VM before/after save comparison for the same regent and difficulty; the [archived procedure](archive/ANUIRE_RECONSTRUCTION.md#scenario-editor-and-save-route) explains containment and evidence capture.

Binary record sizes, field offsets, IDs, sentinel values, LZSS/container framing and extraction algorithms remain in [format research](archive/ANUIRE_RECONSTRUCTION.md) and [cross-source evidence](archive/ANUIRE_SOURCE_MATRIX.md). Generated reports and maps stay under `reference/extracted/anuire`, including `adjacency-report.json`, `coverage.json`, `source-cross-checks.json`, map manifests and save comparisons.
