import { useEffect, useState, type CSSProperties } from 'react';
import { originalAudio } from './audio';
import type { OriginalAssets } from './original-assets';
import type { Settings } from './storage';
import './options.css';
import type {
  CampaignDifficulty,
  CampaignEventOptions,
  SelectionMode,
} from '../../../packages/core';
import { campaignEventStrings as text, campaignEventLabels } from '../../../packages/ui/strings';
import { campaignAccessStrings as access } from '../../../packages/ui/strings';

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="options-toggle"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="options-toggle-track" aria-hidden="true">
        <span />
      </span>
      <b aria-hidden="true">{checked ? 'On' : 'Off'}</b>
    </button>
  );
}
export function OptionsPanel({
  pack,
  settings,
  onChange,
  onClose,
  eventOptions,
  difficulty,
  activeCampaign,
  onCampaignChange,
  selectionMode,
  unrestrictedDiplomacy,
  onAccessChange,
}: {
  pack: OriginalAssets;
  settings: Settings;
  onChange: (next: Settings) => void;
  onClose: () => void;
  eventOptions: CampaignEventOptions;
  difficulty: CampaignDifficulty;
  activeCampaign: boolean;
  onCampaignChange: (events: CampaignEventOptions, difficulty: CampaignDifficulty) => void;
  selectionMode: SelectionMode;
  unrestrictedDiplomacy: boolean;
  onAccessChange: (mode: SelectionMode, diplomacy: boolean) => void;
}) {
  const [tab, setTab] = useState<'general' | 'events' | 'access'>('general');
  const [playback, setPlayback] = useState(originalAudio.status);
  useEffect(() => originalAudio.subscribe(() => setPlayback(originalAudio.status)), []);
  const game = [
    {
      key: 'autosave',
      label: 'Automatic saves',
      description: 'Keep your campaign after each order.',
    },
    {
      key: 'largeText',
      label: 'Larger interface text',
      description: 'A more comfortable view of your councils.',
    },
    {
      key: 'labels',
      label: 'Province labels',
      description: 'Show names and source potential on the map.',
    },
  ] as const;
  const status = settings.muted
    ? 'All audio is muted. Your channel settings are preserved.'
    : !settings.musicEnabled
      ? 'Music is off. Sound effects remain available.'
      : settings.musicVolume === 0
        ? 'Music volume is at zero. Raise the slider to hear it.'
        : playback.playing
          ? 'Original soundtrack playing'
          : 'Music will resume after a click or key press.';
  return (
    <div className="options-panel">
      {tab === 'general' && (
        <p className="options-intro">
          Make yourself at home in Anuire. Changes are saved automatically.
        </p>
      )}
      <nav className="options-tabs" aria-label="Options sections">
        <button aria-pressed={tab === 'general'} onClick={() => setTab('general')}>
          Game &amp; Audio
        </button>
        <button aria-pressed={tab === 'events'} onClick={() => setTab('events')}>
          {text.title}
        </button>
        <button aria-pressed={tab === 'access'} onClick={() => setTab('access')}>
          {access.title}
        </button>
      </nav>
      {tab === 'access' ? (
        <div className="options-grid options-access">
          <section className="options-group" aria-label={access.title}>
            <h3>{access.title}</h3>
            <div className="options-setting">
              <div>
                <strong>{access.selection}</strong>
                <p>{access.selectionDescription}</p>
              </div>
              <Toggle
                label={access.selection}
                checked={selectionMode === 'UNRESTRICTED'}
                onChange={(value) =>
                  onAccessChange(value ? 'UNRESTRICTED' : 'CLASSIC', unrestrictedDiplomacy)
                }
              />
            </div>
            <div className="options-setting">
              <div>
                <strong>{access.diplomacy}</strong>
                <p>{access.diplomacyDescription}</p>
              </div>
              <Toggle
                label={access.diplomacy}
                checked={unrestrictedDiplomacy}
                onChange={(value) => onAccessChange(selectionMode, value)}
              />
            </div>
            <p className="options-event-note">{access.note}</p>
          </section>
        </div>
      ) : tab === 'events' ? (
        <div className="options-grid options-events">
          <div className="options-event-toolbar">
            <label>
              {text.difficulty}{' '}
              <select
                aria-label={text.difficulty}
                value={difficulty}
                onChange={(e) =>
                  onCampaignChange(eventOptions, e.target.value as CampaignDifficulty)
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <div>
              {[true, false].map((value) => (
                <button
                  key={String(value)}
                  onClick={() =>
                    onCampaignChange(
                      Object.fromEntries(
                        Object.keys(eventOptions).map((key) => [key, value]),
                      ) as CampaignEventOptions,
                      difficulty,
                    )
                  }
                >
                  {value ? text.allOn : text.allOff}
                </button>
              ))}
            </div>
          </div>
          {(
            [
              {
                heading: text.random,
                keys: ['economicEvents', 'magicalEvents', 'militaryEvents', 'randomRebellions'],
              },
              {
                heading: text.special,
                keys: [
                  'gorgonPlot',
                  'specialReinforcements',
                  'diplomaticEvents',
                  'treasuryIncidents',
                ],
              },
            ] as const
          ).map(({ heading, keys }) => (
            <section className="options-group" key={heading} aria-label={heading}>
              <h3>{heading}</h3>
              {keys.map((key) => (
                <div className="options-setting" key={key}>
                  <div>
                    <strong>{campaignEventLabels[key].label}</strong>
                    <p>{campaignEventLabels[key].description}</p>
                  </div>
                  <Toggle
                    label={campaignEventLabels[key].label}
                    checked={eventOptions[key]}
                    onChange={(value) =>
                      onCampaignChange({ ...eventOptions, [key]: value }, difficulty)
                    }
                  />
                </div>
              ))}
            </section>
          ))}
          <p className="options-event-note">
            {text.timing} {activeCampaign ? text.saved : text.defaults}
          </p>
        </div>
      ) : (
        <div className="options-grid">
          <section className="options-group options-game" aria-labelledby="options-game-heading">
            <h3 id="options-game-heading">
              <span aria-hidden="true">I</span> Game
            </h3>
            {game.map(({ key, label, description }) => (
              <div className="options-setting" key={key}>
                <div>
                  <strong>{label}</strong>
                  <p>{description}</p>
                </div>
                <Toggle
                  label={label}
                  checked={settings[key]}
                  onChange={(value) => onChange({ ...settings, [key]: value })}
                />
              </div>
            ))}
            <div className="options-save-note">
              <span aria-hidden="true">✦</span> Preferences stay on this device.
            </div>
          </section>
          <section className="options-group options-audio" aria-labelledby="options-audio-heading">
            <h3 id="options-audio-heading">
              <span aria-hidden="true">II</span> Audio
            </h3>
            <div className="options-setting options-soundtrack">
              <div>
                <strong>Original soundtrack</strong>
                <p>The music of Birthright: The Gorgon’s Alliance.</p>
              </div>
              <Toggle
                label="Original soundtrack"
                checked={settings.musicEnabled}
                onChange={(value) => onChange({ ...settings, musicEnabled: value })}
              />
            </div>
            {(['musicVolume', 'effectsVolume'] as const).map((key) => {
              const label = key === 'musicVolume' ? 'Music volume' : 'Effects volume';
              return (
                <div className="options-volume" key={key}>
                  <div>
                    <label htmlFor={`options-${key}`}>{label}</label>
                    <output htmlFor={`options-${key}`}>{Math.round(settings[key] * 100)}%</output>
                  </div>
                  <input
                    id={`options-${key}`}
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings[key]}
                    style={{ '--volume-fill': `${settings[key] * 100}%` } as CSSProperties}
                    aria-valuetext={`${Math.round(settings[key] * 100)} percent`}
                    onChange={(event) =>
                      onChange({ ...settings, [key]: Number(event.target.value) })
                    }
                  />
                </div>
              );
            })}
            <div className={`options-setting options-master ${settings.muted ? 'is-muted' : ''}`}>
              <div>
                <strong>Mute all audio</strong>
                <p>Silence music and effects together.</p>
              </div>
              <Toggle
                label="Mute all audio"
                checked={settings.muted}
                onChange={(value) => onChange({ ...settings, muted: value })}
              />
            </div>
            <p className="options-playback" role="status" data-testid="audio-status">
              <span
                className={playback.playing && !settings.muted ? 'is-playing' : ''}
                aria-hidden="true"
              />
              {status}
            </p>
            {playback.error && (
              <div className="options-audio-error" role="alert">
                <p>{playback.error}</p>
                <button onClick={originalAudio.unlock}>Resume playback</button>
              </div>
            )}
            <div className="options-audio-tools">
              <button onClick={() => originalAudio.effect('council')}>Test sound effects</button>
              <span>
                {settings.campaignTrack === 'default'
                  ? 'Strategy music · original 105'
                  : 'Manual recording override'}
              </span>
            </div>
            <details className="options-recordings">
              <summary>Recording selection &amp; original catalog</summary>
              <label htmlFor="options-recording">Strategy recording</label>
              <select
                id="options-recording"
                value={settings.campaignTrack}
                onChange={(event) => onChange({ ...settings, campaignTrack: event.target.value })}
              >
                <option value="default">Original realm / domain music (105)</option>
                {Object.keys(pack.assets)
                  .filter((id) => /^MUSIC\//.test(id))
                  .map((id) => (
                    <option key={id} value={id}>
                      Adventure recording {id.replace('MUSIC/', '')} (manual override)
                    </option>
                  ))}
              </select>
              <a href="/original/catalog.html" target="_blank" rel="noreferrer">
                Browse the original recordings
              </a>
            </details>
          </section>
        </div>
      )}
      <footer className="options-footer">
        <span>
          {tab === 'access'
            ? 'Land selection applies to new games; diplomacy applies to new proposals.'
            : tab === 'events'
              ? 'Applies at the next eligible season.'
              : 'All changes take effect immediately.'}
        </span>
        <button onClick={onClose}>Done</button>
      </footer>
    </div>
  );
}
