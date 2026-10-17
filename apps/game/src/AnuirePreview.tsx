import { useState } from 'react';
import type { AnuireResearch } from '../../../packages/world-data/anuire-research';
import { Modal } from './Modal';

/** Inspect an explicitly imported private corpus; this never creates simulation state. */
export function AnuirePreview({ data, onClose }: { data: AnuireResearch; onClose: () => void }) {
  const [selected, setSelected] = useState(data.campaign.provinces[0]!.index);
  const [focused, setFocused] = useState(false);
  const { campaign, map } = data;
  const province = campaign.provinces.find((p) => p.index === selected)!;
  const realm = campaign.realms.find((r) => r.index === province.realmIndex)!;
  const regent = campaign.regents.find((r) => r.index === realm.regentIndex);
  const geometry = map.geometries.find((g) => g.provinceIndex === selected)!;
  const points = geometry.rings.flat();
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const left = Math.min(...xs) - 40,
    top = Math.min(...ys) - 40;
  const width = Math.max(...xs) - left + 40,
    height = Math.max(...ys) - top + 40;
  const holdings = campaign.holdings.filter((h) => h.provinceIndex === selected);
  const troops = campaign.troops.filter((u) => u.effectiveProvinceIndex === selected);
  const terrain: Record<number, string> = {
    1: 'Forest',
    2: 'Plains',
    3: 'Mountains',
    4: 'Heavy mountains',
    5: 'Swamp',
    6: 'Hills',
  };
  return (
    <Modal title="Anuire research preview" onClose={onClose} wide className="research-modal">
      <div className="research-banner">
        <span className="eyebrow">DEVELOPMENT PREVIEW · ORIGINAL CD TEMPLATE · NOT PLAYABLE</span>
        <p>
          {campaign.provinces.length} provinces · {campaign.realms.length} realm records ·{' '}
          {campaign.holdings.length} holdings. Exact province ID contours; diagnostic colors.
        </p>
      </div>
      <div className="research-layout">
        <div className="research-map-panel">
          <div className="research-map-controls">
            <button onClick={() => setFocused(true)}>Focus selected province</button>
            <button onClick={() => setFocused(false)}>Show all Anuire</button>
          </div>
          <svg
            className="research-map"
            data-testid="anuire-map"
            aria-label="Recovered Anuire province map"
            viewBox={
              focused ? `${left} ${top} ${width} ${height}` : `0 0 ${map.width} ${map.height}`
            }
          >
            <rect
              x="-1000"
              y="-1000"
              width={map.width + 2000}
              height={map.height + 2000}
              fill="#22383f"
            />
            {map.geometries.map((g) => {
              const p = campaign.provinces.find((p) => p.index === g.provinceIndex)!;
              return (
                <path
                  key={p.index}
                  data-province={p.index}
                  d={g.rings.map((r) => 'M' + r.map((p) => p.join(',')).join('L') + 'Z').join('')}
                  fill={`hsl(${(p.realmIndex * 137.508) % 360} 30% ${p.index === selected ? 80 : 58}%)`}
                  fillRule="evenodd"
                  stroke={p.index === selected ? '#fff5d8' : '#243435'}
                  strokeWidth={p.index === selected ? 3 : 1}
                  vectorEffect="non-scaling-stroke"
                  onClick={() => setSelected(p.index)}
                >
                  <title>
                    {p.name} · {campaign.realms.find((r) => r.index === p.realmIndex)?.name}
                  </title>
                </path>
              );
            })}
            <circle
              cx={province.center[0]}
              cy={province.center[1]}
              r={focused ? 3 : 7}
              fill="#fff5d8"
              pointerEvents="none"
            />
          </svg>
          <p className="research-map-caption">
            Click a province or use the list. Boundaries follow the 480 × 559 hit map, including
            islands. Rivers and artwork are not rendered.
          </p>
        </div>
        <aside className="research-inspector">
          <label>
            Inspect recovered province
            <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
              {[...campaign.provinces]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => (
                  <option key={p.index} value={p.index}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <span className="eyebrow">{province.id}</span>
          <h3>{province.name}</h3>
          <p>
            {realm.name} · {regent?.identity?.name ?? 'Unresolved regent identity'}
          </p>
          <dl className="research-values">
            <div>
              <dt>Development / source</dt>
              <dd data-testid="research-level">
                {province.level} / {province.magic}
              </dd>
            </div>
            <div>
              <dt>Terrain</dt>
              <dd>{terrain[province.terrainCode] ?? `Code ${province.terrainCode}`}</dd>
            </div>
            <div>
              <dt>Template treasury / regency</dt>
              <dd>
                {realm.treasury} GB / {realm.regency} RP
              </dd>
            </div>
            <div>
              <dt>Military / character units</dt>
              <dd>
                {troops.filter((u) => u.kind === 'military').length} /{' '}
                {troops.filter((u) => u.kind === 'character').length}
              </dd>
            </div>
            <div>
              <dt>Geometry rings</dt>
              <dd>{geometry.rings.length}</dd>
            </div>
          </dl>
          <h4>Holdings</h4>
          <ul className="research-holdings">
            {holdings.map((h) => (
              <li key={h.id}>
                <span>
                  {h.type} {h.level}
                </span>
                <small>{campaign.realms.find((r) => r.index === h.realmIndex)?.name}</small>
              </li>
            ))}
          </ul>
          <h4>Original movement destinations</h4>
          <div className="research-neighbors">
            {province.borders.map((b) => (
              <button key={b.provinceIndex} onClick={() => setSelected(b.provinceIndex)}>
                {campaign.provinces.find((p) => p.index === b.provinceIndex)?.name}
              </button>
            ))}
          </div>
          <details>
            <summary>Evidence and remaining work</summary>
            <p>
              Names, ownership, levels, resources and deployments come from the local CD template.
              The preview does not certify the state after the original New Game initialization.
            </p>
            <p>
              Province record offset: {province.offset}. Sources: {data.sources.length} hashed
              inputs.
            </p>
            <ul>
              {[...data.validation.warnings, ...data.validation.readinessBlockers].map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </details>
        </aside>
      </div>
    </Modal>
  );
}
