/** Bounded release reconciliation: affected queries only, using the existing forecast API.
 * Increment 3's original 51-domain report remains a frozen 1.0.0 baseline. */
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
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const json = (x) =>
  JSON.stringify(x, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2) + '\n';
try {
  if (read('packages/world-data/anuire-characters15.json').version !== '1.1.0')
    throw new Error(
      'Character finalization baseline is frozen at1.1.0; use report-spider-completion15.mjs.',
    );
  const core = await server.ssrLoadModule('/packages/core/index.ts');
  const world = await server.ssrLoadModule('/packages/world-data/index.ts');
  const baseline = read('docs/rules/validation/increment3-economy.json');
  for (const [path, expected] of Object.entries(baseline.inputs))
    assert.equal(createHash('sha256').update(fs.readFileSync(path)).digest('hex'), expected, path);
  const preservation = read('docs/rules/validation/character-release-preservation.json');
  const authored = read('packages/world-data/anuire-characters15.json');
  for (const [id, expected] of Object.entries(preservation.records))
    assert.equal(
      createHash('sha256')
        .update(JSON.stringify(authored.records.find((r) => r.id === id)))
        .digest('hex'),
      expected,
      `Unchanged ordinary sheet ${id}`,
    );
  const inputs = ['anuire', 'economy', 'magic', 'strategy'].map((n) =>
    read(`reference/extracted/anuire/${n}.research.json`),
  );
  const scenario = await world.loadAnuireScenario(...inputs);
  assert.equal(scenario.fingerprint, baseline.scenarioFingerprint);
  const overlays = world.buildAnuireCharacterOverlays35(scenario, inputs[0], inputs[2]);
  const references = core.references35(overlays);
  const state = core.createBirthright15Foundation(scenario, 'anuire-realm-04', {
    selectionMode: 'UNRESTRICTED',
    overlays: references,
  });
  const before = core.serializeCampaign(state);
  const gb = (units) => {
    const r = core.goldInGB(core.goldUnits(BigInt(units)));
    return r.denominator === 1n ? String(r.numerator) : `${r.numerator}/${r.denominator}`;
  };
  const pack = (f) => ({
    virtualGB: gb(f.income.virtualGuild),
    conditionalGB: gb(f.conditional.virtualGuild),
    qualifiedHandlerIds: f.conditional.handlerIds,
    netGB: gb(f.result.netOperating),
    closingGB: gb(f.result.projectedClosing),
    expenseGB: gb(f.expenses.payable),
  });
  let virtualDelta = 0n;
  const rows = [9, 14, 17, 26, 29].map((id) => {
    const realmId = `anuire-realm-${String(id).padStart(2, '0')}`;
    const old = baseline.forecasts.find((f) => f.realmId === realmId);
    const current = core.economicForecast15(state, scenario, realmId, { overlays });
    for (const key of Object.keys(current.income).filter(
      (k) => !['virtualGuild', 'ordinary'].includes(k),
    ))
      assert.equal(
        String(current.income[key]),
        String(old.income[key]),
        `${realmId}: unchanged ${key}`,
      );
    assert.deepEqual(
      JSON.parse(json(current.expenses)),
      old.expenses,
      `${realmId}: expenses unchanged`,
    );
    const delta = current.income.virtualGuild - BigInt(old.income.virtualGuild);
    assert.equal(
      current.income.ordinary - BigInt(old.income.ordinary),
      delta,
      'Only virtual income changes',
    );
    virtualDelta += delta;
    return {
      realmId,
      name: scenario.realms.find((r) => r.id === realmId).name,
      before: pack(old),
      after: pack(current),
      virtualDeltaGB: gb(delta),
      forecast: current,
    };
  });
  const controls = [26, 29].map((id) => {
    const realmId = `anuire-realm-${id}`,
      copy = structuredClone(state);
    copy.playerRealm = realmId;
    copy.realms.find((r) => r.id === realmId).controller = 'player';
    return {
      realmId,
      playerControlled: pack(core.economicForecast15(copy, scenario, realmId, { overlays })),
    };
  });
  assert.equal(core.serializeCampaign(state), before, 'No forecast mutation or RNG consumption');
  const ratioUnits = (s) => {
    const [n, d = '1'] = s.split('/');
    return core.goldFromGBRatio(BigInt(n), BigInt(d));
  };
  const totals = { ...baseline.totalsGB };
  // These are algebraic updates to the preserved totals, not a rerun of all domains.
  for (const key of ['certifiedVirtual', 'netWithCertifiedVirtual'])
    totals[key] = gb(ratioUnits(totals[key]) + virtualDelta);
  if ('withheldVirtual' in totals)
    totals.withheldVirtual = gb(ratioUnits(totals.withheldVirtual) - virtualDelta);
  const report = {
    format: 'birthright15-character-finalization-forecast-delta',
    version: 1,
    moneyScale: '120',
    baseline: 'docs/rules/validation/increment3-economy.json',
    baselineReferences: baseline.characterOverlays,
    currentReferences: references,
    scenarioFingerprint: scenario.fingerprint,
    preservedInputs: baseline.inputs,
    scope:
      'Chimaeron, Endier (approved but unappointed Caine), Gorgon, Rhuobhe and Spiderfell (explicit virtual handler exception). Other baseline rows carried forward without a fresh audit.',
    virtualDeltaGB: gb(virtualDelta),
    baselineTotalsGB: baseline.totalsGB,
    algebraicallyUpdatedTotalsGB: totals,
    rows,
    controlledAlternatives: controls,
  };
  fs.writeFileSync('docs/rules/validation/character-finalization-economy.json', json(report));
  console.log(
    json({
      virtualDeltaGB: report.virtualDeltaGB,
      rows: rows.map(({ forecast, ...r }) => r),
      controlledAlternatives: controls,
      totals,
    }),
  );
} finally {
  await server.close();
}
