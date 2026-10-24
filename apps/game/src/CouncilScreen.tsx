import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { domainPower, forecast, type Campaign, type Scenario } from '../../../packages/core';
import { loyaltyNames, season } from '../../../packages/ui/strings';
import type { OriginalAssets } from './original-assets';
import { assetFileUrl, assetUrl } from './original-assets';

type AdvisorVariant = 'human' | 'elf' | 'dwarf';
type ReportId =
  | 'advisor-chamberlain'
  | 'advisor-general'
  | 'advisor-wizard'
  | 'advisor-spymaster'
  | 'realm-strength'
  | 'war-report'
  | 'adventure-news'
  | 'alliance-report'
  | 'loyalty'
  | 'troop-report'
  | 'investiture';
type ReportSection = {
  title: string;
  rows: { label: string; value: string }[];
  empty?: string;
};
type ReportContent = {
  title: string;
  identity: string;
  summary: string;
  source: string;
  sections: ReportSection[];
  unavailable?: string;
};
type CouncilView = { kind: 'hub' } | { kind: 'report'; id: ReportId };

const advisorArtwork: Record<
  AdvisorVariant,
  {
    background: string;
    figures: [string, string, number, number][];
    torches?: [number, number][];
  }
> = {
  human: {
    background: 'UI/ADVISORS.PCX',
    figures: [
      ['UI/HCONSL01.FLC', 'Chamberlain', 73, 136],
      ['UI/HGENRL01.FLC', 'General', 197, 132],
      ['UI/HWIZRD01.FLC', 'Wizard', 329, 141],
      ['UI/HSPYMS01.FLC', 'Spymaster', 459, 123],
    ],
  },
  elf: {
    background: 'UI/ADVISELF.PCX',
    figures: [
      ['UI/ECONSL01.FLC', 'Chamberlain', 81, 131],
      ['UI/EGENRL01.FLC', 'General', 204, 101],
      ['UI/EWIZRD01.FLC', 'Wizard', 330, 142],
      ['UI/ESPYMS01.FLC', 'Spymaster', 439, 129],
    ],
    torches: [
      [34, 202],
      [545, 202],
    ],
  },
  dwarf: {
    background: 'UI/ADVISDWF.PCX',
    figures: [
      ['UI/DCONSL01.FLC', 'Chamberlain', 35, 186],
      ['UI/DGENRL01.FLC', 'General', 174, 142],
      ['UI/DWIZRD01.FLC', 'Wizard', 318, 152],
      ['UI/DSPYMS01.FLC', 'Spymaster', 464, 153],
    ],
  },
};

const advisors: { label: string; id: ReportId }[] = [
  { label: 'Chamberlain', id: 'advisor-chamberlain' },
  { label: 'General', id: 'advisor-general' },
  { label: 'Wizard', id: 'advisor-wizard' },
  { label: 'Spymaster', id: 'advisor-spymaster' },
];

const reports: { label: string; id: ReportId }[] = [
  { label: 'Realm Strength', id: 'realm-strength' },
  { label: 'War Report', id: 'war-report' },
  { label: 'Adventure News', id: 'adventure-news' },
  { label: 'Alliance Report', id: 'alliance-report' },
  { label: 'Loyalty', id: 'loyalty' },
  { label: 'Troop Report', id: 'troop-report' },
  { label: 'Investiture', id: 'investiture' },
];

function buttonPosition(index: number, width = 128): CSSProperties {
  return {
    left: `${((40 + (index % 4) * 144) / 640) * 100}%`,
    top: `${((20 + Math.floor(index / 4) * 36) / 480) * 100}%`,
    width: `${(width / 640) * 100}%`,
  };
}

function FrameAnimation({
  pack,
  id,
  label,
  x,
  y,
  torch = false,
}: {
  pack: OriginalAssets;
  id: string;
  label: string;
  x: number;
  y: number;
  torch?: boolean;
}) {
  const animation = pack.assets[id];
  const frames = animation?.frames;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (!frames || frames.length < 2) return;
    const timer = window.setInterval(
      () => setFrame((current) => (current + 1) % frames.length),
      Math.max(40, animation.frameMs ?? 100),
    );
    return () => window.clearInterval(timer);
  }, [animation?.frameMs, frames]);

  if (!animation) return null;
  const src = frames?.length
    ? assetFileUrl(frames[frame] ?? frames[0])
    : assetUrl(pack, id);
  if (!src) return null;

  const style: CSSProperties = {
    left: `${(x / 640) * 100}%`,
    top: `${(y / 480) * 100}%`,
    width: `${((animation.width ?? 0) / 640) * 100}%`,
  };

  return (
    <img
      className={`original-council-figure ${torch ? 'torch' : ''}`}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      data-advisor-role={torch ? undefined : label}
      data-frame={frame}
      style={style}
    />
  );
}

