import { useState, type ReactNode } from 'react';
import {
  COURTS,
  inspectTradeRoute,
  tradeProblem,
  tradeIncome,
  portIncome,
  type Campaign,
  type Command,
  type Scenario,
} from '../../../packages/core';

export function EconomyCouncil({
  state,
  scenario,
  order,
}: {
  state: Campaign;
  scenario: Scenario;
  order: (command: Command, text: string) => ReactNode;
}) {
  const [guildId, setGuild] = useState(''),
    [destination, setDestination] = useState('');
  const [bid, setBid] = useState(0),
    [roadFrom, setRoadFrom] = useState(''),
    [roadTo, setRoadTo] = useState('');
  const [target, setTarget] = useState(''),
    [amount, setAmount] = useState(1);
  const realm = state.realms.find((r) => r.id === state.playerRealm)!;
  const guilds = state.holdings.filter(
    (h) => h.realmId === realm.id && h.type === 'guild' && !h.destroyed,
  );
  const guild = guilds.find((h) => h.id === guildId) ?? guilds[0];
  const name = (id: string) => scenario.provinces.find((p) => p.id === id)?.name ?? id;
  const eligible = guild
    ? scenario.provinces.filter(
        (p) =>
          !tradeProblem(state, scenario, realm.id, {
            type: 'CreateTradeRoute',
            guildId: guild.id,
            destination: p.id,
          }),
      )
    : [];
  const to = eligible.find((p) => p.id === destination)?.id ?? eligible[0]?.id ?? destination;
  const sovereign = state.provinces.filter((p) => p.owner === realm.id);
  const from = sovereign.find((p) => p.id === roadFrom)?.id ?? sovereign[0]?.id ?? '';
  const adjacent = scenario.provinces.find((p) => p.id === from)?.adjacent ?? [];
  const roadEnd = adjacent.includes(roadTo) ? roadTo : (adjacent[0] ?? '');
  const targets = state.realms.filter(
    (r) => r.id !== realm.id && !r.eliminated && r.controller !== 'passive',
  );
  const payee = targets.find((r) => r.id === target)?.id ?? targets[0]?.id ?? '';
  return (
    <>
      <div className="section-label">
        <span>TRADE ROUTES</span>
      </div>
      <p className="council-note">
        Land routes need different terrain, a guild at the origin and a continuous road through your
        own or allied destination provinces. Endpoint limits: 1 / 2 / 3 routes at levels 1–3 / 4–6 /
        7+. New sea routes are unavailable in the PC game.
      </p>
      {state.tradeRoutes.map((t) => {
        const info = inspectTradeRoute(state, scenario, t);
        return (
          <div className="last-report" key={t.id}>
            <strong>
              {name(t.from)} → {name(t.to)}
            </strong>
            <p>
              {scenario.realms.find((r) => r.id === info.realmId)?.name} · {info.status} ·{' '}
              {info.income} GB/season
            </p>
            {info.reason && <small>{info.reason}</small>}
            {info.realmId === realm.id &&
              !['destroyed', 'terminated'].includes(info.status) &&
              order({ type: 'EndTradeRoute', routeId: t.id }, 'End trade route')}
          </div>
        );
      })}
      {!state.tradeRoutes.length && <p>No established land trade routes.</p>}
      {guild ? (
        <>
          <label>
            Origin guild
            <select
              aria-label="Trade origin guild"
              value={guild.id}
              onChange={(e) => setGuild(e.target.value)}
            >
              {guilds.map((h) => (
                <option key={h.id} value={h.id}>
                  {name(h.provinceId)} · guild {h.level}
                  {h.contested ? ' · contested' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Eligible destination
            <select
              aria-label="Trade destination"
              value={to}
              onChange={(e) => setDestination(e.target.value)}
            >
              {!eligible.length && <option value="">No eligible road connection</option>}
              {eligible.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {tradeIncome(state, guild.provinceId, p.id)} GB/season
                </option>
              ))}
            </select>
          </label>
          <label>
            RP success bid
            <input
              aria-label="Trade Regency bid"
              type="number"
              min="0"
              max="10000"
              value={bid}
              onChange={(e) =>
                setBid(Math.max(0, Math.min(10000, Math.floor(Number(e.target.value) || 0))))
              }
            />
          </label>
          {eligible.length ? (
            order(
              { type: 'CreateTradeRoute', guildId: guild.id, destination: to, regencyBid: bid },
              'Establish trade route',
            )
          ) : (
            <p>
              No eligible destination: inspect road access, alliances, terrain, occupation and
              endpoint capacity. The destination needs no guild.
            </p>
          )}
        </>
      ) : (
        <p>Establish a guild holding before creating land trade.</p>
      )}
      {(state.ports ?? [])
        .filter((p) => p.realmId === realm.id)
        .map((p) => (
          <p key={p.id}>
            Original {p.kind}: {name(p.provinceId)} · {portIncome(state, p)} GB/season (
            {p.kind === 'river-port' ? 'half' : 'full'} province level).
          </p>
        ))}
      {sovereign.length > 0 && (
        <>
          <div className="section-label">
            <span>BUILD ROAD</span>
          </div>
          <label>
            Start
            <select
              aria-label="Road start"
              value={from}
              onChange={(e) => setRoadFrom(e.target.value)}
            >
              {sovereign.map((p) => (
                <option key={p.id} value={p.id}>
                  {name(p.id)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Adjacent destination
            <select
              aria-label="Road destination"
              value={roadEnd}
              onChange={(e) => setRoadTo(e.target.value)}
            >
              {adjacent.map((id) => (
                <option key={id} value={id}>
                  {name(id)}
                </option>
              ))}
            </select>
          </label>
          {order({ type: 'BuildRoad', from, to: roadEnd }, 'Build connecting road')}
        </>
      )}
      <div className="section-label">
        <span>COURT & LAW</span>
      </div>
      <p>
        Current court: {COURTS[realm.court ?? 1]!.name}. Court costs are seasonal; changing the
        level is free.
      </p>
      {COURTS.map(
        (court, level) =>
          level !== (realm.court ?? 1) && (
            <div key={level}>
              {order({ type: 'SetCourt', level }, `${court.name} court · ${court.gold} GB/season`)}
            </div>
          ),
      )}
      <p className="council-note">
        Law Claims use a capped compatibility allocation: the exact stock roll remains unresolved.
        Off by default.
      </p>
      {order(
        { type: 'SetLawClaims', enabled: !realm.lawClaims },
        realm.lawClaims ? 'Disable Law Claims' : 'Enable Law Claims (approximation)',
      )}
      <div className="section-label">
        <span>GOLD & TRIBUTE</span>
      </div>
      <p className="council-note">
        A gift transfers the stated GB plus a separate 1 GB / 1 RP diplomacy fee and one action.
        Voluntary tribute is fixed GB each season, limited to actual available funds. Ending your
        own pledge is a free compatibility rule.
      </p>
      <label>
        Recipient
        <select
          aria-label="Payment recipient"
          value={payee}
          onChange={(e) => setTarget(e.target.value)}
        >
          {targets.map((r) => (
            <option key={r.id} value={r.id}>
              {scenario.realms.find((d) => d.id === r.id)?.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        GB amount
        <input
          aria-label="Payment Gold Bars"
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
        />
      </label>
      {order({ type: 'TransferGold', target: payee, amount }, 'Send gold gift')}
      {order({ type: 'SetTribute', target: payee, amount }, 'Pledge seasonal tribute')}
      {(state.tributes ?? [])
        .filter((t) => t.payer === realm.id || t.recipient === realm.id)
        .map((t) => (
          <div key={t.id}>
            <p>
              {scenario.realms.find((r) => r.id === t.payer)?.name} →{' '}
              {scenario.realms.find((r) => r.id === t.recipient)?.name}: {t.amount} GB/season
            </p>
            {t.payer === realm.id &&
              order({ type: 'SetTribute', target: t.recipient, amount: 0 }, 'End tribute pledge')}
          </div>
        ))}
    </>
  );
}
