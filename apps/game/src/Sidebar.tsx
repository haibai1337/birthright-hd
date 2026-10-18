import { useEffect, useState } from 'react';
import { EconomyCouncil } from './EconomyCouncil';
import { MagicCouncil } from './MagicCouncil';
import {
  commandCost,
  forecast,
  relation,
  sourcePotential,
  treatyAcceptance,
  validateCommand,
  investitureTerms,
  investitureProblem,
  mayInvade,
  provinceController,
  unitsHere,
  domainActionQuote,
  usesPCDomainActions,
  bloodlineStrength,
  type Campaign,
  type Command,
  type Scenario,
} from '../../../packages/core';
import { Herald } from '../../../packages/ui/Herald';
import { Icon } from '../../../packages/ui/Icon';
import {
  errors,
  logText,
  loyaltyNames,
  playerJournal,
  season,
  signed,
  domainActionNames,
} from '../../../packages/ui/strings';
export type Panel = 'province' | 'military' | 'diplomacy' | 'chronicle' | 'realm';
interface Props {
  state: Campaign;
  scenario: Scenario;
  selected: string;
  panel: Panel;
  select: (id: string) => void;
  issue: (cmd: Command) => void;
}
function Order({
  command,
  children,
  state,
  scenario,
  issue,
  icon = 'plus',
}: {
  command: Command;
  children: React.ReactNode;
  state: Campaign;
  scenario: Scenario;
  issue: (cmd: Command) => void;
  icon?: string;
}) {
  const error = validateCommand(state, scenario, state.playerRealm, command),
    cost = commandCost(state, scenario, command);
  const quote = usesPCDomainActions(scenario)
    ? domainActionQuote(state, scenario, state.playerRealm, command)
    : null;
  return (
    <button
      className="order"
      disabled={!!error}
      title={
        error
          ? (error.detail ?? errors[error.code])
          : `${cost.gold} GB · ${cost.regency} RP · ${cost.actions} action`
      }
      onClick={() => issue(command)}
    >
      <span className="order-icon">
        <Icon name={icon} />
      </span>
      <span>
        <strong>{children}</strong>
        <small>
          {cost.gold} GB {cost.regency > 0 && ` · ${cost.regency} RP`} ·{' '}
          {cost.actions === 0 ? 'Free' : `${cost.actions} action`}
          {quote &&
            ` · ${quote.checks.map((c) => `${Math.max(0, Math.min(100, (21 - Math.max(1, c.threshold)) * 5))}%`).join(', ')} before opposition`}
        </small>
      </span>
      <Icon name="chevron" size={14} />
    </button>
  );
}
export function Sidebar({ state, scenario, selected, panel, select, issue }: Props) {
  const [armyId, setArmyId] = useState('');
  const [destination, setDestination] = useState('');
  const [regencyBid, setRegencyBid] = useState(0);
  const [domainBid, setDomainBid] = useState(0);
  const [goldBid, setGoldBid] = useState(0);
  const [responseRP, setResponseRP] = useState(0);
  const [holdingType, setHoldingType] = useState<'law' | 'guild' | 'temple' | 'source'>('law');
  const [targetHolding, setTargetHolding] = useState('');
  const [selectedHoldings, setSelectedHoldings] = useState<string[]>([]);
  const pending = state.pendingDomainAction;
  useEffect(() => setResponseRP(0), [pending]);
  const province = state.provinces.find((p) => p.id === selected);
  const def = scenario.provinces.find((p) => p.id === selected);
  const player = scenario.realms.find((r) => r.id === state.playerRealm);
  const owner = scenario.realms.find((r) => r.id === province?.owner);
  if (!province || !def || !player || !owner) return null;
  const owned =
    province.owner === state.playerRealm &&
    (!province.occupiedBy || province.occupiedBy === state.playerRealm);
  const controlled = provinceController(province) === state.playerRealm && !province.contested;
  const terms = investitureTerms(state, scenario, province, state.playerRealm, regencyBid);
  const pc = usesPCDomainActions(scenario);
  const holdings = state.holdings.filter((h) => h.provinceId === selected && !h.destroyed);
  const foreign = holdings.filter((h) => h.realmId !== state.playerRealm);
  const contestTarget = foreign.find((h) => h.id === targetHolding) ?? foreign[0];
  const armies = state.armies.filter((a) => a.realmId === state.playerRealm);
  const army =
    armies.find((a) => a.id === armyId) ??
    armies.find((a) => a.provinceId === selected) ??
    armies[0];
  const neighbors = scenario.provinces.find((p) => p.id === army?.provinceId)?.adjacent ?? [];
  const target = neighbors.includes(destination) ? destination : (neighbors[0] ?? '');
  const income = forecast(state, scenario, state.playerRealm);
  const order = (command: Command, text: string, icon = 'plus') => (
    <Order
      key={JSON.stringify(command)}
      state={state}
      scenario={scenario}
      issue={issue}
      command={command}
      icon={icon}
    >
      {text}
    </Order>
  );
  return (
    <aside className="sidebar" aria-label="Realm council">
      <div className="sidebar-scroll">
        {pending &&
          (() => {
            const check = pending.checks[pending.index]!;
            const defense = pending.opposition.reduce((n, o) => n + o.regency, 0);
            const threshold = Math.max(
              1,
              check.threshold +
                defense -
                pending.extraRegency +
                (pending.stage === 'defend' ? responseRP : -responseRP),
            );
            return (
              <section aria-label="Regency opposition">
                <div className="panel-title">
                  <h2>
                    {pending.stage === 'defend'
                      ? 'Defend your domain'
                      : 'Opposition to your action'}
                  </h2>
                </div>
                <p>
                  {scenario.realms.find((r) => r.id === pending.actor)?.name}:{' '}
                  {domainActionNames[pending.command.type] ?? pending.command.type} in{' '}
                  {scenario.provinces.find((p) => p.id === check.provinceId)?.name}.
                </p>
                {pending.opposition.map((o) => (
                  <p key={o.realmId}>
                    {scenario.realms.find((r) => r.id === o.realmId)?.name}: {o.regency} RP
                    opposition committed.
                  </p>
                ))}
                <p>
                  Attacker success: {Math.max(0, Math.min(100, (21 - threshold) * 5))}% · d20 ≥{' '}
                  {threshold}. Action costs are committed; opposition uses no domain action.
                </p>
                <label className="select-label" htmlFor="response-rp">
                  {pending.stage === 'defend'
                    ? 'Defensive RP opposition'
                    : 'Additional offensive RP'}
                </label>
                <input
                  id="response-rp"
                  type="number"
                  min="0"
                  max={state.realms.find((r) => r.id === state.playerRealm)?.regency ?? 0}
                  value={responseRP}
                  onChange={(e) =>
                    setResponseRP(Math.max(0, Math.floor(Number(e.target.value) || 0)))
                  }
                />
                {order(
                  { type: 'RespondDomainAction', regency: responseRP },
                  'Resolve domain action',
                  'crown',
                )}
              </section>
            );
          })()}
        {panel === 'province' && (
          <>
            <div className="province-title">
              <span className="eyebrow">PROVINCE OF {owner.adjective.toUpperCase()}</span>
              <div>
                <h2>{def.name}</h2>
                <Herald realm={owner} size={40} />
              </div>
              <p>
                {def.terrain.charAt(0).toUpperCase() + def.terrain.slice(1)} <span>·</span>{' '}
                {owned ? 'Your sovereign territory' : 'Foreign territory'}
              </p>
              {province.occupiedBy && (
                <p>
                  Occupied by {scenario.realms.find((r) => r.id === province.occupiedBy)?.name}.
                  Sovereignty: {owner.name}.
                </p>
              )}
              {province.contested && <p>Province is contested.</p>}
            </div>

            {province.occupiedBy === state.playerRealm && (
              <section aria-label="Investiture">
                <div className="section-label">
                  <span>INVESTITURE</span>
                </div>
                <p>
                  Garrison: {unitsHere(state, selected, state.playerRealm)} / {terms.garrison} units
                  required.
                </p>
                <p>
                  {investitureProblem(state, province, state.playerRealm) ??
                    'Occupation maintained across the season. Ready to invest.'}
                </p>
                <label className="select-label" htmlFor="investiture-regency">
                  Regency to support the roll
                </label>
                <select
                  id="investiture-regency"
                  value={regencyBid}
                  onChange={(e) => setRegencyBid(Number(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i} value={i}>
                      {i} RP · {(21 - Math.max(1, 10 - i)) * 5}% success
                    </option>
                  ))}
                </select>
                <p>
                  {terms.gold} GB · {terms.regency} RP · 1 action. Roll d20 ≥ {terms.threshold}. A
                  failed roll still spends the cost.
                </p>
                {order(
                  { type: 'InvestProvince', provinceId: selected, regencyBid },
                  'Invest province',
                  'crown',
                )}
              </section>
            )}

            <div className="province-stats">
              <div>
                <strong data-testid="province-level">
                  {province.level}
                  <small> / {def.maxLevel}</small>
                </strong>
                <span>PROVINCE</span>
              </div>
              <div>
                <strong>{sourcePotential(scenario, selected, province.level)}</strong>
                <span>SOURCE POTENTIAL</span>
              </div>
              <div>
                <strong>{province.fort}</strong>
                <span>FORTIFICATION</span>
              </div>
            </div>
            <div className="loyalty">
              <div>
                <span>Popular loyalty</span>
                <strong>{loyaltyNames[province.loyalty]}</strong>
              </div>
              <div className="loyalty-track">
                {[0, 1, 2, 3, 4].map((i) => (
                  <i key={i} className={i <= province.loyalty ? 'active' : ''} />
                ))}
              </div>
            </div>
            <div className="section-label">
              <span>HOLDINGS & INFLUENCE</span>
              <span>LEVEL</span>
            </div>
            <div className="holdings">
              {holdings.map((h) => (
                <div key={h.id}>
                  <span className={`holding-dot ${h.type}`} />
                  <span>
                    <strong>
                      {pc && h.realmId === state.playerRealm && (
                        <input
                          type="checkbox"
                          aria-label={`Select ${h.type} for Rule`}
                          checked={selectedHoldings.includes(h.id)}
                          onChange={(e) =>
                            setSelectedHoldings((ids) =>
                              e.target.checked ? [...ids, h.id] : ids.filter((id) => id !== h.id),
                            )
                          }
                        />
                      )}{' '}
                      {h.type}
                      {h.contested ? ' · Contested' : ''}
                    </strong>
                    <small>{scenario.realms.find((r) => r.id === h.realmId)?.adjective}</small>
                  </span>
                  <span className="holding-level">{h.level}</span>
                  {h.realmId === state.playerRealm && (
                    <button
                      className="tiny-button"
                      aria-label={`Improve ${h.type} holding`}
                      title={
                        validateCommand(state, scenario, state.playerRealm, {
                          type: 'ImproveHolding',
                          holdingId: h.id,
                          regencyBid: domainBid,
                        })
                          ? 'Holding is at capacity or resources are insufficient'
                          : 'Improve holding · 1 action'
                      }
                      disabled={
                        !!validateCommand(state, scenario, state.playerRealm, {
                          type: 'ImproveHolding',
                          holdingId: h.id,
                          regencyBid: domainBid,
                        })
                      }
                      onClick={() =>
                        issue({ type: 'ImproveHolding', holdingId: h.id, regencyBid: domainBid })
                      }
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
            {pc && (
              <section aria-label="Holding domain actions">
                <label className="select-label" htmlFor="domain-rp">
                  Offensive Regency bid per target
                </label>
                <input
                  id="domain-rp"
                  type="number"
                  min="0"
                  max="10000"
                  value={domainBid}
                  onChange={(e) =>
                    setDomainBid(Math.max(0, Math.floor(Number(e.target.value) || 0)))
                  }
                />
                <label className="select-label" htmlFor="holding-type">
                  Create level-zero holding
                </label>
                <select
                  id="holding-type"
                  value={holdingType}
                  onChange={(e) => setHoldingType(e.target.value as typeof holdingType)}
                >
                  {(['law', 'guild', 'temple', 'source'] as const).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {order(
                  {
                    type: 'CreateHolding',
                    provinceId: selected,
                    holdingType,
                    regencyBid: domainBid,
                  },
                  'Create holding',
                )}
                {selectedHoldings.length > 0 &&
                  order(
                    {
                      type: 'RuleHoldings',
                      holdings: selectedHoldings.map((holdingId) => ({
                        holdingId,
                        regencyBid: domainBid,
                      })),
                    },
                    `Rule selected holdings (${selectedHoldings.length})`,
                  )}
                {!!foreign.length && (
                  <>
                    <label className="select-label" htmlFor="contest-holding">
                      Contest another domain's holding
                    </label>
                    <select
                      id="contest-holding"
                      value={contestTarget?.id}
                      onChange={(e) => setTargetHolding(e.target.value)}
                    >
                      {foreign.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.type} {h.level} ·{' '}
                          {scenario.realms.find((r) => r.id === h.realmId)?.name}
                          {h.contested ? ' · Contested' : ''}
                        </option>
                      ))}
                    </select>
                    {contestTarget &&
                      order(
                        {
                          type: 'ContestHolding',
                          holdingId: contestTarget.id,
                          regencyBid: domainBid,
                        },
                        'Contest holding',
                        'sword',
                      )}
                  </>
                )}
                <label className="select-label" htmlFor="agitate-gold">
                  Additional Gold Bars for Agitate
                </label>
                <input
                  id="agitate-gold"
                  type="number"
                  min="0"
                  max="10000"
                  value={goldBid}
                  onChange={(e) => setGoldBid(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                />
                {order(
                  {
                    type: 'Agitate',
                    targets: [
                      { provinceId: selected, direction: 'raise', regencyBid: domainBid, goldBid },
                    ],
                  },
                  'Agitate · raise loyalty',
                )}
                {order(
                  {
                    type: 'Agitate',
                    targets: [
                      { provinceId: selected, direction: 'lower', regencyBid: domainBid, goldBid },
                    ],
                  },
                  'Agitate · lower loyalty',
                )}
              </section>
            )}
            {!!state.fortifications?.some((f) => f.provinceId === selected) && (
              <div className="original-forts">
                <h4>Fortifications</h4>
                {state.fortifications
                  .filter((f) => f.provinceId === selected)
                  .map((f) => (
                    <p key={f.id}>
                      {f.kind} {f.level} · {scenario.realms.find((r) => r.id === f.realmId)?.name}
                    </p>
                  ))}
              </div>
            )}
            {!!state.characters?.some((c) => c.provinceId === selected) && (
              <details>
                <summary>Character deployments</summary>
                {state.characters
                  .filter((c) => c.provinceId === selected)
                  .map((c) => (
                    <p key={c.id}>
                      {scenario.regents?.find((r) => r.id === c.regentId)?.name ??
                        `Original character ${c.typeCode}`}{' '}
                      · {scenario.realms.find((r) => r.id === c.realmId)?.name}
                    </p>
                  ))}
              </details>
            )}
            {def.movement && (
              <details>
                <summary>Directed movement links</summary>
                {def.movement.map((edge) => (
                  <p key={edge.to}>
                    <button onClick={() => select(edge.to)}>
                      {scenario.provinces.find((p) => p.id === edge.to)?.name}
                    </button>{' '}
                    · code {edge.code}
                  </p>
                ))}
              </details>
            )}
            {(controlled || (pc && owned && !province.militaryContested)) && (
              <>
                <div className="section-label">
                  <span>DOMAIN ORDERS</span>
                  <span>
                    {state.realms.find((r) => r.id === state.playerRealm)?.actions} REMAIN
                  </span>
                </div>
                {owned &&
                  order(
                    { type: 'DevelopProvince', provinceId: selected, regencyBid: domainBid },
                    'Rule province',
                    'castle',
                  )}
                {owned &&
                  order({ type: 'Fortify', provinceId: selected }, 'Fortify defenses', 'castle')}
                {order(
                  { type: 'PillageProvince', provinceId: selected },
                  'Pillage province',
                  'sword',
                )}
                <label className="select-label" htmlFor="tax-policy">
                  Tax policy · free order
                </label>
                <select
                  id="tax-policy"
                  value={province.tax}
                  disabled={
                    !!validateCommand(state, scenario, state.playerRealm, {
                      type: 'ChangeTaxPolicy',
                      provinceId: selected,
                      tax: province.tax,
                    })
                  }
                  onChange={(e) =>
                    issue({
                      type: 'ChangeTaxPolicy',
                      provinceId: selected,
                      tax: e.target.value as 'light' | 'moderate' | 'severe',
                    })
                  }
                >
                  <option value="light">Light · improves loyalty</option>
                  <option value="moderate">Moderate · balanced</option>
                  <option value="severe">Severe · lowers loyalty</option>
                </select>
                {owned &&
                  scenario.spells.map((s) =>
                    order(
                      { type: 'CastRealmSpell', provinceId: selected, spellId: s.id },
                      s.name,
                      'star',
                    ),
                  )}
              </>
            )}
            {!owned && (
              <p className="council-note">
                Holdings may belong to several regents. Province sovereignty and domain influence
                are separate.
              </p>
            )}
            <p className="council-note">
              {pc
                ? 'Rule uses a seeded d20 check. Contested holdings produce no income or regency; Rule restores them. Elven development preserves source potential.'
                : 'Development strengthens income and weakens magical sources.'}
            </p>
          </>
        )}
        {panel === 'military' && (
          <>
            <div className="panel-title">
              <span className="eyebrow">THE MARSHAL’S COUNCIL</span>
              <h2>Armies & mustering</h2>
              <p>Raise the banners. Guard the borders.</p>
            </div>
            <div className="section-label">
              <span>RECRUIT IN {def.name.toUpperCase()}</span>
            </div>
            {!controlled ? (
              <p>Select one of your provinces on the map to recruit.</p>
            ) : (
              scenario.units
                .filter((u) => u.recruitable !== false)
                .map((u) =>
                  order(
                    { type: 'RecruitUnit', provinceId: selected, unitType: u.id },
                    `${u.name} · ${u.upkeep} GB upkeep`,
                    'sword',
                  ),
                )
            )}
            <div className="section-label">
              <span>YOUR ARMIES</span>
              <span>{armies.length}</span>
            </div>
            {armies.map((a) => (
              <button
                className={`army-card ${army?.id === a.id ? 'selected' : ''}`}
                key={a.id}
                onClick={() => {
                  setArmyId(a.id);
                  select(a.provinceId);
                }}
              >
                <Icon name="sword" />
                <span>
                  <strong>{scenario.provinces.find((p) => p.id === a.provinceId)?.name}</strong>
                  <small>
                    {a.units.length} units · {a.moved ? 'March completed' : 'Ready to march'}
                  </small>
                </span>
                <span className="unit-number">{a.units.length}</span>
              </button>
            ))}
            {army && (
              <>
                <div className="unit-roster">
                  {army.units.map((u) => (
                    <span key={u.id}>
                      {scenario.units.find((d) => d.id === u.type)?.name} <b>{u.strength}%</b>
                    </span>
                  ))}
                </div>
                <label className="select-label" htmlFor="destination">
                  March to an adjacent province
                </label>
                <select
                  id="destination"
                  value={target}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  {neighbors.map((id) => (
                    <option key={id} value={id}>
                      {scenario.provinces.find((p) => p.id === id)?.name}
                    </option>
                  ))}
                </select>
                {order(
                  { type: 'MoveArmy', armyId: army.id, destination: target },
                  'Issue march order',
                  'arrow',
                )}
                {validateCommand(state, scenario, state.playerRealm, {
                  type: 'MoveArmy',
                  armyId: army.id,
                  destination: target,
                }) && (
                  <p className="council-note">
                    {
                      errors[
                        validateCommand(state, scenario, state.playerRealm, {
                          type: 'MoveArmy',
                          armyId: army.id,
                          destination: target,
                        })?.code ?? 'INVALID_TARGET'
                      ]
                    }
                  </p>
                )}
              </>
            )}
            <p className="council-note">
              One march per army each season.{' '}
              {pc ? 'Marching and mustering do not consume a domain action. ' : ''}War or an
              alliance is required to enter foreign land. Battles compare troop strength, terrain,
              forts, and wards; the stronger force prevails.
            </p>
          </>
        )}
        {panel === 'diplomacy' && (
          <>
            <div className="panel-title">
              <span className="eyebrow">THE CHANCELLOR’S COUNCIL</span>
              <h2>Oaths & rivalries</h2>
              <p>A crown is never held alone.</p>
            </div>
            {scenario.realms
              .filter((r) => r.id !== state.playerRealm && r.controller !== 'passive')
              .map((r) => {
                const treaty = relation(state, state.playerRealm, r.id);
                return (
                  <section className="diplomacy-card" key={r.id}>
                    <div className="diplomacy-heading">
                      <Herald realm={r} size={42} />
                      <div>
                        <h3>{r.name}</h3>
                        <p>{r.regent.name}</p>
                        <span className={`treaty-badge ${treaty?.kind}`}>
                          {treaty?.kind ?? 'peace'} · Relations {signed(treaty?.opinion ?? 0)}
                        </span>
                        {treaty?.kind === 'war' && (
                          <small>
                            {mayInvade(state, state.playerRealm, r.id)
                              ? 'Your army may invade.'
                              : 'Defensive war: declare war to invade their lands.'}
                          </small>
                        )}
                      </div>
                    </div>
                    {state.realms.find((s) => s.id === r.id)?.eliminated ? (
                      <p>This realm has fallen.</p>
                    ) : (
                      (['pact', 'alliance', 'peace', 'war'] as const)
                        .filter(
                          (kind) =>
                            kind !== treaty?.kind ||
                            (kind === 'war' && !mayInvade(state, state.playerRealm, r.id)),
                        )
                        .map((kind) => (
                          <div key={kind}>
                            {order(
                              { type: 'ProposeTreaty', target: r.id, kind },
                              kind === 'war' ? 'Declare war' : `Propose ${kind}`,
                              'diplomacy',
                            )}
                            {kind !== 'war' && (
                              <small className="acceptance">
                                {treatyAcceptance(state, scenario, state.playerRealm, r.id, kind)
                                  ? 'Their council is willing to accept.'
                                  : 'Their council is likely to decline.'}
                              </small>
                            )}
                          </div>
                        ))
                    )}
                  </section>
                );
              })}
            <p className="council-note">
              Alliances grant passage. A declaration permits only the declaring realm to invade; the
              defender can liberate its own land. Classic declarations expire at season end.
              Occupation persists while troops remain.
            </p>
          </>
        )}
        {panel === 'chronicle' && (
          <>
            <div className="panel-title">
              <span className="eyebrow">THE REALM CHRONICLE</span>
              <h2>From the council</h2>
              <p>The record of your reign.</p>
            </div>
            <div className="journal">
              {playerJournal(state)
                .slice()
                .reverse()
                .slice(0, 60)
                .map((e, i) => (
                  <article key={`${state.log.length}-${i}`}>
                    <span className="journal-mark">
                      {e.code.startsWith('battle') ? (
                        <Icon name="sword" size={16} />
                      ) : (
                        <Icon name="scroll" size={16} />
                      )}
                    </span>
                    <small>{season(e.turn)}</small>
                    <p>{logText(e, scenario)}</p>
                  </article>
                ))}
            </div>
          </>
        )}
        {panel === 'realm' && (
          <>
            {pc && (
              <>
                <p>
                  Domain action round {state.domainTurn?.round} of 3. One regular action per round;
                  free orders and RP defense do not advance it.
                </p>
                {order({ type: 'HoldAction' }, 'Hold action · next round')}
              </>
            )}
            <div className="panel-title">
              <span className="eyebrow">THE REGENT’S COUNCIL</span>
              <h2>{player.name}</h2>
              <p>{player.motto}</p>
            </div>
            <div className="regent">
              <Herald realm={player} size={76} />
              <div>
                <h3>{player.regent.name}</h3>
                <p>{player.regent.class} regent</p>
                <small>
                  {player.regent.bloodline.derivation} bloodline · Strength{' '}
                  {bloodlineStrength(state, scenario, player.id)}
                </small>
              </div>
            </div>
            <div className="section-label">
              <span>SEASONAL FORECAST</span>
              <span>GB</span>
            </div>
            <dl className="ledger">
              <div>
                <dt>Province taxation</dt>
                <dd>~{Number(income.taxes.toFixed(2))}</dd>
              </div>
              <div>
                <dt>Guild & temple holdings</dt>
                <dd>~{Number(income.holdings.toFixed(2))}</dd>
              </div>
              <div>
                <dt>Trade routes</dt>
                <dd>+{income.trade}</dd>
              </div>
              {pc && (
                <>
                  <div>
                    <dt>Law Claims (net)</dt>
                    <dd>{signed(income.lawClaims ?? 0)}</dd>
                  </div>
                  <div>
                    <dt>Tribute received / paid</dt>
                    <dd>
                      +{income.tributeIn} / −{income.tributeOut}
                    </dd>
                  </div>
                  <div>
                    <dt>Administration</dt>
                    <dd>−{income.administration}</dd>
                  </div>
                  <div>
                    <dt>Fort upkeep</dt>
                    <dd>−{income.forts}</dd>
                  </div>
                  <div>
                    <dt>Occupation surcharge</dt>
                    <dd>−{income.occupation}</dd>
                  </div>
                  <div>
                    <dt>Court</dt>
                    <dd>−{income.court}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>{pc ? 'Total nonmilitary upkeep' : 'Domain & fort maintenance'}</dt>
                <dd>−{income.maintenance}</dd>
              </div>
              <div>
                <dt>Military upkeep</dt>
                <dd>−{income.military}</dd>
              </div>
              <div className="total">
                <dt>Estimated net income</dt>
                <dd>{signed(income.net)}</dd>
              </div>
              <div>
                <dt>Regency collection</dt>
                <dd>+{income.regency} RP</dd>
              </div>
            </dl>
            <p className="council-note">
              Tax and holding forecasts are expected values of seeded dice rolls. Action costs are
              already paid and excluded here. Tribute assumes the payer can afford it. Regency is
              capped by bloodline strength; thieves also receive trade regency.
            </p>
            {state.reports
              .filter((r) => r.realmId === state.playerRealm)
              .slice(-1)
              .map((r) => (
                <div className="last-report" key={r.turn}>
                  <span className="eyebrow">LAST SEASON’S ACCOUNTS</span>
                  <p>
                    Tax {r.taxes} + holdings {r.holdings} + trade {r.trade} − upkeep{' '}
                    {r.maintenance + r.military}
                  </p>
                  <strong>
                    {signed(r.net)} GB · +{r.regency} RP
                  </strong>
                  {pc && (
                    <p>
                      Claims {signed(r.lawClaims ?? 0)}; tribute +{r.tributeIn ?? 0} / −
                      {r.tributeOut ?? 0}. Treasury {r.opening} → {r.closing}. Unpaid costs{' '}
                      {r.unpaid ?? 0} GB; army paid with {r.regencyUpkeep ?? 0} RP.
                    </p>
                  )}
                </div>
              ))}
            {pc && (
              <MagicCouncil state={state} scenario={scenario} selected={selected} order={order} />
            )}
            {pc && <EconomyCouncil state={state} scenario={scenario} order={order} />}
            <div className="section-label">
              <span>YOUR OBJECTIVE</span>
            </div>
            <p>
              {scenario.victory.metric === 'domain-power'
                ? `Reach domain power ${scenario.victory.target}, or lead in domain power after ${scenario.victory.turns} seasons.`
                : scenario.victory.metric === 'holding-levels'
                  ? `Reach ${scenario.victory.target} holding levels, or lead after ${scenario.victory.turns} seasons.`
                  : `Control ${scenario.victory.provinces} provinces, or hold the greatest total province level after ${scenario.victory.turns} seasons.`}
            </p>
            <p className="council-note">
              You hold {state.provinces.filter((p) => p.owner === state.playerRealm).length} of{' '}
              {scenario.provinces.length} provinces.{' '}
              {scenario.policy?.survival === 'domain-assets'
                ? 'Your domain survives while it retains provinces, holdings, armies or fortifications.'
                : 'Losing your last province ends your reign.'}
            </p>
          </>
        )}
      </div>
      <div className="sidebar-foot">
        <i /> {state.ruleset.toLowerCase()} rules ·{' '}
        {scenario.fingerprint ? 'experimental Anuire template' : 'synthetic campaign'}
      </div>
    </aside>
  );
}
