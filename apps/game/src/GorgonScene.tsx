import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { assetUrl, type OriginalAssets } from './original-assets';
import { originalAudio } from './audio';

// MAIN::PlayGorgon frame cues, resolved through recovered recording IDs (SOUNDFX.HXX).
const cues: Record<number, [number, number][]> = {
  1: [
    [1, 560],
    [2, 7015],
    [11, 503],
    [18, 504],
    [24, 505],
    [29, 32200],
    [31, 506],
    [38, 507],
    [44, 500],
    [75, 550],
    [82, 590],
    [94, 32220],
  ],
  2: [
    [1, 560],
    [2, 7015],
    [11, 503],
    [18, 504],
    [25, 505],
    [32, 506],
    [39, 500],
    [48, 32201],
    [108, 32221],
    [116, 550],
  ],
  3: [
    [1, 560],
    [2, 7015],
    [11, 501],
    [18, 502],
    [21, 32202],
    [24, 503],
    [30, 504],
    [74, 32222],
    [80, 550],
    [95, 580],
    [103, 540],
    [111, 20700],
    [116, 20701],
    [120, 20702],
    [124, 20703],
  ],
};
const fallback = [
  'The Gorgon’s agents spread discord throughout Anuire while he prepares his armies.',
  'The Gorgon has found an ally among Anuire’s rulers. His plans draw closer to fruition.',
  'The Gorgon’s ally is exposed, and its realm falls under the Crown’s control.',
];
export function GorgonScene({
  stage,
  pack,
  onContinue,
}: {
  stage: number;
  pack: OriginalAssets;
  onContinue: () => void;
}) {
  const movie = pack.assets[`INTRO/GORGON${stage + 1}.FLC`];
  const [frame, setFrame] = useState(0),
    [failed, setFailed] = useState(false),
    [text, setText] = useState(fallback[stage - 1]!);
  useEffect(() => originalAudio.suspendMusic(), []);
  useEffect(() => {
    const controller = new AbortController(),
      url = assetUrl(pack, `TEXT/GORGON${stage}.TXT`);
    if (url)
      void fetch(url, { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw Error('Missing story text');
          return r.arrayBuffer();
        })
        .then((bytes) => {
          const decoded = new TextDecoder('windows-1252')
            .decode(bytes)
            .replace(/\^[A-Z]\d+/g, '')
            .trim();
          if (decoded) setText(decoded);
        })
        .catch(() => {});
    return () => controller.abort();
  }, [stage, pack]);
  useEffect(() => {
    if (!movie?.frames?.length || failed) return;
    let current = 0;
    const stops: (() => void)[] = [];
    const timer = window.setInterval(
      () => {
        current++;
        if (current >= movie.frames!.length) {
          clearInterval(timer);
          return;
        }
        setFrame(current);
        for (const [at, id] of cues[stage] ?? [])
          if (at === current) {
            const recording = Object.keys(pack.assets).find((key) =>
              new RegExp(`^WAVE[^/]*/${id}\\.WAV$`).test(key),
            );
            const stop = recording ? originalAudio.recording(recording) : undefined;
            if (stop) stops.push(stop);
          }
      },
      Math.max(20, movie.frameMs ?? 100),
    );
    return () => {
      clearInterval(timer);
      stops.forEach((stop) => stop());
    };
  }, [stage, movie, pack, failed]);
  const file = movie?.frames?.[frame] ?? movie?.file;
  const url =
    file && /^images\/[A-Za-z0-9_./&!+ -]+$/.test(file) && !file.includes('..')
      ? '/original/' + file
      : undefined;
  return (
    <Modal title={`The Gorgon’s Plot · ${stage} of 3`} onClose={onContinue}>
      <div className="gorgon-scene">
        {url && !failed ? (
          <img src={url} alt="Original Gorgon campaign scene" onError={() => setFailed(true)} />
        ) : (
          <p className="gorgon-fallback">A dispatch from the northern frontier</p>
        )}
        <p>{text}</p>
        <button onClick={onContinue}>Continue campaign</button>
      </div>
    </Modal>
  );
}
