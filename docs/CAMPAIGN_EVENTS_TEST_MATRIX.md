# Campaign events test matrix

`tests/campaign-events.test.ts` uses synthetic regression data plus an explicitly private-Anuire integration case. Seeded continuation tests use the real serialized PRNG; exact draw/boundary tests inject bounded draws. Existing strategic/fealty tests cover event antimagic costs and expiration alongside the broader M1B suites.

| Behavior | Automated coverage |
| --- | --- |
| IDs 0–3 | Per-ID dispatch/persistence; native date formulas; /10 conversion; shared Gorgon gate; individual Rhuobhe/Spider controls; surplus; no player grant reports. |
| IDs 4–8 | Per-ID effects; coexistence/refresh; ward MONSTERS ownership; ward/dispel replacement; 0–19 resistance; existing RP-cost/three-boundary tests. |
| IDs 9–16 | Every icon mapping; conquered regional routing; four special owners; MONSTERS fallback; record capacity; missing template failure; report audience. |
| ID 17 | Initial loyalty zero; strictly lower positive comparison; native tie order; no direct contest; ordinary rebellion still runs with switch off. |
| Scheduler | First completed season; Easy/Medium/Hard thresholds independent of victory points; all attempt counts 3–7; duplicates; 0/1/2/3-owned targets; native scan bias; no retry; idempotence; legacy phase preservation. |
| Four standard switches | Original 18-pool draws retained when disabled; disabled dispatch has no extra RNG; each category tested separately. |
| Plot switch | Disabled full-state/RNG preservation; resume stage two; pending scene acknowledgement independent of game effects. |
| Reinforcement switch | Disabled state/RNG preservation; Military Events off does not disable reinforcements. |
| Diplomacy switch | Random grievance reduction/increase; special exclusions; vassal tribute protection/termination; disabling randomness preserves RNG while treaty thresholds still run. |
| Treasury switch | Off default on new/old saves; disabled RNG/cash unchanged; opt-in native scaling; repeated theft, embezzlement, seasonal party/help and scaled losses. |
| Reinforcements | Every difficulty lower/upper inclusive bounds; four generators; Gorgon date/deployment conditions; geographic ownership routing. |
| Gorgon Plot | All stages/date/probability gates; stage separation; candidate exclusions; adjusted/raw score comparison; ally support; stage-three grants/no support; ownership transfer; regent promotion; missing/self/eliminated ally; before/after saves; completed-stage guard. |
| Campaign options | Free player-only command; effects/story/AI cursor preserved; mixed persistence; old-save defaults without treasury conversion; seeded save continuation. |
| Essential administration | NPC aid survives all-off; fallback/payroll regression coverage alongside economy/strategy tests. |
| Real Anuire | All 206 provinces, actual original units/holdings/characters, takeover, references, serialization and resumed state. |
| Browser controls | Eight toggles individually; All On/All Off; audio preferences unchanged; saved difficulty/mixed choices; full event grid and controls at 1366×768. |
| Browser cinematics | Real original image/text; scene acknowledgement saved; missing movie/text fallback; stage effects not replayed. |

## Final verification — 2026-10-18

- `npm test -- tests/campaign-events.test.ts tests/strategy.test.ts tests/fealty-initialization.test.ts tests/audio-settings.test.ts tests/economy.test.ts tests/domain-actions.test.ts tests/warfare.test.ts tests/realm-magic.test.ts tests/core.test.ts tests/domain-architecture.test.ts tests/regent-selection.test.ts tests/original-assets-private.test.ts --maxWorkers=1 --testTimeout=30000`: **173 passed, 1 opt-in private asset test skipped**. This includes **67 campaign-event tests**, including real Anuire takeover/routing/save validation. Sequential execution with a 30-second case limit resolved the earlier private-Anuire timeout under file contention.
- With `BIRTHRIGHT_PRIVATE_REFERENCE_TESTS=1`, the private asset test was then enabled explicitly: **1 passed**, validating all retained source records, three complete movie sequences, 14 report mappings and original audio identities. Thus all 174 selected unique tests were actually executed successfully.
- `npx playwright test tests/e2e/campaign-events.spec.ts`: **2 passed**, including the strengthened full-grid/no-scroll assertion at exactly 1366×768, individual switches, saved choices, actual cinematic/text, fallback and same-track music resume. The cinematic case was also captured and rechecked separately. Existing `tests/e2e/audio-options.spec.ts`: **1 passed** after integration.
- `npm run build`: **passed**, including full TypeScript checking, browser bundling and completed original-game-assets `closeBundle` copy (exit code 0). Vite retains its existing large-chunk advisory; no desktop build was run.
- `npm run assets:import`: **completed**, reusing complete prior recoveries and adding three movies/texts plus original report mappings/provenance.
- Primary screenshots: `test-results/campaign-events/options-1366x768.png` and `test-results/campaign-events/gorgon-1366x768.png`. Both reviewed as real browser captures at 100% zoom. The initial clipped options descriptions were corrected before final verification.
- `git diff --check`: passed; only existing Windows line-ending conversion notices were printed.
