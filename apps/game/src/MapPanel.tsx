import { useEffect, useRef, useState } from 'react';
import type { Campaign, Scenario } from '../../../packages/core';
import { StrategicMap, type MapOverlay } from '../../../packages/rendering/strategic-map';
import { Icon } from '../../../packages/ui/Icon';
export function MapPanel({
  state,
  scenario,
  selected,
  overlay,
  labels,
  onSelect,
}: {
  state: Campaign;
  scenario: Scenario;
  selected: string;
  overlay: MapOverlay;
  labels: boolean;
  onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<StrategicMap | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [hover, setHover] = useState<string | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  useEffect(() => {
    if (!host.current) return;
    const map = new StrategicMap(host.current, scenario, {
      select: (id) => select.current(id),
      hover: setHover,
      ready: () => setReady(true),
      error: setError,
    });
    renderer.current = map;
    void map.init();
    return () => {
      map.destroy();
      renderer.current = null;
    };
  }, [scenario]);
  useEffect(() => {
    renderer.current?.update(state, { selected, overlay, labels });
  }, [state, selected, overlay, labels, ready]);
  const hoverDef = scenario.provinces.find((p) => p.id === hover);
  const hoverState = state.provinces.find((p) => p.id === hover);
  return (
    <div className="map-wrap">
      <div className="map-canvas" ref={host} data-testid="strategic-map" />
      <div className="map-heading">
        <span className="eyebrow">THE STRATEGIC REALM</span>
        <h2>The Covenant Marches</h2>
        <p>
          Development scenario <span>·</span> Not canonical Anuire
        </p>
      </div>
      <div className="map-legend">
        <span>
          <i style={{ background: '#537b88' }} /> Crownmere
        </span>
        <span>
          <i style={{ background: '#73856a' }} /> Covenant
        </span>
        <span>
          <i style={{ background: '#aa7460' }} /> Iron March
        </span>
      </div>
      {hoverDef && (
        <div className="map-tooltip">
          <strong>{hoverDef.name}</strong>
          <span>
            {hoverDef.terrain} · Level {hoverState?.level} ·{' '}
            {scenario.realms.find((r) => r.id === hoverState?.owner)?.name}
          </span>
        </div>
      )}
      <div className="map-tools">
        <button aria-label="Zoom in" onClick={() => renderer.current?.zoom(1.25)}>
          <Icon name="plus" />
        </button>
        <button aria-label="Zoom out" onClick={() => renderer.current?.zoom(0.8)}>
          <Icon name="minus" />
        </button>
        <button aria-label="Fit map" onClick={() => renderer.current?.fit()}>
          <Icon name="map" />
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
