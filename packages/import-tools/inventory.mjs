import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, mkdir, writeFile, open } from 'node:fs/promises';
import path from 'node:path';

// Read-only inspection of the user-provided MODE1/2352 CD. Never executes content.
const root = path.resolve('reference/original');
await mkdir('reference/extracted', { recursive: true });
const inventory = [];
for (const entry of (await readdir(root, { withFileTypes: true })).sort((a, b) =>
  a.name.localeCompare(b.name),
)) {
  if (!entry.isFile() || entry.name === 'README.md') continue;
  const file = path.join(root, entry.name);
  const hash = createHash('sha256');
  let size = 0;
  for await (const chunk of createReadStream(file)) {
    hash.update(chunk);
    size += chunk.length;
  }
  const fd = await open(file, 'r');
  const head = Buffer.alloc(64);
  await fd.read(head, 0, 64, 0);
  await fd.close();
  inventory.push({
    name: entry.name,
    bytes: size,
    sha256: hash.digest('hex'),
    signature: head.subarray(0, 16).toString('hex'),
    format:
      head.toString('ascii', 0, 4) === '%PDF'
        ? 'PDF'
        : head.toString('ascii', 0, 2) === 'MZ'
          ? 'DOS/Windows executable'
          : path.extname(file).slice(1).toUpperCase(),
  });
}
await writeFile('reference/extracted/inventory.json', JSON.stringify(inventory, null, 2));
await mkdir('reference/extracted', { recursive: true });
await writeFile(
  'reference/extracted/reference-inventory.md',
  '# Supplied reference inventory\n\nRead-only SHA-256 inventory. Original content is private and ignored.\n\n| File | Bytes | SHA-256 | Format |\n|---|---:|---|---|\n' +
    inventory.map((x) => `| ${x.name} | ${x.bytes} | ${x.sha256} | ${x.format} |`).join('\n') +
    '\n',
);
const bin = inventory.find((x) => x.name.toUpperCase().endsWith('.BIN'));
if (bin) {
  const fd = await open(path.join(root, bin.name), 'r');
  async function logical(offset, length) {
    const output = Buffer.alloc(length);
    let done = 0;
    while (done < length) {
      const sector = Math.floor((offset + done) / 2048),
        within = (offset + done) % 2048;
      const count = Math.min(length - done, 2048 - within);
      const { bytesRead } = await fd.read(output, done, count, sector * 2352 + 16 + within);
      if (bytesRead !== count) throw new Error('Truncated disc image');
      done += count;
    }
    return output;
  }
  const pvd = await logical(16 * 2048, 2048);
  if (pvd.toString('ascii', 1, 6) !== 'CD001') throw new Error('Not an ISO9660 MODE1/2352 image');
  const records = [];
  const visited = new Set();
  async function walk(extent, length, parent = '') {
    if (visited.has(extent)) return;
    visited.add(extent);
    const data = await logical(extent * 2048, length);
    for (let at = 0; at < data.length;) {
      const len = data[at];
      if (!len) {
        at = (Math.floor(at / 2048) + 1) * 2048;
        continue;
      }
      if (len < 34 || at + len > data.length) throw new Error('Invalid ISO directory record');
      const rec = data.subarray(at, at + len);
      at += len;
      const name = rec.toString('ascii', 33, 33 + rec[32]).replace(/;\d+$/, '');
      if (name === '\x00' || name === '\x01') continue;
      if (name === '.' || name === '..' || /[\\/:]/.test(name))
        throw new Error('Unsafe ISO path component');
      const item = {
        name: parent + name,
        extent: rec.readUInt32LE(2),
        bytes: rec.readUInt32LE(10),
        directory: Boolean(rec[25] & 2),
      };
      records.push(item);
      if (item.directory) await walk(item.extent, item.bytes, item.name + '/');
    }
  }
  const rec = pvd.subarray(156);
  await walk(rec.readUInt32LE(2), rec.readUInt32LE(10));
  await writeFile(
    'reference/extracted/disc-directory.json',
    JSON.stringify({ volume: pvd.toString('ascii', 40, 72).trim(), files: records }, null, 2),
  );
  // Only small readmes, structured text candidates, and resource archive headers.
  const summaries = [];
  for (const item of records.filter((x) => !x.directory)) {
    if (/\.(TXT|NFO|INI|SCN|DAT|SAV|GAM|RES)$/i.test(item.name) && item.bytes < 2_000_000) {
      const content = await logical(item.extent * 2048, item.bytes);
      const dest = path.join('reference/extracted/disc', item.name);
      const extractionRoot = path.resolve('reference/extracted/disc');
      if (!path.resolve(dest).startsWith(extractionRoot + path.sep))
        throw new Error('Extraction path escaped private directory');
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, content);
      summaries.push({
        name: item.name,
        bytes: item.bytes,
        head: content.subarray(0, 64).toString('hex'),
      });
    } else if (/\.RES$/i.test(item.name)) {
      const head = await logical(item.extent * 2048, 32);
      summaries.push({
        name: item.name,
        bytes: item.bytes,
        version: head.readUInt32LE(0),
        directoryOffset: head.readUInt32LE(4),
        entries: head.readUInt32LE(8),
      });
    }
  }
  await writeFile('reference/extracted/disc-summary.json', JSON.stringify(summaries, null, 2));
  await fd.close();
  console.log(
    JSON.stringify(
      {
        inventory: inventory.length,
        discFiles: records.length,
        volume: pvd.toString('ascii', 40, 72).trim(),
        candidates: records
          .filter((x) => /\.(DAT|GAM|SAV|TXT|RES|SCN)$/i.test(x.name))
          .map((x) => ({ name: x.name, bytes: x.bytes }))
          .slice(0, 100),
      },
      null,
      2,
    ),
  );
}