function variantForFaction(index: number | undefined): AdvisorVariant {
  if ([5, 17, 24].includes(index ?? -1)) return 'dwarf';
  if ([26, 28, 33].includes(index ?? -1)) return 'elf';
  return 'human';
}

function realmName(scenario: Scenario, realmId: string) {
  return scenario.realms.find((realm) => realm.id === realmId)?.name ?? realmId;
}

function provinceName(scenario: Scenario, provinceId: string) {
  return scenario.provinces.find((province) => province.id === provinceId)?.name ?? provinceId;
}

function gold(value: number) {
  return `${Number(value.toFixed(1))} GB`;
}

function contentForReport(
  id: ReportId,
  state: Campaign,
  scenario: Scenario,
): ReportContent {
  const realmId = state.playerRealm;
  const realm = state.realms.find((item) => item.id === realmId);
  const owned = state.provinces.filter((province) => province.owner === realmId);
  const holdings = state.holdings.filter(
    (holding) => holding.realmId === realmId && !holding.destroyed,
  );
  const armies = state.armies.filter((army) => army.realmId === realmId);
  const relations = state.treaties.filter(
    (treaty) => treaty.a === realmId || treaty.b === realmId,
  );
  const active = (title: string, identity: string, summary: string): ReportContent => ({
    title,
    identity,
    summary,
    source: 'HD-derived campaign data · not original report text',
    sections: [],
  });
  const section = (
    title: string,
    rows: { label: string; value: string }[],
    empty?: string,
  ): ReportSection => ({ title, rows, empty });
  const tooEarly = (title: string, identity: string): ReportContent => ({
    title,
    identity,
    summary: `The original detailed ${title.toLowerCase()} report is not available until Domain Turn 2.`,
    source: 'Original availability condition preserved',
    sections: [],
    unavailable: 'This detailed report begins after the first domain turn.',
  });

  switch (id) {
    case 'advisor-chamberlain': {
      const income = forecast(state, scenario, realmId);
      const loyalty = loyaltyNames.map((name, value) => ({
        label: name,
        value: String(owned.filter((province) => province.loyalty === value).length),
      }));
      return {
        ...active(
          'The Chamberlain’s Account',
          'Chamberlain · Administration and popular loyalty',
          `${realmName(scenario, realmId)} · ${season(state.turn)}`,
        ),
        sections: [
          section('Realm at a glance', [
            { label: 'Provinces held', value: String(owned.length) },
            { label: 'Domain power', value: String(domainPower(state, scenario, realmId)) },
            { label: 'Treasury', value: gold(realm?.treasury ?? 0) },
            { label: 'Next-season net forecast', value: gold(income.net) },
          ]),
          section('Holdings by kind', ['law', 'guild', 'temple', 'source'].map((kind) => ({
            label: `${kind[0]!.toUpperCase()}${kind.slice(1)}`,
            value: String(holdings.filter((holding) => holding.type === kind).length),
          }))),
          section('Province loyalty', loyalty),
        ],
      };
    }
    case 'advisor-general': {
      const units = armies.flatMap((army) =>
        army.units.map((unit) => ({
          label: `${provinceName(scenario, army.provinceId)} · ${scenario.units.find((item) => item.id === unit.type)?.name ?? unit.type}`,
          value: `${unit.strength}%${unit.blessed ? ' · Blessed' : ''}`,
        })),
      );
      const wars = relations.filter((treaty) => treaty.kind === 'war');
      return {
        ...active(
          'The General’s Muster',
          'General · Armies and the military situation',
          `${realmName(scenario, realmId)} · ${season(state.turn)}`,
        ),
        sections: [
          section('Army totals', [
            { label: 'Formations', value: String(armies.length) },
            { label: 'Units', value: String(units.length) },
            { label: 'Declared war treaties', value: String(wars.length) },
          ]),
          section('Field forces', units, 'No army units are currently recorded for this realm.'),
          section(
            'War treaties',
            wars.map((treaty) => ({
              label: realmName(scenario, treaty.a === realmId ? treaty.b : treaty.a),
              value: `Since Turn ${treaty.since}`,
            })),
            'No active war treaties are recorded.',
          ),
        ],
      };
    }
    case 'advisor-wizard': {
      const spellIds = realm?.knownSpells ?? [];
      const effects = state.effects.filter((effect) => effect.realmId === realmId);
      const lines = (state.leyLines ?? []).filter((line) => line.realmId === realmId);
      return {
        ...active(
          'The Wizard’s Memoranda',
          'Wizard · Magical records',
          `${realmName(scenario, realmId)} · ${season(state.turn)}`,
        ),
        sections: [
          section(
            'Known realm spells',
            spellIds.map((spellId) => ({
              label: scenario.spells.find((spell) => spell.id === spellId)?.name ?? spellId,
              value: 'Known',
            })),
            'No known realm spells are recorded.',
          ),
          section(
            'Active magical effects',
            effects.map((effect) => ({
              label: `${scenario.spells.find((spell) => spell.id === effect.spellId)?.name ?? effect.spellId} · ${provinceName(scenario, effect.provinceId)}`,
              value: `Expires Turn ${effect.expiresTurn}`,
            })),
            'No active realm effects are recorded.',
          ),
          section(
            'Ley lines',
            lines.map((line) => ({
              label: `${line.fromHoldingId} → ${line.toHoldingId}`,
              value: line.status ?? 'Recorded',
            })),
            'No ley lines are recorded for this realm.',
          ),
        ],
      };
    }
    case 'advisor-spymaster':
    case 'alliance-report': {
      const title = id === 'advisor-spymaster' ? 'The Spymaster’s Dispatch' : 'Alliance Report';
      const identity =
        id === 'advisor-spymaster'
          ? 'Spymaster · Recorded diplomacy and alliances'
          : 'Treaties · Recorded diplomacy';
      const report = active(
        title,
        identity,
        id === 'advisor-spymaster'
          ? `${realmName(scenario, realmId)} · ${season(state.turn)} · no agent intelligence is modeled`
          : `${realmName(scenario, realmId)} · ${season(state.turn)}`,
      );
      if (id === 'advisor-spymaster')
        report.source = 'HD-derived treaty status; spy and agent intelligence is not modeled';
      report.sections = [
        section(
          'Treaties involving this realm',
          relations.map((treaty) => ({
            label: realmName(scenario, treaty.a === realmId ? treaty.b : treaty.a),
            value: `${treaty.brokenBy ? 'Broken ' : ''}${treaty.kind[0]!.toUpperCase()}${treaty.kind.slice(1)} · opinion ${treaty.opinion}`,
          })),
          'No treaties are currently recorded.',
        ),
      ];
      return report;
    }
    case 'realm-strength':
      if (state.turn === 1) return tooEarly('Realm Strength', 'Detailed domain summary');
      return {
        ...active(
          'Realm Strength',
          'Detailed domain summary',
          `${realmName(scenario, realmId)} · ${season(state.turn)}`,
        ),
        sections: [
          section('Province ledger', owned.map((province) => ({
            label: provinceName(scenario, province.id),
            value: `Level ${province.level}${province.occupiedBy ? ` · occupied by ${realmName(scenario, province.occupiedBy)}` : ''}`,
          }))),
          section('Holdings ledger', holdings.map((holding) => ({
            label: `${provinceName(scenario, holding.provinceId)} · ${holding.type}`,
            value: `Level ${holding.level}${holding.contested ? ' · contested' : ''}`,
          }))),
          section('Domain power', [{ label: 'Current total', value: String(domainPower(state, scenario, realmId)) }]),
        ],
      };
    case 'war-report': {
      const declarations = (state.warDeclarations ?? []).filter(
        (war) => war.actor === realmId || war.target === realmId,
      );
      const wars = relations.filter((treaty) => treaty.kind === 'war');
      return {
        ...active(
          'War Report',
          'Military record · HD-derived',
          `${realmName(scenario, realmId)} · ${season(state.turn)}`,
        ),
        sections: [
          section(
            'War treaties',
            wars.map((treaty) => ({
              label: realmName(scenario, treaty.a === realmId ? treaty.b : treaty.a),
              value: `Since Turn ${treaty.since}`,
            })),
            'No active war treaties are recorded.',
          ),
          section(
            'Declarations of war',
            declarations.map((war) => ({
              label: `${realmName(scenario, war.actor)} → ${realmName(scenario, war.target)}`,
              value: `Turn ${war.turn}`,
            })),
            'No declarations involving this realm are recorded.',
          ),
          section(
            'Army units',
            armies.flatMap((army) =>
              army.units.map((unit) => ({
                label: `${provinceName(scenario, army.provinceId)} · ${scenario.units.find((item) => item.id === unit.type)?.name ?? unit.type}`,
                value: `${unit.strength}%`,
              })),
            ),
            'No army units are currently recorded.',
          ),
        ],
      };
    }
    case 'adventure-news':
      return {
        title: 'Adventure News',
        identity: 'Original report content unavailable',
        summary: 'No verified adventure-site report data is available for this realm.',
        source: 'Original adventure text and verified site-report content are not available.',
        sections: [],
        unavailable:
          'This parchment is retained, but Birthright HD does not yet have verified adventure news to display.',
      };
    case 'loyalty':
      if (state.turn === 1) return tooEarly('Loyalty', 'Detailed provincial loyalty report');
      return {
        ...active(
          'Loyalty',
          'Provincial loyalty · HD-derived',
          `${realmName(scenario, realmId)} · ${season(state.turn)}`,
        ),
        sections: [
          section(
            'Province loyalty',
            owned.map((province) => ({
              label: provinceName(scenario, province.id),
              value: loyaltyNames[province.loyalty] ?? `Level ${province.loyalty}`,
            })),
            'No owned provinces are recorded.',
          ),
        ],
      };
    case 'troop-report':
      if (state.turn === 1) return tooEarly('Troop Report', 'Detailed military inventory');
      return {
        ...active(
          'Troop Report',
          'Army inventory · HD-derived',
          `${realmName(scenario, realmId)} · ${season(state.turn)}`,
        ),
        sections: [
          section(
            'Units by province',
            armies.flatMap((army) =>
              army.units.map((unit) => ({
                label: `${provinceName(scenario, army.provinceId)} · ${scenario.units.find((item) => item.id === unit.type)?.name ?? unit.type}`,
                value: `${unit.strength}%${unit.blessed ? ' · Blessed' : ''}`,
              })),
            ),
            'No army units are currently recorded.',
          ),
        ],
      };
    case 'investiture': {
      const occupied = state.provinces.filter(
        (province) =>
          province.occupiedBy === realmId ||
          (province.owner === realmId && province.investitureReadyTurn !== undefined),
      );
      return {
        ...active(
          'Investiture',
          'Occupation and investiture preparation · HD-derived',
          `${realmName(scenario, realmId)} · ${season(state.turn)}`,
        ),
        sections: [
          section(
            'Recorded preparation',
            occupied.map((province) => ({
              label: provinceName(scenario, province.id),
              value:
                province.investitureReadyTurn === undefined
                  ? 'No readiness turn recorded'
                  : `Ready Turn ${province.investitureReadyTurn}`,
            })),
            'No occupied provinces or investiture readiness markers are recorded.',
          ),
        ],
      };
    }
  }
}

