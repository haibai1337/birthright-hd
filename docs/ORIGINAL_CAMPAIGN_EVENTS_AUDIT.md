# Original Campaign Events, Betrayal & Realm Incorporation Audit

> **Archiwalny raport wstępny — ustalenia poniżej są superseded.** Raport powstał na podstawie zasobów i nie przeanalizował wtedy dostępnego kodu C++. Późniejsza analiza `GAMEMAP.CPP::RandomEvents` potwierdza w badanym checkoutcie trzyetapowy Gorgon Plot i transfer prowincji, jednostek oraz holdingów. Aktualny katalog i zastrzeżenia wersji znajdują się w [inwentarzu wydarzeń](ORIGINAL_RANDOM_EVENTS_INVENTORY.md), [grafie wykonania](ORIGINAL_EVENT_PROCESSING_FLOW.md) i [grafie transferu Gorgona](SOURCE_REALM_TRANSFER_CALL_GRAPH.md). Treść poniżej zachowano jako zapis wcześniejszego zakresu, nie jako aktualny wniosek.

## Scope and method

This revision re-focuses the audit on the available original game assets and recovered original material, rather than on the modern HD implementation.

The source corpus currently available in the workspace includes:

- original CD image/asset set under `reference/original/`
- extracted catalog and inventory under `reference/extracted/`
- recovered resource manifests under `reference/assets/`
- supporting research notes under `reference/research-cache/` and `docs/`

The key finding from this fresh pass is narrow but important:

- we do have original game assets, game executables, patch notes, source data and cinematic asset references;
- we do not yet have a recovered original narrative-event table or textual event dump that directly confirms a whole-realm betrayal and direct incorporation into Gorgon's Crown or another domain.

Therefore the remembered “realm betrayal + immediate incorporation” sequence remains a plausible historical gameplay memory, but it is not currently established as a confirmed original mechanic by the evidence in this repository.

## 1. Asset inventory: what the original game data actually contains

### 1.1 Original input set identified in the repo

Evidence:

- `reference/original/README.md`
- `reference/extracted/inventory.json`

The project contains the following original-game material:

- `reference/original/Birthright - Gorgon's Alliance.nfo`
- `reference/original/Birthright-The-Gorgons-Alliance_Manual_Win_EN.pdf`
- `reference/original/Birthright-The-Gorgons-Alliance_Misc_Win_EN_Scenario-Editor.exe`
- `reference/original/birthrightv1002DOS.exe`
- `reference/original/birthrightv1002WIN.exe`
- `reference/original/birthrightv1003DOS.exe`
- `reference/original/birthrightv1003WIN.exe`
- `reference/original/Birthrightv1004WIN.exe`
- `reference/original/RPGBGA.BIN`
- `reference/original/RPGBGA.CUE`

This indicates that the repository does contain real original game package inputs, not just modern reconstruction.

### 1.2 Extracted metadata and asset registration

Evidence:

- `reference/extracted/inventory.json`
- `reference/assets/manifest.json`
- `reference/assets/runtime.json`

The extracted manifest includes original asset IDs such as:

- `GRAPHICS/GORGON2.COL`
- `GRAPHICS/GORGON3.COL`
- `GRAPHICS/GORGON4.COL`
- `HIGHRES/GORGONA3.FLC`
- `HIGHRES/GORGONA5.FLC`
- `HIGHRES/GORGONA7.FLC`
- `HIGHRES/GORGONA9.FLC`
- `HIGHRES/GORGONB0.FLC`

This is important because it confirms that the original assets include Gorgon-related high-resolution illustration/cinematic resources. However, these are asset records, not narrative event records.

## 2. What original narrative text we have actually found

### 2.1 Direct event-text evidence is weak or absent in the current corpus

We searched the recovered original and extracted resources for text corresponding to:

- Gorgon
- Mur-Kilad
- Rhuobhe
- betrayal / traitor / treason / defection / surrender
- lieutenant / allegiance / annex / incorporation / revolt

The search results do not show a recovered original event table or narrative script that directly states:

- a realm betrayed its alliance,
- a realm was immediately incorporated into Gorgon's Crown,
- a regent became a lieutenant in a scripted story event,
- the game fired a cinematic and changed all provincial ownership in one step.

This is a negative finding, but it is still valuable: the current repository does not contain a recovered original text resource for that event.

### 2.2 The strongest original text evidence is patch-note material, not plot data

Evidence:

- `reference/extracted/birthrightv1002DOS-Patch.txt`

This file contains the following relevant statement:

> “When the Gorgon 'dies', his message about 'I'll be back.' … had some garbage characters in it. We fixed it.”

This confirms the existence of a Gorgon narrative/cinematic/voice line as part of the original game, but it does not document a betrayal event. It documents a Gorgon death/revival message in a patch note.

That is a direct original-game clue, but not proof of an entire realm betrayal mechanic.

## 3. Cinematic and Gorgon asset evidence

