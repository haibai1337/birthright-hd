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
  commandRealm,
  DEFAULT_CAMPAIGN_EVENTS,
  type CampaignEventOptions,
  type CampaignDifficulty,
  type SelectionMode,
} from '../../../packages/core';
import { loadAnuireScenario } from '../../../packages/world-data/anuire-scenario';
import { type MapOverlay } from '../../../packages/rendering/types';
import { Icon } from '../../../packages/ui/Icon';
import { errors, logText, playerJournal, season } from '../../../packages/ui/strings';
import { type Panel } from './Sidebar';
import { Modal } from './Modal';
import { loadOriginalAssets, assetUrl, type OriginalAssets } from './original-assets';
import { originalAudio } from './audio';
import { OptionsPanel } from './OptionsPanel';
import { GorgonScene } from './GorgonScene';
import { NewGamePanel } from './NewGamePanel';
import { strategicMaterials } from './StrategicArt';
import { ClassicCampaign, ClassicMainMenu } from './ClassicChrome';
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
        const strategy = await fetch('/original/strategy.research.json');
        return loadAnuireScenario(
          data,
          response.ok ? await response.json() : undefined,
          magic.ok ? await magic.json() : undefined,
          strategy.ok ? await strategy.json() : undefined,
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
  const [councilOpen, setCouncilOpen] = useState(false);
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
  const [regentId, setRegentId] = useState(
    scenario.realms.find((r) => r.id === realmId)!.regent.id,
  );
  function chooseRealm(id: string) {
    if (id === realmId) return;
    setRealmId(id);
    setRegentId(scenario.realms.find((r) => r.id === id)!.regent.id);
  }
  const [seed, setSeed] = useState('1997');
  const [victoryTarget, setVictoryTarget] = useState<300 | 400 | 500>(400);
  const [ruleset, setRuleset] = useState<RulesetId>('ENHANCED');
  const [eventDefaults, setEventDefaults] = useState<CampaignEventOptions>({
    ...DEFAULT_CAMPAIGN_EVENTS,
  });
  const [difficulty, setDifficulty] = useState<CampaignDifficulty>('medium');
  const [selectionDefaults, setSelectionDefaults] = useState<SelectionMode>(
    scenario.selection?.mode ?? 'CLASSIC',
  );
  const [diplomacyDefaults, setDiplomacyDefaults] = useState(false);
  const selectionMode = state ? (state.selectionMode ?? scenario.selection?.mode ?? 'CLASSIC') : selectionDefaults;
  const unrestrictedDiplomacy = state?.unrestrictedDiplomacy ?? diplomacyDefaults;
  useEffect(() => {
    if (state) {
      setSelectionDefaults(state.selectionMode ?? scenario.selection?.mode ?? 'CLASSIC');
      setDiplomacyDefaults(state.unrestrictedDiplomacy);
    }
  }, [state?.selectionMode, state?.unrestrictedDiplomacy]);
  useEffect(() => {
    if (!realmSelectable(scenario, realmId, selectionMode))
      chooseRealm(scenario.realms.find((r) => realmSelectable(scenario, r.id, selectionMode))!.id);
  }, [selectionMode, realmId, scenario]);
  const file = useRef<HTMLInputElement>(null);
  const actingRealm = state ? commandRealm(state, scenario) : null;
  useEffect(() => {
    if (state && actingRealm) setSelected(domainFocus(state, actingRealm));
  }, [actingRealm]);
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
      if (e.type === 'pointerdown' && e.target instanceof Element) {
        const button = e.target.closest('button');
        if (button)
          originalAudio.effect(/^Open .+ council$/.test(button.title) ? 'council' : 'click');
      }
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
      const restored = loadSettings();
      setSettings(restored);
      persistSettings(restored);
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
    const result = applyCommand(
      state,
      scenario,
      command.type === 'ContinueCampaign' ||
        command.type === 'SetCampaignOptions' ||
        command.type === 'AcknowledgeCampaignScene'
        ? state.playerRealm
        : commandRealm(state, scenario),
      command,
    );
    if (!result.ok) {
      originalAudio.effect('error');
      notice(result.error.detail ?? errors[result.error.code], true);
      return;
    }
    accept(result.state);
    if (result.state.turn > state.turn && result.state.outcome === 'ongoing')
      setCouncilOpen(true);
    if (command.type === 'CastRealmSpell') originalAudio.effect('magic');
    if (command.type === 'MoveArmy') {
      const army = result.state.armies.find((a) => a.id === command.armyId);
      if (army) setSelected(army.provinceId);
    }
    if (command.type !== 'EndTurn') {
      const last = playerJournal(result.state).at(-1);
      if (last) notice(logText(last, scenario, original.eventReports));
    }
  }
  function start() {
    const value = Number(seed);
    if (seed.trim() === '' || !Number.isInteger(value) || value < 0 || value > 4294967295) {
      notice('Enter a whole campaign seed from 0 to 4294967295.', true);
      return;
    }
    const next = createCampaign(
      scenario,
      realmId,
      value,
      ruleset,
      selectionMode,
      victoryTarget,
      regentId,
      difficulty,
      eventDefaults,
      unrestrictedDiplomacy,
    );
    accept(next);
    setCouncilOpen(true);
    setSelected(domainFocus(next));
    setPanel('province');
    setDialog(null);
  }
  function load(automatic: boolean) {
    try {
      const next = loadCampaign(scenario, automatic);
      setState(next);
      setCouncilOpen(false);
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
    // Apply within the user gesture, including resume after an autoplay rejection.
    originalAudio.configure(original, next, state ? 'campaign' : 'menu');
    originalAudio.unlock();
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
          state={
            actingRealm === state.playerRealm ? state : { ...state, playerRealm: actingRealm! }
          }
          scenario={scenario}
          selected={selected}
          panel={panel}
          overlay={overlay}
          settings={settings}
          onSelect={setSelected}
          onPanel={setPanel}
          onOverlay={setOverlay}
          councilOpen={councilOpen}
          onCouncilOpen={() => setCouncilOpen(true)}
          onCouncilClose={() => setCouncilOpen(false)}
          issue={issue}
          save={save}
          open={setDialog}
          mainMenu={() => {
            setState(null);
            setCouncilOpen(false);
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
      {state?.eventOptions.gorgonPlot &&
        state.pendingGorgonScenes[0] &&
        !dialog &&
        !councilOpen && (
        <GorgonScene
          key={state.pendingGorgonScenes[0]}
          stage={state.pendingGorgonScenes[0]}
          pack={original}
          onContinue={() =>
            issue({ type: 'AcknowledgeCampaignScene', stage: state.pendingGorgonScenes[0]! })
          }
        />
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
              setCouncilOpen(false);
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
              settings: 'Options',
              help: 'The regent’s field guide',
              menu: 'The royal council',
            }[dialog]
          }
          onClose={() => setDialog(null)}
          wide={dialog === 'new'}
          className={
            dialog === 'settings' ? 'options-dialog' : dialog === 'new' ? 'new-game-dialog' : ''
          }
          style={
            dialog === 'settings' || dialog === 'new' ? strategicMaterials(original) : undefined
          }
        >
          {dialog === 'new' && (
            <NewGamePanel
              scenario={scenario}
              pack={original}
              realmId={realmId}
              onRealm={chooseRealm}
              regentId={regentId}
              onRegent={setRegentId}
              ruleset={ruleset}
              onRuleset={setRuleset}
              seed={seed}
              onSeed={setSeed}
              victoryTarget={victoryTarget}
              onVictoryTarget={setVictoryTarget}
              onStart={start}
              selectionMode={selectionMode}
            />
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
                      setCouncilOpen(false);
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
            <OptionsPanel
              pack={original}
              settings={settings}
              onChange={changeSettings}
              onClose={() => setDialog(null)}
              eventOptions={state?.eventOptions ?? eventDefaults}
              difficulty={state?.difficulty ?? difficulty}
              activeCampaign={Boolean(state)}
              selectionMode={selectionMode}
              unrestrictedDiplomacy={unrestrictedDiplomacy}
              onAccessChange={(mode, diplomacy) => {
                if (state)
                  issue({
                    type: 'SetCampaignOptions',
                    selectionMode: mode,
                    unrestrictedDiplomacy: diplomacy,
                  });
                else {
                  setSelectionDefaults(mode);
                  setDiplomacyDefaults(diplomacy);
                }
              }}
              onCampaignChange={(eventOptions, nextDifficulty) => {
                if (state)
                  issue({ type: 'SetCampaignOptions', eventOptions, difficulty: nextDifficulty });
                else {
                  setEventDefaults(eventOptions);
                  setDifficulty(nextDifficulty);
                }
              }}
            />
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
                Tactical battles, character succession, unresolved realm spells and 3D adventures
                remain in development. Shortcuts: P provinces, M military, D diplomacy, Ctrl+S save,
                F1 help and Escape to close a council window.
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
