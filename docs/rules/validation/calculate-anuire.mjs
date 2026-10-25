// Read-only research calculation. Run from repository root:
// node docs/rules/validation/calculate-anuire.mjs
// No applyCommand, seasonal settlement, source writes, saves or gameplay rule changes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const root = process.cwd();
const output = path.join(root, 'docs/rules/validation');
const cache = path.join(root, 'reference/research-cache/birthright15/anuire-validation');
const scale = 120;
const U = (n) => {
  assert(Math.abs(n * scale - Math.round(n * scale)) < 1e-7, `Inexact amount ${n}`);
  return Math.round(n * scale);
};
const GB = (n) => n / scale;
const sum = (a, f = (x) => x) => a.reduce((s, x) => s + f(x), 0);
const hash = (b) => createHash('sha256').update(b).digest('hex');
const rid = (n) => `anuire-realm-${String(n).padStart(2, '0')}`;
const pid = (n) => `anuire-province-${String(n).padStart(3, '0')}`;
const csv = async (name, rows) => {
  assert(rows.length);
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v) => {
    const s =
      v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  await fs.writeFile(
    path.join(output, name),
    [keys.join(','), ...rows.map((r) => keys.map((k) => cell(r[k])).join(','))].join('\n') + '\n',
  );
};
await fs.mkdir(cache, { recursive: true });
const names = ['anuire', 'economy', 'magic', 'strategy', 'initialization'];
const inputs = {};
const hashes = {};
for (const name of names) {
  const file = `reference/extracted/anuire/${name}.research.json`;
  const bytes = await fs.readFile(file);
  inputs[name] = JSON.parse(bytes);
  hashes[file] = hash(bytes);
}
// Protect every existing tracked gameplay file, imported research input and prior rules document.
for (const dir of ['packages', 'apps/game/src', 'docs/rules']) {
  const visit = async (p) => {
    for (const e of await fs.readdir(p, { withFileTypes: true })) {
      const file = path.join(p, e.name);
      if (e.isDirectory() && !['node_modules', 'dist', 'validation'].includes(e.name))
        await visit(file);
      else if (
        e.isFile() &&
        /\.(ts|tsx|json|md|css)$/.test(e.name) &&
        !e.name.startsWith('BIRTHRIGHT_15_ANUIRE_')
      )
        hashes[file] = hash(await fs.readFile(file));
    }
  };
  await visit(dir);
}
const raw = inputs.anuire.campaign;
assert.equal(raw.realms.length, 51);
assert.equal(raw.regents.length, 116);
const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const { loadAnuireScenario } = await vite.ssrLoadModule(
    '/packages/world-data/anuire-scenario.ts',
  );
  const { createCampaign } = await vite.ssrLoadModule('/packages/core/engine.ts');
  const { economicForecast, COURTS, taxDice, holdingDice } = await vite.ssrLoadModule(
    '/packages/core/economy.ts',
  );
  const { sourcePotential } = await vite.ssrLoadModule('/packages/core/selectors.ts');
  const { realmSelectable } = await vite.ssrLoadModule('/packages/core/domains.ts');
  const scenario = await loadAnuireScenario(
    inputs.anuire,
    inputs.economy,
    inputs.magic,
    inputs.strategy,
  );
  const state = createCampaign(scenario, 'anuire-realm-01', 1997, 'ENHANCED');
  const beforeState = hash(JSON.stringify(state));
  const beforeScenario = hash(JSON.stringify(scenario));
  const pmap = new Map(state.provinces.map((p) => [p.id, p]));
  const defs = new Map(scenario.provinces.map((p) => [p.id, p]));
  const units = new Map(scenario.units.map((u) => [u.id, u]));
  const native = new Map(raw.regents.map((r) => [r.id, r]));
  const moneyRows = [];
  const aggregate = new Map();
  for (const h of state.holdings) {
    const key = `${h.realmId}/${h.provinceId}/${h.type}`;
    const a = aggregate.get(key) ?? { ...h, level: 0, ids: [], count: 0 };
    a.level += h.level;
    a.ids.push(h.id);
    a.count++;
    aggregate.set(key, a);
  }
  const aggs = [...aggregate.values()];
  const armyRecords = state.armies.flatMap((a) =>
    a.units.map((u) => ({
      ...u,
      realmId: a.realmId,
      provinceId: a.provinceId,
      definition: units.get(u.type),
    })),
  );
  for (const p of state.provinces)
    moneyRows.push({
      assetId: p.id,
      kind: 'province',
      realmId: p.owner,
      provinceId: p.id,
      level: p.level,
      incomeU: p.level * scale,
      incomeGB: p.level,
    });
  for (const h of state.holdings)
    moneyRows.push({
      assetId: h.id,
      kind: h.type,
      realmId: h.realmId,
      provinceId: h.provinceId,
      level: h.level,
      incomeU:
        h.type === 'law' ? h.level * 40 : ['guild', 'temple'].includes(h.type) ? h.level * 80 : 0,
      incomeGB:
        h.type === 'law'
          ? h.level / 3
          : ['guild', 'temple'].includes(h.type)
            ? (2 * h.level) / 3
            : 0,
      note: 'Source virtual income calculated after owner/province/type aggregation; no independent virtual record.',
    });
  for (const h of aggs.filter((h) => h.type === 'source' && h.level > 4))
    moneyRows.push({
      assetId: h.ids.join('+'),
      kind: 'source-derived-virtual',
      realmId: h.realmId,
      provinceId: h.provinceId,
      level: Math.max(0, h.level - 4),
      incomeU: Math.max(0, h.level - 4) * 80,
      incomeGB: (Math.max(0, h.level - 4) * 2) / 3,
    });
  for (const f of state.fortifications)
    moneyRows.push({
      assetId: f.id,
      kind: f.kind,
      realmId: f.realmId,
      provinceId: f.provinceId,
      level: f.level,
      incomeU: 0,
      fortUpperU: f.level * 80,
      fortTowerAnalogueU: f.level * (f.kind === 'wizard-tower' ? 40 : 80),
      fortFlatU: scale,
      note:
        f.kind === 'wizard-tower'
          ? 'Holding-fort analogue is a cost sensitivity, not verified institutional ownership.'
          : 'Province-fort analogue.',
    });
  for (const a of armyRecords)
    moneyRows.push({
      assetId: a.id,
      kind: 'military',
      realmId: a.realmId,
      provinceId: a.provinceId,
      level: a.strength,
      unitType: a.type,
      unitName: a.definition.name,
      incomeU: 0,
      nativePayrollU: U(a.definition.upkeep),
      musterCostGB: a.definition.cost,
      brcsActiveU: U(a.definition.cost / 2),
      brcsGarrisonU: U(a.definition.cost / 4),
      recruitable: a.definition.recruitable,
      note: !a.definition.recruitable
        ? 'Non-recruitable price is not an established BRCS muster valuation.'
        : 'Sierra muster-price basis, not a complete BRCS unit conversion.',
    });
  for (const c of state.characters)
    moneyRows.push({
      assetId: c.id,
      kind: 'character-deployment',
      realmId: c.realmId,
      provinceId: c.provinceId,
      regentId: c.regentId,
      incomeU: 0,
      recordedSalaryGB: c.salary ?? 0,
      note: 'Character identity is preserved separately from military payroll. No salary contract is invented.',
    });
  for (const p of state.ports)
    moneyRows.push({
      assetId: p.id,
      kind: p.kind,
      realmId: p.realmId,
      provinceId: p.provinceId,
      incomeU: U(pmap.get(p.provinceId).level / (p.kind === 'river-port' ? 2 : 1)),
      incomeGB: pmap.get(p.provinceId).level / (p.kind === 'river-port' ? 2 : 1),
    });
  const diceRange = ([n, sides, add]) => [Math.max(0, n + add), Math.max(0, n * sides + add)];
  const domains = [];
  for (const realm of scenario.realms) {
    const opening = state.realms.find((r) => r.id === realm.id);
    const hs = aggs.filter((h) => h.realmId === realm.id);
    const ps = state.provinces.filter((p) => p.owner === realm.id);
    const forts = state.fortifications.filter((f) => f.realmId === realm.id);
    const arms = armyRecords.filter((u) => u.realmId === realm.id);
    const port = state.ports.filter((p) => p.realmId === realm.id);
    const byType = Object.fromEntries(
      ['law', 'guild', 'temple', 'source'].map((t) => [
        t,
        sum(
          hs.filter((h) => h.type === t),
          (h) => h.level,
        ),
      ]),
    );
    const classes = new Set(realm.regent.classes.map((c) => c.type));
    const cash = {
      province: sum(ps, (p) => p.level * scale),
      law: byType.law * 40,
      guild: byType.guild * 80,
      temple: byType.temple * 80,
      virtual: sum(
        hs.filter((h) => h.type === 'source'),
        (h) => Math.max(0, h.level - 4) * 80,
      ),
      ports: sum(port, (p) => U(pmap.get(p.provinceId).level / (p.kind === 'river-port' ? 2 : 1))),
    };
    const hd = economicForecast(state, scenario, realm.id);
    const controlled = structuredClone(state);
    controlled.playerRealm = realm.id;
    controlled.realms.find((r) => r.id === realm.id).controller = 'player';
    const hdControlled = economicForecast(controlled, scenario, realm.id);
    const ranges = [
      ...ps.map((p) => diceRange(taxDice(p.level, p.tax))),
      ...state.holdings
        .filter((h) => h.realmId === realm.id && ['guild', 'temple'].includes(h.type))
        .map((h) => diceRange(holdingDice(pmap.get(h.provinceId).level, h.level))),
    ];
    const matureCourt = Math.max(0, ...hs.filter((h) => h.type !== 'source').map((h) => h.level));
    const possibleSeatLevel = Math.max(
      0,
      ...ps.map((p) => p.level),
      ...hs.filter((h) => h.level > 0).map((h) => pmap.get(h.provinceId).level),
    );
    const row = {
      id: realm.id,
      name: realm.name,
      type: realm.domainType,
      controller: realm.controller,
      standard: realm.domainType !== 'inactive' && realm.specialBehavior !== 'monsters',
      regentId: realm.regent.id,
      regent: realm.regent.name,
      classes: [...classes],
      openingU: U(opening.treasury),
      openingRP: opening.regency,
      nativeCourt: opening.court,
      provinceCount: ps.length,
      provinceLevels: sum(ps, (p) => p.level),
      ...byType,
      holdingRecords: state.holdings.filter((h) => h.realmId === realm.id).length,
      fortCount: forts.length,
      fortLevels: sum(forts, (f) => f.level),
      militaryCount: arms.length,
      ports: port.length,
      sourceCashEligibleWizard: classes.has('wizard'),
      cash,
      incomeU: sum(Object.values(cash)),
      military: {
        native: sum(arms, (u) => U(u.definition.upkeep)),
        active: sum(arms, (u) => U(u.definition.cost / 2)),
        garrison: sum(arms, (u) => U(u.definition.cost / 4)),
      },
      uncertainMonsterPrices: arms.filter((u) => !u.definition.recruitable).length,
      fort: {
        upper: sum(forts, (f) => f.level * 80),
        towerAnalogue: sum(forts, (f) => f.level * (f.kind === 'wizard-tower' ? 40 : 80)),
        flat: forts.length * scale,
      },
      court: {
        opening: opening.court,
        cashPreserve: COURTS[opening.court].gold,
        expectedHolding: matureCourt,
      },
      possibleSeatLevel,
      additionalPortFeeU: port.filter((p) => p.kind === 'seaport').length * 60,
      hd,
      hdControlled,
      hdIncomeLow: sum(ranges, (r) => r[0]) + GB(cash.ports),
      hdIncomeHigh: sum(ranges, (r) => r[1]) + GB(cash.ports),
      sourceCashIfWizardOnlyU: classes.has('wizard') ? cash.virtual : 0,
      nativeVassalOf: state.treaties
        .filter((t) => t.kind === 'vassal' && t.vassal === realm.id)
        .map((t) => (t.a === realm.id ? t.b : t.a)),
    };
    domains.push(row);
  }
  const sensitivity = [];
  for (const d of domains)
    for (const m of ['native', 'active', 'garrison'])
      for (const c of ['opening', 'expectedHolding'])
        for (const f of ['upper', 'towerAnalogue', 'flat'])
          for (const p of [false, true]) {
            const cost = d.military[m] + U(d.court[c]) + d.fort[f] + (p ? d.additionalPortFeeU : 0);
            const net = d.incomeU - cost;
            sensitivity.push({
              realmId: d.id,
              name: d.name,
              standard: d.standard,
              military: m,
              court: c,
              fort: f,
              portFee: p,
              incomeU: d.incomeU,
              expenseU: cost,
              netU: net,
              closingU: d.openingU + net,
              fundingGapU: Math.max(0, -net - d.openingU),
              recurrentGapU: Math.max(0, -net),
              monsterPriceCaveat: m !== 'native' && d.uncertainMonsterPrices > 0,
            });
          }
  const baseFor = (id) =>
    sensitivity.find(
      (x) =>
        x.realmId === id &&
        x.military === 'active' &&
        x.court === 'opening' &&
        x.fort === 'upper' &&
        !x.portFee,
    );
  const regents = [];
  const rpEnvelopes = [];
  const variants = [];
  for (const r of raw.regents) {
    const adapted = scenario.regents.find((a) => a.id === r.id);
    const owner = scenario.realms.find((d) => d.id === rid(r.realmIndex));
    const A = r.bloodline.strength;
    const unavailable = /unknown|unnamed/i.test(r.identity.name);
    const bLow = Math.floor(A / 2),
      bHigh = Math.ceil(A / 2);
    const external =
      r.id === 'anuire-regent-027'
        ? 'Community Kalien stat block has check modifiers, not a verified rank allocation.'
        : r.id === 'anuire-regent-028'
          ? 'Community Friemen Caine stat block leaves Skills blank.'
          : '';
    regents.push({
      id: r.id,
      name: r.identity.name,
      realmId: owner?.id ?? rid(r.realmIndex),
      realm: owner?.name ?? 'No domain record',
      nativeClass: r.classCode,
      nativeLevel: r.level,
      nativeSecondClass: r.secondClassCode,
      nativeSecondLevel: r.secondLevel,
      avaClasses: r.identity.classes,
      adaptedClasses: adapted.classes,
      ...r.identity.attributes,
      hp: r.identity.hitPoints,
      alignment: r.identity.alignment,
      raceCode: r.raceCode,
      avatarId: r.avatarId,
      deployedUnitIndex: r.unitIndex,
      defaultRuler: scenario.realms.some((d) => d.regent.id === r.id),
      offeredClassic: scenario.realms.some(
        (d) => realmSelectable(scenario, d.id, 'CLASSIC') && d.regentCandidates.includes(r.id),
      ),
      offeredExpanded: scenario.realms.some(
        (d) => realmSelectable(scenario, d.id, 'UNRESTRICTED') && d.regentCandidates.includes(r.id),
      ),
      unknownIdentity: unavailable,
      derivation: r.bloodline.derivation,
      grade: r.bloodline.grade,
      nativeBloodlineA: A,
      b30Floor: bLow,
      b30Ceil: bHigh,
      b30CollectionFloor: 2 * bLow,
      b30CollectionCeil: 2 * bHigh,
      b30ReserveFloor: 5 * bLow,
      b30ReserveCeil: 5 * bHigh,
      b30GrowthFloorRP: 4 * bLow,
      b30GrowthCeilRP: 4 * bHigh,
      b30SacrificeFloorRP: 2 * bLow,
      b30SacrificeCeilRP: 2 * bHigh,
      b35HypothesisS: A,
      b35Collection: A,
      b35Reserve: 2 * A,
      b35GrowthRP: A + 1,
      b35SacrificeRP: A,
      brcsRanksRecovered: false,
      proposedRanks: null,
      externalEvidence: external,
      note: unavailable
        ? 'Generic AVA identity/zero attributes do not establish a real regent.'
        : 'Recovered native/AVA attributes; no inferred ranks or feat bonuses.',
    });
  }
  for (const d of domains.filter((d) => d.standard)) {
    const realm = scenario.realms.find((r) => r.id === d.id);
    for (const id of new Set([d.regentId, ...realm.regentCandidates])) {
      const r = scenario.regents.find((r) => r.id === id);
      const n = native.get(id),
        A = n.bloodline.strength;
      const cs = new Set(r.classes.map((c) => c.type));
      // Eligibility screen only: full BRCS race/class/spell conversion is not established.
      const eligibleTemple =
        cs.has('priest') ||
        r.classes.some(
          (c) => (c.type === 'paladin' && c.level >= 4) || (c.type === 'ranger' && c.level >= 4),
        );
      const eligibleSource = cs.has('wizard');
      const potential = A
        ? d.provinceLevels +
          d.law +
          d.guild +
          (eligibleTemple ? d.temple : 0) +
          (eligibleSource ? d.source : 0)
        : 0;
      for (const [packageId, cap, reserve] of [
        ['B30_FLOOR', 2 * Math.floor(A / 2), 5 * Math.floor(A / 2)],
        ['B30_CEIL', 2 * Math.ceil(A / 2), 5 * Math.ceil(A / 2)],
        ['B35_S_EQUALS_A_HYPOTHESIS', A, 2 * A],
      ]) {
        rpEnvelopes.push({
          realmId: d.id,
          regentId: id,
          name: r.name,
          package: packageId,
          nativeA: A,
          startingRP: d.openingRP,
          collectionCap: cap,
          reserveCap: reserve,
          excessExistingRP: Math.max(0, d.openingRP - reserve),
          screenedPotentialRP: potential,
          collectionLower: 0,
          collectionUpper: Math.min(potential, cap),
          retainedUpper: Math.max(0, Math.min(potential, cap, reserve - d.openingRP)),
          ranksStatus: 'UNKNOWN; range is an envelope, not an assigned collection',
          eligibilityStatus: 'Provisional adapted-class screen; BRCS caster conversion pending',
        });
      }
      const alt = structuredClone(state);
      const domain = alt.realms.find((x) => x.id === d.id);
      domain.regentId = id;
      domain.bloodlineStrength = A;
      domain.knownSpells = [...(r.realmSpells ?? [])];
      alt.playerRealm = d.id;
      domain.controller = 'player';
      variants.push({
        realmId: d.id,
        name: d.name,
        regentId: id,
        regent: r.name,
        classes: r.classes,
        nativeA: A,
        p15GB: GB(d.incomeU),
        p15GBIfRegentWizardOnly: GB(
          d.incomeU - d.cash.virtual + (cs.has('wizard') ? d.cash.virtual : 0),
        ),
        hdControlledRP: economicForecast(alt, scenario, d.id).regency,
        p15RP: null,
        note: 'Cash is identical across ruler variants in owner-based virtual-cash case. Rank-derived RP remains unknown.',
      });
    }
  }
  const totalAt = (prov, type) =>
    sum(
      aggs.filter((h) => h.provinceId === prov && h.type === type),
      (h) => h.level,
    );
  const growth = [];
  const extra = (c, bracket) =>
    c < 3 ? 0 : c === 4 ? bracket : c < 5 ? 1 : c < 6 ? 2 : c < 8 ? 3 : c < 10 ? 4 : 5;
  const positiveOwners = (h) =>
    aggs.filter((x) => x.provinceId === h.provinceId && x.type === h.type && x.level > 0).length;
  const slots = (capacity) => (capacity <= 2 ? 1 : capacity <= 5 ? 2 : capacity <= 8 ? 3 : 4);
  const opportunities = [];
  for (const h of aggs) {
    const p = pmap.get(h.provinceId);
    const capacity =
      h.type === 'source' ? sourcePotential(scenario, h.provinceId, p.level) : p.level;
    const room = capacity - totalAt(h.provinceId, h.type);
    const typeGain = h.type === 'law' ? 40 : h.type === 'source' ? (h.level >= 4 ? 80 : 0) : 80;
    const regent = scenario.realms.find((r) => r.id === h.realmId)?.regent;
    const caster = h.type !== 'source' || regent.classes.some((c) => c.type === 'wizard');
    const ownerSlot = h.level > 0 || positiveOwners(h) < slots(capacity);
    if (room > 0 && ownerSlot && caster)
      opportunities.push({
        ...h,
        capacity,
        room,
        gainU: typeGain,
        probability: Math.max(0, Math.min(1, (11 - h.level) / 20)),
        host: p.owner,
      });
  }
  for (const d of domains.filter((d) => d.standard))
    for (const [court, bracket] of [
      [1, 1],
      [3, 1],
      [4, 1],
      [4, 2],
      [5, 2],
      [6, 3],
      [10, 5],
    ]) {
      const b = baseFor(d.id);
      const palaceLevels = Math.max(0, court - d.possibleSeatLevel);
      const palaceCapitalU = U(palaceLevels * 6),
        palaceUpkeepU = U(palaceLevels / 2);
      let allowance = Math.max(
        0,
        Math.min(
          d.openingU - palaceCapitalU,
          d.openingU + b.netU - U(court - d.court.opening) - palaceCapitalU - palaceUpkeepU,
        ),
      );
      let candidates = opportunities.filter((h) => h.realmId === d.id && h.gainU > 0);
      const chosen = [];
      for (let round = 1; round <= 3; round++) {
        const groups = new Map();
        for (const h of candidates) {
          const key = h.type + '/' + h.host;
          groups.set(key, [...(groups.get(key) ?? []), h]);
        }
        const batches = [...groups.values()]
          .map((g) =>
            g
              .sort(
                (a, b) =>
                  b.gainU * b.probability - a.gainU * a.probability || a.id.localeCompare(b.id),
              )
              .slice(0, 1 + extra(court, bracket)),
          )
          .sort(
            (a, b) =>
              sum(b, (h) => h.gainU * h.probability) - sum(a, (h) => h.gainU * h.probability),
          );
        const batch = (batches[0] ?? []).slice(0, Math.floor(allowance / scale));
        for (const h of batch) chosen.push({ ...h, round });
        allowance -= batch.length * scale;
        const used = new Set(batch.map((h) => h.id));
        candidates = candidates.filter((h) => !used.has(h.id));
      }
      growth.push({
        realmId: d.id,
        name: d.name,
        court,
        level4Extra: bracket,
        extraPerRound: extra(court, bracket),
        courtCostGB: court,
        minimumCourtProgressSeasons: court - 1,
        minimumCourtDecreeGB: court - 1,
        incrementalCourtProgressUpkeepGB: (court * (court + 1)) / 2 - 1 - (court - 1),
        possibleSeatLevel: d.possibleSeatLevel,
        palaceLevelsLowerBound: palaceLevels,
        palaceCapitalGB: GB(palaceCapitalU),
        palaceUpkeepGB: GB(palaceUpkeepU),
        eligibleExistingAssets: opportunities.filter((h) => h.realmId === d.id && h.gainU > 0)
          .length,
        fundedAttempts: chosen.length,
        capitalGB: chosen.length,
        deltaIncomePerfectGB: GB(sum(chosen, (h) => h.gainU)),
        deltaIncomeExpectedGB: GB(sum(chosen, (h) => h.gainU * h.probability)),
        netBeforeGrowthGB: GB(b.netU) - court + d.court.opening - GB(palaceUpkeepU),
        closingPerfectGB:
          GB(d.openingU + b.netU - palaceCapitalU - palaceUpkeepU) -
          court +
          d.court.opening -
          chosen.length +
          GB(sum(chosen, (h) => h.gainU)),
        chosen: chosen.map((h) => ({
          ids: h.ids,
          fromLevel: h.level,
          provinceId: h.provinceId,
          type: h.type,
          round: h.round,
          p: h.probability,
        })),
        scope:
          'Hypothetical developed court; prior progression costs disclosed separately. Palace minimum capital/upkeep costed using highest province with owned land/positive holding, not verified seat permission; construction time pending. One attempt per existing aggregate; no province Rule, Create, seizure, trade, opposition or rank bonuses. Newly grown cash shown for next eligible collection.',
      });
    }
  const roadCost = {
    plains: 2,
    hills: 4,
    forest: 4,
    swamp: 6,
    mountains: 8,
    'heavy-mountains': 8,
    coast: 2,
  };
  const guilds = aggs.filter((h) => h.type === 'guild' && h.level > 0);
  const trade = [];
  for (let i = 0; i < guilds.length; i++)
    for (let j = i + 1; j < guilds.length; j++) {
      const a = guilds[i],
        b = guilds[j],
        pa = defs.get(a.provinceId),
        pb = defs.get(b.provinceId);
      if (
        a.provinceId === b.provinceId ||
        pa.terrain === pb.terrain ||
        !pa.adjacent.includes(pb.id) ||
        !pb.adjacent.includes(pa.id)
      )
        continue;
      const roads = roadCost[pa.terrain] + roadCost[pb.terrain];
      trade.push({
        aHoldingIds: a.ids,
        bHoldingIds: b.ids,
        aRealm: a.realmId,
        bRealm: b.realmId,
        aProvince: pa.id,
        bProvince: pb.id,
        aName: pa.name,
        bName: pb.name,
        aH: a.level,
        bH: b.level,
        aIncomeGB: a.level / 2,
        bIncomeGB: b.level / 2,
        totalIncomeGB: (a.level + b.level) / 2,
        roadCapitalGB: roads,
        routeCapitalGB: 1,
        highwayUpkeepGB: roads / 12,
        totalSurplusBeforeTributeGB: (a.level + b.level) / 2 - roads / 12,
        paybackSeasons: (roads + 1) / ((a.level + b.level) / 2 - roads / 12),
        status:
          'HYPOTHETICAL one independent route; valid positive real Guilds and adjacent different terrain only; roads, consent, bridge need and funding not established; rows cannot all be activated together.',
      });
    }
  const summaryCase = [];
  for (const m of ['native', 'active', 'garrison'])
    for (const c of ['opening', 'expectedHolding'])
      for (const f of ['upper', 'towerAnalogue', 'flat'])
        for (const p of [false, true]) {
          const rows = sensitivity.filter(
            (x) =>
              x.standard && x.military === m && x.court === c && x.fort === f && x.portFee === p,
          );
          summaryCase.push({
            military: m,
            court: c,
            fort: f,
            portFee: p,
            domains: rows.length,
            incomeGB: GB(sum(rows, (r) => r.incomeU)),
            expenseGB: GB(sum(rows, (r) => r.expenseU)),
            netGB: GB(sum(rows, (r) => r.netU)),
            negativeNet: rows.filter((r) => r.netU < 0).length,
            negativeClosing: rows.filter((r) => r.closingU < 0).length,
            firstSeasonFundingGB: GB(sum(rows, (r) => r.fundingGapU)),
            recurrentFundingGB: GB(sum(rows, (r) => r.recurrentGapU)),
          });
        }
  const coverage = {
    realms: domains.length,
    standard: domains.filter((d) => d.standard).length,
    holdingOnly: domains.filter((d) => d.type === 'holding').length,
    excluded: domains
      .filter((d) => !d.standard)
      .map((d) => ({ id: d.id, name: d.name, type: d.type })),
    provinces: raw.provinces.length,
    holdings: raw.holdings.length,
    aggregateHoldings: aggs.length,
    duplicateGroups: aggs.filter((h) => h.count > 1).map((h) => ({ ids: h.ids, level: h.level })),
    forts: raw.forts.length,
    fortLevels: sum(raw.forts, (f) => f.level),
    military: armyRecords.length,
    characters: state.characters.length,
    ports: state.ports.length,
    sea: state.ports.filter((p) => p.kind === 'seaport').length,
    river: state.ports.filter((p) => p.kind === 'river-port').length,
    regents: regents.length,
    unknownRegents: regents.filter((r) => r.unknownIdentity).length,
    classicCandidates: regents.filter((r) => r.offeredClassic).length,
    expandedCandidates: regents.filter((r) => r.offeredExpanded).length,
    encodedNonzeroGuildRoutes: inputs.economy.guildRoutes.filter(
      (r) => r.route1 || r.route2 || r.route3,
    ).length,
    recordedTributes: inputs.economy.tributes.length,
    initialTradeRoutes: state.tradeRoutes.length,
    initialLeyLines: state.leyLines.length,
    initialOccupations: state.provinces.filter((p) => p.occupiedBy).length,
    oddBloodlines: regents.filter((r) => r.nativeBloodlineA % 2).length,
    regentsWithRanks: 0,
    developmentOpportunities: opportunities.length,
    tradeCandidates: trade.length,
  };
  const stress = [];
  const administrate = [];
  const sourceGrowth = [];
  for (const d of domains.filter((d) => d.standard)) {
    const b = baseFor(d.id);
    const provinceLoss = Math.max(
      0,
      ...state.provinces
        .filter((p) => p.owner === d.id)
        .map(
          (p) =>
            p.level * scale +
            sum(
              moneyRows.filter(
                (a) =>
                  a.realmId === d.id &&
                  a.provinceId === p.id &&
                  ['seaport', 'river-port'].includes(a.kind),
              ),
              (a) => a.incomeU,
            ),
        ),
    );
    const holdingLoss = Math.max(
      0,
      ...aggs
        .filter((h) => h.realmId === d.id)
        .map((h) =>
          h.type === 'law'
            ? h.level * 40
            : ['guild', 'temple'].includes(h.type)
              ? h.level * 80
              : Math.max(0, h.level - 4) * 80,
        ),
    );
    for (const [event, loss, cost] of [
      ['PORT_BLOCKADE', d.cash.ports, 0],
      ['LARGEST_PROVINCE_LOSS', provinceLoss, 0],
      ['LARGEST_HOLDING_SUPPRESSED', holdingLoss, 0],
      ['TWO_EXTRA_INFANTRY_AND_ONE_OCCUPATION', 0, U(3)],
      ['SOURCE_CASH_REGENT_WIZARD_GATE', d.cash.virtual - d.sourceCashIfWizardOnlyU, 0],
    ]) {
      const capital = event === 'TWO_EXTRA_INFANTRY_AND_ONE_OCCUPATION' ? U(4) : 0;
      const net = b.netU - loss - cost;
      stress.push({
        realmId: d.id,
        name: d.name,
        event,
        lostIncomeGB: GB(loss),
        extraRecurringGB: GB(cost),
        capitalGB: GB(capital),
        netGB: GB(net),
        closingGB: GB(d.openingU + net - capital),
        fundingGapGB: GB(Math.max(0, -d.openingU - net + capital)),
        scope:
          event === 'LARGEST_PROVINCE_LOSS'
            ? 'Victim loses provincial taxes and own port income; other institutions survive. Occupier side not fabricated.'
            : event === 'TWO_EXTRA_INFANTRY_AND_ONE_OCCUPATION'
              ? 'Hypothetical 2 Sierra Infantry musters at 2 GB, active upkeep total 2 GB and 1 GB occupation; troop/ownership outcomes not simulated.'
              : 'Hypothetical income loss; no other institutional ownership change.',
      });
    }
    const restrictedBase = d.fort.upper;
    for (const [scope, cost] of [
      ['FORTS_ONLY', restrictedBase],
      ['ALL_SEPARATE_COSTS', b.expenseU],
    ]) {
      const saving = Math.floor(GB(cost) / 4);
      administrate.push({
        realmId: d.id,
        name: d.name,
        scope,
        eligibleCostGB: GB(cost),
        dc: 10 + GB(cost),
        noDiscountNetGB: GB(b.netU),
        successSavingGB: saving,
        successNetGB: GB(b.netU) + saving,
        checkStatus:
          'UNKNOWN modifier; no ranks assigned; no discount in opening baseline; all-costs scope is an alternative, not an adopted entitlement.',
      });
    }
    for (const h of aggs.filter((h) => h.realmId === d.id && h.type === 'source' && h.level < 6)) {
      const p = pmap.get(h.provinceId),
        capacity = sourcePotential(scenario, h.provinceId, p.level),
        other = totalAt(h.provinceId, 'source') - h.level;
      const maxWithoutDisplacement = Math.max(h.level, capacity - other);
      const target = Math.min(6, maxWithoutDisplacement);
      if (target <= h.level || target < 5) continue;
      let expectedAttempts = 0,
        perfectProbability = 1;
      for (let level = h.level; level < target; level++) {
        const prob = (11 - level) / 20;
        expectedAttempts += 1 / prob;
        perfectProbability *= prob;
      }
      sourceGrowth.push({
        realmId: d.id,
        name: d.name,
        holdingIds: h.ids,
        provinceId: h.provinceId,
        province: defs.get(h.provinceId).name,
        startH: h.level,
        targetH: target,
        sourceCapacity: capacity,
        otherSourceLevels: other,
        successfulRulesNeeded: target - h.level,
        minimumRuleGB: target - h.level,
        expectedAttemptsZeroModifier: expectedAttempts,
        expectedRuleGBZeroModifier: expectedAttempts,
        probabilityAllSucceedWithoutRetry: perfectProbability,
        newVirtualGB: (2 * Math.max(0, target - 4)) / 3,
        increaseVirtualGB: (2 * (Math.max(0, target - 4) - Math.max(0, h.level - 4))) / 3,
        scope:
          'Hypothetical existing Source development within unclaimed capacity; zero support/opposition/rank bonus, 1 GB each attempt; retries in later action slots; no ownership changes.',
      });
    }
  }
  const mageFunding = [];
  for (const [realmId, startH] of [
    [rid(41), 4],
    [rid(50), 1],
  ])
    for (const court of [0, 1]) {
      // Exact enumeration of a bounded financial experiment, not a campaign simulation.
      // The court-0 case pays 1 GB and uses its first standard slot for Decree.
      let dist = new Map([[`${startH}/${U(court === 0 ? 14 : 15)}`, 1]]),
        defaults = 0;
      for (let season = 1; season <= 8; season++) {
        for (let round = 1; round <= 3; round++) {
          const next = new Map();
          const add = (h, t, p) => next.set(`${h}/${t}`, (next.get(`${h}/${t}`) ?? 0) + p);
          for (const [key, mass] of dist) {
            const [h, t] = key.split('/').map(Number);
            if (h >= 6 || t < scale || (court === 0 && season === 1 && round === 1)) {
              add(h, t, mass);
              continue;
            }
            const p = (11 - h) / 20;
            add(h + 1, t - scale, mass * p);
            add(h, t - scale, mass * (1 - p));
          }
          dist = next;
        }
        const next = new Map();
        for (const [key, mass] of dist) {
          const [h, t] = key.split('/').map(Number),
            closing = t + Math.max(0, h - 4) * 80 - U(court);
          if (closing < 0) defaults += mass;
          else next.set(`${h}/${closing}`, (next.get(`${h}/${closing}`) ?? 0) + mass);
        }
        dist = next;
        const success = sum(
          [...dist].filter(([key]) => Number(key.split('/')[0]) >= 6),
          (x) => x[1],
        );
        const continuing = sum([...dist], (x) => x[1]);
        assert(Math.abs(continuing + defaults - 1) < 1e-9);
        mageFunding.push({
          realmId,
          name: domains.find((d) => d.id === realmId).name,
          startH,
          court,
          season,
          completedH6Probability: success,
          fiscalDefaultProbability: defaults,
          stillFundedIncompleteProbability: continuing - success,
          scope:
            'Hypothetical zero-modifier unopposed Rules, no RP bids or Alchemy/patronage, three rounds/season, collection after three attempts, no other growth. Court 0 pays 1 GB Decree and uses first action. Preserved opening treasury 15 GB; no credits/subsidies.',
        });
      }
    }
  const allData = {
    format: 'birthright15-anuires-economy-research',
    version: 1,
    moneyScale: scale,
    inputs: hashes,
    coverage,
    domains,
    sensitivity,
    summaryCase,
    regents,
    rpEnvelopes,
    variants,
    growth,
    trade,
    stress,
    administrate,
    sourceGrowth,
    mageFunding,
  };
  await fs.writeFile(path.join(cache, 'calculation.json'), JSON.stringify(allData, null, 2) + '\n');
  await csv(
    'opening-domains.csv',
    domains.map((d) => ({
      realmId: d.id,
      name: d.name,
      type: d.type,
      standard: d.standard,
      regentId: d.regentId,
      regent: d.regent,
      openingGB: GB(d.openingU),
      openingRP: d.openingRP,
      nativeCourt: d.nativeCourt,
      provinces: d.provinceCount,
      provinceLevels: d.provinceLevels,
      law: d.law,
      guild: d.guild,
      temple: d.temple,
      source: d.source,
      holdingRecords: d.holdingRecords,
      forts: d.fortCount,
      fortLevels: d.fortLevels,
      militaryUnits: d.militaryCount,
      ports: d.ports,
      ...Object.fromEntries(Object.entries(d.cash).map(([k, v]) => [k + 'GB', GB(v)])),
      incomeGB: GB(d.incomeU),
      nativeMilitaryGB: GB(d.military.native),
      brcsActiveMilitaryGB: GB(d.military.active),
      brcsGarrisonMilitaryGB: GB(d.military.garrison),
      fortUpperGB: GB(d.fort.upper),
      fortTowerAnalogueGB: GB(d.fort.towerAnalogue),
      courtOpeningGB: d.court.opening,
      courtExpectedGB: d.court.expectedHolding,
      sourceCashIfWizardOnlyGB: GB(d.sourceCashIfWizardOnlyU),
      baseExpenseGB: GB(baseFor(d.id).expenseU),
      baseNetGB: GB(baseFor(d.id).netU),
      baseClosingGB: GB(baseFor(d.id).closingU),
      baseFirstFundingGB: GB(baseFor(d.id).fundingGapU),
      hdNativeContextNetGB: d.hd.net,
      hdControlledNetGB: d.hdControlled.net,
      hdAdministrationGB: d.hdControlled.administration,
      hdFortsGB: d.hdControlled.forts,
      hdCourtGB: d.hdControlled.court,
      hdMilitaryGB: d.hdControlled.military,
      hdIncomeMinGB: d.hdIncomeLow,
      hdIncomeMaxGB: d.hdIncomeHigh,
      hdRP: d.hd.regency,
      hdControlledRP: d.hdControlled.regency,
      nativeVassalOf: d.nativeVassalOf,
      uncertainMonsterPrices: d.uncertainMonsterPrices,
      recordedTradeGB: 0,
      recordedTributeGB: 0,
      recordedSalariesGB: 0,
      occupationGB: 0,
      openingActionSpendGB: 0,
      unknownCosts:
        'BRCS skills/RP; tower classification; true home garrisons; roads/bridges/fleets outside decoded records; uncontracted religious/mage services; NPC special-policy conversion',
    })),
  );
  await csv(
    'sensitivity-domains.csv',
    sensitivity.map((r) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) =>
          k.endsWith('U') ? [k.slice(0, -1) + 'GB', GB(v)] : [k, v],
        ),
      ),
    ),
  );
  await csv('sensitivity-summary.csv', summaryCase);
  await csv('regents.csv', regents);
  await csv('regent-rp-envelopes.csv', rpEnvelopes);
  await csv('ruler-variants.csv', variants);
  await csv('opening-assets.csv', moneyRows);
  await csv('growth-cases.csv', growth);
  await csv('trade-candidates.csv', trade);
  await csv('stress-cases.csv', stress);
  await csv('administrate-candidates.csv', administrate);
  await csv('source-development.csv', sourceGrowth);
  await csv('mage-funding-experiment.csv', mageFunding);
  // Research assertions, not game tests: coverage, conservation, reproducibility and non-mutation.
  assert.equal(
    sum(domains, (d) => d.holdingRecords),
    766,
  );
  assert.equal(
    sum(domains, (d) => d.militaryCount),
    234,
  );
  assert.equal(
    sum(domains, (d) => d.fortCount),
    39,
  );
  assert.equal(
    sum(domains, (d) => d.provinceCount),
    206,
  );
  assert.equal(
    sum(domains, (d) => d.incomeU),
    sum(moneyRows, (r) => r.incomeU),
  );
  for (const r of sensitivity)
    assert.equal(
      r.closingU,
      domains.find((d) => d.id === r.realmId).openingU + r.incomeU - r.expenseU,
    );
  assert.equal(hash(JSON.stringify(state)), beforeState);
  assert.equal(hash(JSON.stringify(scenario)), beforeScenario);
  for (const [file, digest] of Object.entries(hashes))
    assert.equal(hash(await fs.readFile(file)), digest, `Source changed: ${file}`);
  const evidence = {
    calculationScriptSha256: hash(await fs.readFile('docs/rules/validation/calculate-anuire.mjs')),
    coverage,
    checks: {
      allAssetsAccounted: true,
      allSensitivityBalancesReconcile: true,
      gameStateAndScenarioUnchanged: true,
      allProtectedSourceHashesUnchanged: true,
    },
    sourceHashes: hashes,
    calculationSha256: hash(await fs.readFile(path.join(cache, 'calculation.json'))),
  };
  await fs.writeFile(
    path.join(output, 'validation-summary.json'),
    JSON.stringify(evidence, null, 2) + '\n',
  );
  console.log(
    JSON.stringify(
      {
        coverage,
        base: summaryCase.find(
          (r) =>
            r.military === 'active' && r.court === 'opening' && r.fort === 'upper' && !r.portFee,
        ),
        negative: domains
          .filter((d) => d.standard && baseFor(d.id).netU < 0)
          .map((d) => ({
            name: d.name,
            net: GB(baseFor(d.id).netU),
            closing: GB(baseFor(d.id).closingU),
          })),
        checks: evidence.checks,
      },
      null,
      2,
    ),
  );
} finally {
  await vite.close();
}
