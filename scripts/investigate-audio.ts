// Read-only disc/resource audit. Writes metadata only; never imports or replaces game assets.
// Run: node --experimental-strip-types scripts/investigate-audio.ts
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { OriginalDisc } from '../packages/import-tools/disc.ts';
import {
  decodeResourceDirectory,
  unpackResource,
  type ResourceEntry,
} from '../packages/import-tools/resources.ts';
import { inspectWave } from '../packages/import-tools/original-art.ts';

type WaveAudit = ReturnType<typeof inspectWave> & {
  source: string;
  bytes: number;
  sha256: string;
  riffBytes: number;
  demo?: boolean;
};
type SignatureAudit = { source: string; offset: number; signature: string };
type SceneAudit = {
  source: string;
  music?: string;
  musicFile?: string;
  status: string;
  wad?: string;
};
type DirectoryAudit = {
  name: string;
  extent: number;
  bytes: number;
  flags: number;
  directoryRecordLogicalOffset: number;
};
type DescriptorAudit = {
  sector: number;
  type?: number;
  identifier: string;
  volumeSectors?: number;
  escape?: string;
};
type ResourceAudit = {
  source: string;
  sha256: string;
  count: number;
  unpackedBytes: number;
  extensions: Record<string, number>;
  members: Omit<ResourceEntry, 'payload'>[];
};
type PeAudit = {
  source: string;
  sha256: string;
  bytes: number;
  signature: string;
  strings: { offset: number; text: string }[];
  base?: number;
  resourceRva?: number;
  resourceBytes?: number;
  sections?: { name: string; rva: number; raw: number; size: number }[];
};

const input = process.argv[2] ?? 'reference/original/RPGBGA.BIN';
const output = 'reference/extracted/audio-investigation';
fs.mkdirSync(output, { recursive: true });
const write = (name: string, value: unknown) =>
  fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n');
const hash = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const disc = new OriginalDisc(input);
const files = disc.entries.filter((e) => !e.directory);
const errors: unknown[] = [];
const wavs: WaveAudit[] = [],
  resources: ResourceAudit[] = [],
  signatures: SignatureAudit[] = [];
const references: { source: string; offset: number; text: string; context: string }[] = [];
const scenes: SceneAudit[] = [],
  texts: { source: string; text: string }[] = [],
  executables: PeAudit[] = [];
