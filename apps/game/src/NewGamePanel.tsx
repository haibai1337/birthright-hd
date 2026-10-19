import {
  realmSelectable,
  realmRegentCandidates,
  type RulesetId,
  type Scenario,
  type SelectionMode,
} from '../../../packages/core';
import { Herald } from '../../../packages/ui/Herald';
import { Icon } from '../../../packages/ui/Icon';
import { OriginalImage } from './ClassicChrome';
import type { OriginalAssets } from './original-assets';
import './new-game.css';
import { campaignAccessStrings as access } from '../../../packages/ui/strings';

export function NewGamePanel({
  scenario,
  pack,
  realmId,
  onRealm,
  regentId,
  onRegent,
  ruleset,
  onRuleset,
  seed,
  onSeed,
  victoryTarget,
  onVictoryTarget,
  onStart,
  selectionMode,
}: {
  scenario: Scenario;
  pack: OriginalAssets;
  realmId: string;
  onRealm: (id: string) => void;
  regentId: string;
  onRegent: (id: string) => void;
  ruleset: RulesetId;
  onRuleset: (value: RulesetId) => void;
  seed: string;
  onSeed: (value: string) => void;
  victoryTarget: 300 | 400 | 500;
  onVictoryTarget: (value: 300 | 400 | 500) => void;
  onStart: () => void;
  selectionMode: SelectionMode;
}) {
  const realms = scenario.realms.filter((realm) =>
    realmSelectable(scenario, realm.id, selectionMode),
  );
  const selected = realms.find((realm) => realm.id === realmId) ?? realms[0]!;
  const candidates = realmRegentCandidates(scenario, selected.id);
  const regent = candidates.find((candidate) => candidate.id === regentId) ?? selected.regent;
  const lieutenant = candidates.find((candidate) => candidate.id !== regent.id);
  const provinces = scenario.initial.provinces.filter(
    (province) => province.owner === realmId,
  ).length;
  const classes = regent.classes?.length
    ? regent.classes.map((entry) => `${entry.type} ${entry.level}`).join(' / ')
    : regent.class;

  return (
    <div className="new-game-panel">
      <div className="new-game-scroll">
        <p className="new-game-intro">
          Anuire awaits. Choose a kingdom and take your place among its regents.
        </p>
        <div className="new-game-grid">
          <section className="kingdom-picker" aria-labelledby="kingdom-heading">
            <h3 id="kingdom-heading">
              Choose a kingdom <span>{realms.length}</span>
            </h3>
            <label className="kingdom-select">
              Kingdom &amp; regent
              <select
                aria-label="Choose Anuire regent"
                value={realmId}
                onChange={(event) => onRealm(event.target.value)}
              >
                {realms.map((realm) => (
                  <option key={realm.id} value={realm.id}>
                    {realm.name} · {realm.id === realmId ? regent.name : realm.regent.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="kingdom-list" role="group" aria-label="Available kingdoms">
              {realms.map((realm) => (
                <button
                  key={realm.id}
                  type="button"
                  aria-pressed={realm.id === realmId}
                  onClick={() => onRealm(realm.id)}
                >
                  <span>
                    <strong>{realm.name}</strong>
                    <small>{realm.id === realmId ? regent.name : realm.regent.name}</small>
                  </span>
                  <span className="kingdom-check" aria-hidden="true">
                    {realm.id === realmId ? '✓' : '›'}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="regent-preview" aria-labelledby="regent-heading">
            <p className="new-game-kicker">Your birthright</p>
            <h3 id="regent-heading">{selected.name}</h3>
            <div className="regent-candidates" role="group" aria-label="Choose your ruling regent">
              {candidates.map((candidate) => {
                const portrait = pack.portraits[String(candidate.original?.avatarId)];
                const active = candidate.id === regent.id;
                return (
                  <button
                    type="button"
                    key={candidate.id}
                    aria-label={`Rule as ${candidate.name}`}
                    aria-pressed={active}
                    onClick={() => onRegent(candidate.id)}
                  >
                    <span className="regent-frame">
                      {portrait ? (
                        <OriginalImage pack={pack} id={portrait} alt={candidate.name} />
                      ) : (
                        <Herald realm={selected} size={64} />
                      )}
                    </span>
                    <strong>{candidate.name}</strong>
                    <small>{active ? '✓ Regent' : 'Lieutenant'}</small>
                  </button>
                );
              })}
            </div>
            <h4>{regent.name}</h4>
            <p className="regent-class">{classes}</p>
            <dl className="regent-facts">
              <div>
                <dt>Bloodline</dt>
                <dd>{regent.bloodline.strength}</dd>
              </div>
              <div>
                <dt>Starting provinces</dt>
                <dd>{provinces}</dd>
              </div>
            </dl>
            <p className="regent-hint">
              {lieutenant
                ? `${lieutenant.name} will serve as your lieutenant.`
                : 'Choose the character who will lead your kingdom.'}
            </p>
          </section>
          <section className="campaign-setup" aria-labelledby="campaign-heading">
            <h3 id="campaign-heading">Your campaign</h3>
            <label>
              Ruleset
              <select
                aria-label="Ruleset"
                value={ruleset}
                onChange={(event) => onRuleset(event.target.value as RulesetId)}
              >
                <option value="ENHANCED">Enhanced · persistent wars</option>
                <option value="CLASSIC">Classic · seasonal wars</option>
              </select>
            </label>
            {scenario.policy?.strategicRules === 'pc-1997' && (
              <label>
                Empire difficulty
                <select
                  aria-label="Empire difficulty"
                  value={victoryTarget}
                  onChange={(event) =>
                    onVictoryTarget(Number(event.target.value) as 300 | 400 | 500)
                  }
                >
                  <option value="300">Easy · 300 points</option>
                  <option value="400">Medium · 400 points</option>
                  <option value="500">Hard · 500 points</option>
                </select>
              </label>
            )}
            <label>
              Campaign seed
              <input
                aria-label="Campaign seed"
                inputMode="numeric"
                value={seed}
                onChange={(event) => onSeed(event.target.value)}
              />
            </label>
            <p className="campaign-goal">
              {scenario.policy?.strategicRules === 'pc-1997'
                ? 'Build your empire through land, vassals and alliances. Reach the chosen point target to claim victory.'
                : 'Reach domain power 600, or lead after 80 seasons, to claim victory.'}
            </p>
          </section>
        </div>
        {scenario.fingerprint && (
          <details className="new-game-policies">
            <summary>
              Experimental campaign policies
              <span className="new-game-template">ANUIRE · EXPERIMENTAL ORIGINAL TEMPLATE</span>
            </summary>
            <p>
              {scenario.provinces.length} original provinces.{' '}
              {selectionMode === 'UNRESTRICTED' ? access.openSelection : access.originalSelection}.
              Independent holding domains survive without provinces. Both rules profiles use
              documented reconstruction and compatibility rules.
            </p>
            <ul>
              {scenario.compatibilityNotes?.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <footer className="new-game-footer">
        <span>
          <strong>{selected.name}</strong>
          <small>{regent.name}</small>
        </span>
        <button type="button" onClick={onStart}>
          Begin your reign <Icon name="arrow" />
        </button>
      </footer>
    </div>
  );
}
