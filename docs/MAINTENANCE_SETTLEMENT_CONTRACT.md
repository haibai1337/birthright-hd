# M1B Maintenance Settlement Contract

## Purpose and evidence boundary

This contract records the design and current implementation of the restored player-facing sequence without placing economy formulas in the UI or settling a season twice. The [current implementation status](#current-implementation-status-2026-10-24) below supersedes the pre-implementation baseline and unimplemented parts of the proposal. M1B remains partial under the [roadmap completion matrix](ROADMAP.md#m1b-completion-contract).

The original CD help confirms **Council → Realm Management → Collect Taxes → Domain Actions**. The source-supported Council dismissal, random-event/NPC order and original Maintenance controls are detailed in [the Maintenance audit](./ORIGINAL_MAINTENANCE_AUDIT.md) and [Council flow investigation](./ORIGINAL_COUNCIL_UI_FLOW.md). The original screens are not proof that current HD settlement already has the same interaction/timing.

## 1. Pre-implementation baseline and proposed processing sequences

Sections 1–9 retain the original design, evidence questions and implementation plan. They do not assert that every proposed field, reserved bloodline purchase or boundary relocation was implemented. In particular, the proposal moves the turn increment to Council dismissal and other boundary work after finalization; current code still performs those operations in `finishSeason` before Council. Use the current status summary for actual behavior and roadmap M1B-3.4/6.4 for outstanding timing verification.

### Pre-Maintenance Birthright HD PC-strategy flow

```text
Domain action rounds 1–3
  -> EndTurn marks endingSeason; automatic actors finish their slots
  -> engine.finishSeason
       expire effects
       settleEconomy -> settlePCEconomy (all active realms)
         roll/credit province taxes, holdings, routes and ports
         allocate law claims; transfer tribute
         charge administration, occupation, court, salaries and forts
         pay armies (GB, then RP); remove unpaid units / mutiny mercenaries
         collect RP, settle fealty RP, update reports and pending tax loyalty
       synchronize rebellions, build castles, resolve/mature occupation and sieges
       expire treaties, seasonal diplomacy
       increment turn; treasury incidents; reset actions/movement
       generate events; NPC campaign administration
       initialize next domainTurn
  -> App notices turn change and opens Council (UI state only)
```

`EndTurn` is not a single action when the player elects to end early: `advanceDomainSchedule` runs remaining controlled slots and AI turns before `finishSeason`. The end-of-season auto-settlement is triggered once when the third round completes. For non-PC scenarios, `settleEconomy` uses the separate generic economy path; leave it unchanged.

Relevant implementations: [`applyCommand` / `advanceDomainSchedule` / `finishSeason`](../packages/core/engine.ts#L618), [`settleEconomy`](../packages/core/engine.ts#L527), [`settlePCEconomy`](../packages/core/economy.ts#L417), [`income`](../packages/core/economy.ts#L233), [`economicForecast`](../packages/core/economy.ts#L404), and [`initializeDomainTurn`](../packages/core/domain-turn.ts#L6). The current App opens Council after a turn increment and closes it without sending a simulation command; see [`issue`, `start` and Council callbacks](../apps/game/src/App.tsx#L245).

### Original proposed restored flow

```text
Three Domain Action rounds
  -> EndTurn / third round drains scheduled actors
  -> seasonFlow.phase = council                 [no economy settlement]
  -> Council presentation                       [UI only; no state/RNG effect]
  -> CompleteCouncil                            [one persisted transition]
       advance target season once
       run the established post-report event/NPC batch once
       keep queued Gorgon scenes pending
  -> seasonFlow.phase = maintenance
       edit choices; view core-generated projections (no RNG)
       CollectTaxes                              [one actual income transaction]
       edit only decisions not locked by collection
       SelectActions                             [one expense/settlement transaction]
       finish remaining seasonal boundary work; initialize action schedule
  -> three Domain Action rounds
```

For a new campaign the initial Council is phase `council` with no prior-season transition to process. Dismissing it enters initial Maintenance without incrementing the campaign turn or generating an extra event/NPC/economy pass. After the first `SelectActions`, the normal three-round schedule begins.

For following seasons, retain the historical Council-before-random-events/NPC ordering supported by the original source investigation. Run `CompleteCouncil` only after the main Council hub is dismissed. If the transition queues Gorgon scenes, keep the phase transition durable but prevent Maintenance commands from running until the scene queue is acknowledged. Resolve pending player event choices before enabling collection. A report-page open/close inside Council is presentation-only; it must not call `CompleteCouncil`.

The existing non-economic boundary operations must be split around the new transaction, not dropped or run twice:

| Existing operation                                                                                                          | Proposed timing                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Effect expiry needed for this season's collection                                                                           | Once, before actual income calculation; preserve existing expiry predicate and target-turn semantics.                                                                                                      |
| Treasury incidents that can enqueue Gorgon scenes                                                                           | Once in the post-Council transition at the same logical target turn; scene acknowledgement only removes the queue item.                                                                                    |
| Random events and `npcCampaignAdministration`                                                                               | Once after Council and before player collection, matching the documented original ordering. Their events/AI changes are not rerun by tax collection or Council repaint.                                    |
| Economy settlement                                                                                                          | Income transaction on Collect Taxes; expense/RP/report completion on Select Actions. No end-of-round fallback settlement for the staged PC path.                                                           |
| Rebellion synchronization, castle construction, occupation refresh/maturation, sieges, treaty expiry and seasonal diplomacy | Run once at the agreed boundary after final settlement and before initializing action rounds, preserving the current within-batch order unless a directly related rule is deliberately verified otherwise. |
| Action reset, army movement reset, pending-event lifecycle, victory checks and next `domainTurn`                            | Run at their corresponding boundary once. Keep the active phase in the save so interruption cannot replay the batch.                                                                                       |

This intentionally changes the point at which the PC income roll is requested and therefore the exact position of those random draws in the PRNG stream. It must remain deterministic: projection/open/close operations consume no RNG; Collect Taxes consumes seeded draws once in a stable order; save/load resumes from the serialized RNG and stored actual-income ledger. The selected design preserves repeatability, not the old sequence of historical roll results after moving the roll to the player's explicit control.

## 2. Persisted phase and transaction model

Add an optional campaign `seasonFlow` record, parsed by the campaign schema and validated by the core. Recommended conceptual shape:

```ts
seasonFlow: {
  phase: 'council' | 'maintenance' | 'actions';
  transitionId: string; // stable turn-boundary identity, not random
  fromTurn: number;
  targetTurn: number;
  initialCouncil?: boolean;
  councilCompleted?: boolean;
  maintenance?: {
    stage: 'choices' | 'collected';
    actualIncome?: Report[]; // immutable, already rolled ledger for every settled realm
    openingTreasuries?: Record<string, number>;
    payroll?: Record<string, 'auto' | 'gold' | 'regency' | 'unpaid'>;
    castleSupport?: Record<string, boolean>;
    provinceLawClaims?: Record<string, boolean>;
    ownOccupation?: Record<string, boolean>;
    pillage?: Record<string, boolean>;
  };
}
```

This is a contract shape, not a requirement to use these exact property names. Use existing stable IDs for map keys. Do not put this ephemeral presentation state into `domainTurn`; that object remains the three-action-round schedule and is absent while the campaign is in Council/Maintenance. Its current round/order/cursor validation must remain authoritative once phase is `actions`.

Core transition commands (or equivalent validated core API operations):

1. `CompleteCouncil`: valid only in automatic `council`; runs the post-report turn transition once and enters Maintenance. It is not emitted for a manually reopened Council during `actions`.
2. `CollectTaxes`: valid only in Maintenance `choices`, with no unresolved event/scene blocker; rolls/records actual income once and changes stage to `collected`.
3. `SelectActions`: valid only in Maintenance `collected`, with required checks satisfied; finalizes expenses/RP/reports and boundary processing once, enters `actions`, and creates the next `domainTurn`.

The UI calls these operations through the core command boundary, just as it does current gameplay commands. No UI callback edits treasury, regency, report rows, province levels, army units or the seeded RNG directly.

## 3. Operation mapping: original choice to current HD engine

| Original Maintenance operation           | Current HD source of behavior                                                                                                                                                                             | Contract for the restored phase                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Light / Moderate / Severe provincial tax | `province.tax`; `ChangeTaxPolicy`; `taxDice`, `income`, `economicForecast` in [`economy.ts`](../packages/core/economy.ts#L198) and command application in [`engine.ts`](../packages/core/engine.ts#L380). | Keep current tax enum and shared dice/expectation implementation. In Maintenance, changes are choices, not rolls. Lock rates at Collect Taxes. Tax UI calls core selectors; no duplicated formula.                                                                                                                                          |
| Guild / temple collection                | `holdingDice`, `incomeDice`, and the shared `income` traversal.                                                                                                                                           | Roll exactly once at Collect Taxes. Keep contested/destroyed handling, holding IDs and current HD dice behavior.                                                                                                                                                                                                                            |
| Law claims                               | Realm-wide optional `realm.lawClaims` / `SetLawClaims`; `income` currently allocates claims using the documented HD compatibility approximation.                                                          | Preserve the realm-wide value for existing saves. Original controls per province, so add stable per-province/per-claiming-realm overrides with “unset = existing realm default” semantics. Do not change the current HD allocation formula or claim limits without separate authorization.                                                  |
| Routes and ports                         | `inspectTradeRoute`, `refreshTradeRoutes`, `portIncome`, accumulated by `income`.                                                                                                                         | Read-only forecast; actual receipts recorded with tax income. Preserve the approved HD seaport full-level / river half-level rule and fractional GB.                                                                                                                                                                                        |
| Treasury / settlement projection         | `economicForecast` and `expenseReport`; `Sidebar` currently renders seasonal forecast and prior reports.                                                                                                  | Expose shared core report/selectors to Maintenance. Forecasts must be pure: no treasury edits, allocations, log entries or RNG consumption. Actual post-collection balance uses stored actual values plus projections of remaining expenses.                                                                                                |
| Per-unit GB / RP / unpaid payroll        | `militaryUpkeep`; current `settlePCEconomy` automatically tries GB, then 5 RP/GB, then unpaid removal/mutiny. Unit data currently has no player payroll selection.                                        | Add per-unit saved choices. `auto` is the compatibility default for migrated saves and reproduces the current fallback order; new UI can select GB, RP or unpaid. Preserve mercenary-to-MONSTERS behavior and stable army/unit iteration. Character salary remains a separate existing expense; do not mistake it for unit payroll.         |
| Castle/tower support                     | `fortifications` or legacy aggregate province forts; current settlement pays each affordable fort and lowers unpaid forts. No support-choice field exists.                                                | Add support decisions keyed by stable fortification ID. Unsupported fort decay happens at finalization exactly once. Do not infer or split multiple individual castles from an aggregate fort level; preserve aggregate records unless source-backed identity exists.                                                                       |
| Court                                    | `realm.court`, `SetCourt`, `COURTS`; current settlement automatically downgrades an unaffordable court before paying.                                                                                     | Keep existing command and court table. Court selection updates the forecast. Preserve the HD automatic downgrade/shortfall policy unless a separately approved mechanics change replaces it; make actual selected/final tier visible in the report.                                                                                         |
| Occupation                               | `province.occupiedBy`, `occupationSinceTurn`, `provinceController`, army/control validation and `expenseReport`. Occupation is military control separate from sovereignty.                                | Continue deriving hostile occupation from current strategic state. Original optional occupation of one's own province has no equivalent field; add a maintenance-only decision keyed by province if implemented, but do not overwrite `owner` or overload `occupiedBy`. Its tax/loyalty/army preconditions need source verification.        |
| Pillage                                  | Existing free `PillageProvince` command rolls severe-rate income, immediately credits treasury and reduces province/loyalty/holdings in [`warfare.ts`](../packages/core/warfare.ts#L350).                 | Leave that command's current outcome unchanged outside Maintenance. Maintenance must not call it as a UI shortcut or add its income again at settlement. A separate staged choice is needed for the original Occupation screen. Exact before/after-Collect-Taxes behavior is unresolved; see §8.                                            |
| Regency collection and payroll           | `finishReport` computes RP; `settlePCEconomy` debits RP upkeep and calls `settleFealtyRegency`.                                                                                                           | Forecast projected RP through the same core calculation. Actual RP collection and RP payroll are committed once at Select Actions from the same income/expense ledger; preserve the cap, whole-RP rounding, order and fealty transfers.                                                                                                     |
| Bloodline increase                       | `IncreaseBloodline` command; validation quotes current `bloodlineStrength + 1`, and execution debits RP and increments realm strength immediately.                                                        | Maintenance may reserve one verified bloodline purchase against the projected available RP; commit its debit and strength increase once at Select Actions. Keep the existing command outcome outside Maintenance. Do not offer future income as spendable unless the shared projection proves it is available after payroll and RP pledges. |
| Reports / actual ledger                  | `Report` schema and `state.reports`; current settlement appends one per active realm.                                                                                                                     | Append one actual report per realm/transition only when the settlement completes. The immutable collected ledger supplies actual income; Select Actions fills expense, closing balance, RP, shortfall and net fields. Never append a second report on reload/retry.                                                                         |

### Current settlement order to preserve inside the transaction

The PC settlement currently calculates incomes for active realms in deterministic province/holding order; credits gross tax/holding/trade/law-claim income; transfers affordable tribute with payer reserves; pays administration and occupation; auto-downgrades court if necessary; pays salaries and fort upkeep; pays each unit with GB, then RP, otherwise disbands/mutinies it; calculates maintenance/net and RP; settles fealty RP; updates reports, logs and pending tax loyalty. Its exact code is in [`settlePCEconomy`](../packages/core/economy.ts#L417).

Refactor this into shared core stages, not a second calculator:

- **Forecast stage:** uses expected dice and selected decisions, returns values only.
- **Collect stage:** calls the existing actual-income path once for all active realms in stable order; persists all actual values and the transition key. Credit each receipt/tribute exactly once (or retain a single staged balance ledger if the implementation proves atomic crediting safer); do not perform payroll/maintenance/RP collection here.
- **Finalize stage:** consumes that persisted income ledger without calling `income(..., true)` again; charges expenses, applies selected payroll/support, collects RP, finalizes delayed loyalty and reports, and runs deferred boundary work exactly once.

The canonical report and treasury arithmetic stay in `packages/core`; never recalculate or round GB/RP in the UI.

## 4. Preview, decision, random and committed-value rules

| Operation                                                                      | Read-only preview                                                                   | Decision                                                    | Seeded random draw                                                                      | Irreversible state change                                                                                      |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Open/dismiss Council; open/close advisor report                                | None required                                                                       | Presentation only                                           | Never                                                                                   | Phase changes only on validated `CompleteCouncil`, not on visual mount/unmount.                                |
| Change taxes, court, claims, payroll or support while in Maintenance `choices` | Recompute forecast from core shared helpers                                         | Persist chosen values in the campaign draft                 | Never                                                                                   | Choice fields only; no revenue, expenses, RP, loyalty or troop changes.                                        |
| Collect Taxes                                                                  | Display prior expectation; after command display stored actual ledger               | Confirm collection                                          | Yes: current actual tax and holding dice, plus any verified choice-dependent roll       | Roll once; store actual results; credit income/tribute once; set stage `collected`.                            |
| Change taxes/claims after collection                                           | Show locked actual tax/claim amount; forecast may still update expense-only choices | Prohibited for decisions affecting already-collected income | Never                                                                                   | None. `ChangeTaxPolicy` and province-claim overrides are rejected for the active transaction after collection. |
| Change payroll, court or castle support after collection                       | Recalculate projected final treasury/RP from stored actual income                   | Allowed until Select Actions                                | Never                                                                                   | Update saved draft/realm court only. Do not re-roll or rewrite actual receipts.                                |
| Select Actions                                                                 | Show final result from actual ledger and current expense choices                    | Confirm phase exit                                          | No new income roll; any remaining random draws must be separately identified and stable | Finalize each cost, RP, loyalty/report and boundary effect once; initialize action rounds.                     |
| Gorgon scene acknowledgement                                                   | None                                                                                | Presentation acknowledgement                                | Never                                                                                   | Remove exactly the acknowledged queue head; do not advance settlement or release a second queue.               |

After collection, actions that change a value already used to roll or allocate income must be blocked. Decisions that affect only expenses may remain editable, subject to an explicit accounting rule. No method named by the UI performs an economic effect; all commands/selectors are validated and executed by the core.

## 5. Transaction boundaries and exactly-once safeguards

### `Collect Taxes`

1. Validate `phase === maintenance`, `stage === choices`, the player is authorized, no pending scene/event blocks collection, and the transition key matches the current target turn.
2. Use the stored current campaign state and choices. Forecast generation itself has already consumed no randomness.
3. Call the actual income calculation once for all eligible realms, in an explicitly stable realm/province/holding order. Preserve seeded RNG via `state.rng`; do not use `Math.random`, UI state or render order.
4. Store actual taxes, holdings, law claims, route/port income, and opening balances in the saved transaction ledger. Transfer/credit revenue and tribute using the existing deterministic rules once. If there are choice-dependent income rolls, store their results with the same transition key.
5. Set stage to `collected`. A repeat `Collect Taxes` is rejected before any RNG or treasury change. Reopening Council/report views or loading the save does not rerun this command.
6. Tax rate and claim decisions are locked. Payroll, court and supported-castle decisions may still change and update the projected closing balances. No troop removal, fort decay, expense debit, RP award or report-finalization occurs here.

The six original controls distinguish Collect Taxes from Select Actions. Actual tax figures become immutable at step 4; final income/expense report rows can remain explicitly “pending settlement” until the next boundary commits.

### `Select Actions`

1. Validate `phase === maintenance`, `stage === collected`, no pending decision/scene, and a valid stored income ledger for this transition.
2. Finalize expenses using stored actual income; never call the actual-income routine again. Preserve current HD ordering and insolvency behavior for `auto` payroll and automatic court/fort handling. Apply explicit GB/RP/unpaid selections without silently changing selected policies.
3. Apply regency once, including payroll, bloodline purchase, and fealty transfers; preserve existing capacities, rounding and stable iteration.
4. Apply each staged occupation/pillage/castle effect at most once, complete delayed loyalty and post-settlement boundary work, write one report set, and run outcome checks.
5. Clear the active transaction only after finalization succeeds; set `phase='actions'` and initialize the three-round schedule. Repeating Select Actions is rejected because phase is no longer Maintenance.

The existing HD shortfall rules are the compatibility default: required administration/occupation payment, automatic court fallback, fort decay on inability to pay, unit GB-first/RP-second fallback for `auto`, and the current unpaid/mutiny consequence. Do not silently replace these with an original negative-treasury game-over rule. Explicit selections must have a clear outcome and user-facing projection; source behavior for unaffordable selected costs remains an open question rather than permission to debit negative treasury.

## 6. Required commands and state/schema changes

Required core additions (names may follow the repository's naming convention):

- `CompleteCouncil`, `CollectTaxes`, `SelectActions`: explicit phase transitions with guards and command-history entries.
- Per-unit payroll choice command keyed by unit ID (`auto`, `gold`, `regency`, `unpaid`). `auto` is needed to preserve existing saves' current GB→RP→unpaid behavior.
- Per-fortification support command keyed by stable fort ID. Legacy aggregate forts need a compatibility fallback; do not invent castle identities.
- Per-province law-claim override keyed by province and realm. Missing override means use existing `realm.lawClaims`, preserving saves and the current HD global switch.
- Own-province occupation choice keyed by province, distinct from hostile `occupiedBy`.
- Staged Maintenance pillage choice keyed by province, separate from the existing immediate `PillageProvince`.
- A reserved bloodline-increase choice/command during Maintenance; current `IncreaseBloodline` remains unchanged outside this phase.

Add optional fields to `campaignSchema`, province/realm state only where the choice genuinely belongs to persistent campaign state, and a report/ledger schema for actual collected values. Validate stable ID references, legal stage combinations, unique transition identity, and the invariant that a collected phase has a complete income ledger. Commands must not consume domain actions. Ordinary domain actions, `EndTurn`, and settlement commands are rejected outside their permitted phase; manual Council display is not a core command.

Do not persist purely visual report-page selection, scroll position, map camera or animations in simulation state.

## 7. Save/load, determinism and legacy compatibility

- Use additive optional schema fields and the existing save envelope until an actual incompatible field requires a version bump. `serializeCampaign`/`deserializeCampaign` already validate and migrate saves in [`persistence.ts`](../packages/core/persistence.ts#L10).
- A legacy save with no `seasonFlow` is an `actions`-phase save. Preserve its existing `domainTurn`, treasury, regency, reports, ownership, holdings, armies, RNG and remaining action budget. Do not retroactively apply a Council, tax roll, expense or event to the already-open season.
- On that save's next completed three-round boundary, enter the new Council/Maintenance flow. Do not call `settlePCEconomy` at both the legacy boundary and Collect Taxes.
- A new save in Council, Maintenance `choices`, Maintenance `collected`, or Actions reloads to that exact core phase. In particular, a collected save resumes from the stored actual ledger and RNG state; no reroll or extra transfer occurs.
- Keep `pendingGorgonScenes` and pending events in the save. Council completion is not allowed to discard scenes; scene acknowledgements never settle or advance seasons. Block selection/collection while required scenes or player event responses are pending.
- Journal all meaningful phase commands (including actual collection and finalization) in the existing `history`. Collection results plus post-command `rng` are persisted. Projections, renders and repeated attempts do not advance RNG.
- Give the new staged history an explicit settlement-contract version/marker so replay can distinguish new histories from old histories that contain only `EndTurn`. Old histories must not be interpreted as if they contained missing `CollectTaxes` and `SelectActions` commands; preserve the legacy replay path for legacy history rather than manufacturing those transitions.
- Keep native source treasury tenths separate from current HD GB. This transaction never rescales a live or saved balance. Preserve the approved HD port-income rule in both Classic and Enhanced profiles.
- Keep original Basic/Advanced/Expert control modes separate from HD Classic/Enhanced rules. The restored player phase does not imply that a rules profile selects an original control mode.

## 8. Original-mechanics questions retained

1. **Law claims:** CD help documents 0–3 GB claims and relative levels; modified source has contradictory logic, while HD uses an explicitly corrected compatibility allocation. Keep the current HD law-claim arithmetic until stronger evidence authorizes a change. Per-province controls are an interface/data gap, not a license to claim retail formula fidelity.
2. **Basic mode:** manual says economic controls are automatic; exact Basic tax, payroll, castle and insolvency formulas are not fully established. Do not infer them from HD Classic/Enhanced.
3. **Pillage timing:** help allows pillage before or after Collect Taxes. The cached source does not establish a verified retail rule for tax projection, loot/randomness, cancellation or province/holding mutation when toggled after collection. Keep the existing immediate HD `PillageProvince` behavior distinct; implementation must resolve this before claiming the original after-collection behavior.
4. **Own-province occupation:** original Maintenance exposes an own-occupation decision. HD `occupiedBy` represents control/occupation and affects `provinceController`; it cannot safely be overloaded to mark the sovereign's own occupation. Confirm the original tax, loyalty, garrison and expense effects before implementing that choice.
5. **Fort identities:** the original charges per castle, but some HD state is an aggregate province fort. Individual support choices require stable castle identities; do not fabricate them from a level total.
6. **Expense shortfall:** original help describes a negative-treasury failure after management choices; current HD uses automatic expense priority, court downgrade, fort decay and unpaid-unit consequences. Preserve the current HD policy unless explicitly changed after evidence review.
7. **Ports:** preserve the approved HD seaport/river-port values. Original help, cached source and executable static analysis conflict; this is not a settlement-contract reason to change approved policy.
8. **Calendar and report association:** moving income from end-of-season to explicit collection changes which turn is displayed on reports and can alter timing for effect expiry, loyalty, rebellion, sieges and treasury incidents. Define each stored report's `turn` and each effect's effective boundary explicitly; preserve one-time order and test it against the existing gameplay contract before UI completion.
9. **Deterministic sequence compatibility:** moving seeded rolls later preserves reproducibility but changes results for a fixed old seed relative to prior releases. Use versioned replay/history semantics; do not claim byte-identical old replay output without proof.

## 9. Ordered implementation plan

1. **Core schema and migration** — update [`schema.ts`](../packages/core/schema.ts), [`persistence.ts`](../packages/core/persistence.ts) and state-reference validation. Add the optional phase/ledger/choice data, keep old saves in `actions`, and validate phase invariants. Do not touch imported scenario records.
2. **Shared settlement split** — refactor [`economy.ts`](../packages/core/economy.ts) into pure forecast, once-only actual income collection and ledger-consuming finalization. Keep current dice, claim allocation, GB/RP policy, report fields, port rules and stable ordering. Retain the generic settlement path and preserve `settlePCEconomy` only as a guarded compatibility wrapper if required by callers.
3. **Phase and command enforcement** — update [`engine.ts`](../packages/core/engine.ts), [`validation.ts`](../packages/core/validation.ts), and [`domain-turn.ts`](../packages/core/domain-turn.ts). Split the PC `finishSeason` path, implement the three explicit transitions and decision commands, prevent duplicate transactions, and create action rounds only after Select Actions. Keep non-PC scenarios on their existing path.
4. **Focused core tests** — add tests beside existing economy/engine/persistence tests for each transition, actual RNG draw once, repeated command rejection, insufficient funds, save/load at all four phases, queued scene/event gating, legacy-save next-boundary migration, and unchanged non-PC settlement. Assert treasury/RP/reports/forts/units/loyalty and serialized RNG, not just phase labels.
5. **UI wiring (separate authorized implementation task)** — make automatic Council Done dispatch `CompleteCouncil`, render Maintenance from core phase, expose shared forecasts and existing strategic map/context actions, and dispatch decisions/Collect Taxes/Select Actions as commands. Manual Council in Actions remains presentation-only. Reconstruct the parchment/table/map screen only under its separately approved UI scope.
6. **Roadmap update and end-to-end review** — update Maintenance status only after the relevant core phase and player-facing UI are actually implemented and verified. Until then it remains planned, regardless of the presence of this contract.

## Current implementation status (2026-10-24)

Implemented for PC domain-action campaigns:

- `seasonFlow` is persisted. New campaigns start in Council; legacy saves without it load in Actions with their stored resources and existing action schedule intact.
- `CompleteCouncil`, `CollectTaxes` and `SelectActions` are validated, journaled one-time transitions. End of round three enters Council; Council dismissal runs the event/NPC pass once; collection saves actual income and tribute; finalization consumes that ledger, applies expenses/RP/loyalty and writes reports once before starting action round one.
- Actual boundary placement differs from the earlier proposal: `finishSeason` performs construction, siege/occupation processing, seasonal diplomacy, treaty/effect expiry, the turn increment and treasury incidents before Council. Initial Council skips the standard event/NPC pass; later `CompleteCouncil` runs it before collection. Select Actions finalizes economy and initializes the schedule; it does not perform a second siege/construction/turn increment. The retail calendar remains awaiting evidence, not an approved timing exception.
- The previous PC economy is split into `collectPCEconomy` and `finalizePCEconomy`; the legacy `settlePCEconomy` wrapper and non-PC settlement path remain available. RNG is consumed only by actual collection, seasonal events and action-order initialization, not by forecasts or screen navigation.
- Per-province tax and law-claim controls, per-unit payroll selections, individual fortification support, court controls and core-derived financial projections are connected to validated commands. Unit payroll defaults to the prior automatic GB→RP→unpaid policy. Castle-support decisions reset after settlement; aggregate legacy forts remain unselectable.
- The parchment-left / interactive-map-right interface has Taxation, Occupation, Payroll, Maintenance, Reports and Collect Taxes/Select Actions controls. Council Reports reopen the existing Council; dismissing a manual Council returns to the same Maintenance phase.
- Own-province occupation and Maintenance pillage remain unavailable; existing occupation state and immediate `PillageProvince` behavior are not repurposed. Original Basic/Advanced/Expert automation and unresolved retail formulas are not claimed as implemented.
- The proposed reserved bloodline purchase is not implemented. Core validation permits the existing immediate `IncreaseBloodline` command during Maintenance, but `MaintenanceScreen.tsx` has no dedicated control/reservation; its verified original interaction and commit timing remain open under roadmap M1B-4.6.
- New campaigns carry settlement version 2; saves without a version are treated as version 1. Legacy replay uses the pre-phase settlement path. Full original icon-state and 1366×768 visual review remain manual follow-up work; the broader Strategic Interface milestone is still incomplete.
