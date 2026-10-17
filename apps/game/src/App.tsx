import { useEffect, useRef, useState } from 'react';
import {
  applyCommand,
  createCampaign,
  deserializeCampaign,
  forecast,
  type Campaign,
  type Command,
  type RulesetId,
} from '../../../packages/core';
import { developmentScenario as scenario } from '../../../packages/world-data';
import { type MapOverlay } from '../../../packages/rendering/strategic-map';
import { Herald } from '../../../packages/ui/Herald';
import { Icon } from '../../../packages/ui/Icon';
import { errors, logText, playerJournal, season, signed } from '../../../packages/ui/strings';
import { MapPanel } from './MapPanel';
import { Sidebar, type Panel } from './Sidebar';
import { Modal } from './Modal';
import {
  defaultSettings,
  downloadCampaign,
  loadCampaign,
  loadSettings,
  persistSettings,
  saveCampaign,
  type Settings,
} from './storage';
type Dialog = 'new' | 'load' | 'settings' | 'help' | 'menu' | null;
export function App() {
  const [state, setState] = useState<Campaign | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selected, setSelected] = useState('p4');
  const [panel, setPanel] = useState<Panel>('province');
  const [overlay, setOverlay] = useState<MapOverlay>('political');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [realmId, setRealmId] = useState('crownmere');
  const [seed, setSeed] = useState('1997');
  const [ruleset, setRuleset] = useState<RulesetId>('ENHANCED');
  const file = useRef<HTMLInputElement>(null);
  const notice = (text: string, error = false) => {
    setMessage(text);
    setIsError(error);
  };
  useEffect(() => {
    try {
      setSettings(loadSettings());
    } catch (e) {
      notice(
        `Settings could not be restored: ${e instanceof Error ? e.message : 'storage error'}`,
        true,
      );
    }
  }, []);
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(''), 6500);
    return () => window.clearTimeout(t);
  }, [message]);
  function accept(next: Campaign) {
    setState(next);
    if (settings.autosave)
      try {
        saveCampaign(next, true);
      } catch (e) {
        notice(
          `Campaign continues, but autosave failed: ${e instanceof Error ? e.message : 'storage error'}`,
          true,
        );
      }
  }
  function issue(command: Command) {
    if (!state) return;
    const result = applyCommand(state, scenario, state.playerRealm, command);
    if (!result.ok) {
      notice(errors[result.error.code], true);
      return;
    }
    accept(result.state);
    if (command.type !== 'EndTurn') {
      const last = playerJournal(result.state).at(-1);
      if (last) notice(logText(last, scenario));
    }
  }
  function start() {
    const value = Number(seed);
    if (seed.trim() === '' || !Number.isInteger(value) || value < 0 || value > 4294967295) {
      notice('Enter a whole campaign seed from 0 to 4294967295.', true);
      return;
    }
    const next = createCampaign(scenario, realmId, value, ruleset);
    accept(next);
    setSelected(
      next.provinces.find((p) => p.owner === realmId && p.fort > 0)?.id ??
        next.provinces.find((p) => p.owner === realmId)?.id ??
        'p0',
    );
    setPanel('province');
    setDialog(null);
  }
  function load(automatic: boolean) {
    try {
      const next = loadCampaign(scenario, automatic);
      setState(next);
      setSelected(next.provinces.find((p) => p.owner === next.playerRealm)?.id ?? 'p0');
      setDialog(null);
      notice('Your campaign has been restored.');
    } catch (e) {
      notice(e instanceof Error ? e.message : 'Could not load campaign.', true);
    }
  }
  function save() {
    if (!state) return;
    try {
      saveCampaign(state);
      notice(`Campaign saved locally · ${season(state.turn)}.`);
    } catch (e) {
      notice(`Save failed: ${e instanceof Error ? e.message : 'storage error'}`, true);
    }
  }
  function changeSettings(next: Settings) {
    setSettings(next);
    try {
      persistSettings(next);
    } catch (e) {
      notice(
        `Settings could not be saved: ${e instanceof Error ? e.message : 'storage error'}`,
        true,
      );
    }
  }
  const player = scenario.realms.find((r) => r.id === state?.playerRealm);
  const realm = state?.realms.find((r) => r.id === state.playerRealm);
  const income = state && player ? forecast(state, scenario, player.id) : null;
  const latest = state ? playerJournal(state).at(-1) : null;
  const petition = state?.pendingEvents.find((e) => e.realmId === state.playerRealm);
  return (
    <div className={`app ${settings.largeText ? 'large-text' : ''}`}>
      {!state ? (
        <main className="main-menu">
          <svg className="menu-map" viewBox="0 0 1400 940" aria-hidden="true">
            {scenario.provinces.map((p) => (
              <polygon
                key={p.id}
                points={p.polygon.map((q) => q.join(',')).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            ))}
            {scenario.provinces.map((p) => (
              <g key={p.id}>
                <circle cx={p.center[0]} cy={p.center[1]} r="4" fill="currentColor" />
                <text x={p.center[0]} y={p.center[1] + 22} textAnchor="middle" fill="currentColor">
                  {p.name}
                </text>
              </g>
            ))}
          </svg>
          <div className="menu-topline">
            <span>AN OFFLINE REALM STRATEGY GAME</span>
            <span>MILESTONE 0 · DEVELOPMENT BUILD</span>
          </div>
          <div className="menu-content">
            <div className="menu-brand">
              <div className="menu-ornament">✦</div>
              <p className="eyebrow">THE GORGON’S ALLIANCE · A MODERN INTERPRETATION</p>
              <h1>
                BIRTHRIGHT<span>HD</span>
              </h1>
              <div className="brand-rule">
                <i />
                <Icon name="crown" size={25} />
                <i />
              </div>
              <p className="menu-tagline">
                The land is inherited.
                <br />
                <em>The crown is earned.</em>
              </p>
              <nav aria-label="Main menu">
                <button className="primary" onClick={() => setDialog('new')}>
                  New game <Icon name="arrow" />
                </button>
                <button onClick={() => setDialog('load')}>
                  Load game <Icon name="scroll" />
                </button>
                <button onClick={() => setDialog('settings')}>
                  Settings <Icon name="settings" />
                </button>
              </nav>
            </div>
            <div className="menu-campaign">
              <Herald realm={scenario.realms[0]!} size={118} />
              <span className="eyebrow">THE FIRST CHAPTER</span>
              <h2>
                The Crown
                <br />& the Covenant
              </h2>
              <p>
                Twelve provinces. Three bloodlines.
                <br />A frontier waiting for its sovereign.
              </p>
              <div className="scenario-disclaimer">
                SYNTHETIC DEVELOPMENT SCENARIO
                <p>
                  Original names and cartography for testing the realm engine. The authentic Anuire
                  campaign is still being researched.
                </p>
              </div>
            </div>
          </div>
          <footer className="menu-footer">
            <span>Original-code prototype · No proprietary game assets</span>
            <button onClick={() => setDialog('help')}>
              About this campaign <Icon name="help" size={16} />
            </button>
          </footer>
        </main>
      ) : (
        <>
          <header className="topbar">
            <button className="brand" onClick={() => setDialog('menu')} aria-label="Open game menu">
              <Icon name="crown" size={32} />
              <span>
                BIRTHRIGHT <small>HD</small>
                <em>THE GORGON’S ALLIANCE</em>
              </span>
            </button>
            <div
              className="resource"
              title="Gold Bars. Taxes and upkeep settle at the end of each season."
            >
              <Icon name="coin" size={23} />
              <div>
                <span>TREASURY</span>
                <strong data-testid="treasury">
                  {realm?.treasury}
                  <small>GB</small>
                </strong>
              </div>
              <em>{signed(income?.net ?? 0)} / season</em>
            </div>
            <div
              className="resource"
              title="Regency Points are generated by domain power, limited by bloodline strength."
            >
              <Icon name="star" size={23} />
              <div>
                <span>REGENCY</span>
                <strong>
                  {realm?.regency}
                  <small>RP</small>
                </strong>
              </div>
              <em>+{income?.regency} / season</em>
            </div>
            <div className="action-resource">
              <span>DOMAIN ACTIONS</span>
              <div aria-label={`${realm?.actions} domain actions remaining`}>
                {[0, 1, 2].map((i) => (
                  <i className={i < (realm?.actions ?? 0) ? 'active' : ''} key={i} />
                ))}
              </div>
              <small data-testid="actions-left">{realm?.actions} of 3 remaining</small>
            </div>
            <div className="season">
              <Icon name="star" size={18} />
              <div>
                <strong>{season(state.turn)}</strong>
                <small>DOMAIN TURN {state.turn}</small>
              </div>
            </div>
            <button
              className="end-turn primary"
              disabled={state.outcome !== 'ongoing'}
              onClick={() => issue({ type: 'EndTurn' })}
            >
              End season <Icon name="chevron" size={18} />
            </button>
          </header>
          <div className="game-body">
            <nav className="nav-rail" aria-label="Council panels">
              <div className="rail-herald">{player && <Herald realm={player} size={41} />}</div>
              {(
                [
                  { id: 'province', icon: 'map', name: 'Provinces' },
                  { id: 'realm', icon: 'crown', name: 'Realm' },
                  { id: 'military', icon: 'sword', name: 'Military' },
                  { id: 'diplomacy', icon: 'diplomacy', name: 'Diplomacy' },
                  { id: 'chronicle', icon: 'scroll', name: 'Chronicle' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  className={panel === p.id ? 'active' : ''}
                  aria-pressed={panel === p.id}
                  onClick={() => setPanel(p.id)}
                >
                  <Icon name={p.icon} size={24} />
                  <span>{p.name}</span>
                </button>
              ))}
              <div className="rail-bottom">
                <button onClick={save} aria-label="Save game">
                  <Icon name="save" />
                  <span>Save</span>
                </button>
                <button onClick={() => setDialog('settings')} aria-label="Settings">
                  <Icon name="settings" />
                  <span>Settings</span>
                </button>
                <button onClick={() => setDialog('help')} aria-label="How to play">
                  <Icon name="help" />
                  <span>Guide</span>
                </button>
              </div>
            </nav>
            <section className="map-column" aria-label="Strategic map">
              <div className="map-toolbar">
                <div className="overlay-tabs" aria-label="Map overlays">
                  {(['political', 'military', 'economic', 'magical'] as const).map((o) => (
                    <button
                      className={overlay === o ? 'active' : ''}
                      aria-pressed={overlay === o}
                      key={o}
                      onClick={() => setOverlay(o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <span className="map-toolbar-note">
                  12 PROVINCES <i>✦</i> 3 REALMS
                </span>
              </div>
              <MapPanel
                state={state}
                scenario={scenario}
                selected={selected}
                overlay={overlay}
                labels={settings.labels}
                onSelect={(id) => {
                  setSelected(id);
                  if (panel !== 'military') setPanel('province');
                }}
              />
              <div className="council-dispatch">
                <span className="dispatch-icon">
                  <Icon name="scroll" />
                </span>
                <div>
                  <span className="eyebrow">WORD FROM THE COUNCIL</span>
                  <p>{latest ? logText(latest, scenario) : 'Your advisors await your orders.'}</p>
                </div>
                <button aria-label="View chronicle" onClick={() => setPanel('chronicle')}>
                  <Icon name="chevron" />
                </button>
              </div>
            </section>
            <Sidebar
              state={state}
              scenario={scenario}
              selected={selected}
              panel={panel}
              select={setSelected}
              issue={issue}
            />
          </div>
          <footer className="statusbar">
            <span>
              <i /> LOCAL CAMPAIGN <b>·</b> {settings.autosave ? 'AUTOSAVE ON' : 'AUTOSAVE OFF'}
            </span>
            <span>
              Seed {state.seed} <b>·</b> {state.ruleset} <b>·</b> Provisional geography & rules
            </span>
            <span>M0 / 0.1.0</span>
          </footer>
          {petition && (
            <div className="petition" role="region" aria-label="Council petition">
              <Icon name="scroll" size={27} />
              <div>
                <span className="eyebrow">A PETITION TO THE CROWN</span>
                <h3>
                  Relief for {scenario.provinces.find((p) => p.id === petition.provinceId)?.name}
                </h3>
                <p>Grant 2 GB for +1 loyalty, or decline for −1 loyalty.</p>
              </div>
              <button
                className="primary"
                disabled={(realm?.treasury ?? 0) < 2}
                onClick={() => issue({ type: 'ResolveEvent', choice: 'relief' })}
              >
                Grant relief · 2 GB
              </button>
              <button onClick={() => issue({ type: 'ResolveEvent', choice: 'decline' })}>
                Decline
              </button>
            </div>
          )}
          {state.outcome !== 'ongoing' && (
            <div className="outcome" role="status">
              <Icon name="crown" size={40} />
              <h2>
                {state.outcome === 'victory' ? 'Your crown endures.' : 'Your reign has ended.'}
              </h2>
              <p>
                {state.outcome === 'victory'
                  ? 'Your realm has fulfilled the campaign’s objective.'
                  : 'Another sovereign claims the future of the Marches.'}
              </p>
              <button className="primary" onClick={() => setDialog('new')}>
                Begin another reign
              </button>
              <button
                onClick={() => {
                  setState(null);
                  setDialog(null);
                }}
              >
                Main menu
              </button>
            </div>
          )}
        </>
      )}
      {message && (
        <div className={`toast ${isError ? 'error' : ''}`} role={isError ? 'alert' : 'status'}>
          {message}
          <button aria-label="Dismiss notification" onClick={() => setMessage('')}>
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      {dialog && (
        <Modal
          title={
            {
              new: 'Choose your birthright',
              load: 'Restore your reign',
              settings: 'Settings',
              help: 'The regent’s field guide',
              menu: 'The royal council',
            }[dialog]
          }
          onClose={() => setDialog(null)}
          wide={dialog === 'new'}
        >
          {dialog === 'new' && (
            <>
              <div className="campaign-intro">
                <span className="eyebrow">THE CROWN & THE COVENANT</span>
                <p>
                  A synthetic, twelve-province campaign. Choose any regent; the other two will be
                  controlled by the AI.
                </p>
              </div>
              <div className="realm-choices">
                {scenario.realms.map((r) => (
                  <button
                    key={r.id}
                    className={`realm-choice ${realmId === r.id ? 'selected' : ''}`}
                    aria-pressed={realmId === r.id}
                    onClick={() => setRealmId(r.id)}
                  >
                    <Herald realm={r} size={62} />
                    <h3>{r.name}</h3>
                    <p>{r.regent.name}</p>
                    <small>
                      {r.regent.class} · Bloodline {r.regent.bloodline.strength}
                    </small>
                    <em>“{r.motto}”</em>
                  </button>
                ))}
              </div>
              <div className="new-game-options">
                <label>
                  Ruleset
                  <select value={ruleset} onChange={(e) => setRuleset(e.target.value as RulesetId)}>
                    <option value="ENHANCED">Enhanced · persistent wars</option>
                    <option value="CLASSIC">Classic reconstruction · seasonal wars</option>
                  </select>
                </label>
                <label>
                  Campaign seed
                  <input
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    inputMode="numeric"
                    aria-label="Campaign seed"
                  />
                </label>
              </div>
              <p className="council-note">
                Both profiles use provisional development and combat rules. Classic is an incomplete
                reconstruction. Control 8 provinces or lead in province levels after 20 seasons.
              </p>
              <button className="primary full" onClick={start}>
                Begin your reign <Icon name="arrow" />
              </button>
            </>
          )}
          {dialog === 'load' && (
            <>
              <p>Campaigns are stored in this browser on this device.</p>
              <button className="menu-action" onClick={() => load(false)}>
                <Icon name="save" />
                Load manual save
              </button>
              <button className="menu-action" onClick={() => load(true)}>
                <Icon name="scroll" />
                Load autosave
              </button>
              <hr />
              <button className="menu-action" onClick={() => file.current?.click()}>
                Import campaign file
              </button>
              <input
                ref={file}
                hidden
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  void f
                    .text()
                    .then((text) => {
                      const next = deserializeCampaign(text, scenario);
                      setState(next);
                      setSelected(
                        next.provinces.find((p) => p.owner === next.playerRealm)?.id ?? 'p0',
                      );
                      setDialog(null);
                      notice('Campaign file imported.');
                    })
                    .catch((err: unknown) =>
                      notice(
                        `Import failed: ${err instanceof Error ? err.message : 'invalid save'}`,
                        true,
                      ),
                    );
                  e.target.value = '';
                }}
              />
            </>
          )}
          {dialog === 'settings' && (
            <>
              <p>Preferences apply immediately and are stored locally.</p>
              {(
                [
                  {
                    key: 'labels',
                    label: 'Province labels',
                    description: 'Show province names and source potential on the map.',
                  },
                  {
                    key: 'autosave',
                    label: 'Automatic saves',
                    description: 'Save after every accepted player order.',
                  },
                  {
                    key: 'largeText',
                    label: 'Larger interface text',
                    description: 'Increase panel text for comfortable reading.',
                  },
                ] as const
              ).map((s) => (
                <label className="setting" key={s.key}>
                  <span>
                    <strong>{s.label}</strong>
                    <small>{s.description}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings[s.key]}
                    onChange={(e) => changeSettings({ ...settings, [s.key]: e.target.checked })}
                  />
                </label>
              ))}
            </>
          )}
          {dialog === 'menu' && (
            <>
              <button
                className="menu-action"
                onClick={() => {
                  save();
                  setDialog(null);
                }}
              >
                <Icon name="save" />
                Save campaign
              </button>
              <button
                className="menu-action"
                onClick={() => {
                  if (state) downloadCampaign(state);
                }}
              >
                Export campaign file
              </button>
              <button className="menu-action" onClick={() => setDialog('load')}>
                Load game
              </button>
              <button className="menu-action" onClick={() => setDialog('new')}>
                New game
              </button>
              <button className="menu-action" onClick={() => setDialog('settings')}>
                Settings
              </button>
              <button
                className="menu-action"
                onClick={() => {
                  setState(null);
                  setDialog(null);
                }}
              >
                Return to main menu
              </button>
            </>
          )}
          {dialog === 'help' && (
            <div className="guide">
              <p>
                Rule a blooded domain through three actions each season. Orders consume Gold Bars,
                Regency Points, or both. Unused actions are forfeited when the season ends.
              </p>
              <ol>
                <li>
                  <strong>Survey your realm.</strong> Click a province, or use its selection list.
                  The Realm council shows expected income, upkeep, and your objective.
                </li>
                <li>
                  <strong>Build your influence.</strong> Rule provinces, strengthen holdings, set
                  taxes, and fortify borders. Development reduces available magical sources.
                </li>
                <li>
                  <strong>Raise and move armies.</strong> Open Military to recruit. Select an army
                  and an adjacent destination. Crossing foreign borders requires war or an alliance.
                </li>
                <li>
                  <strong>Negotiate.</strong> Review each neighbor’s relations and willingness in
                  Diplomacy. A pact needs relations of at least −10; an alliance needs +20. Rejected
                  proposals still cost resources.
                </li>
                <li>
                  <strong>End the season.</strong> Two opponents take valid actions, then taxes,
                  upkeep, regency, and seeded events resolve. Respond to petitions before giving
                  further orders.
                </li>
                <li>
                  <strong>Preserve your reign.</strong> Save locally or export a campaign file from
                  the game menu. No account or backend is needed.
                </li>
              </ol>
              <h3>Research & prototype limits</h3>
              <p>
                The supplied CD verifies the three-action season, tax ranges, holding capacity,
                regency cap, and basic unit costs. This test world, its regents, deterministic
                development, simplified conquest, and combat strength are provisional. Warden’s
                Aegis is an original test spell available to wizard regents with a level 2 source.
              </p>
              <p>
                The authentic Anuire dataset, trade-route construction, investiture, tactical
                battles, and 3D adventures are deferred. No original graphics, audio, or proprietary
                source code are bundled.
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
