import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const unrar = 'C:/Program Files/WinRAR/UnRAR.exe';
const originals = path.resolve('reference/original'),
  out = path.resolve('reference/extracted');
const names = [
  'Birthright-The-Gorgons-Alliance_Misc_Win_EN_Scenario-Editor.exe',
  'Birthrightv1004WIN.exe',
];
const result = [];
for (const name of names) {
  const file = path.join(originals, name);
  const listing = spawnSync(unrar, ['lb', file], { encoding: 'utf8', maxBuffer: 4_000_000 });
  if (listing.status !== 0) throw new Error(`Archive listing failed: ${listing.stderr}`);
  const entries = listing.stdout.trim().split(/\r?\n/);
  result.push({ name, entries });
  fs.writeFileSync(path.join(out, name + '.listing.txt'), listing.stdout);
  {
    for (const entry of entries.filter((e) =>
      ['README.TXT', 'SCENED.DAT'].includes(e.toUpperCase()),
    )) {
      const read = spawnSync(unrar, ['p', '-inul', file, entry], { maxBuffer: 4_000_000 });
      if (read.status !== 0) throw new Error(`Read-only archive extraction failed: ${entry}`);
      fs.writeFileSync(
        path.join(
          out,
          (name.includes('Scenario-Editor') ? 'scenario-editor-' : 'official-1004-') + entry,
        ),
        read.stdout,
      );
    }
  }
}
fs.writeFileSync(path.join(out, 'rar-inspection.json'), JSON.stringify(result, null, 2));
console.log(
  result.map((r) => ({ name: r.name, count: r.entries.length, sample: r.entries.slice(0, 8) })),
);
// Index the actual archive directories rather than assuming a documentation field size.
const directory = JSON.parse(fs.readFileSync(path.join(out, 'disc-directory.json'), 'utf8'));
const image = fs.openSync(path.join(originals, 'RPGBGA.BIN'), 'r');
function logical(offset, length) {
  const b = Buffer.alloc(length);
  let n = 0;
  while (n < length) {
    const sector = Math.floor((offset + n) / 2048),
      within = (offset + n) % 2048,
      k = Math.min(length - n, 2048 - within);
    if (fs.readSync(image, b, n, k, sector * 2352 + 16 + within) !== k)
      throw new Error('Truncated disc');
    n += k;
  }
  return b;
}
const resources = [];
for (const file of directory.files.filter((f) => f.name.endsWith('.RES'))) {
  const h = logical(file.extent * 2048, 12),
    offset = h.readUInt32LE(4),
    count = h.readUInt32LE(8);
  if (offset + count * 22 > file.bytes) throw new Error('Unexpected resource directory bounds');
  const data = logical(file.extent * 2048 + offset, count * 22);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const at = i * 22;
    const position = data.readUInt32LE(at + 4);
    if (position >= offset) throw new Error('Invalid resource offset');
    entries.push({
      hash: data.readUInt32LE(at),
      offset: position,
      extension: data[at + 8],
      name: data.toString('ascii', at + 9, at + 22).replace(/\0.*$/, ''),
    });
  }
  resources.push({
    name: file.name,
    headerHex: h.toString('hex'),
    versionRaw: h.readUInt32LE(0),
    count,
    entryBytes: 22,
    entries,
  });
}
fs.closeSync(image);
fs.writeFileSync(path.join(out, 'resource-index.json'), JSON.stringify(resources, null, 2));
console.log(
  resources.map((r) => ({ name: r.name, count: r.count, sample: r.entries.slice(0, 3) })),
);
