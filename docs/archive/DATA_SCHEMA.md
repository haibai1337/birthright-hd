> Historical research snapshot. Runtime/build instructions and milestone limitations below may be superseded. Current documentation starts at [README](../../README.md), [Anuire data](../ANUIRE_DATA.md) and [asset pipeline](../ASSET_PIPELINE.md). Binary layouts, source IDs, offsets and extraction findings are preserved here.

# Data schema and persistence

Runtime schemas are the executable specification in `packages/core/schema.ts`. `validateScenario` adds graph/reference/capacity checks beyond field validation. Scenario definitions and mutable campaign states are separate structures.

| Schema              | Content and constraints                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provenance          | Status, source citation, note; always attached to external definitions                                                                            |
| Region              | ID, display name, culture, provenance                                                                                                             |
| Province definition | ID/name/region, terrain enum, finite polygon/center coordinates, symmetric adjacency, development cap and base magical potential                  |
| Realm/domain        | ID/name/color/sigil/motto, regent character and provenance; no coupling to province geometry                                                      |
| Character           | ID/name/class, bloodline, command/diplomacy attributes, inventory IDs; inventory/adventure logic deferred                                         |
| Bloodline           | Derivation, nonnegative strength, ability IDs; ability execution deferred                                                                         |
| Holding             | Unique ID, province/realm references, law/guild/temple/source, level; combined capacity checked per province and type                             |
| Unit definition     | ID/name, muster/upkeep/minimum-level data, auto-combat power, provenance                                                                          |
| Army/unit state     | IDs, realm/province references, nonempty unit list, strength 1–100, once-per-season movement marker                                               |
| Treaty              | Distinct realm pair, peace/pact/alliance/war, opinion −100…100, since-turn; no duplicate pairs                                                    |
| Trade route         | Realm/from/to references, unique ID; income supported, route-construction action deferred                                                         |
| Spell/effect        | Requirements, GB/RP costs, effect discriminant and duration; only the explicitly enhanced test ward exists                                        |
| Event               | ID, positive weight, gold/loyalty adjustments, optional decision, provenance                                                                      |
| Domain command      | Discriminated union for development, holdings, mustering, movement, tax, diplomacy, fortification, spell, event response, EndTurn                 |
| Economy/report      | Per-realm, per-season actual tax/holding/trade, maintenance/military upkeep, net and regency                                                      |
| Ruleset             | Typed configuration with PC tax ranges and provisional balance; CLASSIC/ENHANCED identifiers                                                      |
| Scenario            | Identity/revision/provenance, definition catalogs, initial state, resource allocation, explicit victory thresholds                                |
| Campaign            | Scenario identity/revision, profile, player, seed/RNG, turn/ID sequence, mutable assets/relations/effects, decisions/reports/log/history, outcome |
| Save                | `format: "birthright-hd"`, `version: 1`, campaign payload                                                                                         |

Example accepted command:

```json
{ "type": "RecruitUnit", "provinceId": "p4", "unitType": "infantry" }
```

Actor identity is a separate engine argument. Production multiplayer would authenticate it outside the engine. Command validation checks current sovereignty, resources, action count, terrain, army movement, relations, and prerequisites. Failed orders return `{ok:false, state, error:{code}}` and preserve the input object.

Save text is limited to 10 million characters before parsing. Unsupported envelope versions and mismatched scenario revisions are rejected with visible errors. The serializer rejects malformed/non-finite numeric fields. The loader checks missing/duplicate world entities, references, capacity, and dynamically allocated IDs. It does not cryptographically authenticate saves or prove that the supplied history produced the supplied state. Players may edit singleplayer save files at their own discretion within validation limits.

No migration is required yet: version 1 is the only format. Future versions must supply explicit migrations and fixtures before accepting older saves. Full original-game saves are **not** compatible with this format. Binary original data stays private until decoded fields are independently validated.

The synthetic JSON is regenerated by `node packages/world-data/create-scenario.mjs`. It contains original invented geography and regents, and verified unit-cost facts with field-level caveats for invented combat power. Adding another data region does not require a new core rule branch. The current UI registers one bundled scenario; a scenario catalog/import UI and renderer bounds driven entirely by metadata are future work.
