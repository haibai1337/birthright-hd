import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { OriginalDisc } from '../packages/import-tools/disc.ts';
import { extractMagicRecords } from '../packages/import-tools/magic.ts';

const source = process.argv[2] ?? 'reference/original/RPGBGA.BIN';
const output = path.resolve('reference/extracted/anuire/magic.research.json');
const raw = JSON.parse(await readFile('reference/extracted/anuire/anuire.research.json', 'utf8'));
const disc = new OriginalDisc(source, !source.toLowerCase().endsWith('.iso'));
try {
  const records = extractMagicRecords(raw, (name) =>
    disc.entries.some((e) => e.name === name) ? disc.file(name) : undefined,
  );
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(records, null, 2) + '\n');
  console.log(
    JSON.stringify({
      output,
      characters: records.characters.length,
      inventories: records.characters.filter((c) => c.inventoryVerified).length,
      leyLines: records.leyLines.length,
    }),
  );
} finally {
  disc.close();
}
