import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  createCampaign,
  createBirthright15Foundation,
  economicForecast,
  economicForecast15,
  economicForecasts15,
  provinceRevenue15,
  holdingRevenue15,
  virtualGuildRevenue15,
  economicHoldingGroups15,
  courtUpkeep15,
  tradeEndpointQuote15,
  administrateQuote15,
  references35,
  skillCheck35,
  character35,
  goldFromGB,
  goldFromGBRatio,
  goldUnits,
  serializeCampaign,
  applyCommand,
  type Campaign,
  type Scenario,
  type Birthright15Campaign,
  type CharacterOverlays35,
  type EconomicOptions15,
} from '../packages/core';
import { developmentScenario } from './fixtures/scenario';
import { loadAnuireScenario, buildAnuireCharacterOverlays35 } from '../packages/world-data';

function fixture() {
  const scenario = structuredClone(developmentScenario),
    state = createBirthright15Foundation(scenario, 'crownmere');
  state.holdings = [];
  state.armies = [];
  state.fortifications = [];
  state.ports = [];
  state.tradeRoutes = [];
  state.treaties = [];
  state.characters = [];
  state.tributes = [];
  for (const r of state.realms) {
    r.court = 0;
    r.treasury = goldFromGB(0n);
  }
  for (const p of state.provinces) {
    p.level = 0;
    p.fort = 0;
    p.loyalty = 3;
    p.occupiedBy = null;
  }
  return { scenario, state };
}
const total = (values: bigint[]) => values.reduce((n, x) => n + x, 0n);
function csvRows(text: string): Record<string, string>[] {
  const parse = (line: string) => {
    const cells: string[] = [];
    let cell = '',
      quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i]!;
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
  return rows.map((row) => Object.fromEntries(header!.map((h, i) => [h, row[i]!]))) as Record<
    string,
    string
  >[];
}
function referenceGold(text: string) {
  const [n, d = '1'] = text.split('/');
  return goldFromGBRatio(BigInt(n!), BigInt(d));
}

