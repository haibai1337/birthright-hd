import { rulingRegent } from './regents';
import type { Campaign, Command, Scenario } from './schema';
import { casterProfile, bloodlineStrength } from './bloodlines';
import { availableSource } from './ley-lines';
import { fortLevel } from './domains';

type Cast = Extract<Command, { type: 'CastRealmSpell' }>;
export function hasMagicEffect(state: Campaign, provinceId: string, kind: string) {
  return state.effects.some(
    (e) => e.kind === kind && e.provinceId === provinceId && e.expiresTurn > state.turn,
  );
}
export function magicalHoldingLevel(
  state: Campaign,
  actor: string,
  provinceId: string,
  holding: 'source' | 'temple',
) {
  return holding === 'source'
    ? availableSource(state, actor, provinceId)
    : Math.max(
        0,
        ...state.holdings
          .filter(
            (h) =>
              h.type === 'temple' &&
              h.provinceId === provinceId &&
              h.realmId === actor &&
              !h.destroyed &&
              !h.contested,
          )
          .map((h) => h.level),
      );
}
export function magicQuote(state: Campaign, scenario: Scenario, actor: string, cmd: Cast) {
  const spell = scenario.spells.find((s) => s.id === cmd.spellId);
  if (!spell) return { gold: 0, regency: 0, actions: 1 };
  const provinces = [cmd.provinceId, ...(cmd.additionalProvinces ?? [])];
  let gold = spell.gold,
    regency = spell.regency;
  if (spell.effect === 'alchemy') regency = cmd.amount ?? 1;
  if (spell.effect === 'death-plague')
    regency = provinces.reduce(
      (n, id) => n + (state.provinces.find((p) => p.id === id)?.level ?? 0),
      0,
    );
  if (
    spell.effect === 'demagogue' ||
    spell.effect === 'warding' ||
    spell.effect === 'honest-dealing'
  ) {
    regency *= provinces.length;
    if (spell.effect === 'warding') gold *= provinces.length;
  }
  if (spell.effect === 'bless-land' || spell.effect === 'blight')
    regency = provinces.reduce(
      (n, id) =>
        n +
        Math.max(
          1,
          (state.provinces.find((p) => p.id === id)?.level ?? 0) -
            magicalHoldingLevel(state, actor, id, 'temple'),
        ),
      0,
    );
  if (spell.effect === 'bless-army' || spell.effect === 'mass-destruction')
    regency *= cmd.unitIds?.length ?? 0;
  if (spell.effect === 'raze') {
    gold *= cmd.amount ?? 1;
    regency *= cmd.amount ?? 1;
  }
  if (spell.effect === 'dispel')
    regency = state.effects.find((e) => e.id === cmd.effectId)?.regencyCost ?? 0;
  // ACTNMENU: prospective Dispel protection adds DispelLvl + 1 RP per target.
  regency += [...new Set(provinces)].reduce(
    (n, id) =>
      n +
      state.effects
        .filter((e) => e.provinceId === id && e.kind === 'antimagic' && e.expiresTurn > state.turn)
        .reduce((m, e) => m + (e.resistance ?? 0) + 1, 0),
    0,
  );
  return { gold, regency, actions: 1 };
}
export function magicProblem(
  state: Campaign,
  scenario: Scenario,
  actor: string,
  cmd: Cast,
): string | null {
  const spell = scenario.spells.find((s) => s.id === cmd.spellId);
  if (!spell) return 'Unknown realm spell.';
  if (!['source', 'temple'].includes(spell.holding))
    return 'Realm spells require source or temple power.';
  if (spell.effect === 'ward') return 'This prototype spell belongs to the legacy scenario rules.';
  if (spell.implemented === false)
    return spell.unavailableReason ?? 'This spell is not yet supported.';
  const caster = casterProfile(scenario, actor, spell.holding as 'source' | 'temple', state);
  if (!caster)
    return `A ${spell.holding === 'source' ? 'wizard or bard' : 'priest'} regent is required; owning a holding alone is insufficient.`;
  if (caster.level < (spell.casterLevel ?? 1))
    return `Caster level ${spell.casterLevel} is required.`;
  const realm = state.realms.find((r) => r.id === actor)!;
  if (
    !(realm.knownSpells ?? rulingRegent(scenario, actor, state)?.realmSpells ?? []).includes(
      spell.id,
    )
  )
    return 'The spell is not in this regent’s recovered or learned realm spell inventory.';
  const local = state.holdings.find(
    (h) =>
      h.provinceId === cmd.provinceId &&
      h.realmId === actor &&
      h.type === spell.holding &&
      !h.destroyed &&
      !h.contested,
  );
  if (!local)
    return `Casting requires your own uncontested local ${spell.holding} holding, even when a ley line supplies power.`;
  if (
    magicalHoldingLevel(state, actor, cmd.provinceId, spell.holding as 'source' | 'temple') <
    spell.minLevel
  )
    return `Requires ${spell.holding} level ${spell.minLevel}; connected sources share the highest available level.`;
  const p = state.provinces.find((p) => p.id === cmd.provinceId);
  if (!p) return 'Unknown province.';
  const targets = [p.id, ...(cmd.additionalProvinces ?? [])];
  if (new Set(targets).size !== targets.length) return 'Choose each spell target once.';
  if (targets.some((id) => !state.provinces.some((p) => p.id === id)))
    return 'Unknown spell target province.';
  const area = [
    'death-plague',
    'demagogue',
    'warding',
    'honest-dealing',
    'bless-land',
    'blight',
  ].includes(spell.effect);
  const base =
    spell.effect === 'bless-land' || spell.effect === 'blight' ? 1 : (spell.casterLevel ?? 1);
  const max = 1 + Math.max(0, Math.floor((caster.level - base) / 2));
  if ((!area && targets.length > 1) || targets.length > max)
    return 'The caster cannot affect this many provinces.';
  if (
    targets
      .slice(1)
      .some((id) => !scenario.provinces.find((d) => d.id === p.id)?.adjacent.includes(id))
  )
    return 'Additional spell provinces must be adjacent to the primary target in original geography.';
  if (spell.effect === 'demagogue') {
    if (!cmd.direction) return 'Choose whether to raise or lower loyalty.';
    if (
      targets.some((id) => {
        const t = state.provinces.find((p) => p.id === id)!;
        return cmd.direction === 'raise'
          ? t.loyalty >=
              Math.max(3, scenario.initial.provinces.find((p) => p.id === id)?.loyalty ?? 3)
          : t.loyalty <= 0;
      })
    )
      return 'A selected province is already at its loyalty limit.';
  }
  if (
    spell.effect === 'death-plague' &&
    targets.some((id) => state.provinces.find((p) => p.id === id)!.level === 0)
  )
    return 'Death Plague requires populated targets.';
  if (spell.effect === 'bless-army' || spell.effect === 'mass-destruction') {
    if (!cmd.unitIds?.length || new Set(cmd.unitIds).size !== cmd.unitIds.length)
      return 'Select distinct military units.';
    const limit = spell.effect === 'bless-army' ? caster.level : Math.ceil(caster.level / 3);
    if (cmd.unitIds.length > limit) return `This caster can target at most ${limit} units.`;
    if (
      cmd.unitIds.some(
        (id) =>
          !state.armies.some(
            (a) =>
              a.provinceId === p.id &&
              (spell.effect === 'bless-army' ? a.realmId === actor : a.realmId !== actor) &&
              a.units.some((u) => u.id === id && (spell.effect !== 'bless-army' || !u.blessed)),
          ),
      )
    )
      return spell.effect === 'bless-army'
        ? 'Select your own unblessed units in the target province.'
        : 'Select foreign military units in the target province; character deployments cannot be targeted.';
  }
  if (spell.effect === 'raze') {
    const f = state.fortifications?.find(
      (f) => f.id === cmd.fortificationId && f.provinceId === p.id && f.kind === 'castle',
    );
    if (!f || (cmd.amount ?? 1) > f.level)
      return 'Choose an existing castle and a reduction no greater than its level.';
  }
  if (spell.effect === 'stronghold') {
    const f = state.fortifications?.find((f) => f.id === cmd.fortificationId);
    if (
      !cmd.fortificationId &&
      state.fortifications?.some(
        (f) =>
          f.realmId === actor && f.provinceId === p.id && f.kind === 'wizard-tower' && f.level > 0,
      )
    )
      return 'Select your existing wizard tower to improve it.';
    if (cmd.fortificationId && (!f || f.realmId !== actor || f.provinceId !== p.id))
      return 'Improve only your own castle or wizard tower here.';
    if ((f?.level ?? 0) >= Math.min(scenario.policy?.maxFort ?? 5, p.level))
      return 'The province or fort level limit prevents this Stronghold.';
  }
  if (
    spell.effect === 'dispel' &&
    !state.effects.some(
      (e) => e.id === cmd.effectId && e.provinceId === p.id && e.expiresTurn > state.turn && e.kind,
    )
  )
    return 'Select an active province realm effect to dispel; permanent changes cannot be undone.';
  return null;
}
export function applyRealmMagic(state: Campaign, scenario: Scenario, actor: string, cmd: Cast) {
  const spell = scenario.spells.find((s) => s.id === cmd.spellId)!;
  const targets = [cmd.provinceId, ...(cmd.additionalProvinces ?? [])];
  const quote = magicQuote(state, scenario, actor, cmd);
  if (spell.effect === 'alchemy')
    state.realms.find((r) => r.id === actor)!.treasury += cmd.amount ?? 1;
  if (spell.effect === 'dispel') state.effects = state.effects.filter((e) => e.id !== cmd.effectId);
  if (spell.effect === 'bless-army')
    for (const a of state.armies)
      for (const u of a.units) if (cmd.unitIds!.includes(u.id)) u.blessed = true;
  if (spell.effect === 'mass-destruction') {
    for (const a of state.armies) a.units = a.units.filter((u) => !cmd.unitIds!.includes(u.id));
    state.armies = state.armies.filter((a) => a.units.length > 0);
  }
  if (spell.effect === 'raze')
    state.fortifications!.find((f) => f.id === cmd.fortificationId)!.level -= cmd.amount ?? 1;
  if (spell.effect === 'stronghold') {
    state.fortifications ??= [];
    const fort = state.fortifications.find((f) => f.id === cmd.fortificationId);
    if (fort) fort.level++;
    else
      state.fortifications.push({
        id: `fort-${state.nextId++}`,
        realmId: actor,
        provinceId: cmd.provinceId,
        kind: 'wizard-tower',
        level: 1,
      });
  }
  for (const id of targets) {
    const p = state.provinces.find((p) => p.id === id)!;
    if (spell.effect === 'demagogue') p.loyalty += cmd.direction === 'raise' ? 1 : -1;
    if (spell.effect === 'death-plague') {
      p.level--;
      for (const type of ['law', 'guild', 'temple']) {
        const holdings = state.holdings.filter(
          (h) => h.provinceId === id && h.type === type && !h.destroyed,
        );
        let excess = holdings.reduce((n, h) => n + h.level, 0) - p.level;
        while (excess-- > 0) {
          const h = holdings
            .filter((h) => h.level > 0)
            .sort((a, b) => b.level - a.level || a.id.localeCompare(b.id))[0];
          if (h) h.level--;
        }
      }
    }
    if (['warding', 'bless-land', 'blight', 'honest-dealing'].includes(spell.effect)) {
      const kind = spell.effect as NonNullable<Campaign['effects'][number]['kind']>;
      const opposite = kind === 'bless-land' ? 'blight' : kind === 'blight' ? 'bless-land' : '';
      const countered = opposite && hasMagicEffect(state, id, opposite);
      state.effects = state.effects.filter(
        (e) => e.provinceId !== id || (e.kind !== kind && e.kind !== opposite),
      );
      if (!countered)
        state.effects.push({
          id: `effect-${state.nextId++}`,
          spellId: spell.id,
          provinceId: id,
          realmId: actor,
          kind,
          expiresTurn: state.turn + spell.duration,
          regencyCost: magicQuote(state, scenario, actor, {
            ...cmd,
            provinceId: id,
            additionalProvinces: [],
          }).regency,
        });
    }
  }
  if (state.fortifications) for (const p of state.provinces) p.fort = fortLevel(state, p);
  state.log.push({
    code: 'magic.cast',
    realmId: actor,
    turn: state.turn,
    data: {
      spell: spell.id,
      province: cmd.provinceId,
      targets: targets.length,
      gold: quote.gold,
      regency: quote.regency,
    },
  });
}
export function bloodlineProblem(state: Campaign, scenario: Scenario, actor: string) {
  return bloodlineStrength(state, scenario, actor) >= 99
    ? 'Bloodline improvement stops at 99; stronger imported bloodlines are preserved.'
    : null;
}
