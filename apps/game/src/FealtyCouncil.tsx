import { useState, type ReactNode } from 'react';
import { fealtyTo, type Campaign, type Command, type Scenario } from '../../../packages/core';

export function FealtyCouncil({
  state,
  scenario,
  order,
}: {
  state: Campaign;
  scenario: Scenario;
  order: (c: Command, label: string) => ReactNode;
}) {
  const [pledge, setPledge] = useState(0),
    [gift, setGift] = useState(1);
  const name = (id: string) => scenario.realms.find((r) => r.id === id)?.name ?? id;
  const fealty = fealtyTo(state, state.playerRealm);
  const subjects = state.treaties.filter(
    (t) =>
      t.kind === 'vassal' &&
      t.vassal &&
      t.vassal !== state.playerRealm &&
      (t.a === state.playerRealm || t.b === state.playerRealm),
  );
  const obligations = (vassal: string, liege: string, pledged: number) => {
    const outward = (state.tributes ?? [])
      .filter((t) => t.payer === vassal && t.recipient === liege)
      .reduce((n, t) => n + t.amount, 0);
    const inward = (state.tributes ?? [])
      .filter((t) => t.payer === liege && t.recipient === vassal)
      .reduce((n, t) => n + t.amount, 0);
    return `${name(vassal)} → ${name(liege)}: ${pledged} RP and ${outward} GB/season; reverse GB tribute ${inward}.`;
  };
  return (
    <section aria-label="Fealty and regency">
      <h3>Fealty & regency</h3>
      {fealty ? (
        <>
          <p>{obligations(state.playerRealm, fealty.liege, fealty.treaty.regencyPledge ?? 0)}</p>
          <p className="council-note">
            RP donation and fixed seasonal pledge are HD compatibility controls. No native automatic
            RP rate has been established. Zero cancels a pledge.
          </p>
          <label>
            Seasonal RP pledge
            <input
              aria-label="Seasonal RP pledge"
              type="number"
              min="0"
              max="65535"
              value={pledge}
              onChange={(e) =>
                setPledge(Math.max(0, Math.min(65535, Math.trunc(Number(e.target.value) || 0))))
              }
            />
          </label>
          {order({ type: 'SetFealtyRegency', amount: pledge }, 'Set fealty RP pledge')}
          <label>
            RP donation
            <input
              aria-label="RP donation"
              type="number"
              min="1"
              max="65535"
              value={gift}
              onChange={(e) =>
                setGift(Math.max(1, Math.min(65535, Math.trunc(Number(e.target.value) || 1))))
              }
            />
          </label>
          {order({ type: 'DonateFealtyRegency', amount: gift }, 'Donate RP to liege')}
          {order({ type: 'BreakTreaty', target: fealty.liege }, 'Declare independence')}
        </>
      ) : (
        <p>No overlord; no fealty RP obligation.</p>
      )}
      {subjects.map((t) => {
        const v = state.realms.find((r) => r.id === t.vassal)!;
        return (
          <p key={v.id}>
            {obligations(v.id, state.playerRealm, t.regencyPledge ?? 0)}{' '}
            {v.lieutenantOf
              ? 'Regent joined as lieutenant; holdings transferred.'
              : scenario.realms.find((r) => r.id === v.id)?.domainType === 'territorial'
                ? 'Orders are available in this vassal’s own round slot; sovereignty and balances remain separate.'
                : 'Non-landed fealty uses lieutenant assimilation.'}
          </p>
        );
      })}
      {(state.characters ?? [])
        .filter((c) => c.realmId === state.playerRealm && c.role === 'lieutenant')
        .map((c) => (
          <p key={c.id}>
            {scenario.regents?.find((r) => r.id === c.regentId)?.name} · lieutenant from{' '}
            {name(c.originRealm!)} · {c.salary ?? 0} GB/season. Lieutenant actions and dismissal
            remain unavailable.
          </p>
        ))}
    </section>
  );
}