describe('read-only Birthright 1.5 money model', () => {
  it('quotes exact province, typed holding, virtual and court costs without old table rounding', () => {
    expect(provinceRevenue15(5, goldFromGB(2n))).toBe(goldFromGB(7n));
    expect(() => provinceRevenue15(5, goldFromGB(3n))).toThrow('50%');
    expect(provinceRevenue15(5, goldFromGB(-9n))).toBe(0n);
    expect(holdingRevenue15('law', 1n)).toBe(40n);
    expect(holdingRevenue15('guild', 1n)).toBe(80n);
    expect(holdingRevenue15('temple', 1n)).toBe(80n);
    expect(holdingRevenue15('source', 15n)).toBe(0n);
    expect(virtualGuildRevenue15(5n)).toBe(80n);
    expect([0, 1, 3, 5, 10].map(courtUpkeep15)).toEqual([0n, 120n, 360n, 600n, 1200n]);
  });
  it('aggregates fragments once, preserves inactive records and never grants virtual trade endpoints', () => {
    const { state, scenario } = fixture();
    state.holdings = [
      ...[1, 2, 3].map((n) => ({
        id: `guild-${n}`,
        realmId: 'crownmere',
        provinceId: 'p0',
        type: 'guild' as const,
        level: 1,
      })),
      ...[1, 2].map((n) => ({
        id: `source-${n}`,
        realmId: 'crownmere',
        provinceId: 'p0',
        type: 'source' as const,
        level: 3,
      })),
      {
        id: 'suppressed',
        realmId: 'crownmere',
        provinceId: 'p0',
        type: 'guild',
        level: 5,
        contested: true,
      },
      {
        id: 'destroyed',
        realmId: 'crownmere',
        provinceId: 'p0',
        type: 'law',
        level: 4,
        destroyed: true,
      },
      { id: 'foreign-temple', realmId: 'verdant', provinceId: 'p0', type: 'temple', level: 2 },
    ];
    const before = structuredClone(state),
      forecast = economicForecast15(state, scenario, 'crownmere');
    expect(forecast.income.guild).toBe(goldFromGB(2n));
    expect(forecast.income.law).toBe(0n);
    expect(forecast.conditional.virtualGuild).toBe(160n);
    expect(forecast.income.virtualGuild).toBe(0n);
    expect(forecast.lines.find((l) => l.stream === 'guild')!.assetIds).toHaveLength(4);
    const guild = economicHoldingGroups15(state.holdings).find((g) => g.type === 'guild')!;
    expect(tradeEndpointQuote15(guild).seasonalShare).toBe(180n);
    expect(() =>
      tradeEndpointQuote15(
        economicHoldingGroups15(state.holdings).find((g) => g.type === 'source')!,
      ),
    ).toThrow('real Guild');
    state.holdings = state.holdings.filter((h) => h.type !== 'source');
    state.holdings.push({
      id: 'merged-source',
      realmId: 'crownmere',
      provinceId: 'p0',
      type: 'source',
      level: 6,
    });
    expect(economicForecast15(state, scenario, 'crownmere').conditional.virtualGuild).toBe(
      forecast.conditional.virtualGuild,
    );
    state.holdings = before.holdings;
    expect(state).toEqual(before);
    expect(economicForecast15(state, scenario, 'verdant').income.temple).toBe(160n);
  });
  it('retains current taxation/occupation and port rights without suppressing independent holdings automatically', () => {
    const { state, scenario } = fixture();
    state.provinces[0]!.level = 5;
    state.provinces[0]!.owner = 'crownmere';
    state.ports = [
      {
        id: 'sea',
        provinceId: 'p0',
        realmId: 'crownmere',
        sourceId: 'original-sea',
        kind: 'seaport',
      },
      {
        id: 'river',
        provinceId: 'p0',
        realmId: 'verdant',
        sourceId: 'original-river',
        kind: 'river-port',
      },
    ];
    expect(economicForecast15(state, scenario, 'crownmere').income.ports).toBe(600n);
    expect(economicForecast15(state, scenario, 'verdant').income.ports).toBe(300n);
    state.provinces[0]!.occupiedBy = 'verdant';
    state.holdings = [
      { id: 'guild', realmId: 'crownmere', provinceId: 'p0', type: 'guild', level: 2 },
    ];
    expect(economicForecast15(state, scenario, 'crownmere').income.province).toBe(0n);
    const occupier = economicForecast15(state, scenario, 'verdant');
    expect(occupier.income.province).toBe(600n);
    expect(occupier.income.ports).toBe(0n);
    expect(occupier.expenses.occupation).toBe(120n);
    expect(economicForecast15(state, scenario, 'crownmere').income.guild).toBe(160n);
  });
  it('bills native/static profiles, supported fort assets and linear courts, with no generic admin or Claims', () => {
    const { state, scenario } = fixture();
    state.armies = [
      {
        id: 'army',
        realmId: 'crownmere',
        provinceId: 'p0',
        moved: false,
        units: [
          { id: 'u1', type: 'infantry', strength: 40, payroll: 'unpaid' },
          { id: 'u2', type: 'cavalry', strength: 100, payroll: 'regency' },
        ],
      },
    ];
    state.fortifications = [
      { id: 'castle', realmId: 'crownmere', provinceId: 'p0', level: 8, kind: 'castle' },
      { id: 'tower', realmId: 'crownmere', provinceId: 'p0', level: 2, kind: 'wizard-tower' },
      {
        id: 'unsupported',
        realmId: 'crownmere',
        provinceId: 'p0',
        level: 4,
        kind: 'castle',
        supported: false,
      },
    ];
    state.provinces[0]!.fort = 8;
    state.realms[0]!.lawClaims = true;
    const row = economicForecast15(state, scenario, 'crownmere', {
      courtLevels: [{ realmId: 'crownmere', level: 5, sourceId: 'derived-court' }],
    });
    expect(row.expenses.militaryGross).toBe(360n);
    expect(row.expenses.forts).toBe(240n);
    expect(row.expenses.court).toBe(600n);
    expect(row.expenses.gross).toBe(1200n);
    expect(
      row.lines.some((l) =>
        ['administration', 'law-claims', 'seizure', 'port-maintenance'].includes(l.stream),
      ),
    ).toBe(false);
    expect(row.result!.unfundedObligations).toBe(1200n);
    expect(row.result!.projectedClosing).toBe(-1200n);
  });
  it('keeps controller-specific payroll waivers and removes them for direct or chained player control', () => {
    const { state, scenario } = fixture();
    const domain = scenario.realms.find((r) => r.id === 'verdant')!;
    domain.original = { index: 26 };
    domain.domainType = 'territorial';
    const r = state.realms.find((r) => r.id === 'verdant')!;
    r.controller = 'ai';
    state.armies = [
      {
        id: 'army',
        realmId: 'verdant',
        provinceId: 'p1',
        moved: false,
        units: [{ id: 'u1', type: 'cavalry', strength: 100 }],
      },
    ];
    expect(economicForecast15(state, scenario, 'verdant').expenses.npcPayrollWaiver).toBe(240n);
    state.treaties = [
      { a: 'crownmere', b: 'verdant', kind: 'vassal', vassal: 'verdant', opinion: 0, since: 1 },
    ];
    expect(economicForecast15(state, scenario, 'verdant').expenses.npcPayrollWaiver).toBe(0n);
    state.treaties = [];
    state.playerRealm = 'verdant';
    expect(economicForecast15(state, scenario, 'verdant').expenses.militaryGross).toBe(240n);
    expect(economicForecast15(state, scenario, 'verdant').expenses.npcPayrollWaiver).toBe(0n);
  });
  it('prices evidenced infrastructure/commitments, separates missing and hypothetical bills, rejects duplicates', () => {
    const { state, scenario } = fixture();
    const fact = {
      id: 'road-paid',
      realmId: 'crownmere',
      kind: 'road' as const,
      sourceIds: ['p0', 'p1'],
      reference: 'Recorded road upkeep invoice',
      seasonalUpkeep: goldFromGBRatio(1n, 12n),
      evidence: 'verified-existing' as const,
      paid: true,
      supported: true,
    };
    const options: EconomicOptions15 = {
      infrastructure: [
        fact,
        { ...fact, id: 'missing', seasonalUpkeep: null, evidence: 'unclassified' },
        { ...fact, id: 'future', evidence: 'hypothetical' },
      ],
      commitments: [
        {
          id: 'bill',
          realmId: 'crownmere',
          sourceIds: ['contract'],
          reference: 'Recorded obligation',
          amount: goldFromGB(2n),
          status: 'outstanding',
        },
        {
          id: 'paid',
          realmId: 'crownmere',
          sourceIds: ['receipt'],
          reference: 'Already charged',
          amount: goldFromGB(100n),
          status: 'already-paid',
        },
      ],
    };
    const row = economicForecast15(state, scenario, 'crownmere', options);
    expect(row.expenses.infrastructure).toBe(10n);
    expect(row.expenses.commitments).toBe(240n);
    expect(row.administrate.eligibleBase).toBe(10n);
    expect(row.expenses.payable).toBe(250n);
    expect(row.lines.some((l) => l.status === 'hypothetical')).toBe(true);
    expect(row.conditional.unpricedSourceIds.length).toBeGreaterThan(0);
    expect(() => economicForecasts15(state, scenario, { infrastructure: [fact, fact] })).toThrow(
      'Duplicate',
    );
  });
  it('quotes funded recorded transfers without incoming relay, fractional loss or reciprocal cash creation', () => {
    const { state, scenario } = fixture();
    state.realms[0]!.treasury = goldUnits(1n);
    state.tributes = [
      { id: 'a', payer: 'crownmere', recipient: 'verdant', amount: goldUnits(1n) },
      { id: 'b', payer: 'crownmere', recipient: 'ironvale', amount: goldUnits(1n) },
      { id: 'c', payer: 'verdant', recipient: 'crownmere', amount: goldUnits(100n) },
    ];
    const rows = economicForecasts15(state, scenario),
      payer = rows.find((r) => r.realmId === 'crownmere')!,
      recipient = rows.find((r) => r.realmId === 'verdant')!;
    expect(
      payer.lines.find((l) => l.stream === 'contract-transfer' && l.assetIds[0] === 'a')!
        .quotedPayment,
    ).toBe(1n);
    expect(
      payer.lines.find((l) => l.stream === 'contract-transfer' && l.assetIds[0] === 'b')!
        .quotedPayment,
    ).toBe(0n);
    expect(recipient.income.contracted).toBe(1n);
    expect(payer.income.contracted).toBe(0n);
    expect(recipient.result!.unfundedTransfers).toBe(100n);
    expect(total(rows.map((r) => r.income.contracted))).toBe(
      total(
        rows.flatMap((r) =>
          r.lines
            .filter((l) => l.stream === 'contract-transfer' && l.direction === 'expense')
            .map((l) => l.quotedPayment!),
        ),
      ),
    );
  });
  it('keeps enormous exact balances, is pure and leaves legacy forecasting and execution guards intact', () => {
    const { state, scenario } = fixture();
    state.realms[0]!.treasury = goldFromGB(10n ** 120n);
    const before = serializeCampaign(state);
    const row = economicForecast15(state, scenario, 'crownmere');
    expect(row.result!.projectedClosing).toBe(state.realms[0]!.treasury);
    expect(serializeCampaign(state)).toBe(before);
    const legacy = createCampaign(scenario, 'crownmere'),
      forecast = economicForecast(legacy, scenario, 'crownmere');
    expect(() =>
      economicForecast15(legacy as unknown as Birthright15Campaign, scenario, 'crownmere'),
    ).toThrow('explicit domain-rules');
    expect(() => economicForecast(state as unknown as Campaign, scenario, 'crownmere')).toThrow(
      'not active',
    );
    expect(
      applyCommand(state as unknown as Campaign, scenario, 'crownmere', { type: 'HoldAction' }).ok,
    ).toBe(false);
    expect(economicForecast(legacy, scenario, 'crownmere')).toEqual(forecast);
  });
});

