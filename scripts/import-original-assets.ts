import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { OriginalDisc } from '../packages/import-tools/disc.ts';
import {
  decodeIndexedBitmap,
  decodeResourceDirectory,
  unpackResource,
} from '../packages/import-tools/resources.ts';
import {
  decodeFlc,
  decodePalette,
  indexedPng,
  inspectWave,
} from '../packages/import-tools/original-art.ts';
import { originalArtNames, originalMapIcons } from '../packages/import-tools/art-identities.ts';

const output = path.resolve('reference/assets');
const image =
  process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? 'reference/original/RPGBGA.BIN';
if (!existsSync('reference/extracted/anuire/anuire.research.json')) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', 'packages/import-tools/reconstruct-anuire.ts', image],
    { stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error('Anuire extraction failed. See diagnostics above.');
}
mkdirSync(output, { recursive: true });
const disc = new OriginalDisc(image, !image.toLowerCase().endsWith('.iso'));
const hash = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
type RecordInfo = {
  id: string;
  source: string;
  offset: number;
  packedSize: number;
  sha256?: string;
  file?: string;
  status: string;
  category: string;
  width?: number;
  height?: number;
  palette?: string;
  transparentIndex?: number | null;
  frames?: number;
  frameMs?: number;
  animation?: string[];
  audio?: ReturnType<typeof inspectWave>;
};
const records: RecordInfo[] = [],
  containers: { name: string; count: number; sha256: string }[] = [],
  palettes: { source: string; sha256: string; header: number[]; file: string }[] = [];
