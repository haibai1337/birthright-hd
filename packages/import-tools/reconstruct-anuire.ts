import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { OriginalDisc } from './disc.ts';
import { decodeStrings } from './strings.ts';
import { decodeOriginalCampaign } from './campaign.ts';
import { decodeResourceDirectory, unpackResource, decodeIndexedBitmap } from './resources.ts';
import { rasterAdjacency, traceProvinceGeometry, signedArea } from './geometry.ts';
import { mergeGuideWindows, parsePcGuide, normalizeName } from './guide.ts';
import { parseAtlasProvinceRows } from './atlas.ts';
import { compareCampaigns } from './compare-campaigns.ts';
import {
  validateAnuireResearch,
  projectVerifiedProvinceDefinitions,
} from '../world-data/anuire-research.ts';

const image = process.argv[2] ?? 'reference/original/RPGBGA.BIN';
const destination = path.resolve('reference/extracted/anuire');
await mkdir(destination, { recursive: true });
const disc = new OriginalDisc(image, !image.toLowerCase().endsWith('.iso'));
const sources: { id: string; location: string; sha256: string; bytes: number; scope: string }[] =
  [];
const evidence = (id: string, location: string, bytes: Uint8Array, scope: string) => {
  sources.push({
    id,
    location,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    scope,
  });
  return bytes;
};
const write = async (name: string, value: unknown) =>
  writeFile(path.join(destination, name), JSON.stringify(value, null, 2) + '\n');
