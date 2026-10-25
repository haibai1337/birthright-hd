/** Read-only Birthright 1.5 accounting companion to economy.ts.
 * No commands, collection, payments, RNG, receipts or save migrations occur here. */
import type { Birthright15Campaign, Scenario } from './schema';
import { courtCostProjection15 } from './court-actions-state15';
import { regencyCollectionQuotes15, regencyForecast15, regencyPayrollQuote15 } from './regency15';
import type { PayrollSelection15 } from './regency-state15';
import { regencyPoints } from './quantities';
import { domainRulesOf } from './domain-rules';
import {
  goldUnits,
  goldFromGB,
  goldFromGBRatio,
  goldFromLegacyGB,
  type GoldUnits,
  GOLD_UNITS_PER_GB,
} from './quantities';
import { taxableBy, provinceController } from './domains';
import { npcPayrollExempt } from './economy';
import {
  characterActor35,
  character35,
  skillCheck35,
  sourceHandler35,
  validateCharacterOverlays35,
  isRegencyOverlayVersion35,
  type CharacterOverlays35,
} from './character-sheets';

const zero = () => goldUnits(0n);
type Holding = Birthright15Campaign['holdings'][number];
const sum = (values: readonly GoldUnits[]) => goldUnits(values.reduce((a, b) => a + b, 0n));
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
function level(value: number): bigint {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error('Expected a nonnegative safe level');
  return BigInt(value);
}
function nonnegative(value: GoldUnits): GoldUnits {
  if (typeof value !== 'bigint' || value < 0n) throw new Error('Expected nonnegative exact money');
  return value;
}
const positive = (value: bigint) => goldUnits(value > 0n ? value : 0n);
export const courtUpkeep15 = (court: number) => goldFromGB(level(court));
export function provinceRevenue15(provinceLevel: number, modifier: GoldUnits = zero()): GoldUnits {
  const base = goldFromGB(level(provinceLevel));
  if (typeof modifier !== 'bigint' || modifier % GOLD_UNITS_PER_GB !== 0n || modifier * 2n > base)
    throw new Error('Tax modifier must be whole GB and at most +50% of province base');
  return positive(base + modifier);
}
export function holdingRevenue15(type: Holding['type'], activeLevel: bigint): GoldUnits {
  if (activeLevel < 0n) throw new Error('Negative holding level');
  return type === 'source' ? zero() : goldFromGBRatio(activeLevel * (type === 'law' ? 1n : 2n), 3n);
}
export function virtualGuildRevenue15(activeSourceLevel: bigint): GoldUnits {
  if (activeSourceLevel < 0n) throw new Error('Negative Source level');
  return goldFromGBRatio((activeSourceLevel > 4n ? activeSourceLevel - 4n : 0n) * 2n, 3n);
}
export type HoldingGroup15 = {
  key: string;
  realmId: string;
  provinceId: string;
  type: Holding['type'];
  activeLevel: bigint;
  records: { id: string; sourceId: string; level: number; activeLevel: number }[];
};
export function economicHoldingGroups15(holdings: readonly Holding[]): HoldingGroup15[] {
  const groups = new Map<string, HoldingGroup15>(),
    seen = new Set<string>();
  for (const h of holdings) {
    if (seen.has(h.id)) throw new Error(`Duplicate holding identity ${h.id}`);
    seen.add(h.id);
    level(h.level);
    const key = JSON.stringify([h.realmId, h.provinceId, h.type]);
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        realmId: h.realmId,
        provinceId: h.provinceId,
        type: h.type,
        activeLevel: 0n,
        records: [],
      };
      groups.set(key, g);
    }
    const active = h.destroyed || h.contested ? 0 : h.level;
    g.activeLevel += BigInt(active);
    g.records.push({ id: h.id, sourceId: h.sourceId ?? h.id, level: h.level, activeLevel: active });
  }
  return [...groups.values()]
    .sort((a, b) => cmp(a.key, b.key))
    .map((g) => ({ ...g, records: g.records.sort((a, b) => cmp(a.id, b.id)) }));
}
/** Future bilateral-contract amount interface. This quote grants no route/capacity or revenue. */
export type TradeEndpointQuote15 = {
  groupKey: string;
  realmId: string;
  sourceIds: string[];
  seasonalShare: GoldUnits;
  status: 'quote-only';
};
export function tradeEndpointQuote15(group: HoldingGroup15): TradeEndpointQuote15 {
  if (group.type !== 'guild' || group.activeLevel <= 0n)
    throw new Error('Requires a positive real Guild group');
  return {
    groupKey: group.key,
    realmId: group.realmId,
    sourceIds: group.records.map((r) => r.sourceId),
    seasonalShare: goldFromGBRatio(group.activeLevel, 2n),
    status: 'quote-only',
  };
}
export type InfrastructurePrice15 = {
  id: string;
  realmId: string;
  kind: 'road' | 'bridge' | 'palace' | 'other';
  sourceIds: string[];
  reference: string;
  seasonalUpkeep: GoldUnits | null;
  /** Optional actual funded portion; does not hide the full infrastructure obligation. */
  administrateBase?: GoldUnits;
  evidence: 'verified-existing' | 'recorded-contract' | 'unclassified' | 'hypothetical';
  paid: boolean;
  supported: boolean;
};
export type Commitment15 = {
  id: string;
  realmId: string;
  sourceIds: string[];
  reference: string;
  amount: GoldUnits;
  status: 'outstanding' | 'reserved' | 'already-paid';
};
export type EconomicOptions15 = {
  regencyPayroll?: readonly { realmId: string; allocations: PayrollSelection15[] }[];
  overlays?: CharacterOverlays35;
  taxModifiers?: readonly { provinceId: string; amount: GoldUnits; authorizationId: string }[];
  /** Explicit derived cost projection; does not change the legacy court-tier save schema. */
  courtLevels?: readonly { realmId: string; level: number; sourceId: string }[];
  infrastructure?: readonly InfrastructurePrice15[];
  commitments?: readonly Commitment15[];
  administrate?: readonly {
    realmId: string;
    characterId: string;
    die?: number;
    alreadyApplied?: boolean;
  }[];
};
export type EconomicDiagnostic15 = {
  code: string;
  realmId: string;
  sourceIds: string[];
  detail: string;
};
export type EconomicLine15 = {
  key: string;
  realmId: string;
  stream: string;
  direction: 'income' | 'expense';
  sourceIds: string[];
  assetIds: string[];
  amount: GoldUnits | null;
  waiver: GoldUnits;
  reduction: GoldUnits;
  quotedPayment: GoldUnits | null;
  unfundedQuote: GoldUnits | null;
  counterparty: string | null;
  status: 'priced' | 'conditional' | 'unclassified' | 'hypothetical' | 'already-paid';
  note: string;
};
export type AdministrateQuote15 = {
  realmId: string;
  characterId: string | null;
  eligibleBase: GoldUnits;
  dcUnits: GoldUnits;
  modifier: number | null;
  die: number | null;
  potentialSaving: GoldUnits;
  discount: GoldUnits;
  eligible: boolean;
  success: boolean | null;
  reason: string;
  allocations: { key: string; reduction: GoldUnits }[];
};
export type EligibleInfrastructureCost15 = {
  key: string;
  amount: GoldUnits;
  kind: 'fort' | 'road' | 'bridge' | 'palace';
};
export type EconomicForecast15 = {
  /** RP projection is separate from the preserved all-GB cash comparison. */
  regency:
    | null
    | (ReturnType<typeof regencyForecast15> & {
        payroll: ReturnType<typeof regencyPayrollQuote15>;
        projectedRPAfterSelectedOperations: ReturnType<typeof regencyPoints> | null;
        projectedClosingAfterRecordedPayroll: GoldUnits | null;
      });
  kind: 'birthright-1.5-forecast';
  realmId: string;
  turn: number;
  accounting: 'ordinary' | 'inactive' | 'event-controller' | 'eliminated' | 'assimilated';
  openingTreasury: GoldUnits;
  lines: EconomicLine15[];
  diagnostics: EconomicDiagnostic15[];
  income: {
    province: GoldUnits;
    law: GoldUnits;
    guild: GoldUnits;
    temple: GoldUnits;
    virtualGuild: GoldUnits;
    ports: GoldUnits;
    contracted: GoldUnits;
    ordinary: GoldUnits;
  };
  conditional: {
    virtualGuild: GoldUnits;
    virtualMaximum: GoldUnits;
    handlerIds: string[];
    unpaidIncomingContracts: GoldUnits;
    unpricedSourceIds: string[];
  };
  expenses: {
    militaryGross: GoldUnits;
    npcPayrollWaiver: GoldUnits;
    militaryPayable: GoldUnits;
    forts: GoldUnits;
    court: GoldUnits;
    infrastructure: GoldUnits;
    occupation: GoldUnits;
    commitments: GoldUnits;
    transfers: GoldUnits;
    gross: GoldUnits;
    reductions: GoldUnits;
    payable: GoldUnits;
  };
  administrate: AdministrateQuote15;
  result: null | {
    income: GoldUnits;
    netOperating: GoldUnits;
    projectedClosing: GoldUnits;
    cashAfterQuotedTransfersAndOtherBills: GoldUnits;
    unfundedObligations: GoldUnits;
    unfundedTransfers: GoldUnits;
    otherCashShortfall: GoldUnits;
  };
};

