import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { decodeEconomicRecords } from '../packages/import-tools/economy.ts';

const source = path.resolve(process.argv[2] ?? 'reference/extracted/disc/RLMSTART.DAT');
const output = path.resolve(process.argv[3] ?? 'reference/extracted/anuire/economy.research.json');
if (source === output) throw Error('Output must not overwrite the source');
const bytes = await readFile(source),
  records = decodeEconomicRecords(bytes);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(
  output,
  JSON.stringify(
    {
      format: 'birthright-hd-economy-research',
      version: 1,
      sourceSha256: createHash('sha256').update(bytes).digest('hex'),
      sourceBytes: bytes.length,
      provenance:
        'RLMSTART.DAT; place chains and MAPICON.HXX codes 94/95/96; raw route/court/tribute fields',
      ...records,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    output,
    ports: records.ports.length,
    courts: records.courts.length,
    nonzeroGuildRoutes: records.guildRoutes.filter((r) => r.route1 || r.route2 || r.route3).length,
    tributes: records.tributes.length,
  }),
);
