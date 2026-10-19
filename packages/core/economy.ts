import type { Campaign, Scenario, Report } from './schema';
import { randomInt } from './random';
import { taxableBy, provinceController, fortLevel } from './domains';
import { domainPower } from './selectors';
import { inspectTradeRoute, refreshTradeRoutes } from './trade';
import { portIncome } from './ports';
import { bloodlineStrength, characterClasses } from './bloodlines';
import { hasMagicEffect } from './realm-magic';
import { goldBars } from './military';
import { settleFealtyRegency, playerControls } from './fealty';

function nativeNPC(state: Campaign, scenario: Scenario, realmId: string) {
  const index = Number(scenario.realms.find((r) => r.id === realmId)?.original?.index);
  return (
    state.realms.some((r) => r.id === realmId && r.controller === 'ai') &&
    !playerControls(state, scenario, realmId) &&
    Number.isInteger(index) &&
    index >= 1 &&
    index < 35
  );
}
function npcPayrollExempt(state: Campaign, scenario: Scenario, realmId: string) {
  return (
    nativeNPC(state, scenario, realmId) &&
    [17, 19, 23, 24, 26, 29].includes(
      Number(scenario.realms.find((r) => r.id === realmId)?.original?.index),
    )
  );
}
/** DoNPCAdmin reserve conversions and tiny cash floor; never controlled by random-event switches. */
export function npcTreasuryFallback(state: Campaign, scenario: Scenario, realmId: string) {
  if (!nativeNPC(state, scenario, realmId)) return;
  const r = state.realms.find((r) => r.id === realmId)!;
  const convert = (reserve: number) => {
    const nativeGold = Math.max(0, Math.trunc((r.regency - reserve) / 5));
    r.treasury = goldBars(r.treasury + nativeGold / 10);
    r.regency -= nativeGold * 5;
  };
  if (r.treasury < 1.5) {
    if (r.regency > 25) convert(25);
    if (r.treasury < 0.5) r.treasury = randomInt(state, 5, 9) / 10;
  }
  if (r.regency > 50 && r.treasury < 5) convert(50);
  if (Number(scenario.realms.find((d) => d.id === realmId)?.original?.index) === 15) r.regency = 0;
  delete r.bankrupt;
}

