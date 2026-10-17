import { useEffect, useState, type CSSProperties } from 'react';
import { forecast, type Campaign, type Command, type Scenario } from '../../../packages/core';
import { logText, playerJournal, season, signed } from '../../../packages/ui/strings';
import { assetUrl, type OriginalAssets } from './original-assets';
import { MapPanel } from './MapPanel';
import { Sidebar, type Panel } from './Sidebar';
import type { MapOverlay } from '../../../packages/rendering/types';
import type { Settings } from './storage';

export function OriginalImage({
  pack,
  id,
  alt = '',
  className = '',
}: {
  pack: OriginalAssets;
  id: string;
  alt?: string;
  className?: string;
}) {
  const asset = pack.assets[id],
    src = assetUrl(pack, id);
  return src ? (
    <img
      className={className}
      src={src}
      alt={alt}
      width={asset?.width}
      height={asset?.height}
      draggable={false}
    />
  ) : null;
}
export function ClassicMainMenu({
  pack,
  inGame = false,
  onAction,
}: {
  pack: OriginalAssets;
  inGame?: boolean;
  onAction: (action: 'return' | 'new' | 'load' | 'save' | 'settings' | 'help' | 'quit') => void;
}) {
  const rows = [
    { action: 'return', text: 'Return to Game', label: 'Return to game', disabled: !inGame },
    { action: 'new', text: 'Begin New Game', label: 'New game' },
    { action: 'load', text: 'Load Saved Game', label: 'Load game' },
    { action: 'save', text: 'Save Current Game', label: 'Save game', disabled: !inGame },
    { action: 'settings', text: 'Options', label: 'Settings' },
    { action: null, text: 'Multiplayer', label: 'Multiplayer unavailable', disabled: true },
    { action: 'help', text: 'Help (F1)', label: 'How to play' },
    {
      action: 'quit',
      text: inGame ? 'Main Menu' : 'About',
      label: inGame ? 'Main menu' : 'About this campaign',
    },
  ] as const;
  return (
    <main
      className={`classic-main-menu ${inGame ? 'in-game-menu' : ''}`}
      style={{ '--menu-map': `url("${assetUrl(pack, 'MAP/SMMAP.PCX')}")` } as CSSProperties}
      aria-label="Birthright main menu"
    >
      <div className="classic-menu-shield">
        <OriginalImage pack={pack} id="UI/MAINPANL.PCX" alt="Birthright: The Gorgon's Alliance" />
        <nav aria-label="Main menu">
          {rows.map((r, i) => (
            <button
              key={i}
              aria-label={r.label}
              disabled={'disabled' in r ? r.disabled : false}
              style={{
                top: `${((242 + i * 26.1) / 480) * 100}%`,
                left: `${([64, 66, 67, 71, 79, 92, 112, 141][i]! / 420) * 100}%`,
                width: `${([292, 290, 288, 280, 264, 238, 198, 140][i]! / 420) * 100}%`,
              }}
              onClick={() => r.action && onAction(r.action)}
            >
              {r.text}
            </button>
          ))}
        </nav>
      </div>
      <p className="classic-build-label">BIRTHRIGHT HD · ANUIRE</p>
    </main>
  );
}
interface Props {
  pack: OriginalAssets;
  state: Campaign;
  scenario: Scenario;
  selected: string;
  panel: Panel;
  overlay: MapOverlay;
  settings: Settings;
  onSelect: (id: string) => void;
  onPanel: (panel: Panel) => void;
  onOverlay: (overlay: MapOverlay) => void;
  issue: (command: Command) => void;
  save: () => void;
  open: (dialog: 'new' | 'load' | 'settings' | 'help' | 'menu') => void;
  mainMenu: () => void;
}
export function ClassicCampaign({
  pack,
  state,
  scenario,
  selected,
  panel,
  overlay,
  settings,
  onSelect,
  onPanel,
  onOverlay,
  issue,
  save,
  open,
  mainMenu,
}: Props) {
  const [inspecting, setInspecting] = useState(false);
  const player = scenario.realms.find((r) => r.id === state.playerRealm)!,
    realm = state.realms.find((r) => r.id === player.id)!,
    income = forecast(state, scenario, player.id),
    latest = playerJournal(state).at(-1),
    petition = state.pendingEvents.find((e) => e.realmId === player.id);
  const avatar = Number(player.regent.original?.avatarId),
    portrait = pack.portraits[String(avatar)];
  const show = (p: Panel) => {
    onPanel(p);
    setInspecting(true);
  };
  const select = (id: string) => {
    onSelect(id);
    setInspecting(true);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input,select,textarea,dialog'))
        return;
      if (e.key === 'Escape') {
        setInspecting(false);
        return;
      }
      if (e.key === 'F1') {
        e.preventDefault();
        open('help');
      }
      if (e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        save();
      }
      if (e.key.toLowerCase() === 'p') show('province');
      if (e.key.toLowerCase() === 'm') show('military');
      if (e.key.toLowerCase() === 'd') show('diplomacy');
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const actionRows: [Panel, string, number][] = [
    ['realm', 'Realm', 2],
    ['diplomacy', 'Diplomacy', 3],
    ['province', 'Provinces', 4],
    ['military', 'Military', 7],
    ['chronicle', 'Chronicle', 5],
  ];
  return (
    <div className="classic-game" data-testid="classic-layout">
      <aside className="classic-council" aria-label="Regent and domain actions">
        <button className="classic-realm-name" onClick={() => show('realm')}>
          {player.name}
        </button>
        <div className="classic-regent">
          {portrait && (
            <OriginalImage
              pack={pack}
              id={portrait}
              alt={player.regent.name}
              className="regent-portrait"
            />
          )}
          <span>{player.regent.name}</span>
        </div>
        <dl className="classic-balances">
          <div>
            <dt>Regency:</dt>
            <dd>{realm.regency} RP</dd>
          </div>
          <div>
            <dt>Treasury:</dt>
            <dd data-testid="treasury">{realm.treasury}GB</dd>
          </div>
        </dl>
        <p className="classic-income" title="Expected seasonal balance">
          {signed(income.net)} GB · +{income.regency} RP / season
        </p>
        <div className="classic-turn">
          <strong>{season(state.turn)}</strong>
          <span>DOMAIN TURN {state.turn}</span>
          <small data-testid="actions-left">{realm.actions} of 3 remaining</small>
        </div>
        <nav className="classic-actions" aria-label="Council panels">
          {actionRows.map(([id, label, row]) => (
            <button key={id} aria-pressed={panel === id && inspecting} onClick={() => show(id)}>
              <span
                className="original-action-icon"
                style={{
                  backgroundImage: `url("${assetUrl(pack, 'UI/DACTN_IC.PCX')}")`,
                  backgroundPosition: `0 -${row * 48}px`,
                }}
              />
              <b>{label}</b>
            </button>
          ))}
        </nav>
        <button
          className="classic-end-season"
          disabled={state.outcome !== 'ongoing'}
          onClick={() => issue({ type: 'EndTurn' })}
        >
          End season ▸
        </button>
        <div className="classic-side-links">
          <button onClick={save} aria-label="Save game">
            Save
          </button>
          <button onClick={() => open('settings')} aria-label="Settings">
            Options
          </button>
          <button onClick={() => open('help')} aria-label="How to play">
            Help
          </button>
        </div>
      </aside>
      <section className="classic-map-area" aria-label="Strategic map">
        <MapPanel
          state={state}
          scenario={scenario}
          selected={selected}
          overlay={overlay}
          labels={settings.labels}
          onSelect={(id) => {
            if (panel !== 'military') onPanel('province');
            select(id);
          }}
          original={pack}
        />
        <button
          className="classic-game-menu"
          aria-label="Open game menu"
          onClick={() => open('menu')}
        >
          <OriginalImage pack={pack} id="UI/LOGO.PCX" alt="" />
          Menu
        </button>
        <div className="classic-map-overlay-bar" aria-label="Map overlays">
          {(['political', 'military', 'economic', 'magical'] as const).map((o) => (
            <button key={o} aria-pressed={overlay === o} onClick={() => onOverlay(o)}>
              {o}
            </button>
          ))}
        </div>
        <div className="classic-map-readout" role="status">
          {latest ? logText(latest, scenario) : `${player.name}'s turn`}
        </div>
        {inspecting && (
          <section className="classic-inspector" aria-label={`${panel} window`}>
            <header>
              <strong>
                {panel === 'province'
                  ? scenario.provinces.find((p) => p.id === selected)?.name
                  : panel}
              </strong>
              <button aria-label="Close council window" onClick={() => setInspecting(false)}>
                ×
              </button>
            </header>
            <Sidebar
              state={state}
              scenario={scenario}
              selected={selected}
              panel={panel}
              select={select}
              issue={issue}
            />
          </section>
        )}
      </section>
      <footer className="classic-toolbar">
        <button aria-label="Open province window" onClick={() => show('province')}>
          <span className="original-map-icon" />
          Province
        </button>
        <label>
          Inspect province
          <select
            aria-label="Inspect province"
            value={selected}
            onChange={(e) => {
              onPanel('province');
              select(e.target.value);
            }}
          >
            {scenario.provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => show('realm')}>Domain</button>
        <button onClick={() => show('military')}>Muster / march</button>
        <button aria-label="Open diplomacy window" onClick={() => show('diplomacy')}>
          Diplomacy
        </button>
        <button aria-label="Open chronicle window" onClick={() => show('chronicle')}>
          Chronicle
        </button>
        <span className="classic-profile">
          {state.ruleset} · Seed {state.seed}
          <small>Anuire · experimental template</small>
        </span>
      </footer>
      {petition && (
        <div className="petition" role="region" aria-label="Council petition">
          <div>
            <strong>A petition to the crown</strong>
            <p>Grant 2 GB for +1 loyalty, or decline for −1 loyalty.</p>
          </div>
          <button
            disabled={realm.treasury < 2}
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
          <h2>{state.outcome === 'victory' ? 'Your crown endures.' : 'Your reign has ended.'}</h2>
          <button onClick={() => open('new')}>Begin another reign</button>
          <button onClick={mainMenu}>Main menu</button>
        </div>
      )}
    </div>
  );
}