const put = (file: string, b: Uint8Array | string) => {
  const full = path.join(output, file);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, b);
  return file;
};
try {
  // Reuse complete outputs only when their original archives/palettes/music still match.
  // This never deletes assets that current screens do not use.
  let reuse = false;
  try {
    const prior = JSON.parse(readFileSync(path.join(output, 'manifest.json'), 'utf8')) as {
      records: RecordInfo[];
      containers: typeof containers;
      palettes: typeof palettes;
    };
    const files = new Set(
      readdirSync(output, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => path.relative(output, path.join(e.parentPath, e.name)).replaceAll('\\', '/')),
    );
    const originalMusic = disc.entries.filter((e) => /^MUSIC\/[^/]+\.WAV$/.test(e.name));
    const extraRealm = existsSync('reference/original/MUSIC/105.WAV');
    reuse =
      !process.argv.includes('--force') &&
      files.has('runtime.json') &&
      prior.records.length === 9501 + Number(extraRealm) &&
      prior.records.every(
        (r) =>
          r.status === 'decoded' &&
          !!r.file &&
          files.has(r.file) &&
          (r.animation ?? []).every((f) => files.has(f)),
      ) &&
      prior.containers.length === 13 &&
      prior.containers.every((c) => hash(disc.file(c.name)) === c.sha256) &&
      prior.palettes.length === 9 &&
      prior.palettes.every((p) => files.has(p.file) && hash(disc.file(p.source)) === p.sha256) &&
      originalMusic.every((e) =>
        prior.records.some((r) => r.source === e.name && r.sha256 === hash(disc.file(e.name))),
      ) &&
      (!extraRealm ||
        prior.records.some(
          (r) =>
            r.id === 'MUSIC/105.WAV' &&
            r.sha256 === hash(readFileSync('reference/original/MUSIC/105.WAV')),
        ));
  } catch {
    /* Missing or mismatched outputs need decoding below. */
  }
  if (reuse)
    console.log('Original assets unchanged: reusing all recovered records; no decoding required.');
  else {
    const paletteBytes = disc.file('GRAPHICS/DEFAULT.COL'),
      palette = decodePalette(paletteBytes);
    for (const p of disc.entries.filter((e) => /^GRAPHICS\/[^/]+\.COL$/.test(e.name))) {
      const b = disc.file(p.name);
      palettes.push({
        source: p.name,
        sha256: hash(b),
        header: Array.from(b.slice(0, 8)),
        file: put('palettes/' + path.basename(p.name), b),
      });
    }
    for (const container of disc.entries.filter((e) => /^RESFILES\/[^/]+\.RES$/.test(e.name))) {
      const bytes = disc.file(container.name),
        entries = decodeResourceDirectory(bytes),
        group = path.basename(container.name, '.RES');
      containers.push({ name: container.name, count: entries.length, sha256: hash(bytes) });
      for (const entry of entries) {
        const record: RecordInfo = {
          id: group + '/' + entry.name,
          source: container.name,
          offset: entry.offset,
          packedSize: entry.packedSize,
          status: 'pending',
          category:
            group === 'WAVE'
              ? 'effects'
              : group === 'FONT'
                ? 'font'
                : group === 'MAP'
                  ? 'map'
                  : /^LG|^SM/.test(entry.name) && group === 'UI'
                    ? 'portrait'
                    : group === 'UI'
                      ? 'interface'
                      : group === 'TEXTURES'
                        ? 'terrain-texture'
                        : 'illustration/sprite',
        };
        try {
          const b = unpackResource(entry);
          record.sha256 = hash(b);
          if (entry.name.endsWith('.PCX')) {
            const bitmap = decodeIndexedBitmap(b),
              transparent =
                !['MAP', 'FONT', 'INTRO', 'FINALE'].includes(group) &&
                !['FILLPANL.PCX', 'DTURN_BK.PCX'].includes(entry.name);
            const pal =
              group === 'INTRO' ? decodePalette(disc.file('GRAPHICS/INTROPAL.COL')) : palette;
            record.width = bitmap.width;
            record.height = bitmap.height;
            record.palette = group === 'INTRO' ? 'GRAPHICS/INTROPAL.COL' : 'GRAPHICS/DEFAULT.COL';
            record.transparentIndex = transparent ? 0 : null;
            record.file = put(
              'images/' + group + '/' + entry.name + '.png',
              indexedPng(bitmap.width, bitmap.height, bitmap.pixels, pal, transparent),
            );
          } else if (entry.name.endsWith('.FLC')) {
            const animation = decodeFlc(b, palette, group === 'UI');
            record.width = animation.width;
            record.height = animation.height;
            record.frames = animation.frameCount;
            record.frameMs = animation.frameMs;
            record.palette = 'embedded FLC / DEFAULT.COL';
            record.transparentIndex = 0;
            record.animation = animation.frames.map((f, i) =>
              put(
                'images/' + group + '/' + entry.name + '.' + i + '.png',
                indexedPng(animation.width, animation.height, f.pixels, f.palette, true),
              ),
            );
            record.file = record.animation[0];
          } else if (entry.name.endsWith('.WAV')) {
            record.audio = inspectWave(b);
            record.file = put('audio/effects/' + entry.name, b);
            if (record.audio.format !== 1) throw new Error('Non-PCM effect requires conversion');
          } else throw new Error('Unclassified resource');
          record.status = 'decoded';
        } catch (e) {
          record.status = String(e);
        }
        records.push(record);
      }
      console.log(
        group,
        entries.length,
        'records',
        records.filter((r) => r.source === container.name && r.status !== 'decoded').length,
        'unresolved',
      );
    }
    for (const entry of disc.entries.filter((e) => /^MUSIC\/[^/]+\.WAV$/.test(e.name))) {
      const b = disc.file(entry.name),
        audio = inspectWave(b);
      records.push({
        id: entry.name,
        source: entry.name,
        offset: entry.extent * 2048,
        packedSize: entry.bytes,
        sha256: hash(b),
        file: put('audio/' + entry.name, b),
        status: audio.format === 1 ? 'decoded' : 'conversion required',
        category: 'music',
        audio,
      });
    }
    // Optional, explicitly identified user-supplied missing cues; never substitute silently.
    const cueFile = path.resolve('reference/original/MUSIC/105.WAV');
    try {
      const b = readFileSync(cueFile),
        audio = inspectWave(b);
      if (audio.format !== 1) throw new Error('105.WAV must be PCM');
      records.push({
        id: 'MUSIC/105.WAV',
        source: 'PRIVATE:MUSIC/105.WAV',
        offset: 0,
        packedSize: b.length,
        sha256: hash(b),
        file: put('audio/MUSIC/105.WAV', b),
        status: 'decoded',
        category: 'music',
        audio,
      });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    const assets = Object.fromEntries(
      records
        .filter((r) => r.file && r.status === 'decoded')
        .map((r) => [
          r.id,
          {
            file: r.file!,
            width: r.width,
            height: r.height,
            frames: r.animation,
            frameMs: r.frameMs,
          },
        ]),
    );
    const portraits: Record<string, string> = {};
    for (const entry of disc.entries.filter((e) => /^SCENES\/ID\d+\.AVA$/.test(e.name))) {
      const lines = new TextDecoder('windows-1252')
        .decode(disc.file(entry.name))
        .split(/\r?\n/)
        .map((s) => s.replace(/#.*$/, '').trim())
        .filter(Boolean);
      if (lines[0] !== '0') continue;
      const id = path.basename(entry.name, '.AVA').slice(2),
        name = originalArtNames[Number(lines[1])],
        key = `UI/LG${name}.PCX`;
      if (assets[key]) portraits[id] = key;
    }
    const troopIcons = Object.fromEntries(
      originalArtNames
        .map((name, index) => [index, name.replace(/\d$/, '')])
        .filter(([, name]) => assets[`UI/${name}.PCX`]),
    );
    const manifest = {
      version: 1,
      disc: path.basename(image),
      paletteSha256: hash(paletteBytes),
      containers,
      palettes,
      records,
      assets,
      portraits,
      mapIcons: originalMapIcons,
      troopIcons,
      music: {
        menu: 'MUSIC/106.WAV',
        campaign: assets['MUSIC/105.WAV'] ? 'MUSIC/105.WAV' : 'MUSIC/101.WAV',
        campaignFallback: !assets['MUSIC/105.WAV'],
        note: 'Original realm cue 105 and battle cue 102 are absent from this single-data-track image. Campaign uses recovered original 101 under an explicit alternate-cue policy until 105 is supplied; it is not the verified original realm cue.',
      },
      effects: { click: 'WAVE/8010.WAV', order: 'WAVE/8010.WAV', error: 'WAVE/8015.WAV' },
    };
    put('manifest.json', JSON.stringify(manifest, null, 2));
    put(
      'runtime.json',
      JSON.stringify({
        version: manifest.version,
        assets: Object.fromEntries(
          Object.entries(assets).filter(
            ([id]) =>
              /^(?:UI|MAP|MUSIC)\//.test(id) || Object.values(manifest.effects).includes(id),
          ),
        ),
        portraits,
        mapIcons: originalMapIcons,
        troopIcons,
        music: manifest.music,
        effects: manifest.effects,
      }),
    );
    console.log(
      'Original game assets:',
      output,
      'records',
      records.length,
      'decoded',
      records.filter((r) => r.status === 'decoded').length,
    );
  }
  put(
    'IMPORT_INFO.txt',
    'Original Birthright assets. Reproduce with npm run assets:import. All recovered assets are retained for future screens, battles and adventures.\n',
  );
  if (existsSync(path.join(output, 'PRIVATE_LOCAL_ASSETS.txt')))
    unlinkSync(path.join(output, 'PRIVATE_LOCAL_ASSETS.txt'));
  put(
    'catalog.html',
    readFileSync(new URL('../packages/import-tools/asset-catalog.html', import.meta.url), 'utf8'),
  );
} finally {
  disc.close();
}
