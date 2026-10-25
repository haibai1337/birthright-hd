/** Spider-only release reconciliation. Reuses the existing adapter/forecasts; no turns/saves. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const json = (x) =>
  JSON.stringify(x, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2) + '\n';
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const core = await server.ssrLoadModule('/packages/core/index.ts'),
    world = await server.ssrLoadModule('/packages/world-data/index.ts');
  const baseline = read('docs/rules/validation/increment4-regency.json'),
    old = read('reference/research-cache/birthright15/character-release-1.1.0/overlays.json');
  const authored = read('packages/world-data/anuire-characters15.json');
  assert.equal(authored.version, '1.2.0', 'Spider report requires its exact accepted release');
  const preservation = read('docs/rules/validation/spider-completion-preservation.json');
  const preservedAuthored = Object.entries(preservation.records);
  assert.equal(preservedAuthored.length, 115, 'Every other original character remains covered');
  for (const [id, hash] of preservedAuthored) {
    const record = authored.records.find((r) => r.id === id);
    assert.ok(record, `Preserved authored ${id}`);
    assert.equal(
      createHash('sha256').update(JSON.stringify(record)).digest('hex'),
      hash,
      `Preserved authored ${id}`,
    );
  }
  for (const [path, hash] of Object.entries(baseline.inputs))
    assert.equal(createHash('sha256').update(fs.readFileSync(path)).digest('hex'), hash, path);
  const inputs = ['anuire', 'economy', 'magic', 'strategy'].map((n) =>
    read(`reference/extracted/anuire/${n}.research.json`),
  );
  const scenario = await world.loadAnuireScenario(...inputs),
    bundle = world.buildAnuireCharacterOverlays35(scenario, inputs[0], inputs[2]);
  const current = core.character35(bundle.characters, 'anuire-regent-057');
  assert.deepEqual(
    current.original,
    core.character35(old.characters, current.id).original,
    'All Spider archival fields unchanged',
  );
  for (const record of old.characters.records.filter((r) => r.id !== current.id))
    assert.deepEqual(
      core.character35(bundle.characters, record.id),
      record,
      `Preserved compiled ${record.id}`,
    );
  assert.deepEqual(
    bundle.handlers.records,
    old.handlers.records,
    'Actual handler permissions unchanged',
  );
  const state = core.createBirthright15Foundation(scenario, 'anuire-realm-04', {
      selectionMode: 'UNRESTRICTED',
      overlays: core.references35(bundle),
    }),
    before = core.serializeCampaign(state);
  const npc = core.economicForecast15(state, scenario, 'anuire-realm-29', { overlays: bundle });
  const player = core.createBirthright15Foundation(scenario, 'anuire-realm-29', {
    selectionMode: 'UNRESTRICTED',
    overlays: core.references35(bundle),
  });
  const controlled = core.economicForecast15(player, scenario, 'anuire-realm-29', {
    overlays: bundle,
  });
  const previous = baseline.rows.find((r) => r.realmId === 'anuire-realm-29');
  assert.equal(npc.result.netOperating, core.goldFromGB(3n));
  assert.equal(controlled.result.netOperating, core.goldFromGB(2n));
  assert.equal(npc.income.virtualGuild, 0n);
  assert.equal(npc.regency.quote.collectibleRP, 5n);
  assert.equal(core.serializeCampaign(state), before, 'No receipts or state changes from reports');
  const updated = {
    certifiedSeasonalRP:
      BigInt(baseline.totals.certifiedSeasonalRP) + npc.regency.quote.collectibleRP,
    knownQuotes: baseline.coverage.knownQuotes + 1,
    unknownQuotes: 0,
    note: 'Algebraic update of the frozen Increment4 baseline; only Spiderfell forecasts rerun.',
  };
  const report = {
    format: 'birthright15-spider-completion-validation',
    version: 1,
    inputs: baseline.inputs,
    scenarioFingerprint: scenario.fingerprint,
    previousOverlays: core.references35(old),
    currentOverlays: core.references35(bundle),
    preservedAuthoredRecords: preservedAuthored.length,
    preservedCompiledRecords: old.characters.records.length - 1,
    activeBloodline: current.bloodline,
    rawBloodline: current.original.bloodline,
    derived: core.deriveSpider35(current.exceptionalProfile.monsterSheet),
    ranks: core.skillRanks35(current),
    ratingQuotes: Object.fromEntries(
      ['province', 'law', 'guild', 'temple', 'source'].map((k) => [
        k,
        { rating: core.rating35(current, k), eligibility: core.eligibleRating35(current, k) },
      ]),
    ),
    administrate: core.skillCheck35(current, 'administrate'),
    spells: current.sierraSpellEntitlement,
    oldRPQuote: {
      status: previous.status,
      qualifiedRP: previous.qualifiedBeforeCap,
      collectionRP: previous.seasonalRP,
      upperBound: previous.conditionalUpperRP,
    },
    newNPCForecast: npc,
    newPlayerForecast: controlled,
    algebraicallyUpdatedAnuireTotals: updated,
  };
  fs.writeFileSync('docs/rules/validation/spider-completion.json', json(report));
  console.log(
    json({
      references: report.currentOverlays,
      attacks: report.derived.combat.naturalAttacks.map((a) => a.attack),
      HP: report.derived.hp,
      skillBudget: report.derived.skillPointBudget,
      ratings: Object.fromEntries(
        Object.entries(report.ratingQuotes).map(([k, v]) => [k, v.rating.raw]),
      ),
      actualOpeningRP: npc.regency.quote.collectibleRP,
      updated,
    }),
  );
} finally {
  await server.close();
}
