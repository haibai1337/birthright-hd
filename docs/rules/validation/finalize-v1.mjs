// Research-only repricing of the completed study. No engine, import or save writes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(out, '../../..');
const input = path.join(
  root,
  'reference/research-cache/birthright15/anuire-validation/calculation.json',
);
const bytes = fs.readFileSync(input);
const study = JSON.parse(bytes);
assert.equal(study.moneyScale, 120);
assert.equal(study.domains.length, 51);
assert.equal(study.regents.length, 116);
assert.equal(study.variants.length, 80);
const waivedIndexes = new Set([17, 19, 23, 24, 26, 29]);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const gb = (u) => {
  assert(Number.isSafeInteger(u));
  const g = gcd(u, 120);
  return 120 / g === 1 ? String(u / g) : `${u / g}/${120 / g}`;
};
const csv = (rows) => {
  const keys = Object.keys(rows[0]);
  const cell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return `${[keys, ...rows.map((r) => keys.map((k) => r[k]))].map((r) => r.map(cell).join(',')).join('\n')}\n`;
};
const totals = {
  fixedIncomeU: 0,
  conditionalVirtualU: 0,
  grossMilitaryU: 0,
  waivedMilitaryU: 0,
  fortU: 0,
  courtU: 0,
};
const rows = study.domains.map((d) => {
  const index = Number(d.id.slice(-2));
  // Study context: original AI control, no player-controlled liege chain for these NPCs.
  const waiver =
    d.standard && d.controller === 'ai' && index >= 1 && index < 35 && waivedIndexes.has(index)
      ? d.military.native
      : 0;
  const fixedIncome = d.incomeU - d.cash.virtual;
  const expense = d.military.native - waiver + d.fort.flat + d.court.opening * 120;
  const netLow = fixedIncome - expense;
  const netHigh = netLow + d.cash.virtual;
  if (d.standard) {
    totals.fixedIncomeU += fixedIncome;
    totals.conditionalVirtualU += d.cash.virtual;
    totals.grossMilitaryU += d.military.native;
    totals.waivedMilitaryU += waiver;
    totals.fortU += d.fort.flat;
    totals.courtU += d.court.opening * 120;
    assert(d.openingU + netLow >= 0, `${d.id}: opening cash failure even before virtual receipts`);
  }
  return {
    realmId: d.id,
    name: d.name,
    type: d.type,
    accountingStatus: d.standard
      ? 'ORDINARY_ACTIVE_AI_CONTEXT'
      : 'EXCLUDED_FROM_ORDINARY_SETTLEMENT',
    openingGB: gb(d.openingU),
    openingRP: d.openingRP,
    provinceGB: gb(d.cash.province),
    lawGB: gb(d.cash.law),
    guildGB: gb(d.cash.guild),
    templeGB: gb(d.cash.temple),
    portsGB: gb(d.cash.ports),
    fixedIncomeGB: gb(fixedIncome),
    conditionalVirtualMaximumGB: gb(d.cash.virtual),
    virtualEligibility: d.cash.virtual
      ? 'NAMED_QUALIFIED_RULER_OR_AUTHORIZED_LIEUTENANT_NOT_YET_CERTIFIED'
      : 'NO_OPENING_VIRTUAL_CASH',
    grossNativePayrollGB: gb(d.military.native),
    npcPayrollExceptionGB: d.standard ? gb(waiver) : '',
    flatFortGB: gb(d.fort.flat),
    courtOneGB: d.court.opening,
    selectedExpenseGB: d.standard ? gb(expense) : '',
    netWithoutVirtualGB: d.standard ? gb(netLow) : '',
    netIfVirtualEligibleGB: d.standard ? gb(netHigh) : '',
    closingWithoutVirtualGB: d.standard ? gb(d.openingU + netLow) : '',
    closingIfVirtualEligibleGB: d.standard ? gb(d.openingU + netHigh) : '',
    hdExpectedNetGB: d.hd.net,
    qualification:
      'Cash-only repricing; no RP income, Alchemy, unrecorded salaries, infrastructure or subsidies invented',
  };
});
const rp = study.rpEnvelopes
  .filter((r) => r.package === 'B35_S_EQUALS_A_HYPOTHESIS')
  .map((r) => {
    const d = study.domains.find((x) => x.id === r.realmId);
    const upper = Math.min(r.nativeA, r.screenedPotentialRP);
    assert.equal(upper, r.collectionUpper);
    return {
      realmId: r.realmId,
      regentId: r.regentId,
      name: r.name,
      defaultRuler: d.regentId === r.regentId,
      preservedA: r.nativeA,
      preservedOpeningRP: r.startingRP,
      collectionLowerRP: 0,
      provisionalCollectionUpperRP: upper,
      nextGrowthCostRP: r.nativeA > 0 ? r.nativeA + 1 : '',
      openingStockExceedsGrowthPrice: r.nativeA > 0 && r.startingRP > r.nativeA + 1,
      sacrificeOnePointRP: r.nativeA > 0 ? r.nativeA : '',
      storageCap: 'NONE',
      status: 'V01_CANDIDATE_ONLY; UNKNOWN_RANKS_AND_PROVISIONAL_CASTER_SCREEN; NOT_ACTUAL_RP',
    };
  });
