import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extractStrategyRecords } from '../packages/import-tools/strategy.ts';
const raw = JSON.parse(await readFile('reference/extracted/anuire/anuire.research.json', 'utf8'));
const data = extractStrategyRecords(raw, await readFile('reference/extracted/disc/RLMSTART.DAT'));
await mkdir('reference/extracted/anuire', { recursive: true });
await writeFile(
  'reference/extracted/anuire/strategy.research.json',
  JSON.stringify(data, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    records: data.troops.length,
    types: new Set(data.troops.map((t) => t.icon)).size,
    output: 'reference/extracted/anuire/strategy.research.json',
  }),
);
