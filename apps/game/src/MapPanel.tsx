import { useEffect, useRef, useState } from 'react';
import type { Campaign, Scenario } from '../../../packages/core';
import type { MapOverlay } from '../../../packages/rendering/types';
import { WorldMap } from '../../../packages/rendering/world-map';
import { Icon } from '../../../packages/ui/Icon';
import { assetUrl, type OriginalAssets } from './original-assets';
export function MapPanel({
  state,
  scenario,
  selected,
  overlay,
  labels,
  onSelect,
  original,
}: {
  state: Campaign;
  scenario: Scenario;
  selected: string;
  overlay: MapOverlay;
  labels: boolean;
  onSelect: (id: string) => void;
  original: OriginalAssets;
}) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<WorldMap | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [hover, setHover] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<'relief' | 'original'>('relief');
  const [realmTint, setRealmTint] = useState(false);
  const select = useRef(onSelect);
  select.current = onSelect;
  useEffect(() => {
    if (!host.current) return;
    setReady(false);
    setError('');
    const map = new WorldMap(host.current, scenario, {
      select: (id) => select.current(id),
      hover: setHover,
      ready: () => setReady(true),
      error: setError,
    });
    map.setOriginalArt({
      map: assetUrl(original, 'MAP/LGMAP.PCX'),
      images: Object.fromEntries(
        Object.entries(original.assets)
          .filter(([id]) => id.startsWith('UI/'))
          .map(([id]) => [id, assetUrl(original, id)!]),
      ),
      icons: original.mapIcons,
      troopIcons: original.troopIcons,
    });
    renderer.current = map;
    void map.init();
    return () => {
      map.destroy();
      renderer.current = null;
    };
  }, [scenario, original]);
  useEffect(() => {
    renderer.current?.update(state, { selected, overlay, labels, presentation, realmTint });
  }, [state, selected, overlay, labels, ready, presentation, realmTint]);
  const hoverDef = scenario.provinces.find((p) => p.id === hover);
  const hoverState = state.provinces.find((p) => p.id === hover);
  const hoverTroops = state.armies
    .filter((a) => a.provinceId === hover)
    .reduce((n, a) => n + a.units.length, 0);
  const hoverForces = [
    ...new Set(state.armies.filter((a) => a.provinceId === hover).map((a) => a.realmId)),
  ].map(
    (id) =>
      `${scenario.realms.find((r) => r.id === id)?.name}: ${state.armies.filter((a) => a.provinceId === hover && a.realmId === id).reduce((n, a) => n + a.units.length, 0)}`,
  );
  return (
    <div className="map-wrap">
      <div className="map-canvas" ref={host} data-testid="strategic-map" />
      <div className="map-presentation" role="group" aria-label="Map illustration">
        <button
          aria-pressed={presentation === 'relief'}
          onClick={() => setPresentation('relief')}
          title="Layered illustrated terrain"
        >
          Relief
        </button>
        <button
          aria-pressed={presentation === 'original'}
          onClick={() => setPresentation('original')}
          title="Compare the original map at the same coordinates"
        >
          Original
        </button>
        <button
          aria-pressed={realmTint}
          onClick={() => setRealmTint(!realmTint)}
          title="Show restrained realm ownership colors"
        >
          Realm tint
        </button>
      </div>
      {!ready && !error && (
        <div className="map-loading" role="status">
          Preparing the Anuire landscape…
        </div>
      )}
      {hoverDef && (
        <div className="map-tooltip">
          <strong>{hoverDef.name}</strong>
          <span>
            {hoverDef.terrain} · Level {hoverState?.level} ·{' '}
            {scenario.realms.find((r) => r.id === hoverState?.owner)?.name}
          </span>
          <span>
            {hoverTroops} troops · Fortification {hoverState?.fort ?? 0}
          </span>
          {!!hoverForces.length && <span>{hoverForces.join(' · ')}</span>}
          {!!hoverState?.occupiedBy && (
            <span>
              Occupied by {scenario.realms.find((r) => r.id === hoverState.occupiedBy)?.name}
            </span>
          )}
          {hoverState?.contested && <span>Contested control</span>}
        </div>
      )}
      <div className="map-tools">
        <button
          disabled={!ready}
          aria-label="Zoom in"
          title="Zoom in · scroll up"
          onClick={() => renderer.current?.zoom(1.25)}
        >
          <Icon name="plus" />
        </button>
        <button
          disabled={!ready}
          aria-label="Zoom out"
          title="Zoom out · scroll down"
          onClick={() => renderer.current?.zoom(0.8)}
        >
          <Icon name="minus" />
        </button>
        <button
          disabled={!ready}
          aria-label="Fit map"
          title="Show the whole Anuire map"
          onClick={() => renderer.current?.fit()}
        >
          <Icon name="map" />
        </button>
        <button
          aria-label="Focus selected province"
          title="Center and zoom on the selected province"
          disabled={!ready}
          onClick={() => renderer.current?.focus(selected)}
        >
          <Icon name="castle" />
        </button>
      </div>
      <div className="map-hint">
        SCROLL TO ZOOM <span>·</span> DRAG TO EXPLORE
      </div>
      {error && (
        <div className="map-error" role="alert">
          <strong>Map renderer unavailable</strong>
          <p>{error}</p>
          <p>The province list and campaign controls remain available.</p>
        </div>
      )}
    </div>
  );
}