### 3.1 Gorgon cinematic resources are present as original asset entries

Evidence:

- `reference/assets/manifest.json`

The asset manifest identifies high-resolution FLC animation resources for Gorgon:

- `HIGHRES/GORGONA3.FLC`
- `HIGHRES/GORGONA5.FLC`
- `HIGHRES/GORGONA7.FLC`
- `HIGHRES/GORGONA9.FLC`
- `HIGHRES/GORGONB0.FLC`

The corresponding pixel dimensions and frame counts in the manifest show they are large animated art assets, strongly consistent with story or cinematic presentation.

### 3.2 This proves Gorgon had cinematic presence, not a proven betrayal trigger

The current evidence supports the conclusion that:

- Gorgon was represented by dedicated high-res animation assets,
- those assets were part of the original game resource set,
- the game had narrative or dramatic presentation tied to Gorgon.

It does not, by itself, prove that a specific realm betrayal script exists in the original asset set.

## 4. Event scheduling and political triggers: current evidence suggests separate systems

The current repo contains modern HD reconstructions of event scheduling and strategic events, including:

- `packages/core/strategic-events.ts`
- `docs/GAMEPLAY_SYSTEMS.md`
- `packages/core/fealty.ts`

These exist for the HD implementation and are useful as a model, but they are not direct evidence for the original game’s scheduling system.

The original assets we have do not currently include:

- a visible event table in plain text,
- a campaign narrative scripting table,
- a definitive list of realm betrayals and their conditions,
- a cinematic-to-state trigger mapping,
- a direct realm-incorporation database or save-event record.

## 5. Realm and political leads that remain plausible but unconfirmed

This audit does not rule out the remembered scenario. It only says the evidence is not yet recovered in the current repository.

The plausible original-game leads remain:

- Gorgon's Crown / The Gorgon narrative presence
- Mur-Kilad and dwarven/regent identities
- Rhuobhe and related political transitions
- City of Anuire as a possible realm-state target
- AI-controlled realm defection or incorporation events

But in the current corpus, these are still leads, not proven original story triggers.

## 6. Direct evidence matrix

| Finding | Confidence | Evidence | Notes |
| --- | --- | --- | --- |
| Original game assets exist in the repo. | CONFIRMED | `reference/original/README.md`, `reference/extracted/inventory.json` | BIN/CUE, EXEs and manual are present. |
| Gorgon has original high-res animated assets. | CONFIRMED | `reference/assets/manifest.json` | `HIGHRES/GORGONA*.FLC`, `GORGONB0.FLC` entries present. |
| Original patch notes reference Gorgon narrative text. | CONFIRMED | `reference/extracted/birthrightv1002DOS-Patch.txt` | “When the Gorgon 'dies' … ‘I'll be back.’” |
| A whole-realm betrayal and immediate incorporation event is directly proven in the original assets. | UNKNOWN | no recovered original event table or text found | Not currently established. |
| A lieutenant-style realm transfer exists in modern HD logic. | CONFIRMED | `packages/core/fealty.ts`, `docs/GAMEPLAY_SYSTEMS.md` | This is HD reconstruction, not original game proof. |
| The original asset corpus contains recoverable narrative event scripts for betrayal/integration. | UNKNOWN | repository search results | No direct original event script found. |

## 7. Assessment of the remembered gameplay scenario

The remembered scenario is still plausible, but the available evidence in this workspace does not confirm it.

The most conservative conclusion is:

- the original game likely had dramatic political narrative moments,
- Gorgon had a central narrative/visual role,
- realm-state changes were possible through game logic,
- but the repository currently lacks recovered original proof of the exact event chain: “betrayal → realm absorption → regent demotion to lieutenant → army transfer → political consolidation.”

## 8. Missing evidence that would resolve the question

The following would be required to move from HYPOTHESIS to CONFIRMED:

1. a recovered original event table or narrative script file
2. a direct Gorgon or realm-betrayal message string extracted from the original binaries or resource files
3. a campaign-save or scenario file showing the state change in a real original playthrough
4. a decompiled or reversed event dispatcher that references realm absorption and lieutenant conversion
5. an original executable trace or a controlled retail save comparison that demonstrates the event sequence

## 9. Conclusion

The original game assets in this repository are real and substantial. They include the original executables, campaign disc image, patch notes, and original Gorgon cinematic resources.

However, among the currently extracted and recovered materials in this workspace, we do not find the direct original evidence for a scripted betrayal/integration event sequence matching the remembered gameplay recollection.

The safe conclusion is:

- the recollection remains a credible historical memory,
- it is not yet supported by recovered original evidence in the project corpus,
- and the modern HD lieutenant/realm-transfer model remains a valid implementation target only as a reconstruction hypothesis, not as proof of original behavior.

## Confidence legend

- CONFIRMED: direct evidence found in the original or recovered game corpus.
- UNKNOWN: no direct supporting original evidence currently found.
- HYPOTHESIS: plausible memory, but not verified by original records.
