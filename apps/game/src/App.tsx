import { useEffect, useRef, useState } from 'react';
import {
  applyCommand,
  createCampaign,
  deserializeCampaign,
  type Campaign,
  type Command,
  type RulesetId,
  type Scenario,
  realmSelectable,
  domainFocus,
} from '../../../packages/core';
import { loadAnuireScenario } from '../../../packages/world-data/anuire-scenario';
import { type MapOverlay } from '../../../packages/rendering/types';
import { Herald } from '../../../packages/ui/Herald';
import { Icon } from '../../../packages/ui/Icon';
import { errors, logText, playerJournal, season } from '../../../packages/ui/strings';
import { type Panel } from './Sidebar';
import { Modal } from './Modal';
import { loadOriginalAssets, assetUrl, type OriginalAssets } from './original-assets';
import { originalAudio } from './audio';
import { ClassicCampaign, ClassicMainMenu, OriginalImage } from './ClassicChrome';
import './classic.css';
import './strategy-hd.css';
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
  const [original, setOriginal] = useState<OriginalAssets | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [assetError, setAssetError] = useState('');
  const [campaignError, setCampaignError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setAssetError('');
    setCampaignError('');
    void loadOriginalAssets()
      .then((pack) => {
        if (active) setOriginal(pack);
      })
      .catch((error) => {
        if (active) setAssetError(String(error.message ?? error));
      });
    void fetch('/original/anuire.research.json')
      .then((response) => {
        if (!response.ok)
          throw Error('Anuire campaign data is missing. Run npm run assets:import.');
        return response.json();
      })
      .then(async (data) => {
        const response = await fetch('/original/economy.research.json');
        const magic = await fetch('/original/magic.research.json');
        return loadAnuireScenario(
          data,
          response.ok ? await response.json() : undefined,
          magic.ok ? await magic.json() : undefined,
        );
      })
      .then((data) => {
        if (active) setScenario(data);
      })
      .catch((error) => {
        if (active) setCampaignError(String(error.message ?? error));
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  if (original && scenario) return <Game original={original} scenario={scenario} />;
  return (
    <main className="setup-screen" aria-label="Birthright setup">
      <h1>Birthright HD</h1>
      <h2>Anuire campaign setup</h2>
      <p>
        {assetError || campaignError
          ? 'Original game data is required before starting a campaign.'
          : 'Loading Anuire and original game assets…'}
      </p>
      {assetError && <p role="alert">{assetError}</p>}
      {campaignError && <p role="alert">{campaignError}</p>}
      {(assetError || campaignError) && (
        <>
          <p>
            Place your disc at <code>reference/original/RPGBGA.BIN</code>, then run:
          </p>
          <pre>npm run assets:import</pre>
          <button onClick={() => setAttempt((n) => n + 1)}>Retry setup</button>
        </>
      )}
      {campaignError && (
        <label className="setup-import">
          Load extracted Anuire campaign data
          <input
            type="file"
            accept=".json,application/json"
            data-testid="anuire-campaign-import"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              if (file.size > 32_000_000) {
                setCampaignError('Campaign data exceeds the 32 MB limit.');
                return;
              }
              void file
                .text()
                .then((text) => loadAnuireScenario(JSON.parse(text)))
                .then((data) => {
                  setScenario(data);
                  setCampaignError('');
                })
                .catch((error) =>
                  setCampaignError('Anuire load failed: ' + String(error.message ?? error)),
                );
            }}
          />
        </label>
      )}
    </main>
  );
}
function Game({ original, scenario }: { original: OriginalAssets; scenario: Scenario }) {
  const [state, setState] = useState<Campaign | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selected, setSelected] = useState(scenario.provinces[0]!.id);
  const [panel, setPanel] = useState<Panel>('province');
  const [overlay, setOverlay] = useState<MapOverlay>('political');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [realmId, setRealmId] = useState(
    scenario.realms.find((r) => realmSelectable(scenario, r.id))!.id,
  );
  const [seed, setSeed] = useState('1997');
  const [ruleset, setRuleset] = useState<RulesetId>('ENHANCED');
  const file = useRef<HTMLInputElement>(null);
  const notice = (text: string, error = false) => {
    setMessage(text);
    setIsError(error);
  };
  useEffect(() => {
    originalAudio.configure(original, settings, state ? 'campaign' : 'menu');
  }, [original, settings, state]);
  useEffect(() => {
    const interaction = (e: Event) => {
      originalAudio.unlock();
      if (e.type === 'pointerdown' && e.target instanceof Element && e.target.closest('button'))
        originalAudio.effect('click');
    };
    window.addEventListener('pointerdown', interaction, true);
    window.addEventListener('keydown', interaction, true);
    return () => {
      window.removeEventListener('pointerdown', interaction, true);
      window.removeEventListener('keydown', interaction, true);
      originalAudio.destroy();
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.add('original-presentation');
    for (const [name, id] of Object.entries({
      parchment: 'UI/DTURN_BK.PCX',
      button: 'UI/SCRLBTN0.PCX',
      buttonDown: 'UI/SCRLBTN1.PCX',
      dialog: 'UI/MARBLE01.PCX',
      toolbar: 'UI/DMAP_IC.PCX',
    }))
      document.documentElement.style.setProperty(
        '--original-' + name,
        `url("${assetUrl(original, id)}")`,
      );
    return () => document.documentElement.classList.remove('original-presentation');
  }, [original]);
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
      originalAudio.effect('error');
      notice(result.error.detail ?? errors[result.error.code], true);
      return;
    }
    accept(result.state);
    if (command.type === 'MoveArmy') {
      const army = result.state.armies.find((a) => a.id === command.armyId);
      if (army) setSelected(army.provinceId);
    }
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
    setSelected(domainFocus(next));
    setPanel('province');
    setDialog(null);
  }
  function load(automatic: boolean) {
    try {
      const next = loadCampaign(scenario, automatic);
      setState(next);
      setSelected(domainFocus(next));
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
  return (
    <div
      className={`app ${state ? 'campaign-active' : ''} ${settings.largeText ? 'large-text' : ''}`}
      data-original-assets="ready"
    >
      {!state ? (
        <ClassicMainMenu
          pack={original}
          onAction={(action) => {
            if (action === 'quit') setDialog('help');
            else if (action !== 'return' && action !== 'save') setDialog(action);
          }}
        />
      ) : (
        <ClassicCampaign
          pack={original}
          state={state}
          scenario={scenario}
          selected={selected}
          panel={panel}
          overlay={overlay}
          settings={settings}
          onSelect={setSelected}
          onPanel={setPanel}
          onOverlay={setOverlay}
          issue={issue}
          save={save}
          open={setDialog}
          mainMenu={() => {
            setState(null);
            setDialog(null);
          }}
        />
      )}
      {message && (
        <div className={`toast ${isError ? 'error' : ''}`} role={isError ? 'alert' : 'status'}>
          {message}
          <button aria-label="Dismiss notification" onClick={() => setMessage('')}>
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      {dialog === 'menu' && (
        <ClassicMainMenu
          pack={original}
          inGame
          onAction={(action) => {
            if (action === 'return') setDialog(null);
            else if (action === 'save') {
              save();
              setDialog(null);
            } else if (action === 'quit') {
              setState(null);
              setDialog(null);
            } else setDialog(action);
          }}
        />
      )}
      {dialog && dialog !== 'menu' && (
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
                <span className="eyebrow">ANUIRE · EXPERIMENTAL ORIGINAL TEMPLATE</span>
                <p>
                  {`${scenario.provinces.length} original provinces. Choose an eligible regent; active territorial and holding domains use AI. Starting records are original; gameplay uses documented compatibility rules.`}
                </p>
              </div>
              {scenario.fingerprint && (
                <label>
                  Choose Anuire regent
                  <select
                    aria-label="Choose Anuire regent"
                    value={realmId}
                    onChange={(e) => setRealmId(e.target.value)}
                  >
                    {scenario.realms
                      .filter((r) => realmSelectable(scenario, r.id))
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} · {r.regent.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <div className="realm-choices">
                {scenario.realms
                  .filter((r) => realmSelectable(scenario, r.id) && r.id === realmId)
                  .map((r) => (
                    <button
                      key={r.id}
                      className={`realm-choice ${realmId === r.id ? 'selected' : ''}`}
                      aria-pressed={realmId === r.id}
                      onClick={() => setRealmId(r.id)}
                    >
                      {original.portraits[String(r.regent.original?.avatarId)] ? (
                        <OriginalImage
                          pack={original}
                          id={original.portraits[String(r.regent.original?.avatarId)]!}
                          alt={r.regent.name}
                          className="regent-portrait"
                        />
                      ) : (
                        <Herald realm={r} size={62} />
                      )}
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
                  <select
                    aria-label="Ruleset"
                    value={ruleset}
                    onChange={(e) => setRuleset(e.target.value as RulesetId)}
                  >
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
                {
                  'Original template selection flags apply. Both rule profiles are experimental. Reach domain power 600 or lead after 80 seasons; holding-only domains survive without provinces.'
                }
              </p>
              {scenario.fingerprint && (
                <details className="compatibility-details">
                  <summary>Experimental campaign policies</summary>
                  <ul>
                    {scenario.compatibilityNotes?.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </details>
              )}
              <button className="primary full" onClick={start}>
                Begin your reign <Icon name="arrow" />
              </button>
            </>
          )}
          {dialog === 'load' && (
            <>
              <p>Campaigns are stored in this browser on this device.</p>
              {state && (
                <button className="menu-action" onClick={() => downloadCampaign(state)}>
                  Export campaign file
                </button>
              )}
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
                      setSelected(domainFocus(next));
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
              <div className="audio-settings">
                <h3>Original soundtrack</h3>
                <p>Recovered original recordings. Playback starts after a click or key press.</p>
                {original.music.campaignFallback && (
                  <p className="audio-cue-note">
                    Original realm cue 105 is missing from this disc image. Campaign playback uses
                    recovered track 101 as an explicitly selected alternate.
                  </p>
                )}
                <button onClick={() => originalAudio.unlock()}>Enable music</button>
                <label className="setting">
                  <span>Music volume</span>
                  <input
                    aria-label="Music volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.musicVolume}
                    onChange={(e) =>
                      changeSettings({ ...settings, musicVolume: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="setting">
                  <span>Effects volume</span>
                  <input
                    aria-label="Effects volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.effectsVolume}
                    onChange={(e) =>
                      changeSettings({ ...settings, effectsVolume: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="setting">
                  <span>Mute all audio</span>
                  <input
                    type="checkbox"
                    checked={settings.muted}
                    onChange={(e) => changeSettings({ ...settings, muted: e.target.checked })}
                  />
                </label>
                {original && (
                  <label className="select-label">
                    Campaign soundtrack
                    <select
                      aria-label="Campaign soundtrack"
                      value={settings.campaignTrack}
                      onChange={(e) =>
                        changeSettings({ ...settings, campaignTrack: e.target.value })
                      }
                    >
                      <option value="default">
                        {original.music.campaignFallback
                          ? 'Alternate original track 101 (realm 105 unavailable)'
                          : 'Original realm cue 105'}
                      </option>
                      {Object.keys(original.assets)
                        .filter((id) => /^MUSIC\//.test(id))
                        .map((id) => (
                          <option key={id} value={id}>
                            {id.replace('MUSIC/', 'Original track ')}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {original && (
                  <a href="/original/catalog.html" target="_blank" rel="noreferrer">
                    Browse original asset catalog
                  </a>
                )}
              </div>
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
                  <strong>End the season.</strong> Non-player domains take valid actions, then
                  taxes, upkeep, regency, and seeded events resolve. Respond to petitions before
                  giving further orders.
                </li>
                <li>
                  <strong>Preserve your reign.</strong> Save locally or export a campaign file from
                  the game menu. No account or backend is needed.
                </li>
              </ol>
              <h3>Reconstruction limits</h3>
              <p>
                Anuire includes 206 original provinces and 51 domains. Starting records, map artwork
                and recordings come from the original game. Development, diplomacy, combat and
                victory use documented experimental rules; Classic is not a complete recreation of
                the 1997 rules.
              </p>
              <p>
                Trade-route construction, tactical battles and 3D adventures remain in development.
                Shortcuts: P provinces, M military, D diplomacy, Ctrl+S save, F1 help and Escape to
                close a council window.
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
