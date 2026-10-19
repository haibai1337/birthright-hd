import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { OriginalAssets } from './original-assets';
import { assetFileUrl, assetUrl } from './original-assets';
import type { Panel } from './Sidebar';

type AdvisorVariant = 'human' | 'elf' | 'dwarf';

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

const advisors: { label: string; panel: Panel }[] = [
  { label: 'Chamberlain', panel: 'realm' },
  { label: 'General', panel: 'military' },
  { label: 'Wizard', panel: 'realm' },
  { label: 'Spymaster', panel: 'diplomacy' },
];

const reports: { label: string; panel?: Panel }[] = [
  { label: 'Realm Strength', panel: 'realm' },
  { label: 'War Report', panel: 'chronicle' },
  { label: 'Adventure News' },
  { label: 'Alliance Report', panel: 'diplomacy' },
  { label: 'Loyalty' },
  { label: 'Troop Report', panel: 'military' },
  { label: 'Investiture' },
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

export function CouncilScreen({
  pack,
  factionIndex,
  onOpenPanel,
  onDone,
}: {
  pack: OriginalAssets;
  factionIndex?: number;
  onOpenPanel: (panel: Panel) => void;
  onDone: () => void;
}) {
  const art = advisorArtwork[variantForFaction(factionIndex)];
  const background = assetUrl(pack, art.background);
  const doneButton = assetUrl(pack, 'UI/SCRLBTN5.PCX');
  const stage = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDoneRef.current();
        return;
      }
      if (event.key === 'Tab') {
        const buttons = stage.current?.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled)',
        );
        const first = buttons?.[0];
        const last = buttons?.[buttons.length - 1];
        if (first && last && event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (first && last && !event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    stage.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <section className="original-council-overlay" role="dialog" aria-modal="true" aria-label="Council of advisors">
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
        <nav className="original-council-buttons" aria-label="Advisor reports">
          {advisors.map(({ label, panel }, index) => (
            <button
              className="original-council-button advisor-button"
              key={label}
              style={buttonPosition(index)}
              onClick={() => onOpenPanel(panel)}
              title={`Open the existing ${panel} council. Original ${label.toLowerCase()} briefing text is not yet restored.`}
            >
              {label}
            </button>
          ))}
          {reports.map(({ label, panel }, index) => (
            <button
              className={`original-council-button report-button ${panel ? '' : 'unavailable'}`}
              key={label}
              style={buttonPosition(index + 4)}
              disabled={!panel}
              onClick={() => panel && onOpenPanel(panel)}
              title={
                panel
                  ? `Open the existing ${panel} council. The original ${label.toLowerCase()} report page is not yet restored.`
                  : `The original ${label.toLowerCase()} report is not yet available in Birthright HD.`
              }
              aria-label={`${label}${panel ? '' : ' report, not yet restored'}`}
            >
              <span>{label}</span>
              {!panel && <small>Not restored</small>}
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
          Existing councils are linked where available; original briefings and disabled reports are not restored.
        </p>
      </div>
    </section>
  );
}
