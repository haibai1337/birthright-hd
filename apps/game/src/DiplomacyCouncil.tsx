import { useState, type ReactNode } from 'react';
import { FealtyCouncil } from './FealtyCouncil';
import {
  rulingRegent,
  diplomaticReaction,
  diplomaticTargetAvailable,
  diplomacyTerms,
  relation,
  mayInvade,
  validateCommand,
  type Campaign,
  type Command,
  type Scenario,
  type TreatyKind,
} from '../../../packages/core';
export function DiplomacyCouncil({
  state,
  scenario,
  order,
}: {
  state: Campaign;
  scenario: Scenario;
  order: (c: Command, label: string) => ReactNode;
}) {
  const domains = scenario.realms.filter((r) =>
    diplomaticTargetAvailable(state, state.playerRealm, r.id),
  );
  const [targetId, setTarget] = useState(''),
    [kind, setKind] = useState<TreatyKind>('pact'),
    [bid, setBid] = useState(0),
    [offer, setOffer] = useState(0),
    [demand, setDemand] = useState(0),
    [tribute, setTribute] = useState(0),
    [demandTribute, setDemandTribute] = useState(0),
    [offerProvince, setOfferProvince] = useState(''),
    [demandProvince, setDemandProvince] = useState(''),
    [offerHolding, setOfferHolding] = useState(''),
    [demandHolding, setDemandHolding] = useState('');
  const target = domains.find((r) => r.id === targetId) ?? domains[0];
  if (!target) return <p>No active foreign domains.</p>;
  const treaty = relation(state, state.playerRealm, target.id);
  const cmd: Extract<Command, { type: 'ProposeTreaty' }> = {
    type: 'ProposeTreaty',
    target: target.id,
    kind,
    ...(kind === 'war'
      ? {}
      : {
          regencyBid: bid,
          offerGold: offer,
          demandGold: demand,
          ...(tribute ? { offerTribute: tribute } : {}),
          ...(demandTribute ? { demandTribute } : {}),
          ...(offerProvince ? { offerProvince } : {}),
          ...(demandProvince ? { demandProvince } : {}),
          ...(offerHolding ? { offerHolding } : {}),
          ...(demandHolding ? { demandHolding } : {}),
        }),
  };
  const terms = diplomacyTerms(state, scenario, state.playerRealm, cmd),
    error = validateCommand(state, scenario, state.playerRealm, cmd);
  const number = (label: string, value: number, set: (n: number) => void) => (
    <label>
      {label}
      <input
        aria-label={label}
        type="number"
        min="0"
        max="10000"
        value={value}
        onChange={(e) => set(Math.max(0, Math.min(10000, Math.floor(Number(e.target.value) || 0))))}
      />
    </label>
  );
  const provinces = (owner: string) =>
    state.provinces
      .filter((p) => p.owner === owner && !p.occupiedBy && !p.contested)
      .map((p) => ({ id: p.id, name: scenario.provinces.find((d) => d.id === p.id)!.name }));
  const holdings = (owner: string) =>
    state.holdings
      .filter((h) => h.realmId === owner && !h.destroyed && !h.contested)
      .map((h) => ({
        id: h.id,
        name: `${scenario.provinces.find((d) => d.id === h.provinceId)!.name} · ${h.type} ${h.level}`,
      }));
  const asset = (
    label: string,
    value: string,
    set: (v: string) => void,
    items: { id: string; name: string }[],
  ) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={items.some((i) => i.id === value) ? value : ''}
        onChange={(e) => set(e.target.value)}
      >
        <option value="">None</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <>
      <div className="panel-title">
        <span className="eyebrow">THE CHANCELLOR’S COUNCIL</span>
        <h2>Oaths & rivalries</h2>
      </div>
      <FealtyCouncil key={state.playerRealm} state={state} scenario={scenario} order={order} />
      <label>
        Foreign domain
        <select
          aria-label="Foreign domain"
          value={target.id}
          onChange={(e) => {
            setTarget(e.target.value);
            setDemandProvince('');
            setDemandHolding('');
          }}
        >
          {domains.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {relation(state, state.playerRealm, r.id)?.kind ?? 'neutral'} · Reaction{' '}
              {diplomaticReaction(state, r.id, state.playerRealm)}%
            </option>
          ))}
        </select>
      </label>
      <h3>
        {target.name} · {rulingRegent(scenario, target.id, state)?.name}
      </h3>
      <p>
        Relationship: {treaty?.kind ?? 'neutral'}
        {treaty?.vassal
          ? ` · Vassal: ${scenario.realms.find((r) => r.id === treaty.vassal)?.name}`
          : ''}
        . Their reaction: {diplomaticReaction(state, target.id, state.playerRealm)}%; yours:{' '}
        {diplomaticReaction(state, state.playerRealm, target.id)}%.
      </p>
      <p>
        {mayInvade(state, state.playerRealm, target.id)
          ? 'Your declaration permits invasion.'
          : 'You have no declaration permitting invasion.'}{' '}
        Classic declarations expire at the seasonal boundary.
      </p>
      <label>
        Proposal
        <select
          aria-label="Diplomatic proposal"
          value={kind}
          onChange={(e) => setKind(e.target.value as TreatyKind)}
        >
          <option value="pact">Permissive alliance</option>
          <option value="alliance">Full alliance</option>
          <option value="vassal">Request oath of fealty</option>
          <option value="peace">Make peace / negotiate payment</option>
          <option value="war">Declare war</option>
        </select>
      </label>
      {kind !== 'war' && (
        <>
          {number('Diplomatic RP bid', bid, setBid)}
          {number('Gold offered on acceptance', offer, setOffer)}
          {number('Gold demanded', demand, setDemand)}
          {number('Seasonal GB tribute offered', tribute, setTribute)}
          {number('Seasonal GB tribute demanded', demandTribute, setDemandTribute)}
          <details>
            <summary>Offer or request a province or holding</summary>
            {asset('Offer province', offerProvince, setOfferProvince, provinces(state.playerRealm))}
            {asset('Request province', demandProvince, setDemandProvince, provinces(target.id))}
            {asset('Offer holding', offerHolding, setOfferHolding, holdings(state.playerRealm))}
            {asset('Request holding', demandHolding, setDemandHolding, holdings(target.id))}
          </details>
          <p>
            Modified reaction {terms.reaction}%;{' '}
            {state.unrestrictedDiplomacy
              ? 'all active domains grant an audience.'
              : `consideration requires ${terms.minimum}%.`}{' '}
            Court and RP give a d20 requirement of {terms.threshold} before opposition.
          </p>
          <p className="council-note">
            An attempt costs 1 GB, 1 RP plus your bid and one action. Proposed payments and assets
            transfer on acceptance.{' '}
            {state.unrestrictedDiplomacy
              ? 'Unrestricted diplomacy removes audience restrictions; acceptance still requires a successful roll.'
              : 'RP cannot replace the minimum consideration threshold.'}{' '}
            Rejection does not improve relations.
          </p>
        </>
      )}
      {error && <p className="council-note">{error.detail ?? error.code}</p>}
      {order(cmd, kind === 'war' ? 'Declare war' : 'Submit diplomatic proposal')}
      {['pact', 'alliance', 'vassal'].includes(treaty?.kind ?? '') &&
        order({ type: 'BreakTreaty', target: target.id }, 'Renounce agreement')}
      <p className="council-note">
        Permissive and full allies grant military and road-trade passage. Vassals retain their
        domains and contribute fealty points; financial tribute is negotiated separately. Non-landed
        fealty incorporates the regent as a lieutenant and transfers holdings. Full lieutenant
        actions are unavailable.
      </p>
    </>
  );
}