describe.skipIf(!existsSync('reference/extracted/anuire/strategy.research.json'))(
  '51-domain approved Anuire opening ledger',
  () => {
    let scenario: Scenario, state: Birthright15Campaign, overlays: CharacterOverlays35;
    let paths: string[], hashes: string[];
    beforeAll(async () => {
      paths = ['anuire', 'economy', 'magic', 'strategy'].map(
        (n) => `reference/extracted/anuire/${n}.research.json`,
      );
      paths.push('packages/world-data/anuire-characters15.json');
      hashes = paths.map((p) => createHash('sha256').update(readFileSync(p)).digest('hex'));
      const input = paths.slice(0, 4).map((p) => JSON.parse(readFileSync(p, 'utf8'))) as [
        unknown,
        unknown,
        unknown,
        unknown,
      ];
      scenario = await loadAnuireScenario(...input);
      overlays = buildAnuireCharacterOverlays35(scenario, input[0], input[2]);
      state = createBirthright15Foundation(scenario, 'anuire-realm-04', {
        selectionMode: 'UNRESTRICTED',
        overlays: references35(overlays),
      });
    }, 120000);
    it('matches every domain reference cell and all approved aggregate limits using actual data', () => {
      const before = serializeCampaign(state),
        rows = economicForecasts15(state, scenario, { overlays }),
        reference = csvRows(readFileSync('docs/rules/validation/v1-approved-costs.csv', 'utf8'));
      expect(rows).toHaveLength(51);
      const ordinary = rows.filter((r) => r.accounting === 'ordinary');
      expect(ordinary).toHaveLength(49);
      for (const r of rows) {
        const ref = reference.find((v) => v.realmId === r.realmId)!;
        for (const [key, column] of [
          ['province', 'provinceGB'],
          ['law', 'lawGB'],
          ['guild', 'guildGB'],
          ['temple', 'templeGB'],
          ['ports', 'portsGB'],
        ] as const)
          expect(r.income[key], `${r.realmId}/${key}`).toBe(referenceGold(ref[column]!));
        expect(r.conditional.virtualMaximum).toBe(referenceGold(ref.conditionalVirtualMaximumGB!));
        expect(r.expenses.militaryGross).toBe(referenceGold(ref.grossNativePayrollGB!));
        expect(r.expenses.forts).toBe(referenceGold(ref.flatFortGB!));
        expect(r.expenses.court).toBe(referenceGold(ref.courtOneGB!));
        if (r.accounting === 'ordinary') {
          expect(r.expenses.npcPayrollWaiver).toBe(referenceGold(ref.npcPayrollExceptionGB!));
          expect(r.expenses.payable).toBe(referenceGold(ref.selectedExpenseGB!));
        } else expect(r.result).toBeNull();
      }
      expect(total(ordinary.map((r) => r.income.ordinary - r.income.virtualGuild))).toBe(
        goldFromGBRatio(8179n, 6n),
      );
      expect(total(ordinary.map((r) => r.conditional.virtualMaximum))).toBe(goldFromGB(46n));
      expect(total(ordinary.map((r) => r.expenses.militaryGross))).toBe(goldFromGB(325n));
      expect(total(ordinary.map((r) => r.expenses.npcPayrollWaiver))).toBe(goldFromGB(54n));
      expect(total(ordinary.map((r) => r.expenses.payable))).toBe(goldFromGB(359n));
      expect(serializeCampaign(state)).toBe(before);
      expect(paths.map((p) => createHash('sha256').update(readFileSync(p)).digest('hex'))).toEqual(
        hashes,
      );
      const content = JSON.parse(
        readFileSync('docs/rules/BIRTHRIGHT_15_CHARACTER_COVERAGE.json', 'utf8'),
      );
      expect(references35(overlays)).toEqual(content.references);
    });
    it('uses reviewed exceptional casting and keeps unused candidates conditional', () => {
      const copy = structuredClone(state);
      copy.holdings = copy.holdings.filter(
        (h) => !(h.realmId === 'anuire-realm-01' && h.type === 'source'),
      );
      copy.holdings.push({
        id: 'source-eligibility-fixture',
        realmId: 'anuire-realm-01',
        provinceId: copy.provinces[0]!.id,
        type: 'source',
        level: 6,
      });
      let row = economicForecast15(copy, scenario, 'anuire-realm-01', { overlays });
      expect(row.income.virtualGuild).toBe(0n);
      expect(row.conditional.virtualGuild).toBe(160n);
      const mage = copy.characters!.find((c) => c.regentId === 'anuire-regent-002')!;
      mage.role = 'lieutenant';
      row = economicForecast15(copy, scenario, 'anuire-realm-01', { overlays });
      expect(row.income.virtualGuild).toBe(160n);
      expect(row.conditional.virtualGuild).toBe(0n);
      copy.characters!.push({ ...mage, id: 'duplicate-person' });
      expect(
        economicForecast15(copy, scenario, 'anuire-realm-01', { overlays }).income.virtualGuild,
      ).toBe(0n);
      const gorgon = economicForecast15(state, scenario, 'anuire-realm-17', { overlays });
      expect(gorgon.income.virtualGuild).toBe(goldFromGB(6n));
      expect(gorgon.conditional.virtualGuild).toBe(0n);
    });
    it('quotes Administrate exactly on eligible infrastructure only, without automatic success or repeated application', () => {
      const costs = [
          { key: 'fort', kind: 'fort' as const, amount: goldFromGB(4n) },
          { key: 'road', kind: 'road' as const, amount: goldFromGBRatio(1n, 2n) },
        ],
        realmId = 'anuire-realm-02',
        characterId = 'anuire-regent-003';
      const noRoll = administrateQuote15(state, scenario, overlays, realmId, costs, {
        characterId,
      });
      expect(noRoll.success).toBeNull();
      expect(noRoll.discount).toBe(0n);
      expect(noRoll.modifier).toBe(
        skillCheck35(character35(overlays.characters!, characterId), 'administrate')!.total,
      );
      const boundaryCosts = [
        {
          key: 'exact-road-DC',
          kind: 'road' as const,
          amount: goldUnits((BigInt(noRoll.modifier! * 2) + 9n) * 60n),
        },
      ];
      expect(
        administrateQuote15(state, scenario, overlays, realmId, boundaryCosts, {
          characterId,
          die: 14,
        }).success,
      ).toBe(false);
      expect(
        administrateQuote15(state, scenario, overlays, realmId, boundaryCosts, {
          characterId,
          die: 15,
        }).success,
      ).toBe(true);
      const success = administrateQuote15(state, scenario, overlays, realmId, costs, {
        characterId,
        die: 20,
      });
      expect(success.success).toBe(true);
      expect(success.discount).toBe(120n);
      expect(total(success.allocations.map((a) => a.reduction))).toBe(120n);
      expect(
        administrateQuote15(state, scenario, overlays, realmId, costs, {
          characterId,
          die: 20,
          alreadyApplied: true,
        }).discount,
      ).toBe(0n);
      expect(
        administrateQuote15(state, scenario, overlays, 'anuire-realm-17', costs, {
          characterId: 'anuire-regent-033',
          die: 20,
        }).eligible,
      ).toBe(true);
      const prices: EconomicOptions15 = {
        overlays,
        administrate: [{ realmId, characterId, die: 20 }],
        infrastructure: [
          {
            id: 'paid-road',
            realmId,
            kind: 'road',
            sourceIds: ['recorded-road'],
            reference: 'Paid road maintenance',
            seasonalUpkeep: goldFromGBRatio(5n, 2n),
            evidence: 'verified-existing',
            paid: true,
            supported: true,
          },
        ],
      };
      const row = economicForecast15(state, scenario, realmId, prices);
      expect(row.administrate.eligibleBase).toBe(row.expenses.forts + row.expenses.infrastructure);
      expect(row.administrate.eligibleBase).toBe(540n);
      expect(
        row.lines
          .filter((l) => l.reduction > 0n)
          .every((l) => ['fort', 'infrastructure'].includes(l.stream)),
      ).toBe(true);
    });
    it('updates Rhuobhe and honors Spider virtual handling through an explicit entitlement', () => {
      for (const [id, npcNet, controlledNet] of [
        ['anuire-realm-26', goldFromGBRatio(14n, 3n), goldFromGBRatio(-1n, 3n)],
        ['anuire-realm-29', goldFromGB(3n), goldFromGB(2n)],
      ] as const) {
        const npc = economicForecast15(state, scenario, id, { overlays });
        expect(npc.result!.netOperating).toBe(npcNet);
        const copy = structuredClone(state);
        copy.playerRealm = id;
        copy.realms.find((r) => r.id === id)!.controller = 'player';
        expect(economicForecast15(copy, scenario, id, { overlays }).result!.netOperating).toBe(
          controlledNet,
        );
      }
      const copy = structuredClone(state);
      copy.holdings.push({
        id: 'hypothetical-spider-source',
        realmId: 'anuire-realm-29',
        provinceId: copy.provinces[0]!.id,
        type: 'source',
        level: 6,
      });
      expect(
        economicForecast15(copy, scenario, 'anuire-realm-29', { overlays }).income.virtualGuild,
      ).toBe(goldFromGBRatio(4n, 3n));
    });
  },
);