export function CouncilScreen({
  pack,
  factionIndex,
  state,
  scenario,
  onDone,
}: {
  pack: OriginalAssets;
  factionIndex?: number;
  state: Campaign;
  scenario: Scenario;
  onDone: () => void;
}) {
  const art = advisorArtwork[variantForFaction(factionIndex)];
  const background = assetUrl(pack, art.background);
  const buttonArtwork = assetUrl(pack, 'UI/SCRLBTN0.PCX');
  const doneButton = assetUrl(pack, 'UI/SCRLBTN5.PCX');
  const reportParchment = assetUrl(pack, 'UI/REPORT1.PCX');
  const loyaltyParchment = assetUrl(pack, 'UI/REPORT2.PCX');
  const stage = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  const lastReportButton = useRef<ReportId | null>(null);
  const [view, setView] = useState<CouncilView>({ kind: 'hub' });
  onDoneRef.current = onDone;
  const report =
    view.kind === 'report' ? contentForReport(view.id, state, scenario) : undefined;
  const loyaltyView = view.kind === 'report' && view.id === 'loyalty';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (view.kind === 'report') setView({ kind: 'hub' });
        else onDoneRef.current();
        return;
      }
      if (event.key === 'Tab') {
        const buttons = Array.from(
          stage.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
        ).filter((button) => button.getClientRects().length > 0);
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (first && last && event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (first && last && !event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view]);

  useEffect(() => {
    if (view.kind === 'hub' && lastReportButton.current) {
      const id = lastReportButton.current;
      const button = Array.from(
        stage.current?.querySelectorAll<HTMLButtonElement>('[data-report-id]') ?? [],
      ).find((item) => item.dataset.reportId === id);
      button?.focus();
      lastReportButton.current = null;
      return;
    }
    const selector = view.kind === 'hub' ? '.advisor-button' : '.council-report-back';
    stage.current?.querySelector<HTMLButtonElement>(selector)?.focus();
  }, [view]);

  const openReport = (id: ReportId) => {
    lastReportButton.current = id;
    setView({ kind: 'report', id });
  };

  return (
    <section
      className="original-council-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={view.kind === 'hub' ? 'Council of advisors' : report?.title}
      style={
        {
          '--original-button': buttonArtwork ? `url("${buttonArtwork}")` : undefined,
        } as CSSProperties
      }
    >
      <div className="original-council-stage" ref={stage} data-testid="original-council">
        {background && (
          <img className="original-council-background" src={background} alt="" aria-hidden="true" />
        )}
        {art.figures.map(([id, label, x, y]) => (
          <FrameAnimation key={id} pack={pack} id={id} label={label} x={x} y={y} />
        ))}
        {art.torches?.map(([x, y], i) => (
          <FrameAnimation
            key={`torch-${i}`}
            pack={pack}
            id="UI/ELFTORCH.FLC"
            label={`Torch ${i + 1}`}
            x={x}
            y={y}
            torch
          />
        ))}
        <div
          className="original-council-hub"
          aria-hidden={view.kind !== 'hub'}
          style={{ display: view.kind === 'hub' ? undefined : 'none' }}
        >
          <nav className="original-council-buttons" aria-label="Advisor reports">
            {advisors.map(({ label, id }, index) => (
              <button
                className="original-council-button advisor-button"
                key={id}
                data-report-id={id}
                style={buttonPosition(index)}
                onClick={() => openReport(id)}
                title={`Open the ${label.toLowerCase()} parchment. Its report uses current campaign records; original advisor text is not present in recovered text assets.`}
              >
                {label}
              </button>
            ))}
            {reports.map(({ label, id }, index) => (
              <button
                className="original-council-button report-button"
                key={id}
                data-report-id={id}
                style={buttonPosition(index + 4)}
                onClick={() => openReport(id)}
                aria-label={`${label} report`}
              >
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <button
            className="original-council-done"
            style={{
              left: `${(268 / 640) * 100}%`,
              top: `${(440 / 480) * 100}%`,
              backgroundImage: doneButton ? `url("${doneButton}")` : undefined,
            }}
            onClick={onDone}
            aria-label="Done — return to realm management"
          >
            Done
          </button>
          <p className="original-council-disclaimer">
            Advisor and report parchments use HD campaign records; original advisor briefings are not recovered.
          </p>
        </div>
        {report && (
          <section
            className={`council-report-screen ${loyaltyView ? 'loyalty-report' : ''}`}
            aria-label={report.title}
            data-testid="council-report"
            data-report-id={view.kind === 'report' ? view.id : undefined}
          >
            <div
              className="council-report-parchment"
              style={{
                backgroundImage:
                  loyaltyView && loyaltyParchment
                    ? `url("${loyaltyParchment}")`
                    : reportParchment
                      ? `url("${reportParchment}")`
                      : undefined,
              }}
            >
              <div className="council-report-content">
                <header className="council-report-heading">
                  <p className="council-report-identity">{report.identity}</p>
                  <h1>{report.title}</h1>
                  <p className="council-report-summary">{report.summary}</p>
                </header>
                <p className="council-report-source">{report.source}</p>
                <div className="council-report-body">
                  {report.unavailable && (
                    <p className="council-report-unavailable">{report.unavailable}</p>
                  )}
                  {report.sections.map((part) => (
                    <section className="council-report-section" key={part.title}>
                      <h2>{part.title}</h2>
                      {part.rows.length > 0 ? (
                        <dl>
                          {part.rows.map((row, index) => (
                            <div className="council-report-row" key={`${row.label}-${index}`}>
                              <dt>{row.label}</dt>
                              <dd>{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="council-report-empty">
                          {part.empty ?? 'No entries are recorded for this report.'}
                        </p>
                      )}
                    </section>
                  ))}
                </div>
                <footer className="council-report-controls">
                  <button
                    className="council-report-back"
                    style={{
                      backgroundImage: doneButton ? `url("${doneButton}")` : undefined,
                    }}
                    onClick={() => setView({ kind: 'hub' })}
                    aria-label="Done — return to Council"
                  >
                    Done · Return to Council
                  </button>
                </footer>
              </div>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
