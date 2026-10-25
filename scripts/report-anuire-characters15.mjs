/** Focused content report; uses the existing loader and does not settle a season. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const core = await server.ssrLoadModule('/packages/core/index.ts');
  const { loadAnuireScenario, buildAnuireCharacterOverlays35 } = await server.ssrLoadModule(
    '/packages/world-data/index.ts',
  );
  const inputPaths = ['anuire', 'economy', 'magic', 'strategy'].map(
    (n) => `reference/extracted/anuire/${n}.research.json`,
  );
  const inputs = inputPaths.map((p) => JSON.parse(fs.readFileSync(p, 'utf8')));
  const scenario = await loadAnuireScenario(...inputs);
  const bundle = buildAnuireCharacterOverlays35(scenario, inputs[0], inputs[2]);
  const records = bundle.characters.records;
  const originalStudy = JSON.parse(
    fs.readFileSync(
      'reference/research-cache/birthright15/anuire-validation/calculation.json',
      'utf8',
    ),
  );
  const preservedInputs = Object.fromEntries(
    Object.entries(originalStudy.inputs)
      .filter(([p]) => p.startsWith('reference/'))
      .map(([p, expected]) => {
        const actual = createHash('sha256').update(fs.readFileSync(p)).digest('hex');
        if (actual !== expected)
          throw new Error(`Original research input changed since economic validation: ${p}`);
        return [p, actual];
      }),
  );
  const describe = (r) => ({
    id: r.id,
    name: r.name,
    completion: r.completion,
    review: r.review,
    issues: r.issues,
    level: core.derivedSheet35(r)?.level ?? r.exceptionalProfile?.progression.monsterLevel ?? null,
    ranks: core.skillRanks35(r),
    ratings: Object.fromEntries(
      ['province', 'law', 'guild', 'temple', 'source'].map((k) => [k, core.rating35(r, k)]),
    ),
    source: core.casting35(r).sourceRealmMagic,
    virtualGuildHandler: core.virtualGuildHandler35(r),
    temple: core.casting35(r).templeRealmMagic,
    approved: core.casting35(r).approved,
    domainReadiness:
      r.exceptionalProfile?.domainReadiness ??
      (r.completion === 'complete' ? 'reviewed' : r.completion),
    tacticalReadiness: r.exceptionalProfile?.tacticalReadiness ?? 'ordinary-allocation',
    exceptionalProfile: r.exceptionalProfile ?? null,
    sierraSpellEntitlement: r.sierraSpellEntitlement ?? null,
    administrate: core.skillCheck35(r, 'administrate'),
  });
  const contexts = originalStudy.variants.map((v) => ({
    realmId: v.realmId,
    characterId: v.regentId,
    ...describe(core.character35(bundle.characters, v.regentId)),
  }));
  const defaultDomains = originalStudy.domains
    .filter((d) => d.standard)
    .map((d) => ({
      realmId: d.id,
      name: d.name,
      ...describe(core.character35(bundle.characters, d.regentId)),
    }));
  const candidateSet = (mode) =>
    [
      ...new Set(
        scenario.realms
          .filter((r) =>
            core.realmSelectable(scenario, r.id, mode === 'expanded' ? 'UNRESTRICTED' : 'CLASSIC'),
          )
          .flatMap((r) => core.realmRegentCandidates(scenario, r.id).map((c) => c.id)),
      ),
    ].map((id) => describe(core.character35(bundle.characters, id)));
  const summarize = (rows) => ({
    total: rows.length,
    complete: rows.filter((r) => r.completion === 'complete').length,
    provisional: rows.filter((r) => r.completion === 'provisional').length,
    unresolved: rows.filter((r) => r.completion === 'unresolved').length,
    approvedSource: rows.filter((r) => r.approved && r.source).length,
    approvedTemple: rows.filter((r) => r.approved && r.temple).length,
  });
  const handlers = bundle.handlers.records.filter(
    (h) =>
      h.review === 'evidence-checked' &&
      core.virtualGuildHandler35(core.character35(bundle.characters, h.characterId)),
  );
  const summary = {
    version: bundle.characters.version,
    references: core.references35(bundle),
    inputs: preservedInputs,
    counts: summarize(records.map(describe)),
    ordinaryDomains: summarize(defaultDomains),
    rulerDomainContexts: summarize(contexts),
    classicCandidates: summarize(candidateSet('classic')),
    expandedCandidates: summarize(candidateSet('expanded')),
    approvedHandlerContexts: handlers,
    approvedHandlerCharacters: [...new Set(handlers.map((h) => h.characterId))],
    records: records.map(describe),
    defaultDomains,
    contexts,
  };
  fs.writeFileSync(
    'docs/rules/BIRTHRIGHT_15_CHARACTER_COVERAGE.json',
    JSON.stringify(summary, null, 2) + '\n',
  );
  fs.writeFileSync(
    'reference/extracted/anuire/birthright15.characters.json',
    JSON.stringify(bundle, null, 2) + '\n',
  );
  const lines = [
    '# Birthright 1.5 — 116 character worksheets',
    '',
    'Generated from the original private Anuire records plus the versioned authored choices. See [reconstruction report](BIRTHRIGHT_15_CHARACTER_RECONSTRUCTION.md) for provenance, limitations and approval gates. `authored-checked` means an authored allocation review, never recovered historical ranks. Native template fields remain verbatim in the private overlay JSON; all level ledgers are tracked in `packages/world-data/anuire-characters15.json`.',
    '',
    `Character fingerprint: \`${summary.references.characters.fingerprint}\`. Handler fingerprint: \`${summary.references.handlers.fingerprint}\`.`,
    '',
  ];
  for (const r of records) {
    const s = r.reconstruction,
      d = core.derivedSheet35(r),
      original = r.original,
      identity = original.identity;
    lines.push(
      `## ${r.id} — ${r.name}`,
      '',
      `Status: **${r.completion}**; review: **${r.review}**.`,
      `Original: race ${original.raceCode}; native classes ${original.classCode}:${original.level ?? 0}/${original.secondClassCode ?? 0}:${original.secondLevel ?? 0}; AVA ${r.inventory.avaClasses.map((c) => `${c.classCode}:${c.level}`).join('/')}; avatar ${r.inventory.avatarId}; unit ${original.unitIndex ?? 'unknown'}; original realm index ${original.realmIndex}.`,
      `Bloodline (derived): ${r.bloodline.derivation} ${r.bloodline.grade}, **${r.bloodline.score}**; raw native grade ${original.bloodline.grade}; native HP ${identity?.hitPoints ?? 'unknown'}; alignment code ${identity?.alignment ?? 'unknown'}.`,
      `Inventory IDs (original, duplicates preserved): ${r.inventory.itemIds.join(', ') || 'none'}. Verified inventory: ${r.inventory.verified}. Recovered known realm spells: ${r.knownRealmSpells.join(', ') || 'none certified'}.`,
      `Source references: ${r.provenance[0].sources.join(', ')}; native record offset ${original.offset ?? 'unknown'}.`,
      '',
    );
    if (r.exceptionalProfile) {
      const p = r.exceptionalProfile;
      lines.push(
        `Exceptional profile: **${p.kind}**; domain readiness **${p.domainReadiness}**; tactical readiness **${p.tacticalReadiness}**.`,
        `Progression: ${JSON.stringify(p.progression)}.`,
        '',
        ...p.traits.map(
          (t) =>
            `- ${t.id} (${t.kind}; ${t.status}; ${t.edition}; mechanics ${t.mechanics}): ${t.description} Source: ${t.source}.`,
        ),
        ...p.unknowns.map((u) => `- **Deferred:** ${u}`),
        '',
      );
    }
    if (r.sierraSpellEntitlement)
      lines.push(
        `Explicit Sierra Monster spell entitlement (no ordinary Wizard requirement): ${r.sierraSpellEntitlement.spells.map((s) => `${s.originalItemId} ${s.name} (${s.scope}; INV line ${s.inventoryLine})`).join('; ')}. Resource, casting-opportunity, holding-access and target requirements remain mandatory. Source RP is separate; virtual Guild handler qualification is independently approved: ${core.virtualGuildHandler35(r)}.`,
        '',
      );
    if (!s) {
      const monster = r.exceptionalProfile?.monsterSheet;
      if (monster) {
        lines.push(
          `Reviewed authored racial ledger: ${monster.racialHD.length} Monstrous Humanoid HD; Large; ${monster.alignment}; HP ${d.hp}; abilities ${JSON.stringify(d.abilities)}.`,
          `Class-skill policy: ${monster.policy}; ${monster.classSkills.join(', ')}. Other skills remain cross-class.`,
          `Ranks: ${Object.entries(d.ranks)
            .map(([k, v]) => `${k} ${v}`)
            .join(
              '; ',
            )}. Total point budget ${d.skillPointBudget}; Guild specialties ${monster.guildCraft}/${monster.guildProfession}, both unpurchased.`,
          `Feats: ${monster.feats.map((f) => `${f.id}${f.target ? `(${f.target})` : ''}@HD${f.hitDie}`).join('; ')}.`,
          `HD ledger: ${monster.racialHD.map((h, i) => `${i + 1}:d8 roll${h.hpRoll}${h.abilityIncrease ? ` +1${h.abilityIncrease}` : ''}; ${h.purchases.map((p) => `${p.skill}+${p.halfRanks / 2}`).join(', ')}`).join(' | ')}.`,
          `Combat (derived, execution deferred): ${JSON.stringify(d.combat)}. Movement ${monster.groundSpeed}ft/climb ${monster.climbSpeed}ft.`,
          `Abilities and readiness: ${JSON.stringify(monster.capabilities)}.`,
          `RP ratings: ${['province', 'law', 'guild', 'temple', 'source'].map((k) => `${k} ${core.rating35(r, k).raw}/${core.rating35(r, k).percent}% (eligible ${core.eligibleRating35(r, k).eligible})`).join('; ')}. Administrate: ${JSON.stringify(core.skillCheck35(r, 'administrate'))}.`,
          '',
          ...monster.notes.map((n) => `- ${n}`),
          '',
        );
        continue;
      }
      lines.push(
        `Unknowns: ${r.issues.join(' ')}`,
        r.exceptionalProfile
          ? 'No fabricated ordinary ranks, feats or ability scores. Reviewed monster identity and explicit spell entitlement use their independent gates.'
          : 'No authored ranks, feats, spellcasting or authorization.',
        '',
      );
      continue;
    }
    lines.push(
      `Authored: ${s.race}; culture ${s.culture ?? 'unknown'}; ${s.alignment}; level **${d.level}** (${Object.entries(
        d.classLevels,
      )
        .map(([c, l]) => `${c} ${l}`)
        .join(' / ')}); role ${s.choices.role}.`,
      `Abilities (original final / authored starting / final modifier): ${core.ABILITIES35.map((a) => `${a} ${s.abilities[a]}/${s.baseAbilities[a]}/${d.modifiers[a] >= 0 ? '+' : ''}${d.modifiers[a]}`).join('; ')}.`,
      `Derived without equipment: HP ${d.hp}; HD ${d.hitDice.map((h) => `d${h}`).join('+')}; BAB ${d.combat.baseAttack}; saves F/R/W ${d.combat.fortitude}/${d.combat.reflex}/${d.combat.will}; AC/touch ${d.combat.unarmoredAC}/${d.combat.touchAC}; initiative ${d.combat.initiative}; melee/ranged/grapple ${d.combat.melee}/${d.combat.ranged}/${d.combat.grapple}.`,
      `Ranks (authored): ${Object.entries(d.ranks)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k} ${v}`)
        .join('; ')}.`,
      `Guild specialties: ${s.guildCraft}; ${s.guildProfession}. Chosen permanent scion skills: ${s.scionChoices.join(', ') || 'not applicable'}.`,
      `Feats (authored grant @ character level): ${s.feats.map((f) => `${f.id}${f.target ? `(${f.target})` : ''} [${f.grant}@${f.level}]`).join('; ')}.`,
      `Class features/entitlements: ${d.features.join('; ')}. Racial traits (published rules): ${d.traits.join('; ')}. Class bonus feats: ${d.classBonusFeats.map((f) => `${f.id} (${f.grant}, class level ${f.level}, armor ${f.armorRestriction})`).join('; ') || 'none'}.`,
      `Casting (authored conversion): ${d.casting.classes.map((c) => `${c.classId} ${c.level}, CL ${c.casterLevel}, maximum spell level ${c.maximumSpellLevel}, ${c.access}; daily slots by spell level ${c.slots.map((s) => `${s.spellLevel}:${s.total}${s.domain ? '+1 domain' : ''}`).join(', ')}`).join('; ') || 'none'}. Source/Temple qualified: ${d.casting.sourceRealmMagic}/${d.casting.templeRealmMagic}; approved conversion: ${d.casting.approved}. Authorization remains domain/state dependent.`,
      `Faith/domains (authored): ${s.deity ?? 'none'}/${s.domains.join(', ') || 'none'}; divine standing ${s.divineStanding}. Languages (authored): ${s.languages.join(', ')}.`,
      `Ordinary wizard acquisitions (authored, never realm-spell grants): ${s.spellbook.map((p) => `${p.spell} (spell ${p.spellLevel}, character ${p.learnedAt})`).join('; ') || 'not applicable'}.`,
      `Spontaneous spells known (authored): ${s.spontaneousSpells.map((p) => `${p.spell} (${p.spellLevel})`).join('; ') || 'not applicable'}. Other authored choices/unknowns: ${Object.entries(
        s.choices,
      )
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')}.`,
      `Raw RP ratings / percent, before review/casting gates: ${[
        'province',
        'law',
        'guild',
        'temple',
        'source',
      ]
        .map((k) => {
          const v = core.rating35(r, k);
          return `${k} ${v.raw}/${v.percent}%`;
        })
        .join('; ')}.`,
      `Per-level ledger: ${s.levels.map((l, i) => `${i + 1}:${l.classId}, HP die ${l.hpRoll}${l.abilityIncrease ? `, +1 ${l.abilityIncrease}` : ''}, ${l.purchases.map((p) => `${p.skill} +${p.halfRanks / 2}`).join(', ')}`).join(' | ')}.`,
      '',
      ...s.notes.map((n) => `- ${n}`),
      ...r.issues.map((n) => `- **Review:** ${n}`),
      '',
    );
  }
  fs.writeFileSync('docs/rules/BIRTHRIGHT_15_CHARACTER_WORKSHEETS.md', lines.join('\n') + '\n');
  console.log(
    JSON.stringify(
      {
        counts: summary.counts,
        ordinary: summary.ordinaryDomains,
        contexts: summary.rulerDomainContexts,
        classic: summary.classicCandidates,
        expanded: summary.expandedCandidates,
        sourceHandlerCharacters: summary.approvedHandlerCharacters.length,
        sourceHandlerContexts: handlers.length,
        references: summary.references,
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
