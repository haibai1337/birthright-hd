import { useState, type ReactNode } from 'react';
import {
  movementCost,
  monsterEncounter,
  validateCommand,
  type Campaign,
  type Command,
  type Scenario,
} from '../../../packages/core';
export function MilitaryCouncil({
  state,
  scenario,
  selected,
  select,
  order,
}: {
  state: Campaign;
  scenario: Scenario;
  selected: string;
  select: (id: string) => void;
  order: (c: Command, label: string) => ReactNode;
}) {
  const [unitType, setUnit] = useState('pc-unit-1'),
    [armyId, setArmy] = useState(''),
    [destination, setDestination] = useState(''),
    [split, setSplit] = useState<string[]>([]),
    [joinId, setJoin] = useState('');
  const armies = state.armies.filter((a) => a.realmId === state.playerRealm),
    army =
      armies.find((a) => a.id === armyId) ??
      armies.find((a) => a.provinceId === selected) ??
      armies[0];
  const unit = scenario.units.find((u) => u.id === unitType)!,
    province = state.provinces.find((p) => p.id === selected)!;
  const neighbors = [
    ...(army && monsterEncounter(state, army) ? [army.provinceId] : []),
    ...(scenario.provinces.find((p) => p.id === army?.provinceId)?.adjacent ?? []),
  ];
  const target = neighbors.includes(destination) ? destination : (neighbors[0] ?? '');
  const recruit: Command = { type: 'RecruitUnit', provinceId: selected, unitType };
  const error = validateCommand(state, scenario, state.playerRealm, recruit);
  const name = (id: string) => scenario.provinces.find((p) => p.id === id)?.name ?? id;
  const stats = (id: string) => {
    const d = scenario.units.find((d) => d.id === id);
    return d?.pc
      ? `Melee ${d.pc.melee} · Defense ${d.pc.defense} · Missile ${d.pc.missile} · Charge ${d.pc.charge} · Morale ${d.pc.morale} · Battle move ${d.pc.move}`
      : 'Earlier unit profile';
  };
  const march: Command = army
    ? { type: 'MoveArmy', armyId: army.id, destination: target }
    : { type: 'HoldAction' };
  const moveError = army ? validateCommand(state, scenario, state.playerRealm, march) : null;
  const others = armies.filter((a) => a.id !== army?.id && a.provinceId === army?.provinceId),
    join = others.find((a) => a.id === joinId) ?? others[0];
  return (
    <>
      <div className="panel-title">
        <span className="eyebrow">THE MARSHAL’S COUNCIL</span>
        <h2>Armies & mustering</h2>
      </div>
      <div className="section-label">
        <span>RECRUIT IN {name(selected).toUpperCase()}</span>
      </div>
      <label>
        Original unit type
        <select
          aria-label="Original unit type"
          value={unitType}
          onChange={(e) => setUnit(e.target.value)}
        >
          {scenario.units
            .filter((u) => u.pc && u.recruitable)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.cost} GB · {u.upkeep} GB upkeep
              </option>
            ))}
        </select>
      </label>
      <p>{stats(unitType)}</p>
      <p className="council-note">
        Province level {unit.minLevel} · {unit.pc?.race}
        {unit.pc?.mercenary ? ' · Mercenary' : ''}. Musters this season:{' '}
        {province.musteredTurn === state.turn ? (province.musteredCount ?? 0) : 0}/{province.level}.
      </p>
      {error && <p className="council-note">{error.detail ?? error.code}</p>}
      {order(recruit, `Muster ${unit.name}`)}
      <label>
        Your army
        <select
          aria-label="Your army"
          value={army?.id ?? ''}
          onChange={(e) => {
            setArmy(e.target.value);
            setSplit([]);
            const a = armies.find((a) => a.id === e.target.value);
            if (a) select(a.provinceId);
          }}
        >
          {armies.map((a) => (
            <option key={a.id} value={a.id}>
              {name(a.provinceId)} · {a.units.length}/15 units · {a.id}
            </option>
          ))}
        </select>
      </label>
      {army && (
        <>
          <div className="unit-roster">
            {army.units.map((u) => (
              <div key={u.id}>
                <label>
                  <input
                    type="checkbox"
                    aria-label={`Split unit ${u.id}`}
                    checked={split.includes(u.id)}
                    onChange={() =>
                      setSplit(
                        split.includes(u.id) ? split.filter((id) => id !== u.id) : [...split, u.id],
                      )
                    }
                  />
                  {scenario.units.find((d) => d.id === u.type)?.name} · {u.strength}%
                  {u.blessed ? ' · Blessed' : ''}
                </label>
                <small>{stats(u.type)}</small>
                {order({ type: 'DisbandUnit', armyId: army.id, unitId: u.id }, `Disband ${u.id}`)}
              </div>
            ))}
          </div>
          {order(
            {
              type: 'SplitArmy',
              armyId: army.id,
              unitIds: split.filter((id) => army.units.some((u) => u.id === id)),
            },
            'Split selected units',
          )}
          {join && (
            <>
              <label>
                Join another army
                <select
                  aria-label="Join another army"
                  value={join.id}
                  onChange={(e) => setJoin(e.target.value)}
                >
                  {others.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} · {a.units.length} units
                    </option>
                  ))}
                </select>
              </label>
              {order({ type: 'JoinArmies', armyId: army.id, otherArmyId: join.id }, 'Join armies')}
            </>
          )}
          <label>
            March to an adjacent province
            <select
              aria-label="March destination"
              value={target}
              onChange={(e) => setDestination(e.target.value)}
            >
              {neighbors.map((id) => (
                <option key={id} value={id}>
                  {name(id)} · {movementCost(state, scenario, army, id) ?? 'impassable'} GB
                </option>
              ))}
            </select>
          </label>
          <p className="council-note">
            Marches are repeatable free orders. Pay per unit and recovered border terrain; roads
            cost nothing. Battle movement ratings do not limit strategic marches.
          </p>
          {moveError && <p className="council-note">{moveError.detail ?? moveError.code}</p>}
          {order(march, 'Issue march order')}
          <p>
            {army.retreatedTurn === state.turn
              ? 'Survivors are reorganizing until next season.'
              : 'Ready for legal marches.'}
          </p>
          {(state.characters ?? [])
            .filter((c) => c.realmId === state.playerRealm && c.provinceId === army.provinceId)
            .map((c) => (
              <p key={c.id}>
                Character present:{' '}
                {scenario.regents?.find((r) => r.id === c.regentId)?.name ?? c.sourceId}. Character
                combat and death await tactical/RPG rules.
              </p>
            ))}
        </>
      )}
    </>
  );
}
