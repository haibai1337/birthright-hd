/** Increment5 validation only: actual Anuire quotes, no turns, extraction, authoring or save writes. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const fileHash = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const json = (v) =>
  JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? x.toString() : x), 2) + '\n';
const frozen = [
  'docs/rules/validation/increment3-economy.json',
  'docs/rules/validation/character-finalization-economy.json',
  'docs/rules/validation/increment4-regency.json',
  'docs/rules/validation/spider-completion.json',
];
const frozenHashes = Object.fromEntries(frozen.map((p) => [p, fileHash(p)]));
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const c = await server.ssrLoadModule('/packages/core/index.ts'),
    w = await server.ssrLoadModule('/packages/world-data/index.ts');
  const previous = read('docs/rules/validation/spider-completion.json');
  for (const [p, expected] of Object.entries(previous.inputs))
    assert.equal(fileHash(p), expected, p);
  const inputs = ['anuire', 'economy', 'magic', 'strategy'].map((n) =>
    read(`reference/extracted/anuire/${n}.research.json`),
  );
  const scenario = await w.loadAnuireScenario(...inputs),
    bundle = w.buildAnuireCharacterOverlays35(scenario, inputs[0], inputs[2]);
  assert.deepEqual(c.references35(bundle), previous.currentOverlays);
  const files = [
    'packages/world-data/anuire-characters15.json',
    'reference/extracted/anuire/birthright15.characters.json',
  ];
  const hashes = Object.fromEntries(files.map((p) => [p, fileHash(p)]));
  const foundation = c.createBirthright15Foundation(scenario, 'anuire-realm-14', {
    selectionMode: 'UNRESTRICTED',
    overlays: c.references35(bundle),
  });
  const pristine = c.serializeCampaign(foundation);
  // A named, explicit headless checkpoint. No Council/settlement is falsely executed or skipped by a command.
  let state = structuredClone(foundation);
  state.seasonFlow = { phase: 'actions', transitionId: 'increment5-validation-checkpoint' };
  state = c.initializeCourtActions15(c.initializeRegency15(state, scenario), scenario, bundle);
  const ordinary = scenario.realms.filter(
    (r) =>
      ['territorial', 'holding'].includes(r.domainType) &&
      state.realms.find((x) => x.id === r.id).controller !== 'passive',
  );
  const rp = c
    .regencyCollectionQuotes15(foundation, scenario, bundle)
    .filter((q) => ordinary.some((r) => r.id === q.realmId));
  assert.equal(rp.length, 49);
  assert.ok(rp.every((q) => q.collectibleRP !== null));
  assert.equal(
    rp.reduce((n, q) => n + q.collectibleRP, 0n),
    912n,
  );
  assert.equal(rp.find((q) => q.realmId === 'anuire-realm-29').collectibleRP, 5n);
  const courts = ordinary.map((r) => ({
    realmId: r.id,
    name: r.name,
    characterId: c.rulingRegent(scenario, r.id, state).id,
    ...c.courtQuote15(state, r.id),
    ownedSeatCandidates: state.provinces.filter((p) => p.owner === r.id).map((p) => p.id),
    hostConsentRequiredSites: [
      ...new Set(
        state.holdings
          .filter(
            (h) =>
              h.realmId === r.id &&
              h.level > 0 &&
              !h.destroyed &&
              !h.contested &&
              state.provinces.find((p) => p.id === h.provinceId).owner !== r.id,
          )
          .map((h) => h.provinceId),
      ),
    ],
  }));
  assert.ok(courts.every((q) => q.paidLevel === 1 && q.extraActions === 0 && q.seat === null));
  assert.equal(state.courtActions15.state.palaces.length, 0);
  const auth = (id) => ({
    realmId: id,
    characterId: c.rulingRegent(scenario, id, state).id,
    mode: 'expert',
    kind: 'order',
    reference: 'read-only-representative-case',
  });
  const endier = state.provinces.find((p) => p.owner === 'anuire-realm-14');
  const province = c.developmentOrderQuote15(state, scenario, bundle, auth('anuire-realm-14'), {
    kind: 'rule-province',
    provinceId: endier.id,
  });
  const groups = c.economicHoldingGroups15(state.holdings);
  const eligible = groups.find(
    (g) =>
      g.realmId === 'anuire-realm-14' &&
      g.type !== 'source' &&
      g.activeLevel < 10n &&
      state.holdings
        .filter((h) => h.provinceId === g.provinceId && h.type === g.type && !h.destroyed)
        .reduce((n, h) => n + h.level, 0) <
        state.provinces.find((p) => p.id === g.provinceId).level,
  );
  const holding = eligible
    ? c.developmentOrderQuote15(state, scenario, bundle, auth('anuire-realm-14'), {
        kind: 'rule-holding',
        holdingId: eligible.records[0].id,
        bid: c.regencyPoints(0n),
      })
    : null;
  const institution = ordinary.find((r) => r.domainType === 'holding'),
    site = state.holdings.find(
      (h) => h.realmId === institution.id && h.level > 0 && !h.contested && !h.destroyed,
    );
  let deniedSeat;
  try {
    c.applyCourtAction15(state, scenario, bundle, 'unconsented-seat', {
      kind: 'seat',
      authorization: auth(institution.id),
      provinceId: site.provinceId,
    });
  } catch (e) {
    deniedSeat = e.message;
  }
  assert.ok(deniedSeat?.includes('host consent'));
  assert.equal(c.serializeCampaign(foundation), pristine);
  for (const [p, expected] of Object.entries({ ...hashes, ...frozenHashes }))
    assert.equal(fileHash(p), expected, p);
  const report = {
    format: 'birthright15-increment5-court-actions-validation',
    version: 1,
    moneyUnitsPerGB: '120',
    scenarioFingerprint: scenario.fingerprint,
    overlays: c.references35(bundle),
    inputs: previous.inputs,
    unchangedCharacterFiles: hashes,
    unchangedFinancialBaselines: frozenHashes,
    coverage: {
      originalCharacters: 116,
      unchangedCharacters: 116,
      unchangedOtherCharacters: 115,
      rhuobheUnchanged: true,
      ordinaryDomains: 49,
      knownRPQuotes: 49,
      totalRP: '912',
      openingPalaces: 0,
      inventedSeats: 0,
    },
    courts,
    rp,
    representative: {
      endierProvinceRule: province,
      endierHoldingRule: holding,
      holdingOnlySeat: {
        realmId: institution.id,
        provinceId: site.provinceId,
        hostRealmId: state.provinces.find((p) => p.id === site.provinceId).owner,
        result: deniedSeat,
      },
    },
    limits: [
      'Quotes only; no original campaign or saved game mutated.',
      'Explicit action-phase checkpoint required; general gameplay remains guarded.',
      'Realm magic/trade, politics and full Maintenance/mode workflows remain Increments6-8.',
      'The17 documented legacy fixture failures were not rerun or rewritten.',
    ],
  };
  fs.writeFileSync('docs/rules/validation/increment5-court-actions.json', json(report));
  console.log(
    json({
      coverage: report.coverage,
      overlays: report.overlays,
      representative: report.representative,
    }),
  );
} finally {
  await server.close();
}
