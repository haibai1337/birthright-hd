import { useEffect, useState, type CSSProperties } from 'react';
import {
  rulingRegent,
  forecast,
  sourcePotential,
  bloodlineStrength,
  type Campaign,
  type Command,
  type Scenario,
} from '../../../packages/core';
import { logText, playerJournal, season, signed } from '../../../packages/ui/strings';
import { assetUrl, type OriginalAssets } from './original-assets';
import { MapPanel } from './MapPanel';
import { Sidebar, type Panel } from './Sidebar';
import { CouncilScreen } from './CouncilScreen';
import type { MapOverlay } from '../../../packages/rendering/types';
import type { Settings } from './storage';
import { CouncilIcon, StrategicImage, strategicMaterials } from './StrategicArt';

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
        <OriginalImage pack={pack} id="UI/MAINPANL.PCX" className="classic-menu-panel" />
        <img
          className="classic-menu-logo"
          src="/art/branding/birthright-logo-hd.png"
          alt="Birthright: The Gorgon's Alliance"
          width={1377}
          height={768}
          draggable={false}
        />
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
  councilOpen: boolean;
  onCouncilOpen: () => void;
  onCouncilClose: () => void;
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
  councilOpen,
  onCouncilOpen,
  onCouncilClose,
  issue,
  save,
  open,
  mainMenu,
}: Props) {
  const [inspecting, setInspecting] = useState(false);
  const [councilReturn, setCouncilReturn] = useState(false);
  useEffect(() => {
    if (state.pendingDomainAction) {
      setInspecting(true);
      onPanel('province');
      onSelect(state.pendingDomainAction.checks[state.pendingDomainAction.index]!.provinceId);
    }
  }, [state.pendingDomainAction, onPanel, onSelect]);
  const definition = scenario.realms.find((r) => r.id === state.playerRealm)!,
    player = { ...definition, regent: rulingRegent(scenario, definition.id, state)! },
    realm = state.realms.find((r) => r.id === player.id)!,
    income = forecast(state, scenario, player.id),
    latest = playerJournal(state).at(-1),
    petition = state.pendingEvents.find((e) => e.realmId === player.id);
  const avatar = Number(player.regent.original?.avatarId),
    portrait = pack.portraits[String(avatar)];
  const province = state.provinces.find((p) => p.id === selected)!,
    provinceDef = scenario.provinces.find((p) => p.id === selected)!,
    provinceOwner = scenario.realms.find((r) => r.id === province.owner),
    provinceTroops = state.armies
      .filter((a) => a.provinceId === selected)
      .reduce((n, a) => n + a.units.length, 0);
  const show = (p: Panel) => {
    setCouncilReturn(false);
    onPanel(p);
    setInspecting(true);
  };
  const showCouncil = () => {
    setCouncilReturn(false);
    setInspecting(false);
    onCouncilOpen();
  };
  const openCouncilPanel = (p: Panel) => {
    setCouncilReturn(true);
    onPanel(p);
    setInspecting(true);
    onCouncilClose();
  };
  const select = (id: string) => {
    onSelect(id);
    setInspecting(true);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (councilOpen) return;
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
  }, [councilOpen, open, save]);
  const actionRows: [Panel, string, number][] = [
    ['realm', 'Realm', 2],
    ['diplomacy', 'Diplomacy', 3],
    ['province', 'Provinces', 4],
    ['military', 'Military', 7],
  ];
  return (
    <div
      className="classic-game hd-strategy"
      style={strategicMaterials(pack)}
      data-testid="classic-layout"
    >
      <aside className="classic-council" aria-label="Regent and domain actions">
        <button
          className="classic-realm-name"
          onClick={() => show('realm')}
          title="Open the realm ledger"
        >
          {player.name}
        </button>
        <div className="classic-regent">
          {portrait && (
            <StrategicImage
              pack={pack}
              id={portrait}
              alt={player.regent.name}
              className="regent-portrait"
            />
          )}
          <div
            className="hd-regent-identity"
            title={`${player.regent.bloodline.derivation} bloodline · Strength ${bloodlineStrength(state, scenario, player.id)}`}
          >
            <StrategicImage
              pack={pack}
              id="UI/DSHLD_IC.PCX"
              className="hd-council-emblem"
              alt="Council emblem"
            />
            <h2>{player.regent.name}</h2>
            <span className="hd-regent-class">{player.regent.class} regent</span>
            <span className="hd-bloodline">
              {player.regent.bloodline.derivation} bloodline
              <br />
              Strength {bloodlineStrength(state, scenario, player.id)}
            </span>
          </div>
        </div>
        <dl className="classic-balances">
          <div>
            <dt>
              <StrategicImage pack={pack} id="UI/GOLD03_A.PCX" className="hd-gold" />
              <span>Treasury</span>
            </dt>
            <dd data-testid="treasury">
              {realm.treasury}
              <small>GB</small>
            </dd>
          </div>
          <div>
            <dt>
              <StrategicImage pack={pack} id="UI/CROWN_TL.PCX" className="hd-regency" />
              <span>Regency</span>
            </dt>
            <dd>
              {realm.regency}
              <small> RP</small>
            </dd>
          </div>
        </dl>
        <p className="classic-income" title="Expected seasonal balance">
          <span className="hd-income-label">Seasonal forecast: </span>
          {signed(income.net)} GB · +{income.regency} RP
          <span className="hd-income-period"> / season</span>
        </p>
        <div className="classic-turn">
          <strong>{season(state.turn)}</strong>
          {realm.controller !== 'player' && (
            <span role="status" data-testid="vassal-command">
              Commanding {player.name} · own treasury and actions
            </span>
          )}
          <span>
            <span className="hd-turn-domain">DOMAIN </span>TURN {state.turn}
            {state.domainTurn && ` · Round ${state.domainTurn.round}/3`}
          </span>
          <div className="hd-action-budget">
            <span className="hd-action-seals" aria-hidden="true">
              {[0, 1, 2].map((n) => (
                <i key={n} className={n < realm.actions ? 'available' : ''} />
              ))}
            </span>
            <strong data-testid="actions-left">{realm.actions} of 3 remaining</strong>
          </div>
        </div>
        <button className="classic-council-entry" onClick={showCouncil}>
          Council of advisors
        </button>
        <div className="hd-section-caption">Domain councils</div>
        <nav className="classic-actions" aria-label="Council panels">
          {actionRows.map(([id, label, row]) => (
            <button
              key={id}
              aria-pressed={panel === id && inspecting}
              onClick={() => show(id)}
              title={`Open ${label.toLowerCase()} council`}
            >
              <CouncilIcon pack={pack} row={row} />
              <b>{label}</b>
              <span className="hd-council-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </nav>
        <button
          className="classic-end-season hd-council-end-season"
          disabled={state.outcome !== 'ongoing'}
          onClick={() => issue({ type: 'EndTurn' })}
        >
          End season <span aria-hidden="true">▸</span>
        </button>
      </aside>
      <section className="classic-map-area" aria-label="Strategic map">
        <div className="hd-map-heading">
          <div className="hd-map-title">
            <span>ANUIRE</span>
            <small>The domain map</small>
          </div>
          <button
            className="hd-selected-name"
            onClick={() => show('province')}
            title="Inspect the selected province"
          >
            <strong>{provinceDef.name}</strong>
            <span>
              {provinceOwner?.name} · {provinceDef.terrain}
              {province.occupiedBy &&
                ` · Occupied: ${scenario.realms.find((r) => r.id === province.occupiedBy)?.name}`}
              {province.contested && ' · Contested'}
            </span>
          </button>
          <dl className="hd-selected-stats" aria-label="Selected province information">
            <div>
              <dt>Province</dt>
              <dd>
                {province.level}
                <small> / {provinceDef.maxLevel}</small>
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{sourcePotential(scenario, selected, province.level)}</dd>
            </div>
            <div>
              <dt>Fort</dt>
              <dd>{province.fort}</dd>
            </div>
            <div>
              <dt>Troops</dt>
              <dd>{provinceTroops}</dd>
            </div>
          </dl>
        </div>
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
          <img
            src="/art/branding/birthright-logo-hd.png"
            alt=""
            width={1377}
            height={768}
            draggable={false}
          />
          Menu
        </button>
        {inspecting && (
          <section className="classic-inspector" aria-label={`${panel} window`}>
            <header>
              <strong>
                {panel === 'province'
                  ? scenario.provinces.find((p) => p.id === selected)?.name
                  : panel}
              </strong>
              {councilReturn && (
                <button className="council-return" onClick={showCouncil}>
                  Return to Council
                </button>
              )}
              <button
                aria-label="Close council window"
                onClick={() => {
                  setInspecting(false);
                  setCouncilReturn(false);
                }}
              >
                ×
              </button>
            </header>
            <Sidebar
              eventReports={pack.eventReports}
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
        <div className="classic-map-overlay-bar" aria-label="Map overlays">
          <span className="hd-toolbar-caption">Map view</span>
          <div>
            {(['political', 'military', 'economic', 'magical'] as const).map((o) => (
              <button
                key={o}
                aria-label={`Map overlay: ${o}`}
                aria-pressed={overlay === o}
                title={`Show ${o} information`}
                onClick={() => onOverlay(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        <button
          className="hd-toolbar-province"
          aria-label="Open province window"
          onClick={() => show('province')}
        >
          <CouncilIcon pack={pack} row={4} size={44} />
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
        <button
          className="hd-toolbar-muster"
          onClick={() => show('military')}
          title="Recruit troops or issue a march"
        >
          Muster / march
        </button>
        <button
          className="hd-toolbar-chronicle"
          aria-label="Open chronicle window"
          onClick={() => show('chronicle')}
        >
          Chronicle
        </button>
        <div className="hd-toolbar-utilities">
          <button onClick={save} aria-label="Save game" title="Save campaign · Ctrl+S">
            Save
          </button>
          <button onClick={() => open('settings')} aria-label="Settings">
            Options
          </button>
          <button onClick={() => open('help')} aria-label="How to play" title="Field guide · F1">
            Help
          </button>
        </div>
        <button
          className="classic-end-season hd-toolbar-end-season"
          disabled={state.outcome !== 'ongoing'}
          onClick={() => issue({ type: 'EndTurn' })}
        >
          End season <span aria-hidden="true">▸</span>
        </button>
        <span className="classic-profile">
          {state.ruleset}
          <small>Anuire campaign</small>
        </span>
      </footer>
      <div
        className="classic-map-readout"
        role="status"
        aria-live="polite"
        title={latest ? logText(latest, scenario, pack.eventReports) : `${player.name}'s turn`}
      >
        <span className="hd-message-label">Council dispatch</span>
        <span key={state.log.length}>
          {latest ? logText(latest, scenario, pack.eventReports) : `${player.name}'s turn`}
        </span>
        <span className="hd-map-help">Scroll to zoom · Drag to explore</span>
      </div>
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
          {state.outcome === 'victory' && scenario.policy?.strategicRules === 'pc-1997' && (
            <button onClick={() => issue({ type: 'ContinueCampaign' })}>Continue as Emperor</button>
          )}
          <button onClick={mainMenu}>Main menu</button>
        </div>
      )}
      {councilOpen && (
        <CouncilScreen
          pack={pack}
          factionIndex={
            typeof definition.original?.index === 'number' ? definition.original.index : undefined
          }
          onOpenPanel={openCouncilPanel}
          onDone={onCouncilClose}
        />
      )}
    </div>
  );
}
