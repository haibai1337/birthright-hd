import { useState, type ReactNode } from 'react';
import {
  availableSource,
  bloodlineStrength,
  casterProfile,
  inspectLeyLine,
  magicalHoldingLevel,
  sourcePotential,
  validateCommand,
  type Campaign,
  type Command,
  type Scenario,
} from '../../../packages/core';

const descriptions: Record<string, string> = {
  alchemy: 'Convert spent RP into the same number of GB; casting costs 1 GB.',
  'death-plague':
    'Permanently lower affected province levels by one and reduce over-capacity mundane holdings.',
  demagogue: 'Raise or lower affected provinces’ loyalty by one.',
  dispel: 'Remove a selected active province realm spell, matching its original RP expenditure.',
  'mass-destruction':
    'Destroy selected foreign military units in this province. Character deployments are excluded.',
  raze: 'Permanently lower a selected castle’s level.',
  stronghold: 'Create a level-one wizard tower or improve your selected fortification by one.',
  warding: 'Prevent foreign armies from entering or leaving until the end of the next domain turn.',
  'bless-land': 'Maximize provincial and guild/temple tax rolls at the next seasonal collection.',
  'bless-army': 'Permanently grant selected friendly units +1 offensive power.',
  blight: 'Minimize provincial and guild/temple tax rolls at the next seasonal collection.',
  'honest-dealing': 'Prevent Agitate and minimize guild income through the next domain turn.',
};
export function MagicCouncil({
  state,
  scenario,
  selected,
  order,
}: {
  state: Campaign;
  scenario: Scenario;
  selected: string;
  order: (cmd: Command, label: string) => ReactNode;
}) {
  const [spellId, setSpell] = useState(''),
    [provinceId, setProvince] = useState(''),
    [direction, setDirection] = useState<'raise' | 'lower'>('raise');
  const [amount, setAmount] = useState(1),
    [unitIds, setUnits] = useState<string[]>([]),
    [fortId, setFort] = useState(''),
    [effectId, setEffect] = useState('');
  const [additional, setAdditional] = useState<string[]>([]),
    [fromId, setFrom] = useState(''),
    [toId, setTo] = useState(''),
    [bid, setBid] = useState(0);
  const realm = state.realms.find((r) => r.id === state.playerRealm)!,
    regent = scenario.realms.find((r) => r.id === realm.id)!.regent;
  const known = realm.knownSpells ?? regent.realmSpells ?? [];
  const spell =
    scenario.spells.find((s) => s.id === spellId) ??
    scenario.spells.find((s) => known.includes(s.id) && s.implemented !== false) ??
    scenario.spells[0];
  if (!spell) return null;
  const holdings = state.holdings.filter(
    (h) => h.realmId === realm.id && h.type === spell.holding && !h.destroyed,
  );
  const base =
    holdings.find((h) => h.provinceId === provinceId)?.provinceId ??
    holdings.find((h) => h.provinceId === selected)?.provinceId ??
    holdings[0]?.provinceId ??
    selected;
  const name = (id: string) => scenario.provinces.find((p) => p.id === id)?.name ?? id;
  const neighbors = scenario.provinces.find((p) => p.id === base)?.adjacent ?? [];
  const unitTargets = state.armies
    .filter(
      (a) =>
        a.provinceId === base &&
        (spell.effect === 'bless-army' ? a.realmId === realm.id : a.realmId !== realm.id),
    )
    .flatMap((a) => a.units.map((u) => ({ ...u, realmId: a.realmId })));
  const forts =
    state.fortifications?.filter(
      (f) =>
        f.provinceId === base &&
        f.level > 0 &&
        (spell.effect === 'raze' ? f.kind === 'castle' : f.realmId === realm.id),
    ) ?? [];
  const effects = state.effects.filter(
    (e) => e.provinceId === base && e.id && e.kind && e.expiresTurn > state.turn,
  );
  const effect = effects.find((e) => e.id === effectId) ?? effects[0];
  const fort =
    forts.find((f) => f.id === fortId) ?? (spell.effect === 'raze' ? forts[0] : undefined);
  const multi = [
    'death-plague',
    'demagogue',
    'warding',
    'bless-land',
    'blight',
    'honest-dealing',
  ].includes(spell.effect);
  const command: Command = {
    type: 'CastRealmSpell',
    spellId: spell.id,
    provinceId: base,
    ...(multi ? { additionalProvinces: additional.filter((id) => neighbors.includes(id)) } : {}),
    ...(spell.effect === 'demagogue' ? { direction } : {}),
    ...(['alchemy', 'raze'].includes(spell.effect) ? { amount } : {}),
    ...(['bless-army', 'mass-destruction'].includes(spell.effect)
      ? { unitIds: unitIds.filter((id) => unitTargets.some((u) => u.id === id)) }
      : {}),
    ...(fort ? { fortificationId: fort.id } : {}),
    ...(effect ? { effectId: effect.id } : {}),
  };
  const error = validateCommand(state, scenario, realm.id, command);
  const sources = state.holdings.filter(
    (h) => h.realmId === realm.id && h.type === 'source' && !h.destroyed,
  );
  const from = sources.find((h) => h.id === fromId) ?? sources[0],
    to =
      sources.find((h) => h.id === toId && h.id !== from?.id) ??
      sources.find((h) => h.id !== from?.id);
  const caster = casterProfile(scenario, realm.id, spell.holding as 'source' | 'temple');
  const toggle = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  return (
    <>
      <div className="section-label">
        <span>BLOODLINE & REGENCY</span>
      </div>
      <p>
        {regent.classes?.map((c) => `${c.type} ${c.level}`).join(' / ') ?? regent.class} ·{' '}
        {regent.bloodline.derivation} ·{' '}
        {['Tainted', 'Minor', 'Major', 'Great', 'True'][regent.bloodline.grade ?? -1] ??
          'Grade unresolved'}{' '}
        · Strength {bloodlineStrength(state, scenario, realm.id)} · {realm.regency} stored RP.
      </p>
      <p className="council-note">
        Collection is limited by bloodline strength and applicable domain power. Buying strength is
        a free order costing current strength + 1 RP.
      </p>
      {order({ type: 'IncreaseBloodline' }, 'Increase bloodline strength')}
      <p>
        Recovered blood abilities:{' '}
        {regent.bloodline.abilities.length
          ? regent.bloodline.abilities
              .map((a) => a.replace(/^blood-/, '').replaceAll('-', ' '))
              .join(', ')
          : regent.inventoryVerified
            ? 'none in the starting inventory'
            : 'inventory unresolved'}
        .
      </p>
      <div className="section-label">
        <span>REALM MAGIC</span>
      </div>
      <label>
        Realm spell
        <select
          aria-label="Realm spell"
          value={spell.id}
          onChange={(e) => {
            setSpell(e.target.value);
            setUnits([]);
            setAdditional([]);
            setAmount(1);
            setFort('');
          }}
        >
          {scenario.spells.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {!known.includes(s.id) ? ' · not known' : ''}
              {s.implemented === false ? ' · unavailable' : ''}
            </option>
          ))}
        </select>
      </label>
      <p>{descriptions[spell.effect] ?? spell.unavailableReason}</p>
      <label>
        Casting province
        <select
          aria-label="Magic casting province"
          value={base}
          onChange={(e) => {
            setProvince(e.target.value);
            setUnits([]);
            setAdditional([]);
            setFort('');
          }}
        >
          {!holdings.length && <option value={base}>No local {spell.holding} holding</option>}
          {holdings.map((h) => (
            <option key={h.id} value={h.provinceId}>
              {name(h.provinceId)} · {spell.holding} {h.level}
              {h.contested ? ' · contested' : ''}
            </option>
          ))}
        </select>
      </label>
      <p className="council-note">
        Requires {spell.holding} {spell.minLevel} and caster level {spell.casterLevel ?? 1}.
        Available:{' '}
        {magicalHoldingLevel(state, realm.id, base, spell.holding as 'source' | 'temple')}; caster{' '}
        {caster?.level ?? 'ineligible'}.
        {spell.holding === 'source' &&
          ` Province source potential: ${sourcePotential(scenario, base, state.provinces.find((p) => p.id === base)?.level ?? 0)}. Linked sources share the highest level.`}
      </p>
      {['alchemy', 'raze'].includes(spell.effect) && (
        <label>
          {spell.effect === 'alchemy' ? 'GB to create' : 'Castle levels to remove'}
          <input
            aria-label="Spell amount"
            type="number"
            min="1"
            max="10000"
            value={amount}
            onChange={(e) =>
              setAmount(Math.max(1, Math.min(10000, Math.floor(Number(e.target.value) || 1))))
            }
          />
        </label>
      )}
      {spell.effect === 'demagogue' && (
        <label>
          Loyalty change
          <select
            aria-label="Magical loyalty change"
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'raise' | 'lower')}
          >
            <option value="raise">Raise loyalty</option>
            <option value="lower">Lower loyalty</option>
          </select>
        </label>
      )}
      {multi && (
        <details>
          <summary>Additional adjacent provinces</summary>
          {neighbors.map((id) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={additional.includes(id)}
                onChange={() => setAdditional(toggle(additional, id))}
              />
              {name(id)}
            </label>
          ))}
        </details>
      )}
      {['bless-army', 'mass-destruction'].includes(spell.effect) && (
        <fieldset>
          <legend>Military spell targets</legend>
          {unitTargets.map((u) => (
            <label key={u.id}>
              <input
                type="checkbox"
                aria-label={`Target unit ${u.id}`}
                checked={unitIds.includes(u.id)}
                onChange={() => setUnits(toggle(unitIds, u.id))}
              />
              {scenario.units.find((d) => d.id === u.type)?.name} ·{' '}
              {scenario.realms.find((r) => r.id === u.realmId)?.name}
              {u.blessed ? ' · blessed' : ''}
            </label>
          ))}
          {!unitTargets.length && <p>No eligible military units here.</p>}
        </fieldset>
      )}
      {['raze', 'stronghold'].includes(spell.effect) && (
        <label>
          Fortification
          <select
            aria-label="Spell fortification"
            value={fort?.id ?? ''}
            onChange={(e) => setFort(e.target.value)}
          >
            <option value="">
              {spell.effect === 'stronghold' ? 'Create new wizard tower' : 'Select a castle'}
            </option>
            {forts.map((f) => (
              <option key={f.id} value={f.id}>
                {f.kind} {f.level} · {scenario.realms.find((r) => r.id === f.realmId)?.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {spell.effect === 'dispel' && (
        <label>
          Effect to dispel
          <select
            aria-label="Dispel target effect"
            value={effect?.id ?? ''}
            onChange={(e) => setEffect(e.target.value)}
          >
            {!effects.length && <option value="">No active province effect</option>}
            {effects.map((e) => (
              <option key={e.id} value={e.id}>
                {scenario.spells.find((s) => s.id === e.spellId)?.name} · {e.regencyCost} RP
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <p className="council-note">{error.detail ?? error.code}</p>}
      {order(command, 'Cast realm spell')}
      <div className="section-label">
        <span>ACTIVE REALM EFFECTS</span>
      </div>
      {state.effects
        .filter((e) => e.realmId === realm.id || e.provinceId === base)
        .map((e) => (
          <p key={e.id ?? `${e.spellId}-${e.provinceId}`}>
            {scenario.spells.find((s) => s.id === e.spellId)?.name} · {name(e.provinceId)} ·{' '}
            {Math.max(0, e.expiresTurn - state.turn)} seasonal boundaries remaining ·{' '}
            {scenario.realms.find((r) => r.id === e.realmId)?.name}
          </p>
        ))}
      <div className="section-label">
        <span>LEY LINES</span>
      </div>
      <p className="council-note">
        Link two sources you own. Cost is one GB and RP per province edge, plus your optional RP
        bid. No territorial ownership or alliance is required. Networks share their highest source,
        and have no recurring upkeep.
      </p>
      {sources.map((h) => (
        <p key={h.id}>
          {name(h.provinceId)}: local {h.level}, network{' '}
          {availableSource(state, realm.id, h.provinceId)}
          {h.contested ? ' · contested' : ''}.
        </p>
      ))}
      {(state.leyLines ?? [])
        .filter((l) => l.realmId === realm.id)
        .map((l) => {
          const info = inspectLeyLine(state, l);
          return (
            <p key={l.id}>
              {name(state.holdings.find((h) => h.id === l.fromHoldingId)!.provinceId)} ↔{' '}
              {name(state.holdings.find((h) => h.id === l.toHoldingId)!.provinceId)} · {info.status}
              {info.reason ? ` · ${info.reason}` : ''}
            </p>
          );
        })}
      {from && to && (
        <>
          <label>
            Origin source
            <select
              aria-label="Ley origin source"
              value={from.id}
              onChange={(e) => setFrom(e.target.value)}
            >
              {sources.map((h) => (
                <option key={h.id} value={h.id}>
                  {name(h.provinceId)} · {h.level}
                </option>
              ))}
            </select>
          </label>
          <label>
            Destination source
            <select
              aria-label="Ley destination source"
              value={to.id}
              onChange={(e) => setTo(e.target.value)}
            >
              {sources
                .filter((h) => h.id !== from.id)
                .map((h) => (
                  <option key={h.id} value={h.id}>
                    {name(h.provinceId)} · {h.level}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Offensive RP bid
            <input
              aria-label="Ley Regency bid"
              type="number"
              min="0"
              max="10000"
              value={bid}
              onChange={(e) =>
                setBid(Math.max(0, Math.min(10000, Math.floor(Number(e.target.value) || 0))))
              }
            />
          </label>
          {order(
            { type: 'ForgeLeyLine', fromHoldingId: from.id, toHoldingId: to.id, regencyBid: bid },
            'Forge ley line',
          )}
        </>
      )}
      <p className="council-note">
        Realm spell research and acquisition beyond recovered inventories are unresolved.
        Unsupported spells remain unavailable with their reason shown above.
      </p>
    </>
  );
}