assert.equal(rp.length, 80);
const selectedExpense =
  totals.grossMilitaryU - totals.waivedMilitaryU + totals.fortU + totals.courtU;
const summary = {
  purpose: 'Targeted finalization, not a rerun or replacement of the completed economic study',
  input: path.relative(root, input).replaceAll('\\', '/'),
  inputSha256: createHash('sha256').update(bytes).digest('hex'),
  scriptSha256: createHash('sha256')
    .update(fs.readFileSync(fileURLToPath(import.meta.url)))
    .digest('hex'),
  policies: {
    V03: 'A',
    V04: 'B',
    V09: 'C; eligibility conditional',
    V13: 'B; original AI context',
    V14: 'UNLIMITED',
    V01: 'UNAPPROVED S=A candidate',
  },
  coverage: study.coverage,
  activeTotalsGB: Object.fromEntries([
    ...Object.entries(totals).map(([k, u]) => [k.replace(/U$/, ''), gb(u)]),
    ['selectedExpense', gb(selectedExpense)],
    ['netWithoutVirtual', gb(totals.fixedIncomeU - selectedExpense)],
    [
      'netIfAllVirtualEligible',
      gb(totals.fixedIncomeU + totals.conditionalVirtualU - selectedExpense),
    ],
  ]),
  deficitsEvenIfVirtualEligible: rows
    .filter(
      (r) =>
        r.accountingStatus === 'ORDINARY_ACTIVE_AI_CONTEXT' &&
        r.netIfVirtualEligibleGB.startsWith('-'),
    )
    .map((r) => ({ realmId: r.realmId, name: r.name, netGB: r.netIfVirtualEligibleGB })),
  openingStockExceedsGrowthPriceDefaults: rp.filter(
    (r) => r.defaultRuler && r.openingStockExceedsGrowthPrice,
  ).length,
  limitations: [
    'All 51 rows retained; Mieres and Chaos ordinary settlement outputs deliberately blank.',
    'Virtual eligibility is not inferred from a class label or invented lieutenant appointment.',
    'RP bounds retain the old provisional caster screen; unknown ranks are not set to zero.',
    'Opening stock exceeding growth price is not a two-boundary eligibility determination.',
    'Original study and its historical cap sensitivities remain unchanged; no application code is imported.',
  ],
};
fs.writeFileSync(path.join(out, 'v1-approved-costs.csv'), csv(rows));
fs.writeFileSync(path.join(out, 'v1-bloodline-candidate.csv'), csv(rp));
fs.writeFileSync(
  path.join(out, 'v1-finalization-summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      domains: rows.length,
      candidates: rp.length,
      activeTotalsGB: summary.activeTotalsGB,
      unresolvedDeficits: summary.deficitsEvenIfVirtualEligible,
    },
    null,
    2,
  ),
);