type Dice = readonly [number, number, number];
// PROVTAX.C distributions, checked against CD RULES.TXT §§126/168 ranges.
const TAX: readonly (readonly Dice[])[] = [
  [
    [0, 0, 0],
    [0, 0, 0],
    [1, 3, -2],
  ],
  [
    [1, 3, -2],
    [1, 3, -1],
    [1, 3, 0],
  ],
  [
    [1, 3, -1],
    [1, 3, 0],
    [1, 4, 0],
  ],
  [
    [1, 3, 0],
    [1, 4, 0],
    [1, 4, 1],
  ],
  [
    [1, 4, 0],
    [1, 4, 1],
    [1, 6, 1],
  ],
  [
    [1, 4, 1],
    [1, 6, 1],
    [1, 8, 1],
  ],
  [
    [1, 6, 1],
    [1, 8, 1],
    [1, 10, 1],
  ],
  [
    [1, 8, 1],
    [1, 10, 1],
    [1, 12, 1],
  ],
  [
    [1, 10, 1],
    [1, 12, 1],
    [2, 8, 0],
  ],
  [
    [1, 12, 1],
    [2, 8, 0],
    [2, 8, 2],
  ],
  [
    [2, 8, 0],
    [2, 8, 2],
    [2, 10, 2],
  ],
];
const ZERO: Dice = [0, 0, 0];
const HOLD: readonly (readonly Dice[])[] = [
  [],
  [[1, 3, -2]],
  [
    [1, 2, -1],
    [1, 2, 0],
  ],
  [
    [1, 2, -1],
    [1, 3, 0],
    [1, 4, 0],
  ],
  [
    [1, 2, 0],
    [1, 3, 0],
    [1, 4, 0],
    [1, 6, 0],
  ],
  [
    [1, 2, 0],
    [1, 3, 0],
    [1, 4, 0],
    [1, 6, 0],
  ],
  [
    [1, 2, 0],
    [1, 3, 0],
    [2, 2, 0],
    [2, 3, 0],
    [2, 4, 1],
  ],
  [
    [1, 3, 0],
    [1, 2, 1],
    [1, 4, 1],
    [1, 6, 1],
    [2, 4, 2],
  ],
];
export const COURTS = [
  { name: 'None', gold: 0, diplomacy: -100 },
  { name: 'Minimal', gold: 1, diplomacy: -20 },
  { name: 'Acceptable', gold: 3, diplomacy: -10 },
  { name: 'Average', gold: 6, diplomacy: 0 },
  { name: 'Opulent', gold: 9, diplomacy: 15 },
] as const;
/** Enumerate the small dice distribution exactly, including clamping negative rolls to zero. */
const expectations = new WeakMap<Dice, number>();
export function expectedDice(dice: Dice): number {
  const cached = expectations.get(dice);
  if (cached !== undefined) return cached;
  const [count, sides, modifier] = dice;
  if (!count) return Math.max(0, modifier);
  let sum = 0;
  const visit = (left: number, value: number) => {
    if (!left) {
      sum += Math.max(0, value + modifier);
      return;
    }
    for (let i = 1; i <= sides; i++) visit(left - 1, value + i);
  };
  visit(count, 0);
  const expected = sum / sides ** count;
  expectations.set(dice, expected);
  return expected;
}
function diceValue(dice: Dice, state?: Campaign) {
  if (!state) return expectedDice(dice);
  let value = dice[2];
  for (let i = 0; i < dice[0]; i++) value += randomInt(state, 1, dice[1]);
  return Math.max(0, value);
}
function incomeDice(
  state: Campaign,
  provinceId: string,
  dice: Dice,
  actual: boolean,
  guild = false,
) {
  if (guild && hasMagicEffect(state, provinceId, 'honest-dealing'))
    return Math.max(0, dice[0] + dice[2]);
  if (hasMagicEffect(state, provinceId, 'bless-land'))
    return Math.max(0, dice[0] * dice[1] + dice[2]);
  if (
    hasMagicEffect(state, provinceId, 'blight') ||
    (guild && hasMagicEffect(state, provinceId, 'honest-dealing'))
  )
    return Math.max(0, dice[0] + dice[2]);
  return diceValue(dice, actual ? state : undefined);
}
export function taxDice(level: number, tax: 'light' | 'moderate' | 'severe'): Dice {
  return TAX[Math.min(10, level)]?.[['light', 'moderate', 'severe'].indexOf(tax)] ?? ZERO;
}
export function holdingDice(provinceLevel: number, holdingLevel: number): Dice {
  if (!holdingLevel) return ZERO;
  const column = holdingLevel >= 6 ? 4 : holdingLevel >= 4 ? 3 : holdingLevel - 1;
  return HOLD[Math.min(7, provinceLevel)]?.[column] ?? ZERO;
}
export function domainMaintenance(count: number) {
  for (const [limit, cost] of [
    [2, 0],
    [6, 1],
    [12, 2],
    [18, 3],
    [24, 4],
    [30, 5],
    [40, 7],
    [50, 10],
    [75, 20],
    [100, 30],
  ])
    if (count <= limit!) return cost!;
  return Math.floor(count / 3);
}
export function militaryUpkeep(state: Campaign, scenario: Scenario, realmId: string) {
  return state.armies
    .filter((a) => a.realmId === realmId)
    .reduce(
      (n, a) =>
        n +
        a.units.reduce((k, u) => k + (scenario.units.find((d) => d.id === u.type)?.upkeep ?? 0), 0),
      0,
    );
}
/** A single shared calculation for forecasts and actual rolls. Claims redistribute existing GB. */
function income(state: Campaign, scenario: Scenario, actual: boolean) {
  const result = new Map(
    state.realms.map((r) => [r.id, { taxes: 0, holdings: 0, trade: 0, lawClaims: 0 }]),
  );
  const provincesById = new Map(state.provinces.map((p) => [p.id, p]));
  const claiming = new Set(
    state.realms
      .filter((r) => r.lawClaims && !r.eliminated && r.controller !== 'passive')
      .map((r) => r.id),
  );
  const laws = new Map<string, Campaign['holdings']>();
  for (const h of state.holdings)
    if (
      claiming.has(h.realmId) &&
      h.type === 'law' &&
      h.level > 0 &&
      !h.contested &&
      !h.destroyed
    ) {
      const list = laws.get(h.provinceId) ?? [];
      list.push(h);
      laws.set(h.provinceId, list);
    }
  const records: { realmId: string; provinceId: string; level: number; gross: number }[] = [];
  for (const p of actual
    ? [...state.provinces].sort((a, b) => a.id.localeCompare(b.id))
    : state.provinces) {
    const owner = provinceController(p),
      row = result.get(owner);
    if (!row || !taxableBy(p, owner)) continue;
    const gross = incomeDice(state, p.id, taxDice(p.level, p.tax), actual);
    row.taxes += gross;
    if (laws.has(p.id)) records.push({ realmId: owner, provinceId: p.id, level: p.level, gross });
  }
  for (const h of actual
    ? [...state.holdings].sort((a, b) => a.id.localeCompare(b.id))
    : state.holdings) {
    const row = result.get(h.realmId),
      p = provincesById.get(h.provinceId);
    if (!row || !p || h.destroyed || h.contested || !['guild', 'temple'].includes(h.type)) continue;
    const gross = incomeDice(
      state,
      p.id,
      holdingDice(p.level, h.level),
      actual,
      h.type === 'guild',
    );
    row.holdings += gross;
    if (laws.has(p.id))
      records.push({ realmId: h.realmId, provinceId: p.id, level: h.level, gross });
  }
  for (const record of records) {
    let remaining = record.gross;
    for (const law of [...(laws.get(record.provinceId) ?? [])]
      .filter((h) => h.realmId !== record.realmId)
      .sort((a, b) => a.id.localeCompare(b.id))) {
      if (
        !state.realms.some(
          (r) => r.id === record.realmId && !r.eliminated && r.controller !== 'passive',
        ) ||
        !state.realms.some(
          (r) => r.id === law.realmId && !r.eliminated && r.controller !== 'passive',
        )
      )
        continue;
      // Compatibility allocation: historical source ratios, corrected for its dangling-else bug,
      // bounded by the CD's 0–3 GB and by revenue actually available. Exact stock claims are unresolved.
      const claim = Math.min(
        remaining,
        3,
        Math.floor(
          record.level * (law.level < record.level ? 0.5 : law.level === record.level ? 0.75 : 1),
        ),
      );
      result.get(law.realmId)!.lawClaims += claim;
      result.get(record.realmId)!.lawClaims -= claim;
      remaining -= claim;
    }
  }
  for (const route of state.tradeRoutes) {
    const info = inspectTradeRoute(state, scenario, route);
    const row = result.get(info.realmId);
    if (row) row.trade += info.income;
  }
  for (const port of state.ports ?? []) {
    const row = result.get(port.realmId);
    if (row) row.trade += portIncome(state, port);
  }
  return result;
}
function expenseReport(state: Campaign, scenario: Scenario, realmId: string): Report {
  const realm = state.realms.find((r) => r.id === realmId)!;
  if (realm.behavior === 'monsters')
    return {
      realmId,
      turn: state.turn,
      taxes: 0,
      holdings: 0,
      trade: 0,
      maintenance: 0,
      military: 0,
      regency: 0,
      net: 0,
      administration: 0,
      forts: 0,
      occupation: 0,
      court: 0,
    };
  const count =
    state.provinces.filter((p) => p.owner === realmId).length +
    state.holdings.filter(
      (h) => h.realmId === realmId && !h.destroyed && h.level > 0 && h.type !== 'source',
    ).length;
  const administration = domainMaintenance(count);
  const forts = state.fortifications
    ? state.fortifications.filter((f) => f.realmId === realmId && f.level > 0).length
    : state.provinces.filter((p) => (p.fortOwner ?? p.owner) === realmId && p.fort > 0).length;
  const occupation = state.provinces.filter(
    (p) => p.occupiedBy === realmId && p.owner !== realmId,
  ).length;
  const court = COURTS[realm.court ?? 1]!.gold;
  const lieutenantSalaries = (state.characters ?? [])
    .filter((c) => c.realmId === realmId && c.role === 'lieutenant')
    .reduce((n, c) => n + (c.salary ?? 0), 0);
  return {
    realmId,
    turn: state.turn,
    taxes: 0,
    holdings: 0,
    trade: 0,
    lawClaims: 0,
    tributeIn: 0,
    tributeOut: 0,
    administration,
    forts,
    occupation,
    court,
    lieutenantSalaries,
    maintenance: administration + forts + occupation + court + lieutenantSalaries,
    military: npcPayrollExempt(state, scenario, realmId)
      ? 0
      : militaryUpkeep(state, scenario, realmId),
    regency: 0,
    net: 0,
  };
}
function finishReport(state: Campaign, scenario: Scenario, r: Report) {
  if (state.realms.some((realm) => realm.id === r.realmId && realm.behavior === 'monsters')) {
    r.regency = 0;
    r.net = 0;
    return;
  }
  r.regency = Math.min(
    bloodlineStrength(state, scenario, r.realmId),
    Math.max(0, 65535 - (state.realms.find((realm) => realm.id === r.realmId)?.regency ?? 0)),
    // Keep whole RP; round combined trade receipts once, not each port.
    domainPower(state, scenario, r.realmId) +
      (characterClasses(scenario, r.realmId, state).some((c) => c.type === 'thief')
        ? Math.floor(r.trade)
        : 0),
  );
  r.net =
    r.taxes +
    r.holdings +
    r.trade +
    (r.lawClaims ?? 0) +
    (r.tributeIn ?? 0) -
    (r.tributeOut ?? 0) -
    r.maintenance -
    r.military;
}
export function economicForecast(state: Campaign, scenario: Scenario, realmId: string): Report {
  const r = Object.assign(
    expenseReport(state, scenario, realmId),
    income(state, scenario, false).get(realmId),
  );
  for (const t of state.tributes ?? []) {
    if (t.payer === realmId) r.tributeOut! += t.amount;
    if (t.recipient === realmId) r.tributeIn! += t.amount;
  }
  finishReport(state, scenario, r);
  return r;
}
/** Actions are prepaid; one simultaneous seasonal collection, then tribute, upkeep, and RP. */
export function settlePCEconomy(state: Campaign, scenario: Scenario) {
  refreshTradeRoutes(state, scenario);
  const collected = income(state, scenario, true);
  const reports = new Map<string, Report>();
  const active = [...state.realms]
    .filter((r) => !r.eliminated && r.controller !== 'passive' && r.behavior !== 'monsters')
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const realm of active) {
    const r = Object.assign(expenseReport(state, scenario, realm.id), collected.get(realm.id));
    r.opening = realm.treasury;
    r.unpaid = 0;
    r.regencyUpkeep = 0;
    realm.treasury = goldBars(realm.treasury + r.taxes + r.holdings + r.trade + r.lawClaims!);
    reports.set(realm.id, r);
  }
  // Reserve only already-owned gold; incoming tribute cannot fund a circular chain this season.
  const available = new Map(active.map((r) => [r.id, r.treasury]));
  for (const t of [...(state.tributes ?? [])].sort((a, b) => a.id.localeCompare(b.id))) {
    const a = state.realms.find((r) => r.id === t.payer),
      b = state.realms.find((r) => r.id === t.recipient);
    if (!a || !b || !reports.has(a.id) || !reports.has(b.id)) continue;
    const paid = Math.min(t.amount, available.get(a.id) ?? 0);
    available.set(a.id, available.get(a.id)! - paid);
    a.treasury = goldBars(a.treasury - paid);
    b.treasury = goldBars(b.treasury + paid);
    reports.get(a.id)!.tributeOut! += paid;
    reports.get(b.id)!.tributeIn! += paid;
    if (paid < t.amount)
      state.log.push({
        code: 'tribute.shortfall',
        turn: state.turn,
        realmId: a.id,
        data: { target: b.id, amount: t.amount, paid },
      });
  }
  const mutinies: Campaign['armies'] = [];
  const monsters = state.realms.find((r) => r.behavior === 'monsters' && !r.eliminated);
  for (const realm of active) {
    const r = reports.get(realm.id)!;
    const pay = (amount: number) => {
      const paid = Math.min(amount, realm.treasury);
      realm.treasury = goldBars(realm.treasury - paid);
      r.unpaid! += amount - paid;
      return paid;
    };
    r.administration = pay(r.administration!);
    r.occupation = pay(r.occupation!);
    if (r.unpaid! > 0 && !nativeNPC(state, scenario, realm.id)) {
      realm.bankrupt = true;
      state.log.push({
        code: 'economy.bankrupt',
        turn: state.turn,
        realmId: realm.id,
        data: { deficit: r.unpaid! },
      });
    }
    // Automatic affordable court downgrade is a documented compatibility policy.
    while ((realm.court ?? 1) > 0 && COURTS[realm.court ?? 1]!.gold > realm.treasury)
      realm.court = (realm.court ?? 1) - 1;
    r.court = pay(COURTS[realm.court ?? 1]!.gold);
    r.lieutenantSalaries = pay(r.lieutenantSalaries ?? 0);
    r.forts = 0;
    if (state.fortifications) {
      for (const f of state.fortifications
        .filter((f) => f.realmId === realm.id && f.level > 0)
        .sort((a, b) => a.id.localeCompare(b.id))) {
        if (realm.treasury >= 1) r.forts += pay(1);
        else {
          f.level--;
          r.unpaid!++;
        }
      }
      for (const p of state.provinces) p.fort = fortLevel(state, p);
    } else
      for (const p of state.provinces.filter(
        (p) => (p.fortOwner ?? p.owner) === realm.id && p.fort > 0,
      )) {
        if (realm.treasury >= 1) r.forts += pay(1);
        else {
          p.fort--;
          r.unpaid!++;
        }
      }
    r.military = 0;
    for (const a of state.armies
      .filter((a) => a.realmId === realm.id)
      .sort((a, b) => a.id.localeCompare(b.id))) {
      a.units = a.units.filter((u) => {
        const cost = npcPayrollExempt(state, scenario, realm.id)
          ? 0
          : (scenario.units.find((d) => d.id === u.type)?.upkeep ?? 0);
        if (realm.treasury >= cost) {
          r.military += pay(cost);
          return true;
        }
        if (realm.regency >= cost * 5) {
          realm.regency -= cost * 5;
          r.regencyUpkeep! += cost * 5;
          return true;
        }
        r.unpaid! += cost;
        const mercenary = scenario.units.find((d) => d.id === u.type)?.pc?.mercenary;
        if (mercenary && monsters) {
          let band = mutinies.find((b) => b.provinceId === a.provinceId && b.units.length < 15);
          if (!band) {
            band = {
              id: `army-${state.nextId++}`,
              realmId: monsters.id,
              provinceId: a.provinceId,
              units: [],
              moved: false,
            };
            mutinies.push(band);
          }
          band.units.push(u);
        }
        state.log.push({
          code: mercenary && monsters ? 'unit.mutinied' : 'unit.unpaid',
          turn: state.turn,
          realmId: realm.id,
          data: { unit: u.type, province: a.provinceId, target: monsters?.id ?? '' },
        });
        return false;
      });
    }
    r.maintenance = r.administration! + r.forts + r.occupation! + r.court + r.lieutenantSalaries;
    finishReport(state, scenario, r);
    realm.regency += r.regency;
    npcTreasuryFallback(state, scenario, realm.id);
    r.closing = realm.treasury;
    r.net = r.closing - r.opening!;
    state.reports.push(r);
    state.log.push({
      code: 'economy.collected',
      turn: state.turn,
      realmId: realm.id,
      data: {
        net: r.net,
        regency: r.regency,
        taxes: r.taxes,
        holdings: r.holdings,
        trade: r.trade,
        claims: r.lawClaims!,
        tributeIn: r.tributeIn!,
        tributeOut: r.tributeOut!,
        maintenance: r.maintenance,
        military: r.military,
        unpaid: r.unpaid!,
        regencyUpkeep: r.regencyUpkeep!,
      },
    });
  }
  settleFealtyRegency(state, reports);
  state.armies = [...state.armies.filter((a) => a.units.length > 0), ...mutinies];
  for (const p of state.provinces) {
    // CD §128: consequences at the end of the following domain turn.
    p.loyalty = Math.max(0, Math.min(4, p.loyalty + (p.pendingTaxLoyalty ?? 0)));
    if (p.contested) {
      p.pendingTaxLoyalty = 0;
      continue;
    }
    let delta = { light: 1, moderate: 0, severe: -1 }[p.tax] - (p.occupiedBy ? 1 : 0);
    const controller = provinceController(p);
    const law = p.occupiedBy
      ? state.armies
          .filter((a) => a.realmId === controller && a.provinceId === p.id)
          .reduce((n, a) => n + a.units.length, 0)
      : state.holdings
          .filter(
            (h) =>
              h.provinceId === p.id &&
              h.realmId === controller &&
              h.type === 'law' &&
              !h.contested &&
              !h.destroyed,
          )
          .reduce((n, h) => n + h.level, 0);
    if (delta < 0) delta = Math.min(0, delta + (law >= p.level ? 2 : law * 2 >= p.level ? 1 : 0));
    p.pendingTaxLoyalty = delta;
  }
  state.reports = state.reports.slice(-Math.max(60, state.realms.length * 4));
}
