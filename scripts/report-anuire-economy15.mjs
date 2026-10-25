/** Increment 3 acceptance report. Reuses retained inputs; never extracts records,
 * regenerates character content, settles turns or writes campaign/save data. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const hash = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const parseCSV = (text) => {
  const parse = (line) => {
    const cells = [];
    let cell = '',
      quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if (c === ',' && !quoted) {
        cells.push(cell);
        cell = '';
      } else cell += c;
    }
    cells.push(cell);
    return cells;
  };
  const [header, ...rows] = text.trim().split(/\r?\n/).map(parse);
  return rows.map((row) => Object.fromEntries(header.map((h, i) => [h, row[i]])));
};
const csv = (rows) => {
  const keys = Object.keys(rows[0]);
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return (
    [keys, ...rows.map((r) => keys.map((k) => r[k]))]
      .map((row) => row.map(cell).join(','))
      .join('\n') + '\n'
  );
};
try {
  const core = await server.ssrLoadModule('/packages/core/index.ts');
  const world = await server.ssrLoadModule('/packages/world-data/index.ts');
  const study = JSON.parse(
    fs.readFileSync(
      'reference/research-cache/birthright15/anuire-validation/calculation.json',
      'utf8',
    ),
  );
  const baseline = Object.fromEntries(
    Object.entries(study.inputs).filter(([p]) => p.startsWith('reference/')),
  );
  for (const [p, expected] of Object.entries(baseline))
    assert.equal(hash(p), expected, `Preserved original input ${p}`);
  const characterCoverage = JSON.parse(
    fs.readFileSync('docs/rules/BIRTHRIGHT_15_CHARACTER_COVERAGE.json', 'utf8'),
  );
  if (characterCoverage.version !== '1.0.0')
    throw new Error(
      'Increment 3 is a frozen overlay-1.0.0 baseline. Use report-anuire-character-finalization.mjs for the affected release forecasts.',
    );
  const inputs = ['anuire', 'economy', 'magic', 'strategy'].map((n) =>
    JSON.parse(fs.readFileSync(`reference/extracted/anuire/${n}.research.json`, 'utf8')),
  );
  const scenario = await world.loadAnuireScenario(...inputs);
  // Build the existing immutable content from retained choices; no authoring/generation.
  const overlays = world.buildAnuireCharacterOverlays35(scenario, inputs[0], inputs[2]);
  const refs = core.references35(overlays);
  assert.deepEqual(refs, characterCoverage.references, 'Increment 2 fingerprints unchanged');
  const characterFile = 'packages/world-data/anuire-characters15.json',
    characterHash = hash(characterFile);
  const state = core.createBirthright15Foundation(scenario, 'anuire-realm-04', {
    selectionMode: 'UNRESTRICTED',
    overlays: refs,
  });
  // Avanil has no NPC payroll exception. All other domains retain original NPC control;
  // this exactly matches the existing study for all six exception candidates.
  const snapshot = core.serializeCampaign(state),
    forecasts = core.economicForecasts15(state, scenario, { overlays });
  assert.equal(core.serializeCampaign(state), snapshot, 'Read-only forecast purity');
  const reference = parseCSV(
    fs.readFileSync('docs/rules/validation/v1-approved-costs.csv', 'utf8'),
  );
  const expectedGB = (s) => {
    const [n, d = '1'] = s.split('/');
    return core.goldFromGBRatio(BigInt(n), BigInt(d));
  };
  const exactGB = (units) => {
    const ratio = core.goldInGB(core.goldUnits(units));
    return ratio.denominator === 1n
      ? String(ratio.numerator)
      : `${ratio.numerator}/${ratio.denominator}`;
  };
  const sum = (values) => values.reduce((n, x) => n + x, 0n),
    mismatches = [];
  for (const f of forecasts) {
    const r = reference.find((r) => r.realmId === f.realmId);
    assert(r);
    const pairs = [
      ...['province', 'law', 'guild', 'temple'].map((k) => [f.income[k], r[`${k}GB`], k]),
      [f.income.ports, r.portsGB, 'ports'],
      [f.conditional.virtualMaximum, r.conditionalVirtualMaximumGB, 'virtual-maximum'],
      [f.expenses.militaryGross, r.grossNativePayrollGB, 'gross-payroll'],
      [f.expenses.forts, r.flatFortGB, 'forts'],
      [f.expenses.court, r.courtOneGB, 'court'],
    ];
    if (f.accounting === 'ordinary')
      pairs.push(
        [f.expenses.npcPayrollWaiver, r.npcPayrollExceptionGB, 'NPC-waiver'],
        [f.expenses.payable, r.selectedExpenseGB, 'expense'],
        [
          f.result.netOperating - f.income.virtualGuild,
          r.netWithoutVirtualGB,
          'net-without-virtual',
        ],
      );
    for (const [actual, expected, component] of pairs)
      if (actual !== expectedGB(expected))
        mismatches.push({ realmId: f.realmId, component, actual: exactGB(actual), expected });
  }
  assert.equal(mismatches.length, 0, JSON.stringify(mismatches));
  const ordinary = forecasts.filter((f) => f.accounting === 'ordinary');
  assert.equal(ordinary.length, 49);
  const fixed = sum(ordinary.map((f) => f.income.ordinary - f.income.virtualGuild)),
    virtual = sum(ordinary.map((f) => f.income.virtualGuild)),
    conditional = sum(ordinary.map((f) => f.conditional.virtualGuild)),
    expense = sum(ordinary.map((f) => f.expenses.payable));
  const totals = {
    fixedProduction: fixed,
    certifiedVirtual: virtual,
    withheldVirtual: conditional,
    virtualUpperBound: virtual + conditional,
    grossPayroll: sum(ordinary.map((f) => f.expenses.militaryGross)),
    npcWaiver: sum(ordinary.map((f) => f.expenses.npcPayrollWaiver)),
    payablePayroll: sum(ordinary.map((f) => f.expenses.militaryPayable)),
    forts: sum(ordinary.map((f) => f.expenses.forts)),
    courts: sum(ordinary.map((f) => f.expenses.court)),
    expenses: expense,
    grossExpenses: sum(ordinary.map((f) => f.expenses.gross)),
    netWithoutVirtual: fixed - expense,
    netWithCertifiedVirtual: fixed + virtual - expense,
    netIfAllConditionalQualify: fixed + virtual + conditional - expense,
  };
  const controls = ['anuire-realm-26', 'anuire-realm-29'].map((id) => {
    const npc = forecasts.find((f) => f.realmId === id),
      copy = structuredClone(state);
    copy.playerRealm = id;
    copy.realms.find((r) => r.id === id).controller = 'player';
    const controlled = core.economicForecast15(copy, scenario, id, { overlays });
    return {
      realmId: id,
      npcNet: npc.result.netOperating,
      controlledNet: controlled.result.netOperating,
      conditionalVirtual: npc.conditional.virtualGuild,
      npcWaiver: npc.expenses.npcPayrollWaiver,
      controlledWaiver: controlled.expenses.npcPayrollWaiver,
    };
  });
  const rows = forecasts.map((f) => ({
    realmId: f.realmId,
    name: scenario.realms.find((r) => r.id === f.realmId).name,
    accounting: f.accounting,
    openingGB: exactGB(f.openingTreasury),
    provinceGB: exactGB(f.income.province),
    lawGB: exactGB(f.income.law),
    guildGB: exactGB(f.income.guild),
    templeGB: exactGB(f.income.temple),
    portsGB: exactGB(f.income.ports),
    certifiedVirtualGB: exactGB(f.income.virtualGuild),
    conditionalVirtualGB: exactGB(f.conditional.virtualGuild),
    qualifiedHandlerIds: f.conditional.handlerIds.join('|'),
    grossPayrollGB: exactGB(f.expenses.militaryGross),
    npcWaiverGB: exactGB(f.expenses.npcPayrollWaiver),
    payablePayrollGB: exactGB(f.expenses.militaryPayable),
    fortGB: exactGB(f.expenses.forts),
    courtGB: exactGB(f.expenses.court),
    payableExpenseGB: f.result ? exactGB(f.expenses.payable) : '',
    grossExpenseGB: f.result ? exactGB(f.expenses.gross) : '',
    netGB: f.result ? exactGB(f.result.netOperating) : '',
    closingGB: f.result ? exactGB(f.result.projectedClosing) : '',
    unfundedGB: f.result ? exactGB(f.result.unfundedObligations) : '',
    unpricedSources: f.conditional.unpricedSourceIds.join('|'),
  }));
  const json = (value) =>
    JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2) + '\n';
  const summary = {
    format: 'birthright15-increment3-validation',
    version: 1,
    moneyScale: '120',
    scenarioFingerprint: scenario.fingerprint,
    characterOverlays: refs,
    characterContentFileSha256: characterHash,
    inputs: baseline,
    referenceLedgerSha256: hash('docs/rules/validation/v1-approved-costs.csv'),
    coverage: {
      all: forecasts.length,
      ordinary: ordinary.length,
      excluded: forecasts
        .filter((f) => f.accounting !== 'ordinary')
        .map((f) => ({ realmId: f.realmId, accounting: f.accounting })),
    },
    totalsGB: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, exactGB(v)])),
    perDomainReferenceMismatches: mismatches,
    controlledAlternatives: controls,
    forecasts,
  };
  fs.writeFileSync('docs/rules/validation/increment3-economy.json', json(summary));
  fs.writeFileSync('docs/rules/validation/increment3-domains.csv', csv(rows));
  assert.equal(hash(characterFile), characterHash, 'Character content untouched');
  console.log(
    JSON.stringify(
      {
        coverage: summary.coverage,
        totalsGB: summary.totalsGB,
        mismatches: mismatches.length,
        characterOverlays: refs,
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