const cinematics: {
  source: string;
  extent: number;
  bytes: number;
  signature: string;
  width: number;
  height: number;
  frames: number;
  frameRate: number;
  audioSizes: number[];
  audioRateWords: string[];
}[] = [];
const wads: {
  source: string;
  bytes: number;
  count: number;
  directory: number;
  lumps: { name: string; offset: number; bytes: number }[];
}[] = [];
const demo = /^(ANTARA|CIVILWAR|CYBRGLAD|EUROPE|LORDS2|MULTI|PWRCHESS|REALM)\//;
const refPattern = /\b(?:10[0-9]|11[0-9]|12[0-4]|499)\.wav\b/gi;
function scan(b: Buffer, source: string, origin = 0) {
  const text = b.toString('latin1');
  for (const match of text.matchAll(refPattern)) {
    references.push({
      source,
      offset: origin + match.index!,
      text: match[0],
      context: text
        .slice(Math.max(0, match.index! - 45), match.index! + 65)
        .replace(/[^\x20-\x7e]/g, '.'),
    });
  }
  for (const sig of ['RIFF', 'MThd', 'FORM', 'OggS', 'fLaC', 'ID3', 'MSCF', 'PK\x03\x04', 'Rar!']) {
    let at = -1;
    while ((at = b.indexOf(sig, at + 1, 'latin1')) >= 0) {
      if (sig === 'RIFF' && b.toString('ascii', at + 8, at + 12) !== 'WAVE') continue;
      if (sig === 'FORM' && !/^(AIFF|AIFC|XDIR|XMID)$/.test(b.toString('ascii', at + 8, at + 12)))
        continue;
      if (
        sig === 'MThd' &&
        (at + 14 > b.length || b.readUInt32BE(at + 4) !== 6 || b.readUInt16BE(at + 8) > 2)
      )
        continue;
      if (sig === 'OggS' && b[at + 4] !== 0) continue;
      if (sig === 'MSCF' && (at + 36 > b.length || b.readUInt32LE(at + 4) !== 0)) continue;
      if (sig === 'ID3' && ![2, 3, 4].includes(b[at + 3]!)) continue;
      signatures.push({ source, offset: origin + at, signature: sig });
    }
  }
}
function wave(b: Buffer, source: string, extra = {}) {
  try {
    const audio = inspectWave(b);
    const item: WaveAudit = {
      source,
      ...extra,
      bytes: b.length,
      sha256: hash(b),
      riffBytes: b.readUInt32LE(4) + 8,
      ...audio,
    };
    wavs.push(item);
    return item;
  } catch (e) {
    errors.push({ source, error: String(e) });
  }
}
function pe(b: Buffer, name: string) {
  if (b.length < 64 || b.toString('ascii', 0, 2) !== 'MZ') return;
  const at = b.readUInt32LE(60);
  const result: PeAudit = {
    source: name,
    sha256: hash(b),
    bytes: b.length,
    signature: b.toString('ascii', at, at + 4),
    strings: [],
  };
  for (const m of b.toString('latin1').matchAll(/[\x20-\x7e]{5,}/g))
    if (/wave|music|\.wav|redbook|audioplay|audiopath|\.res|mci|dsound/i.test(m[0]))
      result.strings.push({ offset: m.index, text: m[0] });
  if (result.signature === 'PE\0\0') {
    const optional = at + 24,
      table = optional + b.readUInt16LE(at + 20);
    result.base = b.readUInt32LE(optional + 28);
    result.resourceRva = b.readUInt32LE(optional + 112);
    result.resourceBytes = b.readUInt32LE(optional + 116);
    result.sections = Array.from({ length: b.readUInt16LE(at + 6) }, (_, i) => {
      const p = table + 40 * i;
      return {
        name: b.toString('ascii', p, p + 8).replace(/\0/g, ''),
        rva: b.readUInt32LE(p + 12),
        raw: b.readUInt32LE(p + 20),
        size: b.readUInt32LE(p + 16),
      };
    });
  }
  executables.push(result);
}
// No flags-based filtering: include ISO hidden/associated records and inspect descriptor set.
const descriptors: DescriptorAudit[] = [],
  directoryRecords: DirectoryAudit[] = [],
  supplementaryRecords: DirectoryAudit[] = [];
for (let sector = 16; sector < 32; sector++) {
  const b = Buffer.from(disc.read(sector * 2048, 2048));
  descriptors.push({
    sector,
    type: b[0],
    identifier: b.toString('ascii', 1, 6),
    volumeSectors: b[0] === 1 ? b.readUInt32LE(80) : undefined,
  });
  if (b[0] === 255) break;
}
function walk(extent: number, size: number, prefix: string, unicode = false) {
  const b = Buffer.from(disc.read(extent * 2048, size));
  for (let at = 0; at < b.length;) {
    const n = b[at]!;
    if (!n) {
      at = (Math.floor(at / 2048) + 1) * 2048;
      continue;
    }
    const rawName = b.subarray(at + 33, at + 33 + b[at + 32]!);
    let name =
      unicode && rawName.length > 1
        ? Array.from({ length: rawName.length / 2 }, (_, i) =>
            String.fromCharCode(rawName.readUInt16BE(i * 2)),
          ).join('')
        : rawName.toString('latin1');
    name = name.replace(/;\d+$/, '');
    const e = {
      name: prefix + name,
      extent: b.readUInt32LE(at + 2),
      bytes: b.readUInt32LE(at + 10),
      flags: b[at + 25]!,
      directoryRecordLogicalOffset: extent * 2048 + at,
    };
    at += n;
    if (name === '\0' || name === '\x01') continue;
    (unicode ? supplementaryRecords : directoryRecords).push(e);
    if (e.flags & 2) walk(e.extent, e.bytes, e.name + '/', unicode);
  }
}
const pvd = Buffer.from(disc.read(16 * 2048, 2048));
walk(pvd.readUInt32LE(158), pvd.readUInt32LE(166), '');
for (const d of descriptors.filter((d) => d.type === 2)) {
  const b = Buffer.from(disc.read(d.sector * 2048, 2048));
  d.escape = b.toString('ascii', 88, 91);
  walk(b.readUInt32LE(158), b.readUInt32LE(166), '', true);
}
write('iso-directory.json', { descriptors, records: directoryRecords, supplementaryRecords });

