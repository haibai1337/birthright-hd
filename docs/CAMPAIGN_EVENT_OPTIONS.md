# Campaign event options

Campaign Events is a tab in Options, available before starting a game and during play. Before a game, choices apply to the next new campaign in that session. During play, they belong to that campaign; device audio/interface preferences never overwrite them. Difficulty (Easy/Medium/Hard, default Medium) is independent of the victory-point target and rules profile.

| Section | Switch | Default | Exact scope |
| --- | --- | --- | --- |
| Random Events | Economic Events | On | Native IDs 0–3: special-realm treasury aid and ID 0's AI surplus estimate. |
| Random Events | Magical Events | On | IDs 4–8: Bless, Blight, Warding, Honest Dealing, Dispel protection. |
| Random Events | Military Events | On | IDs 9–16: randomly selected monster/mercenary unit records. |
| Random Events | Random Rebellions | On | ID 17: reduce the selected sovereign's qualifying province loyalty to zero. |
| Special Campaign Events | Gorgon Plot | On | Story checks, ally selection/support, takeover, and queued story presentation. |
| Special Campaign Events | Special Reinforcements | On | Independent Gorgon/Five Peaks/Spiderfell/Rhuobhe troop generators. |
| Special Campaign Events | Diplomatic Events | On | Random directed reaction decreases/increases. |
| Special Campaign Events | Treasury Incidents | **Off** | Optional legacy overflow PARTY/THEFT/EMBEZZLE, at 5,000 GB or more. |

Treasury Incidents defaults Off by the user's explicit follow-up decision: the source calls this protection against 16-bit overflow, which HD does not need. Turning it on deliberately restores the original high-balance incidents, with native amounts divided by ten. All On includes this opt-in switch; All Off affects only the eight event categories.

Changes apply at the next eligible processing point. Standard event IDs are drawn from the unchanged 9/18 pool **before** filtering. A disabled selection is skipped, without a replacement or reroll. Disabled categories execute no event-specific random calls. Disabled independent generators consume no random numbers of their own. Changing switches can consequently change later seeded results; it does not renormalize the original event pool.

Disabling a category never removes applied magic, units, cash, rebellions, ownership or story progress. Turning Gorgon Plot off preserves its stage, ally and pending scene queue; turning it back on resumes. Acknowledging/skipping a scene changes presentation state only. Story effects are committed before the scene opens.

Ordinary loyalty resolution, occupation, taxation, upkeep, AI administration, diplomatic actions, fealty, and treaty consequences remain active. Random Rebellions is distinct from ordinary loyalty-driven rebellion. Military Events is distinct from Special Reinforcements. Sideath's fixed scripted ward is a geographic campaign rule, independent of random Magical Events. Adventure-site generation is not tied to any of these switches and remains an RPG dependency.

Save format 1 is extended additively. Missing switches load with these defaults; missing difficulty loads Medium; missing plot state starts at stage zero with no ally. Existing balances and source IDs are unchanged. Old saves mark their current event phase already processed rather than inventing past events. Pending cinematics and acknowledgements survive saves; loading an acknowledged stage does not replay its effects. See the [implementation report](CAMPAIGN_EVENTS_IMPLEMENTATION_REPORT.md) and [test matrix](CAMPAIGN_EVENTS_TEST_MATRIX.md).

## Campaign Access — independent HD options

Added 2026-10-19 in a separate Options tab. Both default **Off** and are independent of all eight event switches, difficulty and Classic/Enhanced rules. All On/All Off in Campaign Events does not change them.

- **Unlock all landed domains** uses the existing CLASSIC/UNRESTRICTED faction-selection mode. CLASSIC keeps the 18 original selectable kingdoms. UNRESTRICTED exposes all **32 supported landed realms**, including Anuire, Gorgon's Crown, Mur-Kilad and Thurazor, with their recovered ruler candidates. Holding-only realms, inactive records and the landless MONSTERS event controller are not playable factions. Original flags, IDs, balances, rulers and geography are preserved. This controls the next New Game list; switching it off during an unlocked campaign never removes or replaces its ruler.
- **Unrestricted diplomacy** allows proposals between any active foreign domains, including special factions and MONSTERS, without the ordinary faction, court, ambassador/reaction or minimum-consideration audience gates. It does **not** guarantee acceptance: action/GB/RP costs, seeded rolls, defensive RP, cooldowns, asset ownership and valid fealty constraints still apply. Inactive, eliminated and assimilated records are not revived. MONSTERS retains its event-controller/raider role and its existing AI; this option does not replace special campaign scripts or introduce a new AI personality.

Both choices persist in the campaign save. Before starting a campaign they apply to the next game in that session. Older saves without unrestricted diplomacy load it as Off; an existing saved faction-selection mode remains intact. Turning either option off never reverses accepted treaties or previous transfers. Negative modified reactions that succeed through RP are clamped to valid stored reaction values, preserving save invariants. Implementation is an explicitly requested HD enhancement, not a claimed original 1997 rule.

Verification: `tests/campaign-access.test.ts` covers defaults, old/new saves, independent free settings commands, audience gates, costs/rolls, negative-reaction acceptance, special domains, cooldowns, fealty cycles and start/save/load of all 32 real landed realms. The affected access/regent/fealty/event/strategy/architecture run passed **107 tests**. `tests/e2e/campaign-access.spec.ts` passed at 1366×768: independent controls, 32 entries, Gorgon campaign, mid-game disable without ruler replacement, persistence and actual diplomatic target/action availability. The reviewed capture is `test-results/campaign-access/options-1366x768.png`.

`npm run build` completed successfully, including full TypeScript checking and the original-assets copy (exit code 0). `git diff --check` passed. The existing large-bundle advisory remains; no desktop packaging was attempted.
