/** Increment 4 acceptance: existing recovered inputs and approved overlays only.
 * No extraction, allocation authoring, seasonal execution, gameplay/save writes or AI. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const hash = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const json = (value) =>
  JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2) + '\n';
const csv = (rows) => {
  const keys = Object.keys(rows[0]),
    cell = (x) => {
      const s = String(x ?? '');
      return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
    };
  return (
    [keys, ...rows.map((r) => keys.map((k) => r[k]))].map((r) => r.map(cell).join(',')).join('\n') +
    '\n'
  );
};
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const core = await server.ssrLoadModule('/packages/core/index.ts'),
    world = await server.ssrLoadModule('/packages/world-data/index.ts');
  if (read('packages/world-data/anuire-characters15.json').version !== '1.1.0')
    throw new Error(
      'Increment4 baseline is frozen at1.1.0; use report-spider-completion15.mjs for the affected Spider forecast.',
    );
  const original = read('docs/rules/validation/increment3-economy.json'),
    finalization = read('docs/rules/validation/character-finalization-economy.json');
  for (const [p, expected] of Object.entries(original.inputs))
    assert.equal(hash(p), expected, `Preserved original ${p}`);
  const characterFile = 'packages/world-data/anuire-characters15.json',
    characterHash = hash(characterFile);
  const inputs = ['anuire', 'economy', 'magic', 'strategy'].map((n) =>
    read(`reference/extracted/anuire/${n}.research.json`),
  );
  const scenario = await world.loadAnuireScenario(...inputs),
    overlays = world.buildAnuireCharacterOverlays35(scenario, inputs[0], inputs[2]),
    refs = core.references35(overlays);
  assert.deepEqual(refs, read('docs/rules/BIRTHRIGHT_15_CHARACTER_COVERAGE.json').references);
  assert.deepEqual(refs, finalization.currentReferences, 'Character release must remain unchanged');
  assert.equal(scenario.fingerprint, original.scenarioFingerprint);
  const foundation = core.createBirthright15Foundation(scenario, 'anuire-realm-04', {
    selectionMode: 'UNRESTRICTED',
    overlays: refs,
  });
  const state = core.initializeRegency15(foundation, scenario),
    snapshot = core.serializeCampaign(state);
  const forecasts = core.economicForecasts15(state, scenario, { overlays }),
    ordinary = forecasts.filter((f) => f.accounting === 'ordinary');
  assert.equal(ordinary.length, 49);
  assert.equal(state.regency15.state.bloodlines.length, 116);
  const gb = (x) => {
    const r = core.goldInGB(core.goldUnits(x));
    return r.denominator === 1n ? String(r.numerator) : `${r.numerator}/${r.denominator}`;
  };
  const describe = (f) => {
    const r = f.regency,
      q = r.quote,
      p = r.payroll;
    // A labeled funding scenario: only preserved stock + certified new RP, with no
    // assumed skill income for Spider and no repeatable grant of the opening reserve.
    const lower = r.resources.availableForNewObligations + (q.collectibleRP ?? 0n);
    const cover = p.regularPayable < lower * 24n ? p.regularPayable : lower * 24n,
      cost = (5n * cover + 119n) / 120n;
    return {
      realmId: f.realmId,
      name: scenario.realms.find((d) => d.id === f.realmId).name,
      characterId: q.characterId,
      status: q.status,
      reason: q.reason,
      originalA: q.originalScore,
      currentS: q.currentScore,
      openingRP: q.openingRP,
      qualifiedBeforeCap: q.qualifiedRP,
      seasonalRP: q.collectibleRP,
      conditionalUpperRP: q.conditionalUpperRP,
      certifiedNewRP: q.collectibleRP ?? 0n,
      unknownNewRP: q.collectibleRP === null,
      categoryQuotes: q.categories,
      reservedRP: r.resources.reserved,
      committedRP: r.resources.committed,
      knownPledges: r.knownPledges,
      growth: r.growth,
      grossNativePayrollGB: gb(f.expenses.militaryGross),
      waivedPayrollGB: gb(f.expenses.npcPayrollWaiver),
      payablePayrollGB: gb(f.expenses.militaryPayable),
      eligibleRegularPayrollGB: gb(p.regularPayable),
      allRegularRPCost: p.maximumAllRegularRPCost,
      hypotheticalOpeningBankPlusCertifiedCollection: {
        knownAvailableRP: lower,
        payrollCoveredGB: gb(cover),
        rpCost: cost,
        remainingRP: lower - cost,
        projectedCashNetGB: gb(f.result.netOperating + cover),
        note: 'Optional explicit RP allocation; reduces regular payroll only, creates no spendable GB; opening bank is finite, unknown RP remains unknown.',
      },
      originalAllGBNet: gb(f.result.netOperating),
      actualRPReceipts: r.actualReceipt,
    };
  };
  const rows = ordinary.map(describe);
  const mismatches = [];
  for (const f of ordinary) {
    const before = original.forecasts.find((r) => r.realmId === f.realmId),
      changed = finalization.rows.find((r) => r.realmId === f.realmId);
    for (const stream of ['province', 'law', 'guild', 'temple', 'ports', 'contracted'])
      if (String(f.income[stream]) !== before.income[stream])
        mismatches.push(`${f.realmId}/${stream}`);
    const expectedVirtual = changed
      ? changed.after.virtualGB
      : gb(BigInt(before.income.virtualGuild));
    if (gb(f.income.virtualGuild) !== expectedVirtual) mismatches.push(`${f.realmId}/virtual`);
    assert.deepEqual(
      JSON.parse(json(f.expenses)),
      before.expenses,
      `${f.realmId}: original costs/formulas unchanged`,
    );
  }
  assert.deepEqual(mismatches, [], 'Increment 3/finalization cash remains unchanged');
  const controlled = [26, 29].map((n) => {
    const realmId = `anuire-realm-${n}`,
      s = core.createBirthright15Foundation(scenario, realmId, {
        selectionMode: 'UNRESTRICTED',
        overlays: refs,
      });
    return {
      ...describe(core.economicForecast15(s, scenario, realmId, { overlays })),
      context: 'player-controlled; original NPC-only waiver removed',
    };
  });
  const caine = core.createBirthright15Foundation(scenario, 'anuire-realm-14', {
    selectionMode: 'UNRESTRICTED',
    regentId: 'anuire-regent-028',
    overlays: refs,
  });
  const alternatives = [
    {
      ...describe(core.economicForecast15(caine, scenario, 'anuire-realm-14', { overlays })),
      context: 'Caine actually selected as ruler; no candidate/lieutenant RP substitution',
    },
  ];
  const sum = (xs) => xs.reduce((a, b) => a + b, 0n);
  const summary = {
    format: 'birthright15-increment4-regency-validation',
    version: 1,
    scenarioFingerprint: scenario.fingerprint,
    overlays: refs,
    inputs: original.inputs,
    characterContentSha256: characterHash,
    scope:
      '49 ordinary default domains; two player-control comparisons; Caine/Endier alternative. Read-only quotes, not actual collections.',
    coverage: {
      records: 116,
      ordinary: rows.length,
      knownQuotes: rows.filter((r) => !r.unknownNewRP).length,
      unknown: rows
        .filter((r) => r.unknownNewRP)
        .map((r) => ({
          realmId: r.realmId,
          characterId: r.characterId,
          reason: r.reason,
          conditionalUpperRP: r.conditionalUpperRP,
        })),
    },
    totals: {
      openingStoredRP: sum(rows.map((r) => r.openingRP)),
      certifiedSeasonalRP: sum(rows.map((r) => r.certifiedNewRP)),
      knownQualifiedBeforeCap: sum(rows.map((r) => r.qualifiedBeforeCap ?? 0n)),
      conditionalUpperRP: sum(rows.map((r) => r.conditionalUpperRP)),
      eligibleRegularPayrollGB: gb(sum(ordinary.map((f) => f.regency.payroll.regularPayable))),
      hypotheticalRPSpentOnOpeningRegularPayroll: sum(
        rows.map((r) => r.hypotheticalOpeningBankPlusCertifiedCollection.rpCost),
      ),
    },
    cashReferenceMismatches: mismatches,
    rows,
    controlledAlternatives: controlled,
    alternativeRulers: alternatives,
  };
  fs.writeFileSync('docs/rules/validation/increment4-regency.json', json(summary));
  fs.writeFileSync(
    'docs/rules/validation/increment4-regency.csv',
    csv(
      rows.map((r) => ({
        realmId: r.realmId,
        name: r.name,
        characterId: r.characterId,
        status: r.status,
        reason: r.reason,
        originalA: r.originalA,
        currentS: r.currentS,
        openingRP: r.openingRP,
        ...Object.fromEntries(
          r.categoryQuotes.flatMap((c) => [
            [`${c.kind}Levels`, c.levels],
            [`${c.kind}Rating`, c.rating],
            [`${c.kind}Percent`, c.percent],
            [`${c.kind}Eligible`, c.eligible],
          ]),
        ),
        qualifiedBeforeCap: r.qualifiedBeforeCap,
        seasonalRP: r.seasonalRP,
        unknownNewRP: r.unknownNewRP,
        conditionalUpperRP: r.conditionalUpperRP,
        eligibleRegularPayrollGB: r.eligibleRegularPayrollGB,
        allRegularRPCost: r.allRegularRPCost,
        hypotheticalRPCoveredPayrollGB:
          r.hypotheticalOpeningBankPlusCertifiedCollection.payrollCoveredGB,
        hypotheticalPayrollRPCost: r.hypotheticalOpeningBankPlusCertifiedCollection.rpCost,
        originalAllGBNet: r.originalAllGBNet,
        hypotheticalCashNetGB: r.hypotheticalOpeningBankPlusCertifiedCollection.projectedCashNetGB,
      })),
    ),
  );
  assert.equal(
    core.serializeCampaign(state),
    snapshot,
    'Reports do not collect, spend, qualify growth or consume RNG',
  );
  assert.equal(hash(characterFile), characterHash, 'Character allocations/fingerprints unchanged');
  console.log(
    json({
      coverage: summary.coverage,
      totals: summary.totals,
      cashReferenceMismatches: mismatches,
      controlled: controlled.map((r) => ({
        realmId: r.realmId,
        seasonalRP: r.seasonalRP,
        payroll: r.hypotheticalOpeningBankPlusCertifiedCollection,
      })),
      alternative: alternatives.map((r) => ({
        characterId: r.characterId,
        seasonalRP: r.seasonalRP,
      })),
    }),
  );
} finally {
  await server.close();
}