for (const file of files) {
  let b: Buffer;
  try {
    b = Buffer.from(disc.file(file.name));
  } catch (e) {
    errors.push({ source: file.name, extent: file.extent, bytes: file.bytes, error: String(e) });
    const available = Math.floor(fs.statSync(input).size / 2352) * 2048 - file.extent * 2048;
    if (available > 0 && /\.exe$/i.test(file.name)) {
      const prefix = Buffer.from(disc.read(file.extent * 2048, available));
      scan(prefix, file.name + ' (truncated)');
      pe(prefix, file.name + ' (truncated)');
    }
    continue;
  }
  scan(b, file.name);
  if (/\.wav$/i.test(file.name))
    wave(b, file.name, {
      extent: file.extent,
      logicalOffset: file.extent * 2048,
      physicalOffset: file.extent * 2352 + 16,
      demo: demo.test(file.name),
    });
  if (/\.res$/i.test(file.name)) {
    try {
      const entries = decodeResourceDirectory(b);
      const counts: Record<string, number> = {};
      let unpackedBytes = 0;
      for (const e of entries) {
        const data = Buffer.from(unpackResource(e));
        unpackedBytes += data.length;
        const ext = path.extname(e.name).toUpperCase();
        counts[ext] = (counts[ext] ?? 0) + 1;
        const source = file.name + ':' + e.name;
        scan(data, source);
        if (
          ext === '.WAV' ||
          (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WAVE')
        )
          wave(data, source, {
            resourceOffset: e.offset,
            resourceHash: e.hash,
            extension: e.extension,
          });
      }
      resources.push({
        source: file.name,
        sha256: hash(b),
        count: entries.length,
        unpackedBytes,
        extensions: counts,
        members: entries.map((e) => ({
          name: e.name,
          offset: e.offset,
          hash: e.hash,
          extension: e.extension,
          flags: e.flags,
          compression: e.compression,
          packedSize: e.packedSize,
          unpackedSize: e.unpackedSize,
          totalSize: e.totalSize,
        })),
      });
    } catch (e) {
      errors.push({ source: file.name, error: String(e) });
    }
  }
  if (/\.scn$/i.test(file.name) && !demo.test(file.name)) {
    const text = b.toString('latin1');
    const music = /\[Music\]\s*([^\r\n]+)/i.exec(text)?.[1]?.trim();
    scenes.push({
      source: file.name,
      music,
      musicFile:
        music && /^(?:[1-9]|10|11)$/.test(music)
          ? [2, 5].includes(Number(music))
            ? `WAVE00/${100 + Number(music)}.WAV`
            : `MUSIC/${100 + Number(music)}.WAV`
          : undefined,
      status:
        music === '100'
          ? 'silence sentinel; not a request for 200.WAV'
          : /^\d+$/.test(music ?? '')
            ? 'numeric cue'
            : 'legacy/editor text; atol yields zero',
      wad: /\[Wad\]\s*([^\r\n]+)/i.exec(text)?.[1]?.trim(),
    });
  }
  if (
    !demo.test(file.name) &&
    (/\.(inf|cfg|scr|bat)$/i.test(file.name) || file.name.startsWith('TEXT/ADVEN'))
  ) {
    texts.push({ source: file.name, text: b.toString('latin1') });
  }
  if (/\.wad$/i.test(file.name)) {
    const count = b.readUInt32LE(4),
      directory = b.readUInt32LE(8);
    if (
      !/^[PI]WAD$/.test(b.toString('ascii', 0, 4)) ||
      count > 10000 ||
      directory + count * 16 > b.length
    )
      errors.push({ source: file.name, error: 'Invalid WAD directory' });
    else {
      const lumps = Array.from({ length: count }, (_, i) => {
        const at = directory + i * 16;
        const item = {
          name: b.toString('ascii', at + 8, at + 16).replace(/\0.*$/, ''),
          offset: b.readUInt32LE(at),
          bytes: b.readUInt32LE(at + 4),
        };
        if (item.offset + item.bytes > b.length)
          errors.push({ source: file.name, error: 'WAD lump out of bounds', ...item });
        return item;
      });
      wads.push({ source: file.name, bytes: b.length, count, directory, lumps });
    }
  }
  if (/^[^/]+\.SMK$/i.test(file.name) && b.length >= 104) {
    cinematics.push({
      source: file.name,
      extent: file.extent,
      bytes: file.bytes,
      signature: b.toString('ascii', 0, 4),
      width: b.readUInt32LE(4),
      height: b.readUInt32LE(8),
      frames: b.readUInt32LE(12),
      frameRate: b.readInt32LE(16),
      audioSizes: Array.from({ length: 7 }, (_, i) => b.readUInt32LE(24 + i * 4)),
      audioRateWords: Array.from({ length: 7 }, (_, i) => b.readUInt32LE(72 + i * 4).toString(16)),
    });
  }
  if (/^(WINBR|NOVA|BR|INSTALL|SETUP|AUTOPLAY)\.EXE$/i.test(file.name)) pe(b, file.name);
}
write('audio-files.json', wavs);
write('resources.json', resources);
write('references.json', references);
write('signatures.json', signatures);
write('scenes.json', scenes);
write('installer-and-adventure-text.json', texts);
write('wads.json', wads);
write('executables.json', executables);
write('cinematics.json', cinematics);
console.log(
  'File and RES inspection complete; scanning every raw sector, including unallocated space.',
);

// Validate MODE1 framing and EDC for every sector, then search logical bytes outside all files.
const fd = fs.openSync(input, 'r'),
  bytes = fs.fstatSync(fd).size;
const sectorCount = Math.floor(bytes / 2352),
  modeCounts: Record<string, number> = {};
const badSync: number[] = [],
  badEdc: number[] = [],
  rawFinds: { signature: string; logicalOffset: number; owners: string[] }[] = [];
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let v = i;
  for (let j = 0; j < 8; j++) v = (v >>> 1) ^ (v & 1 ? 0xd8018001 : 0);
  return v >>> 0;
});
const sync = Buffer.from([0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0]);
const rawHash = createHash('sha256');
const seenRawFinds = new Set<string>();
let tail = Buffer.alloc(0);
for (let sector = 0; sector < sectorCount; sector += 2048) {
  const n = Math.min(2048, sectorCount - sector),
    raw = Buffer.alloc(n * 2352),
    logical = Buffer.alloc(n * 2048);
  if (fs.readSync(fd, raw, 0, raw.length, sector * 2352) !== raw.length)
    throw new Error('Short raw read');
  rawHash.update(raw);
  for (let i = 0; i < n; i++) {
    const start = i * 2352,
      mode = raw[start + 15]!;
    modeCounts[mode] = (modeCounts[mode] ?? 0) + 1;
    if (!raw.subarray(start, start + 12).equals(sync)) badSync.push(sector + i);
    if (mode === 1) {
      let crc = 0;
      for (let j = 0; j < 2064; j++) crc = (crc >>> 8) ^ crcTable[(crc ^ raw[start + j]!) & 255]!;
      if (crc >>> 0 !== raw.readUInt32LE(start + 2064)) badEdc.push(sector + i);
    }
    raw.copy(logical, i * 2048, start + 16, start + 2064);
  }
  const joined = Buffer.concat([tail, logical]),
    origin = sector * 2048 - tail.length;
  for (const sig of ['RIFF', 'MThd', 'OggS', 'fLaC', '102.WAV', '105.WAV', '102.wav', '105.wav']) {
    let at = -1;
    while ((at = joined.indexOf(sig, at + 1)) >= 0) {
      const offset = origin + at;
      if (sig === 'RIFF' && joined.toString('ascii', at + 8, at + 12) !== 'WAVE') continue;
      const key = sig + ':' + offset;
      if (seenRawFinds.has(key)) continue;
      seenRawFinds.add(key);
      const owners = files
        .filter((f) => offset >= f.extent * 2048 && offset < f.extent * 2048 + f.bytes)
        .map((f) => f.name);
      rawFinds.push({ signature: sig, logicalOffset: offset, owners });
    }
  }
  tail = joined.subarray(Math.max(0, joined.length - 64));
}
fs.closeSync(fd);
write('raw-scan.json', {
  bytes,
  sectorCount,
  trailingBytes: bytes % 2352,
  sha256: rawHash.digest('hex'),
  modeCounts,
  badSync,
  badEdc,
  findings: rawFinds,
});
const manifest = JSON.parse(fs.readFileSync('reference/assets/manifest.json', 'utf8')) as {
  records: { audio?: ReturnType<typeof inspectWave>; sha256: string }[];
};
const indexedHashes = new Set(manifest.records.filter((r) => r.audio).map((r) => r.sha256));
const birthrightWavs = wavs.filter((r) => !r.demo);
const unique = [...new Map(birthrightWavs.map((r) => [r.sha256, r])).values()];
const summary = {
  volume: disc.volume,
  files: files.length,
  directories: disc.entries.length - files.length,
  descriptors,
  hiddenOrAssociated: [...directoryRecords, ...supplementaryRecords].filter((r) => r.flags & 5),
  supplementaryOnlyExtents: supplementaryRecords.filter(
    (s) => !(s.flags & 2) && !files.some((f) => f.extent === s.extent && f.bytes === s.bytes),
  ),
  outOfBoundsFiles: files.filter((f) => f.extent * 2352 + Math.ceil(f.bytes / 2048) * 2352 > bytes),
  resources: resources.map((r) => ({
    source: r.source,
    sha256: r.sha256,
    count: r.count,
    unpackedBytes: r.unpackedBytes,
    extensions: r.extensions,
  })),
  wavCount: wavs.length,
  birthrightWavLocations: birthrightWavs.length,
  uniqueBirthrightWavs: unique.length,
  absentFromAssetCatalog: unique.filter((r) => !indexedHashes.has(r.sha256)),
  music: birthrightWavs.filter((r) =>
    /^MUSIC\/|^WAVE00\/(10[235]|11\d|12[0-4])\.WAV$/i.test(r.source),
  ),
  sceneCount: scenes.length,
  sceneTracks: [...new Set(scenes.map((s) => s.music))],
  errors,
};
write('summary.json', summary);
disc.close();
console.log(
  JSON.stringify(
    {
      files: summary.files,
      wavCount: summary.wavCount,
      unique: unique.length,
      missingFromCatalog: summary.absentFromAssetCatalog.length,
      errors,
      modeCounts,
      badSync: badSync.length,
      badEdc: badEdc.length,
      output,
    },
    null,
    2,
  ),
);