/** Largest-remainder apportionment, exact ticks and stable ties; never per-record money rounding. */
function apportion(
  total: GoldUnits,
  weights: readonly { key: string; amount: GoldUnits }[],
): Map<string, GoldUnits> {
  const denominator = sum(weights.map((w) => nonnegative(w.amount)));
  if (total < 0n || total > denominator) throw new Error('Invalid allocation total');
  const rows = weights.map((w) => ({
    key: w.key,
    amount: denominator ? (total * w.amount) / denominator : 0n,
    remainder: denominator ? (total * w.amount) % denominator : 0n,
  }));
  let rest = total - rows.reduce((n, r) => n + r.amount, 0n);
  rows.sort((a, b) =>
    a.remainder === b.remainder ? cmp(a.key, b.key) : a.remainder > b.remainder ? -1 : 1,
  );
  for (const row of rows)
    if (rest > 0n) {
      row.amount++;
      rest--;
    }
  return new Map(rows.map((r) => [r.key, goldUnits(r.amount)]));
}
function quoteAdministrate(
  state: Birthright15Campaign,
  scenario: Scenario,
  bundle: CharacterOverlays35 | null,
  realmId: string,
  costs: readonly EligibleInfrastructureCost15[],
  nomination?: { characterId: string; die?: number; alreadyApplied?: boolean },
): AdministrateQuote15 {
  if (costs.some((c) => !['fort', 'road', 'bridge', 'palace'].includes(c.kind)))
    throw new Error('Administrate excludes this expense category');
  const base = sum(costs.map((c) => nonnegative(c.amount))),
    potential = goldFromGB(base / (4n * GOLD_UNITS_PER_GB));
  const result: AdministrateQuote15 = {
    realmId,
    characterId: nomination?.characterId ?? null,
    eligibleBase: base,
    dcUnits: goldUnits(10n * GOLD_UNITS_PER_GB + base),
    modifier: null,
    die: nomination?.die ?? null,
    potentialSaving: potential,
    discount: zero(),
    eligible: false,
    success: null,
    reason: 'no-nominated-reviewed-actor',
    allocations: [],
  };
  if (
    nomination?.die !== undefined &&
    (!Number.isInteger(nomination.die) || nomination.die < 1 || nomination.die > 20)
  )
    throw new Error('Administrate requires a d20 result');
  if (!nomination || !bundle?.characters) return result;
  const actor = characterActor35(bundle, scenario, state, realmId, nomination.characterId);
  if (!actor.eligible) return { ...result, reason: actor.reason };
  const modifier = skillCheck35(
    character35(bundle.characters, nomination.characterId),
    'administrate',
  )?.total;
  if (modifier === undefined || !Number.isSafeInteger(modifier * 2))
    return { ...result, reason: 'missing-reviewed-modifier' };
  result.modifier = modifier;
  result.eligible = true;
  if (nomination.alreadyApplied) return { ...result, reason: 'already-applied-this-season' };
  if (nomination.die === undefined) return { ...result, reason: 'check-not-rolled' };
  result.success =
    BigInt(nomination.die) * GOLD_UNITS_PER_GB + BigInt(modifier * 2) * (GOLD_UNITS_PER_GB / 2n) >=
    result.dcUnits;
  result.reason = result.success ? 'successful-quote' : 'failed-quote';
  if (result.success) {
    result.discount = potential;
    result.allocations = [...apportion(potential, costs)].map(([key, reduction]) => ({
      key,
      reduction,
    }));
  }
  return result;
}
export function administrateQuote15(
  state: Birthright15Campaign,
  scenario: Scenario,
  bundle: CharacterOverlays35 | null,
  realmId: string,
  costs: readonly EligibleInfrastructureCost15[],
  nomination?: { characterId: string; die?: number; alreadyApplied?: boolean },
): AdministrateQuote15 {
  assertContext(state, scenario, { ...(bundle ? { overlays: bundle } : {}) });
  if (new Set(costs.map((c) => c.key)).size !== costs.length)
    throw new Error('Duplicate Administrate cost identity');
  return quoteAdministrate(state, scenario, bundle, realmId, costs, nomination);
}

