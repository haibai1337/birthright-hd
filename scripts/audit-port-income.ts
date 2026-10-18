import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { inspectPortIncome } from '../packages/import-tools/port-income.ts';
import { OriginalDisc } from '../packages/import-tools/disc.ts';

const source = path.resolve(process.argv[2] ?? 'reference/extracted/disc/WINBR.EXE');
const output = path.resolve(process.argv[3] ?? 'reference/extracted/anuire/port-income.audit.json');
if (source === output) throw Error('Audit cannot overwrite original input');
const cdInput = /\.(bin|iso)$/i.test(source);
let bytes: Uint8Array;
let cdVolume: string | undefined;
let cdMemberBytes: number | undefined;
if (cdInput) {
  const disc = new OriginalDisc(source, !source.toLowerCase().endsWith('.iso'));
  try {
    cdMemberBytes = disc.entries.find((e) => e.name === 'WINBR.EXE')?.bytes;
    // All executable sections fit this prefix. The local CD image is missing its
    // final member sector; do not pretend to have read its complete resource tail.
    bytes = disc.filePrefix('WINBR.EXE', 1_600_000);
    cdVolume = disc.volume;
  } finally {
    disc.close();
  }
} else bytes = await readFile(source);
const evidence = {
  format: 'birthright-hd-port-income-audit',
  version: 1,
  method: 'static-PE32-x86-byte-recognition',
  executedHistoricalBinary: false,
  sourceSha256: createHash('sha256').update(bytes).digest('hex'),
  sourceBytes: bytes.length,
  sourceScope: cdInput
    ? 'WINBR.EXE[0:1600000], complete executable sections; resource tail not audited'
    : 'supplied executable bytes',
  ...(cdInput ? { sourceMember: 'WINBR.EXE', cdMemberBytes, cdVolume } : {}),
  ...inspectPortIncome(bytes),
};
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ output, ...evidence }, null, 2));