try {
  const template = evidence(
    'cd-template',
    'CD:RLMSTART.DAT',
    disc.file('RLMSTART.DAT'),
    'Original CD initialization template, not a claim of post-New-Game values',
  );
  const stringBytes = evidence(
    'cd-strings',
    'CD:STRDAT.DAT',
    disc.file('STRDAT.DAT'),
    'Original PC string catalog',
  );
  // Supplied raw image is missing WINBR.EXE's final sector. The name pool is earlier.
  // Explicit prefix read: never zero-pad or pretend that the whole EXE was recovered.
  const exe = evidence(
    'cd-exe-prefix',
    'CD:WINBR.EXE[0:1600000]',
    disc.filePrefix('WINBR.EXE', 1_600_000),
    'PE header and complete province-name section; explicitly a prefix, not a full executable',
  );
  const strings = decodeStrings(stringBytes),
    available = new Set(disc.entries.map((e) => e.name));
  const avatarCache = new Map<number, Uint8Array>();
  const avatar = (id: number) => {
    if (avatarCache.has(id)) return avatarCache.get(id);
    const member = `SCENES/ID${id}.AVA`;
    if (!available.has(member)) return undefined;
    const bytes = evidence(
      `avatar-${id}`,
      `CD:${member}`,
      disc.file(member),
      'Text character definition; no execution',
    );
    avatarCache.set(id, bytes);
    return bytes;
  };
  const campaign = decodeOriginalCampaign(template, exe, strings, avatar);
  evidence(
    'cd-rules',
    'CD:RULES.TXT',
    disc.file('RULES.TXT'),
    'Original PC rule reference; private input only, no prose redistribution',
  );
  const editorBytes = await readFile('reference/extracted/scenario-editor-SCENED.DAT').catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    },
  );
  const editorStrings = editorBytes
    ? decodeStrings(
        evidence(
          'editor-strings',
          'PRIVATE:scenario-editor-SCENED.DAT',
          editorBytes,
          'Scenario Editor archive string catalog; not a campaign record container',
        ),
      )
    : null;
  const stringDifferences =
    editorStrings?.entries.filter((s) => strings.entries[s.id]?.text !== s.text).map((s) => s.id) ??
    [];
  const saveComparisons = disc.entries
    .filter((e) => !e.directory && /^(?:SAVEGAME\/[^/]+|TUTOR[^/]*)\.SAV$/.test(e.name))
    .map((entry) => {
      const bytes = evidence(
        `save-${entry.name}`,
        `CD:${entry.name}`,
        disc.file(entry.name),
        'Supplied save observation, not certified fresh campaign',
      );
      return { member: entry.name, ...compareCampaigns(template, bytes) };
    });
  await write('save-comparisons.json', saveComparisons);
  await write('string-catalog-comparison.json', {
    gameCount: strings.count,
    editorCount: editorStrings?.count ?? null,
    gameBuild: strings.build,
    editorBuild: editorStrings?.build ?? null,
    differingStringIds: editorStrings ? stringDifferences : null,
  });
  const evidenceRange = (offset: number, length: number, sourceIds = ['cd-template']) => ({
    sourceIds,
    offset,
    length,
    confidence: 'HIGH_OBSERVED_TEMPLATE',
    scope: 'Stored original record; not certified post-New-Game state',
  });
  for (const p of campaign.provinces)
    Object.assign(p, { evidence: evidenceRange(p.offset, 32, ['cd-template', 'cd-exe-prefix']) });
  for (const r of campaign.realms)
    Object.assign(r, { evidence: evidenceRange(r.offset, 20, ['cd-template', 'cd-strings']) });
  for (const r of campaign.regents)
    Object.assign(r, {
      evidence: evidenceRange(r.offset, 14, ['cd-template', `avatar-${r.avatarId}`]),
    });
  for (const h of [...campaign.holdings, ...campaign.forts])
    Object.assign(h, { evidence: evidenceRange(h.offset, 20) });
  for (const u of campaign.troops) Object.assign(u, { evidence: evidenceRange(u.offset, 14) });
  const mapBytes = evidence(
    'cd-map',
    'CD:RESFILES/MAP.RES',
    disc.file('RESFILES/MAP.RES'),
    'Private original resource archive; never bundled',
  );
  const resources = decodeResourceDirectory(mapBytes);
  const maps = resources.map((entry) => {
    const decoded = unpackResource(entry),
      bitmap = decodeIndexedBitmap(decoded);
    return {
      name: entry.name,
      ...bitmap,
      payloadSha256: createHash('sha256').update(decoded).digest('hex'),
    };
  });
  const hitMap = maps.find((m) => m.name === 'PROVMAP.PCX'),
    large = maps.find((m) => m.name === 'LGMAP.PCX');
  if (
    !hitMap ||
    !large ||
    Math.ceil(large.width / 4) !== hitMap.width ||
    Math.ceil(large.height / 4) !== hitMap.height
  )
    throw new Error('Unexpected original map scale');
  const geometries = campaign.provinces.map((p) =>
    traceProvinceGeometry(hitMap, p.index, p.center, 4),
  );
  const rasterEdges = rasterAdjacency(hitMap, new Set(campaign.provinces.map((p) => p.index)));
  const asymmetries = campaign.provinces.flatMap((p) =>
    p.borders
      .filter(
        (b) =>
          !campaign.provinces
            .find((n) => n.index === b.provinceIndex)
            ?.borders.some((e) => e.provinceIndex === p.index),
      )
      .map((b) => ({ from: p.index, to: b.provinceIndex, movementCode: b.movementCode })),
  );
  const declared = new Set(
    campaign.provinces.flatMap((p) =>
      p.borders.map((b) =>
        [Math.min(p.index, b.provinceIndex), Math.max(p.index, b.provinceIndex)].join(':'),
      ),
    ),
  );
  const rasterSet = new Set(rasterEdges.map((e) => e.provinces.join(':')));
  const borderReport = {
    directedLinks: campaign.provinces.reduce((n, p) => n + p.borders.length, 0),
    undirectedMovementPairs: declared.size,
    asymmetries,
    rasterContacts: rasterEdges.length,
    movementPairsWithoutRasterContact: [...declared].filter((k) => !rasterSet.has(k)),
    rasterContactsWithoutMovement: rasterEdges.filter((e) => !declared.has(e.provinces.join(':'))),
    rasterEdges,
  };
  const cacheNames: string[] = await readdir('reference/research-cache').catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    },
  );
  const guideNames = cacheNames.filter((n) => /^guide-window-\d+\.txt$/.test(n)).sort();
  const windows = await Promise.all(
    guideNames.map((n) => readFile(path.join('reference/research-cache', n), 'utf8')),
  );
  const guide = parsePcGuide(mergeGuideWindows(windows));
  if (windows.length)
    evidence(
      'pc-guide-78429',
      'https://gamefaqs.gamespot.com/pc/196764-birthright-the-gorgons-alliance/faqs/78429',
      new TextEncoder().encode(windows.join('\n')),
      'Private line-numbered web snapshots; factual extraction only. Guide v1.02, 2020-06-24.',
    );
  await write('pc-guide-facts.json', guide);
  const atlasRows = [];
  for (const domain of ['Roesone', 'Aerenwe', 'City_of_Anuire']) {
    const file = `atlas-${domain}.html`;
    if (!cacheNames.includes(file)) continue;
    const html = await readFile(path.join('reference/research-cache', file), 'utf8'),
      url = `https://birthright.net/wiki/index.php/${domain}`;
    evidence(
      `atlas-${domain}`,
      url,
      new TextEncoder().encode(html),
      'Private tabletop page snapshot; never merged into PC state',
    );
    atlasRows.push(...parseAtlasProvinceRows(html, domain, url));
  }
  const atlasComparisons = atlasRows.map((row) => {
    const p = campaign.provinces.find((p) => normalizeName(p.name) === normalizeName(row.name));
    return {
      ...row,
      pcProvinceId: p?.id ?? null,
      pc: p ? { level: p.level, sourcePotential: p.magic } : null,
      result: !p
        ? 'unmatched'
        : p.level === row.level && p.magic === row.sourcePotential
          ? 'match'
          : 'difference',
    };
  });
  await write('tabletop-comparisons.json', atlasComparisons);
  const crossChecks: {
    category: string;
    record: string;
    field: string;
    result: 'match' | 'difference' | 'unmatched';
    original: unknown;
    secondary: unknown;
    line: number;
  }[] = [];
  const realmAliases: Record<string, string> = { anuirecityofanuire: 'anuire' };
  const domainIndex = (name: string) => {
    const normal = normalizeName(name);
    return campaign.realms.find((r) => normalizeName(r.name) === (realmAliases[normal] ?? normal))
      ?.index;
  };
  for (const row of guide.provinces) {
    const p = campaign.provinces.find((p) => normalizeName(p.name) === normalizeName(row.name));
    if (!p) {
      crossChecks.push({
        category: 'province',
        record: row.name,
        field: 'identity',
        result: 'unmatched',
        original: null,
        secondary: row,
        line: row.line,
      });
      continue;
    }
    for (const [field, original, secondary] of [
      ['level', p.level, row.level],
      ['magic', p.magic, row.magic],
      ['realmIndex', p.realmIndex, domainIndex(row.domain)],
    ] as const)
      crossChecks.push({
        category: 'province',
        record: p.id,
        field,
        result: original === secondary ? 'match' : 'difference',
        original,
        secondary: secondary ?? null,
        line: row.line,
      });
  }
  for (const row of guide.holdings) {
    const p = campaign.provinces.find((p) => normalizeName(p.name) === normalizeName(row.province)),
      realm = domainIndex(row.domain);
    const records =
      row.type === 'castle' ||
      row.type === 'wizard tower' ||
      row.type === 'citadel' ||
      row.type === 'stronghold' ||
      row.type === 'fortress'
        ? campaign.forts
        : campaign.holdings.filter((h) => h.type === row.type);
    const found = records.filter((h) => h.provinceIndex === p?.index && h.realmIndex === realm);
    crossChecks.push({
      category: 'holding',
      record: row.province,
      field: `${realm}:${row.type}`,
      result: found.some((h) => h.level === row.level)
        ? 'match'
        : p && realm !== undefined
          ? 'difference'
          : 'unmatched',
      original: found.map((h) => h.level),
      secondary: row.level,
      line: row.line,
    });
  }
  const classNames: Record<number, string> = {
    1: 'Fighter',
    2: 'Paladin',
    3: 'Ranger',
    4: 'Priest',
    5: 'Wizard',
    6: 'Magician',
    7: 'Thief',
    8: 'Bard',
  };
  const derivations = ['Anduiras', 'Reynir', 'Brenna', 'Basaia', 'Masela', 'Vorynn', 'Azrai'];
  for (const row of guide.characters) {
    const r = campaign.regents.find(
      (r) => normalizeName(r.identity?.name ?? '') === normalizeName(row.name),
    );
    if (!r) {
      crossChecks.push({
        category: 'regent',
        record: row.name,
        field: 'identity',
        result: 'unmatched',
        original: null,
        secondary: row.fields,
        line: row.line,
      });
      continue;
    }
    for (const [guideKey, original] of [
      ['Strength', r.identity?.attributes.strength],
      ['Dexterity', r.identity?.attributes.dexterity],
      ['Constitution', r.identity?.attributes.constitution],
      ['Intelligence', r.identity?.attributes.intelligence],
      ['Wisdom', r.identity?.attributes.wisdom],
      ['Charisma', r.identity?.attributes.charisma],
      ['HP', r.identity?.hitPoints],
      ['Grade', r.bloodline.strength],
    ] as const) {
      const secondary = row.fields[guideKey];
      if (secondary !== undefined)
        crossChecks.push({
          category: 'regent',
          record: r.id,
          field: guideKey,
          result: original === secondary ? 'match' : 'difference',
          original: original ?? null,
          secondary,
          line: row.line,
        });
    }
  }
  const capacities = campaign.provinces.flatMap((p) =>
    (['law', 'guild', 'temple', 'source'] as const).flatMap((type) => {
      const holdings = campaign.holdings.filter(
          (h) => h.provinceIndex === p.index && h.type === type,
        ),
        sum = holdings.reduce((n, h) => n + h.level, 0),
        cap = type === 'source' ? p.magic : p.level;
      return sum > cap
        ? [{ province: p.id, type, capacity: cap, total: sum, records: holdings.map((h) => h.id) }]
        : [];
    }),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${large.width} ${large.height}" width="960" height="1117"><rect width="100%" height="100%" fill="#263b43"/>${geometries
    .map((g) => {
      const p = campaign.provinces.find((p) => p.index === g.provinceIndex)!;
      const hue = (p.realmIndex * 137.508) % 360;
      const d = g.rings.map((r) => 'M' + r.map((p) => p.join(',')).join('L') + 'Z').join('');
      return `<path d="${d}" fill="hsl(${hue.toFixed(2)} 30% 66%)" fill-rule="evenodd" stroke="#263b43" stroke-width="1"><title>${p.index}: ${p.name.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</title></path>`;
    })
    .join(
      '',
    )}${campaign.provinces.map((p) => `<text x="${p.center[0]}" y="${p.center[1]}" text-anchor="middle" font-size="11" fill="#102630">${p.index}</text>`).join('')}</svg>`;
  await writeFile(path.join(destination, 'anuire-reference-map.svg'), svg);
  const warnings = [
    ...(!editorStrings
      ? ['Optional editor string catalog unavailable; editor comparison omitted.']
      : []),
    ...(!windows.length
      ? ['PC guide snapshots unavailable; secondary PC comparisons omitted.']
      : []),
    ...(guide.coverage.gaps.length
      ? ['PC guide snapshot range has gaps; comparison coverage is partial.']
      : []),
    ...(!atlasRows.length
      ? [
          'Tabletop atlas snapshots unavailable or no recognized rows; no tabletop comparison coverage.',
        ]
      : []),
    ...(asymmetries.length
      ? [
          `${asymmetries.length} directed movement links lack a reverse link; preserved, never silently symmetrized.`,
        ]
      : []),
    `${capacities.length} original holding-capacity inconsistencies retained for research.`,
    `Province ID raster contains sentinel colors 0/254 and two pixels of unassigned ID 240; not promoted to provinces.`,
    `Province geometry is exact at 480×559 hit-map resolution, not the continuous high-resolution coastline.`,
    `CD executable final sector is unavailable; province-name pool was recovered from an explicit 1.6 MB prefix.`,
  ];
  const data = {
    format: 'birthright-hd-anuire-research',
    version: 1,
    status: 'research-preview',
    sources,
    references: [
      {
        id: 'historical-source',
        url: 'https://github.com/fire-lizard/birthrt',
        revision: 'fc47055002c4b776bfb1e8737b5aaf7f6d43edce',
        use: 'Read-only format and initialization research; modified source, no code incorporated',
      },
      {
        id: 'pc-guide-78429',
        version: '1.02',
        date: '2020-06-24',
        url: 'https://gamefaqs.gamespot.com/pc/196764-birthright-the-gorgons-alliance/faqs/78429',
        use: 'Independent comparison; original spelling and disagreements retained separately',
      },
    ],
    provenance: {
      status: 'VERIFIED_ORIGINAL',
      source:
        'Supplied CD plus independently implemented format readers; secondary comparisons are separate.',
      note: 'Research corpus: raw template data, not a completed or exact post-initialization campaign.',
    },
    campaign,
    map: { width: large.width, height: large.height, coordinateScale: 4, geometries },
    fieldEvidence: {
      province: ['cd-template:32-byte records', 'cd-exe-prefix:PE name pool', 'cd-map:PROVMAP.PCX'],
      realm: ['cd-template:20-byte records', 'cd-strings:4400+ realm IDs'],
      regent: ['cd-template:14-byte records', 'avatar-{id}:plaintext field definitions'],
      holding: ['cd-template:20-byte place records and relative province chains'],
      troop: ['cd-template:14-byte unit records and absolute joined chains'],
      geometry: ['cd-map:quarter-resolution ID raster; exact cell-edge tracing, no smoothing'],
      secondary: [
        'pc-guide-78429:independent observations, stored separately with line references',
      ],
    },
    validation: {
      errors: [],
      warnings,
      readinessBlockers: [
        'M0 cannot represent original multi-ring province geometry, heavy-mountain/swamp terrain, and some source potentials without explicit schema/rule extensions.',
        'M0 fort cap, symmetric relationships, landed-only elimination, and shared initial-resource defaults cannot faithfully instantiate the full PC world.',
        'New-game regent selection and unit linking are confirmed in the modified source; exact stock selected-regent/difficulty initialization and resulting resources need a controlled before/after comparison.',
        'Original save character-tail sections and diplomacy matrix axis/runtime flag behavior are not fully decoded.',
      ],
      capacityIssues: capacities,
    },
    descriptions: { classNames, derivations },
  };
  const validated = validateAnuireResearch(data),
    projection = projectVerifiedProvinceDefinitions(validated);
  await write('anuire.research.json', validated);
  await write('province-schema-projection.json', projection);
  await write('adjacency-report.json', borderReport);
  await write('source-cross-checks.json', crossChecks);
  await write(
    'map-manifest.json',
    maps.map(({ name, width, height, scale, center, payloadSha256 }) => ({
      name,
      width,
      height,
      scale,
      center,
      payloadSha256,
    })),
  );
  const comparisonCounts = Object.fromEntries(
    ['province', 'holding', 'regent'].map((category) => [
      category,
      Object.fromEntries(
        ['match', 'difference', 'unmatched'].map((result) => [
          result,
          crossChecks.filter((c) => c.category === category && c.result === result).length,
        ]),
      ),
    ]),
  );
  const coverage = {
    formatVersion: 1,
    sourceImage: path.basename(image),
    primarySources: sources.filter((s) =>
      [
        'cd-template',
        'cd-strings',
        'cd-exe-prefix',
        'cd-map',
        'editor-strings',
        'cd-rules',
      ].includes(s.id),
    ),
    volume: disc.volume,
    strings: strings.count,
    stringGroups: strings.groups,
    realms: campaign.realms.length,
    provinceOwningRealms: new Set(campaign.provinces.map((p) => p.realmIndex)).size,
    templatePlayableFlags: campaign.realms.filter((r) => r.playable).length,
    provinces: campaign.provinces.length,
    characterRecords: campaign.regents.length,
    characterDefinitions: campaign.regents.filter((r) => r.identity).length,
    uniqueAvatarFiles: avatarCache.size,
    nonPlaceholderCharacterNames: campaign.regents.filter(
      (r) => r.identity && !/^(unknown|unnamed)$/i.test(r.identity.name),
    ).length,
    realmHeads: new Set(campaign.realms.map((r) => r.regentIndex)).size,
    holdings: campaign.holdings.length,
    fortifications: campaign.forts.length,
    militaryUnits: campaign.troops.filter((u) => u.kind === 'military').length,
    characterUnits: campaign.troops.filter((u) => u.kind === 'character').length,
    unplacedTroops: campaign.troops.filter((u) => u.effectiveProvinceIndex === null).length,
    geometries: geometries.length,
    centerMatches: geometries.filter((g) => g.centerValue === g.provinceIndex).length,
    multiRingProvinces: geometries.filter((g) => g.rings.length > 1).length,
    geometryArea: geometries.reduce((n, g) => n + g.pixelArea, 0),
    negativeRings: geometries.flatMap((g) => g.rings).filter((r) => signedArea(r) < 0).length,
    directedMovementLinks: borderReport.directedLinks,
    asymmetricMovementLinks: asymmetries.length,
    rasterContacts: rasterEdges.length,
    guideRows: {
      provinces: guide.provinces.length,
      holdings: guide.holdings.length,
      regents: guide.regents.length,
      detailedRegents: guide.characters.length,
      coverage: guide.coverage,
    },
    secondaryComparisons: comparisonCounts,
    provinceSchemaProjection: {
      accepted: projection.converted.length,
      blocked: projection.blocked.length,
    },
    capacityIssues: capacities.length,
    savesCompared: saveComparisons.length,
    editorStringDifferences: editorStrings ? stringDifferences.length : null,
    tabletopRows: atlasRows.length,
    tabletopDifferences: atlasComparisons.filter((r) => r.result === 'difference').length,
    confidence: {
      observedTemplateRecords:
        campaign.realms.length +
        campaign.provinces.length +
        campaign.regents.length +
        campaign.holdings.length +
        campaign.forts.length +
        campaign.troops.length,
      geometry: 'EXACT_AT_ORIGINAL_HIT_MAP_RESOLUTION',
      inferredProvinceRecords: 0,
      certifiedPostInitializationCampaigns: 0,
    },
    fieldCoverage: {
      provinceNames: { verified: campaign.provinces.length, missing: 0 },
      provinceOwnersAndLevels: { verified: campaign.provinces.length, missing: 0 },
      provinceTerrainAndCenters: { verified: campaign.provinces.length, missing: 0 },
      realmTemplateResources: { verified: campaign.realms.length, missing: 0 },
      regentBloodlinesAndClass: { verified: campaign.regents.length, missing: 0 },
      regentAvatarDefinitions: {
        verified: campaign.regents.filter((r) => r.identity).length,
        missing: campaign.regents.filter((r) => !r.identity).length,
      },
      nonPlaceholderCharacterNames: {
        verified: campaign.regents.filter(
          (r) => r.identity && !/^(unknown|unnamed)$/i.test(r.identity.name),
        ).length,
        missing: campaign.regents.filter(
          (r) => !r.identity || /^(unknown|unnamed)$/i.test(r.identity.name),
        ).length,
      },
      holdingsOwnerLocationTypeLevel: { verified: campaign.holdings.length, missing: 0 },
      fortificationRecords: { verified: campaign.forts.length, missing: 0 },
      troopOwnerTypeLocation: {
        verified: campaign.troops.length,
        missing: campaign.troops.filter((u) => u.effectiveProvinceIndex === null).length,
      },
      geometryAndCenterIdentity: { verified: geometries.length, missing: 0 },
      stockPostNewGameState: { verified: 0, missing: 'not yet certified' },
      saveCharacterTail: { verified: 0, missing: 'variable-length structures unresolved' },
    },
    playableAnuire: false,
    blockers: validated.validation.readinessBlockers,
  };
  await write('coverage.json', coverage);
  await writeFile('docs/ANUIRE_COVERAGE.json', JSON.stringify(coverage, null, 2) + '\n');
  console.log(JSON.stringify(coverage, null, 2));
} finally {
  disc.close();
}