function assertContext(
  state: Birthright15Campaign,
  scenario: Scenario,
  options: EconomicOptions15,
) {
  const rules = domainRulesOf(state);
  if (rules.id !== 'birthright-1.5')
    throw new Error('Birthright 1.5 forecasting requires its explicit domain-rules identity');
  if (state.scenarioId !== scenario.id || state.scenarioFingerprint !== scenario.fingerprint)
    throw new Error('Forecast scenario identity mismatch');
  if (options.overlays || rules.overlays.characters || rules.overlays.handlers)
    validateCharacterOverlays35(
      options.overlays ?? { characters: null, handlers: null },
      scenario,
      rules.overlays,
    );
  for (const r of state.realms) nonnegative(r.treasury);
  const realms = new Set(state.realms.map((r) => r.id));
  for (const [name, rows, key] of [
    ['tax modifiers', options.taxModifiers ?? [], 'provinceId'],
    ['court levels', options.courtLevels ?? [], 'realmId'],
    ['infrastructure', options.infrastructure ?? [], 'id'],
    ['commitments', options.commitments ?? [], 'id'],
    ['Administrate nominations', options.administrate ?? [], 'realmId'],
    ['RP payroll plans', options.regencyPayroll ?? [], 'realmId'],
  ] as const) {
    const ids = rows.map((r) => (r as unknown as Record<string, string>)[key]);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${name}`);
  }
  for (const c of [...(options.infrastructure ?? []), ...(options.commitments ?? [])]) {
    if (!realms.has(c.realmId) || !c.id || !c.reference || !c.sourceIds.length)
      throw new Error('Priced facts require an owner, identity and source reference');
  }
  for (const c of options.commitments ?? []) nonnegative(c.amount);
  for (const c of options.infrastructure ?? [])
    if (c.seasonalUpkeep !== null) {
      nonnegative(c.seasonalUpkeep);
      if (c.administrateBase !== undefined && nonnegative(c.administrateBase) > c.seasonalUpkeep)
        throw new Error('Administrate base exceeds the real infrastructure obligation');
    }
  const commitmentIds = new Set((options.commitments ?? []).map((c) => c.id));
  if ((options.infrastructure ?? []).some((i) => commitmentIds.has(i.id)))
    throw new Error('Infrastructure duplicates a committed bill');
  for (const c of options.courtLevels ?? [])
    if (!realms.has(c.realmId) || !c.sourceId)
      throw new Error('Derived court requires its domain/source identity');
  for (const t of options.taxModifiers ?? [])
    if (!t.authorizationId || !state.provinces.some((p) => p.id === t.provinceId))
      throw new Error('Tax modifier requires an existing province and authorization');
}

export function economicForecasts15(
  state: Birthright15Campaign,
  scenario: Scenario,
  options: EconomicOptions15 = {},
): EconomicForecast15[] {
  if (state.courtActions15) {
    if (options.courtLevels)
      throw new Error('Actual court state cannot be replaced by hypothetical Court levels');
    const costs = courtCostProjection15(state);
    options = {
      ...options,
      courtLevels: costs.courtLevels,
      infrastructure: [...costs.infrastructure, ...(options.infrastructure ?? [])],
    };
  }
  assertContext(state, scenario, options);
  const seen = new Set<string>(),
    all: EconomicForecast15[] = [];
  const groups = economicHoldingGroups15(state.holdings);
  for (const realm of [...state.realms].sort((a, b) => cmp(a.id, b.id))) {
    const def = scenario.realms.find((r) => r.id === realm.id);
    if (!def) throw new Error(`Unknown forecast realm ${realm.id}`);
    const accounting: EconomicForecast15['accounting'] = realm.eliminated
      ? 'eliminated'
      : realm.lieutenantOf
        ? 'assimilated'
        : def.domainType === 'inactive'
          ? 'inactive'
          : def.domainType === 'special' || realm.behavior === 'monsters'
            ? 'event-controller'
            : 'ordinary';
    const lines: EconomicLine15[] = [],
      diagnostics: EconomicDiagnostic15[] = [],
      adminCosts: EligibleInfrastructureCost15[] = [];
    const diagnostic = (code: string, sourceIds: string[], detail: string) =>
      diagnostics.push({ code, realmId: realm.id, sourceIds, detail });
    function line(
      stream: string,
      direction: 'income' | 'expense',
      assetIds: string[],
      sourceIds: string[],
      amount: GoldUnits | null,
      status: EconomicLine15['status'] = 'priced',
      note = '',
    ): EconomicLine15 {
      const key = JSON.stringify([state.turn, realm.id, direction, stream, assetIds]);
      if (seen.has(key)) throw new Error('Duplicate forecast source/stream identity');
      seen.add(key);
      const row: EconomicLine15 = {
        key,
        realmId: realm.id,
        stream,
        direction,
        sourceIds: [...sourceIds],
        assetIds: [...assetIds],
        amount,
        waiver: zero(),
        reduction: zero(),
        quotedPayment: null,
        unfundedQuote: null,
        counterparty: null,
        status,
        note,
      };
      lines.push(row);
      return row;
    }
    const income = {
      province: zero(),
      law: zero(),
      guild: zero(),
      temple: zero(),
      virtualGuild: zero(),
      ports: zero(),
      contracted: zero(),
      ordinary: zero(),
    };
    let virtualMaximum = zero(),
      conditionalVirtual = zero();
    // Only actual rulers and explicitly appointed live lieutenants are considered.
    // All qualification/authorization decisions remain in the completed character selectors.
    const handlerIds = [
      ...new Set([
        realm.regentId ?? def.regent.id,
        ...(state.characters ?? [])
          .filter((c) => c.realmId === realm.id && c.role === 'lieutenant' && c.regentId)
          .map((c) => c.regentId!),
      ]),
    ]
      .filter(
        (id) =>
          options.overlays &&
          sourceHandler35(options.overlays, scenario, state, realm.id, id).eligible,
      )
      .sort(cmp);
    for (const p of state.provinces)
      if (provinceController(p) === realm.id) {
        const modifier = options.taxModifiers?.find((t) => t.provinceId === p.id),
          amount = taxableBy(p, realm.id) ? provinceRevenue15(p.level, modifier?.amount) : zero();
        income.province = goldUnits(income.province + amount);
        line(
          'province',
          'income',
          [p.id],
          [p.sourceId ?? p.id, ...(modifier ? [modifier.authorizationId] : [])],
          amount,
          'priced',
          taxableBy(p, realm.id)
            ? 'P plus explicitly authorized modifier'
            : 'No current taxable entitlement',
        );
      }
    for (const g of groups.filter((g) => g.realmId === realm.id)) {
      if (!state.provinces.some((p) => p.id === g.provinceId))
        throw new Error('Holding group requires an existing province');
      const assets = g.records.map((r) => r.id),
        sources = g.records.map((r) => r.sourceId);
      const amount = holdingRevenue15(g.type, g.activeLevel);
      line(
        g.type,
        'income',
        assets,
        sources,
        amount,
        'priced',
        `Aggregated active level ${g.activeLevel}; inactive records retained`,
      );
      if (g.type !== 'source') income[g.type] = goldUnits(income[g.type] + amount);
      else {
        const possible = virtualGuildRevenue15(g.activeLevel);
        virtualMaximum = goldUnits(virtualMaximum + possible);
        const qualified = handlerIds.length > 0;
        line(
          'virtual-guild',
          'income',
          assets,
          sources,
          possible,
          qualified ? 'priced' : 'conditional',
          qualified
            ? `Qualified named actor ${handlerIds[0]}`
            : 'No currently approved same-domain handler; not credited',
        );
        if (qualified) income.virtualGuild = goldUnits(income.virtualGuild + possible);
        else conditionalVirtual = goldUnits(conditionalVirtual + possible);
      }
    }
    for (const port of state.ports ?? [])
      if (port.realmId === realm.id) {
        const p = state.provinces.find((p) => p.id === port.provinceId);
        if (!p) throw new Error('Port requires its existing province');
        const amount =
          p.occupiedBy || p.contested
            ? zero()
            : goldFromGBRatio(level(p.level), port.kind === 'river-port' ? 2n : 1n);
        income.ports = goldUnits(income.ports + amount);
        line('port', 'income', [port.id], [port.sourceId], amount);
      }
    for (const route of state.tradeRoutes.filter((r) => r.realmId === realm.id)) {
      line(
        'trade-contract',
        'income',
        [route.id],
        [route.id],
        null,
        'unclassified',
        'Legacy route lacks the approved bilateral contract/transport/reservation evidence',
      );
      diagnostic(
        'trade-contract-unresolved',
        [route.id],
        'No speculative route income or trade RP is credited.',
      );
    }
    const expenses = {
      militaryGross: zero(),
      npcPayrollWaiver: zero(),
      militaryPayable: zero(),
      forts: zero(),
      court: zero(),
      infrastructure: zero(),
      occupation: zero(),
      commitments: zero(),
      transfers: zero(),
      gross: zero(),
      reductions: zero(),
      payable: zero(),
    };
    const waived = npcPayrollExempt(state, scenario, realm.id);
    for (const army of state.armies.filter((a) => a.realmId === realm.id))
      for (const unit of army.units) {
        const profile = scenario.units.find((p) => p.id === unit.type),
          sourceIds = [unit.sourceId ?? unit.id, unit.type];
        if (!profile) {
          line(
            'military',
            'expense',
            [unit.id],
            sourceIds,
            null,
            'unclassified',
            'Unit profile missing',
          );
          diagnostic(
            'unit-upkeep-missing',
            sourceIds,
            'No muster-based replacement or invented zero price.',
          );
          continue;
        }
        const amount = nonnegative(goldFromLegacyGB(profile.upkeep)),
          row = line(
            'military',
            'expense',
            [unit.id],
            sourceIds,
            amount,
            'priced',
            `Native profile ${profile.id}; payable owner ${army.realmId}`,
          );
        expenses.militaryGross = goldUnits(expenses.militaryGross + amount);
        if (waived) {
          row.waiver = amount;
          expenses.npcPayrollWaiver = goldUnits(expenses.npcPayrollWaiver + amount);
        }
        if (profile.pc && amount === 0n && (profile.pc.race === 'monster' || profile.pc.icon > 24))
          diagnostic(
            'costless-monster-profile',
            sourceIds,
            'Recorded zero native upkeep; uncertain profile, not an inferred general monster exemption.',
          );
        if (!profile.pc)
          diagnostic(
            'non-native-unit-profile',
            sourceIds,
            'Using the represented static profile, not claiming a recovered Sierra price.',
          );
        if (unit.payroll === 'regency' || unit.payroll === 'unpaid')
          diagnostic(
            'payroll-allocation-not-executed',
            sourceIds,
            'Gross obligation retained; RP funding/default execution belongs to later increments.',
          );
      }
    expenses.militaryPayable = goldUnits(expenses.militaryGross - expenses.npcPayrollWaiver);
    for (const fort of state.fortifications ?? [])
      if (fort.realmId === realm.id) {
        const supported = fort.level > 0 && fort.supported !== false,
          amount = supported ? goldFromGB(1n) : zero();
        const row = line(
          'fort',
          'expense',
          [fort.id],
          [fort.sourceId ?? fort.id],
          amount,
          'priced',
          supported
            ? 'One supported asset, independent of level'
            : 'No supported active asset obligation',
        );
        expenses.forts = goldUnits(expenses.forts + amount);
        if (supported) adminCosts.push({ key: row.key, amount, kind: 'fort' });
      }
    if (state.fortifications === undefined)
      for (const p of state.provinces.filter(
        (p) => (p.fortOwner ?? p.owner) === realm.id && p.fort > 0,
      ))
        diagnostic(
          'fort-identity-missing',
          [p.id],
          'Province fort summary is not an independently identified supported asset; no duplicate fort bill invented.',
        );
    const court = options.courtLevels?.find((c) => c.realmId === realm.id);
    expenses.court = courtUpkeep15(court?.level ?? realm.court ?? 1);
    line(
      'court',
      'expense',
      [realm.id],
      [court?.sourceId ?? realm.id],
      expenses.court,
      'priced',
      court
        ? 'Explicit derived court-cost projection; no progression/extra actions granted'
        : 'Current derived court, opening tier 1 maps to 1',
    );
    for (const p of state.provinces.filter(
      (p) => p.occupiedBy === realm.id && p.owner !== realm.id,
    )) {
      const amount = goldFromGB(1n);
      expenses.occupation = goldUnits(expenses.occupation + amount);
      line(
        'occupation',
        'expense',
        [p.id],
        [p.sourceId ?? p.id],
        amount,
        'priced',
        'Existing foreign occupation obligation; no new suppression order',
      );
    }
    for (const c of state.characters ?? [])
      if (c.realmId === realm.id && c.role === 'lieutenant') {
        if (c.salary === undefined) {
          diagnostic(
            'lieutenant-salary-unknown',
            [c.sourceId],
            'No recorded salary amount; no invented obligation.',
          );
          continue;
        }
        const amount = nonnegative(c.salary);
        expenses.commitments = goldUnits(expenses.commitments + amount);
        line('lieutenant-salary', 'expense', [c.id], [c.sourceId], amount);
      }
    for (const c of options.commitments ?? [])
      if (c.realmId === realm.id) {
        if (
          (state.tributes ?? []).some((t) => t.id === c.id) ||
          (state.characters ?? []).some((ch) => ch.id === c.id) ||
          (state.fortifications ?? []).some((f) => f.id === c.id)
        )
          throw new Error('Commitment duplicates an existing obligation');
        line(
          'commitment',
          'expense',
          [c.id],
          c.sourceIds,
          c.amount,
          c.status === 'already-paid' ? 'already-paid' : 'priced',
          c.reference,
        );
        if (c.status !== 'already-paid')
          expenses.commitments = goldUnits(expenses.commitments + c.amount);
      }
    for (const i of options.infrastructure ?? [])
      if (i.realmId === realm.id) {
        if ((state.fortifications ?? []).some((f) => f.id === i.id))
          throw new Error('Infrastructure duplicates a fort asset');
        if ((state.ports ?? []).some((p) => p.id === i.id || i.sourceIds.includes(p.sourceId)))
          throw new Error('Ordinary ports have no separate maintenance fee');
        const represented = ['verified-existing', 'recorded-contract'].includes(i.evidence),
          priced = represented && i.paid && i.supported && i.seasonalUpkeep !== null;
        const status =
          i.evidence === 'hypothetical' ? 'hypothetical' : priced ? 'priced' : 'unclassified';
        const row = line(
          'infrastructure',
          'expense',
          [i.id],
          i.sourceIds,
          i.seasonalUpkeep,
          status,
          i.reference,
        );
        if (priced) {
          const amount = i.seasonalUpkeep!;
          expenses.infrastructure = goldUnits(expenses.infrastructure + amount);
          if (i.kind !== 'other')
            adminCosts.push({ key: row.key, amount: i.administrateBase ?? amount, kind: i.kind });
        } else
          diagnostic(
            `infrastructure-${status}`,
            i.sourceIds,
            'Only separately priced, paid, supported and represented infrastructure enters ordinary expenses.',
          );
      }
    for (const road of state.roads ?? [])
      if (
        state.provinces.some((p) => p.id === road.from && p.owner === realm.id) &&
        !(options.infrastructure ?? []).some(
          (i) =>
            i.realmId === realm.id &&
            i.sourceIds.includes(road.from) &&
            i.sourceIds.includes(road.to),
        )
      )
        diagnostic(
          'road-upkeep-unpriced',
          [road.from, road.to],
          'An edge has no recorded maintenance price/payer proof; no bill inferred.',
        );
    const admin = quoteAdministrate(
      state,
      scenario,
      options.overlays ?? null,
      realm.id,
      adminCosts,
      options.administrate?.find((a) => a.realmId === realm.id),
    );
    for (const allocation of admin.allocations)
      lines.find((l) => l.key === allocation.key)!.reduction = allocation.reduction;
    expenses.reductions = admin.discount;
    expenses.gross = sum([
      expenses.militaryGross,
      expenses.forts,
      expenses.court,
      expenses.infrastructure,
      expenses.occupation,
      expenses.commitments,
    ]);
    expenses.payable = goldUnits(expenses.gross - expenses.npcPayrollWaiver - expenses.reductions);
    income.ordinary = sum([
      income.province,
      income.law,
      income.guild,
      income.temple,
      income.virtualGuild,
      income.ports,
    ]);
    all.push({
      regency: null,
      kind: 'birthright-1.5-forecast',
      realmId: realm.id,
      turn: state.turn,
      accounting,
      openingTreasury: realm.treasury,
      lines,
      diagnostics,
      income,
      conditional: {
        virtualGuild: conditionalVirtual,
        virtualMaximum,
        handlerIds,
        unpaidIncomingContracts: zero(),
        unpricedSourceIds: [
          ...new Set([
            ...lines.filter((l) => l.status === 'unclassified').flatMap((l) => l.sourceIds),
            ...diagnostics
              .filter((d) => /unknown|missing|unpriced/.test(d.code))
              .flatMap((d) => d.sourceIds),
          ]),
        ].sort(cmp),
      },
      expenses,
      administrate: admin,
      result: null,
    });
  }
  // Recorded transfers: forecast available funding once, before incoming transfers.
  // No empty reciprocal promises, same-boundary relay or duplicated credits.
  const byRealm = new Map(all.map((r) => [r.realmId, r])),
    transferIds = new Set<string>();
  for (const t of state.tributes ?? []) {
    if (
      transferIds.has(t.id) ||
      t.payer === t.recipient ||
      !byRealm.has(t.payer) ||
      !byRealm.has(t.recipient)
    )
      throw new Error('Invalid recorded transfer identity');
    transferIds.add(t.id);
    nonnegative(t.amount);
  }
  for (const payer of all) {
    const transfers = (state.tributes ?? [])
      .filter((t) => t.payer === payer.realmId)
      .sort((a, b) => cmp(a.id, b.id));
    const active = transfers.filter(
      (t) => payer.accounting === 'ordinary' && byRealm.get(t.recipient)!.accounting === 'ordinary',
    );
    const reserved = sum(
      (options.commitments ?? [])
        .filter((c) => c.realmId === payer.realmId && c.status === 'reserved')
        .map((c) => c.amount),
    );
    const due = sum(active.map((t) => t.amount)),
      available = positive(payer.openingTreasury + payer.income.ordinary - reserved),
      funding = apportion(
        goldUnits(available < due ? available : due),
        active.map((t) => ({ key: t.id, amount: t.amount })),
      );
    for (const t of transfers) {
      const recipient = byRealm.get(t.recipient)!,
        paid = funding.get(t.id) ?? zero(),
        valid = active.includes(t);
      const key = JSON.stringify([state.turn, t.payer, 'transfer', t.id]);
      const base = {
        sourceIds: [t.id],
        assetIds: [t.id],
        waiver: zero(),
        reduction: zero(),
        quotedPayment: paid,
        unfundedQuote: goldUnits(t.amount - paid),
        status: valid ? ('priced' as const) : ('unclassified' as const),
        note: 'Read-only funding quote; incoming same-boundary transfers cannot relay. No payment recorded.',
      };
      payer.lines.push({
        ...base,
        key,
        realmId: t.payer,
        direction: 'expense',
        stream: 'contract-transfer',
        amount: t.amount,
        counterparty: t.recipient,
      });
      recipient.lines.push({
        ...base,
        key: JSON.stringify([state.turn, t.recipient, 'transfer-in', t.id]),
        realmId: t.recipient,
        direction: 'income',
        stream: 'contract-transfer',
        amount: paid,
        counterparty: t.payer,
      });
      if (valid) {
        payer.expenses.transfers = goldUnits(payer.expenses.transfers + t.amount);
        recipient.income.contracted = goldUnits(recipient.income.contracted + paid);
        recipient.conditional.unpaidIncomingContracts = goldUnits(
          recipient.conditional.unpaidIncomingContracts + t.amount - paid,
        );
      } else
        payer.diagnostics.push({
          code: 'transfer-outside-ordinary-accounting',
          realmId: payer.realmId,
          sourceIds: [t.id],
          detail: 'Inactive/special controller transfer is not an ordinary entitlement.',
        });
    }
  }
  for (const row of all) {
    row.conditional.unpricedSourceIds = [
      ...new Set([
        ...row.conditional.unpricedSourceIds,
        ...row.lines.filter((l) => l.status === 'unclassified').flatMap((l) => l.sourceIds),
      ]),
    ].sort(cmp);
    const ownBills = row.expenses.payable;
    row.expenses.gross = goldUnits(row.expenses.gross + row.expenses.transfers);
    row.expenses.payable = goldUnits(row.expenses.payable + row.expenses.transfers);
    if (row.accounting !== 'ordinary') continue;
    const paidOut = sum(
      row.lines
        .filter(
          (l) =>
            l.direction === 'expense' && l.stream === 'contract-transfer' && l.status === 'priced',
        )
        .map((l) => l.quotedPayment!),
    );
    const unpaidTransfers = goldUnits(row.expenses.transfers - paidOut),
      income = goldUnits(row.income.ordinary + row.income.contracted),
      net = goldUnits(income - row.expenses.payable);
    const cash = goldUnits(row.openingTreasury + income - paidOut - ownBills),
      shortfall = positive(-cash);
    row.result = {
      income,
      netOperating: net,
      projectedClosing: goldUnits(row.openingTreasury + net),
      cashAfterQuotedTransfersAndOtherBills: cash,
      unfundedObligations: goldUnits(shortfall + unpaidTransfers),
      unfundedTransfers: unpaidTransfers,
      otherCashShortfall: shortfall,
    };
  }
  // Old accepted payloads still support their original cash forecasts. RP never silently
  // uses the superseded character release or substitutes a new overlay for a saved one.
  const accepted =
    !options.overlays || isRegencyOverlayVersion35(options.overlays.characters?.version);
  if (accepted) {
    const quotes = regencyCollectionQuotes15(state, scenario, options.overlays);
    for (const row of all) {
      const quote = quotes.find((q) => q.realmId === row.realmId)!;
      const rp = regencyForecast15(state, scenario, quote);
      const payroll = regencyPayrollQuote15(
        state,
        scenario,
        row,
        options.regencyPayroll?.find((p) => p.realmId === row.realmId)?.allocations,
      );
      row.regency = {
        ...rp,
        payroll,
        projectedRPAfterSelectedOperations:
          rp.projectedAvailableAfterKnownObligations !== null &&
          rp.projectedAvailableAfterKnownObligations >= payroll.selected.rpCost
            ? regencyPoints(rp.projectedAvailableAfterKnownObligations - payroll.selected.rpCost)
            : null,
        projectedClosingAfterRecordedPayroll: row.result
          ? goldUnits(row.result.projectedClosing + payroll.paidByRP + payroll.paidByGold)
          : null,
      };
    }
  } else
    for (const row of all)
      row.diagnostics.push({
        code: 'regency-overlay-release-not-accepted',
        realmId: row.realmId,
        sourceIds: [],
        detail:
          'RP remains unknown until explicitly using the accepted character release; original cash forecast preserved.',
      });
  return all;
}
export function economicForecast15(
  state: Birthright15Campaign,
  scenario: Scenario,
  realmId: string,
  options: EconomicOptions15 = {},
): EconomicForecast15 {
  const row = economicForecasts15(state, scenario, options).find((r) => r.realmId === realmId);
  if (!row) throw new Error(`Unknown economic domain ${realmId}`);
  return row;
}
